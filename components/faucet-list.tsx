// components/cached-faucet-list.tsx
"use client"

import { useEffect, useState } from "react";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, ChevronDown, ChevronUp, RefreshCw, Clock, WifiOff, Wifi } from "lucide-react";
import { formatUnits, Contract, JsonRpcProvider, isAddress, zeroAddress } from "ethers";
import { getAllClaimsForAllNetworks } from "@/lib/faucet";
import { Network } from "@/hooks/use-network";
import { FACTORY_ABI, FAUCET_ABI } from "@/lib/abis";
import { cacheManager, CACHE_KEYS, useCache } from "@/lib/cache";

// Types
type ClaimType = {
  claimer: string;
  faucet: string;
  amount: bigint;
  txHash: `0x${string}` | null;
  networkName: string;
  timestamp: number;
  chainId: number | bigint;
  tokenSymbol: string;
  tokenDecimals: number;
  isEther: boolean;
};

interface CacheStatus {
  isFromCache: boolean;
  lastUpdated: number | null;
  age: number | null;
}

// Cache status badge for faucet list
function FaucetListCacheStatus({ cacheStatus, onRefresh, refreshing }: {
  cacheStatus: CacheStatus;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const formatAge = (age: number | null) => {
    if (!age) return "";
    
    const minutes = Math.floor(age / (1000 * 60));
    const seconds = Math.floor((age % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  return (
    <div className="flex items-center gap-2">
      {cacheStatus.isFromCache ? (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
          <WifiOff className="h-3 w-3" />
          Cached
        </Badge>
      ) : (
        <Badge variant="default" className="flex items-center gap-1 text-xs">
          <Wifi className="h-3 w-3" />
          Live
        </Badge>
      )}
      
      {cacheStatus.age && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          {formatAge(cacheStatus.age)}
        </Badge>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-2 text-sm h-8"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Refreshing' : 'Refresh'}
      </Button>
    </div>
  );
}

export function CachedFaucetList() {
  const { networks } = useNetwork();
  const { toast } = useToast();
  const cache = useCache();
  
  const [claims, setClaims] = useState<ClaimType[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [faucetNames, setFaucetNames] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isFromCache: false,
    lastUpdated: null,
    age: null
  });
  
  // Dynamic claims per page based on screen size
  const claimsPerPage = isMobile ? 5 : 10;
  const FAUCET_LIST_CACHE_KEY = 'faucet_list_data';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load cached data immediately
  const loadCachedData = () => {
    const cachedData = cache.get<{
      claims: ClaimType[];
      faucetNames: Record<string, string>;
      timestamp: number;
    }>(FAUCET_LIST_CACHE_KEY);
    
    if (cachedData) {
      setClaims(cachedData.claims);
      setFaucetNames(cachedData.faucetNames);
      setLoadingClaims(false);
      
      const age = cache.getAge(FAUCET_LIST_CACHE_KEY);
      setCacheStatus({
        isFromCache: true,
        lastUpdated: cachedData.timestamp,
        age
      });
      
      console.log(`Loaded ${cachedData.claims.length} claims from cache`);
      return true;
    }
    return false;
  };

  const loadClaims = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (claims.length === 0) {
      setLoadingClaims(true);
    }
    
    try {
      console.log("Loading claims from both storage and factory sources...");
      
      // Check for cached storage claims
      let storageClaims = cache.get<any[]>(CACHE_KEYS.STORAGE_CLAIMS);
      if (!storageClaims || cache.isExpired(CACHE_KEYS.STORAGE_CLAIMS)) {
        console.log("Fetching fresh storage claims...");
        storageClaims = await getAllClaimsForAllNetworks(networks);
        cache.set(CACHE_KEYS.STORAGE_CLAIMS, storageClaims, 5 * 60 * 1000); // 5 min cache
      } else {
        console.log("Using cached storage claims");
      }

      // Check for cached factory claims
      let factoryClaims = cache.get<any[]>(CACHE_KEYS.FACTORY_CLAIMS);
      if (!factoryClaims || cache.isExpired(CACHE_KEYS.FACTORY_CLAIMS)) {
        console.log("Fetching fresh factory claims...");
        factoryClaims = await getAllClaimsFromAllFactories(networks);
        cache.set(CACHE_KEYS.FACTORY_CLAIMS, factoryClaims, 5 * 60 * 1000); // 5 min cache
      } else {
        console.log("Using cached factory claims");
      }

      // Enhance storage claims with proper token symbols
      const enhancedStorageClaims = await Promise.all(
        storageClaims.map(async (claim) => {
          const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
          const network = networks.find(n => n.chainId === chainId);
          
          if (network && (!claim.tokenSymbol || claim.tokenSymbol === 'TOKEN')) {
            try {
              const provider = new JsonRpcProvider(network.rpcUrl);
              
              if (claim.isEther) {
                const tokenInfo = await getTokenInfo("", provider, chainId, true);
                return {
                  ...claim,
                  tokenSymbol: tokenInfo.symbol,
                  tokenDecimals: tokenInfo.decimals
                };
              } else {
                try {
                  const faucetContract = new Contract(claim.faucet, FAUCET_ABI, provider);
                  let tokenAddress;
                  
                  try {
                    tokenAddress = await faucetContract.token();
                  } catch {
                    try {
                      tokenAddress = await faucetContract.tokenAddress();
                    } catch {
                      return claim;
                    }
                  }
                  
                  const tokenInfo = await getTokenInfo(tokenAddress, provider, chainId, false);
                  return {
                    ...claim,
                    tokenSymbol: tokenInfo.symbol,
                    tokenDecimals: tokenInfo.decimals
                  };
                } catch {
                  return claim;
                }
              }
            } catch {
              return claim;
            }
          }
          
          return claim;
        })
      );
      
      // Convert factory claims to match ClaimType format
      const convertedFactoryClaims: ClaimType[] = factoryClaims.map(claim => ({
        claimer: claim.initiator,
        faucet: claim.faucetAddress,
        amount: claim.amount,
        txHash: claim.txHash as `0x${string}` | null,
        networkName: claim.networkName,
        timestamp: claim.timestamp,
        chainId: claim.chainId,
        tokenSymbol: claim.tokenSymbol,
        tokenDecimals: claim.tokenDecimals,
        isEther: claim.isEther,
      }));
      
      // Combine and sort
      const allClaims = [...enhancedStorageClaims, ...convertedFactoryClaims];
      allClaims.sort((a, b) => b.timestamp - a.timestamp);
      
      // Fetch faucet names
      const names = await fetchFaucetNames(allClaims);
      
      // Update state
      setClaims(allClaims);
      setFaucetNames(names);
      setPage(1);
      
      // Cache the results
      const cacheData = {
        claims: allClaims,
        faucetNames: names,
        timestamp: Date.now()
      };
      cache.set(FAUCET_LIST_CACHE_KEY, cacheData, 8 * 60 * 1000); // 8 minutes cache
      
      setCacheStatus({
        isFromCache: false,
        lastUpdated: Date.now(),
        age: 0
      });
      
      console.log(`Total claims loaded: ${allClaims.length}`);
      
      if (isRefresh) {
        toast({
          title: "Drops refreshed",
          description: `Loaded ${allClaims.length} total drops`,
        });
      }
      
    } catch (error) {
      console.error("Error loading drops:", error);
      toast({
        title: "Failed to load drops",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingClaims(false);
      setRefreshing(false);
    }
  };

  const fetchFaucetNames = async (claimsData: ClaimType[]) => {
    // Check cache first
    const cachedNames = cache.get<Record<string, string>>(CACHE_KEYS.FAUCET_NAMES);
    if (cachedNames && !cache.isExpired(CACHE_KEYS.FAUCET_NAMES)) {
      console.log("Using cached faucet names");
      return cachedNames;
    }

    const faucetAddresses = [...new Set(claimsData.map(claim => claim.faucet))];
    console.log(`Fetching names for ${faucetAddresses.length} unique faucets...`);
    
    const namePromises = faucetAddresses.map(async (faucetAddress) => {
      try {
        const claim = claimsData.find(c => c.faucet === faucetAddress);
        if (!claim) return null;
        
        const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
        const network = networks.find(n => n.chainId === chainId);
        if (!network) return null;
        
        const provider = new JsonRpcProvider(network.rpcUrl);
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider);
        
        let faucetName: string;
        try {
          faucetName = await faucetContract.name();
        } catch (error) {
          try {
            faucetName = await faucetContract.getName();
          } catch (error2) {
            try {
              faucetName = await faucetContract.faucetName();
            } catch (error3) {
              return null;
            }
          }
        }
        
        return { address: faucetAddress, name: faucetName };
      } catch (error) {
        return null;
      }
    });
    
    const results = await Promise.all(namePromises);
    const nameMap: Record<string, string> = {};
    
    results.forEach(result => {
      if (result && result.name) {
        nameMap[result.address] = result.name;
      }
    });
    
    // Cache the faucet names
    cache.set(CACHE_KEYS.FAUCET_NAMES, nameMap, 15 * 60 * 1000); // 15 min cache
    
    console.log(`Successfully fetched ${Object.keys(nameMap).length} faucet names`);
    return nameMap;
  };

  useEffect(() => {
    if (networks.length > 0) {
      // Load cached data first
      const hasCachedData = loadCachedData();
      
      // If no cached data or cache is expired, load fresh data
      if (!hasCachedData || cache.isExpired(FAUCET_LIST_CACHE_KEY)) {
        loadClaims();
      } else {
        // Load fresh data in background after showing cached data
        setTimeout(() => loadClaims(), 2000);
      }
    }
  }, [networks]);

  // Recalculate pagination when mobile state changes
  useEffect(() => {
    setPage(1);
  }, [isMobile]);

  const handleRefresh = () => {
    // Clear cache and fetch fresh data
    cache.delete(FAUCET_LIST_CACHE_KEY);
    cache.delete(CACHE_KEYS.STORAGE_CLAIMS);
    cache.delete(CACHE_KEYS.FACTORY_CLAIMS);
    cache.delete(CACHE_KEYS.FAUCET_NAMES);
    loadClaims(true);
  };

  const totalPages = Math.ceil(claims.length / claimsPerPage);
  const paginatedClaims = claims.slice((page - 1) * claimsPerPage, page * claimsPerPage);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg sm:text-xl">Recent Drops</CardTitle>
            {cacheStatus.isFromCache && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <WifiOff className="h-3 w-3" />
                Cached
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isExpanded && (
              <FaucetListCacheStatus
                cacheStatus={cacheStatus}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm"
            >
              {isExpanded ? (
                <>
                  Collapse
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  View Drops
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
        {isExpanded && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              Total: {claims.length} drops
              {cacheStatus.isFromCache && cacheStatus.lastUpdated && (
                <span className="ml-2">
                  • Cached: {new Date(cacheStatus.lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </div>
            <FaucetListCacheStatus
              cacheStatus={cacheStatus}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          </div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* Cache info banner */}
          {cacheStatus.isFromCache && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                <WifiOff className="h-4 w-4" />
                Showing cached data for faster loading. Click refresh for latest information.
              </div>
            </div>
          )}

          {loadingClaims && claims.length === 0 ? (
            <div className="flex justify-center items-center py-10 sm:py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sm sm:text-base">Loading drops from all sources...</p>
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
                  const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
                  const network = networks.find((n) => n.chainId === chainId);
                  const displayName = faucetNames[claim.faucet] || `Faucet ${claim.faucet.slice(0, 6)}...${claim.faucet.slice(-4)}`;
                  return (
                    <Card key={`${claim.txHash || claim.faucet}-${index}`} className="p-3">
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
                            href={`/faucet/${claim.faucet}?networkId=${chainId}`}
                            className="text-blue-600 hover:underline text-right max-w-[150px] truncate"
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
                          {claim.txHash ? (
                            <a
                              href={`${network?.blockExplorer || "#"}/tx/${claim.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-mono"
                            >
                              {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                            </a>
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">
                              <i>loading...</i>
                            </span>
                          )}
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
                      const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
                      const network = networks.find((n) => n.chainId === chainId);
                      const displayName = faucetNames[claim.faucet] || `Faucet ${claim.faucet.slice(0, 6)}...${claim.faucet.slice(-4)}`;
                      return (
                        <TableRow key={`${claim.txHash || claim.faucet}-${index}`}>
                          <TableCell className="text-xs sm:text-sm font-mono">
                            <div className="max-w-[120px] truncate" title={claim.claimer}>
                              {claim.claimer}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <Link
                              href={`/faucet/${claim.faucet}?networkId=${chainId}`}
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
                            {claim.txHash ? (
                              <a
                                href={`${network?.blockExplorer || "#"}/tx/${claim.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                                title={claim.txHash}
                              >
                                {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                              </a>
                            ) : (
                              <span className="text-muted-foreground"><i>loading...</i></span>
                            )}
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
                      disabled={page === 1 || loadingClaims || refreshing}
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
                      disabled={page === totalPages || loadingClaims || refreshing}
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
      )}
    </Card>
  );
}

// Helper functions from your original code
async function getAllClaimsFromAllFactories(networks: any[]) {
  // Implementation from your original paste-2.txt
  // This would be the same as in your original file
  return [];
}

async function getTokenInfo(tokenAddress: string, provider: JsonRpcProvider, chainId: number, isEther: boolean) {
  // Implementation from your original paste-2.txt
  // This would be the same as in your original file
  return { symbol: "TOKEN", decimals: 18 };
}