"use client"

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Activity, Clock } from "lucide-react";
import Link from "next/link";
import { getFaucetsForNetwork } from "@/lib/faucet";

interface NetworkGridProps {
  className?: string;
}

export function NetworkGrid({ className = "" }: NetworkGridProps) {
  const { chainId } = useWallet();
  const { networks } = useNetwork();
  const { toast } = useToast();
  
  const [networkStatus, setNetworkStatus] = useState<
    Record<string, { loading: boolean; error: string | null }>
  >({});
  const [faucetCounts, setFaucetCounts] = useState<Record<string, number>>({});
  const [activeFaucetCounts, setActiveFaucetCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"alphabetical" | "active" | "total">("active");
  const [activeNetworkIndex, setActiveNetworkIndex] = useState(0);

  useEffect(() => {
    const initialStatus: Record<string, { loading: boolean; error: string | null }> = {};
    const initialFaucetCounts: Record<string, number> = {};
    const initialActiveFaucetCounts: Record<string, number> = {};
    
    networks.forEach((network) => {
      initialStatus[network.name] = { loading: true, error: null };
      initialFaucetCounts[network.name] = 0;
      initialActiveFaucetCounts[network.name] = 0;
    });
    
    setNetworkStatus(initialStatus);
    setFaucetCounts(initialFaucetCounts);
    setActiveFaucetCounts(initialActiveFaucetCounts);

    const loadFaucetCounts = async () => {
      const updatedStatus = { ...initialStatus };
      const updatedCounts = { ...initialFaucetCounts };
      const updatedActiveCounts = { ...initialActiveFaucetCounts };

      await Promise.all(
        networks.map(async (network) => {
          try {
            updatedStatus[network.name].loading = true;
            const faucets = await getFaucetsForNetwork(network);
            
            // Sort faucets by creation time (latest first) and filter active ones
            const sortedFaucets = faucets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const activeFaucets = faucets.filter(faucet => faucet.isActive !== false);
            
            updatedCounts[network.name] = sortedFaucets.length;
            updatedActiveCounts[network.name] = activeFaucets.length;
            updatedStatus[network.name] = { loading: false, error: null };
          } catch (error) {
            console.error(`Error loading faucets for ${network.name}:`, error);
            updatedStatus[network.name] = {
              loading: false,
              error: `Failed to load faucets`,
            };
            updatedCounts[network.name] = 0;
            updatedActiveCounts[network.name] = 0;
          }
        })
      );

      setNetworkStatus(updatedStatus);
      setFaucetCounts(updatedCounts);
      setActiveFaucetCounts(updatedActiveCounts);
    };

    if (networks.length > 0) {
      loadFaucetCounts();
    }
  }, [networks, toast]);

  // Filter and sort networks
  const filteredNetworks = networks.filter(network =>
    network.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedNetworks = [...filteredNetworks].sort((a, b) => {
    switch (sortBy) {
      case "active":
        return (activeFaucetCounts[b.name] || 0) - (activeFaucetCounts[a.name] || 0);
      case "total":
        return (faucetCounts[b.name] || 0) - (faucetCounts[a.name] || 0);
      case "alphabetical":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Handle network toggle navigation for mobile
  const handlePrevNetwork = () => {
    setActiveNetworkIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextNetwork = () => {
    setActiveNetworkIndex((prev) => Math.min(sortedNetworks.length - 1, prev + 1));
  };

  const currentMobileNetwork = sortedNetworks[activeNetworkIndex];

  return (
    <div className={`space-y-4 ${className}`}>
      

      {/* Mobile Toggle Layout (<640px) */}
      <div className="block sm:hidden">
        {sortedNetworks.length > 0 && currentMobileNetwork ? (
          <div className="space-y-4">
            <Link href={`/network/${currentMobileNetwork.chainId}`} key={currentMobileNetwork.chainId}>
              <Card className="overflow-hidden w-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: currentMobileNetwork.color }}
                      ></span>
                      {currentMobileNetwork.name}
                    </CardTitle>
                    {networkStatus[currentMobileNetwork.name]?.loading ? (
                      <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                        Loading...
                      </span>
                    ) : networkStatus[currentMobileNetwork.name]?.error ? (
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
                <CardContent className="text-xs px-4 pb-3">
                  <div className="space-y-1">
                  
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">
                        {faucetCounts[currentMobileNetwork.name] || 0}
                      </span>
                    </div>
                    {chainId === currentMobileNetwork.chainId && (
                      <div className="pt-1">
                        <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                          Connected
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            {sortedNetworks.length > 1 && (
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
                  Network {activeNetworkIndex + 1} of {sortedNetworks.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextNetwork}
                  disabled={activeNetworkIndex === sortedNetworks.length - 1}
                  className="text-xs hover:bg-primary/10"
                  aria-label="Next network"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "No networks match your search" : "No networks available"}
            </p>
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="mt-2 text-xs"
              >
                Clear Search
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Grid Layout for sm+ (≥640px) */}
      <div className="hidden sm:block">
        {sortedNetworks.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {sortedNetworks.map((network) => (
              <Link href={`/network/${network.chainId}`} key={network.chainId}>
                <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-2 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: network.color }}
                        ></span>
                        <span className="truncate">{network.name}</span>
                      </CardTitle>
                      {networkStatus[network.name]?.loading ? (
                        <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          Loading
                        </span>
                      ) : networkStatus[network.name]?.error ? (
                        <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          Issue
                        </span>
                      ) : (
                        <span className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          Online
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs px-4 pb-3">
                    <div className="space-y-1">
                      
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-medium">
                          {faucetCounts[network.name] || 0}
                        </span>
                      </div>
                      {chainId === network.chainId && (
                        <div className="pt-1">
                          <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                            Connected
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">
                  {searchTerm ? "No networks found" : "No networks available"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {searchTerm 
                    ? `No networks match "${searchTerm}"`
                    : "Networks will appear here once they're configured"
                  }
                </p>
              </div>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="text-xs"
                >
                  Clear Search
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}