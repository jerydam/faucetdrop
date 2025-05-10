"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink } from "lucide-react"
import { useFaucet } from "@/hooks/use-faucet"

export function FaucetDetails({ address }: { address: string }) {
  const { faucet, isLoading } = useFaucet(address)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="space-y-4">
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="flex justify-between">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ))}
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
            <p className="text-gray-500 dark:text-gray-400">The faucet with address {address} could not be found.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold">{faucet.tokenName || "Unknown Token"}</h2>
          <Badge variant={faucet.isActive ? "default" : "secondary"}>{faucet.isActive ? "Active" : "Inactive"}</Badge>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Faucet Address</h3>
              <div className="flex items-center mt-1">
                <span className="font-mono">{faucet.address}</span>
                <a
                  href={`https://celo-alfajores.blockscout.com/address/${faucet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-700 hover:text-blue-900"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">View on Etherscan</span>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Token Address</h3>
              <div className="flex items-center mt-1">
                <span className="font-mono">{faucet.tokenAddress}</span>
                <a
                  href={`https://celo-alfajores.blockscout.com/token/${faucet.tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-700 hover:text-blue-900"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">View on Etherscan</span>
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner</h3>
              <div className="flex items-center mt-1">
                <span className="font-mono">
                  {faucet.owner.slice(0, 6)}...{faucet.owner.slice(-4)}
                </span>
                <a
                  href={`https://celo-alfajores.blockscout.com/address/${faucet.owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-700 hover:text-blue-900"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">View on Etherscan</span>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Claim Amount</h3>
              <p className="mt-1">{faucet.claimAmount} tokens</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</h3>
              <p className="mt-1">{faucet.balance} tokens</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Claim Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Active:</span>
                <span className={faucet.isActive ? "text-green-500" : "text-red-500"}>
                  {faucet.isActive ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Has Sufficient Funds:</span>
                <span
                  className={Number(faucet.balance) >= Number(faucet.claimAmount) ? "text-green-500" : "text-red-500"}
                >
                  {Number(faucet.balance) >= Number(faucet.claimAmount) ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Current Time:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time Conditions:</span>
                <span className={faucet.isActive ? "text-green-500" : "text-yellow-500"}>
                  {faucet.isActive ? "Met" : "Not Met"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Time</h3>
              <p className="mt-1">{new Date(faucet.startTime * 1000).toLocaleString()}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">End Time</h3>
              <p className="mt-1">{new Date(faucet.endTime * 1000).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
