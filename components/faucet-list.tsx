"use client"

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { formatUnits } from "ethers";
import { getAllClaimsForAllNetworks, getFaucetsForNetwork } from "@/lib/faucet";
import { Header } from "@/components/header";

export function FaucetList() {
  const { chainId } = useWallet();
  const { networks } = useNetwork();
  const { toast } = useToast();
  const [networkStatus, setNetworkStatus] = useState<
    Record<string, { loading: boolean; error: string | null }>
  >({});
  const [claims, setClaims] = useState<
    {
      claimer: string;
      faucet: string;
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
  const [faucetCounts, setFaucetCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [activeNetworkIndex, setActiveNetworkIndex] = useState(0); // Track active network for mobile toggle
  const claimsPerPage = 10;

  useEffect(() => {
    const initialStatus: Record<string, { loading: boolean; error: string | null }> = {};
    const initialFaucetCounts: Record<string, number> = {};
    networks.forEach((network) => {
      initialStatus[network.name] = { loading: true, error: null };
      initialFaucetCounts[network.name] = 0;
    });
    setNetworkStatus(initialStatus);
    setFaucetCounts(initialFaucetCounts);

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

    const loadFaucetCounts = async () => {
      const updatedStatus = { ...initialStatus };
      const updatedCounts = { ...initialFaucetCounts };

      await Promise.all(
        networks.map(async (network) => {
          try {
            updatedStatus[network.name].loading = true;
            const faucets = await getFaucetsForNetwork(network);
            updatedCounts[network.name] = faucets.length;
            updatedStatus[network.name] = { loading: false, error: null };
          } catch (error) {
            console.error(`Error loading faucets for ${network.name}:`, error);
            updatedStatus[network.name] = {
              loading: false,
              error: `Failed to load faucets`,
            };
            updatedCounts[network.name] = 0;
          }
        })
      );

      setNetworkStatus(updatedStatus);
      setFaucetCounts(updatedCounts);
    };

    loadClaims();
    loadFaucetCounts();
  }, [networks, toast]);

  const totalPages = Math.ceil(claims.length / claimsPerPage);
  const paginatedClaims = claims.slice((page - 1) * claimsPerPage, page * claimsPerPage);

  // Handle network toggle navigation
  const handlePrevNetwork = () => {
    setActiveNetworkIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextNetwork = () => {
    setActiveNetworkIndex((prev) => Math.min(networks.length - 1, prev + 1));
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      

      {/* Mobile Toggle Layout (<640px) */}
      <div className="block sm:hidden">
        {networks.length > 0 ? (
          <div className="space-y-4">
            <Link href={`/network/${networks[activeNetworkIndex].chainId}`} key={networks[activeNetworkIndex].chainId}>
              <Card
                className="overflow-hidden w-full cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-1 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: networks[activeNetworkIndex].color }}
                      ></span>
                      {networks[activeNetworkIndex].name}
                    </CardTitle>
                    {networkStatus[networks[activeNetworkIndex].name]?.loading ? (
                      <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                        Loading...
                      </span>
                    ) : networkStatus[networks[activeNetworkIndex].name]?.error ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                        Issue
                      </span>
                    ) : (
                      <span className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                        Online
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-xs px-3">
                  <p>
                    View {faucetCounts[networks[activeNetworkIndex].name] || 0} faucet{faucetCounts[networks[activeNetworkIndex].name] !== 1 ? "s" : ""}
                    {chainId === networks[activeNetworkIndex].chainId && (
                      <span className="ml-2 text-[10px] bg-green-500/20 text-green-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                        Connected
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevNetwork}
                disabled={activeNetworkIndex === 0}
                className="text-xs hover:bg-primary/10"
                aria-label="Previous network"
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Network {activeNetworkIndex + 1} of {networks.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextNetwork}
                disabled={activeNetworkIndex === networks.length - 1}
                className="text-xs hover:bg-primary/10"
                aria-label="Next network"
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground">No networks available</p>
        )}
      </div>

      {/* Grid Layout for sm+ (≥640px) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {networks.map((network) => (
          <Link href={`/network/${network.chainId}`} key={network.chainId}>
            <Card
              className="overflow-hidden w-full sm:max-w-md mx-auto cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: network.color }}
                    ></span>
                    {network.name}
                  </CardTitle>
                  {networkStatus[network.name]?.loading ? (
                    <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      Loading...
                    </span>
                  ) : networkStatus[network.name]?.error ? (
                    <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      Issue
                    </span>
                  ) : (
                    <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                      Online
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm px-4">
                <p>
                  View {faucetCounts[network.name] || 0} faucet{faucetCounts[network.name] !== 1 ? "s" : ""}
                  {chainId === network.chainId && (
                    <span className="ml-2 text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Claims Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Claim History</CardTitle>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">dropee</TableHead>
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
                    return (
                      <TableRow key={`${claim.txHash}-${index}`}>
                        <TableCell className="text-xs sm:text-sm font-mono truncate max-w-[100px] sm:max-w-[150px]">
                          {claim.claimer}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm font-mono truncate max-w-[100px] sm:max-w-[150px]">
                          <Link
                            href={`/faucet/${claim.faucet}?networkId=${claim.chainId}`}
                            className="text-blue-600 hover:underline"
                          >
                            {claim.faucet}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {Number(formatUnits(claim.amount, claim.tokenDecimals)).toFixed(4)} {claim.tokenSymbol}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm font-mono truncate max-w-[100px] sm:max-w-[150px]">
                          <a
                            href={`${network?.blockExplorer || "#"}/tx/${claim.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                          </a>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {claim.networkName}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {new Date(claim.timestamp * 1000).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
    </div>
  );
}