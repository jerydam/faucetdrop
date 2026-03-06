import {
  BrowserProvider,
  Contract,
  Interface,
  isAddress,
  parseUnits,
  ZeroAddress,
} from "ethers";

// ── Divvi helpers (replace with your actual imports) ─────────────────────────
const appendDivviReferralData = (data: string): string => data;
const reportTransactionToDivvi = async (_hash: string, _chainId: number) => {};

// ── Config ────────────────────────────────────────────────────────────────────
export const VALID_BACKEND_ADDRESS =
  process.env.NEXT_PUBLIC_BACKEND_WALLET_A ?? "";
export const BACKUP_BACKEND_ADDRESS =
  process.env.NEXT_PUBLIC_BACKEND_WALLET_B ?? "";

export const FACTORY_ADDRESSES: Record<number, string> = {
  42220: process.env.NEXT_PUBLIC_FACTORY_CELO  ?? "",
  1135:  process.env.NEXT_PUBLIC_FACTORY_LISK  ?? "",
  42161: process.env.NEXT_PUBLIC_FACTORY_ARB   ?? "",
  8453:  process.env.NEXT_PUBLIC_FACTORY_BASE  ?? "",
  56:    process.env.NEXT_PUBLIC_FACTORY_BNB   ?? "",
};

export const DEFAULT_CLAIM_WINDOW = 172800; // 48 hours

// ── ABIs ──────────────────────────────────────────────────────────────────────


export const QUIZ_REWARD_ABI = [
  "function fund(uint256 _tokenAmount) external payable",
  "function joinQuiz(address participant) external",
  "function submitQuiz(address participant) external",
  "function setRewardAmountsBatch(address[] users, uint256[] amounts) external",
  "function openClaimWindow() external",
  "function claim(address user) external",
  "function getClaimStatus(address user) external view returns (bool claimed, bool hasRewardAmount, uint256 rewardAmount, bool canClaim, uint256 timeRemaining)",
  "function totalParticipants() external view returns (uint256)",
  "function totalSubmissions() external view returns (uint256)",
  "function isClaimActive() external view returns (bool)",
  "function token() external view returns (address)",
  "function hasJoined(address) external view returns (bool)",
  "function hasClaimed(address) external view returns (bool)",
  "function paused() external view returns (bool)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── 1. Deploy QuizReward (no fund) ────────────────────────────────────────────
export async function deployQuizReward(
  provider: BrowserProvider,
  chainId: number,
  config: Pick<QuizRewardConfig, "name" | "tokenAddress" | "isNativeToken" | "claimWindowDuration">
): Promise<DeployResult> {
  const factoryAddress = FACTORY_ADDRESSES[chainId];
  if (!factoryAddress || !isAddress(factoryAddress)) {
    throw new Error(`No factory deployed on chain ${chainId}`);
  }
  if (!isAddress(VALID_BACKEND_ADDRESS) || !isAddress(BACKUP_BACKEND_ADDRESS)) {
    throw new Error("Backend wallet addresses not configured (check NEXT_PUBLIC_BACKEND_WALLET_A/B)");
  }

  const signer = await provider.getSigner();
  const factory = new Contract(factoryAddress, QUIZ_REWARD_ABI, signer);
  const tokenAddr = config.isNativeToken ? ZeroAddress : config.tokenAddress;

  const data = factory.interface.encodeFunctionData("createQuizReward", [
    config.name,
    tokenAddr,
    VALID_BACKEND_ADDRESS,
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

  const iface = new Interface(QUIZ_REWARD_ABI);
  let contractAddress = "";
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log as any);
      if (parsed?.name === "QuizRewardCreated") {
        contractAddress = parsed.args[0];
        break;
      }
    } catch {}
  }

  if (!contractAddress) throw new Error("QuizRewardCreated event not found in receipt");
  return { contractAddress, txHash: tx.hash };
}

// ── 2. Fund an existing QuizReward contract ───────────────────────────────────
export async function fundQuizReward(
  provider: BrowserProvider,
  chainId: number,
  contractAddress: string,
  config: Pick<QuizRewardConfig, "tokenAddress" | "tokenDecimals" | "isNativeToken" | "poolAmount">
): Promise<FundResult> {
  if (!isAddress(contractAddress)) throw new Error("Invalid contract address");

  const signer = await provider.getSigner();
  const amountBig = parseUnits(config.poolAmount, config.tokenDecimals);
  const contract = new Contract(contractAddress, QUIZ_REWARD_ABI, signer);

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