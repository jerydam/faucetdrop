import { ethers } from "ethers"
import { FACTORY_ABI, FAUCET_ABI, ERC20_ABI, FACTORY_ADDRESS } from "@/lib/constants"

// Get factory contract instance
export function getFactoryContract(providerOrSigner: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, providerOrSigner)
}

// Get faucet contract instance
export function getFaucetContract(faucetAddress: string, providerOrSigner: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(faucetAddress, FAUCET_ABI, providerOrSigner)
}

// Get ERC20 token contract instance
export function getTokenContract(tokenAddress: string, providerOrSigner: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(tokenAddress, ERC20_ABI, providerOrSigner)
}

// Format token amount based on decimals
export async function formatTokenAmount(
  amount: bigint | string | number,
  tokenAddress: string,
  provider: ethers.Provider,
): Promise<string> {
  try {
    const tokenContract = getTokenContract(tokenAddress, provider)
    const decimals = await tokenContract.decimals()
    return ethers.formatUnits(amount, decimals)
  } catch (error) {
    console.error("Error formatting token amount:", error)
    return ethers.formatUnits(amount, 18) // Default to 18 decimals
  }
}

// Parse token amount based on decimals
export async function parseTokenAmount(
  amount: string,
  tokenAddress: string,
  provider: ethers.Provider,
): Promise<bigint> {
  try {
    const tokenContract = getTokenContract(tokenAddress, provider)
    const decimals = await tokenContract.decimals()
    return ethers.parseUnits(amount, decimals)
  } catch (error) {
    console.error("Error parsing token amount:", error)
    return ethers.parseUnits(amount, 18) // Default to 18 decimals
  }
}

// Get token details (name, symbol, decimals)
export async function getTokenDetails(tokenAddress: string, provider: ethers.Provider) {
  try {
    const tokenContract = getTokenContract(tokenAddress, provider)
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ])
    return { name, symbol, decimals }
  } catch (error) {
    console.error("Error getting token details:", error)
    return { name: "Unknown Token", symbol: "???", decimals: 18 }
  }
}

// Check if user has approved token spending for faucet
export async function checkTokenAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  amount: bigint,
  provider: ethers.Provider,
): Promise<boolean> {
  try {
    const tokenContract = getTokenContract(tokenAddress, provider)
    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress)
    return allowance >= amount
  } catch (error) {
    console.error("Error checking token allowance:", error)
    return false
  }
}

// Approve token spending for faucet
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint,
  signer: ethers.Signer,
): Promise<ethers.ContractTransactionResponse> {
  const tokenContract = getTokenContract(tokenAddress, signer)
  return tokenContract.approve(spenderAddress, amount)
}
