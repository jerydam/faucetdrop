"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, Zap, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Network } from "@/hooks/use-network";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface NetworkCounts {
  total: number;
  active: number;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  loading: boolean;
  error: boolean;
}

const StatusBadge = ({ loading, error }: StatusBadgeProps) => {
  if (loading) return (
    <div className="flex items-center text-xs text-blue-500">
      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      Loading
    </div>
  );
  if (error) return (
    <div className="flex items-center text-xs text-amber-500">
      <AlertTriangle className="mr-1 h-3 w-3" />
      Issue
    </div>
  );
  return (
    <div className="flex items-center text-xs text-green-500">
      <Zap className="mr-1 h-3 w-3" />
      Online
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface NetworkGridProps {
  className?: string;
}

export function NetworkGrid({ className = "" }: NetworkGridProps) {
  const { chainId } = useWallet();
  const { networks } = useNetwork();

  const [counts, setCounts] = useState<Record<number, NetworkCounts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!networks.length) return;

    async function fetchCounts() {
      setLoading(true);
      setError(false);

      try {
        // Single query — fetch total and active counts for ALL networks at once.
        // Supabase returns one row per chain_id with aggregated counts.
        const { data, error: supaErr } = await supabase
          .from("network_faucets")
          .select("chain_id, is_claim_active");

        if (supaErr) throw supaErr;

        // Aggregate client-side — avoids needing a DB function
        const map: Record<number, NetworkCounts> = {};
        for (const row of data ?? []) {
          const id = row.chain_id as number;
          if (!map[id]) map[id] = { total: 0, active: 0 };
          map[id].total += 1;
          if (row.is_claim_active) map[id].active += 1;
        }
        setCounts(map);
      } catch (err) {
        console.error("NetworkGrid: failed to load faucet counts", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, [networks]);

  const currentNetwork = networks.find((n: Network) => n.chainId === chainId);
  const currentCounts  = currentNetwork ? (counts[currentNetwork.chainId] ?? { total: 0, active: 0 }) : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {currentNetwork ? (
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

              <StatusBadge loading={loading} error={error} />
            </CardHeader>

            <CardContent className="p-4 pt-0 grid grid-cols-2 gap-4 border-t border-dashed">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Faucets</p>
                <p className="text-2xl font-extrabold text-card-foreground">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    currentCounts?.total ?? 0
                  )}
                </p>
              </div>
              
            </CardContent>

            <div className="p-2 text-center text-xs text-primary/80 font-medium">
              Click to explore available faucets on this network →
            </div>
          </Card>
        </Link>
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