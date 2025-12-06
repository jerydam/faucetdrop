"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, Zap, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useNetwork } from "@/hooks/use-network";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/components/ui/use-toast";
import { getFaucetsForNetwork } from "@/lib/faucet";

// --- TYPES ---
interface Network {
  chainId: number;
  name: string;
  color: string;
  logoUrl: string;
}

interface DeletedFaucetRecord {
  faucet_address: string;
  chain_id: number;
  deleted_at: string;
}

interface Faucet {
  address: string;
  isClaimActive: boolean;
  // ... other faucet properties
}

// --- HELPER: Fetch Deleted Faucets ---
const fetchDeletedFaucets = async (): Promise<DeletedFaucetRecord[]> => {
  try {
    const BACKEND_URL = "https://fauctdrop-backend.onrender.com";
    const response = await fetch(`${BACKEND_URL}/deleted-faucets`, {
      // Add cache option to prevent stale data
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error(`Backend returned status: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${data.length} deleted faucets from backend`);
    return data;
  } catch (error) {
    console.error("❌ Failed to fetch deleted faucets:", error);
    return [];
  }
};

// --- SUB-COMPONENT: StatusBadge ---
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
      <Zap className="mr-1 h-3 w-3" />
      Online
    </div>
  );
};

// --- MAIN COMPONENT ---
interface NetworkGridProps {
  className?: string;
}

export function NetworkGrid({ className = "" }: NetworkGridProps) {
  // Assuming these hooks are defined elsewhere in your app
  const { chainId, provider } = useWallet();
  const { networks } = useNetwork();
  const { toast } = useToast();

  const [networkStatus, setNetworkStatus] = useState<
    Record<string, { loading: boolean; error: string | null }>
  >({});
  const [faucetCounts, setFaucetCounts] = useState<Record<string, number>>({});
  const [activeFaucetCounts, setActiveFaucetCounts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    // Initialize state
    const initialStatus: Record<string, { loading: boolean; error: string | null }> = {};
    const initialFaucetCounts: Record<string, number> = {};
    const initialActiveFaucetCounts: Record<string, number> = {};

    networks.forEach((network: Network) => {
      initialStatus[network.name] = { loading: true, error: null };
      initialFaucetCounts[network.name] = 0;
      initialActiveFaucetCounts[network.name] = 0;
    });

    setNetworkStatus(initialStatus);
    setFaucetCounts(initialFaucetCounts);
    setActiveFaucetCounts(initialActiveFaucetCounts);

    const loadData = async () => {
      if (!provider) {
        console.warn("⚠️ Provider is missing; skipping faucet data load.");
        return;
      }

      // 1. FETCH DELETED FAUCETS GLOBALLY (once for all networks)
      console.log("📡 Fetching deleted faucets from backend...");
      const deletedRecords = await fetchDeletedFaucets();

      // 2. CREATE LOOKUP SET for O(1) filtering
      // Key format: "chainId-address" (both lowercase for consistency)
      const deletedSet = new Set(
        deletedRecords.map((r) => 
          `${r.chain_id}-${r.faucet_address.toLowerCase()}`
        )
      );
      
      console.log(`🗑️ Loaded ${deletedSet.size} deleted faucet addresses`);

      const newStatus: Record<string, { loading: boolean; error: string | null }> = {};
      const newCounts: Record<string, number> = {};
      const newActiveCounts: Record<string, number> = {};

      // 3. PROCESS EACH NETWORK
      await Promise.all(
        networks.map(async (network: Network) => {
          // Skip networks that don't match current wallet connection
          if (network.chainId !== chainId) {
            newStatus[network.name] = { loading: false, error: null };
            newCounts[network.name] = 0;
            newActiveCounts[network.name] = 0;
            return;
          }

          try {
            setNetworkStatus((prev) => ({
              ...prev,
              [network.name]: { loading: true, error: null },
            }));

            console.log(`🔍 Loading faucets for ${network.name} (Chain ID: ${network.chainId})`);

            // 4. FETCH ALL FAUCETS FROM BLOCKCHAIN
            const allFaucets: Faucet[] = await getFaucetsForNetwork(network, provider);
            console.log(`📥 Retrieved ${allFaucets.length} total faucets from blockchain`);

            // 5. FILTER OUT DELETED FAUCETS
            const validFaucets = allFaucets.filter((faucet) => {
              const lookupKey = `${network.chainId}-${faucet.address.toLowerCase()}`;
              const isDeleted = deletedSet.has(lookupKey);
              
              if (isDeleted) {
                console.log(`🚫 Filtering out deleted faucet: ${faucet.address}`);
              }
              
              return !isDeleted;
            });

            console.log(`✅ ${validFaucets.length} valid faucets after filtering`);

            // 6. COUNT ACTIVE FAUCETS (from valid faucets only)
            const activeFaucets = validFaucets.filter(
              (faucet) => faucet.isClaimActive
            );

            console.log(`⚡ ${activeFaucets.length} active faucets`);

            // 7. UPDATE STATE
            newCounts[network.name] = validFaucets.length;
            newActiveCounts[network.name] = activeFaucets.length;
            newStatus[network.name] = { loading: false, error: null };

          } catch (error) {
            console.error(`❌ Error loading faucets for ${network.name}:`, error);
            const errorMessage = `Failed to load faucets`;

            newStatus[network.name] = { loading: false, error: errorMessage };
            newCounts[network.name] = 0;
            newActiveCounts[network.name] = 0;

            toast({
              title: `Connection Error on ${network.name}`,
              description: errorMessage,
              variant: "destructive",
            });
          }
        })
      );

      // Update all states at once
      setNetworkStatus((prev) => ({ ...prev, ...newStatus }));
      setFaucetCounts((prev) => ({ ...prev, ...newCounts }));
      setActiveFaucetCounts((prev) => ({ ...prev, ...newActiveCounts }));
      
      console.log("✨ Faucet data loading complete");
    };

    if (networks.length > 0) {
      loadData();
    }
  }, [networks, toast, provider, chainId]);

  const currentNetwork: Network | undefined = networks.find(
    (network: Network) => network.chainId === chainId
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {currentNetwork ? (
        <div className="w-full">
          <Link href={`/network/${currentNetwork.chainId}`}>
            <Card className="overflow-hidden shadow-lg border-2 transition-all duration-300 ease-in-out hover:shadow-xl cursor-pointer">
              <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ border: `2px solid ${currentNetwork.color}` }}
                  >
                    <img
                      src={currentNetwork.logoUrl}
                      alt={`${currentNetwork.name} Logo`}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <CardTitle className="text-lg font-bold truncate text-primary">
                    {currentNetwork.name}
                  </CardTitle>
                </div>
                <StatusBadge status={networkStatus[currentNetwork.name]} />
              </CardHeader>

              <CardContent className="p-4 pt-0 grid grid-cols-2 gap-4 border-t border-dashed">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Faucets</p>
                  <p className="text-2xl font-extrabold text-card-foreground">
                    {faucetCounts[currentNetwork.name] ?? 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Currently Active
                  </p>
                  <p className="text-2xl font-extrabold text-green-500">
                    {activeFaucetCounts[currentNetwork.name] ?? 0}
                  </p>
                </div>
              </CardContent>

              <div className="p-2 text-center text-xs text-primary/80 font-medium">
                Click to explore available faucets on this network →
              </div>
            </Card>
          </Link>
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
                Your wallet is not connected to a supported network. Please
                switch networks to see available faucets.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}