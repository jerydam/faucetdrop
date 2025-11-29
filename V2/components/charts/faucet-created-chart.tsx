"use client"
import { useEffect, useState, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { JsonRpcProvider } from 'ethers'; 
import { Loader2, RefreshCw } from "lucide-react" 
import { useNetwork } from "@/hooks/use-network" 
import { getFaucetsForNetwork } from "@/lib/faucet"
import { DataService, FaucetData } from "@/lib/database-helpers"

// NOTE: Placeholder type for Network
interface Network {
  name: string;
  rpcUrl: string; 
  factoryAddresses: string[];
}

// NOTE: Assuming this is imported from a UI library like Shadcn/UI
import { Button } from "@/components/ui/button" 

// Cache keys for faucet data
const FAUCET_STORAGE_KEYS = {
  CHART_DATA: 'faucet_chart_data',
  LAST_UPDATED: 'faucet_last_updated',
  TOTAL_FAUCETS: 'faucet_total_count'
};

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Helper functions for localStorage
function saveToLocalStorage(key: string, data: any) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

function loadFromLocalStorage<T>(key: string): T | null {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
    return null;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return null;
  }
}

function isCacheValid(): boolean {
  const lastUpdated = loadFromLocalStorage<number>(FAUCET_STORAGE_KEYS.LAST_UPDATED);
  return lastUpdated ? Date.now() - lastUpdated < CACHE_DURATION : false;
}

interface ChartData {
  network: string
  faucets: number
}

export function FaucetsCreatedChart() {
  const { networks } = useNetwork() 
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false) 
  const [totalFaucets, setTotalFaucets] = useState(0)

  // Memoize the function with useCallback
  const fetchAndStoreFaucetData = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh) {
      setLoading(true);
    } else {
      setIsRefreshing(true); 
    }
    
    try {
      const chartData: ChartData[] = []
      await Promise.all(
        networks.map(async (network) => {
          if (!network.rpcUrl) {
            chartData.push({ network: network.name, faucets: 0 });
            return;
          }
          
          const provider = new JsonRpcProvider(network.rpcUrl);

          try {
            const faucets = await getFaucetsForNetwork(network, provider)
            const sortedFaucets = faucets.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
            
            chartData.push({
              network: network.name,
              faucets: sortedFaucets.length,
            })
          } catch (error) {
            chartData.push({
              network: network.name,
              faucets: 0,
            })
          }
        })
      )
      
      const validChartData = chartData.filter(item => item.network);
      const total = validChartData.reduce((sum, item) => sum + item.faucets, 0)
      
      saveToLocalStorage(FAUCET_STORAGE_KEYS.CHART_DATA, validChartData)
      saveToLocalStorage(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS, total)
      saveToLocalStorage(FAUCET_STORAGE_KEYS.LAST_UPDATED, Date.now())

      const supabaseData: Omit<FaucetData, 'id' | 'updated_at'>[] = validChartData.map(item => ({
        network: item.network,
        faucets: item.faucets
      }))
      await DataService.saveFaucetData(supabaseData)

      setData(validChartData)
      setTotalFaucets(total)
      
    } catch (error) {
      console.error("Error fetching faucet data:", error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [networks]) 

  const loadStoredData = async () => {
    // ... (logic remains the same)
    if (isCacheValid()) {
      const cachedData = loadFromLocalStorage<ChartData[]>(FAUCET_STORAGE_KEYS.CHART_DATA);
      const cachedTotal = loadFromLocalStorage<number>(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS);
      if (cachedData && cachedTotal !== null) {
        setData(cachedData);
        setTotalFaucets(cachedTotal);
        setLoading(false);
        return true;
      }
    }

    try {
      const supabaseData = await DataService.loadFaucetData();
      if (supabaseData.length > 0 && DataService.isDataFresh(supabaseData[0].updated_at)) {
        const chartData = supabaseData.map(item => ({
          network: item.network,
          faucets: item.faucets
        }));
        const total = chartData.reduce((sum, item) => sum + item.faucets, 0);
        
        setData(chartData);
        setTotalFaucets(total);
        
        saveToLocalStorage(FAUCET_STORAGE_KEYS.CHART_DATA, chartData);
        saveToLocalStorage(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS, total);
        saveToLocalStorage(FAUCET_STORAGE_KEYS.LAST_UPDATED, Date.now());
        
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    }

    return false;
  }

  // Initial load effect
  useEffect(() => {
    if (networks.length > 0) {
      loadStoredData().then((dataLoaded) => {
        if (!dataLoaded) {
          fetchAndStoreFaucetData();
        }
      });
    }
  }, [networks, fetchAndStoreFaucetData]) 

  // Auto-refresh effect
  useEffect(() => {
    if (networks.length === 0) return;
    
    const interval = setInterval(() => {
      fetchAndStoreFaucetData(false); 
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [networks, fetchAndStoreFaucetData]);

  if (loading && totalFaucets === 0) { 
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  const handleRefresh = () => {
    if (!isRefreshing) {
      fetchAndStoreFaucetData(true); 
    }
  }

  return (
    <div className="space-y-4 relative p-4 border rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        {/* Title/Metric Section */}
        <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Faucet Distribution</h3>
            <p className="text-xs text-muted-foreground">Across all supported networks</p>
        </div>
        
        {/* Total Faucets and Refresh Button */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{totalFaucets}</p>
            <p className="text-xs text-muted-foreground">Total Faucets</p>
          </div>

          {/* 🌟 STYLED REFRESH BUTTON 🌟 */}
          <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing} 
            variant="ghost" // Use ghost for a cleaner look that doesn't dominate
            size="icon"
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
            title="Refresh Faucet Data"
          >
            <RefreshCw 
              className={isRefreshing ? "h-5 w-5 animate-spin text-blue-500" : "h-5 w-5 text-gray-500 hover:text-blue-500"} 
            />
          </Button>
        </div>
      </div>
      
      <div className="pt-4">
        {/* Overlay loading indicator for manual refresh, ensuring it covers the chart area */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-10 rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="network" tickLine={false} axisLine={false} style={{ fontSize: '10px' }} />
            <YAxis style={{ fontSize: '10px' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc', borderRadius: '4px' }}
              labelStyle={{ fontWeight: 'bold', color: '#0052FF' }}
            />
            <Bar 
              dataKey="faucets" 
              fill="#0052FF" 
              radius={[4, 4, 0, 0]} // Rounded corners on the bars
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}