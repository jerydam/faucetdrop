"use client"

import { useEffect, useState } from "react"
import { Contract, JsonRpcProvider } from "ethers"
import { CHECKIN_ABI } from "@/lib/abis"
import { Loader2, Activity } from "lucide-react"

const NETWORKS = {
  celo: {
    chainId: 42220, // Celo Mainnet
    contractAddress: "0x71C00c430ab70a622dc0b2888C4239cab9F244b0",
    name: "Celo",
    rpcUrl: "https://forno.celo.org",
    color: "#35D07F",
  },
  lisk: {
    chainId: 1135, // Lisk Mainnet
    contractAddress: "0x0995C06E2fb2d059F3534608176858406f6bE95F",
    name: "Lisk",
    rpcUrl: "https://rpc.api.lisk.com",
    color: "#0D4477",
  },
}

interface NetworkStats {
  name: string
  totalCheckIns: number
  color: string
}

export function TransactionsPerDayChart() {
  const [networkStats, setNetworkStats] = useState<NetworkStats[]>([])
  const [loading, setLoading] = useState(true)
  const [totalTransactions, setTotalTransactions] = useState(0)

  useEffect(() => {
    const fetchTotalCheckIns = async () => {
      setLoading(true)
      try {
        const stats: NetworkStats[] = []
        let grandTotal = 0

        for (const [key, network] of Object.entries(NETWORKS)) {
          try {
            const provider = new JsonRpcProvider(network.rpcUrl)
            const contract = new Contract(network.contractAddress, CHECKIN_ABI, provider)

            const totalCheckIns = await contract.totalCheckIns()
            const checkInCount = Number(totalCheckIns)

            stats.push({
              name: network.name,
              totalCheckIns: checkInCount,
              color: network.color,
            })

            grandTotal += checkInCount

            console.log(`${network.name} total check-ins:`, checkInCount)
          } catch (error) {
            console.error(`Error fetching data for ${network.name}:`, error)
            stats.push({
              name: network.name,
              totalCheckIns: 0,
              color: network.color,
            })
          }
        }

        setNetworkStats(stats)
        setTotalTransactions(grandTotal)
      } catch (error) {
        console.error("Error fetching total check-ins:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTotalCheckIns()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-4xl font-bold text-primary">{totalTransactions.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">Total Check-ins Across All Networks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {networkStats.map((network) => (
          <div
            key={network.name}
            className="p-4 rounded-lg border bg-card"
            style={{ borderLeftColor: network.color, borderLeftWidth: "4px" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" style={{ color: network.color }} />
                <h3 className="font-semibold">{network.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{network.totalCheckIns.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">check-ins</p>
              </div>
            </div>

            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: network.color,
                    width: `${totalTransactions > 0 ? (network.totalCheckIns / totalTransactions) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalTransactions > 0 ? ((network.totalCheckIns / totalTransactions) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalTransactions === 0 && (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No check-ins recorded yet</p>
        </div>
      )}
    </div>
  )
}
