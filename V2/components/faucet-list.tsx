"use client"

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Coins, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { buildFaucetSlug } from "@/lib/faucet-slug";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape of a row in the `claim_data` table */
type ClaimRow = {
  faucet_address: string;
  faucet_name: string;
  network: string;
  chain_id: number;
  rank: number;
  claims: number;
  total_transactions: number;
  total_amount: string;
  latest_claim_time: number;
  updated_at: string;
  slug?: string;   
};

/** Shape of a row in the `dashboard_meta` table */
type DashboardMeta = {
  id: number;
  total_claims: number;
  total_unique_users: number;
  total_faucets: number;
  total_transactions: number;
  last_updated: string;
};

// ── Cache ─────────────────────────────────────────────────────────────────────
const CACHE_KEY_CLAIMS  = "sb_claim_rows";
const CACHE_KEY_META    = "sb_dashboard_meta";
const CACHE_KEY_TS      = "sb_last_fetched";
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function saveCache(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}

function loadCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function isCacheValid(): boolean {
  const ts = loadCache<number>(CACHE_KEY_TS);
  return !!ts && Date.now() - ts < CACHE_DURATION_MS;
}
const getFaucetHref = (claim: ClaimRow) =>
  claim.slug
    ? `/faucet/${claim.slug}`
    : `/faucet/${buildFaucetSlug(claim.faucet_name, claim.faucet_address)}`;
// ── Supabase fetchers ─────────────────────────────────────────────────────────

async function fetchClaimRows(): Promise<ClaimRow[]> {
  // Step 1: fetch claim_data normally
  const { data, error } = await supabase
    .from("claim_data")
    .select("*")
    .order("latest_claim_time", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  // Step 2: batch fetch slugs from faucet_details using the addresses
  const addresses = data.map((r) => r.faucet_address.toLowerCase());
  const { data: slugRows } = await supabase
    .from("faucet_details")
    .select("faucet_address, slug")
    .in("faucet_address", addresses);

  // Step 3: build a slug lookup map
  const slugMap: Record<string, string> = {};
  for (const row of slugRows ?? []) {
    slugMap[row.faucet_address.toLowerCase()] = row.slug;
  }

  // Step 4: merge slug into each claim row
  return data.map((row) => ({
    ...row,
    slug: slugMap[row.faucet_address.toLowerCase()] ?? null,
  })) as ClaimRow[];
}

async function fetchDashboardMeta(): Promise<DashboardMeta | null> {
  const { data, error } = await supabase
    .from("dashboard_meta")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) return null;
  return data as DashboardMeta;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FaucetList() {
  const [claims, setClaims]             = useState<ClaimRow[]>([]);
  const [meta, setMeta]                 = useState<DashboardMeta | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [page, setPage]                 = useState(1);
  const [isExpanded, setIsExpanded]     = useState(false);
  const [isMobile, setIsMobile]         = useState(false);

  const claimsPerPage = isMobile ? 5 : 10;

  // ── Responsive detection ───────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setPage(1); }, [isMobile]);

  // ── Load from Supabase (with local cache) ──────────────────────────────────
  const loadData = useCallback(async (forceRefresh = false) => {
    forceRefresh ? setRefreshing(true) : setLoading(true);

    try {
      // Serve from cache when valid and not forcing
      if (!forceRefresh && isCacheValid()) {
        const cachedClaims = loadCache<ClaimRow[]>(CACHE_KEY_CLAIMS);
        const cachedMeta   = loadCache<DashboardMeta>(CACHE_KEY_META);
        if (cachedClaims?.length) {
          setClaims(cachedClaims);
          setMeta(cachedMeta ?? null);
          return;
        }
      }

      // Fresh fetch from Supabase
      const [rows, dashMeta] = await Promise.all([
        fetchClaimRows(),
        fetchDashboardMeta(),
      ]);

      setClaims(rows);
      setMeta(dashMeta);
      setPage(1);

      // Persist to cache
      saveCache(CACHE_KEY_CLAIMS, rows);
      saveCache(CACHE_KEY_META, dashMeta);
      saveCache(CACHE_KEY_TS, Date.now());

      if (forceRefresh) toast.success("Drops refreshed successfully");

    } catch (err: any) {
      console.error("Error loading drops from Supabase:", err);
      toast.error("Failed to load drops. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadData(); }, [loadData]);

  // Background auto-refresh
  useEffect(() => {
    const id = setInterval(() => loadData(true), CACHE_DURATION_MS);
    return () => clearInterval(id);
  }, [loadData]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages     = Math.ceil(claims.length / claimsPerPage);
  const paginatedClaims = claims.slice((page - 1) * claimsPerPage, page * claimsPerPage);

  const lastUpdated = meta?.last_updated
    ? new Date(meta.last_updated).toLocaleTimeString()
    : loadCache<number>(CACHE_KEY_TS)
      ? new Date(loadCache<number>(CACHE_KEY_TS)!).toLocaleTimeString()
      : "Never";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg sm:text-xl">Recent Drops</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm"
            >
              {isExpanded ? (
                <> Collapse <ChevronUp className="h-4 w-4" /> </>
              ) : (
                <> View Drops <ChevronDown className="h-4 w-4" /> </>
              )}
            </Button>
          </div>
        </div>

        {isExpanded && claims.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Total: {meta?.total_claims ?? claims.length} drops across all networks
            &nbsp;•&nbsp;Last updated: {lastUpdated}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10 sm:py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto" />
                <p className="mt-4 text-sm sm:text-base">Loading drops…</p>
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
              {/* ── Mobile cards ─────────────────────────────────────────── */}
              <div className="block sm:hidden space-y-3">
                {paginatedClaims.map((claim, i) => (
                  <Card key={`${claim.faucet_address}-${i}`} className="p-3">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Faucet:</span>
                        <Link
                          href={getFaucetHref(claim)}
                          className="text-blue-600 hover:underline text-right max-w-[160px] truncate"
                        >
                          {claim.faucet_name ||
                            `${claim.faucet_address.slice(0, 6)}…${claim.faucet_address.slice(-4)}`}
                        </Link>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Claims:</span>
                        <span className="font-medium">{claim.claims.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Network:</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {claim.network}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Last Drop:</span>
                        <span>
                          {claim.latest_claim_time
                            ? new Date(claim.latest_claim_time * 1000).toLocaleString()
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* ── Desktop table ─────────────────────────────────────────── */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Rank</TableHead>
                      <TableHead className="text-xs sm:text-sm">Faucet</TableHead>
                      <TableHead className="text-xs sm:text-sm">Total Claims</TableHead>
                      <TableHead className="text-xs sm:text-sm">Network</TableHead>
                      <TableHead className="text-xs sm:text-sm">Last Drop</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClaims.map((claim, i) => (
                      <TableRow key={`${claim.faucet_address}-${i}`}>
                        <TableCell className="text-xs sm:text-sm text-muted-foreground">
                          #{claim.rank ?? (page - 1) * claimsPerPage + i + 1}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <Link
                            href={getFaucetHref(claim)}
                            className="text-blue-600 hover:underline max-w-[160px] truncate block"
                            title={claim.faucet_name}
                          >
                            {claim.faucet_name ||
                              `${claim.faucet_address.slice(0, 6)}…${claim.faucet_address.slice(-4)}`}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm font-medium">
                          {claim.claims.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
                            {claim.network}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {claim.latest_claim_time
                            ? new Date(claim.latest_claim_time * 1000).toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ── Pagination ────────────────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Showing {(page - 1) * claimsPerPage + 1}–
                    {Math.min(page * claimsPerPage, claims.length)} of {claims.length} faucets
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || loading || refreshing}
                      className="text-xs sm:text-sm hover:bg-primary/10"
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
                      disabled={page === totalPages || loading || refreshing}
                      className="text-xs sm:text-sm hover:bg-primary/10"
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