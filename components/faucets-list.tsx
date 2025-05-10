"use client"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useFaucets } from "@/hooks/use-faucets"

export function FaucetsList() {
  const { faucets, isLoading } = useFaucets()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {Array(6)
          .fill(0)
          .map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex space-x-2 mb-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
              </CardContent>
              <CardFooter className="border-t p-6">
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
      </div>
    )
  }

  if (faucets.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">No faucets found</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">There are no faucets matching your criteria.</p>
        <Button asChild>
          <Link href="/dashboard">Create a Faucet</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {faucets.map((faucet) => (
        <Card key={faucet.address}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{faucet.tokenName || "Unknown Token"}</h3>
              <Badge variant={faucet.isActive ? "default" : "secondary"}>
                {faucet.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Token Address:</span>
                <span className="font-mono">
                  {faucet.tokenAddress.slice(0, 6)}...{faucet.tokenAddress.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Claim Amount:</span>
                <span>{faucet.claimAmount} tokens</span>
              </div>
              <div className="flex justify-between">
                <span>Balance:</span>
                <span>{faucet.balance} tokens</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t p-6">
            <Button asChild className="w-full">
              <Link href={`/faucets/${faucet.address}`}>View Details</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
