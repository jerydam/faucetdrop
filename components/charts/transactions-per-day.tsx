"use client"

import { useEffect, useState, useCallback } from "react"
import { Contract, JsonRpcProvider, isAddress } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { FACTORY_ABI } from "@/lib/abis"
import { Loader2, Activity, RefreshCw, History, Download, Upload } from "lucide-react"
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
  txHash?: string
  blockNumber?: number
}

interface StoredTransactionHistory {
  timestamp: number
  networkStats: NetworkStats[]
  totalTransactions: number
  allTransactions: TransactionData[]
  fetchedAt: string
}

interface TransactionStorage {
  history: StoredTransactionHistory[]
  lastUpdated: number
  version: string
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
  const [refreshing, setRefreshing] = useState(false)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([])
  
  // Storage state
  const [transactionStorage, setTransactionStorage] = useState<TransactionStorage>({
    history: [],
    lastUpdated: 0,
    version: "1.0.0"
  })
  const [showHistory, setShowHistory] = useState(false)

  // Storage functions
  const saveToStorage = useCallback((
    networkStats: NetworkStats[], 
    totalTransactions: number, 
    allTransactions: TransactionData[]
  ) => {
    const newEntry: StoredTransactionHistory = {
      timestamp: Date.now(),
      networkStats,
      totalTransactions,
      allTransactions,
      fetchedAt: new Date().toISOString()
    }

    setTransactionStorage(prev => {
      const newHistory = [...prev.history, newEntry]
      // Keep only last 50 entries to prevent memory issues
      const trimmedHistory = newHistory.slice(-50)
      
      return {
        ...prev,
        history: trimmedHistory,
        lastUpdated: Date.now()
      }
    })
  }, [])

  const loadFromHistory = useCallback((entry: StoredTransactionHistory) => {
    setNetworkStats(entry.networkStats)
    setTotalTransactions(entry.totalTransactions)
    setAllTransactions(entry.allTransactions)
  }, [])

  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(transactionStorage, (key, value) => {
      // Convert BigInt to string for JSON serialization
      if (typeof value === 'bigint') {
        return value.toString()
      }
      return value
    }, 2)
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transaction-history-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [transactionStorage])

  const importData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        // Convert string amounts back to BigInt
        const processedData = {
          ...importedData,
          history: importedData.history.map((entry: any) => ({
            ...entry,
            allTransactions: entry.allTransactions.map((tx: any) => ({
              ...tx,
              amount: BigInt(tx.amount)
            }))
          }))
        }
        setTransactionStorage(processedData)
        console.log('Transaction history imported successfully')
      } catch (error) {
        console.error('Error importing transaction history:', error)
      }
    }
    reader.readAsText(file)
  }, [])

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
      
      // Save to storage
      saveToStorage(fetchedStats, total, fetchedTransactions);
      
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
      {/* Header with total and controls */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <p className="text-4xl font-bold text-primary">{totalTransactions.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            Total transactions across all networks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            History ({transactionStorage.history.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('import-file')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={importData}
            className="hidden"
          />
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
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
          {transactionStorage.history.length === 0 ? (
            <p className="text-muted-foreground">No historical data available</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {transactionStorage.history.slice().reverse().map((entry, index) => (
                <div
                  key={entry.timestamp}
                  className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50"
                  onClick={() => loadFromHistory(entry)}
                >
                  <div>
                    <p className="font-medium">{entry.totalTransactions.toLocaleString()} transactions</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {entry.networkStats.filter(s => s.totalTransactions > 0).length} networks active
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Storage info */}
      {transactionStorage.history.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date(transactionStorage.lastUpdated).toLocaleString()} • 
          {transactionStorage.history.length} snapshots stored
        </div>
      )}

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