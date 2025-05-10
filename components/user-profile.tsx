"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@/hooks/use-wallet"

export function UserProfile() {
  const { address, isConnected } = useWallet()

  if (!isConnected) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="text-center py-6">
            <h3 className="text-xl font-semibold mb-2">Wallet Not Connected</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Please connect your wallet to view your profile.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="walletAddress">Wallet Address</Label>
            <Input id="walletAddress" value={address} readOnly className="font-mono" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input id="displayName" placeholder="Enter a display name" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This name is stored locally and only visible to you.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your email is stored locally and used for notifications only.
            </p>
          </div>

          <Button>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  )
}
