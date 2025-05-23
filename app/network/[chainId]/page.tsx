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

// Hook to track window size
function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150); // Debounce resize events
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial call

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return windowSize;
}

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
      <CardContent className="p-2 sm:p-3 md:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <span className="text-xs sm:text-sm md:text-base font-medium">Your Balance:</span>
          <span className="text-xs sm:text-sm md:text-base font-semibold truncate max-w-full sm:max-w-[180px] md:max-w-[200px]">
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
    <Card className="relative w-full max-w-[400px] mx-auto">
      {faucet.network && (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
          <Badge
            style={{ backgroundColor: faucet.network.color }}
            className="text-white text-[10px] sm:text-xs md:text-sm font-medium px-1.5 sm:px-2 py-0.5 sm:py-1"
          >
            {faucet.network.name}
          </Badge>
        </div>
      )}
      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
        <CardTitle className="text-sm sm:text-base md:text-lg flex items-center justify-between pr-12 sm:pr-16 md:pr-20">
          <span className="truncate">{faucet.name || faucet.tokenSymbol || "Token"} Faucet</span>
          {faucet.isClaimActive ? (
            <span className="text-[10px] sm:text-xs md:text-sm bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
              Active
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs md:text-sm bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 sm:px-2 py-0.5 rounded-full">
              Inactive
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-xs md:text-sm truncate">
          {faucet.faucetAddress}
        </CardDescription>
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
            <CardContent className="p-2 sm:p-3 md:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-xs sm:text-sm md:text-base font-medium">Balance:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNetworkSwitch}
                  className="text-xs sm:text-sm md:text-base h-8 sm:h-9 w-full sm:w-auto"
                >
                  Switch Network
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <CardContent className="pb-1 sm:pb-2 px-3 sm:px-4">
        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm md:text-base">
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Balance:</span>
            <span className="font-medium truncate">
              {faucet.balance
                ? Number(formatUnits(faucet.balance, faucet.tokenDecimals || 18)).toFixed(4)
                : "0"}{" "}
              {faucet.tokenSymbol || (faucet.isEther ? "ETH" : "TOK")}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Claim Amount:</span>
            <span className="font-medium truncate">
              {faucet.claimAmount
                ? Number(formatUnits(faucet.claimAmount, faucet.tokenDecimals || 18)).toFixed(4)
                : "0"}{" "}
              {faucet.tokenSymbol || (faucet.isEther ? "ETH" : "TOK")}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">{faucet.isEther ? "Native Token" : "ERC20 Token"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground" />
            <span>{startCountdown}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground" />
            <span>{endCountdown}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-3 sm:px-4">
        <Link
          href={`/faucet/${faucet.faucetAddress}?networkId=${faucet.network?.chainId}`}
          className="w-full"
        >
          <Button
            variant="outline"
            className="w-full h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base"
          >
            <Coins className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            View Details
            <ArrowLeft className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function NetworkFaucets() {
  const { chainId: chainIdStr } = useParams<{ chainId: string }>();
  const router = useRouter();
  const { provider, ensureCorrectNetwork } = useWallet();
  const { networks, setNetwork } = useNetwork();
  const { toast } = useToast();
  const [faucets, setFaucets] = useState<any[]>([]);
  const [loadingFaucets, setLoadingFaucets] = useState(true);
  const [page, setPage] = useState(1);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const { width, height } = useWindowSize();

  // Parse chainId with validation
  const chainId = chainIdStr ? parseInt(chainIdStr, 10) : NaN;
  const network = !isNaN(chainId) ? networks.find((n) => n.chainId === chainId) : undefined;

  // Calculate faucetsPerPage based on screen size and viewport height
  const calculateFaucetsPerPage = useCallback(() => {
    if (!height || !width) {
      // Fallback defaults for server-side rendering or initial render
      if (width < 640) return 5; // Mobile
      if (width < 1024) return 8; // Tablet
      return 10; // Desktop
    }

    // Estimated heights
    const headerHeight = width < 640 ? 100 : 120; // Header (title, buttons)
    const paginationHeight = width < 640 ? 50 : 60; // Pagination
    const containerPadding = width < 640 ? 32 : 64; // py-4 (8px * 4) or py-8 (16px * 4)
    const cardHeight = width < 640 ? 300 : width < 1024 ? 320 : 350; // FaucetCard height
    const gridGap = width < 640 ? 12 : width < 1024 ? 16 : 24; // gap-3 (12px), gap-4 (16px), gap-6 (24px)

    // Available height for faucet grid
    const availableHeight = height - (headerHeight + paginationHeight + containerPadding);

    // Calculate number of cards that fit, accounting for grid gap
    const cardsPerColumn = Math.floor(availableHeight / (cardHeight + gridGap));

    // Adjust based on grid columns (1 for mobile, 2 for tablet, 3 for desktop)
    const columns = width < 640 ? 1 : width < 1024 ? 2 : 3;
    let faucetsPerPage = cardsPerColumn * columns;

    // Clamp between min (3) and max (12)
    faucetsPerPage = Math.max(3, Math.min(12, faucetsPerPage));

    // Ensure at least one page of content
    if (faucetsPerPage <= 0) faucetsPerPage = 3;

    console.log(`Calculated faucetsPerPage: ${faucetsPerPage} (width: ${width}, height: ${height}, cardsPerColumn: ${cardsPerColumn}, columns: ${columns})`);

    return faucetsPerPage;
  }, [width, height]);

  const [faucetsPerPage, setFaucetsPerPage] = useState(calculateFaucetsPerPage());

  // Update faucetsPerPage on resize and reset page to 1
  useEffect(() => {
    const newFaucetsPerPage = calculateFaucetsPerPage();
    if (newFaucetsPerPage !== faucetsPerPage) {
      setFaucetsPerPage(newFaucetsPerPage);
      setPage(1); // Reset to first page to avoid invalid page state
      console.log(`Updated faucetsPerPage to ${newFaucetsPerPage}`);
    }
  }, [calculateFaucetsPerPage, faucetsPerPage]);

  const loadFaucets = useCallback(async () => {
    if (!network || isNaN(chainId)) {
      console.log("Skipping loadFaucets: network undefined or invalid chainId", { chainId, network });
      return;
    }
    setLoadingFaucets(true);
    try {
      const fetchedFaucets = await getFaucetsForNetwork(network);
      setFaucets(fetchedFaucets.filter((f) => f && f.faucetAddress && f.network)); // Filter invalid faucets
      setPage(1); // Reset page on new fetch
    } catch (error) {
      console.error(`Error loading faucets for network chainId ${chainId}:`, error);
      toast({
        title: `Failed to load faucets`,
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingFaucets(false);
    }
  }, [network, chainId, toast]);

  useEffect(() => {
    if (isNaN(chainId) || !network) {
      console.log("Invalid chainId or network not found", { chainId, network });
      toast({
        title: "Network Not Found",
        description: `Network with chain ID ${chainIdStr || "unknown"} is not supported`,
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    loadFaucets();
  }, [chainId, network, router, toast, loadFaucets, chainIdStr]);

  const handleNetworkSwitch = async (targetChainId: number) => {
    setSwitchingNetwork(true);
    try {
      const targetNetwork = networks.find((n) => n.chainId === targetChainId);
      if (!targetNetwork) {
        throw new Error(`Target network with chainId ${targetChainId} not found`);
      }
      setNetwork(targetNetwork);
      await ensureCorrectNetwork(targetChainId);
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

  // Limit page buttons to 5 for better UX, with responsive handling
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
          className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
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
          className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
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
          className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
        >
          {totalPages}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold">
          Faucets on {network?.name || "Unknown Network"}
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none order-1 sm:order-0">
            <WalletConnect />
          </div>
           <Button
            variant="outline"
            size="sm"
            onClick={loadFaucets}
            disabled={loadingFaucets || !network}
            className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base flex-1 sm:flex-none order-4 sm:order-0"
          >
            <RefreshCw
              className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2 ${
                loadingFaucets ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
          <div className="flex-1 sm:flex-none order-2">
            <NetworkSelector />
          </div>
          <Link href="/" className="flex-1 sm:flex-none order-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base w-full sm:w-auto"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
              Back to Networks
            </Button>
          </Link>
         
        </div>
      </div>

      {/* Faucets Section */}
      {loadingFaucets ? (
        <div className="flex justify-center items-center py-8 sm:py-10 md:py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base">Loading faucets...</p>
          </div>
        </div>
      ) : faucets.length === 0 ? (
        <Card className="w-full max-w-[400px] mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-10">
            <Coins className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground mb-2 sm:mb-3 md:mb-4" />
            <h3 className="text-base sm:text-lg md:text-xl font-medium mb-1 sm:mb-2">No Faucets Found</h3>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-3 sm:mb-4 md:mb-6 text-center">
              No faucets are available on {network?.name || "this network"} yet.
            </p>
            <Link href="/create">
              <Button className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base">
                Create Faucet
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {paginatedFaucets.map((faucet) => (
              <FaucetCard
                key={`${faucet.faucetAddress}-${network?.chainId || chainId}`}
                faucet={faucet}
                onNetworkSwitch={() => handleNetworkSwitch(faucet.network.chainId)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-4 sm:mt-6">
              <div className="text-xs sm:text-sm md:text-base text-muted-foreground text-center sm:text-left">
                Showing {(page - 1) * faucetsPerPage + 1} to{" "}
                {Math.min(page * faucetsPerPage, faucets.length)} of {faucets.length} faucets
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loadingFaucets}
                  className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base px-2 sm:px-3"
                >
                  Previous
                </Button>
                {getPageButtons()}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loadingFaucets}
                  className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base px-2 sm:px-3"
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