"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useFaucet } from "@/hooks/use-faucet"
import { useWallet } from "@/hooks/use-wallet"

export function FaucetActions({ address }) {
  const router = useRouter()
  const { faucet, tokenDetails, isLoading, hasClaimed, claim, fund, withdraw } = useFaucet(address)
  const { address: walletAddress, isConnected, connect } = useWallet()
  const { toast } = useToast()
  const [fundAmount, setFundAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const isOwner = faucet?.owner?.toLowerCase() === walletAddress?.toLowerCase()

  const handleClaim = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to claim tokens.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      await claim()
      // Success toast is handled in the hook
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (error) {
      // Most error handling is now in the hook, but we can add additional UI feedback here
      console.error("Claim error in component:", error)
      // We don't need to show another toast since the hook already does that
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFund = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to fund this faucet.",
        variant: "destructive",
      })
      return
    }

    if (!fundAmount || Number.parseFloat(fundAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to fund.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      await fund(Number.parseFloat(fundAmount))
      // Success toast is handled in the hook
      setFundAmount("")
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (error) {
      // Error toast is handled in the hook
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWithdraw = async () => {
    if (!isConnected || !isOwner) {
      toast({
        title: "Not authorized",
        description: "Only the faucet owner can withdraw tokens.",
        variant: "destructive",
      })
      return
    }

    if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to withdraw.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      await withdraw(Number.parseFloat(withdrawAmount))
      // Success toast is handled in the hook
      setWithdrawAmount("")
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (error) {
      // Error toast is handled in the hook
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg mt-4">
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      </div>
    )
  }

  if (!faucet) {
    return (
      <div className="p-4 border rounded-lg mt-4">
        <div className="text-center py-6">
          <h3 className="text-xl font-semibold mb-2">Faucet Not Found</h3>
          <p className="text-gray-500 dark:text-gray-400">The faucet with address {address} could not be found.</p>
        </div>
      </div>
    )
  }

  // If not owner, only show claim card
  if (!isOwner) {
    return (
      <div className="grid grid-cols-1 gap-6 p-4 border rounded-lg mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Claim Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Claim {faucet.claimAmount} {tokenDetails.symbol} from this faucet.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Claim Status:</span>
                  <span>
                    {hasClaimed ? (
                      <span className="text-red-500">Already Claimed</span>
                    ) : faucet.isActive ? (
                      <span className="text-green-500">Available</span>
                    ) : (
                      <span className="text-yellow-500">Not Active</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Faucet Balance:</span>
                  <span>
                    {faucet.balance} {tokenDetails.symbol}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {isConnected ? (
              <Button
                className="w-full"
                onClick={handleClaim}
                disabled={
                  !faucet.isActive || hasClaimed || isProcessing || Number(faucet.balance) < Number(faucet.claimAmount)
                }
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                    Processing...
                  </div>
                ) : (
                  "Claim Tokens"
                )}
              </Button>
            ) : (
              <Button className="w-full" onClick={connect}>
                Connect Wallet to Claim
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Owner view with all options
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Claim Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Claim {faucet.claimAmount} {tokenDetails.symbol} from this faucet.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Claim Status:</span>
                <span>
                  {hasClaimed ? (
                    <span className="text-red-500">Already Claimed</span>
                  ) : faucet.isActive ? (
                    <span className="text-green-500">Available</span>
                  ) : (
                    <span className="text-yellow-500">Not Active</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Faucet Balance:</span>
                <span>
                  {faucet.balance} {tokenDetails.symbol}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleClaim}
            disabled={
              !faucet.isActive || hasClaimed || isProcessing || Number(faucet.balance) < Number(faucet.claimAmount)
            }
          >
            {isProcessing ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                Processing...
              </div>
            ) : (
              "Claim Tokens"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fund Faucet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add {tokenDetails.symbol} tokens to this faucet to make them available for others to claim.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundAmount">Amount to Fund</Label>
              <Input
                id="fundAmount"
                type="number"
                placeholder="Enter amount"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleFund}
            disabled={!fundAmount || Number.parseFloat(fundAmount) <= 0 || isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                Processing...
              </div>
            ) : (
              "Fund Faucet"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Owner Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                As the owner of this faucet, you can withdraw tokens or update claim parameters.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawAmount">Amount to Withdraw</Label>
              <Input
                id="withdrawAmount"
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={
                  !withdrawAmount ||
                  Number.parseFloat(withdrawAmount) <= 0 ||
                  isProcessing ||
                  Number.parseFloat(withdrawAmount) > Number(faucet.balance)
                }
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                    Processing...
                  </div>
                ) : (
                  "Withdraw Tokens"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to withdraw {withdrawAmount} {tokenDetails.symbol} tokens from this faucet. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleWithdraw}>Withdraw</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" asChild>
            <a href={`/manage-parameters/${faucet.address}`}>Manage Parameters</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
