"use client"

import { useEffect, useState, useCallback } from "react"
import { Contract, JsonRpcProvider, isAddress } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { FACTORY_ABI } from "@/lib/abis"
import { Loader2, Activity, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBackgroundSync } from "@/hooks/use-background-sync"
import { 
  saveToDatabase, 
  loadFromDatabase, 
  isCacheValid,
  clearExpiredCache 
} from "@/lib/database-helpers"

// Database keys for transaction data
const TRANSACTION_STORAGE_KEYS = {
  NETWORK_STATS: 'transaction_network_stats',
  ALL_TRANSACTIONS: 'transaction_all_transactions',
  TOTAL_TRANSACTIONS: 'transaction_total_count'
};

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
  txHash?: string
  blockNumber?: number
}

async function getAllTransactionsFromNetwork(
  provider: JsonRpcProvider,
  network: any
): Promise<{
  transactions: TransactionData[]
  totalTransactions: number
}> {
  try {
    let allTransactions: any[] = [];

    if (network.factoryAddresses && network.factoryAddresses.length > 0) {
      for (const factoryAddress of network.factoryAddresses) {
        if (!isAddress(factoryAddress)) {
          console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
          continue;
        }

        const code = await provider.getCode(factoryAddress);
        if (code === "0x") {
          console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`);
          continue;
        }

        const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider);

        try {
          console.log(`Fetching transactions from factory ${factoryAddress} on ${network.name}...`);
          
          let transactions;
          try {
            transactions = await factoryContract.getAllTransactions();
          } catch (error) {
            try {
              const totalCount = await factoryContract.getTotalTransactions();
              console.log(`Factory ${factoryAddress} has ${totalCount} total transactions (count only)`);
              transactions = Array(Number(totalCount)).fill(null).map((_, index) => ({
                faucetAddress: factoryAddress,
                transactionType: "unknown",
                initiator: "0x0000000000000000000000000000000000000000",
                amount: BigInt(0),
                isEther: false,
                timestamp: Math.floor(Date.now() / 1000) - index * 60
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

    const mappedTransactions: TransactionData[] = allTransactions.map((tx: any) => ({
      faucetAddress: tx.faucetAddress || "unknown",
      transactionType: tx.transactionType || "unknown",
      initiator: tx.initiator || "0x0000000000000000000000000000000000000000",
      amount: typeof tx.amount === 'bigint' ? tx.amount : BigInt(tx.amount || 0),
      isEther: tx.isEther || false,
      timestamp: Number(tx.timestamp) || Math.floor(Date.now() / 1000),
      networkName: network.name,
      chainId: network.chainId,
      txHash: tx.txHash,
      blockNumber: tx.blockNumber
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
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Background sync setup
  const backgroundSync = useBackgroundSync({
    syncKey: 'transaction_data',
    fetchFunction: fetchTransactions,
    interval: 5 * 60 * 1000,
    onSuccess: (data) => {
      console.log('Transaction background sync completed')
      setLastUpdated(new Date())
    },
    onError: (error) => {
      console.error('Transaction background sync failed:', error)
    }
  })

  // Load cached data immediately on mount
  useEffect(() => {
    loadCachedData()
    clearExpiredCache()
  }, [])

  // Start background sync when networks are available
  useEffect(() => {
    if (networks.length > 0) {
      loadDataIfNeeded()
      backgroundSync.startSync()
    }
    
    return () => {
      backgroundSync.stopSync()
    }
  }, [networks, backgroundSync])

  const loadCachedData = async () => {
    try {
      const [cachedNetworkStats, cachedAllTransactions, cachedTotal] = await Promise.all([
        loadFromDatabase<NetworkStats[]>(TRANSACTION_STORAGE_KEYS.NETWORK_STATS),
        loadFromDatabase<TransactionData[]>(TRANSACTION_STORAGE_KEYS.ALL_TRANSACTIONS),
        loadFromDatabase<number>(TRANSACTION_STORAGE_KEYS.TOTAL_TRANSACTIONS)
      ])
      
      if (cachedNetworkStats && cachedAllTransactions && cachedTotal !== null) {
        console.log('Loading cached transaction data from database')
        setNetworkStats(cachedNetworkStats)
        setAllTransactions(cachedAllTransactions)
        setTotalTransactions(cachedTotal)
        setLoading(false)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.warn('Failed to load cached transaction data:', error)
    }
  }

  const loadDataIfNeeded = async () => {
    const isValid = await isCacheValid(TRANSACTION_STORAGE_KEYS.NETWORK_STATS)
    if (!isValid) {
      console.log('Transaction cache invalid or expired, fetching fresh data')
      await fetchTransactions()
    }
  }

  async function fetchTransactions(): Promise<any> {
    try {
      console.log("Fetching transactions from all networks...");
      
      const {
        allTransactions: fetchedTransactions,
        networkStats: fetchedStats,
        totalTransactions: total
      } = await getAllTransactionsFromAllNetworks(networks);

      // Save to database
      await Promise.all([
        saveToDatabase(TRANSACTION_STORAGE_KEYS.NETWORK_STATS, fetchedStats),
        saveToDatabase(TRANSACTION_STORAGE_KEYS.ALL_TRANSACTIONS, fetchedTransactions),
        saveToDatabase(TRANSACTION_STORAGE_KEYS.TOTAL_TRANSACTIONS, total)
      ])

      setAllTransactions(fetchedTransactions);
      setNetworkStats(fetchedStats);
      setTotalTransactions(total);
      
      console.log(`Total transactions across all networks: ${total}`);
      console.log("Network breakdown:", fetchedStats.map(s => `${s.name}: ${s.totalTransactions}`).join(", "));
      
      return { fetchedTransactions, fetchedStats, total }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error
    }
  }

  const handleManualRefresh = async () => {
    setLoading(true)
    try {
      await fetchTransactions()
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Manual refresh failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && networkStats.length === 0) {
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
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <p className="text-4xl font-bold text-primary">{totalTransactions.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            Total transactions across all networks
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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

      {totalTransactions === 0 && !loading && (
        <div className="text-center py-12">
          <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
          <p className="text-muted-foreground mb-4">
            No transactions have been recorded across any network yet.
          </p>
          <Button onClick={handleManualRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}