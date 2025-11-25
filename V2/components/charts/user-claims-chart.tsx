"use client"
import { useEffect, useState, useCallback } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2, RefreshCw, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { JsonRpcProvider, Contract, isAddress, formatUnits, ZeroAddress } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { FAUCET_ABI_CUSTOM, FAUCET_ABI_DROPCODE, FAUCET_ABI_DROPLIST } from "@/lib/abis"
// Assuming these ABIs are defined and accessible via this path
import { FACTORY_ABI, FAUCET_ABI, ERC20_ABI } from "@/lib/abis" 
import { useToast } from "@/hooks/use-toast"
import { DataService, ClaimData } from "@/lib/database-helpers"

// --- PROVIDED FAUCET ABIs ---
// NOTE: These ABIs are used inside the batchFetchFaucetDetails helper for name fallback.


const FAUCET_ABIS = {
  custom: FAUCET_ABI_CUSTOM,
  dropcode: FAUCET_ABI_DROPCODE,
  droplist: FAUCET_ABI_DROPLIST
};
// -----------------------------

// Chain configurations
interface ChainConfig {
  chainId: number
  name: string
  displayName: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  nativeTokenAddress: string
  factoryAddresses: string[]
  rpcUrls: string[]
  blockExplorerUrlsUrls: string[]
  isTestnet?: boolean
  defaultTokens: {
    address: string
    name: string
    symbol: string
    decimals: number
  }[]
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  42220: {
    chainId: 42220,
    name: "Celo",
    displayName: "Celo Mainnet",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    nativeTokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    factoryAddresses: [
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
    rpcUrls: ["https://forno.celo.org"],
    blockExplorerUrlsUrls: ["https://celoscan.io/"],
    defaultTokens: [
      {
        address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
        name: "Celo Dollar",
        symbol: "cUSD",
        decimals: 18,
      },
    ],
  },
  // Add other chain configs as needed...
}

// Local storage keys for faucet names caching
const STORAGE_KEYS = {
  FAUCET_NAMES: 'faucet_names_cache',
  CLAIMS_DATA: 'faucet_claims_data',
  LAST_UPDATED: 'claims_last_updated',
  TOTAL_CLAIMS: 'totalclaim'
}

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

// Claim type definition (Updated for 2-step fetch)
type ClaimType = {
  claimer: string
  faucet: string
  amount: bigint
  networkName: string
  timestamp: number
  chainId: number
  isEther: boolean
  // Raw fields from Step 1
  tokenAddress: string | Promise<string> 
  // Enriched fields from Step 2
  tokenSymbol: string
  tokenDecimals: number
  faucetName: string 
}

// Helper function to save data to localStorage
function saveToLocalStorage(key: string, data: any) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(data, (k, v) => 
        typeof v === 'bigint' ? v.toString() : v
      ))
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

// Helper function to load data from localStorage
function loadFromLocalStorage<T>(key: string): T | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(key)
      if (!data) return null
      return JSON.parse(data, (k, v) => {
        if (k === 'amount' && typeof v === 'string') {
          return BigInt(v)
        }
        return v
      })
    }
    return null
  } catch (error) {
    console.warn('Failed to load from localStorage:', error)
    return null
  }
}

// Function to check if cache is valid
function isCacheValid(): boolean {
  const lastUpdated = loadFromLocalStorage<number>(STORAGE_KEYS.LAST_UPDATED)
  if (!lastUpdated) return false
  
  return Date.now() - lastUpdated < CACHE_DURATION
}

// Helper function to get token information
async function getTokenInfo(
  tokenAddress: string,
  provider: JsonRpcProvider,
  chainId: number,
  isEther: boolean
): Promise<{ symbol: string; decimals: number }> {
  const chainConfig = CHAIN_CONFIGS[chainId]
  
  if (isEther) {
    return {
      symbol: chainConfig?.nativeCurrency.symbol || "ETH",
      decimals: chainConfig?.nativeCurrency.decimals || 18
    }
  }

  // Check if it's a known default token first
  if (chainConfig?.defaultTokens) {
    const knownToken = chainConfig.defaultTokens.find(
      token => token.address.toLowerCase() === tokenAddress.toLowerCase()
    )
    if (knownToken) {
      return {
        symbol: knownToken.symbol,
        decimals: knownToken.decimals
      }
    }
  }

  // Query the token contract
  try {
    // Assuming ERC20_ABI includes symbol() and decimals()
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider)
    const [symbol, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals()
    ])
    
    return {
      symbol: symbol || "TOKEN",
      decimals: Number(decimals) || 18
    }
  } catch (error) {
    console.warn(`Error fetching token info for ${tokenAddress}:`, error)
    return {
      symbol: "TOKEN",
      decimals: 18
    }
  }
}

// --- STEP 1 HELPER: Get raw claims only ---
async function getAllClaimsFromFactories(
  provider: JsonRpcProvider,
  network: any,
): Promise<{
  faucetAddress: string
  transactionType: string
  initiator: string
  amount: bigint
  isEther: boolean
  timestamp: number
  networkName: string
  chainId: number
  tokenAddress: string // Raw field
}[]> {
  try {
    let allClaims: any[] = []
    
    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}`)
        continue
      }
      const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider)
      
      const code = await provider.getCode(factoryAddress)
      if (code === "0x") {
        console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`)
        continue
      }

      try {
        console.log(`Fetching transactions from factory ${factoryAddress} on ${network.name}...`)
        const allTransactions = await factoryContract.getAllTransactions()
        
        const claimTransactions = allTransactions.filter((tx: any) => {
          const transactionType = tx.transactionType.toLowerCase();
          return transactionType === 'claim' || 
                 (transactionType.includes('claim') && !transactionType.includes('setclaimparameters'));
        });
        
        console.log(`Found ${claimTransactions.length} claim transactions from factory ${factoryAddress}`)
        allClaims.push(...claimTransactions)
      } catch (error) {
        console.warn(`Error fetching transactions from factory ${factoryAddress}:`, error)
      }
    }

    // Process claims to get the bare minimum needed for Step 2
    const rawClaims = await Promise.all(
      allClaims.map(async (claim) => {
        let tokenAddress = ZeroAddress;
        let isEther = claim.isEther;
        
        if (!isEther) {
          try {
            const faucetContract = new Contract(claim.faucetAddress, FAUCET_ABI, provider);
            // Use Promise.race or chained promises to try multiple getters
            tokenAddress = await faucetContract.token().catch(() => faucetContract.tokenAddress()).catch(() => ZeroAddress);
          } catch {
            const chainConfig = CHAIN_CONFIGS[network.chainId];
            tokenAddress = chainConfig?.nativeTokenAddress || ZeroAddress;
          }
        } else {
            // For native ETH/CELO claims, use the native token address/placeholder
            tokenAddress = CHAIN_CONFIGS[network.chainId]?.nativeTokenAddress || ZeroAddress;
        }
        
        return {
          faucetAddress: claim.faucetAddress,
          transactionType: claim.transactionType,
          initiator: claim.initiator,
          amount: BigInt(claim.amount),
          isEther: isEther,
          timestamp: Number(claim.timestamp),
          networkName: network.name,
          chainId: network.chainId,
          tokenAddress: tokenAddress.toString(),
        }
      })
    )
    return rawClaims;
  } catch (error: any) {
    console.error(`Error fetching claims from factories on ${network.name}:`, error)
    throw new Error(error.message || "Failed to fetch claims from factories")
  }
}

// Function to get all claims from all networks (Step 1 runner)
async function getAllClaimsFromAllNetworks(
  networks: any[]
): Promise<ClaimType[]> {
  const rawClaimsPromises = networks.map(async (network) => {
    try {
      console.log(`Fetching raw claims from ${network.name}...`)
      const provider = new JsonRpcProvider(network.rpcUrls[0])
      const networkClaims = await getAllClaimsFromFactories(provider, network)
      
      return networkClaims.map(claim => ({
        ...claim,
        // Set enriched fields to placeholders for now
        tokenSymbol: 'N/A', 
        tokenDecimals: 18,
        faucetName: `Faucet ${claim.faucetAddress.slice(0, 6)}...${claim.faucetAddress.slice(-4)}`,
      })) as ClaimType[]
    } catch (error) {
      console.error(`Error fetching raw claims from ${network.name}:`, error)
      return [] as ClaimType[]
    }
  });

  const results = await Promise.all(rawClaimsPromises);
  let allClaims: ClaimType[] = results.flat();

  // Sort by timestamp (newest first)
  allClaims.sort((a, b) => b.timestamp - a.timestamp)
  
  console.log(`Total raw claims gathered: ${allClaims.length}`)
  return allClaims
}

// --- STEP 2 HELPER: Batch fetch name and token details ---
// --- MODIFIED STEP 2 HELPER: Batch fetch name and token details ---
async function batchFetchFaucetDetails(
    faucetAddresses: Set<string>,
    claims: ClaimType[],
    networks: any[]
): Promise<Record<string, { name: string; symbol: string; decimals: number }>> {
    const detailsMap: Record<string, { name: string; symbol: string; decimals: number }> = {};
    const promises: Promise<void>[] = [];
    
    // Group claims by faucet address to find the corresponding chain/token address
    const claimMap: Record<string, ClaimType> = {};
    claims.forEach(c => {
        if (!claimMap[c.faucet]) claimMap[c.faucet] = c;
    });

    for (const address of faucetAddresses) {
        const claim = claimMap[address];
        if (!claim) continue;
        
        const network = networks.find(n => n.chainId === claim.chainId);
        if (!network) continue;
        
        const provider = new JsonRpcProvider(network.rpcUrls[0]);
        const chainConfig = CHAIN_CONFIGS[claim.chainId];
        
        promises.push((async () => {
            let name = `Faucet ${address.slice(0, 6)}...${address.slice(-4)}`;
            let tokenAddress = claim.tokenAddress.toString();
            const isNative = tokenAddress === chainConfig?.nativeTokenAddress;
            
            let symbol = isNative ? chainConfig.nativeCurrency.symbol : "TOKEN";
            let decimals = isNative ? chainConfig.nativeCurrency.decimals : 18;

            // 1. Fetch Name (Robust Multi-ABI Attempt)
            const namePromises = Object.entries(FAUCET_ABIS).map(([abiKey, abi]) => {
                const nameAbi = abi.find(fn => fn.name === 'name' && fn.type === 'function');
                if (!nameAbi) return Promise.resolve(null);
                
                // Create minimal contract instance for the 'name' function
                const contract = new Contract(address, [nameAbi], provider);
                
                return contract.name()
                    .then(n => {
                        if (n && n.trim() !== '') {
                            console.log(`✅ Faucet ${address} name found via ${abiKey}: ${n}`);
                            return n;
                        }
                        return null;
                    })
                    .catch(e => {
                        // console.warn(`Name fetch failed for ${address} via ${abiKey}:`, e.message);
                        return null; // Swallow RPC error, try next ABI
                    }); 
            });

            // Wait for the first successful name retrieval
            const fetchedNames = await Promise.all(namePromises);
            const successfulName = fetchedNames.find(n => n);
            
            if (successfulName) {
                name = successfulName;
            } else {
                 console.warn(`❌ Faucet ${address} failed to retrieve name on chain ${claim.chainId}. Using fallback.`);
            }

            // 2. Fetch Token Info (if not native)
            if (!isNative && tokenAddress !== ZeroAddress) {
                const tokenInfo = await getTokenInfo(tokenAddress, provider, claim.chainId, false).catch(e => {
                    return null;
                });
                if (tokenInfo) {
                    symbol = tokenInfo.symbol;
                    decimals = tokenInfo.decimals;
                }
            }
            
            detailsMap[address] = { name, symbol, decimals };
        })());
    }

    await Promise.all(promises);
    return detailsMap;
}

interface ChartClaimData {
  name: string
  value: number
  color: string
  faucetAddress: string
}

interface FaucetRanking {
  rank: number
  faucetAddress: string
  faucetName: string
  network: string
  chainId: number
  totalClaims: number
  latestClaimTime: number
  totalAmount: string
}

export function UserClaimsChart() {
  const { networks } = useNetwork()
  const { toast } = useToast()
  const [data, setData] = useState<ChartClaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalClaims, setTotalClaims] = useState(0)
  const [totalFaucets, setTotalFaucets] = useState(0)
  const [faucetNames, setFaucetNames] = useState<Record<string, string>>({})
  const [faucetRankings, setFaucetRankings] = useState<FaucetRanking[]>([])
  
  useEffect(() => {
    // Load cached totalClaims on mount
    const stored = localStorage.getItem(STORAGE_KEYS.TOTAL_CLAIMS)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (typeof parsed === 'number') {
          setTotalClaims(parsed)
        }
      } catch (e) {
        console.warn('Error parsing cached totalClaims:', e)
      }
    }
  }, [])

  // Generate colors for the pie chart
  const generateColors = (count: number) => {
    const colors = []
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.508) % 360 // Golden angle approximation for better color distribution
      colors.push(`hsl(${hue}, 70%, 60%)`)
    }
    return colors
  }

  // --- Step 2.5: Enriches Faucet Names Cache ---
  const updateFaucetNamesCache = useCallback((claimsData: ClaimType[], detailsMap: Record<string, { name: string; symbol: string; decimals: number }>) => {
    // Load cached names first
    const cachedNames = loadFromLocalStorage<Record<string, string>>(STORAGE_KEYS.FAUCET_NAMES) || {};
    let newNames: Record<string, string> = { ...cachedNames };

    // Update with names freshly retrieved from the chain/details map
    claimsData.forEach(claim => {
        // Use the enriched name if available, otherwise use the direct claim name (from cache/placeholder)
        const enrichedName = detailsMap[claim.faucet]?.name || claim.faucetName;
        if (enrichedName) {
            newNames[claim.faucet.toLowerCase()] = enrichedName;
        }
    });

    setFaucetNames(newNames);
    saveToLocalStorage(STORAGE_KEYS.FAUCET_NAMES, newNames);
    return newNames;
  }, []);


  const fetchAndStoreData = async () => {
    setLoading(true)
    try {
      console.log("Starting 2-step data fetch...")
      
      // STEP 1: Fetch ALL Claims (raw data)
      const rawClaims = await getAllClaimsFromAllNetworks(networks)
      
      // STEP 2: Identify unique addresses and batch fetch details
      const uniqueFaucets = new Set(rawClaims.map(c => c.faucet));
      const faucetDetailsMap = await batchFetchFaucetDetails(uniqueFaucets, rawClaims, networks);

      // STEP 3: Process Claims and Integrate Details
      let allClaims: ClaimType[] = [];
      const claimsByFaucet: { [key: string]: { 
        claims: number, 
        network: string,
        chainId: number,
        totalAmount: bigint,
        tokenSymbol: string,
        tokenDecimals: number,
        latestTimestamp: number
      } } = {}

      for (const rawClaim of rawClaims) {
          const detail = faucetDetailsMap[rawClaim.faucet] || { 
              name: rawClaim.faucetName, // Placeholder/Cached Name
              symbol: rawClaim.tokenSymbol, // Placeholder/Cached Symbol
              decimals: rawClaim.tokenDecimals // Placeholder/Cached Decimals
          };
          
          const claim: ClaimType = {
              ...rawClaim,
              tokenSymbol: detail.symbol,
              tokenDecimals: detail.decimals,
              faucetName: detail.name
          };
          allClaims.push(claim);

          const faucetKey = claim.faucet.toLowerCase();
          
          if (!claimsByFaucet[faucetKey]) {
            claimsByFaucet[faucetKey] = { 
              claims: 0, 
              network: claim.networkName,
              chainId: claim.chainId,
              totalAmount: BigInt(0),
              tokenSymbol: detail.symbol,
              tokenDecimals: detail.decimals,
              latestTimestamp: 0
            }
          }
          
          claimsByFaucet[faucetKey].claims += 1
          claimsByFaucet[faucetKey].totalAmount += claim.amount
          
          if (claim.timestamp > claimsByFaucet[faucetKey].latestTimestamp) {
            claimsByFaucet[faucetKey].latestTimestamp = claim.timestamp
          }
      }

      setTotalClaims(allClaims.length)
      setTotalFaucets(Object.keys(claimsByFaucet).length)

      // STEP 4: Update Cache and State (CRUCIAL for loadStoredData)
      const combinedNames = updateFaucetNamesCache(allClaims, faucetDetailsMap)

      // STEP 5: Create faucet rankings
      const rankingData: FaucetRanking[] = Object.entries(claimsByFaucet)
        .sort(([, a], [, b]) => b.latestTimestamp - a.latestTimestamp)
        .map(([faucet, data], index) => {
           const faucetName = combinedNames[faucet] || `Faucet ${faucet.slice(0, 6)}...${faucet.slice(-4)}`;
           return {
              rank: index + 1,
              faucetAddress: faucet,
              faucetName: faucetName,
              network: data.network,
              chainId: data.chainId,
              totalClaims: data.claims,
              latestClaimTime: data.latestTimestamp,
              totalAmount: `${Number(formatUnits(data.totalAmount, data.tokenDecimals)).toFixed(4)} ${data.tokenSymbol}`
           }
        })

      setFaucetRankings(rankingData)

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.TOTAL_CLAIMS, JSON.stringify(allClaims.length))
      }

      // Convert to chart data format - show ONLY TOP 10 faucets
      const sortedFaucets = Object.entries(claimsByFaucet)
        .sort(([, a], [, b]) => b.claims - a.claims)
      
      const top10Faucets = sortedFaucets.slice(0, 10)
      const otherFaucets = sortedFaucets.slice(10)
      
      const otherTotalClaims = otherFaucets.reduce((sum, [, data]) => sum + data.claims, 0)
      
      const colors = generateColors(top10Faucets.length + (otherTotalClaims > 0 ? 1 : 0))
      
      const chartData: ChartClaimData[] = top10Faucets.map(([faucet, data], index) => {
        const faucetName = combinedNames[faucet] || `${faucet.slice(0, 6)}...${faucet.slice(-4)}`
        return {
          name: faucetName,
          value: data.claims,
          color: colors[index],
          faucetAddress: faucet
        }
      })

      if (otherTotalClaims > 0) {
        chartData.push({
          name: `Others (${otherFaucets.length} faucets)`,
          value: otherTotalClaims,
          color: colors[top10Faucets.length],
          faucetAddress: 'others'
        })
      }

      // Save to cache
      saveToLocalStorage(STORAGE_KEYS.CLAIMS_DATA, allClaims)
      saveToLocalStorage(STORAGE_KEYS.LAST_UPDATED, Date.now())

      // Save to Supabase
      const supabaseClaimData: Omit<ClaimData, 'id' | 'updated_at'>[] = rankingData.map(item => ({
        faucet_address: item.faucetAddress,
        faucet_name: item.faucetName,
        network: item.network,
        chain_id: item.chainId,
        claims: item.totalClaims,
        total_amount: item.totalAmount,
        latest_claim_time: item.latestClaimTime
      }))
      await DataService.saveClaimData(supabaseClaimData)

      setData(chartData)
      
      if (allClaims.length > 0) {
        toast({
          title: "Data refreshed",
          description: `Loaded ${allClaims.length} total drops`,
        })
      }
    } catch (error) {
      console.error("Error fetching claim data:", error)
      toast({
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // UPDATED: loadStoredData to correctly handle cache and Supabase name retrieval
  const loadStoredData = async () => {
    // Try localStorage first
    if (isCacheValid()) {
      const cachedClaims = loadFromLocalStorage<ClaimType[]>(STORAGE_KEYS.CLAIMS_DATA)
      if (cachedClaims && cachedClaims.length > 0) {
        console.log('Using cached claims data from localStorage')
        
        // Load cached names separately (CRITICAL FIX)
        const cachedNames = loadFromLocalStorage<Record<string, string>>(STORAGE_KEYS.FAUCET_NAMES) || {};
        
        // --- DATA PROCESSING ---
        const claimsByFaucet: { [key: string]: { 
            claims: number, 
            network: string,
            chainId: number,
            totalAmount: bigint,
            tokenSymbol: string,
            tokenDecimals: number,
            latestTimestamp: number
        } } = {}

        for (const claim of cachedClaims) {
            const faucetKey = claim.faucet.toLowerCase()
            
            if (!claimsByFaucet[faucetKey]) {
                claimsByFaucet[faucetKey] = { 
                    claims: 0, 
                    network: claim.networkName,
                    chainId: claim.chainId,
                    totalAmount: BigInt(0),
                    // Use cached details if available, otherwise fallback
                    tokenSymbol: claim.tokenSymbol || 'N/A', 
                    tokenDecimals: claim.tokenDecimals || 18,
                    latestTimestamp: 0
                }
            }
            
            claimsByFaucet[faucetKey].claims += 1
            claimsByFaucet[faucetKey].totalAmount += claim.amount
            
            if (claim.timestamp > claimsByFaucet[faucetKey].latestTimestamp) {
                claimsByFaucet[faucetKey].latestTimestamp = claim.timestamp
            }
        }
        
        // Use cached names and data to build rankings/chart data
        const rankingData = Object.entries(claimsByFaucet)
            .sort(([, a], [, b]) => b.latestTimestamp - a.latestTimestamp)
            .map(([faucet, data], index) => {
                const name = cachedNames[faucet] || `Faucet ${faucet.slice(0, 6)}...${faucet.slice(-4)}`;
                return {
                    rank: index + 1,
                    faucetAddress: faucet,
                    faucetName: name,
                    network: data.network,
                    chainId: data.chainId,
                    totalClaims: data.claims,
                    latestClaimTime: data.latestTimestamp,
                    totalAmount: `${Number(formatUnits(data.totalAmount, data.tokenDecimals)).toFixed(4)} ${data.tokenSymbol}`
                }
            })

        const top10Faucets = Object.entries(claimsByFaucet)
            .sort(([, a], [, b]) => b.claims - a.claims)
            .slice(0, 10);
            
        const colors = generateColors(top10Faucets.length);
        
        const chartData: ChartClaimData[] = top10Faucets.map(([faucet, data], index) => ({
            name: cachedNames[faucet] || `${faucet.slice(0, 6)}...${faucet.slice(-4)}`,
            value: data.claims,
            color: colors[index],
            faucetAddress: faucet
        }));

        setFaucetNames(cachedNames); // CRUCIAL: Set the names map
        setFaucetRankings(rankingData);
        setData(chartData);
        setTotalClaims(cachedClaims.length);
        setTotalFaucets(rankingData.length);
        
        setLoading(false)
        return true
      }
    }

    // Fallback to Supabase
    try {
      const supabaseData = await DataService.loadClaimData()
      if (supabaseData.length > 0 && DataService.isDataFresh(supabaseData[0].updated_at)) {
        console.log('Using fresh claim data from Supabase')
        
        // 1. Build the FaucetNames Map from Supabase data (CRITICAL FIX)
        const newFaucetNames: Record<string, string> = {};
        supabaseData.forEach(item => {
            newFaucetNames[item.faucet_address] = item.faucet_name;
        });

        // 2. Set the state before generating chart/ranking data
        setFaucetNames(newFaucetNames); // CRUCIAL: Set the names map
        
        const chartData = supabaseData.slice(0, 10).map((item, index) => ({
          name: item.faucet_name, // Name comes directly from Supabase
          value: item.claims,
          color: `hsl(${(index * 137.508) % 360}, 70%, 60%)`,
          faucetAddress: item.faucet_address
        }))
        
        const rankingData = supabaseData.map((item, index) => ({
          rank: index + 1,
          faucetAddress: item.faucet_address,
          faucetName: item.faucet_name, // Name comes directly from Supabase
          network: item.network,
          chainId: item.chain_id,
          totalClaims: item.claims,
          latestClaimTime: item.latest_claim_time,
          totalAmount: item.total_amount
        }))
        
        const totalClaimsCount = supabaseData.reduce((sum, item) => sum + item.claims, 0)
        
        setData(chartData)
        setFaucetRankings(rankingData)
        setTotalClaims(totalClaimsCount)
        setTotalFaucets(supabaseData.length)
        
        setLoading(false)
        return true
      }
    } catch (error) {
      console.error('Error loading claim data from Supabase:', error)
    }

    return false
}


  useEffect(() => {
    loadStoredData().then((dataLoaded) => {
      if (!dataLoaded && networks.length > 0) {
        fetchAndStoreData()
      }
    })
  }, [networks])

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    if (networks.length === 0) return

    const interval = setInterval(() => {
      fetchAndStoreData()
    }, CACHE_DURATION)

    return () => clearInterval(interval)
  }, [networks])

  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'celo':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'arbitrum':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'base':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'lisk':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  // Helper function to get the explorer URL for a given chainId
  const getExplorerUrl = (chainId: number, address: string) => {
    const chainConfig = CHAIN_CONFIGS[chainId]
    if (chainConfig?.blockExplorerUrlsUrls?.length > 0) {
      return `${chainConfig.blockExplorerUrlsUrls[0]}/address/${address}`
    }
    return '#'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm md:text-base">Loading faucet data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Custom tooltip to show faucet details
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-medium text-sm md:text-base">{data.name}</p>
          {data.faucetAddress !== 'others' && (
            <p className="text-xs md:text-sm text-muted-foreground">
              Address: {data.faucetAddress.slice(0, 6)}...{data.faucetAddress.slice(-4)}
            </p>
          )}
          <p className="text-xs md:text-sm">
            Drops: <span className="font-medium">{data.value.toLocaleString()}</span>
          </p>
          <p className="text-xs md:text-sm text-muted-foreground">
            {((data.value / totalClaims) * 100).toFixed(1)}% of total drops
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-4">
      {/* Header Section with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-lg md:text-2xl font-bold">{totalClaims.toLocaleString()}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Total Drops</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAndStoreData} disabled={loading} className="shrink-0">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Pie Chart - Top 10 Only */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl">Top 10 Faucets by Drops</CardTitle>
            <CardDescription className="text-sm">
              Distribution of drops among top 10 most active faucets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} className="md:h-96">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius="80%"
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p className="text-sm md:text-base">No drop data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Available Faucets Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl">All Available Faucets</CardTitle>
            <CardDescription className="text-sm">
              Complete list ranked by latest activity from all active faucets
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="w-16 text-xs md:text-sm font-medium text-left p-2 md:p-4">Rank</th>
                    <th className="text-xs md:text-sm font-medium text-left p-2 md:p-4">Faucet Name</th>
                    <th className="text-xs md:text-sm font-medium text-left p-2 md:p-4">Network</th>
                    <th className="text-right text-xs md:text-sm font-medium p-2 md:p-4">Drops</th>
                    <th className="text-right text-xs md:text-sm font-medium p-2 md:p-4">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {faucetRankings.length > 0 ? (
                    faucetRankings.map((item) => (
                      <tr key={item.faucetAddress} className="border-b hover:bg-muted/50">
                        <td className="font-medium p-2 md:p-4">
                          <span className="text-sm font-medium text-muted-foreground">#{item.rank}</span>
                        </td>
                        <td className="p-2 md:p-4">
                          <div className="max-w-[150px] md:max-w-[200px]">
                            <div className="font-medium truncate mb-1 text-xs md:text-sm" title={item.faucetName}>
                              {item.faucetName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.faucetAddress.slice(0, 6)}...{item.faucetAddress.slice(-4)} 
                              <a
                                href={getExplorerUrl(item.chainId, item.faucetAddress)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline ml-1"
                              > 
                                <ExternalLink className="h-3 w-3 inline" />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 md:p-4">
                          <Badge variant="secondary" className={`${getNetworkColor(item.network)} text-xs`}>
                            {item.network}
                          </Badge>
                        </td>
                        <td className="text-right font-medium text-xs md:text-sm p-2 md:p-4">
                          {item.totalClaims.toLocaleString()}
                        </td>
                        <td className="text-right text-xs p-2 md:p-4">
                          {new Date(item.latestClaimTime * 1000).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground p-2 md:p-4">
                        <p className="text-sm">No faucet data available yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}