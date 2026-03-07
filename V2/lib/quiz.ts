import {
    BrowserProvider,
    Contract,
    Interface,
    isAddress,
    parseUnits,
    ZeroAddress,
} from "ethers";
import { ERC20_ABI, QUIZ_FACTORY_ABI, QUIZ_ABI } from "./abis";
import { BACKEND_ADDRESS, BACKUP_BACKEND_ADDRESS } from './faucet';

// ✅ Import the helper from your useNetwork file (adjust the path to match your project structure)
import { getNetworkByChainId } from "@/hooks/use-network"; 

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
    
    if (!isAddress(BACKEND_ADDRESS) || !isAddress(BACKUP_BACKEND_ADDRESS)) {
        throw new Error("Backend wallet addresses not configured (check NEXT_PUBLIC_BACKEND_WALLET_A/B)");
    }

    const signer = await provider.getSigner();
    const factory = new Contract(factoryAddress, QUIZ_FACTORY_ABI, signer);
    const tokenAddr = config.isNativeToken ? ZeroAddress : config.tokenAddress;

    const data = factory.interface.encodeFunctionData("createQuizReward", [
        config.name,
        tokenAddr,
        BACKEND_ADDRESS,
        BACKUP_BACKEND_ADDRESS,
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
    config: Pick<QuizRewardConfig, "tokenAddress" | "tokenDecimals" | "isNativeToken" | "poolAmount">
): Promise<FundResult> {
    if (!isAddress(contractAddress)) throw new Error("Invalid contract address");

    const signer = await provider.getSigner();
    const amountBig = parseUnits(config.poolAmount, config.tokenDecimals);
    const contract = new Contract(contractAddress, QUIZ_ABI, signer);

    let tx;
    if (config.isNativeToken) {
        tx = await contract.fund(0, { value: amountBig });
    } else {
        const token = new Contract(config.tokenAddress, ERC20_ABI, signer);
        const signerAddr = await signer.getAddress();
        const allowance: bigint = await token.allowance(signerAddr, contractAddress);
        if (allowance < amountBig) {
            const approveTx = await token.approve(contractAddress, amountBig);
            await approveTx.wait();
        }
        tx = await contract.fund(amountBig);
    }

    const receipt = await tx.wait();
    if (!receipt) throw new Error("No receipt from fund tx");
    await reportTransactionToDivvi(tx.hash, chainId);
    return { txHash: tx.hash };
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