"use client";

/**
 * ChallengeDashboardTab
 * ─────────────────────
 * Drop into the Dashboard page as a new "Challenge" tab section.
 * Shows: DROPS balance, stake/redeem actions, stake pools, match history stats.
 *
 * Usage in dashboard/page.tsx:
 *   import { ChallengeDashboardTab } from "@/components/challenge-dashboard-tab"
 *   // Add "challenge" to activeTab union type
 *   // Add tab button: Challenge
 *   // Render: {activeTab === 'challenge' && <ChallengeDashboardTab walletAddress={profile.wallet_address} />}
 */

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, Zap, Trophy, TrendingUp, Clock, CheckCircle2,
  Flame, BarChart3, Coins, ArrowDownToLine, ArrowUpFromLine,
  RefreshCw, AlertCircle, Lock, Unlock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BACKEND_URL = "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app";

interface DropsBalance {
  success: boolean;
  gameDrops: number;
  rewardDrops: number;
  tier: string;
  apyPct: number;
  rematchBadge: boolean;
  totalDuels: number;
  gamesUntilBadge: number;
  maxStake: number | null;
}

interface StakePool {
  id: string;
  drops_staked: number;
  g_value_usd: number;
  apy_pct: number;
  staked_at: string;
  matures_at: string;
  matured: boolean;
  claimed: boolean;
  claimed_at: string | null;
  g_earned: number | null;
}

interface RedeemHistory {
  id: string;
  drops_burned: number;
  g_price_usd: number;
  player_g: number;
  fee_g: number;
  staked_g: number;
  tx_hash: string | null;
  created_at: string;
}

interface MatchHistory {
  code: string;
  topic: string;
  stake_amount: number;
  token_symbol: string;
  status: string;
  winner_address: string | null;
  created_at: string;
  finished_at: string | null;
}

interface PreviewRedeem {
  dropsToRedeem: number;
  availableReward: number;
  gPriceUsd: number;
  playerG: number;
  feeG: number;
  stakedG: number;
  stakeEarnedG: number;
  apyPct: number;
  sufficient: boolean;
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Flood:    { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" },
  Torrent:  { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  Downpour: { bg: "bg-blue-50 dark:bg-blue-950/20",   text: "text-blue-600 dark:text-blue-400",   border: "border-blue-200 dark:border-blue-800" },
  Drizzle:  { bg: "bg-cyan-50 dark:bg-cyan-950/20",    text: "text-cyan-600 dark:text-cyan-400",    border: "border-cyan-200 dark:border-cyan-800" },
  Droplet:  { bg: "bg-slate-50 dark:bg-slate-900/40",  text: "text-slate-600 dark:text-slate-400",  border: "border-slate-200 dark:border-slate-700" },
};

const TIERS = [
  { name: "Droplet",  minDuels: 0,   apy: 15, next: 51  },
  { name: "Drizzle",  minDuels: 51,  apy: 20, next: 151 },
  { name: "Downpour", minDuels: 151, apy: 25, next: 301 },
  { name: "Torrent",  minDuels: 301, apy: 30, next: 501 },
  { name: "Flood",    minDuels: 501, apy: 35, next: null },
];

function fmt(n: number, decimals = 2) {
  if (n === 0) return "0";
  if (n < 0.001) return n.toFixed(6);
  return n.toFixed(decimals);
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Matured";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  walletAddress: string;
}

export function ChallengeDashboardTab({ walletAddress }: Props) {
  const { toast } = useToast();
  const wallet = walletAddress.toLowerCase();

  // ── Data state ─────────────────────────────────────────────────────────────
  const [balance, setBalance] = useState<DropsBalance | null>(null);
  const [stakes, setStakes] = useState<StakePool[]>([]);
  const [history, setHistory] = useState<RedeemHistory[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingStakes, setLoadingStakes] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // ── Inner tab ──────────────────────────────────────────────────────────────
  const [innerTab, setInnerTab] = useState<"overview" | "redeem" | "pools" | "history">("overview");

  // ── Redeem form ────────────────────────────────────────────────────────────
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemPreview, setRedeemPreview] = useState<PreviewRedeem | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [claimingStake, setClaimingStake] = useState<string | null>(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/balance/${wallet}`);
      const data = await res.json();
      if (data.success) setBalance(data);
    } catch { /* silent */ }
    finally { setLoadingBalance(false); }
  }, [wallet]);

  const fetchStakes = useCallback(async () => {
    setLoadingStakes(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/stakes/${wallet}`);
      const data = await res.json();
      if (data.success) setStakes(data.stakes ?? []);
    } catch { /* silent */ }
    finally { setLoadingStakes(false); }
  }, [wallet]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/redeem-history/${wallet}?limit=20`);
      const data = await res.json();
      if (data.success) setHistory(data.history ?? []);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }, [wallet]);

  const fetchMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/challenge/${wallet}/history?limit=20`);
      const data = await res.json();
      if (data.success) setMatchHistory(data.history ?? []);
    } catch { /* silent */ }
    finally { setLoadingMatches(false); }
  }, [wallet]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);
  useEffect(() => {
    if (innerTab === "pools") fetchStakes();
    if (innerTab === "history") { fetchHistory(); fetchMatches(); }
  }, [innerTab, fetchStakes, fetchHistory, fetchMatches]);

  // ── Redeem preview ─────────────────────────────────────────────────────────
  useEffect(() => {
    const amt = parseFloat(redeemAmount);
    if (!redeemAmount || isNaN(amt) || amt <= 0) { setRedeemPreview(null); return; }
    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/drops/preview-redeem?wallet=${wallet}&drops=${amt}`);
        const data = await res.json();
        if (data.success) setRedeemPreview(data);
      } catch { /* silent */ }
      finally { setPreviewLoading(false); }
    }, 600);
    return () => clearTimeout(timeout);
  }, [redeemAmount, wallet]);

  const handleRedeem = async () => {
    const amt = parseFloat(redeemAmount);
    if (!amt || amt <= 0) return;
    if (!redeemPreview?.sufficient) {
      toast({ title: "Insufficient reward drops", variant: "destructive" });
      return;
    }
    setRedeemLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, dropsAmount: amt }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "✅ Redeemed!", description: `${fmt(data.playerG, 4)} $G sent to your wallet.` });
        setRedeemAmount("");
        setRedeemPreview(null);
        fetchBalance();
        fetchStakes();
        fetchHistory();
      } else {
        toast({ title: "Redeem failed", description: data.detail ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleClaimStake = async (stakeId: string) => {
    setClaimingStake(stakeId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/claim-stake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, stakeId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "✅ Stake claimed!", description: `${fmt(data.totalG, 4)} $G (${fmt(data.earnedG, 4)} earned)` });
        fetchStakes();
      } else {
        toast({ title: "Claim failed", description: data.detail ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setClaimingStake(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const tierStyle = TIER_COLORS[balance?.tier ?? "Droplet"] ?? TIER_COLORS.Droplet;
  const currentTierDef = TIERS.find(t => t.name === (balance?.tier ?? "Droplet")) ?? TIERS[0];
  const nextTierDef = TIERS.find(t => t.minDuels > (balance?.totalDuels ?? 0)) ?? null;
  const progressToNext = nextTierDef
    ? Math.min(100, (((balance?.totalDuels ?? 0) - currentTierDef.minDuels) / (nextTierDef.minDuels - currentTierDef.minDuels)) * 100)
    : 100;
  const wins = matchHistory.filter(m => m.winner_address?.toLowerCase() === wallet);
  const matureUnclaimedStakes = stakes.filter(s => s.matured && !s.claimed);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loadingBalance) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* ── Inner Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto">
        {(["overview", "redeem", "pools", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => setInnerTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap capitalize relative ${innerTab === t ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t}
            {t === "pools" && matureUnclaimedStakes.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {matureUnclaimedStakes.length}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => { fetchBalance(); if (innerTab === "pools") fetchStakes(); if (innerTab === "history") { fetchHistory(); fetchMatches(); } }}
          className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          OVERVIEW
      ════════════════════════════════════════════════════════════════════ */}
      {innerTab === "overview" && (
        <div className="space-y-4">
          {/* Balance cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Game DROPS</span>
                </div>
                <p className="text-2xl font-black text-foreground">{fmt(balance?.gameDrops ?? 0, 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Used for staking</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Reward DROPS</span>
                </div>
                <p className="text-2xl font-black text-foreground">{fmt(balance?.rewardDrops ?? 0, 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Redeemable for $G</p>
              </CardContent>
            </Card>
          </div>

          {/* Tier card */}
          {balance && (
            <Card className={`border ${tierStyle.border} ${tierStyle.bg}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className={`h-4 w-4 ${tierStyle.text}`} />
                    <span className="font-black text-foreground">{balance.tier} Tier</span>
                  </div>
                  <Badge className={`${tierStyle.bg} ${tierStyle.text} ${tierStyle.border} border font-bold text-xs`}>
                    {balance.apyPct}% APY
                  </Badge>
                </div>
                {/* Progress bar */}
                {nextTierDef && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{balance.totalDuels} duels</span>
                      <span>{nextTierDef.minDuels} → {nextTierDef.name}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${tierStyle.text.replace("text-", "bg-")}`}
                        style={{ width: `${progressToNext}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {nextTierDef.minDuels - balance.totalDuels} more duels to unlock {nextTierDef.name} ({nextTierDef.apy}% APY)
                    </p>
                  </div>
                )}
                {!nextTierDef && (
                  <p className="text-xs text-muted-foreground">🌊 You've reached the highest tier!</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats row */}
          {balance && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Duels", value: balance.totalDuels, icon: BarChart3 },
                { label: "Rematch Badge", value: balance.rematchBadge ? "✅" : `${balance.gamesUntilBadge} left`, icon: Trophy },
                { label: "Max Stake", value: balance.maxStake ? `${balance.maxStake} DROPS` : "Unlimited", icon: Coins },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-muted/40 rounded-xl p-3 border border-border text-center">
                  <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <p className="font-black text-sm text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant="default"
              onClick={() => setInnerTab("redeem")}
              disabled={!balance || balance.rewardDrops <= 0}
            >
              <ArrowDownToLine className="h-4 w-4 mr-2" /> Redeem DROPS
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => setInnerTab("pools")}
            >
              <TrendingUp className="h-4 w-4 mr-2" /> View Pools
            </Button>
          </div>

          {/* Pre-badge warning */}
          {balance && !balance.rematchBadge && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Pre-Badge Restrictions</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  Play {balance.gamesUntilBadge} more game{balance.gamesUntilBadge !== 1 ? "s" : ""} to unlock the Rematch Badge — removes the {balance.maxStake} DROPS stake cap and allows rematches.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          REDEEM
      ════════════════════════════════════════════════════════════════════ */}
      {innerTab === "redeem" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-primary" />
                Redeem Reward DROPS → $G
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Available */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-sm text-muted-foreground font-medium">Available to redeem</span>
                <span className="font-black text-foreground">{fmt(balance?.rewardDrops ?? 0, 0)} DROPS</span>
              </div>

              {/* Requirements */}
              {balance && !balance.rematchBadge && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50">
                  <Lock className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400">
                    You need to play 10 games before redeeming. {balance.gamesUntilBadge} remaining.
                  </p>
                </div>
              )}

              {/* Amount input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Amount to Redeem</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={redeemAmount}
                    onChange={e => setRedeemAmount(e.target.value)}
                    placeholder="0"
                    min={1}
                    className="flex-1 font-mono font-bold text-lg h-12"
                    disabled={!balance?.rematchBadge}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 px-3 text-xs font-bold"
                    onClick={() => setRedeemAmount(String(Math.floor(balance?.rewardDrops ?? 0)))}
                    disabled={!balance?.rematchBadge}
                  >
                    MAX
                  </Button>
                </div>
              </div>

              {/* Quick picks */}
              <div className="flex gap-2">
                {[10, 25, 50, 100].filter(v => (balance?.rewardDrops ?? 0) >= v).map(v => (
                  <button
                    key={v}
                    onClick={() => setRedeemAmount(String(v))}
                    disabled={!balance?.rematchBadge}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${parseFloat(redeemAmount) === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"} disabled:opacity-40`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Preview */}
              {previewLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {redeemPreview && !previewLoading && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-3">Breakdown</p>
                  {[
                    { label: "You receive", value: `${fmt(redeemPreview.playerG, 4)} $G`, highlight: true },
                    { label: "Fee (10%)", value: `${fmt(redeemPreview.feeG, 4)} $G` },
                    { label: `Staked (${redeemPreview.apyPct}% APY, 30d)`, value: `${fmt(redeemPreview.stakedG, 4)} $G` },
                    { label: "Projected stake yield", value: `+${fmt(redeemPreview.stakeEarnedG, 4)} $G` },
                    { label: "$G price", value: `$${fmt(redeemPreview.gPriceUsd, 4)}` },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className={`text-xs font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
                    </div>
                  ))}
                  {!redeemPreview.sufficient && (
                    <p className="text-xs text-red-500 font-bold pt-1">Insufficient reward drops.</p>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleRedeem}
                disabled={
                  redeemLoading || !redeemPreview || !redeemPreview.sufficient ||
                  !balance?.rematchBadge
                }
              >
                {redeemLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redeeming…</>
                ) : (
                  <><ArrowDownToLine className="h-4 w-4 mr-2" /> Redeem {redeemAmount || "0"} DROPS</>
                )}
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                Reward DROPS are burned; $G is sent to your wallet. 30-day stake vests on Celo.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          POOLS
      ════════════════════════════════════════════════════════════════════ */}
      {innerTab === "pools" && (
        <div className="space-y-3">
          {loadingStakes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : stakes.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No stake pools yet</p>
              <p className="text-xs mt-1">Redeem reward DROPS to create your first pool.</p>
            </div>
          ) : (
            <>
              {matureUnclaimedStakes.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                    {matureUnclaimedStakes.length} stake{matureUnclaimedStakes.length > 1 ? "s" : ""} ready to claim!
                  </p>
                </div>
              )}
              {stakes.map(stake => {
                const isMature = stake.matured || new Date(stake.matures_at) <= new Date();
                const isClaiming = claimingStake === stake.id;
                return (
                  <Card key={stake.id} className={`${isMature && !stake.claimed ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/10" : ""}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isMature && !stake.claimed ? (
                            <Unlock className="h-4 w-4 text-green-500" />
                          ) : stake.claimed ? (
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-bold text-foreground">
                            {fmt(stake.drops_staked, 0)} DROPS staked
                          </span>
                        </div>
                        <Badge variant={stake.claimed ? "secondary" : isMature ? "default" : "outline"} className="text-xs">
                          {stake.claimed ? "Claimed" : isMature ? "Ready" : `${timeUntil(stake.matures_at)}`}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/40 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Value</p>
                          <p className="text-sm font-black">${fmt(stake.g_value_usd, 2)}</p>
                        </div>
                        <div className="bg-muted/40 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">APY</p>
                          <p className="text-sm font-black text-primary">{stake.apy_pct}%</p>
                        </div>
                        <div className="bg-muted/40 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Earned</p>
                          <p className="text-sm font-black text-green-600 dark:text-green-400">
                            {stake.g_earned != null ? `${fmt(stake.g_earned, 4)} $G` : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Staked {timeAgo(stake.staked_at)}</span>
                        <span>Matures {timeUntil(stake.matures_at)}</span>
                      </div>
                      {isMature && !stake.claimed && (
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => handleClaimStake(stake.id)}
                          disabled={isClaiming}
                        >
                          {isClaiming ? (
                            <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Claiming…</>
                          ) : (
                            <><ArrowUpFromLine className="h-3 w-3 mr-2" /> Claim $G</>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          HISTORY
      ════════════════════════════════════════════════════════════════════ */}
      {innerTab === "history" && (
        <div className="space-y-4">
          {/* Match stats */}
          {matchHistory.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Played", val: matchHistory.length },
                { label: "Won", val: wins.length },
                { label: "Lost", val: matchHistory.length - wins.length },
                { label: "Win%", val: `${matchHistory.length > 0 ? Math.round((wins.length / matchHistory.length) * 100) : 0}%` },
              ].map(s => (
                <div key={s.label} className="bg-muted/40 border border-border rounded-xl p-2 text-center">
                  <p className="font-black text-base text-foreground">{s.val}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Match list */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Recent Matches</p>
            {loadingMatches ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : matchHistory.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground">
                <p className="text-sm">No matches played yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {matchHistory.map(m => {
                  const isWin = m.winner_address?.toLowerCase() === wallet;
                  const isTie = m.status === "finished" && !m.winner_address;
                  return (
                    <div key={m.code} className={`flex items-center gap-3 p-3 rounded-xl border ${isWin ? "border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/10" : isTie ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10" : "border-border bg-muted/20"}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-black ${isWin ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : isTie ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                        {isWin ? "W" : isTie ? "T" : "L"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{m.topic}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">#{m.code}{m.finished_at ? ` · ${timeAgo(m.finished_at)}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-black ${isWin ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          {isWin ? `+${m.stake_amount * 2}` : isTie ? `±${m.stake_amount}` : `-${m.stake_amount}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{m.token_symbol}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Redeem history */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Redeem History</p>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground">
                <p className="text-xs">No redemptions yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Coins className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{fmt(h.drops_burned, 0)} DROPS burned</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(h.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-primary">+{fmt(h.player_g, 4)} $G</p>
                      <p className="text-[10px] text-muted-foreground">${fmt(h.g_price_usd, 4)}/G</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}   