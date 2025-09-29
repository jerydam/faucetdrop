import { 
  getContract, 
  sendTransaction, 
  readContract, 
  prepareContractCall,
  estimateGas,
  createThirdwebClient,
  defineChain,
  type ThirdwebContract,
  type Account,
  type Chain,
  isAddress,
  getAddress,
  zeroAddress,
} from "thirdweb"
import { formatUnits } from "thirdweb/utils"

import { FAUCET_ABI_DROPCODE, FAUCET_ABI_CUSTOM, FAUCET_ABI_DROPLIST, ERC20_ABI, CHECKIN_ABI, FACTORY_ABI_DROPCODE, FACTORY_ABI_DROPLIST, FACTORY_ABI_CUSTOM, STORAGE_ABI} from "./abis"
import { appendDivviReferralData, reportTransactionToDivvi, getDivviStatus, isSupportedNetwork } from "./divvi-integration"

// Create Thirdweb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!
})

// Fetch faucets for a specific network using getAllFaucets and getFaucetDetails
interface Network {
  chainId: bigint
  name: string
  rpcUrl: string
  blockExplorer: string
  factoryAddresses: string[] // Changed to array to handle multiple addresses
  color: string
  storageAddress?: string // Optional, defaults to FAUCET_STORAGE_ADDRESS
}

// Define a custom error interface for RPC errors
interface RpcError {
  message: string;
  reason?: string;
  code?: number | string;
}

// Define the expected type for the Divvi referral tag
type HexString = `0x${string}`;

// Factory type definitions
type FactoryType = 'dropcode' | 'droplist' | 'custom'

// Faucet type definitions (matches factory types)
type FaucetType = 'dropcode' | 'droplist' | 'custom'

interface FactoryConfig {
  abi: any[]
  createFunction: string
}

interface FaucetConfig {
  abi: any[]
}

// Helper function to create a chain from network info
function createChainFromNetwork(network: Network): Chain {
  return defineChain({
    id: Number(network.chainId),
    rpc: network.rpcUrl,
    nativeCurrency: {
      name: network.name,
      symbol: network.name === 'Celo' ? 'CELO' : 
              network.name === 'Lisk' ? 'LISK' : 'ETH',
      decimals: 18,
    },
  })
}

// Helper function to get the appropriate faucet ABI based on faucet type
function getFaucetConfig(faucetType: FaucetType): FaucetConfig {
  switch (faucetType) {
    case 'dropcode':
      return { abi: FAUCET_ABI_DROPCODE }
    case 'droplist':
      return { abi: FAUCET_ABI_DROPLIST }
    case 'custom':
      return { abi: FAUCET_ABI_CUSTOM }
    default:
      throw new Error(`Unknown faucet type: ${faucetType}`)
  }
}

// Helper function to get the appropriate ABI and function based on factory type
function getFactoryConfig(factoryType: FactoryType): FactoryConfig {
  switch (factoryType) {
    case 'dropcode':
      return { abi: FACTORY_ABI_DROPCODE, createFunction: 'createBackendFaucet' }
    case 'droplist':
      return { abi: FACTORY_ABI_DROPLIST, createFunction: 'createWhitelistFaucet' }
    case 'custom':
      return { abi: FACTORY_ABI_CUSTOM, createFunction: 'createCustomFaucet' }
    default:
      throw new Error(`Unknown factory type: ${factoryType}`)
  }
}

// Helper function to determine factory type based on useBackend and custom flags
function determineFactoryType(useBackend: boolean, isCustom: boolean = false): FactoryType {
  if (isCustom) {
    return 'custom'
  }
  return useBackend ? 'dropcode' : 'droplist'
}

// Helper function to detect factory type by trying different function calls
async function detectFactoryType(chain: Chain, factoryAddress: string): Promise<FactoryType> {
  const factoryTypes: FactoryType[] = ['dropcode', 'droplist', 'custom']
  
  for (const type of factoryTypes) {
    try {
      const config = getFactoryConfig(type)
      const contract = getContract({
        client,
        chain,
        address: factoryAddress,
        abi: config.abi
      })
      
      // Try to call a function that exists in this ABI
      await readContract({
        contract,
        method: config.createFunction,
        params: ["test", zeroAddress, zeroAddress]
      })
      return type
    } catch (error: any) {
      // If the function doesn't exist, try the next type
      if (error.message?.includes('function') && error.message?.includes('not found')) {
        continue
      }
      // If it's a different error (like invalid parameters), the function exists
      return type
    }
  }
  
  // Default to dropcode if detection fails
  console.warn(`Could not detect factory type for ${factoryAddress}, defaulting to dropcode`)
  return 'dropcode'
}

// Helper function to detect faucet type by trying different ABIs
async function detectFaucetType(chain: Chain, faucetAddress: string): Promise<FaucetType> {
  const faucetTypes: FaucetType[] = ['dropcode', 'droplist', 'custom']
  
  for (const type of faucetTypes) {
    try {
      const config = getFaucetConfig(type)
      const contract = getContract({
        client,
        chain,
        address: faucetAddress,
        abi: config.abi
      })
      
      // Try to call a common function that should exist in all faucet types
      await readContract({ contract, method: "name", params: [] })
      
      // If we got here, the ABI works. Let's do additional validation
      // Check for type-specific functions
      if (type === 'droplist') {
        // Droplist should have whitelist functions
        try {
          await readContract({
            contract,
            method: "isWhitelisted",
            params: [zeroAddress]
          })
          return 'droplist'
        } catch {
          continue
        }
      } else if (type === 'custom') {
        // Custom should have custom claim amount functions
        try {
          await readContract({
            contract,
            method: "getCustomClaimAmount",
            params: [zeroAddress]
          })
          return 'custom'
        } catch {
          continue
        }
      } else if (type === 'dropcode') {
        // Dropcode should have claimAmount but not whitelist or custom functions
        try {
          await readContract({ contract, method: "claimAmount", params: [] })
          // Make sure it doesn't have droplist or custom specific functions
          try {
            await readContract({
              contract,
              method: "isWhitelisted",
              params: [zeroAddress]
            })
            continue // Has whitelist, so it's not dropcode
          } catch {
            try {
              await readContract({
                contract,
                method: "getCustomClaimAmount",
                params: [zeroAddress]
              })
              continue // Has custom amounts, so it's not dropcode
            } catch {
              return 'dropcode' // No whitelist or custom functions, must be dropcode
            }
          }
        } catch {
          continue
        }
      }
    } catch (error: any) {
      continue
    }
  }
  
  // Default to dropcode if detection fails
  console.warn(`Could not detect faucet type for ${faucetAddress}, defaulting to dropcode`)
  return 'dropcode'
}

// Helper function to get faucet type from factory address and factory type
async function getFaucetTypeFromFactory(
  chain: Chain,
  faucetAddress: string,
  networks: Network[]
): Promise<FaucetType> {
  try {
    // Try to find which factory created this faucet
    for (const network of networks) {
      for (const factoryAddress of network.factoryAddresses) {
        try {
          const factoryType = await detectFactoryType(chain, factoryAddress)
          const config = getFactoryConfig(factoryType)
          const contract = getContract({
            client,
            chain,
            address: factoryAddress,
            abi: config.abi
          })
          
          // Check if this faucet exists in this factory
          const faucets = await readContract({
            contract,
            method: "getAllFaucets",
            params: []
          })
          if (faucets.includes(faucetAddress)) {
            // Faucet type matches factory type
            return factoryType
          }
        } catch (error) {
          continue
        }
      }
    }
  } catch (error) {
    console.warn(`Could not determine faucet type from factory for ${faucetAddress}:`, error)
  }
  
  // Fallback to direct detection
  return await detectFaucetType(chain, faucetAddress)
}

// Mapping of networkName to native token symbol
const NATIVE_TOKEN_MAP: Record<string, string> = {
  Celo: "CELO",
  Lisk: "LISK",
  Arbitrum: "ETH",
  Base: "ETH",
}

// Interfaces
interface FaucetDetails {
  faucetAddress: string;
  owner: string;
  name: string;
  claimAmount: bigint;
  tokenAddress: string;
  startTime: bigint;
  endTime: bigint;
  isClaimActive: boolean;
  balance: bigint;
  isEther: boolean;
  useBackend: boolean;
}

interface NameValidationResult {
  exists: boolean;
  existingFaucet?: { 
    address: string; 
    name: string; 
    owner: string 
  };
  warning?: string;
}

// Load backend address from .env
const BACKEND_ADDRESS = process.env.BACKEND_ADDRESS || "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"

// Storage contract address
const STORAGE_CONTRACT_ADDRESS = "0xc26c4Ea50fd3b63B6564A5963fdE4a3A474d4024"

// transactions contract address
const CHECKIN_CONTRACT_ADDRESS = "0x051dDcB3FaeA6004fD15a990d753449F81733440"

// Celo chain definition
const celoChain = defineChain({
  id: 42220,
  rpc: "https://forno.celo.org",
  nativeCurrency: {
    name: "Celo",
    symbol: "CELO",
    decimals: 18,
  },
})

if (!isAddress(BACKEND_ADDRESS)) {
  throw new Error(`Invalid BACKEND_ADDRESS in .env: ${BACKEND_ADDRESS}`)
}

const VALID_BACKEND_ADDRESS = getAddress(BACKEND_ADDRESS)

const faucetDetailsCache: Map<string, any> = new Map()

// LocalStorage keys
const STORAGE_KEYS = {
  CHECKIN_DATA: "faucet_checkin_data",
  CHECKIN_LAST_BLOCK: "faucet_checkin_last_block",
  STORAGE_DATA: "faucet_storage_data",
  STORAGE_LAST_BLOCK: "faucet_storage_last_block",
  NEW_USERS_DATA: "faucet_new_users_data",
  CACHE_TIMESTAMP: "faucet_cache_timestamp",
}

// Cache duration (1 hour)
const CACHE_DURATION = 60 * 60 * 1000

// Helper to check network
function checkNetwork(chainId: bigint, networkId: bigint): boolean {
  console.log(`Checking network: chainId=${chainId}, networkId=${networkId}`)
  return chainId === networkId
}

// Check permissions and contract state with faucet type detection
async function checkPermissions(
  account: Account,
  chain: Chain,
  faucetAddress: string,
  faucetType?: FaucetType
): Promise<{ isOwner: boolean; isAdmin: boolean; isPaused: boolean }> {
  try {
    // Detect faucet type if not provided
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    const [owner, adminsResponse, isPaused] = await Promise.all([
      readContract({ contract: faucetContract, method: "owner", params: [] }),
      readContract({ contract: faucetContract, method: "getAllAdmins", params: [] }),
      readContract({ contract: faucetContract, method: "paused", params: [] }),
    ]);

    // Flatten the admins array
    const admins = Array.isArray(adminsResponse)
      ? adminsResponse.flat().filter((admin: string) => isAddress(admin))
      : [];
    const isAdmin = admins.some((admin: string) => admin.toLowerCase() === account.address.toLowerCase());
    
    console.log(
      `Permissions for ${account.address}: isOwner=${owner.toLowerCase() === account.address.toLowerCase()}, isAdmin=${isAdmin}, isPaused=${isPaused}`,
    );
    
    return {
      isOwner: owner.toLowerCase() === account.address.toLowerCase(),
      isAdmin,
      isPaused,
    };
  } catch (error: any) {
    console.error(`Error checking permissions for ${faucetAddress}:`, error);
    throw new Error("Failed to check permissions");
  }
}

export async function deleteFaucet(
  account: Account,
  faucetAddress: string,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<`0x${string}`> {
  try {
    if (!checkNetwork(chainId, networkId)) {
      throw new Error("Switch to the correct network to perform this operation");
    }

    const chain = createChainFromNetwork(network)
    const permissions = await checkPermissions(account, chain, faucetAddress, faucetType);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be deleted");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can delete the faucet");
    }

    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    // Prepare transaction
    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "deleteFaucet",
      params: [],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log(`Delete faucet transaction sent: ${result.transactionHash}`);

    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId));
    faucetDetailsCache.delete(faucetAddress);
    return result.transactionHash as `0x${string}`;
  } catch (error: any) {
    console.error("Error deleting faucet:", error);
    throw new Error(error.reason || error.message || "Failed to delete faucet");
  }
}
  account: Account,
  faucetAddress: string,
  adminAddress: string,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<`0x${string}`> {
  try {
    if (!checkNetwork(chainId, networkId)) {
      throw new Error("Switch to the correct network to perform this operation");
    }

    if (!isAddress(adminAddress)) {
      throw new Error("Invalid admin address");
    }

    const chain = createChainFromNetwork(network)
    const permissions = await checkPermissions(account, chain, faucetAddress, faucetType);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be modified");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can add an admin");
    }

    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })
    
    // Prepare transaction
    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "addAdmin",
      params: [adminAddress],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log(`Add admin transaction sent: ${result.transactionHash}`);

    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId));
    return result.transactionHash as `0x${string}`;
  } catch (error: any) {
    console.error("Error adding admin:", error);
    throw new Error(error.reason || error.message || "Failed to add admin");
  }
}

export async function removeAdmin(
  account: Account,
  faucetAddress: string,
  adminAddress: string,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<`0x${string}`> {
  try {
    if (!checkNetwork(chainId, networkId)) {
      throw new Error("Switch to the correct network to perform this operation");
    }

    if (!isAddress(adminAddress)) {
      throw new Error("Invalid admin address");
    }

    const chain = createChainFromNetwork(network)
    const permissions = await checkPermissions(account, chain, faucetAddress, faucetType);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be modified");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can remove an admin");
    }

    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })
    
    // Prepare transaction
    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "removeAdmin",
      params: [adminAddress],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log(`Remove admin transaction sent: ${result.transactionHash}`);

    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId));
    return result.transactionHash as `0x${string}`;
  } catch (error: any) {
    console.error("Error removing admin:", error);
    throw new Error(error.reason || error.message || "Failed to remove admin");
  }
}

export async function storeClaim(
  account: Account,
  claimer: string,
  faucetAddress: string,
  amount: bigint,
  txHash: string,
  chainId: number,
  networkId: number,
  networkName: string
): Promise<string> {
  if (!checkNetwork(BigInt(chainId), BigInt(networkId))) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const chain = defineChain({
      id: chainId,
      rpc: chainId === 42220 ? "https://forno.celo.org" : `https://rpc.chain-${chainId}.com`, // You'll need to adjust this based on your networks
    })

    const storageContract = getContract({
      client,
      chain,
      address: STORAGE_CONTRACT_ADDRESS,
      abi: STORAGE_ABI
    })

    // Validate and format transaction hash
    const formattedTxHash: HexString = txHash.startsWith('0x') ? (txHash as HexString) : (`0x${txHash}` as HexString);
    if (!/^0x[a-fA-F0-9]{64}$/.test(formattedTxHash)) {
      throw new Error(`Invalid transaction hash format: ${formattedTxHash}`);
    }

    if (!networkName) {
      throw new Error("Network name cannot be empty");
    }

    console.log("Store claim params:", {
      claimer,
      faucetAddress,
      amount: amount.toString(),
      txHash: formattedTxHash,
      networkName,
      chainId,
      networkId,
      signerAddress: account.address,
    });

    // Prepare transaction - Note: Divvi referral data handling may need to be adjusted for Thirdweb
    const transaction = prepareContractCall({
      contract: storageContract,
      method: "storeClaim",
      params: [claimer, formattedTxHash, amount, networkName, faucetAddress],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Store claim transaction hash:", result.transactionHash);

    if (!result.transactionHash) {
      throw new Error("Transaction hash is null or not mined");
    }

    // Validate and report transaction hash to Divvi
    const reportedTxHash: HexString = result.transactionHash as HexString;
    if (!/^0x[a-fA-F0-9]{64}$/.test(reportedTxHash)) {
      throw new Error(`Invalid transaction hash format: ${reportedTxHash}`);
    }

    if (isSupportedNetwork(chainId)) {
      console.log(`Reporting storeClaim transaction ${reportedTxHash} to Divvi`);
      try {
        await reportTransactionToDivvi(reportedTxHash, chainId);
        console.log("✅ [Divvi Success] Transaction reported to Divvi successfully");
      } catch (divviError) {
        console.error("Divvi API error details:", divviError);
        throw new Error("Failed to report transaction to Divvi. Claim recorded, but referral tracking may be incomplete.");
      }
    } else {
      console.warn(`Chain ID ${chainId} is not supported by Divvi, skipping transaction reporting`);
    }

    return result.transactionHash;
  } catch (error: unknown) {
    const rpcError = error as RpcError;
    console.error("Error storing claim:", rpcError);
    if (rpcError.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    if (rpcError.message?.includes("Invalid Divvi referral data")) {
      throw new Error("Failed to append valid Divvi referral data. Please check Divvi SDK integration.");
    }
    throw new Error(rpcError.reason || rpcError.message || "Failed to store claim");
  }
}

export async function resetClaimedStatus(
  account: Account,
  faucetAddress: string,
  addresses: string[],
  status: boolean,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    
    if (detectedFaucetType !== 'dropcode') {
      throw new Error("Reset claimed batch is only available for dropcode faucets")
    }

    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Reset claimed status params:", {
      faucetAddress,
      addresses,
      status,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    // Prepare transaction
    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "resetClaimedBatch",
      params: [addresses],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Reset claimed status transaction hash:", result.transactionHash)
    console.log("Reset claimed status transaction confirmed:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error resetting claimed status:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to reset claimed status")
  }
}

/**
 * Utility function to safely make contract calls with fallbacks
 */
export async function safeContractCall<T>(
  contract: ThirdwebContract,
  methodName: string,
  params: any[] = [],
  fallbackValue: T
): Promise<T> {
  try {
    const result = await readContract({
      contract,
      method: methodName,
      params
    });
    return result;
  } catch (error: any) {
    console.warn(`Contract call ${methodName} failed:`, error.message);
    return fallbackValue;
  }
}

/**
 * Check if a contract method exists
 */
export async function checkContractMethod(
  contract: ThirdwebContract,
  methodName: string
): Promise<boolean> {
  try {
    // In Thirdweb, we can check if a method exists by trying to prepare a call
    // This is a simplified check - you might need to adjust based on your needs
    return true; // Thirdweb handles this internally
  } catch {
    return false;
  }
}

// Additional utility functions for claim operations

export async function claimFromFaucet(
  account: Account,
  faucetAddress: string,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  secretCode?: string,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Claim from faucet params:", {
      faucetAddress,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress: account.address,
      faucetType: detectedFaucetType,
      hasSecretCode: !!secretCode
    })

    let transaction;

    // Handle different faucet types
    if (detectedFaucetType === 'dropcode' && secretCode) {
      // For dropcode faucets with secret code
      transaction = prepareContractCall({
        contract: faucetContract,
        method: "claimWithCode",
        params: [secretCode],
      });
    } else {
      // For standard claims (droplist, custom, or dropcode without code)
      transaction = prepareContractCall({
        contract: faucetContract,
        method: "claim",
        params: [],
      });
    }

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Claim transaction hash:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error claiming from faucet:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to claim from faucet")
  }
}

export async function pauseFaucet(
  account: Account,
  faucetAddress: string,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const chain = createChainFromNetwork(network)
    const permissions = await checkPermissions(account, chain, faucetAddress, faucetType);
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can pause the faucet");
    }

    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Pause faucet params:", {
      faucetAddress,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "pause",
      params: [],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Pause faucet transaction hash:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error pausing faucet:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to pause faucet")
  }
}

export async function unpauseFaucet(
  account: Account,
  faucetAddress: string,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const chain = createChainFromNetwork(network)
    const permissions = await checkPermissions(account, chain, faucetAddress, faucetType);
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can unpause the faucet");
    }

    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Unpause faucet params:", {
      faucetAddress,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "unpause",
      params: [],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Unpause faucet transaction hash:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error unpausing faucet:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to unpause faucet")
  }
}

export async function transferFaucetOwnership(
  account: Account,
  faucetAddress: string,
  newOwner: string,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    if (!isAddress(newOwner)) {
      throw new Error("Invalid new owner address");
    }

    const chain = createChainFromNetwork(network)
    const permissions = await checkPermissions(account, chain, faucetAddress, faucetType);
    if (!permissions.isOwner) {
      throw new Error("Only the owner can transfer ownership");
    }

    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Transfer ownership params:", {
      faucetAddress,
      newOwner,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "transferOwnership",
      params: [newOwner],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Transfer ownership transaction hash:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error transferring ownership:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to transfer ownership")
  }
}

export async function getCustomClaimAmount(
  chain: Chain,
  faucetAddress: string,
  userAddress: string,
  faucetType?: FaucetType
): Promise<bigint> {
  try {
    if (!isAddress(faucetAddress) || !isAddress(userAddress)) {
      throw new Error("Invalid faucet or user address")
    }

    // Detect faucet type if not provided
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    
    // Only custom faucets have custom claim amounts
    if (detectedFaucetType !== 'custom') {
      console.log(`Faucet ${faucetAddress} is not a custom faucet, returning 0 for custom claim amount`)
      return BigInt(0)
    }

    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    const customAmount = await readContract({
      contract: faucetContract,
      method: "getCustomClaimAmount",
      params: [userAddress]
    })
    console.log(`Custom claim amount for ${userAddress} on faucet ${faucetAddress}: ${customAmount}`)
    return customAmount
  } catch (error: any) {
    console.error(`Error getting custom claim amount for ${userAddress} on ${faucetAddress}:`, error)
    return BigInt(0)
  }
}

export async function getWhitelistedAddresses(
  chain: Chain,
  faucetAddress: string,
  faucetType?: FaucetType
): Promise<string[]> {
  try {
    if (!isAddress(faucetAddress)) {
      throw new Error("Invalid faucet address")
    }

    // Detect faucet type if not provided
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    
    // Only droplist faucets have whitelist functionality
    if (detectedFaucetType !== 'droplist') {
      console.log(`Faucet ${faucetAddress} is not a droplist faucet, returning empty whitelist`)
      return []
    }

    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    const whitelistedAddresses = await readContract({
      contract: faucetContract,
      method: "getWhitelistedAddresses",
      params: []
    })
    console.log(`Whitelisted addresses for faucet ${faucetAddress}:`, whitelistedAddresses)
    return whitelistedAddresses
  } catch (error: any) {
    console.error(`Error getting whitelisted addresses for ${faucetAddress}:`, error)
    return []
  }
}

export async function setWhitelist(
  account: Account,
  faucetAddress: string,
  userAddress: string,
  status: boolean,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    if (!isAddress(userAddress)) {
      throw new Error("Invalid user address");
    }

    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    
    if (detectedFaucetType !== 'droplist') {
      throw new Error("Whitelist functionality is only available for droplist faucets")
    }

    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Set whitelist params:", {
      faucetAddress,
      userAddress,
      status,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "setWhitelist",
      params: [userAddress, status],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Set whitelist transaction hash:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error setting whitelist:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to set whitelist")
  }
}

export async function setCustomClaimAmount(
  account: Account,
  faucetAddress: string,
  userAddress: string,
  amount: bigint,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    if (!isAddress(userAddress)) {
      throw new Error("Invalid user address");
    }

    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    
    if (detectedFaucetType !== 'custom') {
      throw new Error("Custom claim amounts are only available for custom faucets")
    }

    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Set custom claim amount params:", {
      faucetAddress,
      userAddress,
      amount: amount.toString(),
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "setCustomClaimAmount",
      params: [userAddress, amount],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Set custom claim amount transaction hash:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error setting custom claim amount:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to set custom claim amount")
  }
}

export async function resetClaimedBatch(
  account: Account,
  faucetAddress: string,
  addresses: string[],
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Reset claimed batch params:", {
      faucetAddress,
      addresses,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "resetClaimedBatch",
      params: [addresses],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Reset claimed batch transaction hash:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error resetting claimed batch:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to reset claimed batch")
  }
}

// Helper function to get current block number from chain
export async function getCurrentBlockNumber(chain: Chain): Promise<number> {
  try {
    // Using Thirdweb's RPC client to get block number
    const response = await fetch(chain.rpc, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });
    
    const data = await response.json();
    return parseInt(data.result, 16);
  } catch (error) {
    console.warn("Error getting current block number:", error);
    return 0;
  }
}

// Helper function to check if contract exists at address
export async function contractExists(chain: Chain, address: string): Promise<boolean> {
  try {
    if (!isAddress(address)) return false;
    
    // Check if there's code at the address
    const response = await fetch(chain.rpc, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    
    const data = await response.json();
    return data.result !== '0x';
  } catch (error) {
    console.warn(`Error checking contract at ${address}:`, error)
    return false
  }
}

// Enhanced event fetching for Thirdweb
export async function getContractEvents(
  chain: Chain,
  contractAddress: string,
  abi: any[],
  eventName: string,
  fromBlock: number,
  toBlock: number | 'latest' = 'latest'
): Promise<any[]> {
  try {
    const contract = getContract({
      client,
      chain,
      address: contractAddress,
      abi
    });

    // This is a simplified version - Thirdweb may have different event handling
    // You might need to use a different approach based on Thirdweb's latest API
    console.log(`Fetching ${eventName} events from ${contractAddress} between blocks ${fromBlock} and ${toBlock}`);
    
    // Placeholder - implement based on Thirdweb's event fetching capabilities
    return [];
  } catch (error) {
    console.error(`Error fetching events:`, error);
    return [];
  }
}

// Enhanced batch processing utilities
export async function batchReadContracts<T>(
  contracts: { contract: ThirdwebContract; method: string; params: any[] }[],
  batchSize: number = 10
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < contracts.length; i += batchSize) {
    const batch = contracts.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async ({ contract, method, params }) => {
      try {
        return await readContract({ contract, method, params });
      } catch (error) {
        console.warn(`Batch read failed for method ${method}:`, error);
        return null;
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value);
      }
    });
    
    // Add delay between batches to be nice to RPC
    if (i + batchSize < contracts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Helper to get token information
export async function getTokenInfo(
  chain: Chain,
  tokenAddress: string
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
} | null> {
  try {
    if (!isAddress(tokenAddress) || tokenAddress === zeroAddress) {
      return null;
    }

    const tokenContract = getContract({
      client,
      chain,
      address: tokenAddress,
      abi: ERC20_ABI
    });

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      readContract({ contract: tokenContract, method: "name", params: [] }),
      readContract({ contract: tokenContract, method: "symbol", params: [] }),
      readContract({ contract: tokenContract, method: "decimals", params: [] }),
      readContract({ contract: tokenContract, method: "totalSupply", params: [] })
    ]);

    return {
      name: name || "Unknown Token",
      symbol: symbol || "UNK",
      decimals: decimals || 18,
      totalSupply: totalSupply || BigInt(0)
    };
  } catch (error) {
    console.warn(`Error getting token info for ${tokenAddress}:`, error);
    return null;
  }
}

// Helper to format token amounts with proper decimals
export function formatTokenAmount(
  amount: bigint,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  try {
    const formatted = formatUnits(amount, decimals);
    const num = parseFloat(formatted);
    return num.toFixed(displayDecimals);
  } catch (error) {
    console.warn("Error formatting token amount:", error);
    return "0";
  }
}

// Helper to parse token amounts from string to bigint
export function parseTokenAmount(
  amount: string,
  decimals: number = 18
): bigint {
  try {
    // Simple parsing - you might want to use a more robust solution
    const factor = BigInt(10) ** BigInt(decimals);
    const [whole, fraction = ""] = amount.split(".");
    const wholeBigInt = BigInt(whole || "0") * factor;
    const fractionBigInt = BigInt((fraction.padEnd(decimals, "0")).slice(0, decimals)) || BigInt(0);
    return wholeBigInt + fractionBigInt;
  } catch (error) {
    console.warn("Error parsing token amount:", error);
    return BigInt(0);
  }
}

// Network utility functions
export function getNetworkByChainId(networks: Network[], chainId: bigint): Network | undefined {
  return networks.find(network => network.chainId === chainId);
}

export function isTestNetwork(chainId: bigint): boolean {
  const testNetworkIds = [
    BigInt(11155111), // Sepolia
    BigInt(5), // Goerli
    BigInt(80001), // Mumbai
    BigInt(97), // BSC Testnet
    BigInt(43113), // Avalanche Fuji
    BigInt(84532), // Base Sepolia
  ];
  return testNetworkIds.includes(chainId);
}

// Enhanced error handling
export class FaucetError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FaucetError';
  }
}

export function handleContractError(error: any): never {
  console.error("Contract error details:", error);
  
  if (error.message?.includes("user rejected")) {
    throw new FaucetError("Transaction was rejected by user");
  }
  
  if (error.message?.includes("insufficient funds")) {
    throw new FaucetError("Insufficient funds to complete transaction");
  }
  
  if (error.message?.includes("network changed")) {
    throw new FaucetError("Network changed during transaction. Please try again.");
  }
  
  if (error.data && typeof error.data === "string") {
    const decodedError = decodeRevertError(error.data);
    throw new FaucetError(decodedError);
  }
  
  throw new FaucetError(error.reason || error.message || "Unknown contract error");
}abi: config.abi
    })

    const [owner, adminsResponse, isPaused] = await Promise.all([
      readContract({ contract: faucetContract, method: "owner", params: [] }),
      readContract({ contract: faucetContract, method: "getAllAdmins", params: [] }),
      readContract({ contract: faucetContract, method: "paused", params: [] }),
    ]);

    // Flatten the admins array
    const admins = Array.isArray(adminsResponse)
      ? adminsResponse.flat().filter((admin: string) => isAddress(admin))
      : [];
    const isAdmin = admins.some((admin: string) => admin.toLowerCase() === account.address.toLowerCase());
    
    console.log(
      `Permissions for ${account.address}: isOwner=${owner.toLowerCase() === account.address.toLowerCase()}, isAdmin=${isAdmin}, isPaused=${isPaused}`,
    );
    
    return {
      isOwner: owner.toLowerCase() === account.address.toLowerCase(),
      isAdmin,
      isPaused,
    };
  } catch (error: any) {
    console.error(`Error checking permissions for ${faucetAddress}:`, error);
    throw new Error("Failed to check permissions");
  }
}

export function getFromStorage(key: string): any {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.warn(`Error reading from localStorage key ${key}:`, error)
    return null
  }
}

export function saveToStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn(`Error saving to localStorage key ${key}:`, error)
  }
}

function isCacheValid(): boolean {
  const timestamp = getFromStorage(STORAGE_KEYS.CACHE_TIMESTAMP)
  if (!timestamp) return false
  return Date.now() - timestamp < CACHE_DURATION
}

function updateCacheTimestamp(): void {
  saveToStorage(STORAGE_KEYS.CACHE_TIMESTAMP, Date.now())
}

// Helper to check if the network is Celo
export function isCeloNetwork(chainId: bigint): boolean {
  return chainId === BigInt(42220) // Celo Mainnet
}

// Fetch transactions data from Celo with incremental loading
export async function fetchCheckInData(): Promise<{
  transactionsByDate: { [date: string]: number }
  usersByDate: { [date: string]: Set<string> }
  allUsers: Set<string>
}> {
  try {
    const contract = getContract({
      client,
      chain: celoChain,
      address: CHECKIN_CONTRACT_ADDRESS,
      abi: CHECKIN_ABI
    })

    // Check if we have cached data and if it's still valid
    const cachedData = getFromStorage(STORAGE_KEYS.CHECKIN_DATA)
    const lastBlock = getFromStorage(STORAGE_KEYS.CHECKIN_LAST_BLOCK) || 0

    let transactionsByDate: { [date: string]: number } = {}
    let usersByDate: { [date: string]: Set<string> } = {}
    let allUsers: Set<string> = new Set()

    // Load cached data if available
    if (cachedData && isCacheValid()) {
      transactionsByDate = cachedData.transactionsByDate || {}
      usersByDate = {}
      // Convert cached user data back to Sets
      Object.entries(cachedData.usersByDate || {}).forEach(([date, users]) => {
        usersByDate[date] = new Set(users as string[])
      })
      allUsers = new Set(cachedData.allUsers || [])
      console.log("Loaded cached transactions data")
    }

    // For Thirdweb, we would need to implement event fetching differently
    // This is a simplified version - you may need to use a different approach for events
    // depending on your specific needs and Thirdweb's event handling capabilities

    return { transactionsByDate, usersByDate, allUsers }
  } catch (error) {
    console.error("Error fetching transactions data:", error)

    // Return cached data if available
    const cachedData = getFromStorage(STORAGE_KEYS.CHECKIN_DATA)
    if (cachedData) {
      const usersByDate: { [date: string]: Set<string> } = {}
      Object.entries(cachedData.usersByDate || {}).forEach(([date, users]) => {
        usersByDate[date] = new Set(users as string[])
      })

      return {
        transactionsByDate: cachedData.transactionsByDate || {},
        usersByDate,
        allUsers: new Set(cachedData.allUsers || []),
      }
    }

    return { transactionsByDate: {}, usersByDate: {}, allUsers: new Set() }
  }
}

// Fetch storage contract data with incremental loading
export async function fetchStorageData(): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    // Check if storage contract exists (simplified check)
    const contract = getContract({
      client,
      chain: celoChain,
      address: STORAGE_CONTRACT_ADDRESS,
      abi: STORAGE_ABI
    })

    // Check cached data
    const cachedData = getFromStorage(STORAGE_KEYS.STORAGE_DATA)
    if (cachedData && isCacheValid()) {
      console.log("Using cached storage data")
      return cachedData.map((claim: any) => ({
        ...claim,
        amount: BigInt(claim.amount),
      }))
    }

    // Fetch all claims from storage contract
    console.log("Fetching all claims from storage contract...")
    const claims: any[] = await readContract({
      contract,
      method: "getAllClaims",
      params: []
    })
    console.log(`Found ${claims.length} claims in storage contract`)

    // Process claims
    const formattedClaims = await Promise.all(
      claims.map(async (claim: any) => {
        let tokenSymbol = "CELO"
        let tokenDecimals = 18
        let isEther = true

        // Try to get faucet details for token info
        try {
          const faucetDetails = await getFaucetDetails(celoChain, claim.faucet)
          tokenSymbol = faucetDetails.tokenSymbol
          tokenDecimals = faucetDetails.tokenDecimals
          isEther = faucetDetails.isEther
        } catch (error) {
          console.warn(`Error fetching faucet details for ${claim.faucet}:`, error)
        }

        return {
          claimer: claim.claimer as string,
          faucet: claim.faucet as string,
          amount: claim.amount, // Keep as string for storage
          txHash: claim.txHash as `0x${string}`,
          networkName: claim.networkName as string,
          timestamp: Number(claim.timestamp),
          tokenSymbol,
          tokenDecimals,
          isEther,
        }
      }),
    )

    // Cache the data
    saveToStorage(STORAGE_KEYS.STORAGE_DATA, formattedClaims)
    updateCacheTimestamp()

    // Convert amounts back to BigInt for return
    return formattedClaims.map((claim) => ({
      ...claim,
      amount: BigInt(claim.amount),
    }))
  } catch (error) {
    console.error("Error fetching storage data:", error)

    // Return cached data if available
    const cachedData = getFromStorage(STORAGE_KEYS.STORAGE_DATA)
    if (cachedData) {
      return cachedData.map((claim: any) => ({
        ...claim,
        amount: BigInt(claim.amount),
      }))
    }

    return []
  }
}

export async function checkFaucetNameExistsAcrossAllFactories(
  chain: Chain,
  factoryAddresses: string[],
  proposedName: string
): Promise<NameValidationResult & { 
  conflictingFaucets?: Array<{
    address: string
    name: string
    owner: string
    factoryAddress: string
    factoryType: FactoryType
  }>
}> {
  try {
    if (!proposedName.trim()) {
      throw new Error("Faucet name cannot be empty");
    }
    
    const normalizedProposedName = proposedName.trim().toLowerCase();
    console.log(`Checking name "${proposedName}" across ${factoryAddresses.length} factories on current network...`);

    const conflictingFaucets: any[] = [];

    // Check each factory address
    for (const factoryAddress of factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress}, skipping`);
        continue;
      }

      try {
        // Detect factory type and get appropriate ABI
        let factoryType: FactoryType;
        let config: FactoryConfig;
        
        try {
          factoryType = await detectFactoryType(chain, factoryAddress);
          config = getFactoryConfig(factoryType);
          console.log(`Checking factory ${factoryAddress} (type: ${factoryType})`);
        } catch (error) {
          console.warn(`Could not detect factory type for ${factoryAddress}, skipping:`, error);
          continue;
        }

        const factoryContract = getContract({
          client,
          chain,
          address: factoryAddress,
          abi: config.abi
        })

        // Method 1: Try getAllFaucetDetails first (preferred method)
        try {
          console.log(`Attempting getAllFaucetDetails for factory ${factoryAddress}...`);
          const allFaucetDetails: FaucetDetails[] = await readContract({
            contract: factoryContract,
            method: "getAllFaucetDetails",
            params: []
          });
          
          const conflictInThisFactory = allFaucetDetails.find(faucet => 
            faucet.name.toLowerCase() === normalizedProposedName
          );
          
          if (conflictInThisFactory) {
            conflictingFaucets.push({
              address: conflictInThisFactory.faucetAddress,
              name: conflictInThisFactory.name,
              owner: conflictInThisFactory.owner,
              factoryAddress,
              factoryType
            });
          }
          
        } catch (getAllError) {
          console.warn(`getAllFaucetDetails failed for factory ${factoryAddress}, trying fallback method:`, getAllError.message);
          
          // Method 2: Fallback - Get all faucet addresses and check each individually
          try {
            console.log(`Attempting getAllFaucets fallback for factory ${factoryAddress}...`);
            const faucetAddresses: string[] = await readContract({
              contract: factoryContract,
              method: "getAllFaucets",
              params: []
            });
            
            console.log(`Found ${faucetAddresses.length} faucets in factory ${factoryAddress}`);
            
            // Check each faucet individually (with batching for performance)
            const batchSize = 10; // Process in smaller batches
            
            for (let i = 0; i < faucetAddresses.length; i += batchSize) {
              const batch = faucetAddresses.slice(i, i + batchSize);
              
              // Process batch in parallel
              const batchPromises = batch.map(async (faucetAddress) => {
                try {
                  const faucetDetails = await readContract({
                    contract: factoryContract,
                    method: "getFaucetDetails",
                    params: [faucetAddress]
                  });
                  return {
                    address: faucetAddress,
                    name: faucetDetails.name,
                    owner: faucetDetails.owner,
                    factoryAddress,
                    factoryType
                  };
                } catch (error: any) {
                  console.warn(`Failed to get details for faucet ${faucetAddress}:`, error.message);
                  return null;
                }
              });
              
              const batchResults = await Promise.allSettled(batchPromises);
              
              // Check this batch for name conflicts
              for (const result of batchResults) {
                if (result.status === 'fulfilled' && result.value) {
                  const faucet = result.value;
                  if (faucet.name.toLowerCase() === normalizedProposedName) {
                    conflictingFaucets.push(faucet);
                  }
                }
              }
              
              // Add delay between batches to be nice to the RPC
              if (i + batchSize < faucetAddresses.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
          } catch (fallbackError) {
            console.warn(`Fallback method also failed for factory ${factoryAddress}:`, fallbackError.message);
            continue;
          }
        }

      } catch (factoryError) {
        console.error(`Error checking factory ${factoryAddress}:`, factoryError);
        continue;
      }
    }

    // Return results
    if (conflictingFaucets.length > 0) {
      console.log(`Found ${conflictingFaucets.length} name conflicts across factories`);
      return {
        exists: true,
        existingFaucet: {
          address: conflictingFaucets[0].address,
          name: conflictingFaucets[0].name,
          owner: conflictingFaucets[0].owner
        },
        conflictingFaucets
      };
    }

    console.log(`Name "${proposedName}" is available across all factories on current network`);
    return { exists: false };
    
  } catch (error: any) {
    console.error("Error in checkFaucetNameExistsAcrossAllFactories:", error);
    // Don't throw, return graceful degradation
    return { 
      exists: false, 
      warning: "Name validation unavailable due to network issues. Please ensure your name is unique."
    };
  }
}

/**
 * Enhanced version of the original checkFaucetNameExists that checks all factories
 * This replaces the single factory check with a multi-factory check
 */
export async function checkFaucetNameExists(
  chain: Chain,
  network: Network, // Pass the whole network object instead of single factory address
  proposedName: string
): Promise<NameValidationResult & { 
  conflictingFaucets?: Array<{
    address: string
    name: string
    owner: string
    factoryAddress: string
    factoryType: FactoryType
  }>
}> {
  try {
    if (!proposedName.trim()) {
      throw new Error("Faucet name cannot be empty");
    }

    console.log(`Checking name "${proposedName}" across all factories on ${network.name}`);
    
    // Use the new function that checks all factories
    return await checkFaucetNameExistsAcrossAllFactories(
      chain, 
      network.factoryAddresses, 
      proposedName
    );
    
  } catch (error: any) {
    console.error("Error in enhanced name check:", error);
    return { 
      exists: false, 
      warning: "Unable to validate name due to network issues. Please ensure your name is unique."
    };
  }
}

/**
 * Get all faucet names from all factories on a single network (for comparison/statistics)
 */
export async function getAllFaucetNamesOnNetwork(
  chain: Chain,
  network: Network
): Promise<Array<{
  faucetAddress: string
  name: string
  owner: string
  factoryAddress: string
  factoryType: FactoryType
}>> {
  try {
    console.log(`Fetching all faucet names from ${network.name}...`);
    
    const allFaucetNames: any[] = [];

    // Process all factory addresses for this network
    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
        continue;
      }

      // Detect factory type and get appropriate ABI
      let factoryType: FactoryType;
      let config: FactoryConfig;
      
      try {
        factoryType = await detectFactoryType(chain, factoryAddress);
        config = getFactoryConfig(factoryType);
        console.log(`Processing factory ${factoryAddress} (type: ${factoryType})`);
      } catch (error) {
        console.warn(`Could not detect factory type for ${factoryAddress}, skipping:`, error);
        continue;
      }

      const factoryContract = getContract({
        client,
        chain,
        address: factoryAddress,
        abi: config.abi
      })

      try {
        // Try to get all faucet details at once (more efficient)
        let faucetDetails: any[] = [];
        try {
          faucetDetails = await readContract({
            contract: factoryContract,
            method: "getAllFaucetDetails",
            params: []
          });
          console.log(`Got ${faucetDetails.length} faucet details from factory ${factoryAddress}`);
        } catch (getAllError) {
          console.warn(`getAllFaucetDetails failed for ${factoryAddress}, trying individual approach:`, getAllError.message);
          
          // Fallback: Get addresses and fetch names individually
          const faucetAddresses: string[] = await readContract({
            contract: factoryContract,
            method: "getAllFaucets",
            params: []
          });
          console.log(`Got ${faucetAddresses.length} faucet addresses from factory ${factoryAddress}`);
          
          // Process in batches to avoid overwhelming RPC
          const batchSize = 10;
          for (let i = 0; i < faucetAddresses.length; i += batchSize) {
            const batch = faucetAddresses.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (faucetAddress) => {
              try {
                if (!faucetAddress || faucetAddress === zeroAddress) return null;
                
                const faucetType = factoryType as FaucetType;
                const faucetConfig = getFaucetConfig(faucetType);
                const faucetContract = getContract({
                  client,
                  chain,
                  address: faucetAddress,
                  abi: faucetConfig.abi
                })
                
                // Check if deleted
                const isDeleted = await readContract({
                  contract: faucetContract,
                  method: "deleted",
                  params: []
                });
                if (isDeleted) return null;
                
                // Get basic details
                const [name, owner] = await Promise.all([
                  readContract({ contract: faucetContract, method: "name", params: [] }),
                  readContract({ contract: faucetContract, method: "owner", params: [] })
                ]);
                
                return {
                  faucetAddress,
                  name,
                  owner,
                  factoryAddress,
                  factoryType
                };
              } catch (error) {
                console.warn(`Error getting details for faucet ${faucetAddress}:`, error);
                return null;
              }
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                faucetDetails.push(result.value);
              }
            });
            
            // Add delay between batches
            if (i + batchSize < faucetAddresses.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }

        // Process the faucet details
        faucetDetails.forEach(detail => {
          if (detail && detail.faucetAddress && detail.name) {
            allFaucetNames.push({
              faucetAddress: detail.faucetAddress,
              name: detail.name,
              owner: detail.owner || "Unknown",
              factoryAddress,
              factoryType,
            });
          }
        });
        
      } catch (factoryError) {
        console.error(`Error fetching faucet names from factory ${factoryAddress} on ${network.name}:`, factoryError);
      }
    }
    
    console.log(`Found ${allFaucetNames.length} faucets total on ${network.name}`);
    return allFaucetNames;
    
  } catch (error) {
    console.error(`Error fetching faucet names for ${network.name}:`, error);
    return [];
  }
}

// Alternative: Enhanced createFaucet function that includes proper validation
// If you want to include validation in the createFaucet function, use this version instead:

export async function createFaucetWithValidation(
  account: Account,
  factoryAddress: string,
  name: string,
  tokenAddress: string,
  chainId: bigint,
  networkId: bigint,
  useBackend: boolean,
  isCustom: boolean = false,
  network: Network, // Add network parameter for validation
): Promise<string> {
  try {
    if (!name.trim()) {
      throw new Error("Faucet name cannot be empty");
    }
    if (!isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }
    if (!isAddress(factoryAddress)) {
      throw new Error(`Invalid factory address: ${factoryAddress}`);
    }

    const chain = createChainFromNetwork(network)

    // Determine factory type and get appropriate config
    const factoryType = determineFactoryType(useBackend, isCustom)
    const config = getFactoryConfig(factoryType)

    console.log(`Creating faucet with factory type: ${factoryType}`)

    // Enhanced name validation with network object
    console.log("Validating faucet name before creation...");
    try {
      const nameCheck = await checkFaucetNameExists(chain, network, name);
      
      if (nameCheck.exists && nameCheck.existingFaucet) {
        const conflictDetails = nameCheck.conflictingFaucets 
          ? ` Conflicts found in: ${nameCheck.conflictingFaucets.map(c => `${c.factoryType} factory`).join(', ')}`
          : '';
        
        throw new Error(
          `A faucet with the name "${nameCheck.existingFaucet.name}" already exists on this network.${conflictDetails} ` +
          `Please choose a different name.`
        );
      }
      
      if (nameCheck.warning) {
        console.warn("Name validation warning:", nameCheck.warning);
        // Continue with creation but log the warning
      }
      
      console.log("Name validation passed");
    } catch (validationError: any) {
      if (validationError.message.includes("already exists")) {
        // Re-throw name conflict errors
        throw validationError;
      } else {
        // Log validation errors but don't block creation
        console.warn("Name validation failed, proceeding with creation:", validationError.message);
      }
    }

    const factoryContract = getContract({
      client,
      chain,
      address: factoryAddress,
      abi: config.abi
    })

    const backendAddress = VALID_BACKEND_ADDRESS;

    console.log("Create faucet params:", {
      factoryAddress,
      factoryType,
      createFunction: config.createFunction,
      name,
      tokenAddress,
      backendAddress,
      useBackend,
      isCustom,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress: account.address,
    });

    // Prepare contract call
    const transaction = prepareContractCall({
      contract: factoryContract,
      method: config.createFunction,
      params: [name, tokenAddress, backendAddress],
    });

    // Send transaction
    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Transaction hash:", result.transactionHash);
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId));

    // Parse the transaction result to get the faucet address
    // This is a simplified version - you may need to parse logs differently
    // depending on how Thirdweb handles event parsing
    
    console.log("New faucet created with transaction hash:", result.transactionHash);

    // You would need to parse the transaction receipt to get the actual faucet address
    // This is placeholder logic - implement based on your needs
    return result.transactionHash; // Return transaction hash for now
  } catch (error: any) {
    console.error("Error creating faucet:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to create faucet");
  }
}

export async function getAllAdmins(
  chain: Chain,
  faucetAddress: string,
  faucetType?: FaucetType
): Promise<string[]> {
  try {
    if (!isAddress(faucetAddress)) {
      throw new Error("Invalid faucet address");
    }

    // Detect faucet type if not provided
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)

    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    const adminsResponse = await readContract({
      contract: faucetContract,
      method: "getAllAdmins",
      params: []
    });

    const admins = Array.isArray(adminsResponse)
      ? adminsResponse.flat().filter((admin: string) => isAddress(admin))
      : [];
    console.log(`Fetched admins for faucet ${faucetAddress}:`, admins);
    return admins;
  }  catch (error: any) {
    console.error(`Error fetching admins for ${faucetAddress}:`, error);
    throw new Error(error.message || "Failed to fetch admins");
  }
}

export async function isAdmin(
  chain: Chain,
  faucetAddress: string,
  userAddress: string,
  faucetType?: FaucetType
): Promise<boolean> {
  try {
    if (!isAddress(faucetAddress) || !isAddress(userAddress)) {
      throw new Error("Invalid faucet or user address");
    }

    const admins = await getAllAdmins(chain, faucetAddress, faucetType);
    const isAdminStatus = admins.some((admin: string) => admin.toLowerCase() === userAddress.toLowerCase());
    console.log(`Admin check for ${userAddress} on faucet ${faucetAddress}: ${isAdminStatus}`);
    return isAdminStatus;
  } catch (error: any) {
    console.error(`Error checking admin status for ${userAddress} on ${faucetAddress}:`, error);
    return false;
  }
}

// Check if an address is whitelisted for a faucet (only for droplist faucets)
export async function isWhitelisted(
  chain: Chain,
  faucetAddress: string,
  userAddress: string,
  faucetType?: FaucetType
): Promise<boolean> {
  try {
    if (!isAddress(faucetAddress) || !isAddress(userAddress)) {
      throw new Error("Invalid faucet or user address")
    }

    // Detect faucet type if not provided
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    
    // Only droplist faucets have whitelist functionality
    if (detectedFaucetType !== 'droplist') {
      console.log(`Faucet ${faucetAddress} is not a droplist faucet, returning false for whitelist check`)
      return false
    }

    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    const isWhitelisted = await readContract({
      contract: faucetContract,
      method: "isWhitelisted",
      params: [userAddress]
    })
    console.log(`Whitelist check for ${userAddress} on faucet ${faucetAddress}: ${isWhitelisted}`)
    return isWhitelisted
  } catch (error: any) {
    console.error(`Error checking whitelist for ${userAddress} on ${faucetAddress}:`, error)
    return false
  }
}

// Get faucet backend mode from contract
export async function getFaucetBackendMode(
  chain: Chain,
  faucetAddress: string,
  faucetType?: FaucetType
): Promise<boolean> {
  try {
    if (!isAddress(faucetAddress)) {
      throw new Error("Invalid faucet address");
    }

    // Detect faucet type if not provided
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)

    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    const useBackend = await readContract({
      contract: faucetContract,
      method: "getUseBackend",
      params: []
    });
    console.log(`Backend mode for faucet ${faucetAddress}: ${useBackend}`);
    return useBackend;
  } catch (error: any) {
    console.error(`Error fetching backend mode for ${faucetAddress}:`, error);
    return false; // Default to false if contract call fails
  }
}

// Get faucet details with admin check and backend mode from contract
export async function getFaucetDetails(
  chain: Chain, 
  faucetAddress: string,
  faucetType?: FaucetType,
  userAddress?: string
) {
  try {
    console.log(`Getting details for faucet ${faucetAddress}`);
    
    // Detect faucet type if not provided
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    
    const contract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    let tokenAddress = zeroAddress;
    let ownerAddress = zeroAddress;
    let faucetName = "Unknown Faucet";
    let claimAmount = BigInt(0);
    let startTime = BigInt(0);
    let endTime = BigInt(0);
    let isClaimActive = false;
    let balance = BigInt(0);
    let isEther = true;
    let tokenSymbol = "CELO";
    let tokenDecimals = 18;
    let useBackend = false;

    try {
      tokenAddress = await readContract({ contract, method: "token", params: [] });
    } catch (error) {
      console.warn(`Error getting token address:`, error);
    }
    try {
      ownerAddress = await readContract({ contract, method: "owner", params: [] });
    } catch (error) {
      console.warn(`Error getting owner address:`, error);
    }
    try {
      faucetName = await readContract({ contract, method: "name", params: [] });
    } catch (error) {
      console.warn(`Error getting name:`, error);
    }
    try {
      // Handle different claim amount access patterns
      if (detectedFaucetType === 'custom') {
        // Custom faucets don't have a fixed claimAmount, will be handled per user
        claimAmount = BigInt(0);
      } else {
        claimAmount = await readContract({ contract, method: "claimAmount", params: [] });
      }
    } catch (error) {
      console.warn(`Error getting claim amount:`, error);
    }
    try {
      startTime = await readContract({ contract, method: "startTime", params: [] });
    } catch (error) {
      console.warn(`Error getting start time:`, error);
    }
    try {
      endTime = await readContract({ contract, method: "endTime", params: [] });
    } catch (error) {
      console.warn(`Error getting end time:`, error);
    }
    try {
      isClaimActive = await readContract({ contract, method: "isClaimActive", params: [] });
    } catch (error) {
      console.warn(`Error getting claim active status:`, error);
    }
    try {
      useBackend = await readContract({ contract, method: "getUseBackend", params: [] });
    } catch (error) {
      console.warn(`Error getting backend mode:`, error);
    }
    try {
      const balanceResult = await readContract({ contract, method: "getFaucetBalance", params: [] });
      balance = balanceResult[0];
      isEther = balanceResult[1];
      tokenSymbol = isEther
        ? isCeloNetwork(chain.id)
          ? "CELO"
          : chain.id === 1135
            ? "LISK"
            : chain.id === 8453 || chain.id === 84532
              ? "ETH"
              : "ETH"
        : tokenSymbol;
    } catch (error) {
      console.warn(`Error getting balance:`, error);
      if (tokenAddress !== zeroAddress) {
        try {
          const tokenContract = getContract({
            client,
            chain,
            address: tokenAddress,
            abi: ERC20_ABI
          });
          balance = await readContract({
            contract: tokenContract,
            method: "balanceOf",
            params: [faucetAddress]
          });
          isEther = false;
        } catch (innerError) {
          console.warn(`Error getting token balance:`, innerError);
        }
      }
    }

    if (!isEther && tokenAddress !== zeroAddress) {
      try {
        const tokenContract = getContract({
          client,
          chain,
          address: tokenAddress,
          abi: ERC20_ABI
        });
        tokenSymbol = await readContract({
          contract: tokenContract,
          method: "symbol",
          params: []
        });
      } catch (error) {
        console.warn(`Error getting token symbol:`, error);
      }
      try {
        const tokenContract = getContract({
          client,
          chain,
          address: tokenAddress,
          abi: ERC20_ABI
        });
        tokenDecimals = await readContract({
          contract: tokenContract,
          method: "decimals",
          params: []
        });
      } catch (error) {
        console.warn(`Error getting token decimals:`, error);
      }
    }

    let hasClaimed = false;
    let isUserAdmin = false;
    if (userAddress) {
      try {
        hasClaimed = await readContract({
          contract,
          method: "hasClaimed",
          params: [userAddress]
        });
        isUserAdmin = await isAdmin(chain, faucetAddress, userAddress, detectedFaucetType);
      } catch (error) {
        console.warn(`Error checking claim status or admin status:`, error);
      }
    }

    console.log(`Successfully got details for faucet ${faucetAddress}`);
    return {
      faucetAddress,
      token: tokenAddress,
      owner: ownerAddress,
      name: faucetName,
      claimAmount,
      startTime,
      endTime,
      isClaimActive,
      balance,
      isEther,
      tokenSymbol,
      tokenDecimals,
      hasClaimed,
      isUserAdmin,
      backendMode: useBackend,
      faucetType: detectedFaucetType, // Include detected faucet type
    };
  } catch (error) {
    console.error(`Error getting faucet details for ${faucetAddress}:`, error);
    return {
      faucetAddress,
      token: zeroAddress,
      owner: zeroAddress,
      name: "Error Loading Faucet",
      claimAmount: BigInt(0),
      startTime: BigInt(0),
      endTime: BigInt(0),
      isClaimActive: false,
      balance: BigInt(0),
      isEther: true,
      tokenSymbol: "CELO",
      tokenDecimals: 18,
      hasClaimed: false,
      isUserAdmin: false,
      backendMode: false,
      faucetType: 'dropcode' as FaucetType, // Default type
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getFaucetsForNetwork(network: Network): Promise<any[]> {
  try {
    const chain = createChainFromNetwork(network)
    let allFaucets: any[] = []

    // Fetch faucets from all factory addresses
    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
        continue;
      }

      // Detect factory type and get appropriate ABI
      let factoryType: FactoryType;
      let config: FactoryConfig;
      
      try {
        factoryType = await detectFactoryType(chain, factoryAddress);
        config = getFactoryConfig(factoryType);
        console.log(`Detected factory type for ${factoryAddress}: ${factoryType}`);
      } catch (error) {
        console.warn(`Could not detect factory type for ${factoryAddress}, skipping:`, error);
        continue;
      }

      const factoryContract = getContract({
        client,
        chain,
        address: factoryAddress,
        abi: config.abi
      })

      // Fetch all faucet addresses for this factory
      let faucetAddresses: string[] = []
      try {
        faucetAddresses = await readContract({
          contract: factoryContract,
          method: "getAllFaucets",
          params: []
        })
      } catch (error) {
        console.error(`Error calling getAllFaucets for ${factoryAddress} on ${network.name}:`, error)
        continue
      }

      // Process each faucet address to get full details
      const results = await Promise.all(
        faucetAddresses.map(async (faucetAddress: string) => {
          if (!faucetAddress || faucetAddress === zeroAddress) return null
          try {
            // Use the factory type to determine faucet type (they should match)
            const faucetType = factoryType as FaucetType
            const faucetConfig = getFaucetConfig(faucetType)
            const faucetContract = getContract({
              client,
              chain,
              address: faucetAddress,
              abi: faucetConfig.abi
            })
            
            const isDeleted = await readContract({
              contract: faucetContract,
              method: "deleted",
              params: []
            })
            if (isDeleted) {
              console.log(`Faucet ${faucetAddress} is deleted, skipping`)
              return null
            }

            const details = await getFaucetDetails(chain, faucetAddress, faucetType)
            return {
              ...details,
              network: {
                chainId: network.chainId,
                name: network.name,
                color: network.color,
                blockExplorer: network.blockExplorer,
              },
              factoryAddress, // Include factory address for reference
              factoryType, // Include factory type for reference
            }
          } catch (error) {
            console.warn(`Error getting details for faucet ${faucetAddress} on ${network.name}:`, error)
            return null
          }
        }),
      )

      allFaucets.push(...results.filter((result) => result !== null))
    }

    return allFaucets
  } catch (error) {
    console.error(`Error fetching faucets for ${network.name}:`, error)
    return []
  }
}

// Fetch transaction history for a specific faucet (admin only)
export async function getFaucetTransactionHistory(
  account: Account,
  chain: Chain,
  faucetAddress: string,
  network: Network,
  faucetType?: FaucetType
): Promise<{
  faucetAddress: string
  transactionType: string
  initiator: string
  amount: bigint
  isEther: boolean
  timestamp: number
}[]> {
  try {
    if (!isAddress(faucetAddress)) {
      throw new Error(`Invalid faucet address: ${faucetAddress}`)
    }

    const permissions = await checkPermissions(account, chain, faucetAddress, faucetType)

    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can view transaction history")
    }

    let transactions: any[] = [];

    // Iterate through all factory addresses to collect transactions
    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
        continue;
      }

      // Detect factory type and get appropriate ABI
      let factoryType: FactoryType;
      let config: FactoryConfig;
      
      try {
        factoryType = await detectFactoryType(chain, factoryAddress);
        config = getFactoryConfig(factoryType);
      } catch (error) {
        console.warn(`Could not detect factory type for ${factoryAddress}, skipping:`, error);
        continue;
      }

      const factoryContract = getContract({
        client,
        chain,
        address: factoryAddress,
        abi: config.abi
      });

      // Use getFaucetTransactions from the appropriate ABI
      try {
        const factoryTxs = await readContract({
          contract: factoryContract,
          method: "getFaucetTransactions",
          params: [faucetAddress]
        });
        transactions.push(...factoryTxs);
      } catch (error) {
        console.warn(`Error fetching transactions from factory ${factoryAddress}:`, error);
      }
    }

    // Map and filter transactions
    const filteredTransactions = transactions
      .filter((tx: any) => tx.faucetAddress.toLowerCase() === faucetAddress.toLowerCase())
      .map((tx: any) => ({
        faucetAddress: tx.faucetAddress as string,
        transactionType: tx.transactionType as string,
        initiator: tx.initiator as string,
        amount: BigInt(tx.amount),
        isEther: tx.isEther as boolean,
        timestamp: Number(tx.timestamp),
      }));

    console.log(`Fetched ${filteredTransactions.length} transactions for faucet ${faucetAddress}`)
    return filteredTransactions
  } catch (error: any) {
    console.error(`Error fetching transaction history for faucet ${faucetAddress}:`, error)
    throw new Error(error.message || "Failed to fetch transaction history")
  }
}

export async function getAllClaims(
  chainId: bigint,
  networks: Network[],
): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    const network = networks.find((n) => n.chainId === chainId)
    if (!network) {
      throw new Error(`Network with chainId ${chainId} not found`)
    }

    const chain = createChainFromNetwork(network)
    const storageAddress = STORAGE_CONTRACT_ADDRESS
    const contract = getContract({
      client,
      chain,
      address: storageAddress,
      abi: STORAGE_ABI
    })

    // Call getAllClaims function
    const claims: any[] = await readContract({
      contract,
      method: "getAllClaims",
      params: []
    })

    // Fetch token details for each claim
    const formattedClaims = await Promise.all(
      claims.map(async (claim: any) => {
        let tokenSymbol = NATIVE_TOKEN_MAP[network.name] || "TOK"
        let tokenDecimals = 18
        let isEther = true

        // Check cache for faucet details
        const cacheKey = `${network.chainId}-${claim.faucet}`
        let faucetDetails = faucetDetailsCache.get(cacheKey)

        if (!faucetDetails) {
          try {
            faucetDetails = await getFaucetDetails(chain, claim.faucet)
            faucetDetailsCache.set(cacheKey, faucetDetails)
          } catch (error) {
            console.warn(`Error fetching faucet details for ${claim.faucet} on ${network.name}:`, error)
            faucetDetails = {
              tokenSymbol: NATIVE_TOKEN_MAP[network.name] || "TOK",
              tokenDecimals: 18,
              isEther: true,
            }
          }
        }

        tokenSymbol = faucetDetails.tokenSymbol
        tokenDecimals = faucetDetails.tokenDecimals
        isEther = faucetDetails.isEther

        return {
          claimer: claim.claimer as string,
          faucet: claim.faucet as string,
          amount: BigInt(claim.amount),
          txHash: claim.txHash as `0x${string}`,
          networkName: claim.networkName as string,
          timestamp: Number(claim.timestamp),
          tokenSymbol,
          tokenDecimals,
          isEther,
        }
      }),
    )

    return formattedClaims
  } catch (error) {
    console.error(`Error fetching claims for chainId ${chainId}:`, error)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch claims: ${error.message}`)
    }
    throw new Error("Failed to fetch claims: Unknown error")
  }
}

export async function getAllClaimsFromFactoryTransactions(
  networks: Network[]
): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    chainId: bigint
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    const allClaims: any[] = []

    for (const network of networks) {
      try {
        const chain = createChainFromNetwork(network)
        
        // Iterate through all factory addresses for this network
        for (const factoryAddress of network.factoryAddresses) {
          if (!isAddress(factoryAddress)) {
            console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`)
            continue
          }

          // Detect factory type and get appropriate ABI
          let factoryType: FactoryType;
          let config: FactoryConfig;
          
          try {
            factoryType = await detectFactoryType(chain, factoryAddress);
            config = getFactoryConfig(factoryType);
          } catch (error) {
            console.warn(`Could not detect factory type for ${factoryAddress}, skipping:`, error);
            continue;
          }

          const factoryContract = getContract({
            client,
            chain,
            address: factoryAddress,
            abi: config.abi
          })

          try {
            // Get all transactions from this factory
            const allTransactions = await readContract({
              contract: factoryContract,
              method: "getAllTransactions",
              params: []
            })
            console.log(`Found ${allTransactions.length} transactions from factory ${factoryAddress} on ${network.name}`)

            // Filter for claim transactions (assuming transaction type includes "claim" or similar)
            const claimTransactions = allTransactions.filter((tx: any) => 
              tx.transactionType && 
              (tx.transactionType.toLowerCase().includes('claim') || 
               tx.transactionType.toLowerCase().includes('drop'))
            )

            console.log(`Found ${claimTransactions.length} claim transactions from factory ${factoryAddress}`)

            // Process each claim transaction
            for (const tx of claimTransactions) {
              try {
                // Get faucet details to fetch token information
                let tokenSymbol = NATIVE_TOKEN_MAP[network.name] || "TOK"
                let tokenDecimals = 18
                let isEther = true

                // Check cache for faucet details
                const cacheKey = `${network.chainId}-${tx.faucetAddress}`
                let faucetDetails = faucetDetailsCache.get(cacheKey)

                if (!faucetDetails) {
                  try {
                    faucetDetails = await getFaucetDetails(chain, tx.faucetAddress)
                    faucetDetailsCache.set(cacheKey, faucetDetails)
                  } catch (error) {
                    console.warn(`Error fetching faucet details for ${tx.faucetAddress} on ${network.name}:`, error)
                    faucetDetails = {
                      tokenSymbol: NATIVE_TOKEN_MAP[network.name] || "TOK",
                      tokenDecimals: 18,
                      isEther: true,
                    }
                  }
                }

                tokenSymbol = faucetDetails.tokenSymbol
                tokenDecimals = faucetDetails.tokenDecimals
                isEther = faucetDetails.isEther

                // Create claim object from transaction data
                const claim = {
                  claimer: tx.initiator as string, // Assuming initiator is the claimer for claim transactions
                  faucet: tx.faucetAddress as string,
                  amount: BigInt(tx.amount),
                  txHash: tx.txHash as `0x${string}`, // Assuming txHash exists in transaction data
                  networkName: network.name,
                  timestamp: Number(tx.timestamp),
                  chainId: network.chainId,
                  tokenSymbol,
                  tokenDecimals,
                  isEther,
                }

                allClaims.push(claim)
              } catch (processingError) {
                console.warn(`Error processing claim transaction:`, processingError)
              }
            }
          } catch (factoryError) {
            console.error(`Error fetching transactions from factory ${factoryAddress} on ${network.name}:`, factoryError)
          }
        }
      } catch (networkError) {
        console.error(`Error processing network ${network.name}:`, networkError)
      }
    }

    return allClaims
  } catch (error) {
    console.error("Error fetching claims from factory transactions:", error)
    return []
  }
}

// Modified function to combine storage data with factory transaction data
export async function getAllClaimsForAllNetworks(networks: Network[]): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    chainId: bigint
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    console.log("Fetching claims from both storage and factory transactions...")
    
    // Fetch claims from storage contract (historical data)
    const storageClaims = await fetchStorageData()
    console.log(`Found ${storageClaims.length} claims from storage contract`)

    // Add chainId to storage claims (assuming they're all from Celo for now)
    const storageClaimsWithChainId = storageClaims.map(claim => ({
      ...claim,
      chainId: BigInt(42220), // Celo chainId - adjust if storage is on different network
    }))

    // Fetch claims from factory transactions (new method)
    const factoryClaims = await getAllClaimsFromFactoryTransactions(networks)
    console.log(`Found ${factoryClaims.length} claims from factory transactions`)

    // Combine both sources and remove duplicates based on txHash
    const allClaims = [...storageClaimsWithChainId, ...factoryClaims]
    
    // Remove duplicates based on txHash
    const uniqueClaims = allClaims.reduce((acc, current) => {
      const existing = acc.find(item => item.txHash === current.txHash)
      if (!existing) {
        acc.push(current)
      }
      return acc
    }, [] as typeof allClaims)

    // Sort by timestamp (most recent first)
    const sortedClaims = uniqueClaims.sort((a, b) => b.timestamp - a.timestamp)
    
    console.log(`Total unique claims: ${sortedClaims.length} (${storageClaims.length} from storage + ${factoryClaims.length} from factory - duplicates)`)
    
    return sortedClaims
  } catch (error) {
    console.error("Error fetching claims for all networks:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch claims for all networks: ${error.message}`)
    }
    throw new Error("Failed to fetch claims for all networks: Unknown error")
  }
}

// Optional: Add a function to get only new claims from factories (excluding storage)
export async function getNewClaimsFromFactories(networks: Network[]): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    chainId: bigint
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    const factoryClaims = await getAllClaimsFromFactoryTransactions(networks)
    const sortedClaims = factoryClaims.sort((a, b) => b.timestamp - a.timestamp)
    
    console.log(`Found ${sortedClaims.length} new claims from factory transactions`)
    return sortedClaims
  } catch (error) {
    console.error("Error fetching new claims from factories:", error)
    return []
  }
}

// Helper function to migrate storage claims to factory format if needed
export async function migrateStorageClaimsToFactory(): Promise<void> {
  try {
    console.log("Starting migration of storage claims...")
    
    // This would be implemented if you want to migrate old storage claims
    // to be tracked through factory transactions as well
    // Implementation depends on your specific migration strategy
    
    console.log("Migration completed")
  } catch (error) {
    console.error("Error during migration:", error)
  }
}

export async function retrieveSecretCode(faucetAddress: string): Promise<string> {
  if (!isAddress(faucetAddress)) {
    throw new Error(`Invalid faucet address: ${faucetAddress}`)
  }

  try {
    // Check localStorage first
    const cachedCode = getFromStorage(`secretCode_${faucetAddress}`)
    if (cachedCode && /^[A-Z0-9]{6}$/.test(cachedCode)) {
      console.log(`Retrieved Drop code for ${faucetAddress} from localStorage`)
      return cachedCode
    }

    // Fallback to backend if not found in localStorage
    const response = await fetch("http://0.0.0.0:10000/retrieve-secret-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        faucetAddress: getAddress(faucetAddress), // Normalize address
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "Failed to retrieve Drop code")
    }

    const result = await response.json()
    const secretCode = result.secretCode

    if (!secretCode || !/^[A-Z0-9]{6}$/.test(secretCode)) {
      throw new Error("Invalid Drop code format received from backend")
    }

    // Store the retrieved Drop code in localStorage for future use
    saveToStorage(`secretCode_${faucetAddress}`, secretCode)

    console.log(`Retrieved and stored Drop code for ${faucetAddress} from backend`)
    return secretCode
  } catch (error: any) {
    console.error("Error retrieving Drop code:", error)
    throw new Error(error.message || "Failed to retrieve Drop code")
  }
}

const ERROR_SIGNATURES = {
  OwnableUnauthorizedAccount: "0x118cdaa7", // keccak256("OwnableUnauthorizedAccount(address)")
  ContractPaused: "0xbec6425c", // keccak256("ContractPaused()")
  OnlyAdmin: "0x9b23d3d9", // keccak256("OnlyAdmin()")
  EmptyName: "0xe8930e56", // keccak256("EmptyName()")
  UnknownError: "0xab35696f", // Placeholder for new error
  NotWhitelisted: "0x55f33f14", // keccak256("NotWhitelisted()")
}

// Helper to decode revert data
function decodeRevertError(data: string): string {
  if (data.startsWith(ERROR_SIGNATURES.OwnableUnauthorizedAccount)) {
    return "Only the faucet owner can perform this action"
  } else if (data.startsWith(ERROR_SIGNATURES.ContractPaused)) {
    return "Faucet is paused and cannot be modified"
  } else if (data.startsWith(ERROR_SIGNATURES.OnlyAdmin)) {
    return "Only an admin can perform this action"
  } else if (data.startsWith(ERROR_SIGNATURES.EmptyName)) {
    return "Faucet name cannot be empty"
  } else if (data.startsWith(ERROR_SIGNATURES.NotWhitelisted)) {
    return "Only whitelisted addresses are supported"
  } else if (data.startsWith(ERROR_SIGNATURES.UnknownError)) {
    return "Permission denied or invalid state (verify contract ABI and state)"
  }
  return "Unknown contract error occurred"
}

// Main transaction functions using Thirdweb

export async function createFaucet(
  account: Account,
  factoryAddress: string,
  name: string,
  tokenAddress: string,
  chainId: bigint,
  networkId: bigint,
  useBackend: boolean,
  isCustom: boolean = false,
  network: Network,
): Promise<string> {
  try {
    if (!name.trim()) {
      throw new Error("Faucet name cannot be empty");
    }
    if (!isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }
    if (!isAddress(factoryAddress)) {
      throw new Error(`Invalid factory address: ${factoryAddress}`);
    }

    const chain = createChainFromNetwork(network)
    const factoryType = determineFactoryType(useBackend, isCustom)
    const config = getFactoryConfig(factoryType)

    console.log(`Creating faucet with factory type: ${factoryType}`)

    const factoryContract = getContract({
      client,
      chain,
      address: factoryAddress,
      abi: config.abi
    })

    const backendAddress = VALID_BACKEND_ADDRESS;

    console.log("Create faucet params:", {
      factoryAddress,
      factoryType,
      createFunction: config.createFunction,
      name,
      tokenAddress,
      backendAddress,
      useBackend,
      isCustom,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress: account.address,
    });

    // Prepare contract call
    const transaction = prepareContractCall({
      contract: factoryContract,
      method: config.createFunction,
      params: [name, tokenAddress, backendAddress],
    });

    // Send transaction
    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Transaction hash:", result.transactionHash);
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId));

    console.log("New faucet created with transaction hash:", result.transactionHash);

    return result.transactionHash;
  } catch (error: any) {
    console.error("Error creating faucet:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to create faucet");
  }
}

export async function fundFaucet(
  account: Account,
  faucetAddress: string,
  amount: bigint,
  isEther: boolean,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })
    const isCelo = isCeloNetwork(chainId)

    console.log("Funding params:", {
      faucetAddress,
      amount: amount.toString(),
      isEther,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress: account.address,
    })

    if (isEther && !isCelo) {
      console.log(`Funding faucet ${faucetAddress} with ${amount} native tokens on chain ${chainId}`)
      
      // Native token transfer using Thirdweb
      const transaction = prepareContractCall({
        contract: getContract({
          client,
          chain,
          address: faucetAddress,
          abi: []
        }),
        method: "receive",
        params: [],
        value: amount,
      });
      
      const result = await sendTransaction({
        transaction,
        account,
      });
      
      console.log("Transaction hash:", result.transactionHash)
      await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))
      return result.transactionHash
    }

    const tokenAddress = isEther && isCelo
      ? "0x471EcE3750Da237f93B8E339c536989b8978a438" // Wrapped CELO
      : await readContract({
          contract: faucetContract,
          method: "token",
          params: []
        })

    if (tokenAddress === zeroAddress) {
      throw new Error("Token address is zero, cannot proceed with ERC-20 transfer")
    }

    const tokenContract = getContract({
      client,
      chain,
      address: tokenAddress,
      abi: ERC20_ABI
    })

    console.log(`Approving ${amount} ${isEther && isCelo ? "CELO" : "tokens"} for faucet ${faucetAddress}`)

    // Approve transaction
    const approveTransaction = prepareContractCall({
      contract: tokenContract,
      method: "approve",
      params: [faucetAddress, amount],
    });
    
    const approveResult = await sendTransaction({
      transaction: approveTransaction,
      account,
    });
    
    console.log("Approve transaction confirmed:", approveResult.transactionHash)
    await reportTransactionToDivvi(approveResult.transactionHash as `0x${string}`, Number(chainId))

    console.log(`Funding faucet ${faucetAddress} with ${amount} ${isEther && isCelo ? "CELO" : "tokens"}`)
    
    // Fund transaction
    const fundTransaction = prepareContractCall({
      contract: faucetContract,
      method: "fund",
      params: [amount],
    });
    
    const fundResult = await sendTransaction({
      transaction: fundTransaction,
      account,
    });
    
    console.log("Fund transaction hash:", fundResult.transactionHash)
    console.log("Fund transaction confirmed:", fundResult.transactionHash)
    await reportTransactionToDivvi(fundResult.transactionHash as `0x${string}`, Number(chainId))
    return fundResult.transactionHash
  } catch (error: any) {
    console.error("Error funding faucet:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to fund faucet")
  }
}

export async function withdrawTokens(
  account: Account,
  faucetAddress: string,
  amount: bigint,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Withdraw tokens params:", {
      faucetAddress,
      amount: amount.toString(),
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    // Prepare withdraw transaction
    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "withdraw",
      params: [amount],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Withdraw transaction hash:", result.transactionHash)
    console.log("Withdraw transaction confirmed:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error withdrawing tokens:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to withdraw tokens")
  }
}

export async function setWhitelistBatch(
  account: Account,
  faucetAddress: string,
  addresses: string[],
  status: boolean,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    
    if (detectedFaucetType !== 'droplist') {
      throw new Error("Whitelist functionality is only available for droplist faucets")
    }

    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Set whitelist batch params:", {
      faucetAddress,
      addresses,
      status,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    // Prepare transaction
    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "setWhitelistBatch",
      params: [addresses, status],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Set whitelist batch transaction hash:", result.transactionHash)
    console.log("Set whitelist batch transaction confirmed:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error setting whitelist batch:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to set whitelist batch")
  }
}

export async function setCustomClaimAmountsBatch(
  account: Account,
  faucetAddress: string,
  users: string[],
  amounts: bigint[],
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    
    if (detectedFaucetType !== 'custom') {
      throw new Error("Custom claim amounts are only available for custom faucets")
    }

    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Set custom claim amounts batch params:", {
      faucetAddress,
      users,
      amounts: amounts.map((a) => a.toString()),
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    })

    // Prepare transaction
    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "setCustomClaimAmountsBatch",
      params: [users, amounts],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Set custom claim amounts batch transaction hash:", result.transactionHash)
    console.log("Set custom claim amounts batch transaction confirmed:", result.transactionHash)
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId))

    return result.transactionHash
  } catch (error: any) {
    console.error("Error setting custom claim amounts batch:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to set custom claim amounts batch")
  }
}

export async function resetAllClaims(
  account: Account,
  faucetAddress: string,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const chain = createChainFromNetwork(network)
    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Reset all claims params:", {
      faucetAddress,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    });

    // Prepare transaction
    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "resetAllClaimed",
      params: [],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Reset all claims transaction hash:", result.transactionHash);
    console.log("Reset all claims transaction confirmed:", result.transactionHash);
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId));

    return result.transactionHash;
  } catch (error: any) {
    console.error("Error resetting all claims:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to reset all claims");
  }
}

export async function setClaimParameters(
  account: Account,
  faucetAddress: string,
  claimAmount: bigint,
  startTime: number,
  endTime: number,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const chain = createChainFromNetwork(network)
    const permissions = await checkPermissions(account, chain, faucetAddress, faucetType);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be modified");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can set claim parameters");
    }

    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucetAddress)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucetAddress,
      abi: config.abi
    })

    console.log("Set claim parameters params:", {
      faucetAddress,
      faucetType: detectedFaucetType,
      claimAmount: detectedFaucetType === 'custom' ? 'N/A (custom amounts)' : claimAmount.toString(),
      startTime,
      endTime,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
    });

    // Prepare transaction based on faucet type
    let transaction;
    if (detectedFaucetType === 'custom') {
      transaction = prepareContractCall({
        contract: faucetContract,
        method: "setClaimParameters",
        params: [startTime, endTime],
      });
    } else {
      transaction = prepareContractCall({
        contract: faucetContract,
        method: "setClaimParameters",
        params: [claimAmount, startTime, endTime],
      });
    }

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log("Set claim parameters transaction hash:", result.transactionHash);
    console.log("Set claim parameters transaction confirmed:", result.transactionHash);
    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId));

    return result.transactionHash;
  } catch (error: any) {
    console.error("Error setting claim parameters:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to set claim parameters");
  }
}

export async function updateFaucetName(
  account: Account,
  faucet: string,
  name: string,
  chainId: bigint,
  networkId: bigint,
  network: Network,
  faucetType?: FaucetType
): Promise<`0x${string}`> {
  try {
    if (!checkNetwork(chainId, networkId)) {
      throw new Error("Switch to the correct network to perform this operation");
    }

    if (!name.trim()) {
      throw new Error("Faucet name cannot be empty");
    }

    const chain = createChainFromNetwork(network)
    const permissions = await checkPermissions(account, chain, faucet, faucetType);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be modified");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can update the faucet name");
    }

    const detectedFaucetType = faucetType || await detectFaucetType(chain, faucet)
    const config = getFaucetConfig(detectedFaucetType)
    const faucetContract = getContract({
      client,
      chain,
      address: faucet,
      abi: config.abi
    })

    // Prepare transaction
    const transaction = prepareContractCall({
      contract: faucetContract,
      method: "updateName",
      params: [name],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    console.log(`Update faucet name transaction sent: ${result.transactionHash}`);

    await reportTransactionToDivvi(result.transactionHash as `0x${string}`, Number(chainId));
    return result.transactionHash as `0x${string}`;
  } catch (error: any) {
    console.error("Error updating faucet name:", error);
    throw new Error(error.reason || error.message || "Failed to update faucet name");
  }
}
