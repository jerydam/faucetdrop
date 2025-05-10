"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useWallet } from "@/hooks/use-wallet"

export function UserSettings() {
  const { disconnect } = useWallet()
  const [notifyClaimActivity, setNotifyClaimActivity] = useState(true)
  const [notifyLowBalance, setNotifyLowBalance] = useState(true)

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifyClaimActivity" className="text-base">
                  Claim Activity
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive notifications when someone claims from your faucet.
                </p>
              </div>
              <Switch id="notifyClaimActivity" checked={notifyClaimActivity} onCheckedChange={setNotifyClaimActivity} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifyLowBalance" className="text-base">
                  Low Balance
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive notifications when your faucet balance is running low.
                </p>
              </div>
              <Switch id="notifyLowBalance" checked={notifyLowBalance} onCheckedChange={setNotifyLowBalance} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button variant="outline" onClick={disconnect}>
              Disconnect Wallet
            </Button>
            <Button variant="outline">Switch Network</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
