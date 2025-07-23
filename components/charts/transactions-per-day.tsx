"use client"

import { useEffect, useState } from "react"
import { Contract, JsonRpcProvider, isAddress } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { FACTORY_ABI } from "@/lib/abis"
import { Loader2, Activity, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NetworkStats {
  name: string
  chainId: number
  totalTransactions: number
  color: string
  factoryAddresses: string[]
  rpcUrl: string
}

interface TransactionData {
  faucetAddress: string
  transactionType: string
  initiator: string
  amount: bigint
  isEther: boolean
  timestamp: number
  networkName: string
  chainId: number
}

// Network colors for consistent theming
const NETWORK_COLORS: Record<string, string> = {
  "Celo": "#35D07F",
  "Lisk": "#0D4477", 
  "Base": "#0052FF",
  "Arbitrum": "#28A0F0",
  "Ethereum": "#627EEA",
  "Polygon": "#8247E5",
  "Optimism": "#FF0420",
  "default": "#6B7280"
}

// Function to get all transactions from a single network's factories
async function getAllTransactionsFromNetwork(
  provider: JsonRpcProvider,
  network: any
): Promise<{
  transactions: TransactionData[]
  totalTransactions: number
}> {
  try {
    let allTransactions: any[] = [];

    // Iterate through all factory addresses for this network
    if (network.factoryAddresses && network.factoryAddresses.length > 0) {
      for (const factoryAddress of network.factoryAddresses) {
        if (!isAddress(factoryAddress)) {
          console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
          continue;
        }

        // Check if contract exists at this address
        const code = await provider.getCode(factoryAddress);
        if (code === "0x") {
          console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`);
          continue;
        }

        const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider);

        try {
          console.log(`Fetching transactions from factory ${factoryAddress} on ${network.name}...`);
          
          // Try different methods to get transactions
          let transactions;
          try {
            transactions = await factoryContract.getAllTransactions();
          } catch (error) {
            // Fallback: try getTotalTransactions if getAllTransactions doesn't exist
            try {
              const totalCount = await factoryContract.getTotalTransactions();
              console.log(`Factory ${factoryAddress} has ${totalCount} total transactions (count only)`);
              // Create placeholder transactions for count
              transactions = Array(Number(totalCount)).fill(null).map((_, index) => ({
                faucetAddress: factoryAddress,
                transactionType: "unknown",
                initiator: "0x0000000000000000000000000000000000000000",
                amount: BigInt(0),
                isEther: false,
                timestamp: Math.floor(Date.now() / 1000) - index * 60 // Spread over time
              }));
            } catch (fallbackError) {
              console.warn(`No transaction methods available for factory ${factoryAddress}:`, fallbackError);
              continue;
            }
          }
          
          console.log(`Found ${transactions.length} transactions from factory ${factoryAddress}`);
          allTransactions.push(...transactions);
        } catch (error) {
          console.warn(`Error fetching transactions from factory ${factoryAddress}:`, error);
        }
      }
    } else {
      console.log(`No factory addresses configured for ${network.name}`);
    }

    // Map transactions to the expected format
    const mappedTransactions: TransactionData[] = allTransactions.map((tx: any) => ({
      faucetAddress: tx.faucetAddress || "unknown",
      transactionType: tx.transactionType || "unknown",
      initiator: tx.initiator || "0x0000000000000000000000000000000000000000",
      amount: typeof tx.amount === 'bigint' ? tx.amount : BigInt(tx.amount || 0),
      isEther: tx.isEther || false,
      timestamp: Number(tx.timestamp) || Math.floor(Date.now() / 1000),
      networkName: network.name,
      chainId: network.chainId
    }));

    const result = {
      transactions: mappedTransactions,
      totalTransactions: mappedTransactions.length
    };

    console.log(`Total transactions fetched from ${network.name}: ${result.totalTransactions}`);
    return result;
  } catch (error: any) {
    console.error(`Error fetching transactions from ${network.name}:`, error);
    return {
      transactions: [],
      totalTransactions: 0
    };
  }
}

// Function to get all transactions from all networks
async function getAllTransactionsFromAllNetworks(networks: any[]): Promise<{
  allTransactions: TransactionData[]
  networkStats: NetworkStats[]
  totalTransactions: number
}> {
  const allTransactions: TransactionData[] = [];
  const networkStats: NetworkStats[] = [];
  let totalTransactions = 0;

  for (const network of networks) {
    try {
      console.log(`Fetching transactions from ${network.name}...`);
      
      const provider = new JsonRpcProvider(network.rpcUrl);
      const { transactions, totalTransactions: networkTotal } = await getAllTransactionsFromNetwork(provider, network);
      
      allTransactions.push(...transactions);
      totalTransactions += networkTotal;
      
      networkStats.push({
        name: network.name,
        chainId: network.chainId,
        totalTransactions: networkTotal,
        color: NETWORK_COLORS[network.name] || NETWORK_COLORS.default,
        factoryAddresses: network.factoryAddresses || [],
        rpcUrl: network.rpcUrl
      });
      
      console.log(`Added ${networkTotal} transactions from ${network.name}`);
    } catch (error) {
      console.error(`Error processing ${network.name}:`, error);
      
      // Add network with zero transactions even if there was an error
      networkStats.push({
        name: network.name,
        chainId: network.chainId,
        totalTransactions: 0,
        color: NETWORK_COLORS[network.name] || NETWORK_COLORS.default,
        factoryAddresses: network.factoryAddresses || [],
        rpcUrl: network.rpcUrl
      });
    }
  }

  // Sort by transaction count (highest first)
  networkStats.sort((a, b) => b.totalTransactions - a.totalTransactions);

  return {
    allTransactions,
    networkStats,
    totalTransactions
  };
}

export function TransactionsPerDayChart() {
  const { networks } = useNetwork()
  const [networkStats, setNetworkStats] = useState<NetworkStats[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([])

  const fetchTransactions = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      console.log("Fetching transactions from all networks...");
      
      const {
        allTransactions: fetchedTransactions,
        networkStats: fetchedStats,
        totalTransactions: total
      } = await getAllTransactionsFromAllNetworks(networks);

      setAllTransactions(fetchedTransactions);
      setNetworkStats(fetchedStats);
      setTotalTransactions(total);
      
      console.log(`Total transactions across all networks: ${total}`);
      console.log("Network breakdown:", fetchedStats.map(s => `${s.name}: ${s.totalTransactions}`).join(", "));
      
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (networks.length > 0) {
      fetchTransactions();
    }
  }, [networks]);

  const handleRefresh = () => {
    fetchTransactions(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading transactions from all networks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with total and refresh */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <p className="text-4xl font-bold text-primary">{totalTransactions.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            Total transactions across all networks
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Network breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {networkStats.map((network) => (
          <div
            key={`${network.name}-${network.chainId}`}
            className="p-4 rounded-lg border bg-card hover:shadow-lg transition-shadow"
            style={{ borderLeftColor: network.color, borderLeftWidth: "4px" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" style={{ color: network.color }} />
                <div>
                  <h3 className="font-semibold">{network.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {network.factoryAddresses.length} factories
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{network.totalTransactions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">transactions</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: network.color,
                    width: `${totalTransactions > 0 ? (network.totalTransactions / totalTransactions) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {totalTransactions > 0 ? ((network.totalTransactions / totalTransactions) * 100).toFixed(1) : 0}% of total
                </p>
                <p className="text-xs text-muted-foreground">
                  Chain ID: {network.chainId}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

     

      {/* Empty state */}
      {totalTransactions === 0 && !loading && (
        <div className="text-center py-12">
          <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
          <p className="text-muted-foreground mb-4">
            No transactions have been recorded across any network yet.
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}