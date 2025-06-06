"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { useNetwork } from "@/hooks/use-network"
import { getFaucetsForNetwork } from "@/lib/faucet"
import { Loader2 } from "lucide-react"

interface ChartData {
  name: string
  value: number
  color: string
}

export function FaucetsCreatedChart() {
  const { networks } = useNetwork()
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFaucetData = async () => {
      setLoading(true)
      try {
        const chartData: ChartData[] = []

        for (const network of networks) {
          const faucets = await getFaucetsForNetwork(network)
          chartData.push({
            name: network.name,
            value: faucets.length,
            color: network.color,
          })
        }

        setData(chartData)
      } catch (error) {
        console.error("Error fetching faucet data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFaucetData()
  }, [networks])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const totalFaucets = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-2xl font-bold">{totalFaucets}</p>
        <p className="text-sm text-muted-foreground">Total Faucets Created</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
