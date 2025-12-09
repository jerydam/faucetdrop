"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet"; 
import { useNetwork } from "@/hooks/use-network"; 
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, Zap, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getFaucetsForNetwork } from "@/lib/faucet"; 

interface Network {
  chainId: number;
  name: string;
  color: string;
  logoUrl: string;
}

interface StatusBadgeProps {
  status: { loading: boolean; error: string | null } | undefined;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (status?.loading) {
    return (
      <div className="flex items-center text-xs text-blue-500">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Loading
      </div>
    );
  }
  if (status?.error) {
    return (
      <div className="flex items-center text-xs text-amber-500">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Issue
      </div>
    );
  }
  return (
    <div className="flex items-center text-xs text-green-500">
      <Zap className="mr-1 h-3 w-3 " />
      Online
    </div>
  );
};

interface NetworkGridProps {
  className?: string;
}

export function NetworkGrid({ className = "" }: NetworkGridProps) {
  const { chainId, provider, switchChain, isConnected } = useWallet(); 
  const { networks } = useNetwork();
  const { toast } = useToast();

  const [networkStatus, setNetworkStatus] = useState<
    Record<string, { loading: boolean; error: string | null }>
  >({});
  const [faucetCounts, setFaucetCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initial state setup
    const initialStatus: Record<string, any> = {};
    const initialCounts: Record<string, number> = {};
    
    networks.forEach((network: Network) => {
      initialStatus[network.name] = { loading: false, error: null };
      initialCounts[network.name] = 0;
    });
    
    setNetworkStatus(initialStatus);
    setFaucetCounts(initialCounts);
  }, [networks]);

  useEffect(() => {
    const loadFaucetCounts = async () => {
      if (!provider || !chainId) return;

      // Find the network object for the CURRENT chain
      const activeNetwork = networks.find(n => n.chainId === chainId);
      
      // If we are on a supported network, load its faucets
      if (activeNetwork) {
         try {
            setNetworkStatus(prev => ({...prev, [activeNetwork.name]: { loading: true, error: null }}));
            
            const faucets = await getFaucetsForNetwork(activeNetwork, provider);
            
            setFaucetCounts(prev => ({...prev, [activeNetwork.name]: faucets.length}));
            setNetworkStatus(prev => ({...prev, [activeNetwork.name]: { loading: false, error: null }}));
         } catch (e) {
            console.error(e);
            setNetworkStatus(prev => ({...prev, [activeNetwork.name]: { loading: false, error: "Failed to load" }}));
         }
      }
    };

    loadFaucetCounts();
  }, [networks, provider, chainId]); 

  // Priority Logic: 
  // 1. Show Current Network if connected and supported.
  // 2. If connected but wrong network, show Celo (or preferred default) with "Switch" option.
  // 3. If disconnected, show standard disconnected message.
  
  const currentNetwork = networks.find((n: Network) => n.chainId === chainId);
  const targetNetwork = currentNetwork || networks.find(n => n.chainId === 42220) || networks[0];
  const isWrongNetwork = isConnected && chainId !== targetNetwork?.chainId;

  return (
    <div className={`space-y-6 ${className}`}>
      {isConnected && targetNetwork ? (
        <div className="w-full">
          {/* If on wrong network, clicking triggers switch. If correct, it navigates. */}
          <div onClick={(e) => {
              if (isWrongNetwork) {
                  e.preventDefault();
                  switchChain(targetNetwork.chainId);
              }
          }}>
            <Link href={isWrongNetwork ? "#" : `/network/${targetNetwork.chainId}`}>
              <Card className={`overflow-hidden shadow-lg border-2 transition-all duration-300 ease-in-out hover:shadow-xl cursor-pointer ${isWrongNetwork ? 'border-amber-400 opacity-90' : ''}`}>
                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden"
                      style={{ border: `2px solid ${targetNetwork.color}` }}
                    >
                      <img
                        src={targetNetwork.logoUrl}
                        alt={`${targetNetwork.name} Logo`}
                        className="h-full w-full object-contain p-1"
                      />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold truncate text-primary">
                        {targetNetwork.name}
                        </CardTitle>
                        {isWrongNetwork && (
                            <p className="text-xs text-amber-600 font-semibold animate-pulse">
                                ⚠️ Click to Switch Network
                            </p>
                        )}
                    </div>
                  </div>
                  <StatusBadge status={networkStatus[targetNetwork.name]} />
                </CardHeader>

                <CardContent className="p-4 pt-0 grid grid-cols-2 gap-4 border-t border-dashed">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Faucets</p>
                    <p className="text-2xl font-extrabold text-card-foreground">
                      {faucetCounts[targetNetwork.name] ?? 0}
                    </p>
                  </div>
                </CardContent>
                <div className="p-2 text-center text-xs text-primary/80 font-medium">
                  {isWrongNetwork ? "Switch Network to Explore" : "Click to explore available faucets →"}
                </div>
              </Card>
            </Link>
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center bg-gray-50 dark:bg-gray-900 border-dashed border-2 border-gray-300 dark:border-gray-700">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto">
              <Search className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-card-foreground mb-1">
                Network Disconnected
              </h3>
              <p className="text-sm text-muted-foreground">
                Your wallet is not connected. Please connect via the button above.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}