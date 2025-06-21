"use client"

import { useEffect, useState } from "react";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { formatUnits } from "ethers";
import { getAllClaimsForAllNetworks } from "@/lib/faucet";

export function FaucetList() {
  const { networks } = useNetwork();
  const { toast } = useToast();
  const [claims, setClaims] = useState<
    {
      claimer: string;
      faucet: string;
      faucetName: string; // Added faucetName field
      amount: bigint;
      txHash: `0x${string}`;
      networkName: string;
      timestamp: number;
      chainId: number;
      tokenSymbol: string;
      tokenDecimals: number;
      isEther: boolean;
    }[]
  >([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [page, setPage] = useState(1);
  const claimsPerPage = 10;

  useEffect(() => {
    const loadClaims = async () => {
      setLoadingClaims(true);
      try {
        const fetchedClaims = await getAllClaimsForAllNetworks(networks);
        console.log("Fetched drops:", fetchedClaims);
        setClaims(fetchedClaims);
        setPage(1);
        console.log("Total pages:", Math.ceil(fetchedClaims.length / claimsPerPage));
      } catch (error) {
        console.error("Error loading drops:", error);
        toast({
          title: "Failed to load drops",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoadingClaims(false);
      }
    };

    if (networks.length > 0) {
      loadClaims();
    }
  }, [networks, toast]);

  const totalPages = Math.ceil(claims.length / claimsPerPage);
  const paginatedClaims = claims.slice((page - 1) * claimsPerPage, page * claimsPerPage);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Recent Drops</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingClaims ? (
          <div className="flex justify-center items-center py-10 sm:py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm sm:text-base">Loading drops...</p>
            </div>
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Coins className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-medium mb-2">No Drops Found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              No drops have been recorded across any network yet.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="block sm:hidden space-y-3">
              {paginatedClaims.map((claim, index) => {
                const network = networks.find((n) => n.chainId === claim.chainId);
                const displayName = claim.faucetName || `${claim.faucet.slice(0, 6)}...${claim.faucet.slice(-4)}`;
                return (
                  <Card key={`${claim.txHash}-${index}`} className="p-3">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Dropee:</span>
                        <span className="font-mono text-right break-all max-w-[150px]">
                          {claim.claimer.slice(0, 6)}...{claim.claimer.slice(-4)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Faucet:</span>
                        <Link
                          href={`/faucet/${claim.faucet}?networkId=${claim.chainId}`}
                          className="text-blue-600 hover:underline text-right max-w-[150px]"
                        >
                          {displayName}
                        </Link>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">
                          {Number(formatUnits(claim.amount, claim.tokenDecimals)).toFixed(4)} {claim.tokenSymbol}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Tx:</span>
                        <a
                          href={`${network?.blockExplorer || "#"}/tx/${claim.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-mono"
                        >
                          {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                        </a>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Network:</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {claim.networkName}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="text-right">
                          {new Date(claim.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Dropee</TableHead>
                    <TableHead className="text-xs sm:text-sm">Faucet</TableHead>
                    <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                    <TableHead className="text-xs sm:text-sm">Tx Hash</TableHead>
                    <TableHead className="text-xs sm:text-sm">Network</TableHead>
                    <TableHead className="text-xs sm:text-sm">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClaims.map((claim, index) => {
                    const network = networks.find((n) => n.chainId === claim.chainId);
                    const displayName = claim.faucetName || claim.faucet;
                    return (
                      <TableRow key={`${claim.txHash}-${index}`}>
                        <TableCell className="text-xs sm:text-sm font-mono">
                          <div className="max-w-[120px] truncate" title={claim.claimer}>
                            {claim.claimer}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <Link
                            href={`/faucet/${claim.faucet}?networkId=${claim.chainId}`}
                            className="text-blue-600 hover:underline max-w-[120px] truncate block"
                            title={displayName}
                          >
                            {displayName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {Number(formatUnits(claim.amount, claim.tokenDecimals)).toFixed(4)} {claim.tokenSymbol}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm font-mono">
                          <a
                            href={`${network?.blockExplorer || "#"}/tx/${claim.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            title={claim.txHash}
                          >
                            {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                          </a>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
                            {claim.networkName}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {new Date(claim.timestamp * 1000).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Showing {(page - 1) * claimsPerPage + 1} to {Math.min(page * claimsPerPage, claims.length)} of{" "}
                  {claims.length} drops
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loadingClaims}
                    className="text-xs sm:text-sm hover:bg-primary/10"
                    aria-label="Previous page"
                  >
                    Previous
                  </Button>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loadingClaims}
                    className="text-xs sm:text-sm hover:bg-primary/10"
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}