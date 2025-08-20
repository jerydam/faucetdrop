"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FaucetsCreatedChart } from "./charts/faucet-created-chart"
import { TransactionsPerDayChart } from "./charts/transactions-per-day"
import { NewUsersChart } from "./charts/new-users-chart"
import { UserClaimsChart } from "./charts/user-claims-chart"
import { BarChart3, PieChart, TrendingUp, Users, Activity, UserPlus, Zap } from "lucide-react"
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
  return (
    <Card className="w-full hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
          {loading ? 0 : (value?.toLocaleString() ?? 0)}
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Tab configuration with responsive labels
  const tabConfig = [
    {
      value: "faucets",
      icon: PieChart,
      shortLabel: "Faucets",
      fullLabel: "Faucets Created",
      title: "Faucets Created",
      description: "Number of new faucets created across all networks ",
      component: FaucetsCreatedChart
    },
    {
      value: "transactions", 
      icon: Activity,
      shortLabel: "Txns",
      fullLabel: "Transactions",
      title: "Transactions",
      description: "Total number of transactions across all networks ",
      component: TransactionsPerDayChart
    },
    {
      value: "users",
      icon: UserPlus,
      shortLabel: "Users", 
      fullLabel: "New Users",
      title: "New Users",
      description: "Number of unique users across all networks ",
      component: NewUsersChart
    },
    {
      value: "claims",
      icon: Zap,
      shortLabel: "Claims",
      fullLabel: "User Drops", 
      title: "Claims",
      description: "Number of drops made across all networks ",
      component: UserClaimsChart
    }
  ]

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Header Section */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Data served from all Chain
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-xs sm:text-sm text-destructive break-words">{error}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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
              title="Total Drops"
              value={dashboardData?.totalClaims}
              icon={BarChart3}
              loading={loading}
            />
          </div>

          {/* Charts Tabs - Fully Responsive */}
          <Tabs defaultValue="faucets" className="w-full">
            {/* Responsive TabsList */}
            <div className="w-full">
              {/* Mobile: Stack tabs vertically for very small screens */}
              <div className="block sm:hidden">
                <TabsList className="grid grid-cols-2 w-full h-auto gap-1 p-1">
                  {tabConfig.map((tab) => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value}
                      className="flex flex-col items-center gap-1 py-3 px-2 text-xs min-h-[60px] data-[state=active]:bg-background"
                    >
                      <tab.icon className="h-4 w-4" />
                      <span className="text-center leading-tight">{tab.fullLabel}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Tablet: Horizontal layout with icons and short labels */}
              <div className="hidden sm:block lg:hidden">
                <TabsList className="grid grid-cols-4 w-full h-auto gap-1 p-1">
                  {tabConfig.map((tab) => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value}
                      className="flex flex-col items-center gap-1.5 py-2.5 px-2 text-xs min-h-[50px] data-[state=active]:bg-background"
                    >
                      <tab.icon className="h-4 w-4" />
                      <span className="text-center">{tab.fullLabel}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Desktop: Full horizontal layout with text */}
              <div className="hidden lg:block">
                <TabsList className="grid grid-cols-4 w-full h-auto gap-1 p-1">
                  {tabConfig.map((tab) => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-2 py-3 px-4 text-sm min-h-[44px] data-[state=active]:bg-background"
                    >
                      <tab.icon className="h-4 w-4 flex-shrink-0" />
                      <span>{tab.fullLabel}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>

            {/* Chart Content */}
            <div className="mt-4 sm:mt-6">
              {tabConfig.map((tab) => {
                const ChartComponent = tab.component
                return (
                  <TabsContent key={tab.value} value={tab.value} className="space-y-4 mt-0">
                    <Card>
                      <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <tab.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                              {tab.title}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1">
                              {tab.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                        <div className="w-full overflow-hidden">
                          <ChartComponent />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )
              })}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}