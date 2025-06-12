"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FaucetsCreatedChart } from "./charts/faucet-created-chart"
import { TransactionsPerDayChart } from "./charts/transactions-per-day"
import { NewUsersChart } from "./charts/new-users-chart"
import { UserClaimsChart } from "./charts/user-claims-chart"
import { BarChart3, PieChart, TrendingUp, Users, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts"

// Types for our data
interface DashboardStats {
  faucetsCreated: {
    total: number
    change: string
  }
  dailyTransactions: {
    total: number
    change: string
  }
  newUsers: {
    total: number
    change: string
    chartData: Array<{
      date: string
      users: number
      cumulative: number
    }>
  }
  userClaims: {
    total: number
    change: string
  }
}

interface AnalyticsDashboardProps {
  data?: DashboardStats
  loading?: boolean
  error?: string
}

// Hook to fetch dashboard data
function useDashboardData() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Replace this with your actual API endpoint
        const response = await fetch('/api/dashboard/stats')
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        
        const result = await response.json()
        setData(result)
      } catch (err) {
        // For demo purposes, use mock data when API fails
        const mockData: DashboardStats = {
          faucetsCreated: {
            total: 6,
            change: "+20.1% from last month"
          },
          dailyTransactions: {
            total: 15647,
            change: "+15.3% from last month"
          },
          newUsers: {
            total: 573,
            change: "+12.5% from last month",
            chartData: [
              { date: "2025-05-11", users: 45, cumulative: 1250 },
              { date: "2025-05-12", users: 52, cumulative: 1302 },
              { date: "2025-05-13", users: 38, cumulative: 1340 },
              { date: "2025-05-14", users: 61, cumulative: 1401 },
              { date: "2025-05-15", users: 49, cumulative: 1450 },
              { date: "2025-05-16", users: 72, cumulative: 1522 },
              { date: "2025-05-17", users: 58, cumulative: 1580 },
              { date: "2025-05-18", users: 43, cumulative: 1623 },
              { date: "2025-05-19", users: 67, cumulative: 1690 },
              { date: "2025-05-20", users: 55, cumulative: 1745 },
              { date: "2025-05-21", users: 48, cumulative: 1793 },
              { date: "2025-05-22", users: 63, cumulative: 1856 },
              { date: "2025-05-23", users: 51, cumulative: 1907 },
              { date: "2025-05-24", users: 69, cumulative: 1976 }
            ]
          },
          userClaims: {
            total: 2350,
            change: "+7.2% from last month"
          }
        }
        setData(mockData)
        setError(null) // Clear error when using mock data
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}

// Loading skeleton component
function StatCardSkeleton() {
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

// New Users Chart Component
function NewUsersGraph({ data, loading }: { data?: Array<{date: string, users: number, cumulative: number}>, loading: boolean }) {
  if (loading) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            className="text-xs"
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            className="text-xs"
            axisLine={false}
            tickLine={false}
            yAxisId="daily"
          />
          <YAxis 
            className="text-xs"
            axisLine={false}
            tickLine={false}
            yAxisId="cumulative"
            orientation="right"
          />
          <Tooltip 
            labelFormatter={(value) => formatDate(value)}
            formatter={(value: number, name: string) => [
              value.toLocaleString(), 
              name === 'users' ? 'Daily New Users' : 'Total Users'
            ]}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
          />
          <Legend />
          <Area
            yAxisId="daily"
            type="monotone"
            dataKey="users"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorUsers)"
            name="Daily New Users"
          />
          <Line
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulative"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            name="Total Users"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
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

// Stat card component
function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  loading 
}: {
  title: string
  value?: number
  change?: string
  icon: any
  loading: boolean
}) {
  if (loading) {
    return <StatCardSkeleton />
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
        <p className="text-xs text-muted-foreground">
          {change ?? 'No data'}
        </p>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard({ data: propData, loading: propLoading, error: propError }: AnalyticsDashboardProps = {}) {
  // Use hook data if no props provided
  const hookData = useDashboardData()
  
  const data = propData ?? hookData.data
  const loading = propLoading ?? hookData.loading
  const error = propError ?? hookData.error

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Analytics Dashboard
          </h1>
          {loading && (
            <div className="flex items-center justify-center md:justify-start mt-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading analytics...</span>
            </div>
          )}
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {error ? (
            // Show error for all cards
            <>
              <ErrorCard message={error} />
              <ErrorCard message={error} />
              <ErrorCard message={error} />
              <ErrorCard message={error} />
            </>
          ) : (
            <>
              <StatCard
                title="Faucets Created"
                value={data?.faucetsCreated.total}
                change={data?.faucetsCreated.change}
                icon={PieChart}
                loading={loading}
              />
              <StatCard
                title="Daily Transactions"
                value={data?.dailyTransactions.total}
                change={data?.dailyTransactions.change}
                icon={TrendingUp}
                loading={loading}
              />
              <StatCard
                title="New Users"
                value={data?.newUsers.total}
                change={data?.newUsers.change}
                icon={Users}
                loading={loading}
              />
              <StatCard
                title="User Claims"
                value={data?.userClaims.total}
                change={data?.userClaims.change}
                icon={BarChart3}
                loading={loading}
              />
            </>
          )}
        </div>

        {/* Charts Section */}
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
              <span className="hidden sm:inline">Total Transactions</span>
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
              <span className="hidden sm:inline">User Claims</span>
              <span className="sm:hidden">Claims</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faucets" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Faucets Created by Chain
                </CardTitle>
                <CardDescription className="text-sm">
                  Distribution of faucets across different blockchain networks
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
                  Total transactions Transactions
                </CardTitle>
                <CardDescription className="text-sm">
                  Total number of transactions transactions across Celo and Lisk networks
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
                  New Users Per Day
                </CardTitle>
                <CardDescription className="text-sm">
                  Daily new user registrations and cumulative growth over time
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <NewUsersGraph data={data?.newUsers.chartData} loading={loading} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  User Claims by Faucet
                </CardTitle>
                <CardDescription className="text-sm">
                  Claims distribution across different faucets on all chains
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