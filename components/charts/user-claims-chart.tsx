"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, Trophy, Medal, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ethers } from "ethers"
import { STORAGE_ABI } from "@/lib/abis"
import { useNetwork } from "@/hooks/use-network"

// Define the structure for network config
interface NetworkConfig {
  contractAddress: string
  rpcUrl: string
  name: string
}

// Define NETWORK_CONFIG with storage contract addresses
const NETWORK_CONFIG: { [key: number]: NetworkConfig } = {
  42220: {
    // Celo Mainnet
    contractAddress: "0x3fC5162779F545Bb4ea7980471b823577825dc8A",
    rpcUrl: "https://forno.celo.org",
    name: "Celo"
  },
  1135: {
    // Custom chain or testnet
    contractAddress: "0xc5f8c2A85520c0A3595C29e004b2f5D9e7CE3b0B",    
    rpcUrl: "https://mainnet.base.org/", // Replace with actual RPC URL
    name: "Custom Chain"
  },
  42161: {
    // Arbitrum One
    contractAddress: "0x6087810cFc24310E85736Cbd500e4c1d5a45E196", 
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    name: "Arbitrum"
  },
}

interface ClaimData {
  name: string
  value: number
  color: string
  faucetAddress: string
}

interface FaucetLeaderboard {
  rank: number
  faucetAddress: string
  claims: number
  network: string
  percentage: number
}

export function UserClaimsChart() {
  const { network } = useNetwork()
  const [data, setData] = useState<ClaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFaucet, setSelectedFaucet] = useState<string>("all")
  const [availableFaucets, setAvailableFaucets] = useState<string[]>([])
  const [totalClaims, setTotalClaims] = useState(0)
  const [uniqueUsers, setUniqueUsers] = useState(0)
  const [leaderboard, setLeaderboard] = useState<FaucetLeaderboard[]>([])

  // Define colors for the pie chart
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#a4de6c", "#d0ed57", "#83a6ed", "#8dd1e1", "#a4de6c", "#d0ed57"]

  const fetchData = async () => {
    setLoading(true)
    try {
      let allClaims: any[] = []
      const claimsByFaucet: { [key: string]: { claims: number, network: string } } = {}
      const faucetSet = new Set<string>()
      const uniqueClaimers = new Set<string>()
      let totalClaimsCount = 0

      // Fetch from all networks if "all" is selected, otherwise just current network
      const networksToFetch = selectedFaucet === "all" 
        ? Object.entries(NETWORK_CONFIG)
        : network?.chainId 
          ? [[network.chainId.toString(), NETWORK_CONFIG[network.chainId]]]
          : Object.entries(NETWORK_CONFIG)

      for (const [chainId, config] of networksToFetch) {
        if (!config) continue

        try {
          const provider = new ethers.JsonRpcProvider(config.rpcUrl)
          const contract = new ethers.Contract(config.contractAddress, STORAGE_ABI, provider)

          const claims = await contract.getAllClaims()
          console.log(`Fetched ${claims.length} claims from ${config.name}`)
          
          allClaims = [...allClaims, ...claims]
          totalClaimsCount += claims.length

          for (const claim of claims) {
            // Add to unique claimers
            uniqueClaimers.add(claim.claimer.toLowerCase())
            
            // Group by faucet with network info
            const faucetKey = claim.faucet.toLowerCase()
            faucetSet.add(faucetKey)
            
            if (!claimsByFaucet[faucetKey]) {
              claimsByFaucet[faucetKey] = { claims: 0, network: config.name }
            }
            claimsByFaucet[faucetKey].claims += 1
          }
        } catch (error) {
          console.error(`Error fetching from ${config.name}:`, error)
        }
      }

      setTotalClaims(totalClaimsCount)
      setUniqueUsers(uniqueClaimers.size)
      setAvailableFaucets(Array.from(faucetSet))

      // Create leaderboard data - show ALL faucets
      const leaderboardData: FaucetLeaderboard[] = Object.entries(claimsByFaucet)
        .sort(([, a], [, b]) => b.claims - a.claims)
        .map(([faucet, data], index) => ({
          rank: index + 1,
          faucetAddress: faucet,
          claims: data.claims,
          network: data.network,
          percentage: (data.claims / totalClaimsCount) * 100
        }))

      setLeaderboard(leaderboardData)

      // Convert to chart data format
      const chartData: ClaimData[] = []

      if (selectedFaucet === "all") {
        // Show top 10 faucets by claims
        const sortedFaucets = Object.entries(claimsByFaucet)
          .sort(([, a], [, b]) => b.claims - a.claims)
          .slice(0, 10)

        sortedFaucets.forEach(([faucet, data], index) => {
          chartData.push({
            name: `Faucet ${index + 1}`, // Generic name instead of address
            value: data.claims,
            color: COLORS[index % COLORS.length],
            faucetAddress: faucet
          })
        })
      } else {
        // Show specific faucet
        const faucetData = claimsByFaucet[selectedFaucet.toLowerCase()]
        if (faucetData) {
          chartData.push({
            name: "Selected Faucet",
            value: faucetData.claims,
            color: COLORS[0],
            faucetAddress: selectedFaucet
          })
        }
      }

      console.log("Claims chart data:", chartData)
      console.log("Total claims:", totalClaimsCount)
      console.log("Unique users:", uniqueClaimers.size)
      console.log("Leaderboard:", leaderboardData)
      setData(chartData)
    } catch (error) {
      console.error("Error fetching claim data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedFaucet, network])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
    }
  }

  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'celo':
        return 'bg-green-100 text-green-800'
      case 'arbitrum':
        return 'bg-blue-100 text-blue-800'
      case 'custom chain':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Custom tooltip to show faucet address
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Address: {data.faucetAddress.slice(0, 6)}...{data.faucetAddress.slice(-4)}
          </p>
          <p className="text-sm">
            Claims: <span className="font-medium">{data.value.toLocaleString()}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalClaims}</p>
            <p className="text-sm text-muted-foreground">Total Claims</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{uniqueUsers}</p>
            <p className="text-sm text-muted-foreground">Unique Users</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedFaucet} onValueChange={setSelectedFaucet}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select faucet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Faucets (Top 10)</SelectItem>
              {availableFaucets.map((faucet) => (
                <SelectItem key={faucet} value={faucet}>
                  {`${faucet.slice(0, 6)}...${faucet.slice(-4)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Claims Distribution</CardTitle>
            <CardDescription>
              {selectedFaucet === "all" ? "Top 10 faucets by claims" : "Selected faucet claims"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No claim data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle>Faucet Leaderboard</CardTitle>
            <CardDescription>
              All faucets across networks ({leaderboard.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Faucet</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead className="text-right">Claims</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((item) => (
                    <TableRow key={item.faucetAddress}>
                      <TableCell className="font-medium">
                        <div className="flex items-center justify-center">
                          {getRankIcon(item.rank)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.faucetAddress.slice(0, 6)}...{item.faucetAddress.slice(-4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getNetworkColor(item.network)}>
                          {item.network}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.claims.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.percentage.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}