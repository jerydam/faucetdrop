"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useFactory } from "@/hooks/use-factory"
import { useWallet } from "@/hooks/use-wallet"

export function AdminActions() {
  const { isOwner, createFaucet, isLoading } = useFactory()
  const { isConnected } = useWallet()
  const { toast } = useToast()
  const [tokenAddress, setTokenAddress] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCreateFaucet = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a faucet.",
        variant: "destructive",
      })
      return
    }

    if (!tokenAddress) {
      toast({
        title: "Token address required",
        description: "Please enter a valid token address.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const faucetAddress = await createFaucet(tokenAddress)
      toast({
        title: "Faucet created!",
        description: `Your new faucet has been created at ${faucetAddress}.`,
      })
      setTokenAddress("")
    } catch (error: any) {
      toast({
        title: "Creation failed",
        description: error.message || "An error occurred while creating the faucet.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

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

  if (!isOwner) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="text-center py-6">
            <h3 className="text-xl font-semibold mb-2">Admin Access Required</h3>
            <p className="text-gray-500 dark:text-gray-400">
              You need to be the factory owner to access admin features.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Faucet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Create a new faucet for an ERC20 token. You'll need to fund it after creation.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenAddress">Token Address</Label>
              <Input
                id="tokenAddress"
                placeholder="0x..."
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter the contract address of the ERC20 token you want to distribute.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleCreateFaucet} disabled={!tokenAddress || isProcessing}>
            {isProcessing ? "Creating..." : "Create Faucet"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Factory Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                As the factory owner, you can manage global settings and transfer ownership.
              </p>
            </div>
            <div className="space-y-4">
              <Button variant="outline" className="w-full" asChild>
                <a href="/dashboard?action=transfer-ownership">Transfer Ownership</a>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href="/dashboard?action=view-all-faucets">View All Faucets</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
