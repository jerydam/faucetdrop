"use client"

import { useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { claimViaBackend } from "@/lib/backend-service"
import { Users } from "lucide-react"
// Add the useNetwork import
import { useNetwork } from "@/hooks/use-network"

interface BatchClaimProps {
  faucetAddress: string
}

// Update the BatchClaim component to include network checking
export function BatchClaim({ faucetAddress }: BatchClaimProps) {
  const { toast } = useToast()
  const { address, ensureCorrectNetwork } = useWallet()
  const { network } = useNetwork()
  const [addresses, setAddresses] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleBatchClaim = async () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to process batch claims",
        variant: "destructive",
      })
      return
    }

    // Ensure we're on the correct network
    if (network) {
      const isCorrectNetwork = await ensureCorrectNetwork(network.chainId)
      if (!isCorrectNetwork) return
    }

    const addressList = addresses
      .split(/[\n,]/)
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0 && addr.startsWith("0x"))

    if (addressList.length === 0) {
      toast({
        title: "No valid addresses",
        description: "Please enter at least one valid Ethereum address",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    let successCount = 0
    let failCount = 0

    try {
      // Process each address sequentially
      for (const userAddress of addressList) {
        try {
          await claimViaBackend(userAddress, faucetAddress)
          successCount++
        } catch (error) {
          console.error(`Error claiming for ${userAddress}:`, error)
          failCount++
        }
      }

      toast({
        title: "Batch claim processed",
        description: `Successfully claimed for ${successCount} addresses. Failed: ${failCount}`,
        variant: successCount > 0 ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Error in batch claim:", error)
      toast({
        title: "Batch claim failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Claim</CardTitle>
        <CardDescription>Claim tokens for multiple addresses at once</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Enter addresses (one per line or comma separated)"
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              rows={5}
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground">
              Enter Ethereum addresses to claim tokens for. The backend will process these claims.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleBatchClaim} disabled={isProcessing || !address || !addresses.trim()}>
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              Process Batch Claim
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
