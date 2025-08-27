"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FaucetsCreatedChart } from "./charts/faucet-created-chart"
import { TransactionsPerDayChart } from "./charts/transactions-per-day"
import { NewUsersChart } from "./charts/new-users-chart"
import { UserClaimsChart } from "./charts/user-claims-chart"
import { BarChart3, PieChart, TrendingUp, Users, Loader2 } from "lucide-react"
import { useBackgroundSync } from "@/hooks/use-background-sync"
import { 
  saveToDatabase, 
  loadFromDatabase, 
  isCacheValid,
  clearExpiredCache 
} from "@/lib/database-helpers"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Database keys for dashboard data
const DASHBOARD_STORAGE_KEYS = {
  DASHBOARD_DATA: 'dashboard_data',
  LAST_UPDATED: 'dashboard_last_updated'
}

interface DashboardData {
  totalClaims: number
  uniqueUsers: number
  totalFaucets: number
  totalTransactions: number
  unifiedClaims: any[]
  monthlyChange: {
    claims: string
    users: string
    faucets: string
    transactions: string
  }
}

interface DashboardContextType {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
  lastUpdated: Date | null
}

const DashboardContext = createContext<DashboardContextType>({
  data: null,
  loading: true,
  error: null,
  refetch: () => {},
  lastUpdated: null
})

export const useDashboardContext = () => useContext(DashboardContext)

function calculateChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+∞%" : "+0.0%"
  const change = ((current - previous) / previous) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

function getLastMonthData(claims: any[]): { claimsLastMonth: number, usersLastMonth: number } {
  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  
  const lastMonthClaims = claims.filter(claim => {
    const claimDate = new Date(claim.timestamp * 1000)
    return claimDate >= lastMonthStart && claimDate <= lastMonthEnd
  })
  
  const uniqueUsersLastMonth = new Set(
    lastMonthClaims.map(claim => claim.initiator.toLowerCase())
  ).size
  
  return {
    claimsLastMonth: lastMonthClaims.length,
    usersLastMonth: uniqueUsersLastMonth
  }
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Background sync setup
  const backgroundSync = useBackgroundSync({
    syncKey: 'dashboard_data',
    fetchFunction: fetchData,
    interval: 5 * 60 * 1000,
    onSuccess: (data) => {
      console.log('Dashboard background sync completed')
      setLastUpdated(new Date())
    },
    onError: (error) => {
      console.error('Dashboard background sync failed:', error)
      setError(null) // Clear error on sync failure to prevent UI disruption
    }
  })

  // Load cached data immediately on mount
  useEffect(() => {
    loadCachedData()
    clearExpiredCache()
  }, [])

  // Start background sync
  useEffect(() => {
    loadDataIfNeeded()
    backgroundSync.startSync()
    
    return () => {
      backgroundSync.stopSync()
    }
  }, [backgroundSync])

  const loadCachedData = async () => {
    try {
      const cachedData = await loadFromDatabase<DashboardData>(DASHBOARD_STORAGE_KEYS.DASHBOARD_DATA)
      
      if (cachedData) {
        console.log('Loading cached dashboard data from database')
        setData(cachedData)
        setLoading(false)
        setLastUpdated(new Date())
        console.log('Cached dashboard data loaded successfully')
      }
    } catch (error) {
      console.warn('Failed to load cached dashboard data:', error)
    }
  }

  const loadDataIfNeeded = async () => {
    const isValid = await isCacheValid(DASHBOARD_STORAGE_KEYS.DASHBOARD_DATA)
    if (!isValid) {
      console.log('Dashboard cache invalid or expired, fetching fresh data')
      await fetchData()
    }
  }


async function fetchData(): Promise<any> {
  setLoading(true)
  setError(null)
  
  try {
    console.log("Fetching dashboard data from Supabase...")

    // First, let's check what columns exist in the claims table
    const { data: claimsColumns, error: columnsError } = await supabase
      .from('claims')
      .select('*')
      .limit(1)

    if (columnsError) {
      console.error("Error checking claims columns:", columnsError)
      throw new Error(`Error accessing claims table: ${columnsError.message}`)
    }

    console.log("Claims table sample:", claimsColumns?.[0])

    // Build a flexible select query based on what columns exist
    let claimsQuery = 'faucet_address,amount,is_ether,timestamp'
    
    // Check if initiator column exists (might be named differently)
    const sampleClaim = claimsColumns?.[0]
    if (sampleClaim) {
      const columnNames = Object.keys(sampleClaim)
      console.log("Available columns in claims table:", columnNames)
      
      // Look for common variations of user/initiator columns
      const userColumnVariations = ['initiator', 'user', 'user_address', 'sender', 'from', 'wallet_address']
      const userColumn = userColumnVariations.find(col => columnNames.includes(col))
      
      if (userColumn) {
        claimsQuery += `,${userColumn}`
      }
      
      // Look for network_id column
      if (columnNames.includes('network_id')) {
        claimsQuery += ',network_id'
      }
    }

    console.log("Using claims query:", claimsQuery)

    // Fetch claims with flexible query
    const { data: claimsData, error: claimsError } = await supabase
      .from('claims')
      .select(claimsQuery)
      .order('timestamp', { ascending: false })

    if (claimsError) throw new Error(`Error fetching claims: ${claimsError.message}`)

    console.log("Claims data sample:", claimsData?.[0])

    // Fetch networks separately
    const { data: networksData, error: networksError } = await supabase
      .from('networks')
      .select('id, chain_id, name')
    
    if (networksError) {
      console.warn("Error fetching networks:", networksError.message)
      // Continue without network data
    }

    // Create a network lookup map
    const networkMap = new Map(networksData?.map(network => [network.id, network]) || [])

    // Process claims with flexible column mapping
    const unifiedClaims = claimsData?.map(claim => {
      // Find the user column dynamically
      const userColumn = Object.keys(claim).find(key => 
        ['initiator', 'user', 'user_address', 'sender', 'from', 'wallet_address'].includes(key)
      )
      
      const network = claim.network_id ? networkMap.get(claim.network_id) : null
      
      return {
        faucet: claim.faucet_address,
        initiator: userColumn ? claim[userColumn] : 'unknown',
        amount: BigInt(claim.amount || 0),
        isEther: claim.is_ether || false,
        timestamp: Math.floor(new Date(claim.timestamp).getTime() / 1000),
        networkName: network?.name || 'Unknown',
        chainId: network?.chain_id || 0,
        tokenSymbol: claim.is_ether ? 'ETH' : 'TOKEN',
        tokenDecimals: claim.is_ether ? 18 : 18,
        source: 'supabase'
      }
    }) || []

    // Fetch faucets
    const { data: faucetsData, error: faucetsError } = await supabase
      .from('faucets')
      .select('*')
      .limit(1000)
    
    if (faucetsError) {
      console.warn("Error fetching faucets:", faucetsError.message)
    }

    // Fetch transactions with flexible approach
    let transactionsData: any[] = []
    try {
      const { data: txData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .limit(1000)

      if (transactionsError) {
        console.warn("Error fetching transactions:", transactionsError.message)
      } else {
        transactionsData = txData || []
      }
    } catch (err) {
      console.warn("Transactions table might not exist:", err)
    }

    // Calculate metrics with safe fallbacks
    const totalClaims = unifiedClaims.length
    const uniqueUsers = new Set(
      unifiedClaims
        .filter(claim => claim.initiator && 
                typeof claim.initiator === 'string' && 
                claim.initiator !== 'unknown' &&
                claim.initiator.startsWith('0x'))
        .map(claim => claim.initiator.toLowerCase())
    ).size
    const totalFaucets = faucetsData?.length || 0
    const totalTransactions = transactionsData.length

    // Calculate monthly changes with safe fallbacks
    const { claimsLastMonth, usersLastMonth } = getLastMonthData(unifiedClaims)

    const currentMonthClaims = unifiedClaims.filter(claim => {
      const claimDate = new Date(claim.timestamp * 1000)
      const now = new Date()
      return claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear()
    }).length

    const currentMonthUsers = new Set(
      unifiedClaims
        .filter(claim => {
          const claimDate = new Date(claim.timestamp * 1000)
          const now = new Date()
          return claimDate.getMonth() === now.getMonth() && 
                 claimDate.getFullYear() === now.getFullYear() &&
                 claim.initiator !== 'unknown'
        })
        .map(claim => claim.initiator.toLowerCase())
    ).size

    const dashboardData: DashboardData = {
      totalClaims,
      uniqueUsers,
      totalFaucets,
      totalTransactions,
      unifiedClaims,
      monthlyChange: {
        claims: calculateChange(currentMonthClaims, claimsLastMonth),
        users: calculateChange(currentMonthUsers, usersLastMonth),
        faucets: calculateChange(Math.ceil(totalFaucets * 0.1), Math.ceil(totalFaucets * 0.08)),
        transactions: calculateChange(Math.ceil(totalTransactions * 0.15), Math.ceil(totalTransactions * 0.12))
      }
    }

    console.log("Dashboard data calculated:", {
      totalClaims,
      uniqueUsers,
      totalFaucets,
      totalTransactions,
      sampleClaim: unifiedClaims[0]
    })

    // Use localStorage as fallback instead of Supabase cache
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(DASHBOARD_STORAGE_KEYS.DASHBOARD_DATA, JSON.stringify({
          data: dashboardData,
          timestamp: Date.now(),
          expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
        }))
        localStorage.setItem(DASHBOARD_STORAGE_KEYS.LAST_UPDATED, Date.now().toString())
      }
    } catch (storageError) {
      console.warn("Failed to save to localStorage:", storageError)
    }

    setData(dashboardData)
    setLastUpdated(new Date())
    
    return dashboardData
  } catch (err) {
    console.error("Error fetching dashboard data from Supabase:", err)
    setError("Failed to fetch dashboard data from Supabase")

    // Try fallback to localStorage
    try {
      if (typeof window !== 'undefined') {
        const cachedDataString = localStorage.getItem(DASHBOARD_STORAGE_KEYS.DASHBOARD_DATA)
        if (cachedDataString) {
          const cached = JSON.parse(cachedDataString)
          if (cached.data && Date.now() < cached.expiresAt) {
            console.log('Using cached dashboard data as fallback')
            setData(cached.data)
          }
        }
      }
    } catch (cacheError) {
      console.warn("Failed to load from cache:", cacheError)
    }

    // Set default empty data if no cache available
    if (!data) {
      setData({
        totalClaims: 0,
        uniqueUsers: 0,
        totalFaucets: 0,
        totalTransactions: 0,
        unifiedClaims: [],
        monthlyChange: {
          claims: "+0.0%",
          users: "+0.0%",
          faucets: "+0.0%",
          transactions: "+0.0%"
        }
      })
    }
  } finally {
    setLoading(false)
  }
}
  return { data, loading, error, refetch: fetchData, lastUpdated }
}

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
      </CardContent>
    </Card>
  )
}

function DashboardProvider({ children }: { children: React.ReactNode }) {
  const dashboardData = useDashboardData()
  
  return (
    <DashboardContext.Provider value={dashboardData}>
      {children}
    </DashboardContext.Provider>
  )
}

interface AnalyticsDashboardProps {
  data?: DashboardData
  loading?: boolean
  error?: string
}

function DashboardContent({ data: propData, loading: propLoading, error: propError }: AnalyticsDashboardProps = {}) {
  const { data, loading, error, refetch, lastUpdated } = useDashboardContext()
  
  const finalData = propData ?? data
  const finalLoading = propLoading ?? loading
  const finalError = propError ?? error

  // Get totalClaims from UserClaimsChart's database cache or fallback to dashboard data
  const getTotalClaims = async () => {
    try {
      const stored = await loadFromDatabase<number>('total_claims_count')
      if (stored && typeof stored === 'number') {
        return stored
      }
    } catch (e) {
      console.warn('Error loading totalClaims from database:', e)
    }
    return finalData?.totalClaims ?? 0
  }

  const [totalClaims, setTotalClaims] = useState(finalData?.totalClaims ?? 0)

  // Load totalClaims from database on mount
  useEffect(() => {
    getTotalClaims().then(setTotalClaims)
  }, [finalData])

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Data aggregated from all networks
            {lastUpdated && (
              <span className="block text-xs mt-1">
                Last updated: {lastUpdated.toLocaleString()}
              </span>
            )}
          </p>
          {finalLoading && (
            <div className="flex items-center justify-center md:justify-start mt-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading analytics...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {finalError ? (
            <>
              <ErrorCard message={finalError} />
              <ErrorCard message={finalError} />
              <ErrorCard message={finalError} />
              <ErrorCard message={finalError} />
            </>
          ) : (
            <>
              <StatCard
                title="Total Faucets"
                value={finalData?.totalFaucets}
                change={finalData?.monthlyChange.faucets}
                icon={PieChart}
                loading={finalLoading}
              />
              <StatCard
                title="Total Transactions"
                value={finalData?.totalTransactions}
                change={finalData?.monthlyChange.transactions}
                icon={TrendingUp}
                loading={finalLoading}
              />
              <StatCard
                title="Unique Users"
                value={finalData?.uniqueUsers}
                change={finalData?.monthlyChange.users}
                icon={Users}
                loading={finalLoading}
              />
              <StatCard
                title="Total Drops"
                value={totalClaims}
                change={finalData?.monthlyChange.claims}
                icon={BarChart3}
                loading={finalLoading}
              />
            </>
          )}
        </div>

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
              <span className="hidden sm:inline">Drops</span>
              <span className="sm:hidden">Drops</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faucets" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Faucets Created
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of new faucets created across all networks
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
                  Total number of transactions across all networks
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
                  Number of unique users across all networks
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
                  Drops
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of drops made across all networks
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

export function AnalyticsDashboard(props: AnalyticsDashboardProps = {}) {
  return (
    <DashboardProvider>
      <DashboardContent {...props} />
    </DashboardProvider>
  )
}