"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useFaucet } from "@/hooks/use-faucet"
import { useWallet } from "@/hooks/use-wallet"

export function FaucetParametersForm({ faucetAddress }) {
  const router = useRouter()
  const { faucet, tokenDetails, isLoading, setClaimParameters } = useFaucet(faucetAddress)
  const { address: walletAddress, isConnected, connect } = useWallet()
  const { toast } = useToast()

  const [claimAmount, setClaimAmount] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Set initial values from faucet data
  useEffect(() => {
    if (faucet) {
      setClaimAmount(faucet.claimAmount || "")

      // Convert Unix timestamps to datetime-local format
      if (faucet.startTime) {
        const startDate = new Date(faucet.startTime * 1000)
        setStartTime(startDate.toISOString().slice(0, 16))
      }

      if (faucet.endTime) {
        const endDate = new Date(faucet.endTime * 1000)
        setEndTime(endDate.toISOString().slice(0, 16))
      }
    }
  }, [faucet])

  const isOwner = faucet?.owner?.toLowerCase() === walletAddress?.toLowerCase()

  const handleUpdateParameters = async () => {
    if (!isConnected || !isOwner) {
      toast({
        title: "Not authorized",
        description: "Only the faucet owner can update parameters.",
        variant: "destructive",
      })
      return
    }

    if (!claimAmount || Number.parseFloat(claimAmount) <= 0) {
      toast({
        title: "Invalid claim amount",
        description: "Please enter a valid claim amount greater than 0.",
        variant: "destructive",
      })
      return
    }

    if (!startTime || !endTime) {
      toast({
        title: "Time range required",
        description: "Please set both start and end times for the faucet.",
        variant: "destructive",
      })
      return
    }

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (endDate <= startDate) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      await setClaimParameters(
        Number.parseFloat(claimAmount),
        Math.floor(startDate.getTime() / 1000),
        Math.floor(endDate.getTime() / 1000),
      )

      toast({
        title: "Parameters updated!",
        description: `Faucet parameters have been updated successfully.`,
      })

      // Navigate back to the faucet details page
      setTimeout(() => {
        router.push(`/faucets/${faucetAddress}`)
      }, 1500)
    } catch (error) {
      console.error("Error updating parameters:", error)
      toast({
        title: "Update failed",
        description: error.message || "An error occurred while updating parameters.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!faucet) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-6">
            <h3 className="text-xl font-semibold mb-2">Faucet Not Found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              The faucet with address {faucetAddress} could not be found.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-6">
            <h3 className="text-xl font-semibold mb-2">Not Authorized</h3>
            <p className="text-gray-500 dark:text-gray-400">Only the faucet owner can update parameters.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Faucet Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Update the claim parameters for your {tokenDetails.symbol} faucet.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="claimAmount">Claim Amount *</Label>
            <Input
              id="claimAmount"
              type="number"
              placeholder="10"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Amount of tokens that users can claim in a single transaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input id="endTime" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full space-x-4">
          <Button variant="outline" className="flex-1" onClick={() => router.push(`/faucets/${faucetAddress}`)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleUpdateParameters}
            disabled={!claimAmount || !startTime || !endTime || isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                Updating...
              </div>
            ) : (
              "Update Parameters"
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
