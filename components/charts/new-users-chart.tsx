"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { fetchCheckInData } from "@/lib/faucet"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UserData {
  date: string
  newUsers: number
}

export function NewUsersChart() {
  const [data, setData] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { usersByDate, allUsers } = await fetchCheckInData()

      // Track first appearance of each user
      const userFirstSeen: { [user: string]: string } = {}
      const newUsersByDate: { [date: string]: Set<string> } = {}

      // Process all users to find their first appearance date
      Object.entries(usersByDate).forEach(([date, users]) => {
        users.forEach((user) => {
          if (!userFirstSeen[user]) {
            userFirstSeen[user] = date
          } else if (date < userFirstSeen[user]) {
            userFirstSeen[user] = date
          }
        })
      })

      // Group users by their first appearance date
      Object.entries(userFirstSeen).forEach(([user, firstDate]) => {
        if (!newUsersByDate[firstDate]) {
          newUsersByDate[firstDate] = new Set()
        }
        newUsersByDate[firstDate].add(user)
      })

      // Convert to chart data format and sort by date
      const chartData: UserData[] = Object.entries(newUsersByDate)
        .map(([date, users]) => ({
          date,
          newUsers: users.size,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      console.log("New users chart data:", chartData)
      console.log("Total unique users:", allUsers.size)
      setData(chartData)
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const totalNewUsers = data.reduce((sum, item) => sum + item.newUsers, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-bold">{totalNewUsers}</p>
          <p className="text-sm text-muted-foreground">New Users (Celo Network)</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
          <YAxis />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
            formatter={(value) => [value, "New Users"]}
          />
          <Bar dataKey="newUsers" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
