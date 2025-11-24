"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import LoadingPage from "@/components/loading";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFaucetsForNetwork } from "@/lib/faucet";
import { formatUnits, Contract, ZeroAddress, JsonRpcProvider } from "ethers";
import {
  Coins,
  Clock,
  Search,
  Filter,
  SortAsc,
  X,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ERC20_ABI } from "@/lib/abis";
// import { Header } from "@/components/header";
import Link from "next/link";
import Head from "@/components/Head";

const DEFAULT_FAUCET_IMAGE = "/default.jpeg";
const FAUCETS_PER_PAGE = 6; // ✅ Hardcoded limit for pagination

// Types
interface FaucetData {
  faucetAddress: string;
  name?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  isEther: boolean;
  balance?: bigint;
  claimAmount?: bigint;
  startTime?: string | number;
  endTime?: string | number;
  isClaimActive: boolean;
  token?: string;
  network?: {
    chainId: number;
    name: string;
    description?: string;
    imageUrl?: string;
    color: string;
  };
  createdAt?: string | number;
  description?: string;
  imageUrl?: string;
  owner?: string;
}

const FILTER_OPTIONS = {
  ALL: "all",
  ACTIVE: "active",
  INACTIVE: "inactive",
  NATIVE: "native",
  ERC20: "erc20",
} as const;

const SORT_OPTIONS = {
  DEFAULT: "default",
  NAME_ASC: "name_asc",
  NAME_DESC: "name_desc",
  BALANCE_HIGH: "balance_high",
  BALANCE_LOW: "balance_low",
  AMOUNT_HIGH: "amount_high",
  AMOUNT_LOW: "amount_low",
} as const;

type FilterOption = typeof FILTER_OPTIONS[keyof typeof FILTER_OPTIONS];
type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];

// Hooks
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
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return windowSize;
}

function usePreviousPage() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  const goBack = useCallback(() => {
    if (canGoBack) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router, canGoBack]);

  return { goBack, canGoBack };
}

// Metadata loader
const loadFaucetMetadata = async (faucetAddress: string): Promise<{ description?: string; imageUrl?: string }> => {
  try {
    const response = await fetch(`https://fauctdrop-backend.onrender.com/faucet-metadata/${faucetAddress}`);
    if (response.ok) {
      const result = await response.json();
      return {
        description: result.description,
        imageUrl: result.imageUrl,
      };
    }
  } catch (error) {
    console.warn("Could not load faucet metadata:", error);
  }
  return {};
};

// Helpers
const getNativeTokenSymbol = (networkName: string): string => {
  switch (networkName) {
    case "Celo":
      return "CELO";
    case "Lisk":
    case "Arbitrum":
    case "Base":
    case "Ethereum":
      return "ETH";
    case "Polygon":
      return "MATIC";
    case "Optimism":
      return "ETH";
    default:
      return "ETH";
  }
};

const getDefaultDescription = (networkName: string, ownerAddress: string): string => {
  return `This is a faucet on ${networkName} by ${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`;
};

// Token Balance Component
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
          balance = BigInt(0);
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

// Faucet Card
function FaucetCard({ faucet, onNetworkSwitch }: { faucet: FaucetData; onNetworkSwitch: () => Promise<void> }) {
  const { chainId } = useWallet();
  const isOnCorrectNetwork = chainId === BigInt(faucet.network?.chainId || 0);
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

  const displayTokenSymbol =
    faucet.tokenSymbol || (faucet.isEther ? getNativeTokenSymbol(faucet.network?.name || "Ethereum") : "TOK");

  return (
    <Card className="relative w-full max-w-[400px] mx-auto">
      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
        <CardTitle className="text-sm sm:text-base md:text-lg flex items-center justify-between">
          <span className="truncate">{faucet.name || `${displayTokenSymbol} Faucet`}</span>
          <div className="flex items-center gap-2">
            {faucet.isClaimActive ? (
              <span className="text-[10px] sm:text-xs md:text-sm bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                Active
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs md:text-sm bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                Inactive
              </span>
            )}
            {faucet.network && (
              <Badge
                style={{ backgroundColor: faucet.network.color }}
                className="text-white text-[10px] sm:text-xs md:text-sm font-medium px-1.5 sm:px-2 py-0.5 sm:py-1"
              >
                {faucet.network.name}
              </Badge>
            )}
          </div>
        </CardTitle>

        <div className="px-3 sm:px-4 pt-2">
          <img
            src={faucet.imageUrl || DEFAULT_FAUCET_IMAGE}
            alt={faucet.name || "Faucet"}
            className="w-full h-32 sm:h-40 object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_FAUCET_IMAGE;
            }}
          />
        </div>

        <div className="px-3 sm:px-4 pb-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {faucet.description ||
              (faucet.network && faucet.owner
                ? getDefaultDescription(faucet.network.name, faucet.owner)
                : `A faucet for ${displayTokenSymbol} tokens`)}
          </p>
        </div>

        <CardDescription className="text-[10px] sm:text-xs md:text-sm truncate">
          {faucet.faucetAddress}
        </CardDescription>
      </CardHeader>

      <div className="px-3 sm:px-4 pb-1 sm:pb-2">
        {isOnCorrectNetwork ? (
          <TokenBalance
            tokenAddress={faucet.token || ZeroAddress}
            tokenSymbol={displayTokenSymbol}
            tokenDecimals={faucet.tokenDecimals || 18}
            isNativeToken={faucet.isEther}
            networkChainId={faucet.network?.chainId || 0}
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
                  Switch to {faucet.network?.name || "Network"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CardContent className="pb-1 sm:pb-2 px-3 sm:px-4">
        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm md:text-base">
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Network:</span>
            <span className="font-medium truncate">{faucet.network?.name || "Unknown"}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Balance:</span>
            <span className="font-medium truncate">
              {faucet.balance
                ? Number(formatUnits(faucet.balance, faucet.tokenDecimals || 18)).toFixed(4)
                : "0"}{" "}
              {displayTokenSymbol}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Drop Amount:</span>
            <span className="font-medium truncate">
              {faucet.claimAmount
                ? Number(formatUnits(faucet.claimAmount, faucet.tokenDecimals || 18)).toFixed(4)
                : "0"}{" "}
              {displayTokenSymbol}
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
          <Button variant="outline" className="w-full h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base">
            <Coins className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Search & Filter Controls
function SearchAndFilterControls({
  searchTerm,
  setSearchTerm,
  filterBy,
  setFilterBy,
  sortBy,
  setSortBy,
  onClearFilters,
  hasActiveFilters,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterBy: FilterOption;
  setFilterBy: (filter: FilterOption) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex items-center border border-input rounded-md h-8 sm:h-9 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search faucets by name, symbol, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 h-full border-0 shadow-none focus:ring-0 text-xs sm:text-sm"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Sort */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex items-center border border-input rounded-md h-8 sm:h-9 px-2 w-full">
          <Filter className="h-4 w-4 text-muted-foreground mr-2" />
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="border-0 shadow-none h-full p-0 text-xs sm:text-sm focus:ring-0">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_OPTIONS.ALL}>All Faucets</SelectItem>
              <SelectItem value={FILTER_OPTIONS.ACTIVE}>Active Only</SelectItem>
              <SelectItem value={FILTER_OPTIONS.INACTIVE}>Inactive Only</SelectItem>
              <SelectItem value={FILTER_OPTIONS.NATIVE}>Native Tokens</SelectItem>
              <SelectItem value={FILTER_OPTIONS.ERC20}>ERC20 Tokens</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center border border-input rounded-md h-8 sm:h-9 px-2 w-full">
          <SortAsc className="h-4 w-4 text-muted-foreground mr-2" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="border-0 shadow-none h-full p-0 text-xs sm:text-sm focus:ring-0">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SORT_OPTIONS.DEFAULT}>Default (Active First)</SelectItem>
              <SelectItem value={SORT_OPTIONS.NAME_ASC}>Name A-Z</SelectItem>
              <SelectItem value={SORT_OPTIONS.NAME_DESC}>Name Z-A</SelectItem>
              <SelectItem value={SORT_OPTIONS.BALANCE_HIGH}>Balance (High to Low)</SelectItem>
              <SelectItem value={SORT_OPTIONS.BALANCE_LOW}>Balance (Low to High)</SelectItem>
              <SelectItem value={SORT_OPTIONS.AMOUNT_HIGH}>Drop Amount (High to Low)</SelectItem>
              <SelectItem value={SORT_OPTIONS.AMOUNT_LOW}>Drop Amount (Low to High)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-8 sm:h-9 text-xs sm:text-sm px-3"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function NetworkFaucets() {
  const { chainId: chainIdStr } = useParams<{ chainId: string }>();
  const router = useRouter();
  const { ensureCorrectNetwork } = useWallet();
  const { networks, setNetwork } = useNetwork();
  const { toast } = useToast();
  const { goBack } = usePreviousPage();

  const [faucets, setFaucets] = useState<FaucetData[]>([]);
  const [totalFaucets, setTotalFaucets] = useState(0);
  const [currentPage, setCurrentPage] = useState(1); // ✅ NEW: Track current page
  const [loadingFaucets, setLoadingFaucets] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const { width } = useWindowSize(); // Retained but not used for limit calculation anymore

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<FilterOption>(FILTER_OPTIONS.ALL);
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.DEFAULT);

  const chainId = chainIdStr ? parseInt(chainIdStr, 10) : NaN;
  const network = !isNaN(chainId) ? networks.find((n) => n.chainId === chainId) : undefined;

  // Use the fixed limit for fetching.
  const limit = FAUCETS_PER_PAGE; 

  const loadFaucets = useCallback(
    async (pageToLoad: number, isInitialLoad: boolean, resetFaucetsList: boolean = false) => {
      if (!network || isNaN(chainId)) {
        setLoadingFaucets(false);
        setInitialLoading(false);
        return;
      }

      setLoadingFaucets(true);
      setCurrentPage(pageToLoad); // Update current page state

      try {
        const networkProvider = new JsonRpcProvider(network.rpcUrl);
        const { faucets: fetchedFaucets, totalFaucets: newTotalFaucets } = await getFaucetsForNetwork(
          network,
          pageToLoad,
          limit, // limit is fixed at 6
          networkProvider
        );

        setTotalFaucets(newTotalFaucets);

        const faucetsWithNetwork = fetchedFaucets
          .filter((f: any) => f && f.faucetAddress)
          .map((faucet: any) => ({
            ...faucet,
            network: network,
            tokenSymbol:
              faucet.tokenSymbol || (faucet.isEther ? getNativeTokenSymbol(network.name) : "TOK"),
          }));

        const faucetsWithMetadata = await Promise.all(
          faucetsWithNetwork.map(async (faucet: FaucetData) => {
            const metadata = await loadFaucetMetadata(faucet.faucetAddress);
            return {
              ...faucet,
              imageUrl: metadata.imageUrl || DEFAULT_FAUCET_IMAGE,
              description:
                metadata.description ||
                (faucet.owner
                  ? getDefaultDescription(network.name, faucet.owner)
                  : `A faucet for ${faucet.tokenSymbol || "tokens"} on ${network.name}`),
            };
          })
        );

        setFaucets((prevFaucets) => {
          if (pageToLoad === 1 || resetFaucetsList) {
            return faucetsWithMetadata as FaucetData[];
          }
          const newFaucets = faucetsWithMetadata.filter(
            (newF) => !prevFaucets.some((prevF) => prevF.faucetAddress === newF.faucetAddress)
          );
          return [...prevFaucets, ...newFaucets] as FaucetData[];
        });
      } catch (error) {
        console.error(`Error loading faucets for page ${pageToLoad}:`, error);
        toast({
          title: `Failed to load faucets for ${network.name}`,
          description: "Please try again later.",
          variant: "destructive",
        });
        if (pageToLoad === 1) {
          setFaucets([]);
        }
      } finally {
        setLoadingFaucets(false);
        if (isInitialLoad) {
          setInitialLoading(false);
        }
      }
    },
    [network, chainId, limit, toast]
  );

  const loadNextPage = useCallback(() => {
    if (!loadingFaucets && faucets.length < totalFaucets) {
      const nextPage = currentPage + 1; // ✅ Use currentPage state for next page number
      loadFaucets(nextPage, false);
    }
  }, [loadingFaucets, faucets.length, totalFaucets, loadFaucets, currentPage]); // ✅ Dependency added

  useEffect(() => {
    if (isNaN(chainId) || !network) {
      setInitialLoading(false);
      toast({
        title: "Network Not Found",
        description: `Network with chain ID ${chainIdStr || "unknown"} is not supported`,
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    setFaucets([]);
    setTotalFaucets(0);
    setSearchTerm("");
    setFilterBy(FILTER_OPTIONS.ALL);
    setSortBy(SORT_OPTIONS.DEFAULT);

    loadFaucets(1, true, true);
  }, [chainId, network, router, toast, loadFaucets, chainIdStr]);

  const handleNetworkSwitch = async (targetChainId: number) => {
    setSwitchingNetwork(true);
    try {
      const targetNetwork = networks.find((n) => n.chainId === targetChainId);
      if (!targetNetwork) throw new Error(`Target network with chainId ${targetChainId} not found`);
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

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterBy(FILTER_OPTIONS.ALL);
    setSortBy(SORT_OPTIONS.DEFAULT);
  };

  const filteredAndSortedFaucets = useMemo(() => {
    let filtered = [...faucets];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((faucet) => {
        const name = (faucet.name || faucet.tokenSymbol || "").toLowerCase();
        const symbol = (faucet.tokenSymbol || "").toLowerCase();
        const address = faucet.faucetAddress.toLowerCase();
        return name.includes(search) || symbol.includes(search) || address.includes(search);
      });
    }

    if (filterBy !== FILTER_OPTIONS.ALL) {
      filtered = filtered.filter((faucet) => {
        switch (filterBy) {
          case FILTER_OPTIONS.ACTIVE:
            return faucet.isClaimActive;
          case FILTER_OPTIONS.INACTIVE:
            return !faucet.isClaimActive;
          case FILTER_OPTIONS.NATIVE:
            return faucet.isEther;
          case FILTER_OPTIONS.ERC20:
            return !faucet.isEther;
          default:
            return true;
        }
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.DEFAULT:
          if (a.isClaimActive !== b.isClaimActive) return a.isClaimActive ? -1 : 1;
          const aTime = Number(a.createdAt || a.startTime || 0);
          const bTime = Number(b.createdAt || b.startTime || 0);
          return bTime - aTime;

        case SORT_OPTIONS.NAME_ASC:
          return (a.name || a.tokenSymbol || "").localeCompare(b.name || b.tokenSymbol || "");

        case SORT_OPTIONS.NAME_DESC:
          return (b.name || b.tokenSymbol || "").localeCompare(a.name || a.tokenSymbol || "");

        case SORT_OPTIONS.BALANCE_HIGH:
          return (
            Number(formatUnits(b.balance || BigInt(0), b.tokenDecimals || 18)) -
            Number(formatUnits(a.balance || BigInt(0), a.tokenDecimals || 18))
          );

        case SORT_OPTIONS.BALANCE_LOW:
          return (
            Number(formatUnits(a.balance || BigInt(0), a.tokenDecimals || 18)) -
            Number(formatUnits(b.balance || BigInt(0), b.tokenDecimals || 18))
          );

        case SORT_OPTIONS.AMOUNT_HIGH:
          return (
            Number(formatUnits(b.claimAmount || BigInt(0), b.tokenDecimals || 18)) -
            Number(formatUnits(a.claimAmount || BigInt(0), a.tokenDecimals || 18))
          );

        case SORT_OPTIONS.AMOUNT_LOW:
          return (
            Number(formatUnits(a.claimAmount || BigInt(0), a.tokenDecimals || 18)) -
            Number(formatUnits(b.claimAmount || BigInt(0), b.tokenDecimals || 18))
          );

        default:
          return 0;
      }
    });

    return filtered;
  }, [faucets, searchTerm, filterBy, sortBy]);

  const hasActiveFilters = searchTerm.trim() !== "" || filterBy !== FILTER_OPTIONS.ALL || sortBy !== SORT_OPTIONS.DEFAULT;
  const canLoadMore = faucets.length < totalFaucets;
  const totalFilteredAndSorted = filteredAndSortedFaucets.length;
  const isFirstLoad = faucets.length === 0 && loadingFaucets;

  if (initialLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={goBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          {/* <Header
            pageTitle={`Faucets on ${network?.name || "Unknown Network"}`}
            onRefresh={() => loadFaucets(1, false, true)}
            loading={loadingFaucets}
          /> */}
          <Head />
        </div>
      </div>

      <SearchAndFilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterBy={filterBy}
        setFilterBy={setFilterBy}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {isFirstLoad && loadingFaucets ? (
        <div className="flex justify-center items-center py-8 sm:py-10 md:py-12">
          <div className="text-center">
            <Loader2 className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mx-auto" />
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base">Loading faucets...</p>
          </div>
        </div>
      ) : totalFilteredAndSorted === 0 ? (
        <Card className="w-full max-w-[400px] mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-10">
            <Coins className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground mb-2 sm:mb-3 md:mb-4" />
            <h3 className="text-base sm:text-lg md:text-xl font-medium mb-1 sm:mb-2">
              {totalFaucets === 0 ? "No Faucets Found" : "No Matching Faucets"}
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-3 sm:mb-4 md:mb-6 text-center">
              {totalFaucets === 0
                ? `No faucets are available on ${network?.name || "this network"} yet.`
                : "Try adjusting your search or filter criteria."}
            </p>
            {totalFaucets === 0 && (
              <Link href="/create">
                <Button className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base">
                  Create Faucet
                </Button>
              </Link>
            )}
            {totalFaucets > 0 && (
              <Button onClick={handleClearFilters} className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>
              Showing {totalFilteredAndSorted} of {totalFaucets} faucets on {network?.name || "Unknown Network"}
              {hasActiveFilters && " (filtered on loaded data)"}
            </span>
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <span className="text-primary font-medium">Filters applied</span>
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-6 text-xs px-2">
                  Clear all
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {filteredAndSortedFaucets.map((faucet) => (
              <FaucetCard
                key={`${faucet.faucetAddress}-${network?.chainId || chainId}`}
                faucet={faucet}
                onNetworkSwitch={() => handleNetworkSwitch(faucet.network?.chainId || 0)}
              />
            ))}
          </div>

          {canLoadMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={loadNextPage}
                disabled={loadingFaucets || switchingNetwork}
                className="h-10 px-6 text-sm sm:text-base"
              >
                {loadingFaucets ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  // ✅ Updated Load More button text to reflect the 6-item chunk
                  `Load Next ${Math.min(limit, totalFaucets - faucets.length)} Faucets (${totalFaucets - faucets.length} remaining)`
                )}
              </Button>
            </div>
          )}
          {faucets.length > 0 && !canLoadMore && (
            <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4">
              You've loaded all {totalFaucets} available faucets.
            </p>
          )}
        </>
      )}
    </div>
  );
}