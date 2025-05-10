"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"

export function DashboardOverview() {
  const { stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array(3)
          .fill(0)
          .map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Faucets Created</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalFaucets}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{stats.activeFaucets} active faucets</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Tokens Claimed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalClaimed}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Across {stats.claimCount} claims</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Funds Contributed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalFunded}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Current balance: {stats.currentBalance}</p>
        </CardContent>
      </Card>
    </div>
  )
}
