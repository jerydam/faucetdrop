// hooks/use-cached-dashboard.ts
"use client"

import { useState, useEffect } from 'react'
import { useNetwork } from "@/hooks/use-network"
import { cacheManager, CACHE_KEYS } from '@/lib/cache'
import { getAllClaimsForAllNetworks, getFaucetsForNetwork } from "@/lib/faucet"
import { Contract, JsonRpcProvider, isAddress } from "ethers"
import { FACTORY_ABI } from "@/lib/abis"

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
  lastUpdated: number
}

interface CacheStatus {
  isFromCache: boolean
  lastUpdated: number | null
  age: number | null
}

export function useCachedDashboard() {
  const { networks } = useNetwork()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isFromCache: false,
    lastUpdated: null,
    age: null
  })

  // Load cached data immediately
  const loadCachedData = () => {
    const cachedData = cacheManager.get<DashboardData>(CACHE_KEYS.DASHBOARD_DATA)
    if (cachedData) {
      setData(cachedData)
      setLoading(false)
      const age = cacheManager.getAge(CACHE_KEYS.DASHBOARD_DATA)
      setCacheStatus({
        isFromCache: true,
        lastUpdated: cachedData.lastUpdated,
        age
      })
      return true
    }
    return false
  }

  // Fetch fresh data from blockchain
  const fetchFreshData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true)
    } else if (!data) {
      setLoading(true)
    }
    
    setError(null)
    
    try {
      console.log("Fetching fresh dashboard data...")
      
      // Parallel data fetching with individual caching
      const [storageClaims, factoryClaims, faucetsData, transactionsData] = await Promise.all([
        fetchStorageClaims(),
        fetchFactoryClaims(), 
        fetchFaucetsData(),
        fetchTransactionsData()
      ])

      // Combine and process data
      const allClaimsUnified = [
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
      ]

      const totalClaims = allClaimsUnified.length
      const uniqueUsers = new Set(
        allClaimsUnified
          .filter(claim => claim.claimer && typeof claim.claimer === 'string' && claim.claimer.startsWith('0x'))
          .map(claim => claim.claimer.toLowerCase())
      ).size

      // Calculate monthly changes
      const monthlyChange = calculateMonthlyChanges(allClaimsUnified, faucetsData.totalFaucets, transactionsData.totalTransactions)

      const freshData: DashboardData = {
        totalClaims,
        uniqueUsers,
        totalFaucets: faucetsData.totalFaucets,
        totalTransactions: transactionsData.totalTransactions,
        unifiedClaims: allClaimsUnified,
        monthlyChange,
        lastUpdated: Date.now()
      }

      // Update state and cache
      setData(freshData)
      cacheManager.set(CACHE_KEYS.DASHBOARD_DATA, freshData, 10 * 60 * 1000) // 10 minutes cache
      
      setCacheStatus({
        isFromCache: false,
        lastUpdated: freshData.lastUpdated,
        age: 0
      })

      console.log("Fresh dashboard data loaded and cached")
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError("Failed to fetch dashboard data")
      
      // If we have cached data, keep showing it
      if (!data) {
        setData({
          totalClaims: 0,
          uniqueUsers: 0,
          totalFaucets: 0,
          totalTransactions: 0,
          unifiedClaims: [],
          monthlyChange: { claims: "+0.0%", users: "+0.0%", faucets: "+0.0%", transactions: "+0.0%" },
          lastUpdated: Date.now()
        })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Helper functions for individual data fetching with caching
  const fetchStorageClaims = async () => {
    const cacheKey = CACHE_KEYS.STORAGE_CLAIMS
    const cached = cacheManager.get(cacheKey)
    
    if (cached && !cacheManager.isExpired(cacheKey)) {
      console.log("Using cached storage claims")
      return cached
    }

    console.log("Fetching fresh storage claims...")
    const claims = await getAllClaimsForAllNetworks(networks)
    cacheManager.set(cacheKey, claims, 5 * 60 * 1000) // 5 min cache
    return claims
  }

  const fetchFactoryClaims = async () => {
    const cacheKey = CACHE_KEYS.FACTORY_CLAIMS
    const cached = cacheManager.get(cacheKey)
    
    if (cached && !cacheManager.isExpired(cacheKey)) {
      console.log("Using cached factory claims")
      return cached
    }

    console.log("Fetching fresh factory claims...")
    const claims = await getAllClaimsFromAllFactories(networks)
    cacheManager.set(cacheKey, claims, 5 * 60 * 1000) // 5 min cache
    return claims
  }

  const fetchFaucetsData = async () => {
    let totalFaucets = 0
    
    await Promise.all(
      networks.map(async (network) => {
        const cacheKey = CACHE_KEYS.NETWORK_FAUCETS(network.chainId)
        let faucets = cacheManager.get(cacheKey)
        
        if (!faucets || cacheManager.isExpired(cacheKey)) {
          try {
            faucets = await getFaucetsForNetwork(network)
            cacheManager.set(cacheKey, faucets, 10 * 60 * 1000) // 10 min cache
          } catch (err) {
            console.error(`Error fetching faucets for ${network.name}:`, err)
            faucets = []
          }
        }
        
        totalFaucets += faucets.length
      })
    )
    
    return { totalFaucets }
  }

  const fetchTransactionsData = async () => {
    let totalTransactions = 0
    
    for (const network of networks) {
      const cacheKey = CACHE_KEYS.NETWORK_TRANSACTIONS(network.chainId)
      let networkTransactions = cacheManager.get(cacheKey)
      
      if (!networkTransactions || cacheManager.isExpired(cacheKey)) {
        try {
          if (network?.factoryAddresses) {
            const provider = new JsonRpcProvider(network.rpcUrl)
            let networkTotal = 0
            
            for (const factoryAddress of network.factoryAddresses) {
              try {
                const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider)
                const transactions = await factoryContract.getAllTransactions()
                networkTotal += transactions.length
              } catch (err) {
                console.error(`Error fetching transactions from factory ${factoryAddress}:`, err)
              }
            }
            networkTransactions = networkTotal
            cacheManager.set(cacheKey, networkTransactions, 10 * 60 * 1000) // 10 min cache
          } else {
            networkTransactions = 0
          }
        } catch (err) {
          console.error(`Error fetching transactions for ${network.name}:`, err)
          networkTransactions = 0
        }
      }
      
      totalTransactions += networkTransactions
    }
    
    return { totalTransactions }
  }

  // Initialize - load cached data first, then fetch fresh data
  useEffect(() => {
    if (networks.length === 0) return

    const hasCachedData = loadCachedData()
    
    // Always fetch fresh data, but don't show loading if we have cached data
    if (!hasCachedData || cacheManager.isExpired(CACHE_KEYS.DASHBOARD_DATA)) {
      fetchFreshData()
    } else {
      // We have valid cached data, but fetch fresh data in background
      setTimeout(() => fetchFreshData(), 1000) // Small delay to show cached data first
    }
  }, [networks])

  const manualRefresh = () => {
    // Clear cache and fetch fresh data
    cacheManager.delete(CACHE_KEYS.DASHBOARD_DATA)
    fetchFreshData(true)
  }

  return {
    data,
    loading,
    refreshing,
    error,
    cacheStatus,
    refresh: manualRefresh
  }
}

// Function to get all claims from factories
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

// Helper function to get claims from factories for a single network
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

    console.log(`Total claims fetched from ${network.name} factories: ${result.totalClaims}`);
    return result;
  } catch (error: any) {
    console.error(`Error fetching claims from factories on ${network.name}:`, error);
    throw new Error(error.message || "Failed to fetch claims from factories");
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

function calculateMonthlyChanges(claims: any[], totalFaucets: number, totalTransactions: number) {
  // Calculate monthly changes using unified data
  const { claimsLastMonth, usersLastMonth } = getLastMonthData(claims)
  
  // For current month calculations
  const currentMonthClaims = claims.filter(claim => {
    const claimDate = new Date(Number(claim.timestamp) * 1000)
    const now = new Date()
    return claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear()
  }).length
  
  const currentMonthUsers = new Set(
    claims
      .filter(claim => {
        const claimDate = new Date(Number(claim.timestamp) * 1000)
        const now = new Date()
        return claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear()
      })
      .filter(claim => claim.claimer && typeof claim.claimer === 'string' && claim.claimer.startsWith('0x'))
      .map(claim => claim.claimer.toLowerCase())
  ).size
  
  return {
    claims: calculateChange(currentMonthClaims, claimsLastMonth),
    users: calculateChange(currentMonthUsers, usersLastMonth),
    faucets: calculateChange(Math.ceil(totalFaucets * 0.1), Math.ceil(totalFaucets * 0.08)), // Estimated
    transactions: calculateChange(Math.ceil(totalTransactions * 0.15), Math.ceil(totalTransactions * 0.12)) // Estimated
  }
}