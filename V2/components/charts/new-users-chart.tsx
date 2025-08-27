
"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Contract, JsonRpcProvider, isAddress } from "ethers"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNetwork } from "@/hooks/use-network"
import { getAllClaimsForAllNetworks } from "@/lib/faucet"
import { useBackgroundSync } from "@/hooks/use-background-sync"
import { 
  saveToDatabase, 
  loadFromDatabase, 
  isCacheValid,
  clearExpiredCache 
} from "@/lib/database-helpers"

// Factory ABI for fetching factory claims
const FACTORY_ABI = [
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

// Database keys for unique users data
const UNIQUE_USERS_STORAGE_KEYS = {
  USERS_DATA: 'unique_users_data',
  CHART_DATA: 'users_chart_data',
  TOTAL_USERS: 'total_unique_users',
};

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
      console.log(`Fetching claims from factories on ${network.name}...`);
      
      const provider = new JsonRpcProvider(network.rpcUrl);
      const { transactions } = await getAllClaimsFromFactories(provider, network);
      
      const networkClaims = transactions.map(claim => ({
        ...claim,
        networkName: network.name,
        chainId: network.chainId
      }));
      
      allClaims.push(...networkClaims);
      console.log(`Added ${networkClaims.length} claims from ${network.name}`);
    } catch (error) {
      console.error(`Error fetching claims from ${network.name}:`, error);
    }
  }

  allClaims.sort((a, b) => b.timestamp - a.timestamp);
  return allClaims;
}

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

    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
        continue;
      }

      const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider);

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

    console.log(`Total claims fetched from ${network.name} factories: ${result.totalClaims}`);
    return result;
  } catch (error: any) {
    console.error(`Error fetching claims from factories on ${network.name}:`, error);
    throw new Error(error.message || "Failed to fetch claims from factories");
  }
}

interface UserData {
  date: string
  newUsers: number
  cumulativeUsers: number
}

async function processAndCacheUsersData(allClaimsUnified: any[]): Promise<{
  chartData: UserData[]
  totalUniqueUsers: number
  totalClaims: number
}> {
  console.log(`Processing ${allClaimsUnified.length} unified claims for users data...`);

  const uniqueClaimers = new Set<string>();
  const userFirstClaimDate: { [user: string]: string } = {};
  const newUsersByDate: { [date: string]: Set<string> } = {};
  const allClaimsCount = allClaimsUnified.length;

  // Process all unified claims to find first claim date for each user
  for (const claim of allClaimsUnified) {
    const claimer = claim.claimer || claim.initiator;
    if (claimer && typeof claimer === 'string' && claimer.startsWith('0x')) {
      const claimerLower = claimer.toLowerCase();
      uniqueClaimers.add(claimerLower);
      
      // Convert timestamp to date
      const date = new Date(Number(claim.timestamp) * 1000).toISOString().split('T')[0];
      
      // Track the first date this user made a claim
      if (!userFirstClaimDate[claimerLower] || date < userFirstClaimDate[claimerLower]) {
        userFirstClaimDate[claimerLower] = date;
      }
    }
  }

  // Group users by their first claim date
  for (const [user, firstDate] of Object.entries(userFirstClaimDate)) {
    if (!newUsersByDate[firstDate]) {
      newUsersByDate[firstDate] = new Set();
    }
    newUsersByDate[firstDate].add(user);
  }

  // Convert to chart data format and sort by date
  const sortedDates = Object.keys(newUsersByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  let cumulativeUsers = 0;
  const chartData: UserData[] = sortedDates.map(date => {
    const newUsersCount = newUsersByDate[date].size;
    cumulativeUsers += newUsersCount;
    
    return {
      date,
      newUsers: newUsersCount,
      cumulativeUsers: cumulativeUsers
    };
  });

  const totalUniqueUsers = uniqueClaimers.size;

  // Save all data to database
  await Promise.all([
    saveToDatabase(UNIQUE_USERS_STORAGE_KEYS.CHART_DATA, chartData),
    saveToDatabase(UNIQUE_USERS_STORAGE_KEYS.TOTAL_USERS, totalUniqueUsers),
    saveToDatabase("total_claim", allClaimsCount),
    saveToDatabase(UNIQUE_USERS_STORAGE_KEYS.USERS_DATA, Array.from(uniqueClaimers))
  ])

  console.log("Cached users data to database:", {
    totalClaims: allClaimsCount,
    totalUniqueUsers: totalUniqueUsers,
    chartDataPoints: chartData.length
  });

  return {
    chartData,
    totalUniqueUsers,
    totalClaims: allClaimsCount
  };
}

// Export function to get cached unique users data (for dashboard)
export async function getCachedUniqueUsersData(): Promise<{
  totalUniqueUsers: number
  chartData: UserData[]
  isValid: boolean
}> {
  const isValid = await isCacheValid(UNIQUE_USERS_STORAGE_KEYS.CHART_DATA)
  
  if (!isValid) {
    return {
      totalUniqueUsers: 0,
      chartData: [],
      isValid: false
    };
  }

  const [totalUniqueUsers, chartData] = await Promise.all([
    loadFromDatabase<number>(UNIQUE_USERS_STORAGE_KEYS.TOTAL_USERS),
    loadFromDatabase<UserData[]>(UNIQUE_USERS_STORAGE_KEYS.CHART_DATA)
  ])

  return {
    totalUniqueUsers: totalUniqueUsers || 0,
    chartData: chartData || [],
    isValid: true
  };
}

export function NewUsersChart() {
  const { networks } = useNetwork()
  const [data, setData] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalNewUsers, setTotalNewUsers] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Background sync setup
  const backgroundSync = useBackgroundSync({
    syncKey: 'new_users_data',
    fetchFunction: fetchData,
    interval: 5 * 60 * 1000,
    onSuccess: (data) => {
      console.log('New users background sync completed')
      setLastUpdated(new Date())
    },
    onError: (error) => {
      console.error('New users background sync failed:', error)
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
      const cachedData = await getCachedUniqueUsersData();
      if (cachedData.isValid && cachedData.chartData.length > 0) {
        console.log('Loading cached users data from database');
        setData(cachedData.chartData);
        setTotalNewUsers(cachedData.totalUniqueUsers);
        setLoading(false);
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.warn('Failed to load cached user data:', error)
    }
  }

  const loadDataIfNeeded = async () => {
    const isValid = await isCacheValid(UNIQUE_USERS_STORAGE_KEYS.CHART_DATA)
    if (!isValid) {
      console.log('User data cache invalid or expired, fetching fresh data')
      await fetchData()
    }
  }

  async function fetchData(): Promise<any> {
    try {
      console.log("Fetching fresh claims data for users analysis...");
      
      // Fetch claims from storage (existing method)
      const storageClaims = await getAllClaimsForAllNetworks(networks);
      console.log("Fetched storage claims:", storageClaims.length);
      
      // Fetch claims from factories (new method)
      const factoryClaims = await getAllClaimsFromAllFactories(networks);
      console.log("Fetched factory claims:", factoryClaims.length);

      // Convert all claims to unified format
      const allClaimsUnified = [
        // Storage claims
        ...storageClaims.map(claim => ({
          claimer: claim.claimer,
          timestamp: claim.timestamp,
          networkName: claim.networkName,
        })),
        // Factory claims
        ...factoryClaims.map(claim => ({
          claimer: claim.initiator,
          timestamp: claim.timestamp,
          networkName: claim.networkName,
        }))
      ];

      console.log(`Total unified claims: ${allClaimsUnified.length}`);

      // Process and cache the data
      const { chartData, totalUniqueUsers, totalClaims: totalClaimsCount } = await processAndCacheUsersData(allClaimsUnified);

      console.log("Users analysis complete:", {
        totalClaims: totalClaimsCount,
        totalUniqueUsers: totalUniqueUsers,
        chartDataPoints: chartData.length
      });
      
      setData(chartData);
      setTotalNewUsers(totalUniqueUsers);
      setLastUpdated(new Date())

      return { chartData, totalUniqueUsers, totalClaimsCount }
    } catch (error) {
      console.error("Error fetching claimer data:", error);
      throw error
    }
  }

  const handleManualRefresh = async () => {
    setLoading(true)
    try {
      await fetchData()
    } catch (error) {
      console.error('Manual refresh failed:', error)
      // Try to load cached data as fallback
      const cachedData = await getCachedUniqueUsersData();
      if (cachedData.chartData.length > 0) {
        console.log('Using cached data as fallback');
        setData(cachedData.chartData);
        setTotalNewUsers(cachedData.totalUniqueUsers);
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
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalNewUsers.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Unique Users</p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
    </div>
  )
}