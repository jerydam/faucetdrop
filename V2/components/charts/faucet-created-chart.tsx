"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useNetwork } from "@/hooks/use-network"
import { getFaucetsForNetwork } from "@/lib/faucet"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBackgroundSync } from "@/hooks/use-background-sync"
import { 
  saveToDatabase, 
  loadFromDatabase, 
  isCacheValid,
  clearExpiredCache 
} from "@/lib/database-helpers"

// Database keys for faucet data
const FAUCET_STORAGE_KEYS = {
  CHART_DATA: 'faucet_chart_data',
  TOTAL_FAUCETS: 'faucet_total_count'
};

interface ChartData {
  network: string
  faucets: number
}

export function FaucetsCreatedChart() {
  const { networks } = useNetwork()
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalFaucets, setTotalFaucets] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Background sync setup
  const backgroundSync = useBackgroundSync({
    syncKey: 'faucets_data',
    fetchFunction: fetchFaucetData,
    interval: 5 * 60 * 1000,
    onSuccess: (data) => {
      console.log('Faucets background sync completed')
      setLastUpdated(new Date())
    },
    onError: (error) => {
      console.error('Faucets background sync failed:', error)
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
      const [cachedData, cachedTotal] = await Promise.all([
        loadFromDatabase<ChartData[]>(FAUCET_STORAGE_KEYS.CHART_DATA),
        loadFromDatabase<number>(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS)
      ])
      
      if (cachedData && cachedTotal !== null) {
        console.log('Loading cached faucet data from database');
        setData(cachedData);
        setTotalFaucets(cachedTotal);
        setLoading(false);
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.warn('Failed to load cached faucet data:', error)
    }
  }

  const loadDataIfNeeded = async () => {
    const isValid = await isCacheValid(FAUCET_STORAGE_KEYS.CHART_DATA)
    if (!isValid) {
      console.log('Faucet cache invalid or expired, fetching fresh data')
      await fetchFaucetData()
    }
  }

  async function fetchFaucetData(): Promise<any> {
    try {
      const chartData: ChartData[] = []

      await Promise.all(
        networks.map(async (network) => {
          try {
            const faucets = await getFaucetsForNetwork(network)
            const sortedFaucets = faucets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            
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
      
      // Save data to database
      await Promise.all([
        saveToDatabase(FAUCET_STORAGE_KEYS.CHART_DATA, chartData),
        saveToDatabase(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS, total)
      ])

      setData(chartData)
      setTotalFaucets(total)
      setLastUpdated(new Date())
      
      return { chartData, total }
    } catch (error) {
      console.error("Error fetching faucet data:", error)
      throw error
    }
  }

  const handleManualRefresh = async () => {
    setLoading(true)
    try {
      await fetchFaucetData()
    } catch (error) {
      console.error('Manual refresh failed:', error)
      // Fallback to cached data if available
      const [cachedData, cachedTotal] = await Promise.all([
        loadFromDatabase<ChartData[]>(FAUCET_STORAGE_KEYS.CHART_DATA),
        loadFromDatabase<number>(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS)
      ])
      
      if (cachedData && cachedTotal !== null) {
        console.log('Using cached faucet data as fallback');
        setData(cachedData);
        setTotalFaucets(cachedTotal);
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-bold">{totalFaucets}</p>
          <p className="text-sm text-muted-foreground">Total Faucets Created</p>
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