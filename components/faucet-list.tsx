"use client"

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins } from "lucide-react";
import { formatUnits } from "ethers";
import { getAllClaimsForAllNetworks, getFaucetsForNetwork } from "@/lib/faucet";

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
    }[]
  >([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [faucetCounts, setFaucetCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initialize network status and faucet counts
    const initialStatus: Record<string, { loading: boolean; error: string | null }> = {};
    const initialFaucetCounts: Record<string, number> = {};
    networks.forEach((network) => {
      initialStatus[network.name] = { loading: true, error: null };
      initialFaucetCounts[network.name] = 0;
    });
    setNetworkStatus(initialStatus);
    setFaucetCounts(initialFaucetCounts);

    // Load claims for all networks
    const loadClaims = async () => {
      setLoadingClaims(true);
      try {
        const fetchedClaims = await getAllClaimsForAllNetworks(networks);
        setClaims(fetchedClaims);
      } catch (error) {
        console.error("Error loading claims:", error);
        toast({
          title: "Failed to load claims",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoadingClaims(false);
      }
    };

    // Load faucet counts for all networks
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

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <h2 className="text-lg sm:text-xl font-semibold">Available Networks</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {networks.map((network) => (
          <Link href={`/network/${network.chainId}`} key={network.chainId}>
            <Card
              className="overflow-hidden w-full sm:max-w-md mx-auto cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-1 sm:gap-2">
                    <span
                      className="h-2 w-2 sm:h-3 sm:w-3 rounded-full"
                      style={{ backgroundColor: network.color }}
                    ></span>
                    {network.name}
                  </CardTitle>
                  {networkStatus[network.name]?.loading ? (
                    <span className="text-[10px] sm:text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                      Loading...
                    </span>
                  ) : networkStatus[network.name]?.error ? (
                    <span className="text-[10px] sm:text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                      Issue
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                      Online
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm px-3 sm:px-4">
                <p>
                  View {faucetCounts[network.name] || 0} faucet{faucetCounts[network.name] !== 1 ? "s" : ""}
                  {chainId === network.chainId && (
                    <span className="ml-2 text-[10px] sm:text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
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
                <p className="mt-4 text-sm sm:text-base">Loading claims...</p>
              </div>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Coins className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-medium mb-2">No Claims Found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                No claims have been recorded across any network yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Claimer</TableHead>
                  <TableHead className="text-xs sm:text-sm">Faucet</TableHead>
                  <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                  <TableHead className="text-xs sm:text-sm">Tx Hash</TableHead>
                  <TableHead className="text-xs sm:text-sm">Network</TableHead>
                  <TableHead className="text-xs sm:text-sm">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim, index) => {
                  const network = networks.find((n) => n.chainId === claim.chainId);
                  return (
                    <TableRow key={index}>
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
                        {formatUnits(claim.amount, 18)} tokens
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}