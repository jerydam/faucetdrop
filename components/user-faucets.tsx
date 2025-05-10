"use client"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ExternalLink } from "lucide-react"
import { useUserFaucets } from "@/hooks/use-user-faucets"

export function UserFaucets() {
  const { faucets, isLoading } = useUserFaucets()

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

  if (faucets.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="text-center py-6">
            <h3 className="text-xl font-semibold mb-2">No Faucets Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't created any faucets yet.</p>
            <Button asChild>
              <Link href="/dashboard?action=create">Create a Faucet</Link>
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
                <TableHead>Token</TableHead>
                <TableHead>Claim Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faucets.map((faucet) => (
                <TableRow key={faucet.address}>
                  <TableCell>
                    <div className="flex items-center">
                      <span>{faucet.tokenName || "Unknown Token"}</span>
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
                    <div className="text-xs text-gray-500 font-mono">
                      {faucet.tokenAddress.slice(0, 6)}...{faucet.tokenAddress.slice(-4)}
                    </div>
                  </TableCell>
                  <TableCell>{faucet.claimAmount} tokens</TableCell>
                  <TableCell>{faucet.balance} tokens</TableCell>
                  <TableCell>
                    <Badge variant={faucet.isActive ? "default" : "secondary"}>
                      {faucet.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/faucets/${faucet.address}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard?action=fund&address=${faucet.address}`}>Fund</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard?action=withdraw&address=${faucet.address}`}>Withdraw</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard?action=update&address=${faucet.address}`}>Update Parameters</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
