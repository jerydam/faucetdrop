import { useEffect, useState, useCallback } from "react"
import { useNetwork } from '../../../../V2/hooks/use-network'
import { Loader2, Activity, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface TransactionData {
  faucetAddress: string;
  transactionType: string;
  initiator: string;
  amount: bigint;
  isEther: boolean;
  timestamp: number;
  networkName: string;
  chainId: number;
  txHash?: string;
  blockNumber?: number;
}

interface NetworkStats {
  name: string;
  chainId: number;
  totalTransactions: number;
  color: string;
  factoryAddresses: string[];
  rpcUrl: string;
}

interface ChartDataPoint {
  date: string;
  [network: string]: number | string;
}

export function TransactionsPerDayChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { networks } = useNetwork();

  const processTransactionData = useCallback((transactions: TransactionData[]): ChartDataPoint[] => {
    // Group transactions by date and network
    const transactionsByDate: Record<string, Record<string, number>> = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.timestamp);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const network = tx.networkName;
      
      if (!transactionsByDate[dateKey]) {
        transactionsByDate[dateKey] = {};
      }
      
      if (!transactionsByDate[dateKey][network]) {
        transactionsByDate[dateKey][network] = 0;
      }
      
      transactionsByDate[dateKey][network]++;
    });
    
    // Convert to array format for the chart
    return Object.entries(transactionsByDate)
      .map(([date, networkCounts]) => ({
        date,
        ...networkCounts,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);

  const fetchTransactionData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get all transactions from the analytics service
      const {
        allTransactions: fetchedTransactions,
        networkStats: fetchedStats,
        totalTransactions: total
      } = await getAllTransactionsFromAllNetworks(networks);

      // Process the data for the chart
      const processedData = processTransactionData(fetchedTransactions);
      
      setChartData(processedData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching transaction data:', err);
      setError('Failed to load transaction data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [networks, processTransactionData]);

  // Initial data fetch
  useEffect(() => {
    fetchTransactionData();
  }, [fetchTransactionData]);

  // Get unique network names for the legend
  const networkNames = networks.map(network => network.name);

  // Generate colors for networks
  const networkColors = networks.reduce((colors, network, index) => {
    colors[network.name] = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    return colors;
  }, {});

  const handleRefresh = () => {
    fetchTransactionData();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading transaction data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
        <Activity className="w-8 h-8 text-destructive mb-2" />
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
        <Activity className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No transaction data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Daily Transactions</h3>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                
                return (
                  <div className="bg-background border rounded-md p-4 shadow-lg">
                    <p className="font-medium mb-2">
                      {new Date(label).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    {payload
                      .sort((a, b) => (b.value as number) - (a.value as number))
                      .map((entry, index) => (
                        <div key={`tooltip-${index}`} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm">{entry.name}:</span>
                          </div>
                          <span className="font-medium">{entry.value}</span>
                        </div>
                      ))}
                  </div>
                );
              }}
            />
            <Legend />
            {networkNames.map((network, index) => (
              <Area
                key={network}
                type="monotone"
                dataKey={network}
                stackId="1"
                stroke={networkColors[network]}
                fill={networkColors[network]}
                fillOpacity={0.8}
                name={network}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
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