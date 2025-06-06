"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { fetchStorageData } from "@/lib/faucet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ClaimData {
  faucetName: string
  claims: number
  network: string
}

export function UserClaimsChart() {
  const [data, setData] = useState<ClaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFaucet, setSelectedFaucet] = useState<string>("all")
  const [availableFaucets, setAvailableFaucets] = useState<string[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const allClaims = await fetchStorageData()

      console.log(`Fetched ${allClaims.length} total claims from storage contract`)

      // Group claims by faucet
      const claimsByFaucet: { [key: string]: number } = {}
      const faucetSet = new Set<string>()

      for (const claim of allClaims) {
        const faucetKey = claim.faucet
        faucetSet.add(faucetKey)
        claimsByFaucet[faucetKey] = (claimsByFaucet[faucetKey] || 0) + 1
      }

      setAvailableFaucets(Array.from(faucetSet))

      // Convert to chart data format
      const chartData: ClaimData[] = []

      if (selectedFaucet === "all") {
        // Show top 10 faucets by claims
        const sortedFaucets = Object.entries(claimsByFaucet)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)

        for (const [faucet, claims] of sortedFaucets) {
          chartData.push({
            faucetName: `${faucet.slice(0, 6)}...${faucet.slice(-4)}`,
            claims,
            network: "Celo",
          })
        }
      } else {
        // Show specific faucet
        const claims = claimsByFaucet[selectedFaucet] || 0
        chartData.push({
          faucetName: `${selectedFaucet.slice(0, 6)}...${selectedFaucet.slice(-4)}`,
          claims,
          network: "Celo",
        })
      }

      console.log("Claims chart data:", chartData)
      setData(chartData)
    } catch (error) {
      console.error("Error fetching claim data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedFaucet])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const totalClaims = data.reduce((sum, item) => sum + item.claims, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-bold">{totalClaims}</p>
          <p className="text-sm text-muted-foreground">Total Claims (Celo Network)</p>
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

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="faucetName" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="claims" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
