"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Loader2, RefreshCw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const API_BASE_URL = 'https://fauctdrop-backend.onrender.com'

interface ChartData {
  network: string
  faucets: number
}

interface FaucetsData {
  total: number
  chartData: ChartData[]
  lastUpdated: string
}

export function FaucetsCreatedChart() {
  const [data, setData] = useState<FaucetsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/analytics/faucets`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch faucets data')
      }
      
      if (result.success && result.data) {
        setData({
          total: result.data.total || 0,
          chartData: result.data.chartData || [],
          lastUpdated: result.cachedAt
        })
      } else {
        throw new Error(result.message || 'No faucets data available')
      }
      
    } catch (err) {
      console.error('Error fetching faucets data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatLastUpdated = (dateString: string) => {
    if (!dateString) return "Never"
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins} min ago`
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
      return date.toLocaleDateString()
    } catch {
      return "Unknown"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading faucets data...</p>
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
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and refresh button */}
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-bold">{data.total.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Faucets Created</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {formatLastUpdated(data.lastUpdated)}
          </Badge>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Chart */}
      {data.chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="network" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [value, 'Faucets']}
              labelFormatter={(label) => `Network: ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="faucets" 
              fill="#0052FF" 
              name="Faucets Created"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <p className="text-sm">No faucets data available</p>
            <Button variant="ghost" size="sm" onClick={fetchData} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      )}

      {/* Network breakdown */}
      {data.chartData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {data.chartData.map((item, index) => (
            <div 
              key={item.network}
              className="bg-muted/50 rounded-lg p-3 text-center"
            >
              <p className="text-lg font-semibold">{item.faucets}</p>
              <p className="text-xs text-muted-foreground">{item.network}</p>
            </div>
          ))}
        </div>
      )}

      {/* Data source indicator */}
      <div className="text-xs text-muted-foreground text-center">
        📊 Data served from backend cache • Updates automatically
      </div>
    </div>
  )
}