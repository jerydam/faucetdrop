"use client"
import { useEffect, useState, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

// NOTE: You must install 'ethers' (e.g., npm install ethers)
// This is the common import for a provider in ethers.js v6
import { JsonRpcProvider, Contract } from 'ethers'; 

// NOTE: You must provide your own Network type definition, 
// ensuring it includes a name and an RPC URL.
// Placeholder type to make the code compile:
interface Network {
  name: string;
  rpcUrl: string; // Critical: Assumed property containing the RPC endpoint
  factoryAddresses: string[];
  // ... other Network properties
}

// NOTE: Replace these with your actual imports/implementations
import { useNetwork } from "@/hooks/use-network" 
import { getFaucetsForNetwork } from "@/lib/faucet"
import { DataService, FaucetData } from "@/lib/database-helpers"
import { Button } from "@/components/ui/button" // Assuming a button component (e.g., Shadcn/UI)

// Icons
import { Loader2, RefreshCw } from "lucide-react" 

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
  // Assuming useNetwork returns an array of networks that match the Network interface
  const { networks } = useNetwork() 
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false) // New state for manual refresh
  const [totalFaucets, setTotalFaucets] = useState(0)

  // Memoize the function with useCallback
  const fetchAndStoreFaucetData = useCallback(async (isManualRefresh = false) => {
    // Only show full loader if it's the initial load
    if (!isManualRefresh) {
      setLoading(true);
    } else {
      setIsRefreshing(true); // Show refreshing indicator for manual refresh
    }
    
    try {
      console.log('Fetching fresh faucet data...')
      
      const chartData: ChartData[] = []
      await Promise.all(
        networks.map(async (network) => {
          // 💡 FIX: Instantiate a JsonRpcProvider for the network
          // Assumes 'network' object has an 'rpcUrl' string property
          if (!network.rpcUrl) {
            console.error(`Network ${network.name} is missing rpcUrl`);
            return;
          }
          const provider = new JsonRpcProvider(network.rpcUrl);

          try {
            // 💡 FIX: Pass the required second argument: 'provider'
            const faucets = await getFaucetsForNetwork(network, provider)
            const sortedFaucets = faucets.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
            
            chartData.push({
              network: network.name,
              faucets: sortedFaucets.length,
            })
          } catch (error) {
            console.error(`Error fetching faucets for ${network.name}:`, error)
            chartData.push({
              network: network.name,
              faucets: 0,
            })
          }
        })
      )

      const total = chartData.reduce((sum, item) => sum + item.faucets, 0)
      
      // Save to localStorage
      saveToLocalStorage(FAUCET_STORAGE_KEYS.CHART_DATA, chartData)
      saveToLocalStorage(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS, total)
      saveToLocalStorage(FAUCET_STORAGE_KEYS.LAST_UPDATED, Date.now())

      // Save to Supabase
      const supabaseData: Omit<FaucetData, 'id' | 'updated_at'>[] = chartData.map(item => ({
        network: item.network,
        faucets: item.faucets
      }))
      await DataService.saveFaucetData(supabaseData)

      setData(chartData)
      setTotalFaucets(total)
      
      console.log('Faucet data saved to both localStorage and Supabase')
    } catch (error) {
      console.error("Error fetching faucet data:", error)
    } finally {
      // Set loading/refreshing states to false regardless of success/error
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [networks]) // Dependency on networks

  const loadStoredData = async () => {
    // Try localStorage first
    if (isCacheValid()) {
      const cachedData = loadFromLocalStorage<ChartData[]>(FAUCET_STORAGE_KEYS.CHART_DATA);
      const cachedTotal = loadFromLocalStorage<number>(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS);
      if (cachedData && cachedTotal !== null) {
        console.log('Using cached faucet data from localStorage');
        setData(cachedData);
        setTotalFaucets(cachedTotal);
        setLoading(false);
        return true;
      }
    }

    // Fallback to Supabase
    try {
      const supabaseData = await DataService.loadFaucetData();
      // NOTE: DataService.isDataFresh is assumed to be implemented and working
      if (supabaseData.length > 0 && DataService.isDataFresh(supabaseData[0].updated_at)) {
        console.log('Using fresh faucet data from Supabase');
        const chartData = supabaseData.map(item => ({
          network: item.network,
          faucets: item.faucets
        }));
        const total = chartData.reduce((sum, item) => sum + item.faucets, 0);
        
        setData(chartData);
        setTotalFaucets(total);
        
        // Cache in localStorage
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

  // Effect for initial load
  useEffect(() => {
    if (networks.length > 0) {
      loadStoredData().then((dataLoaded) => {
        // If data wasn't loaded from cache/Supabase, fetch fresh data
        if (!dataLoaded) {
          fetchAndStoreFaucetData();
        }
      });
    }
  }, [networks, fetchAndStoreFaucetData]) // fetchAndStoreFaucetData is stable via useCallback

  // Effect for auto-refresh
  useEffect(() => {
    if (networks.length === 0) return;
    
    const interval = setInterval(() => {
      // Auto-refresh should not use the isManualRefresh flag
      fetchAndStoreFaucetData(false); 
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [networks, fetchAndStoreFaucetData]);

  if (loading && totalFaucets === 0) { // Show full loader only on initial empty load
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  // Handler for the refresh button
  const handleRefresh = () => {
    if (!isRefreshing) {
      fetchAndStoreFaucetData(true); // Pass true to trigger manual refresh
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{totalFaucets}</p>
          <p className="text-sm text-muted-foreground">Total Faucets Created</p>
        </div>
        
        {/* The new Refresh Button */}
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing} 
          variant="outline"
          size="icon"
          title="Refresh Faucet Data"
        >
          <RefreshCw 
            className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} 
          />
        </Button>
      </div>
      
      {/* Overlay loading indicator for a cleaner refresh experience */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="network" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="faucets" fill="#0052FF" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}