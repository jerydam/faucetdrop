"use client"

import { useEffect, useState } from "react";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { formatUnits, Contract, JsonRpcProvider, isAddress, zeroAddress } from "ethers";
import { getAllClaimsForAllNetworks } from "@/lib/faucet";
import { Network } from "@/hooks/use-network";
import { FACTORY_ABI, FAUCET_ABI } from "@/lib/abis";

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
    nativeTokenAddress: zeroAddress,
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
    nativeTokenAddress: zeroAddress,
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
    nativeTokenAddress: zeroAddress,
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

// Helper function to get token information
async function getTokenInfo(
  tokenAddress: string,
  provider: JsonRpcProvider,
  chainId: number,
  isEther: boolean
): Promise<{ symbol: string; decimals: number }> {
  const chainConfig = CHAIN_CONFIGS[chainId];
  
  if (isEther) {
    // Return native currency info
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

// Function to get claims from all networks factories with transaction hashes and proper token info
export async function getAllClaimsFromAllFactories(
  networks: Network[]
): Promise<{
  faucetAddress: string
  transactionType: string
  initiator: string
  amount: bigint
  isEther: boolean
  timestamp: number
  networkName: string
  chainId: number
  txHash: string | null
  tokenSymbol: string
  tokenDecimals: number
  tokenAddress?: string
}[]> {
  const allClaims: any[] = [];

  for (const network of networks) {
    try {
      console.log(`Fetching claims from factories on ${network.name}...`);
      
      // Create provider for this network
      const provider = new JsonRpcProvider(network.rpcUrl);
      
      const { transactions } = await getAllClaimsFromFactories(provider, network);
      
      // Add network info and fetch transaction hashes + token info
      const networkClaims = await Promise.all(
        transactions.map(async (claim) => {
          const txHash = await getTransactionHashFromFaucet(provider, claim, network);
          
          // Get token information - for factory claims we need to determine the token address
          let tokenInfo;
          if (claim.isEther) {
            tokenInfo = await getTokenInfo("", provider, network.chainId, true);
          } else {
            // For ERC20 tokens, we need to get the token address from the faucet contract
            try {
              const faucetContract = new Contract(claim.faucetAddress, FAUCET_ABI, provider);
              let tokenAddress;
              
              // Try different methods to get token address
              try {
                tokenAddress = await faucetContract.token();
              } catch {
                try {
                  tokenAddress = await faucetContract.tokenAddress();
                } catch {
                  // Fallback - use chain's native token address or zero address
                  const chainConfig = CHAIN_CONFIGS[network.chainId];
                  tokenAddress = chainConfig?.nativeTokenAddress || zeroAddress;
                }
              }
              
              tokenInfo = await getTokenInfo(tokenAddress, provider, network.chainId, false);
            } catch (error) {
              console.warn(`Error getting token info for faucet ${claim.faucetAddress}:`, error);
              tokenInfo = { symbol: "TOKEN", decimals: 18 };
            }
          }
          
          return {
            ...claim,
            networkName: network.name,
            chainId: network.chainId,
            txHash,
            tokenSymbol: tokenInfo.symbol,
            tokenDecimals: tokenInfo.decimals
          };
        })
      );
      
      allClaims.push(...networkClaims);
      console.log(`Added ${networkClaims.length} claims from ${network.name}`);
    } catch (error) {
      console.error(`Error fetching claims from ${network.name}:`, error);
    }
  }

  // Sort by timestamp (newest first)
  allClaims.sort((a, b) => b.timestamp - a.timestamp);

  console.log(`Total claims from all factory networks: ${allClaims.length}`);
  return allClaims;
}

// Improved function to get transaction hash from faucet contract
async function getTransactionHashFromFaucet(
  provider: JsonRpcProvider,
  claim: any,
  network: Network
): Promise<string | null> {
  try {
    const faucetContract = new Contract(claim.faucetAddress, FAUCET_ABI, provider);
    
    // Method 1: Try to get transaction hash from faucet contract directly
    try {
      // Check if faucet has a method to get transaction hashes
      const transactions = await faucetContract.getAllTransactions();
      
      // Find the matching transaction by comparing claim data
      const matchingTx = transactions.find((tx: any) => 
        tx.initiator.toLowerCase() === claim.initiator.toLowerCase() &&
        BigInt(tx.amount) === claim.amount &&
        Number(tx.timestamp) === claim.timestamp &&
        tx.transactionType === claim.transactionType
      );
      
      if (matchingTx && matchingTx.txHash) {
        return matchingTx.txHash;
      }
    } catch (error) {
      console.log(`Faucet ${claim.faucetAddress} doesn't have getAllTransactions method`);
    }
    
    // Method 2: Query recent events/logs from the faucet contract
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Search last 10k blocks
      
      // Get all logs for this faucet address
      const logs = await provider.getLogs({
        address: claim.faucetAddress,
        fromBlock,
        toBlock: 'latest'
      });
      
      // Find logs that match our claim timestamp (within reasonable range)
      const targetTime = claim.timestamp;
      const timeRange = 300; // 5 minutes tolerance
      
      for (const log of logs) {
        try {
          const block = await provider.getBlock(log.blockNumber);
          if (block && Math.abs(block.timestamp - targetTime) <= timeRange) {
            return log.transactionHash;
          }
        } catch (blockError) {
          continue; // Skip this log and try next
        }
      }
    } catch (error) {
      console.warn(`Error querying logs for faucet ${claim.faucetAddress}:`, error);
    }
    
    // Method 3: Search through recent blocks (last resort)
    try {
      const currentBlock = await provider.getBlockNumber();
      const blocksToSearch = Math.min(100, Math.ceil(600 / 12)); // Search ~10 minutes of blocks
      
      for (let i = 0; i < blocksToSearch; i++) {
        try {
          const blockNumber = currentBlock - i;
          const block = await provider.getBlock(blockNumber, true);
          
          if (!block || !block.transactions) continue;
          
          // Check block timestamp first to avoid unnecessary processing
          const timeDiff = Math.abs(block.timestamp - claim.timestamp);
          if (timeDiff > 300) continue; // Skip blocks too far from claim time
          
          for (const tx of block.transactions) {
            if (typeof tx === 'string') continue;
            
            // Check if transaction involves the faucet
            if (tx.to?.toLowerCase() === claim.faucetAddress.toLowerCase()) {
              return tx.hash;
            }
          }
        } catch (blockError) {
          console.warn(`Error checking block ${currentBlock - i}:`, blockError);
          continue;
        }
      }
    } catch (error) {
      console.warn(`Error searching blocks for faucet transaction:`, error);
    }
    
    // If no transaction hash found, return null instead of generating fake hash
    console.log(`No transaction hash found for claim from faucet ${claim.faucetAddress}`);
    return null;
    
  } catch (error) {
    console.warn(`Error getting transaction hash for claim:`, error);
    return null;
  }
}

// Helper function to get claims from factories for a single network
async function getAllClaimsFromFactories(
  provider: JsonRpcProvider,
  network: Network,
): Promise<{
  transactions: {
    faucetAddress: string
    transactionType: string
    initiator: string
    amount: bigint
    isEther: boolean
    timestamp: number
  }[]
  totalClaims: number
  claimsByFaucet: Record<string, number>
}> {
  try {
    let allClaims: any[] = [];

    // Iterate through all factory addresses to collect transactions
    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
        continue;
      }

      const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider);

      // Check if factory contract exists
      const code = await provider.getCode(factoryAddress);
      if (code === "0x") {
        console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`);
        continue;
      }

      // Use getAllTransactions from the ABI
      try {
        console.log(`Fetching transactions from factory ${factoryAddress}...`);
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

    // Map transactions to the expected format
    const mappedClaims = allClaims.map((tx: any) => ({
      faucetAddress: tx.faucetAddress as string,
      transactionType: tx.transactionType as string,
      initiator: tx.initiator as string,
      amount: BigInt(tx.amount),
      isEther: tx.isEther as boolean,
      timestamp: Number(tx.timestamp),
    }));

    // Calculate claims by faucet
    const claimsByFaucet: Record<string, number> = {};
    mappedClaims.forEach(claim => {
      const faucetAddress = claim.faucetAddress.toLowerCase();
      claimsByFaucet[faucetAddress] = (claimsByFaucet[faucetAddress] || 0) + 1;
    });

    const result = {
      transactions: mappedClaims,
      totalClaims: mappedClaims.length,
      claimsByFaucet
    };

    console.log(`Total claims fetched from ${network.name} factories: ${result.totalClaims}`);
    return result;
  } catch (error: any) {
    console.error(`Error fetching claims from factories on ${network.name}:`, error);
    throw new Error(error.message || "Failed to fetch claims from factories");
  }
}

export function FaucetList() {
  const { networks } = useNetwork();
  const { toast } = useToast();
  
  // Define the claim type based on what getAllClaimsForAllNetworks returns
  type ClaimType = {
    claimer: string;
    faucet: string;
    amount: bigint;
    txHash: `0x${string}` | null;
    networkName: string;
    timestamp: number;
    chainId: number | bigint; // Handle both types
    tokenSymbol: string;
    tokenDecimals: number;
    isEther: boolean;
  };

  const [claims, setClaims] = useState<ClaimType[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [faucetNames, setFaucetNames] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);
  
  // Dynamic claims per page based on screen size
  const claimsPerPage = isMobile ? 5 : 10;

  useEffect(() => {
    // Check if screen is mobile size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint in Tailwind
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadClaims = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoadingClaims(true);
    }
    
    try {
      console.log("Loading claims from both storage and factory sources...");
      
      // Fetch claims from storage (existing method) - enhance with proper token symbols
      const storageClaims = await getAllClaimsForAllNetworks(networks);
      console.log("Fetched storage claims:", storageClaims.length);
      
      // Enhance storage claims with proper token symbols
      const enhancedStorageClaims = await Promise.all(
        storageClaims.map(async (claim) => {
          const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
          const network = networks.find(n => n.chainId === chainId);
          
          if (network && (!claim.tokenSymbol || claim.tokenSymbol === 'TOKEN')) {
            try {
              const provider = new JsonRpcProvider(network.rpcUrl);
              
              // If we have token address info, get proper symbol
              if (claim.isEther) {
                const tokenInfo = await getTokenInfo("", provider, chainId, true);
                return {
                  ...claim,
                  tokenSymbol: tokenInfo.symbol,
                  tokenDecimals: tokenInfo.decimals
                };
              } else {
                // For ERC20 tokens from storage, try to get token address from faucet
                try {
                  const faucetContract = new Contract(claim.faucet, FAUCET_ABI, provider);
                  let tokenAddress;
                  
                  try {
                    tokenAddress = await faucetContract.token();
                  } catch {
                    try {
                      tokenAddress = await faucetContract.tokenAddress();
                    } catch {
                      // Keep existing token info if we can't get address
                      return claim;
                    }
                  }
                  
                  const tokenInfo = await getTokenInfo(tokenAddress, provider, chainId, false);
                  return {
                    ...claim,
                    tokenSymbol: tokenInfo.symbol,
                    tokenDecimals: tokenInfo.decimals
                  };
                } catch {
                  return claim; // Keep original if enhanced fetch fails
                }
              }
            } catch {
              return claim; // Keep original if network not found or other error
            }
          }
          
          return claim;
        })
      );
      
      // Fetch claims from factories (new method with proper token symbols)  
      const factoryClaims = await getAllClaimsFromAllFactories(networks);
      console.log("Fetched factory claims:", factoryClaims.length);
      
      // Convert factory claims to match ClaimType format
      const convertedFactoryClaims: ClaimType[] = factoryClaims.map(claim => ({
        claimer: claim.initiator,
        faucet: claim.faucetAddress,
        amount: claim.amount,
        txHash: claim.txHash as `0x${string}` | null,
        networkName: claim.networkName,
        timestamp: claim.timestamp,
        chainId: claim.chainId,
        tokenSymbol: claim.tokenSymbol,
        tokenDecimals: claim.tokenDecimals,
        isEther: claim.isEther,
      }));
      
      // Combine both sources
      const allClaims = [...enhancedStorageClaims, ...convertedFactoryClaims];
      
      // Sort by timestamp (newest first)
      allClaims.sort((a, b) => b.timestamp - a.timestamp);
      
      setClaims(allClaims);
      setPage(1);
      
      // Fetch faucet names for all unique faucet addresses
      await fetchFaucetNames(allClaims);
      
      console.log("Total pages:", Math.ceil(allClaims.length / claimsPerPage));
      console.log(`Total claims: ${allClaims.length}`);
      
      if (isRefresh) {
        toast({
          title: "Drops refreshed",
          description: `Loaded ${allClaims.length} total drops`,
        });
      }
    } catch (error) {
      console.error("Error loading drops:", error);
      toast({
        title: "Failed to load drops",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingClaims(false);
      setRefreshing(false);
    }
  };

  const fetchFaucetNames = async (claimsData: ClaimType[]) => {
    const faucetAddresses = [...new Set(claimsData.map(claim => claim.faucet))];
    console.log(`Fetching names for ${faucetAddresses.length} unique faucets...`);
    
    const namePromises = faucetAddresses.map(async (faucetAddress) => {
      try {
        // Find the network for this faucet from the claims
        const claim = claimsData.find(c => c.faucet === faucetAddress);
        if (!claim) return null;
        
        // Convert chainId to number for comparison
        const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
        const network = networks.find(n => n.chainId === chainId);
        if (!network) return null;
        
        // Create provider using JsonRpcProvider
        const provider = new JsonRpcProvider(network.rpcUrl);
        
        // Create contract instance for the FAUCET itself, not the factory
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider);
        
        // Try different common name methods
        let faucetName: string;
        try {
          // Try the most common method first
          faucetName = await faucetContract.name();
        } catch (error) {
          try {
            faucetName = await faucetContract.getName();
          } catch (error2) {
            try {
              faucetName = await faucetContract.faucetName();
            } catch (error3) {
              console.log(`No name method found for faucet ${faucetAddress} on ${network.name}`);
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
    const nameMap: Record<string, string> = {};
    
    results.forEach(result => {
      if (result && result.name) {
        nameMap[result.address] = result.name;
      }
    });
    
    setFaucetNames(nameMap);
    console.log(`Successfully fetched ${Object.keys(nameMap).length} faucet names`);
  };

  useEffect(() => {
    if (networks.length > 0) {
      loadClaims();
    }
  }, [networks, toast]);

  // Recalculate pagination when mobile state changes
  useEffect(() => {
    setPage(1); // Reset to first page when switching between mobile/desktop
  }, [isMobile]);

  const handleRefresh = () => {
    loadClaims(true);
  };

  const totalPages = Math.ceil(claims.length / claimsPerPage);
  const paginatedClaims = claims.slice((page - 1) * claimsPerPage, page * claimsPerPage);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg sm:text-xl">Recent Drops</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loadingClaims || refreshing}
              className="flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm"
            >
              {isExpanded ? (
                <>
                  Collapse
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  View Drops
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
        {isExpanded && claims.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Total: {claims.length} drops
          </div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {loadingClaims ? (
            <div className="flex justify-center items-center py-10 sm:py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sm sm:text-base">Loading drops from all sources...</p>
              </div>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Coins className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-medium mb-2">No Drops Found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                No drops have been recorded across any network yet.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block sm:hidden space-y-3">
                {paginatedClaims.map((claim, index) => {
                  const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
                  const network = networks.find((n) => n.chainId === chainId);
                  const displayName = faucetNames[claim.faucet] || `Faucet ${claim.faucet.slice(0, 6)}...${claim.faucet.slice(-4)}`;
                  return (
                    <Card key={`${claim.txHash || claim.faucet}-${index}`} className="p-3">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Dropee:</span>
                          <span className="font-mono text-right break-all max-w-[150px]">
                            {claim.claimer.slice(0, 6)}...{claim.claimer.slice(-4)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Faucet:</span>
                          <Link
                            href={`/faucet/${claim.faucet}?networkId=${chainId}`}
                            className="text-blue-600 hover:underline text-right max-w-[150px] truncate"
                          >
                            {displayName}
                          </Link>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">
                            {Number(formatUnits(claim.amount, claim.tokenDecimals)).toFixed(4)} {claim.tokenSymbol}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Tx:</span>
                          {claim.txHash ? (
                            <a
                              href={`${network?.blockExplorer || "#"}/tx/${claim.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-mono"
                            >
                              {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                            </a>
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">
                              <i>loading...</i>
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Network:</span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {claim.networkName}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Time:</span>
                          <span className="text-right">
                            {new Date(claim.timestamp * 1000).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Dropee</TableHead>
                      <TableHead className="text-xs sm:text-sm">Faucet</TableHead>
                      <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                      <TableHead className="text-xs sm:text-sm">Tx Hash</TableHead>
                      <TableHead className="text-xs sm:text-sm">Network</TableHead>
                      <TableHead className="text-xs sm:text-sm">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClaims.map((claim, index) => {
                      const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
                      const network = networks.find((n) => n.chainId === chainId);
                      const displayName = faucetNames[claim.faucet] || `Faucet ${claim.faucet.slice(0, 6)}...${claim.faucet.slice(-4)}`;
                      return (
                        <TableRow key={`${claim.txHash || claim.faucet}-${index}`}>
                          <TableCell className="text-xs sm:text-sm font-mono">
                            <div className="max-w-[120px] truncate" title={claim.claimer}>
                              {claim.claimer}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <Link
                              href={`/faucet/${claim.faucet}?networkId=${chainId}`}
                              className="text-blue-600 hover:underline max-w-[120px] truncate block"
                              title={displayName}
                            >
                              {displayName}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {Number(formatUnits(claim.amount, claim.tokenDecimals)).toFixed(4)} {claim.tokenSymbol}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm font-mono">
                            {claim.txHash ? (
                              <a
                                href={`${network?.blockExplorer || "#"}/tx/${claim.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                                title={claim.txHash}
                              >
                                {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                              </a>
                            ) : (
                              <span className="text-muted-foreground"><i>loading...</i></span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
                              {claim.networkName}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {new Date(claim.timestamp * 1000).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Showing {(page - 1) * claimsPerPage + 1} to {Math.min(page * claimsPerPage, claims.length)} of{" "}
                    {claims.length} drops
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || loadingClaims || refreshing}
                      className="text-xs sm:text-sm hover:bg-primary/10"
                      aria-label="Previous page"
                    >
                      Previous
                    </Button>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || loadingClaims || refreshing}
                      className="text-xs sm:text-sm hover:bg-primary/10"
                      aria-label="Next page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}