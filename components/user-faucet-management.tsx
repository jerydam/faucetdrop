"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserFaucets } from "@/hooks/use-user-faucets"

export function UserFaucetManagement() {
  const { faucets, isLoading } = useUserFaucets()
  const [selectedFaucet, setSelectedFaucet] = useState("")

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (faucets.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="text-center py-6">
            <h3 className="text-xl font-semibold mb-2">No Faucets Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't created any faucets yet.</p>
            <Button asChild>
              <a href="/dashboard?action=create">Create a Faucet</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedFaucetData = faucets.find((f) => f.address === selectedFaucet)

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Faucet to Manage</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedFaucet} onValueChange={setSelectedFaucet}>
            <SelectTrigger>
              <SelectValue placeholder="Select a faucet" />
            </SelectTrigger>
            <SelectContent>
              {faucets.map((faucet) => (
                <SelectItem key={faucet.address} value={faucet.address}>
                  {faucet.tokenName || "Unknown Token"} ({faucet.address.slice(0, 6)}...{faucet.address.slice(-4)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedFaucet && selectedFaucetData && (
        <Card>
          <CardHeader>
            <CardTitle>Update Claim Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="claimAmount">Claim Amount</Label>
                <Input id="claimAmount" type="number" defaultValue={selectedFaucetData.claimAmount} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Amount of tokens that can be claimed in a single transaction.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  defaultValue={new Date(selectedFaucetData.startTime * 1000).toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">When users can start claiming tokens.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  defaultValue={new Date(selectedFaucetData.endTime * 1000).toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">When the claim window closes.</p>
              </div>

              <Button>Update Parameters</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
