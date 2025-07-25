"use client"

import { useEffect, useState, useCallback } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2, RefreshCw, Trophy, Medal, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { JsonRpcProvider, Contract, isAddress, formatUnits, ZeroAddress } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { FACTORY_ABI } from "@/lib/abis"

// ERC20 ABI for symbol and decimals
const ERC20_ABI = [
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Faucet ABI for getting faucet names and token addresses
const FAUCET_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getName",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "faucetName",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Chain configurations
interface ChainConfig {
  chainId: number;
  name: string;
  displayName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  nativeTokenAddress: string;
  factoryAddresses: string[];
  rpcUrls: string[];
  blockExplorerUrls: string[];
  isTestnet?: boolean;
  defaultTokens: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  }[];
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
    blockExplorerUrls: ["https://explorer.celo.org"],
    defaultTokens: [
      {
        address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
        name: "Celo Dollar",
        symbol: "cUSD",
        decimals: 18,
      },
      {
        address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
        name: "Celo Euro",
        symbol: "cEUR",
        decimals: 18,
      },
      {
        address: "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3",
        name: "Glo Dollar",
        symbol: "USDGLO",
        decimals: 18,
      },
      {
        address: "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a",
        name: "Good dollar",
        symbol: "G$",
        decimals: 18,
      },
    ],
  },
  42161: {
    chainId: 42161,
    name: "Arbitrum",
    displayName: "Arbitrum",
    nativeCurrency: { name: "ETHER", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: ZeroAddress,
    factoryAddresses: [
      "0x96E9911df17e94F7048cCbF7eccc8D9b5eDeCb5C",
    ],
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
    isTestnet: true,
    defaultTokens: [
      {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
  1135: {
    chainId: 1135,
    name: "Lisk",
    displayName: "Lisk Mainnet",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: ZeroAddress,
    factoryAddresses: [
      "0x4F5Cf906b9b2Bf4245dba9F7d2d7F086a2a441C2",
    ],
    rpcUrls: ["https://rpc.api.lisk.com"],
    blockExplorerUrls: ["https://blockscout.lisk.com"],
    defaultTokens: [
      {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
  8453: {
    chainId: 8453,
    name: "Base",
    displayName: "Base Mainnet",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: ZeroAddress,
    factoryAddresses: [
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
    defaultTokens: [
      {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
}

// Local storage keys for faucet names caching
const STORAGE_KEYS = {
  FAUCET_NAMES: 'chart_faucet_names_cache',
};

// Claim type definition
type ClaimType = {
  claimer: string;
  faucet: string;
  amount: bigint;
  networkName: string;
  timestamp: number;
  chainId: number;
  tokenSymbol: string;
  tokenDecimals: number;
  isEther: boolean;
};

// Helper function to save data to localStorage
function saveToLocalStorage(key: string, data: any) {
  try {
    // Use global localStorage instead of window.localStorage for better compatibility
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

// Helper function to load data from localStorage
function loadFromLocalStorage<T>(key: string): T | null {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return null;
  }
}

// Helper function to get token information
async function getTokenInfo(
  tokenAddress: string,
  provider: JsonRpcProvider,
  chainId: number,
  isEther: boolean
): Promise<{ symbol: string; decimals: number }> {
  const chainConfig = CHAIN_CONFIGS[chainId];
  
  if (isEther) {
    return {
      symbol: chainConfig?.nativeCurrency.symbol || "ETH",
      decimals: chainConfig?.nativeCurrency.decimals || 18
    };
  }

  // Check if it's a known default token first
  if (chainConfig?.defaultTokens) {
    const knownToken = chainConfig.defaultTokens.find(
      token => token.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    if (knownToken) {
      return {
        symbol: knownToken.symbol,
        decimals: knownToken.decimals
      };
    }
  }

  // Query the token contract
  try {
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
    const [symbol, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    return {
      symbol: symbol || "TOKEN",
      decimals: Number(decimals) || 18
    };
  } catch (error) {
    console.warn(`Error fetching token info for ${tokenAddress}:`, error);
    return {
      symbol: "TOKEN",
      decimals: 18
    };
  }
}

// Function to get claims from factories for a single network
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
  tokenSymbol: string
  tokenDecimals: number
}[]> {
  try {
    let allClaims: any[] = [];

    // Iterate through all factory addresses
    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}`);
        continue;
      }

      const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider);

      // Check if factory contract exists
      const code = await provider.getCode(factoryAddress);
      if (code === "0x") {
        console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`);
        continue;
      }

      try {
        console.log(`Fetching transactions from factory ${factoryAddress} on ${network.name}...`);
        const allTransactions = await factoryContract.getAllTransactions();
        
        // Filter for claim transactions only
        const claimTransactions = allTransactions.filter((tx: any) => 
          tx.transactionType.toLowerCase().includes('claim')
        );
        
        console.log(`Found ${claimTransactions.length} claim transactions from factory ${factoryAddress}`);
        allClaims.push(...claimTransactions);
      } catch (error) {
        console.warn(`Error fetching transactions from factory ${factoryAddress}:`, error);
      }
    }

    // Process claims and get additional information
    const processedClaims = await Promise.all(
      allClaims.map(async (claim) => {
        // Get token information
        let tokenInfo;
        if (claim.isEther) {
          tokenInfo = await getTokenInfo("", provider, network.chainId, true);
        } else {
          try {
            const faucetContract = new Contract(claim.faucetAddress, FAUCET_ABI, provider);
            let tokenAddress;
            
            try {
              tokenAddress = await faucetContract.token();
            } catch {
              try {
                tokenAddress = await faucetContract.tokenAddress();
              } catch {
                const chainConfig = CHAIN_CONFIGS[network.chainId];
                tokenAddress = chainConfig?.nativeTokenAddress || ZeroAddress;
              }
            }
            
            tokenInfo = await getTokenInfo(tokenAddress, provider, network.chainId, false);
          } catch (error) {
            console.warn(`Error getting token info for faucet ${claim.faucetAddress}:`, error);
            tokenInfo = { symbol: "TOKEN", decimals: 18 };
          }
        }

        return {
          faucetAddress: claim.faucetAddress,
          transactionType: claim.transactionType,
          initiator: claim.initiator,
          amount: BigInt(claim.amount),
          isEther: claim.isEther,
          timestamp: Number(claim.timestamp),
          networkName: network.name,
          chainId: network.chainId,
          tokenSymbol: tokenInfo.symbol,
          tokenDecimals: tokenInfo.decimals
        };
      })
    );

    return processedClaims;
  } catch (error: any) {
    console.error(`Error fetching claims from factories on ${network.name}:`, error);
    throw new Error(error.message || "Failed to fetch claims from factories");
  }
}

// Function to get all claims from all networks
async function getAllClaimsFromAllNetworks(
  networks: any[]
): Promise<ClaimType[]> {
  const allClaims: ClaimType[] = [];

  for (const network of networks) {
    try {
      console.log(`Fetching claims from ${network.name}...`);
      
      const provider = new JsonRpcProvider(network.rpcUrl);
      const networkClaims = await getAllClaimsFromFactories(provider, network);
      
      // Convert to ClaimType format
      const convertedClaims: ClaimType[] = networkClaims.map(claim => ({
        claimer: claim.initiator,
        faucet: claim.faucetAddress,
        amount: claim.amount,
        networkName: claim.networkName,
        timestamp: claim.timestamp,
        chainId: claim.chainId,
        tokenSymbol: claim.tokenSymbol,
        tokenDecimals: claim.tokenDecimals,
        isEther: claim.isEther,
      }));
      
      allClaims.push(...convertedClaims);
      console.log(`Added ${convertedClaims.length} claims from ${network.name}`);
    } catch (error) {
      console.error(`Error fetching claims from ${network.name}:`, error);
    }
  }

  // Sort by timestamp (newest first)
  allClaims.sort((a, b) => b.timestamp - a.timestamp);

  console.log(`Total claims from all networks: ${allClaims.length}`);
  return allClaims;
}

interface ClaimData {
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
  totalClaims: number
  latestClaimTime: number
  totalAmount: string
}

export function UserClaimsChart() {
  const { networks } = useNetwork()
  const [data, setData] = useState<ClaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalClaims, setTotalClaims] = useState(0)
  const [totalFaucets, setTotalFaucets] = useState(0)
  const [faucetNames, setFaucetNames] = useState<Record<string, string>>({})
  const [faucetRankings, setFaucetRankings] = useState<FaucetRanking[]>([])
  
  // Generate colors for the pie chart
  const generateColors = (count: number) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.508) % 360; // Golden angle approximation for better color distribution
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
  };

  // Function to fetch faucet names with caching - similar to FaucetList
  const fetchFaucetNames = useCallback(async (claimsData: ClaimType[]) => {
    // Load cached names first
    const cachedNames = loadFromLocalStorage<Record<string, string>>(STORAGE_KEYS.FAUCET_NAMES) || {};
    setFaucetNames(cachedNames);

    const faucetAddresses = [...new Set(claimsData.map(claim => claim.faucet))];
    const uncachedAddresses = faucetAddresses.filter(addr => !cachedNames[addr]);
    
    if (uncachedAddresses.length === 0) {
      console.log('All faucet names already cached');
      return;
    }

    console.log(`Fetching names for ${uncachedAddresses.length} uncached faucets...`);
    
    const namePromises = uncachedAddresses.map(async (faucetAddress) => {
      try {
        const claim = claimsData.find(c => c.faucet === faucetAddress);
        if (!claim) return null;
        
        const network = networks.find(n => n.chainId === claim.chainId);
        if (!network) return null;
        
        const provider = new JsonRpcProvider(network.rpcUrl);
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider);
        
        let faucetName: string;
        try {
          faucetName = await faucetContract.getName();
        } catch {
          try {
            faucetName = await faucetContract.name();
          } catch {
            try {
              faucetName = await faucetContract.faucetName();
            } catch {
              return null;
            }
          }
        }
        
        return { address: faucetAddress, name: faucetName };
      } catch (error) {
        console.log(`Error fetching name for faucet ${faucetAddress}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(namePromises);
    const newNames: Record<string, string> = { ...cachedNames };
    
    results.forEach(result => {
      if (result && result.name) {
        newNames[result.address] = result.name;
      }
    });
    
    console.log(`Successfully fetched ${Object.keys(newNames).length - Object.keys(cachedNames).length} new faucet names`);
    setFaucetNames(newNames);
    saveToLocalStorage(STORAGE_KEYS.FAUCET_NAMES, newNames);
  }, [networks]);

  const fetchData = async () => {
    setLoading(true)
    try {
      console.log("Fetching claims from factory sources...");
      
      // Fetch claims from factories
      const allClaims = await getAllClaimsFromAllNetworks(networks);
      console.log("Fetched factory claims:", allClaims.length);

      const claimsByFaucet: { [key: string]: { 
        claims: number, 
        network: string, 
        totalAmount: bigint,
        tokenSymbol: string,
        tokenDecimals: number,
        latestTimestamp: number
      } } = {};
      let totalClaimsCount = allClaims.length;

      // Process all claims
      for (const claim of allClaims) {
        // Group by faucet with network info
        const faucetKey = claim.faucet.toLowerCase();
        
        if (!claimsByFaucet[faucetKey]) {
          claimsByFaucet[faucetKey] = { 
            claims: 0, 
            network: claim.networkName,
            totalAmount: BigInt(0),
            tokenSymbol: claim.tokenSymbol,
            tokenDecimals: claim.tokenDecimals,
            latestTimestamp: 0
          };
        }
        claimsByFaucet[faucetKey].claims += 1;
        claimsByFaucet[faucetKey].totalAmount += claim.amount;
        
        // Track latest timestamp for this faucet
        if (claim.timestamp > claimsByFaucet[faucetKey].latestTimestamp) {
          claimsByFaucet[faucetKey].latestTimestamp = claim.timestamp;
        }
      }

      setTotalClaims(totalClaimsCount);
      setTotalFaucets(Object.keys(claimsByFaucet).length);

      // Fetch faucet names with caching
      await fetchFaucetNames(allClaims);

      // Get the updated faucet names (either from cache or freshly fetched)
      const currentFaucetNames = loadFromLocalStorage<Record<string, string>>(STORAGE_KEYS.FAUCET_NAMES) || {};

      // Create faucet rankings - ranked by latest claim time
      const rankingData: FaucetRanking[] = Object.entries(claimsByFaucet)
        .sort(([, a], [, b]) => b.latestTimestamp - a.latestTimestamp) // Sort by latest timestamp
        .map(([faucet, data], index) => ({
          rank: index + 1,
          faucetAddress: faucet,
          faucetName: currentFaucetNames[faucet] || `${faucet.slice(0, 6)}...${faucet.slice(-4)}`,
          network: data.network,
          totalClaims: data.claims,
          latestClaimTime: data.latestTimestamp,
          totalAmount: `${Number(formatUnits(data.totalAmount, data.tokenDecimals)).toFixed(4)} ${data.tokenSymbol}`
        }));

      setFaucetRankings(rankingData);

      // Convert to chart data format - show ALL faucets
      const sortedFaucets = Object.entries(claimsByFaucet)
        .sort(([, a], [, b]) => b.claims - a.claims);

      const colors = generateColors(sortedFaucets.length);
      
      const chartData: ClaimData[] = sortedFaucets.map(([faucet, data], index) => {
        const faucetName = currentFaucetNames[faucet] || `${faucet.slice(0, 6)}...${faucet.slice(-4)}`;
        return {
          name: faucetName,
          value: data.claims,
          color: colors[index],
          faucetAddress: faucet
        };
      });

      console.log("Claims chart data:", chartData);
      console.log("Faucet rankings:", rankingData);
      console.log("Total claims:", totalClaimsCount);
      console.log("Total faucets:", Object.keys(claimsByFaucet).length);
      setData(chartData);
    } catch (error) {
      console.error("Error fetching claim data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (networks.length > 0) {
      fetchData();
    }
  }, [networks, fetchFaucetNames]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
    }
  }

  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'celo':
        return 'bg-green-100 text-green-800'
      case 'arbitrum':
        return 'bg-blue-100 text-blue-800'
      case 'base':
        return 'bg-blue-100 text-blue-800'
      case 'lisk':
        return 'bg-purple-100 text-purple-800'
      case 'polygon':
        return 'bg-purple-100 text-purple-800'
      case 'ethereum':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  localStorage.setItem('totalclaim', JSON.stringify(totalClaims));
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading faucet data...</p>
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
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Address: {data.faucetAddress.slice(0, 6)}...{data.faucetAddress.slice(-4)}
          </p>
          <p className="text-sm">
            Drops: <span className="font-medium">{data.value.toLocaleString()}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {((data.value / totalClaims) * 100).toFixed(1)}% of total drops
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalClaims.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Drops</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalFaucets.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Faucets</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Drop Distribution by Faucet</CardTitle>
            <CardDescription>
              All faucets across networks ({data.length} faucets total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    dataKey="value"
                    label={({ name, percent }) => 
                      percent > 0.05 ? `${name} (${(percent * 100).toFixed(1)}%)` : ''
                    }
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No drop data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Faucet Rankings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Available Faucet</CardTitle>
            <CardDescription>
              Ranked by latest activity ({faucetRankings.length} faucets total with deleted faucets)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Faucet</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead className="text-right">Claims</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Latest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faucetRankings.length > 0 ? (
                    faucetRankings.map((item) => (
                      <TableRow key={item.faucetAddress}>
                        <TableCell className="font-medium">
                          <div className="flex items-center justify-center">
                            {getRankIcon(item.rank)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px]">
                            <div className="font-medium truncate" title={item.faucetName}>
                              {item.faucetName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {item.faucetAddress.slice(0, 6)}...{item.faucetAddress.slice(-4)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getNetworkColor(item.network)}>
                            {item.network}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.totalClaims.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {item.totalAmount}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {new Date(item.latestClaimTime * 1000).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No faucet data available yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}