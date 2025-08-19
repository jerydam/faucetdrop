"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { FaucetsCreatedChart } from "./charts/faucet-created-chart"
import { TransactionsPerDayChart } from "./charts/transactions-per-day"
import { NewUsersChart } from "./charts/new-users-chart"
import { UserClaimsChart } from "./charts/user-claims-chart"
import { BarChart3, PieChart, TrendingUp, Users, Loader2, RefreshCw, Clock } from "lucide-react"
import { useState, useEffect } from "react"

const API_BASE_URL = 'https://fauctdrop-backend.onrender.com'

interface DashboardData {
  totalClaims: number
  uniqueUsers: number
  totalFaucets: number
  totalTransactions: number
  networkStats: any[]
  lastUpdated: string
  updateDuration?: number
}

interface UpdateStatus {
  updating: boolean
  message: string
  completed_at?: string
  failed_at?: string
  duration_seconds?: number
  error?: string
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  loading 
}: {
  title: string
  value?: number
  icon: any
  loading: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
          <div className="h-3 w-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value?.toLocaleString() ?? 0}
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch dashboard data')
      }
      
      if (result.success && result.data) {
        setDashboardData(result.data)
        setLastUpdated(result.cachedAt)
      } else {
        throw new Error(result.message || 'No dashboard data available')
      }
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const triggerDataUpdate = async () => {
    try {
      setUpdating(true)
      
      const response = await fetch(`${API_BASE_URL}/analytics/update`, {
        method: 'POST'
      })
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to trigger update')
      }
      
      if (result.success) {
        // Wait a bit then refresh dashboard data
        setTimeout(() => {
          fetchDashboardData()
        }, 3000)
      } else {
        throw new Error(result.message || 'Update failed')
      }
      
    } catch (err) {
      console.error('Error triggering update:', err)
      setError(err instanceof Error ? err.message : 'Failed to trigger update')
    } finally {
      setUpdating(false)
    }
  }

  const checkUpdateStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/status`)
      const result = await response.json()
      
      if (result.success && result.status) {
        const status: UpdateStatus = result.status
        setUpdating(status.updating)
      }
    } catch (err) {
      // Silently fail status checks
      console.warn('Failed to check update status:', err)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Check update status periodically
    const interval = setInterval(checkUpdateStatus, 10000) // Check every 10 seconds
    
    return () => clearInterval(interval)
  }, [])

  const formatLastUpdated = (dateString: string | null) => {
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

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Data served from all Chain
            </p>
            {loading && (
              <div className="flex items-center justify-center md:justify-start mt-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading analytics...</span>
              </div>
            )}
            {updating && (
              <div className="flex items-center justify-center md:justify-start mt-2">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-yellow-600">Updating data...</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDashboardData} 
              disabled={loading || updating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={triggerDataUpdate} 
              disabled={updating || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Updating...' : 'Update Data'}
            </Button>
          </div>
        </div>

        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
            {dashboardData?.updateDuration && (
              <span>• Update took {dashboardData.updateDuration.toFixed(1)}s</span>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            title="Total Faucets"
            value={dashboardData?.totalFaucets}
            icon={PieChart}
            loading={loading}
          />
          <StatCard
            title="Total Transactions"
            value={dashboardData?.totalTransactions}
            icon={TrendingUp}
            loading={loading}
          />
          <StatCard
            title="Unique Users"
            value={dashboardData?.uniqueUsers}
            icon={Users}
            loading={loading}
          />
          <StatCard
            title="Total Claims"
            value={dashboardData?.totalClaims}
            icon={BarChart3}
            loading={loading}
          />
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="faucets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger 
              value="faucets" 
              className="text-xs md:text-sm px-2 py-2 md:px-4"
            >
              <span className="hidden sm:inline">Faucets Created</span>
              <span className="sm:hidden">Faucets</span>
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="text-xs md:text-sm px-2 py-2 md:px-4"
            >
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Transactions</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="text-xs md:text-sm px-2 py-2 md:px-4"
            >
              <span className="hidden sm:inline">New Users</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger 
              value="claims" 
              className="text-xs md:text-sm px-2 py-2 md:px-4"
            >
              <span className="hidden sm:inline">Claims</span>
              <span className="sm:hidden">Claims</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faucets" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Faucets Created
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of new faucets created across all networks (cached data)
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <FaucetsCreatedChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Transactions
                </CardTitle>
                <CardDescription className="text-sm">
                  Total number of transactions across all networks (cached data)
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <TransactionsPerDayChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  New Users
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of unique users across all networks (cached data)
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <NewUsersChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Claims
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of claims made across all networks (cached data)
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <UserClaimsChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}