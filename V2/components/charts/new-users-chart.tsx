"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_BASE_URL ='https://fauctdrop-backend.onrender.com'

interface UserData {
  date: string
  newUsers: number
  cumulativeUsers: number
}

interface UsersData {
  total: number
  chartData: UserData[]
  lastUpdated: string
}

export function NewUsersChart() {
  const [data, setData] = useState<UsersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/analytics/users`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch users data')
      }
      
      if (result.success && result.data) {
        setData({
          total: result.data.total || 0,
          chartData: result.data.chartData || [],
          lastUpdated: result.cachedAt
        })
      } else {
        throw new Error(result.message || 'No users data available')
      }
      
    } catch (err) {
      console.error('Error fetching users data:', err)
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
          <p className="text-sm text-muted-foreground">Loading users data...</p>
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
        No user data available
      </div>
    )
  }

  // Custom tooltip to show both new and cumulative users
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{new Date(label).toLocaleDateString()}</p>
          <p className="text-sm text-blue-600">
            New Users: <span className="font-medium">{data.newUsers}</span>
          </p>
          <p className="text-sm text-green-600">
            Total Users: <span className="font-medium">{data.cumulativeUsers}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-bold">{data.total.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Unique Users</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {data.chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="newUsers" 
              fill="#0052FF" 
              name="New Users"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No user data available
        </div>
      )}
      
      <div className="text-xs text-muted-foreground text-center">
        📊 Data served from onchain • Updates automatically
      </div>
    </div>
  )
}