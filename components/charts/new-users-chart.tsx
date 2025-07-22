"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Contract, JsonRpcProvider } from "ethers"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNetwork } from "@/hooks/use-network"
import { STORAGE_ABI } from "@/lib/abis"

const NETWORKS = {
  celo: {
    chainId: 42220,
    contractAddress: "0x3fC5162779F545Bb4ea7980471b823577825dc8A",
    name: "Celo",
    rpcUrl: "https://forno.celo.org",
    color: "#35D07F",
  },
  // Add more networks as needed
  arbitrum: {
    chainId: 42161,
    contractAddress: "0x6087810cFc24310E85736Cbd500e4c1d5a45E196",
    name: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    color: "#28A0F0",
  },
}

interface UserData {
  date: string
  newUsers: number
}

export function NewUsersChart() {
  const { network } = useNetwork()
  const [data, setData] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalNewUsers, setTotalNewUsers] = useState(0)
  const [totalClaims, setTotalClaims] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const uniqueClaimers = new Set<string>()
      const newUsersByDate: { [date: string]: Set<string> } = {}
      let allClaimsCount = 0

      // Iterate over all networks
      for (const net of Object.values(NETWORKS)) {
        try {
          const provider = new JsonRpcProvider(net.rpcUrl)
          const contract = new Contract(net.contractAddress, STORAGE_ABI, provider)

          // Get all claims from the storage contract
          const allClaims = await contract.getAllClaims()
          console.log(`Fetched ${allClaims.length} claims from ${net.name}`)
          
          allClaimsCount += allClaims.length

          for (const claim of allClaims) {
            const claimer = claim.claimer
            if (claimer && typeof claimer === 'string' && claimer.startsWith('0x')) {
              const claimerLower = claimer.toLowerCase()
              uniqueClaimers.add(claimerLower)
              
              // Convert timestamp to date
              const date = new Date(Number(claim.timestamp) * 1000).toISOString().split('T')[0]
              
              if (!newUsersByDate[date]) {
                newUsersByDate[date] = new Set()
              }
              newUsersByDate[date].add(claimerLower)
            }
          }
        } catch (error) {
          console.error(`Error fetching claims from ${net.name}:`, error)
        }
      }

      // Convert to chart data format and sort by date
      const chartData: UserData[] = Object.entries(newUsersByDate)
        .map(([date, users]) => ({
          date,
          newUsers: users.size,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const totalUnique = uniqueClaimers.size

      console.log("Total claims across all networks:", allClaimsCount)
      console.log("Total unique users:", totalUnique)
      console.log("New users chart data:", chartData)
      
      setData(chartData)
      setTotalNewUsers(totalUnique)
      setTotalClaims(allClaimsCount)
    } catch (error) {
      console.error("Error fetching claimer data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [network])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4 text-center">
         
          <div>
            <p className="text-2xl font-bold">{totalNewUsers}</p>
            <p className="text-sm text-muted-foreground">Unique Users</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
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
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value) => [value, "New Users"]}
            />
            <Bar dataKey="newUsers" fill={network?.color || "#82ca9d"} />
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