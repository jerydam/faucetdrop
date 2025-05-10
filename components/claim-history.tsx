"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { useClaimHistory } from "@/hooks/use-claim-history"

export function ClaimHistory() {
  const { claims, isLoading } = useClaimHistory()

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

  if (claims.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="text-center py-6">
            <h3 className="text-xl font-semibold mb-2">No Claims Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't claimed any tokens yet.</p>
            <Button asChild>
              <a href="/faucets">Explore Faucets</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faucet</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Transaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono">
                    {claim.faucetAddress.slice(0, 6)}...{claim.faucetAddress.slice(-4)}
                  </TableCell>
                  <TableCell>{claim.tokenName || "Unknown Token"}</TableCell>
                  <TableCell>{claim.amount} tokens</TableCell>
                  <TableCell>{new Date(claim.timestamp * 1000).toLocaleString()}</TableCell>
                  <TableCell>
                    <a
                      href={`https://celo-alfajores.blockscout.com/tx/${claim.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">View on Etherscan</span>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
