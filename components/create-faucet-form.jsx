"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useFactory } from "@/hooks/use-factory"
import { useWallet } from "@/hooks/use-wallet"

export function CreateFaucetForm() {
  const router = useRouter()
  const { createFaucet } = useFactory()
  const { isConnected, connect } = useWallet()
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
      console.log("Creating faucet with:", {
        tokenAddress,
      })

      const faucetAddress = await createFaucet(tokenAddress)

      toast.success({
        title: "Faucet created!",
        description: `Your new faucet has been created successfully.`,
      })

      // Store in local storage that this user created this faucet
      const userFaucets = JSON.parse(localStorage.getItem("userFaucets") || "[]")
      userFaucets.push({
        address: faucetAddress,
        tokenAddress,
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem("userFaucets", JSON.stringify(userFaucets))

      // Navigate to the faucet details page
      setTimeout(() => {
        router.push(`/faucets/${faucetAddress}`)
      }, 1500)
    } catch (error) {
      console.error("Error creating faucet:", error)
      toast.error({
        title: "Creation failed",
        description: error.message || "An error occurred while creating the faucet.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Faucet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Create a new faucet for an ERC20 token. You'll need to fund it and set parameters after creation.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tokenAddress">Token Address *</Label>
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
        {isConnected ? (
          <Button className="w-full" onClick={handleCreateFaucet} disabled={!tokenAddress || isProcessing}>
            {isProcessing ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                Creating...
              </div>
            ) : (
              "Create Faucet"
            )}
          </Button>
        ) : (
          <Button className="w-full" onClick={connect}>
            Connect Wallet to Create
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
