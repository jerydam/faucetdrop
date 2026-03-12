import {
    BrowserProvider,
    Contract,
    Interface,
    isAddress,
    parseUnits,
    ZeroAddress,
} from "ethers";

import { ERC20_ABI, QUIZ_FACTORY_ABI, QUIZ_ABI } from "./abis";
import { BACKEND_ADDRESS} from './faucet';

// ✅ Import the helper from your useNetwork file (adjust the path to match your project structure)
import { getNetworkByChainId } from "@/hooks/use-network"; 
import { toast } from "sonner";

// ── Divvi helpers ────────────────────────────────────────────────────────────
const appendDivviReferralData = (data: string): string => data;
const reportTransactionToDivvi = async (_hash: string, _chainId: number) => { };

export const DEFAULT_CLAIM_WINDOW = 172800; // 48 hours

// ── Types ────────────────────────────────────────────────────────────────────
export interface DeployResult {
    contractAddress: string;
    txHash: string;
}

export interface FundResult {
    txHash: string;
}

export interface QuizRewardConfig {
    name: string;
    tokenAddress: string;
    tokenDecimals: number;
    isNativeToken: boolean;
    poolAmount: string;          // human-readable e.g. "10.5"
    claimWindowDuration?: number;
}

// ── 1. Deploy QuizReward (no fund) ───────────────────────────────────────────
export async function deployQuizReward(
    provider: BrowserProvider,
    chainId: number,
    config: Pick<QuizRewardConfig, "name" | "tokenAddress" | "isNativeToken" | "claimWindowDuration">
): Promise<DeployResult> {
    // ✅ Dynamically fetch the factory address using your global network configurations
    const targetNetwork = getNetworkByChainId(chainId);
    const factoryAddress = targetNetwork?.factories?.quiz;

    if (!factoryAddress || !isAddress(factoryAddress)) {
        throw new Error(`No Quiz factory deployed on chain ${chainId}`);
    }
    
    if (!isAddress(BACKEND_ADDRESS) ) {
        throw new Error("Backend wallet addresses not configured (check NEXT_PUBLIC_BACKEND_WALLET_A/B)");
    }

    const signer = await provider.getSigner();
    const factory = new Contract(factoryAddress, QUIZ_FACTORY_ABI, signer);
    const tokenAddr = config.isNativeToken ? ZeroAddress : config.tokenAddress;

    const data = factory.interface.encodeFunctionData("createQuizReward", [
        config.name,
        tokenAddr,
        BACKEND_ADDRESS,
        config.claimWindowDuration ?? DEFAULT_CLAIM_WINDOW,
    ]);

    const tx = await signer.sendTransaction({
        to: factoryAddress,
        data: appendDivviReferralData(data),
    });

    const receipt = await tx.wait();
    if (!receipt) throw new Error("No receipt from deploy tx");
    await reportTransactionToDivvi(tx.hash, chainId);

    const iface = new Interface(QUIZ_FACTORY_ABI);
    let contractAddress = "";
    for (const log of receipt.logs) {
        try {
            const parsed = iface.parseLog(log as any);
            if (parsed?.name === "QuizRewardCreated") {
                contractAddress = parsed.args[0];
                break;
            }
        } catch { }
    }

    if (!contractAddress) throw new Error("QuizRewardCreated event not found in receipt");
    return { contractAddress, txHash: tx.hash };
}

// ── 2. Fund an existing QuizReward contract ──────────────────────────────────

export async function fundQuizReward(
  provider: BrowserProvider,
  chainId: number,
  contractAddress: string,
  reward: {
    tokenAddress: string;
    tokenDecimals: number;
    isNativeToken: boolean;
    poolAmount: string;
  }
) {
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();

  const PLATFORM_FEE_PERCENT = 5n;
  const poolAmountParsed = parseUnits(reward.poolAmount, reward.tokenDecimals);
  const grossAmount = (poolAmountParsed * 100n) / (100n - PLATFORM_FEE_PERCENT);

  if (reward.isNativeToken) {
    // Manually encode fund(0) calldata
    const iface = new Interface(["function fund(uint256 _tokenAmount) external payable"]);
    const data = iface.encodeFunctionData("fund", [0n]);

    const tx = await signer.sendTransaction({
      to: contractAddress,
      value: grossAmount,
      data, // explicit calldata
    });
    await tx.wait();
    return { txHash: tx.hash };

  } else {
    // ── Step 1: Approve ──
    const erc20Iface = new Interface([
      "function approve(address,uint256) external returns (bool)",
      "function allowance(address,address) external view returns (uint256)",
    ]);

    const erc20 = new Contract(reward.tokenAddress, erc20Iface, signer);
    const allowance: bigint = await erc20.allowance(signerAddress, contractAddress);

    if (allowance < grossAmount) {
      toast.info("Step 1/2: Approving token spend...");
      // Manually encode approve calldata
      const approveData = erc20Iface.encodeFunctionData("approve", [contractAddress, grossAmount]);
      const approveTx = await signer.sendTransaction({
        to: reward.tokenAddress,
        data: approveData,
        value: 0n,
      });
      await approveTx.wait();
      toast.success("Approval confirmed!");
    }

    // ── Step 2: Fund ──
    toast.info("Step 2/2: Funding contract...");
    const fundIface = new Interface(["function fund(uint256 _tokenAmount) external"]);
    const fundData = fundIface.encodeFunctionData("fund", [grossAmount]);

    // Send raw transaction with explicit data — bypasses Privy stripping calldata
    const tx = await signer.sendTransaction({
      to: contractAddress,
      data: fundData,  // explicit calldata guaranteed
      value: 0n,       // no ETH for ERC20
      gasLimit: 300000n,
    });
    await tx.wait();
    return { txHash: tx.hash };
  }
}

// ── 3. Check if contract is funded ───────────────────────────────────────────
export async function getContractFundedStatus(
    provider: BrowserProvider,
    contractAddress: string,
    tokenAddress: string,
    tokenDecimals: number,
    isNativeToken: boolean,
    requiredAmount: string
): Promise<{ isFunded: boolean; balance: string; balanceRaw: bigint }> {
    if (!contractAddress || !isAddress(contractAddress)) {
        return { isFunded: false, balance: "0", balanceRaw: 0n };
    }
    try {
        let balanceBig: bigint;
        if (isNativeToken) {
            balanceBig = await provider.getBalance(contractAddress);
        } else {
            const token = new Contract(tokenAddress, ERC20_ABI, provider);
            balanceBig = await token.balanceOf(contractAddress);
        }
        const required = parseUnits(requiredAmount || "0", tokenDecimals);
        const balance = (Number(balanceBig) / 10 ** tokenDecimals).toFixed(4);
        return {
            isFunded: balanceBig >= required && balanceBig > 0n,
            balance,
            balanceRaw: balanceBig,
        };
    } catch {
        return { isFunded: false, balance: "0", balanceRaw: 0n };
    }
}