"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FaucetsCreatedChart } from "./charts/faucet-created-chart"
import { TransactionsPerDayChart } from "./charts/transactions-per-day"
import { NewUsersChart } from "./charts/new-users-chart"
import { UserClaimsChart } from "./charts/user-claims-chart"
import { BarChart3, PieChart, TrendingUp, Users, Loader2 } from "lucide-react"
import { useState, useEffect, createContext, useContext } from "react"
import { ethers, Contract, JsonRpcProvider, isAddress } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { STORAGE_ABI, FACTORY_ABI } from "@/lib/abis"
import { getFaucetsForNetwork, getAllClaimsForAllNetworks } from "@/lib/faucet"

// Factory ABI for fetching factory claims
const FACTORY_ABI_LOCAL = [
  {
    "inputs": [],
    "name": "getAllTransactions",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "faucetAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "transactionType",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "initiator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isEther",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct TransactionLibrary.Transaction[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Define network configurations for storage contracts
const STORAGE_NETWORKS = {
  42220: {
    // Celo Mainnet
    contractAddress: "0x3fC5162779F545Bb4ea7980471b823577825dc8A",
    rpcUrl: "https://forno.celo.org",
    name: "Celo"
  },
  1135: {
    // Custom chain
    contractAddress: "0xc5f8c2A85520c0A3595C29e004b2f5D9e7CE3b0B",
    rpcUrl: "https://mainnet.base.org/",
    name: "Custom"
  },
  42161: {
    // Arbitrum One
    contractAddress: "0x6087810cFc24310E85736Cbd500e4c1d5a45E196",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    name: "Arbitrum"
  },
}

// Types for our data
interface DashboardData {
  totalClaims: number
  uniqueUsers: number
  totalFaucets: number
  totalTransactions: number
  unifiedClaims: any[] // Store the unified drops data
  monthlyChange: {
    claims: string
    users: string
    faucets: string
    transactions: string
  }
}

// Context for sharing dashboard data
interface DashboardContextType {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const DashboardContext = createContext<DashboardContextType>({
  data: null,
  loading: true,
  error: null,
  refetch: () => {}
})

export const useDashboardContext = () => useContext(DashboardContext)

// Function to get all drops from factories
async function getAllClaimsFromAllFactories(networks: any[]): Promise<{
  faucetAddress: string
  transactionType: string
  initiator: string
  amount: bigint
  isEther: boolean
  timestamp: number
  networkName: string
  chainId: number
}[]> {
  const allClaims: any[] = [];

  for (const network of networks) {
    try {
      console.log(`Fetching drops from factories on ${network.name}...`);
      
      const provider = new JsonRpcProvider(network.rpcUrl);
      const { transactions } = await getAllClaimsFromFactories(provider, network);
      
      const networkClaims = transactions.map(claim => ({
        ...claim,
        networkName: network.name,
        chainId: network.chainId
      }));
      
      allClaims.push(...networkClaims);
      console.log(`Added ${networkClaims.length} drops from ${network.name}`);
    } catch (error) {
      console.error(`Error fetching drops from ${network.name}:`, error);
    }
  }

  allClaims.sort((a, b) => b.timestamp - a.timestamp);
  return allClaims;
}

// Helper function to get drops from factories for a single network
async function getAllClaimsFromFactories(
  provider: JsonRpcProvider,
  network: any,
): Promise<{
  transactions: {
    faucetAddress: string
    transactionType: string
    initiator: string
    amount: bigint
    isEther: boolean
    timestamp: number
  }[]
  totalClaims: number
  claimsByFaucet: Record<string, number>
}> {
  try {
    let allClaims: any[] = [];

    if (network.factoryAddresses) {
      for (const factoryAddress of network.factoryAddresses) {
        if (!isAddress(factoryAddress)) {
          console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
          continue;
        }

        const factoryContract = new Contract(factoryAddress, FACTORY_ABI_LOCAL, provider);

        const code = await provider.getCode(factoryAddress);
        if (code === "0x") {
          console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`);
          continue;
        }

        try {
          console.log(`Fetching transactions from factory ${factoryAddress}...`);
          const allTransactions = await factoryContract.getAllTransactions();
          
          const claimTransactions = allTransactions.filter((tx: any) => 
            tx.transactionType.toLowerCase().includes('claim')
          );
          
          console.log(`Found ${claimTransactions.length} claim transactions from factory ${factoryAddress}`);
          allClaims.push(...claimTransactions);
        } catch (error) {
          console.warn(`Error fetching transactions from factory ${factoryAddress}:`, error);
        }
      }
    }

    const mappedClaims = allClaims.map((tx: any) => ({
      faucetAddress: tx.faucetAddress as string,
      transactionType: tx.transactionType as string,
      initiator: tx.initiator as string,
      amount: BigInt(tx.amount),
      isEther: tx.isEther as boolean,
      timestamp: Number(tx.timestamp),
    }));

    const claimsByFaucet: Record<string, number> = {};
    mappedClaims.forEach(claim => {
      const faucetAddress = claim.faucetAddress.toLowerCase();
      claimsByFaucet[faucetAddress] = (claimsByFaucet[faucetAddress] || 0) + 1;
    });

    const result = {
      transactions: mappedClaims,
      totalClaims: mappedClaims.length,
      claimsByFaucet
    };

    console.log(`Total drops fetched from ${network.name} factories: ${result.totalClaims}`);
    return result;
  } catch (error: any) {
    console.error(`Error fetching drops from factories on ${network.name}:`, error);
    throw new Error(error.message || "Failed to fetch drops from factories");
  }
}

// Helper function to calculate percentage change
function calculateChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+∞%" : "+0.0%"
  const change = ((current - previous) / previous) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

// Helper function to get last month's data for comparison
function getLastMonthData(claims: any[]): { claimsLastMonth: number, usersLastMonth: number } {
  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  
  const lastMonthClaims = claims.filter(claim => {
    const claimDate = new Date(Number(claim.timestamp) * 1000)
    return claimDate >= lastMonthStart && claimDate <= lastMonthEnd
  })
  
  const uniqueUsersLastMonth = new Set(lastMonthClaims.map(claim => 
    claim.claimer ? claim.claimer.toLowerCase() : claim.initiator.toLowerCase()
  )).size
  
  return {
    claimsLastMonth: lastMonthClaims.length,
    usersLastMonth: uniqueUsersLastMonth
  }
}

// Hook to fetch unified dashboard data using same logic as chart components
function useDashboardData() {
  const { networks } = useNetwork()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log("Fetching unified drops data from both storage and factory sources...");
      
      // Fetch claims from storage (existing method)
      const storageClaims = await getAllClaimsForAllNetworks(networks);
      console.log("Fetched storage drops:", storageClaims.length);
      
      // Fetch claims from factories (new method)
      const factoryClaims = await getAllClaimsFromAllFactories(networks);
      console.log("Fetched factory drops:", factoryClaims.length);

      // Convert all claims to unified format
      const allClaimsUnified = [
        // Storage claims
        ...storageClaims.map(claim => ({
          claimer: claim.claimer,
          faucet: claim.faucet,
          amount: claim.amount,
          networkName: claim.networkName,
          chainId: typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId,
          tokenSymbol: claim.tokenSymbol,
          tokenDecimals: claim.tokenDecimals,
          isEther: claim.isEther,
          timestamp: claim.timestamp,
          source: 'storage'
        })),
        // Factory claims
        ...factoryClaims.map(claim => ({
          claimer: claim.initiator,
          faucet: claim.faucetAddress,
          amount: claim.amount,
          networkName: claim.networkName,
          chainId: claim.chainId,
          tokenSymbol: claim.isEther ? 'ETH' : 'TOKEN',
          tokenDecimals: claim.isEther ? 18 : 18,
          isEther: claim.isEther,
          timestamp: claim.timestamp,
          source: 'factory'
        }))
      ];

      console.log(`Total unified claims: ${allClaimsUnified.length}`);

      // Calculate total claims and unique users from unified data
      const totalClaims = allClaimsUnified.length;
      const uniqueUsers = new Set(
        allClaimsUnified
          .filter(claim => claim.claimer && typeof claim.claimer === 'string' && claim.claimer.startsWith('0x'))
          .map(claim => claim.claimer.toLowerCase())
      );
      const totalUniqueUsers = uniqueUsers.size;

      // Fetch faucets data using the same method as FaucetsCreatedChart
      let totalFaucets = 0;
      await Promise.all(
        networks.map(async (network) => {
          try {
            const faucets = await getFaucetsForNetwork(network)
            totalFaucets += faucets.length
            console.log(`Fetched ${faucets.length} faucets from ${network.name}`)
          } catch (err) {
            console.error(`Error fetching faucets for ${network.name}:`, err)
          }
        })
      )
      
      // Fetch transactions from factory contracts
      let totalTransactions = 0;
      for (const network of networks) {
        if (network?.factoryAddresses) {
          const provider = new ethers.JsonRpcProvider(network.rpcUrl)
          
          for (const factoryAddress of network.factoryAddresses) {
            try {
              const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, provider)
              const transactions = await factoryContract.getAllTransactions()
              totalTransactions += transactions.length
              console.log(`Fetched ${transactions.length} transactions from ${network.name} factory ${factoryAddress}`)
            } catch (err) {
              console.error(`Error fetching transactions from factory ${factoryAddress}:`, err)
            }
          }
        }
      }
      
      // Calculate monthly changes using unified data
      const { claimsLastMonth, usersLastMonth } = getLastMonthData(allClaimsUnified)
      
      // For current month calculations
      const currentMonthClaims = allClaimsUnified.filter(claim => {
        const claimDate = new Date(Number(claim.timestamp) * 1000)
        const now = new Date()
        return claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear()
      }).length
      
      const currentMonthUsers = new Set(
        allClaimsUnified
          .filter(claim => {
            const claimDate = new Date(Number(claim.timestamp) * 1000)
            const now = new Date()
            return claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear()
          })
          .filter(claim => claim.claimer && typeof claim.claimer === 'string' && claim.claimer.startsWith('0x'))
          .map(claim => claim.claimer.toLowerCase())
      ).size
      
      const dashboardData: DashboardData = {
        totalClaims,
        uniqueUsers: totalUniqueUsers,
        totalFaucets,
        totalTransactions,
        unifiedClaims: allClaimsUnified, // Store unified drops for chart components
        monthlyChange: {
          claims: calculateChange(currentMonthClaims, claimsLastMonth),
          users: calculateChange(currentMonthUsers, usersLastMonth),
          faucets: calculateChange(Math.ceil(totalFaucets * 0.1), Math.ceil(totalFaucets * 0.08)), // Estimated
          transactions: calculateChange(Math.ceil(totalTransactions * 0.15), Math.ceil(totalTransactions * 0.12)) // Estimated
        }
      }
      
      console.log("Unified dashboard data:", {
        totalClaims,
        uniqueUsers: totalUniqueUsers,
        totalFaucets,
        totalTransactions
      });
      setData(dashboardData)
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError("Failed to fetch dashboard data")
      
      // Fallback data
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (networks.length > 0) {
      fetchData()
    }
  }, [networks])

  return { data, loading, error, refetch: fetchData }
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

// Stat card component with color-coded change
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

  const isPositive = change?.startsWith('+') && !change.includes('∞')

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

// Provider component
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
  const { data, loading, error, refetch } = useDashboardContext()
  const { networks } = useNetwork()
  
  // Use context data unless props are provided
  const finalData = propData ?? data
  const finalLoading = propLoading ?? loading
  const finalError = propError ?? error

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Data aggregated from all networks
          </p>
          {finalLoading && (
            <div className="flex items-center justify-center md:justify-start mt-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading analytics...</span>
            </div>
          )}
        </div>

        {/* Stats Cards Grid */}
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
                value={finalData?.totalClaims}
                change={finalData?.monthlyChange.claims}
                icon={BarChart3}
                loading={finalLoading}
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