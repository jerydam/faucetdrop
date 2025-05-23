"use client"

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFaucetsForNetwork } from "@/lib/faucet";
import { formatUnits, Contract, ZeroAddress } from "ethers";
import { ArrowLeft, Coins, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ERC20_ABI } from "@/lib/abis";
import { WalletConnect } from "@/components/wallet-connect";
import { NetworkSelector } from "@/components/network-selector";

// TokenBalance component
function TokenBalance({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  isNativeToken,
  networkChainId,
}: {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  isNativeToken: boolean;
  networkChainId: number;
}) {
  const { provider, address } = useWallet();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBalance = async () => {
      if (!provider || !address || !networkChainId) {
        setBalance("0");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let balance: bigint;
        if (isNativeToken) {
          balance = await provider.getBalance(address);
        } else if (tokenAddress === ZeroAddress) {
          balance = 0n;
        } else {
          const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
          balance = await tokenContract.balanceOf(address);
        }
        const formattedBalance = Number(formatUnits(balance, tokenDecimals)).toFixed(4);
        setBalance(formattedBalance);
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance("0");
        toast({
          title: "Failed to fetch balance",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [provider, address, tokenAddress, tokenDecimals, isNativeToken, networkChainId, toast]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-center">
          <span className="text-xs sm:text-sm font-medium">Your Balance:</span>
          <span className="text-xs sm:text-sm font-semibold truncate max-w-[150px] sm:max-w-[200px]">
            {loading ? "Loading..." : `${balance} ${tokenSymbol}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// FaucetCard component
function FaucetCard({ faucet, onNetworkSwitch }: { faucet: any; onNetworkSwitch: () => Promise<void> }) {
  const { chainId } = useWallet();
  const isOnCorrectNetwork = chainId === faucet.network?.chainId;
  const [startCountdown, setStartCountdown] = useState<string>("");
  const [endCountdown, setEndCountdown] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const start = Number(faucet.startTime || 0) * 1000;
      const end = Number(faucet.endTime || 0) * 1000;

      if (!start) {
        setStartCountdown("Inactive");
      } else if (start > now) {
        const diff = start - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setStartCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s until active`);
      } else {
        setStartCountdown("Already Active");
      }

      if (end > now && faucet.isClaimActive) {
        const diff = end - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setEndCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s until inactive`);
      } else if (end > 0 && end <= now) {
        setEndCountdown("Ended");
      } else {
        setEndCountdown("N/A");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [faucet.startTime, faucet.endTime, faucet.isClaimActive]);

  return (
    <Card className="relative w-full sm:max-w-md mx-auto">
      {faucet.network && (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
          <Badge
            style={{ backgroundColor: faucet.network.color }}
            className="text-white text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1"
          >
            {faucet.network.name}
          </Badge>
        </div>
      )}
      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
        <CardTitle className="text-base sm:text-lg flex items-center justify-between pr-16 sm:pr-20">
          <span className="truncate">{faucet.name || faucet.tokenSymbol || "Token"} Faucet</span>
          {faucet.isClaimActive ? (
            <span className="text-[10px] sm:text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
              Active
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 sm:px-2 py-0.5 rounded-full">
              Inactive
            </span>
          )}
        </CardTitle>
        <CardDescription className="truncate text-[10px] sm:text-xs">{faucet.faucetAddress}</CardDescription>
      </CardHeader>
      <div className="px-3 sm:px-4 pb-1 sm:pb-2">
        {isOnCorrectNetwork ? (
          <TokenBalance
            tokenAddress={faucet.token || ZeroAddress}
            tokenSymbol={faucet.tokenSymbol || (faucet.isEther ? "ETH" : "TOK")}
            tokenDecimals={faucet.tokenDecimals || 18}
            isNativeToken={faucet.isEther}
            networkChainId={faucet.network?.chainId}
          />
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium">Balance:</span>
                <Button variant="outline" size="sm" onClick={onNetworkSwitch} className="text-xs sm:text-sm">
                  Switch Network
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <CardContent className="pb-1 sm:pb-2 px-3 sm:px-4">
        <div className="space-y-1 sm:space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Balance:</span>
            <span className="text-xs sm:text-sm font-medium truncate">
              {faucet.balance
                ? Number(formatUnits(faucet.balance, faucet.tokenDecimals || 18)).toFixed(4)
                : "0"}{" "}
              {faucet.tokenSymbol || (faucet.isEther ? "ETH" : "TOK")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Claim Amount:</span>
            <span className="text-xs sm:text-sm font-medium truncate">
              {faucet.claimAmount
                ? Number(formatUnits(faucet.claimAmount, faucet.tokenDecimals || 18)).toFixed(4)
                : "0"}{" "}
              {faucet.tokenSymbol || (faucet.isEther ? "ETH" : "TOK")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Type:</span>
            <span className="text-xs sm:text-sm font-medium">{faucet.isEther ? "Native Token" : "ERC20 Token"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm">{startCountdown}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm">{endCountdown}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-3 sm:px-4">
        <Link href={`/faucet/${faucet.faucetAddress}?networkId=${faucet.network?.chainId}`} className="w-full">
          <Button variant="outline" className="w-full h-8 sm:h-9 text-xs sm:text-sm">
            <Coins className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            View Details
            <ArrowLeft className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function NetworkFaucets() {
  const { chainId: chainIdStr } = useParams<{ chainId: string }>();
  const chainId = parseInt(chainIdStr, 10);
  const router = useRouter();
  const { provider, ensureCorrectNetwork } = useWallet();
  const { networks, setNetwork } = useNetwork();
  const { toast } = useToast();
  const [faucets, setFaucets] = useState<any[]>([]);
  const [loadingFaucets, setLoadingFaucets] = useState(true);
  const [page, setPage] = useState(1);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const faucetsPerPage = 10;
  const network = networks.find((n) => n.chainId === chainId);

  const loadFaucets = useCallback(async () => {
    if (!network) return;
    setLoadingFaucets(true);
    try {
      const fetchedFaucets = await getFaucetsForNetwork(network);
      setFaucets(fetchedFaucets.filter((f) => f && f.faucetAddress && f.network)); // Filter invalid faucets
      setPage(1); // Reset page on new fetch
    } catch (error) {
      console.error(`Error loading faucets for ${network.name}:`, error);
      toast({
        title: `Failed to load faucets for ${network.name}`,
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingFaucets(false);
    }
  }, [network, toast]);

  useEffect(() => {
    if (!network || isNaN(chainId)) {
      toast({
        title: "Network Not Found",
        description: `Network with chain ID ${chainId} is not supported`,
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    loadFaucets();
  }, [chainId, network, router, toast, loadFaucets]);

  const handleNetworkSwitch = async (targetChainId: number) => {
    setSwitchingNetwork(true);
    try {
      const targetNetwork = networks.find((n) => n.chainId === targetChainId);
      if (targetNetwork) {
        setNetwork(targetNetwork);
        await ensureCorrectNetwork(targetChainId);
      } else {
        throw new Error("Target network not found");
      }
    } catch (error) {
      console.error("Error switching network:", error);
      toast({
        title: "Network switch failed",
        description: "Failed to switch network. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSwitchingNetwork(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(faucets.length / faucetsPerPage);
  const paginatedFaucets = faucets.slice((page - 1) * faucetsPerPage, page * faucetsPerPage);

  // Limit page buttons to 5 for better UX
  const getPageButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    const start = Math.max(1, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);

    if (start > 1) {
      buttons.push(
        <Button
          key={1}
          variant={1 === page ? "default" : "outline"}
          size="sm"
          onClick={() => setPage(1)}
          className="w-8 h-8 text-xs sm:text-sm"
        >
          1
        </Button>
      );
      if (start > 2) buttons.push(<span key="start-ellipsis" className="text-xs sm:text-sm">...</span>);
    }

    for (let p = start; p <= end; p++) {
      buttons.push(
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          size="sm"
          onClick={() => setPage(p)}
          className="w-8 h-8 text-xs sm:text-sm"
        >
          {p}
        </Button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) buttons.push(<span key="end-ellipsis" className="text-xs sm:text-sm">...</span>);
      buttons.push(
        <Button
          key={totalPages}
          variant={totalPages === page ? "default" : "outline"}
          size="sm"
          onClick={() => setPage(totalPages)}
          className="w-8 h-8 text-xs sm:text-sm"
        >
          {totalPages}
        </Button>
      );
    }

    return buttons;
  };

  if (!network) {
    return null; // Router will redirect
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg sm:text-xl font-semibold">Faucets on {network.name}</h2>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadFaucets}
            disabled={loadingFaucets}
            className="text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${loadingFaucets ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <NetworkSelector />
          <Link href="/">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Back to Networks
            </Button>
          </Link>
          <WalletConnect/>
        </div>
      </div>

      {/* Faucets Section */}
      {loadingFaucets ? (
        <div className="flex justify-center items-center py-10 sm:py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm sm:text-base">Loading faucets...</p>
          </div>
        </div>
      ) : faucets.length === 0 ? (
        <Card className="w-full sm:max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
            <Coins className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-medium mb-2">No Faucets Found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              No faucets are available on {network.name} yet.
            </p>
            <Link href="/create">
              <Button className="text-xs sm:text-sm">Create Faucet</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {paginatedFaucets.map((faucet) => (
              <FaucetCard
                key={`${faucet.faucetAddress}-${network.chainId}`}
                faucet={faucet}
                onNetworkSwitch={() => handleNetworkSwitch(faucet.network.chainId)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Showing {(page - 1) * faucetsPerPage + 1} to {Math.min(page * faucetsPerPage, faucets.length)} of{" "}
                {faucets.length} faucets
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loadingFaucets}
                  className="text-xs sm:text-sm"
                >
                  Previous
                </Button>
                {getPageButtons()}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loadingFaucets}
                  className="text-xs sm:text-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}