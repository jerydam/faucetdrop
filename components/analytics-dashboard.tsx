// components/cached-analytics-dashboard.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FaucetsCreatedChart } from "./charts/faucet-created-chart"
import { TransactionsPerDayChart } from "./charts/transactions-per-day"
import { NewUsersChart } from "./charts/new-users-chart"
import { UserClaimsChart } from "./charts/user-claims-chart"
import { BarChart3, PieChart, TrendingUp, Users, Loader2, RefreshCw, Clock, Wifi, WifiOff } from "lucide-react"
import { useCachedDashboard } from "@/hooks/use-cached-dashboard"

// Cache status component
function CacheStatusBadge({ cacheStatus, onRefresh, refreshing }: {
  cacheStatus: any
  onRefresh: () => void
  refreshing: boolean
}) {
  const formatAge = (age: number | null) => {
    if (!age) return ""
    
    const minutes = Math.floor(age / (1000 * 60))
    const seconds = Math.floor((age % (1000 * 60)) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`
    }
    return `${seconds}s ago`
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {cacheStatus.isFromCache ? (
        <Badge variant="secondary" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Cached Data
        </Badge>
      ) : (
        <Badge variant="default" className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          Live Data
        </Badge>
      )}
      
      {cacheStatus.age && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatAge(cacheStatus.age)}
        </Badge>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-1"
      >
        <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  )
}

// Enhanced stat card with loading state management
function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  loading,
  isFromCache 
}: {
  title: string
  value?: number
  change?: string
  icon: any
  loading: boolean
  isFromCache: boolean
}) {
  return (
    <Card className={`hover:shadow-lg transition-shadow ${isFromCache ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading && !value ? (
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          ) : (
            value?.toLocaleString() ?? 0
          )}
        </div>
        {change && !loading && (
          <p className="text-xs text-muted-foreground mt-1">
            {change} from last month
          </p>
        )}
        {loading && (
          <div className="h-3 w-24 bg-muted animate-pulse rounded mt-1" />
        )}
      </CardContent>
    </Card>
  )
}

// Loading skeleton for charts
function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  )
}

// Error card component
function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive">
      <CardContent className="pt-6">
        <div className="text-center text-destructive">
          <p className="text-sm">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function CachedAnalyticsDashboard() {
  const { data, loading, refreshing, error, cacheStatus, refresh } = useCachedDashboard()

  // Show cached data immediately if available
  const showData = data !== null
  const showSkeleton = loading && !showData

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header with Cache Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Data aggregated from all networks
            </p>
            {(loading || refreshing) && (
              <div className="flex items-center mt-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  {refreshing ? 'Refreshing data...' : 'Loading analytics...'}
                </span>
              </div>
            )}
          </div>
          
          <CacheStatusBadge 
            cacheStatus={cacheStatus} 
            onRefresh={refresh}
            refreshing={refreshing}
          />
        </div>

        {/* Info Banner for Cache */}
        {cacheStatus.isFromCache && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                <WifiOff className="h-4 w-4" />
                Showing cached data for faster loading. Click refresh for latest information.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Banner */}
        {error && !showData && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
                <span>⚠️ {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {error && !showData ? (
            <>
              <ErrorCard message="Failed to load faucets data" />
              <ErrorCard message="Failed to load transactions data" />
              <ErrorCard message="Failed to load users data" />
              <ErrorCard message="Failed to load claims data" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Faucets"
                value={data?.totalFaucets}
                change={data?.monthlyChange.faucets}
                icon={PieChart}
                loading={showSkeleton}
                isFromCache={cacheStatus.isFromCache}
              />
              <StatCard
                title="Total Transactions"
                value={data?.totalTransactions}
                change={data?.monthlyChange.transactions}
                icon={TrendingUp}
                loading={showSkeleton}
                isFromCache={cacheStatus.isFromCache}
              />
              <StatCard
                title="Unique Users"
                value={data?.uniqueUsers}
                change={data?.monthlyChange.users}
                icon={Users}
                loading={showSkeleton}
                isFromCache={cacheStatus.isFromCache}
              />
              <StatCard
                title="Total Drops"
                value={data?.totalClaims}
                change={data?.monthlyChange.claims}
                icon={BarChart3}
                loading={showSkeleton}
                isFromCache={cacheStatus.isFromCache}
              />
            </>
          )}
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="faucets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="faucets" className="text-xs md:text-sm px-2 py-2 md:px-4">
              <span className="hidden sm:inline">Faucets Created</span>
              <span className="sm:hidden">Faucets</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs md:text-sm px-2 py-2 md:px-4">
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs md:text-sm px-2 py-2 md:px-4">
              <span className="hidden sm:inline">New Users</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="claims" className="text-xs md:text-sm px-2 py-2 md:px-4">
              <span className="hidden sm:inline">Drops</span>
              <span className="sm:hidden">Drops</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faucets" className="space-y-4 mt-6">
            <Card className={cacheStatus.isFromCache ? 'border-blue-200 bg-blue-50/30 dark:bg-blue-950/10' : ''}>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  Faucets Created
                  {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of new faucets created across all networks
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  {showSkeleton ? <ChartSkeleton /> : <FaucetsCreatedChart />}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 mt-6">
            <Card className={cacheStatus.isFromCache ? 'border-blue-200 bg-blue-50/30 dark:bg-blue-950/10' : ''}>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  Transactions
                  {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <CardDescription className="text-sm">
                  Total number of transactions across all networks
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  {showSkeleton ? <ChartSkeleton /> : <TransactionsPerDayChart />}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-6">
            <Card className={cacheStatus.isFromCache ? 'border-blue-200 bg-blue-50/30 dark:bg-blue-950/10' : ''}>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  New Users
                  {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of unique users across all networks
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  {showSkeleton ? <ChartSkeleton /> : <NewUsersChart />}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-4 mt-6">
            <Card className={cacheStatus.isFromCache ? 'border-blue-200 bg-blue-50/30 dark:bg-blue-950/10' : ''}>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  Drops
                  {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of drops made across all networks
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  {showSkeleton ? <ChartSkeleton /> : <UserClaimsChart />}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Last Updated Footer */}
        {data?.lastUpdated && (
          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}