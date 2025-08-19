"use client"

import { useEffect, useState } from "react"
import { Loader2, Activity, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_BASE_URL ='https://fauctdrop-backend.onrender.com'

interface NetworkStats {
  name: string
  chainId: number
  totalTransactions: number
  color: string
  factoryAddresses: string[]
}

interface TransactionsData {
  total: number
  networkStats: NetworkStats[]
  lastUpdated: string
}

export function TransactionsPerDayChart() {
  const [data, setData] = useState<TransactionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/analytics/transactions`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch transactions data')
      }
      
      if (result.success && result.data) {
        setData({
          total: result.data.total || 0,
          networkStats: result.data.chartData?.networkStats || [],
          lastUpdated: result.cachedAt
        })
      } else {
        throw new Error(result.message || 'No transactions data available')
      }
      
    } catch (err) {
      console.error('Error fetching transactions data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading transactions data from backend...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No transactions data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <p className="text-4xl font-bold text-primary">{data.total.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            Total transactions across all networks
          </p>
        </div>
        
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.networkStats.map((network) => (
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
                    {network.factoryAddresses?.length || 0} factories
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
                    width: `${data.total > 0 ? (network.totalTransactions / data.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {data.total > 0 ? ((network.totalTransactions / data.total) * 100).toFixed(1) : 0}% of total
                </p>
                <p className="text-xs text-muted-foreground">
                  Chain ID: {network.chainId}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.total === 0 && !loading && (
        <div className="text-center py-12">
          <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
          <p className="text-muted-foreground mb-4">
            No transactions have been recorded across any network yet.
          </p>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground text-center">
        📊 Data served from onchain • Updates automatically
      </div>
    </div>
  )
}