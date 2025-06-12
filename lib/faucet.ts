import { type BrowserProvider, Contract, JsonRpcProvider, ZeroAddress, isAddress, getAddress } from "ethers"
import { FAUCET_ABI, ERC20_ABI, FACTORY_ABI, STORAGE_ABI, CHECKIN_ABI } from "./abis"
import { appendDivviReferralData, reportTransactionToDivvi } from "./divvi-integration"

// Fetch faucets for a specific network using getAllFaucetDetails
interface Network {
  chainId: bigint
  name: string
  rpcUrl: string
  blockExplorer: string
  factoryAddress: string
  color: string
  storageAddress?: string // Optional, defaults to FAUCET_STORAGE_ADDRESS
}

// Mapping of networkName to native token symbol
const NATIVE_TOKEN_MAP: Record<string, string> = {
  Celo: "CELO",
  Lisk: "LISK",
  Arbitrum: "ETH",
}

// Load backend address from .env
const BACKEND_ADDRESS = process.env.BACKEND_ADDRESS || "0x0307daA1F0d3Ac9e1b78707d18E79B13BE6b7178"

// Storage contract address
const STORAGE_CONTRACT_ADDRESS = "0x3fC5162779F545Bb4ea7980471b823577825dc8A"

// transactions contract address

const CHECKIN_CONTRACT_ADDRESS = "0x71C00c430ab70a622dc0b2888C4239cab9F244b0"

// Celo RPC URL
const CELO_RPC_URL = "https://forno.celo.org"

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



export function getFromStorage(key: string): any {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn(`Error reading from localStorage key ${key}:`, error);
    return null;
  }
}

export function saveToStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Error saving to localStorage key ${key}:`, error);
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

// Helper to check network match
export function checkNetwork(chainId: bigint, networkId: bigint): boolean {
  return chainId === networkId
}

// Fetch transactions data from Celo with incremental loading
export async function fetchCheckInData(): Promise<{
  transactionsByDate: { [date: string]: number }
  usersByDate: { [date: string]: Set<string> }
  allUsers: Set<string>
}> {
  try {
    const provider = new JsonRpcProvider(CELO_RPC_URL)
    const contract = new Contract(CHECKIN_CONTRACT_ADDRESS, CHECKIN_ABI, provider)

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

    // Get current block number
    const currentBlock = await provider.getBlockNumber()
    console.log(`Current block: ${currentBlock}, Last processed: ${lastBlock}`)

    // Only fetch new events if there are new blocks
    if (currentBlock > lastBlock) {
      const fromBlock = Math.max(lastBlock + 1, currentBlock - 10000) // Limit to last 10k blocks to avoid RPC issues

      console.log(`Fetching CheckedIn events from block ${fromBlock} to ${currentBlock}`)

      try {
        const filter = contract.filters.CheckedIn()
        const events = await contract.queryFilter(filter, fromBlock, currentBlock)

        console.log(`Found ${events.length} new transactions events`)

        // Process new events
        for (const event of events) {
          try {
            const block = await provider.getBlock(event.blockNumber)
            if (block && 'args' in event && event.args) {
              const date = new Date(block.timestamp * 1000).toISOString().split("T")[0]
              const user = event.args.user.toLowerCase()

              // Update transactions by date
              transactionsByDate[date] = (transactionsByDate[date] || 0) + 1

              // Track users by date
              if (!usersByDate[date]) {
                usersByDate[date] = new Set()
              }
              usersByDate[date].add(user)
              allUsers.add(user)
            }
          } catch (blockError) {
            console.warn(`Error processing block ${event.blockNumber}:`, blockError)
          }
        }

        // Save updated data to localStorage
        const dataToCache = {
          transactionsByDate,
          usersByDate: Object.fromEntries(
            Object.entries(usersByDate).map(([date, users]) => [date, Array.from(users)]),
          ),
          allUsers: Array.from(allUsers),
        }

        saveToStorage(STORAGE_KEYS.CHECKIN_DATA, dataToCache)
        saveToStorage(STORAGE_KEYS.CHECKIN_LAST_BLOCK, currentBlock)
        updateCacheTimestamp()

        console.log("Updated transactions cache")
      } catch (queryError) {
        console.error("Error querying transactions events:", queryError)
        // If query fails, use cached data
      }
    }

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
    const provider = new JsonRpcProvider(CELO_RPC_URL)

    // Check if storage contract exists
    const code = await provider.getCode(STORAGE_CONTRACT_ADDRESS)
    if (code === "0x") {
      console.log("Storage contract not deployed on Celo")
      return []
    }

    const contract = new Contract(STORAGE_CONTRACT_ADDRESS, STORAGE_ABI, provider)

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
    const claims: any[] = await contract.getAllClaims()
    console.log(`Found ${claims.length} claims in storage contract`)

    // Process claims
    const formattedClaims = await Promise.all(
      claims.map(async (claim: any) => {
        let tokenSymbol = "CELO"
        let tokenDecimals = 18
        let isEther = true

        // Try to get faucet details for token info
        try {
          const faucetDetails = await getFaucetDetails(provider, claim.faucet)
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

// Create a faucet
export async function createFaucet(
  provider: BrowserProvider,
  factoryAddress: string,
  name: string,
  tokenAddress: string,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const factoryContract = new Contract(factoryAddress, FACTORY_ABI, signer)

    const data = factoryContract.interface.encodeFunctionData("createFaucet", [
      name,
      tokenAddress,
      VALID_BACKEND_ADDRESS,
    ])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: factoryAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice || BigInt(0)
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined
    const gasCost = gasEstimate * gasPrice
    console.log("Create faucet params:", {
      factoryAddress,
      name,
      tokenAddress,
      backendAddress: VALID_BACKEND_ADDRESS,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      gasPrice: gasPrice.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
      gasCost: gasCost.toString(),
    })

    const tx = await signer.sendTransaction({
      to: factoryAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Transaction receipt is null")
    }
    console.log("Transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    const event = receipt.logs
      .map((log) => {
        try {
          return factoryContract.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed?.name === "FaucetCreated")

    if (!event || !('args' in event) || !event.args || !event.args.faucet) {
      throw new Error("Failed to retrieve faucet address from transaction")
    }

    // Log new faucet details
    const newFaucet = new Contract(event.args.faucet, FAUCET_ABI, provider)
    const backendFeePercent = await newFaucet.BACKEND_FEE_PERCENT?.()
    console.log("New faucet created:", {
      faucetAddress: event.args.faucet,
      backendAddress: VALID_BACKEND_ADDRESS,
      backendFeePercent: backendFeePercent?.toString(),
    })

    return event.args.faucet
  } catch (error: any) {
    console.error("Error creating faucet:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to create faucet")
  }
}

// Get faucet details
export async function getFaucetDetails(provider: BrowserProvider | JsonRpcProvider, faucetAddress: string) {
  try {
    console.log(`Getting details for faucet ${faucetAddress}`)
    let contract
    if ("getSigner" in provider && typeof provider.getSigner === "function") {
      try {
        contract = new Contract(faucetAddress, FAUCET_ABI, await provider.getSigner())
      } catch (error) {
        console.warn(`Error getting signer, falling back to provider for ${faucetAddress}:`, error)
        contract = new Contract(faucetAddress, FAUCET_ABI, provider)
      }
    } else {
      contract = new Contract(faucetAddress, FAUCET_ABI, provider)
    }

    let tokenAddress = ZeroAddress
    let ownerAddress = ZeroAddress
    let faucetName = "Unknown Faucet"
    let claimAmount = BigInt(0)
    let startTime = BigInt(0)
    let endTime = BigInt(0)
    let isClaimActive = false
    let balance = BigInt(0)
    let isEther = true
    let tokenSymbol = "CELO" // Default for Celo
    let tokenDecimals = 18

    try {
      tokenAddress = await contract.token()
    } catch (error) {
      console.warn(`Error getting token address:`, error)
    }
    try {
      ownerAddress = await contract.owner()
    } catch (error) {
      console.warn(`Error getting owner address:`, error)
    }
    try {
      faucetName = await contract.name()
    } catch (error) {
      console.warn(`Error getting name:`, error)
    }
    try {
      claimAmount = await contract.claimAmount()
    } catch (error) {
      console.warn(`Error getting claim amount:`, error)
    }
    try {
      startTime = await contract.startTime()
    } catch (error) {
      console.warn(`Error getting start time:`, error)
    }
    try {
      endTime = await contract.endTime()
    } catch (error) {
      console.warn(`Error getting end time:`, error)
    }
    try {
      isClaimActive = await contract.isClaimActive()
    } catch (error) {
      console.warn(`Error getting claim active status:`, error)
    }
    try {
      const balanceResult = await contract.getFaucetBalance()
      balance = balanceResult[0]
      isEther = balanceResult[1]
      const network = await provider.getNetwork()
      tokenSymbol = isEther
        ? isCeloNetwork(network.chainId)
          ? "CELO"
          : network.chainId === BigInt(1135)
            ? "LISK"
            : "ETH"
        : tokenSymbol
    } catch (error) {
      console.warn(`Error getting balance:`, error)
      if (tokenAddress !== ZeroAddress) {
        try {
          const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider)
          balance = await tokenContract.balanceOf(faucetAddress)
          isEther = false
        } catch (innerError) {
          console.warn(`Error getting token balance:`, innerError)
        }
      } else {
        try {
          balance = await provider.getBalance(faucetAddress)
          isEther = true
        } catch (innerError) {
          console.warn(`Error getting native balance:`, innerError)
        }
      }
    }

    if (!isEther && tokenAddress !== ZeroAddress) {
      try {
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider)
        tokenSymbol = await tokenContract.symbol()
      } catch (error) {
        console.warn(`Error getting token symbol:`, error)
      }
      try {
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider)
        tokenDecimals = await tokenContract.decimals()
      } catch (error) {
        console.warn(`Error getting token decimals:`, error)
      }
    }

    let hasClaimed = false
    if ("getSigner" in provider && typeof provider.getSigner === "function") {
      try {
        const signer = await provider.getSigner()
        const userAddress = await signer.getAddress()
        hasClaimed = await contract.hasClaimed(userAddress)
      } catch (error) {
        console.warn(`Error checking claim status:`, error)
      }
    }

    console.log(`Successfully got details for faucet ${faucetAddress}`)
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
    }
  } catch (error) {
    console.error(`Error getting faucet details for ${faucetAddress}:`, error)
    return {
      faucetAddress,
      token: ZeroAddress,
      owner: ZeroAddress,
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
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Store claim in storage contract
export async function storeClaim(
  provider: BrowserProvider,
  claimer: string,
  faucetAddress: string,
  amount: bigint,
  txHash: string,
  chainId: bigint,
  networkId: bigint,
  networkName: string,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const storageContract = new Contract(STORAGE_CONTRACT_ADDRESS, STORAGE_ABI, signer)

    // Convert txHash to bytes32 (ensure it's a valid 32-byte hash)
    const formattedTxHash = txHash.startsWith("0x") ? txHash : `0x${txHash}`
    if (!/^0x[a-fA-F0-9]{64}$/.test(formattedTxHash)) {
      throw new Error(`Invalid transaction hash format: ${formattedTxHash}`)
    }

    if (!networkName) {
      throw new Error("Network name cannot be empty")
    }

    const data = storageContract.interface.encodeFunctionData("storeClaim", [
      claimer,
      faucetAddress,
      amount,
      formattedTxHash,
      networkName,
    ])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: STORAGE_CONTRACT_ADDRESS,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Store claim params:", {
      claimer,
      faucetAddress,
      amount: amount.toString(),
      txHash: formattedTxHash,
      networkName,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: STORAGE_CONTRACT_ADDRESS,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Store claim transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Store claim transaction receipt is null")
    }
    console.log("Store claim transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error storing claim:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to store claim")
  }
}

export async function getFaucetsForNetwork(network: Network): Promise<any[]> {
  try {
    const provider = new JsonRpcProvider(network.rpcUrl)
    const factoryContract = new Contract(network.factoryAddress, FACTORY_ABI, provider)

    // Check if factory contract exists
    const code = await provider.getCode(network.factoryAddress)
    if (code === "0x") {
      console.warn(`No contract at factory address ${network.factoryAddress} on ${network.name}`)
      return []
    }

    // Fetch faucet details from factory
    let faucetDetails: any[] = []
    try {
      faucetDetails = await factoryContract.getAllFaucetDetails()
    } catch (error) {
      console.error(`Error calling getAllFaucetDetails on ${network.name}:`, error)
      return []
    }

    // Process each faucet to get full details
    const results = await Promise.all(
      faucetDetails.map(async (faucet: any) => {
        if (!faucet.faucetAddress || faucet.faucetAddress === ZeroAddress) return null
        try {
          const details = await getFaucetDetails(provider, faucet.faucetAddress)
          return {
            ...details,
            network: {
              chainId: network.chainId,
              name: network.name,
              color: network.color,
              blockExplorer: network.blockExplorer,
            },
          }
        } catch (error) {
          console.warn(`Error getting details for faucet ${faucet.faucetAddress} on ${network.name}:`, error)
          return null
        }
      }),
    )

    return results.filter((result) => result !== null)
  } catch (error) {
    console.error(`Error fetching faucets for ${network.name}:`, error)
    return []
  }
}

async function contractExists(provider: JsonRpcProvider, address: string): Promise<boolean> {
  try {
    const code = await provider.getCode(address)
    return code !== "0x"
  } catch (error) {
    console.warn(`Error checking contract at ${address}:`, error)
    return false
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

    const provider = new JsonRpcProvider(network.rpcUrl)
    const storageAddress = STORAGE_CONTRACT_ADDRESS
    const contract = new Contract(storageAddress, STORAGE_ABI, provider)

    // Verify contract exists
    const exists = await contractExists(provider, storageAddress)
    if (!exists) {
      console.error(`No contract at ${storageAddress} on ${network.name}`)
      return []
    }

    // Call getAllClaims function
    const claims: any[] = await contract.getAllClaims()

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
            faucetDetails = await getFaucetDetails(provider, claim.faucet)
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
    const allClaims = await Promise.all(
      networks.map(async (network) => {
        try {
          const claims = await getAllClaims(network.chainId, networks)
          return claims.map((claim) => ({ ...claim, chainId: network.chainId }))
        } catch (error) {
          console.error(`Error fetching claims for ${network.name}:`, error)
          return []
        }
      }),
    )

    const sortedClaims = allClaims.flat().sort((a, b) => b.timestamp - a.timestamp)
    console.log("All claims:", sortedClaims)
    return sortedClaims
  } catch (error) {
    console.error("Error fetching claims for all networks:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch claims for all networks: ${error.message}`)
    }
    throw new Error("Failed to fetch claims for all networks: Unknown error")
  }
}

// Fund faucet
export async function fundFaucet(
  provider: BrowserProvider,
  faucetAddress: string,
  amount: bigint,
  isEther: boolean,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const balance = await provider.getBalance(signerAddress)
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)
    const contractBalance = await provider.getBalance(faucetAddress)
    const backendAddress = await faucetContract.BACKEND?.()
    const backendFeePercent = await faucetContract.BACKEND_FEE_PERCENT?.()
    console.log("Funding params:", {
      faucetAddress,
      amount: amount.toString(),
      isEther,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      signerBalance: balance.toString(),
      contractBalance: contractBalance.toString(),
      backendAddress,
      backendFeePercent: backendFeePercent?.toString(),
    })

    const isCelo = isCeloNetwork(chainId)

    if (isEther && !isCelo) {
      console.log(`Funding faucet ${faucetAddress} with ${amount} native tokens on chain ${chainId}`)
      // Estimate gas for fund transaction
      const gasEstimate = await provider.estimateGas({
        to: faucetAddress,
        value: amount,
        data: "0x",
      })
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice || BigInt(0)
      const gasCost = gasEstimate * gasPrice
      console.log("Gas estimate:", {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        gasCost: gasCost.toString(),
      })

      const tx = await signer.sendTransaction({
        to: faucetAddress,
        value: amount,
        data: "0x",
        gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
        maxFeePerGas: feeData.maxFeePerGas || undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
      })
      console.log("Transaction hash:", tx.hash)
      const receipt = await tx.wait()
      if (!receipt) {
        throw new Error("Fund transaction receipt is null")
      }
      console.log("Transaction confirmed:", receipt.hash)
      await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))
      return tx.hash
    }

    const tokenAddress =
      isEther && isCelo
        ? "0x471EcE3750Da237f93B8E339c536989b8978a438" // Wrapped CELO
        : await faucetContract.token()

    if (tokenAddress === ZeroAddress) {
      throw new Error("Token address is zero, cannot proceed with ERC-20 transfer")
    }

    const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer)
    console.log(`Approving ${amount} ${isEther && isCelo ? "CELO" : "tokens"} for faucet ${faucetAddress}`)

    const approveData = tokenContract.interface.encodeFunctionData("approve", [faucetAddress, amount])
    const approveDataWithReferral = appendDivviReferralData(approveData)
    const approveGasEstimate = await provider.estimateGas({
      to: tokenAddress,
      data: approveDataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const approveTx = await signer.sendTransaction({
      to: tokenAddress,
      data: approveDataWithReferral,
      gasLimit: (approveGasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas: feeData.maxFeePerGas || undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
    })
    const approveReceipt = await approveTx.wait()
    if (!approveReceipt) {
      throw new Error("Approve transaction receipt is null")
    }
    console.log("Approve transaction confirmed:", approveReceipt.hash)
    await reportTransactionToDivvi(approveTx.hash as `0x${string}`, Number(chainId))

    console.log(`Funding faucet ${faucetAddress} with ${amount} ${isEther && isCelo ? "CELO" : "tokens"}`)
    const fundData = faucetContract.interface.encodeFunctionData("fund", [amount])
    const fundDataWithReferral = appendDivviReferralData(fundData)
    const fundGasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: fundDataWithReferral,
      from: signerAddress,
    })
    const fundTx = await signer.sendTransaction({
      to: faucetAddress,
      data: fundDataWithReferral,
      gasLimit: (fundGasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas: feeData.maxFeePerGas || undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
    })
    console.log("Fund transaction hash:", fundTx.hash)
    const fundReceipt = await fundTx.wait()
    if (!fundReceipt) {
      throw new Error("Fund transaction receipt is null")
    }
    console.log("Fund transaction confirmed:", fundReceipt.hash)
    await reportTransactionToDivvi(fundTx.hash as `0x${string}`, Number(chainId))
    return fundTx.hash
  } catch (error: any) {
    console.error("Error funding faucet:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to fund faucet")
  }
}

// Set claim parameters
export async function setClaimParameters(
  provider: BrowserProvider,
  faucetAddress: string,
  claimAmount: bigint,
  startTime: number,
  endTime: number,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)

    const data = faucetContract.interface.encodeFunctionData("setClaimParameters", [
      claimAmount,
      startTime,
      endTime,
    ])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Set claim parameters params:", {
      faucetAddress,
      claimAmount: claimAmount.toString(),
      startTime,
      endTime,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Set claim parameters transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Set claim parameters transaction receipt is null")
    }
    console.log("Set claim parameters transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error setting claim parameters:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to set claim parameters")
  }
}

// Update claim parameters on-chain
export async function updateClaimParametersOnChain(
  provider: BrowserProvider,
  faucetAddress: string,
  claimAmount: bigint,
  startTime: number,
  endTime: number,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)

    const data = faucetContract.interface.encodeFunctionData("setClaimParameters", [
      claimAmount,
      startTime,
      endTime,
    ])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Update claim parameters params:", {
      faucetAddress,
      claimAmount: claimAmount.toString(),
      startTime,
      endTime,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Update claim parameters transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Update claim parameters transaction receipt is null")
    }
    console.log("Update claim parameters transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error updating claim parameters on-chain:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to update claim parameters")
  }
}

// Withdraw tokens
export async function withdrawTokens(
  provider: BrowserProvider,
  faucetAddress: string,
  amount: bigint,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)

    const data = faucetContract.interface.encodeFunctionData("withdraw", [amount])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Withdraw tokens params:", {
      faucetAddress,
      amount: amount.toString(),
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Withdraw transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Withdraw transaction receipt is null")
    }
    console.log("Withdraw transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error withdrawing tokens:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to withdraw tokens")
  }
}

// Set whitelist
export async function setWhitelist(
  provider: BrowserProvider,
  faucetAddress: string,
  addresses: string[],
  add: boolean,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)

    const method = add ? "addToWhitelist" : "removeFromWhitelist"
    const data = faucetContract.interface.encodeFunctionData(method, [addresses])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Set whitelist params:", {
      faucetAddress,
      addresses,
      add,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Set whitelist transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Set whitelist transaction receipt is null")
    }
    console.log("Set whitelist transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error setting whitelist:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to set whitelist")
  }
}

// Reset claimed status for addresses
export async function resetClaimedStatus(
  provider: BrowserProvider,
  faucetAddress: string,
  addresses: string[],
  status: boolean,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)

    const data = faucetContract.interface.encodeFunctionData("resetClaimed", [addresses, status])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Reset claimed status params:", {
      faucetAddress,
      addresses,
      status,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Reset claimed status transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Reset claimed status transaction receipt is null")
    }
    console.log("Reset claimed status transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error resetting claimed status:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to reset claimed status")
  }
}

export async function retrieveSecretCode(faucetAddress: string): Promise<string> {
  if (!isAddress(faucetAddress)) {
    throw new Error(`Invalid faucet address: ${faucetAddress}`);
  }

  try {
    // Check localStorage first
    const cachedCode = getFromStorage(`secretCode_${faucetAddress}`);
    if (cachedCode && /^[A-Z0-9]{6}$/.test(cachedCode)) {
      console.log(`Retrieved Drop code for ${faucetAddress} from localStorage`);
      return cachedCode;
    }

    // Fallback to backend if not found in localStorage
    const response = await fetch("https://fauctdrop-backend-1.onrender.com/retrieve-secret-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        faucetAddress: getAddress(faucetAddress), // Normalize address
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to retrieve Drop code");
    }

    const result = await response.json();
    const secretCode = result.secretCode;

    if (!secretCode || !/^[A-Z0-9]{6}$/.test(secretCode)) {
      throw new Error("Invalid Drop code format received from backend");
    }

    // Store the retrieved Drop code in localStorage for future use
    saveToStorage(`secretCode_${faucetAddress}`, secretCode);

    console.log(`Retrieved and stored Drop code for ${faucetAddress} from backend`);
    return secretCode;
  } catch (error: any) {
    console.error("Error retrieving Drop code:", error);
    throw new Error(error.message || "Failed to retrieve Drop code");
  }
}