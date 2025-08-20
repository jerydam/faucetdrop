"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2, RefreshCw, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const API_BASE_URL = 'https://fauctdrop-backend.onrender.com'

interface ClaimData {
  name: string
  value: number
  color: string
  faucetAddress: string
}

interface FaucetRanking {
  rank: number
  faucetAddress: string
  faucetName: string
  network: string
  chainId: number
  totalClaims: number
  latestClaimTime: number
  totalAmount: string
}

interface ClaimsData {
  total: number
  totalFaucets: number
  chartData: ClaimData[]
  faucetRankings: FaucetRanking[]
  lastUpdated: string
}

export function UserClaimsChart() {
  const [data, setData] = useState<ClaimsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/analytics/claims`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch drops data')
      }
      
      if (result.success && result.data) {
        setData({
          total: result.data.total || 0,
          totalFaucets: result.data.totalFaucets || 0,
          chartData: result.data.chartData || [],
          faucetRankings: result.data.faucetRankings || [],
          lastUpdated: result.cachedAt
        })
      } else {
        throw new Error(result.message || 'No drops data available')
      }
      
    } catch (err) {
      console.error('Error fetching drops data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'celo':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'arbitrum':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'base':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'lisk':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getExplorerUrl = (chainId: number, address: string) => {
    const explorers: Record<number, string> = {
      42220: "https://celoscan.io",
      42161: "https://arbiscan.io", 
      8453: "https://basescan.org",
      1135: "https://blockscout.lisk.com"
    }
    
    const explorerUrl = explorers[chainId]
    return explorerUrl ? `${explorerUrl}/address/${address}` : '#'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm md:text-base">Loading drops data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  // Custom tooltip to show faucet details
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-medium text-sm md:text-base">{data.name}</p>
          {data.faucetAddress !== 'others' && (
            <p className="text-xs md:text-sm text-muted-foreground">
              Address: {data.faucetAddress.slice(0, 6)}...{data.faucetAddress.slice(-4)}
            </p>
          )}
          <p className="text-xs md:text-sm">
            Drops: <span className="font-medium">{data.value.toLocaleString()}</span>
          </p>
          <p className="text-xs md:text-sm text-muted-foreground">
            {((data.value / data.total) * 100).toFixed(1)}% of total drops
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-4">
      {/* Header Section with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-lg md:text-2xl font-bold">{data.total.toLocaleString()}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Total Drops</p>
          </div>
          
        </div>

        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="shrink-0">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Pie Chart - Top 10 Only */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl">Top 10 Faucets by Drops</CardTitle>
            <CardDescription className="text-sm">
              Distribution of drops among top 10 most active faucets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} className="md:h-96">
                <PieChart>
                  <Pie
                    data={data.chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius="80%"
                    dataKey="value"
                  >
                    {data.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p className="text-sm md:text-base">No drop data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Available Faucets Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl">All Available Faucets</CardTitle>
            <CardDescription className="text-sm">
              Complete list ranked by latest activity from all faucets
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-auto">
              {/* Mobile Card View for small screens */}
              <div className="sm:hidden">
                {data.faucetRankings.length > 0 ? (
                  <div className="space-y-3 p-4">
                    {data.faucetRankings.map((item) => (
                      <div key={item.faucetAddress} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">#{item.rank}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate text-sm" title={item.faucetName}>
                                {item.faucetName}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className={`${getNetworkColor(item.network)} text-xs`}>
                            {item.network}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Drops: </span>
                            <span className="font-medium">{item.totalClaims.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Latest: </span>
                            <span>{new Date(item.latestClaimTime * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground">Total: </span>
                          <span className="font-mono">{item.totalAmount}</span>
                        </div>
                        <div className="pt-1">
                          <a
                            href={getExplorerUrl(item.chainId, item.faucetAddress)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on Explorer
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground p-4">
                    <p className="text-sm">No faucet data available yet</p>
                  </div>
                )}
              </div>

              {/* Table View for larger screens */}
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="w-16 text-xs md:text-sm font-medium text-left p-2 md:p-4">Rank</th>
                      <th className="text-xs md:text-sm font-medium text-left p-2 md:p-4">Faucet Name & Address</th>
                      <th className="text-xs md:text-sm font-medium text-left p-2 md:p-4">Network</th>
                      <th className="text-right text-xs md:text-sm font-medium p-2 md:p-4">Drops</th>
                      <th className="text-right text-xs md:text-sm font-medium p-2 md:p-4 hidden lg:table-cell">Total Amount</th>
                      <th className="text-right text-xs md:text-sm font-medium p-2 md:p-4">Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.faucetRankings.length > 0 ? (
                      data.faucetRankings.map((item) => (
                        <tr key={item.faucetAddress} className="border-b hover:bg-muted/50">
                          <td className="font-medium p-2 md:p-4">
                            <div className="flex items-center justify-center">
                              <span className="text-sm font-medium text-muted-foreground">#{item.rank}</span>
                            </div>
                          </td>
                          <td className="p-2 md:p-4">
                            <div className="max-w-[150px] md:max-w-[200px]">
                              <div className="font-medium truncate mb-1 text-xs md:text-sm" title={item.faucetName}>
                                {item.faucetName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.faucetAddress.slice(0, 6)}...{item.faucetAddress.slice(-4)} 
                                <a
                                  href={getExplorerUrl(item.chainId, item.faucetAddress)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline ml-1"
                                > 
                                  <ExternalLink className="h-3 w-3 inline" />
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 md:p-4">
                            <Badge variant="secondary" className={`${getNetworkColor(item.network)} text-xs`}>
                              {item.network}
                            </Badge>
                          </td>
                          <td className="text-right font-medium text-xs md:text-sm p-2 md:p-4">
                            {item.totalClaims.toLocaleString()}
                          </td>
                          <td className="text-right text-xs font-mono p-2 md:p-4 hidden lg:table-cell">
                            {item.totalAmount}
                          </td>
                          <td className="text-right text-xs p-2 md:p-4">
                            {new Date(item.latestClaimTime * 1000).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground p-2 md:p-4">
                          <p className="text-sm">No faucet data available yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        📊 Data served from onchain • Updates automatically
      </div>
    </div>
  )
}