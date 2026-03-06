"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Sparkles, Loader2, CheckCircle2, ChevronUp, ChevronDown,
  Clock, Users, Trophy, Zap, Edit3, Eye, ArrowLeft, Copy, BookOpen,
  Lightbulb, Check, Coins, Gift, Info, Crown, Award, Medal,
  Equal, Percent, AlertCircle, Upload, ImageIcon, X as XIcon, Link,
} from "lucide-react";
import {
  deployQuizReward,
  FACTORY_ADDRESSES,
  type QuizRewardConfig,
} from "@/lib/quiz";
import { BrowserProvider } from "ethers";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWallets } from "@privy-io/react-auth";

const API_BASE_URL = "http://127.0.0.1:8000";

// ── Types ──────────────────────────────────────────────────────
interface QuizOption { id: "A" | "B" | "C" | "D"; text: string }
interface QuizQuestion {
  id: string; question: string; options: QuizOption[];
  correctId: "A" | "B" | "C" | "D"; timeLimit: number;
}
type DistributionType = "equal" | "custom";
interface RewardConfig {
  poolAmount: string; tokenAddress: string; tokenSymbol: string;
  tokenDecimals: number; tokenLogoUrl: string; totalWinners: number;
  distributionType: DistributionType; customTiers: Record<number, string>;
}

const MIN_POOL_USD_VALUE = 50;
const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

interface TokenConfiguration {
  address: string; name: string; symbol: string; decimals: number;
  isNative?: boolean; logoUrl: string; description: string;
}

const ALL_TOKENS_BY_CHAIN: Record<number, TokenConfiguration[]> = {
  42220: [
    { address: "0x471EcE3750Da237f93B8E339c536989b8978a438", name: "Celo", symbol: "CELO", decimals: 18, isNative: true, logoUrl: "/celo.jpeg", description: "Native Celo token" },
    { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", name: "Celo Dollar", symbol: "cUSD", decimals: 18, logoUrl: "/cusd.png", description: "USD-pegged stablecoin" },
    { address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", name: "Tether", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Tether USD stablecoin" },
    { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "USD Coin stablecoin" },
  ],
  1135: [
    { address: "0x0000000000000000000000000000000000000000", name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum" },
    { address: "0xac485391EB2d7D88253a7F1eF18C37f4242D1A24", name: "Lisk", symbol: "LSK", decimals: 18, logoUrl: "/lsk.png", description: "Lisk native token" },
  ],
  42161: [
    { address: "0x0000000000000000000000000000000000000000", name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum" },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "Native USD Coin" },
  ],
  8453: [
    { address: "0x0000000000000000000000000000000000000000", name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum" },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "Native USD Coin" },
  ],
  56: [
    { address: "0x0000000000000000000000000000000000000000", name: "BNB", symbol: "BNB", decimals: 18, isNative: true, logoUrl: "/bnb.png", description: "Native BNB" },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", name: "USD Coin", symbol: "USDC", decimals: 18, logoUrl: "/usdc.jpg", description: "Binance-Peg USD Coin" },
    { address: "0x55d398326f99059fF775485246999027B3197955", name: "Tether USD", symbol: "USDT", decimals: 18, logoUrl: "/usdt.jpg", description: "Binance-Peg BSC-USD" },
    { address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", name: "BUSD", symbol: "BUSD", decimals: 18, logoUrl: "/busd.png", description: "Binance-Peg BUSD Token" },
  ],
};

const COINGECKO_IDS: Record<string, string> = {
  CELO: "celo", cUSD: "celo-dollar", USDT: "tether", USDC: "usd-coin",
  ETH: "ethereum", LSK: "lisk", BNB: "binance-coin", BUSD: "binance-usd",
};
const CHAIN_NAMES: Record<number, string> = {
  42220: "Celo", 1135: "Lisk", 42161: "Arbitrum", 8453: "Base", 56: "BNB Chain",
};
const OPTION_COLORS: Record<string, string> = {
  A: "bg-red-500 hover:bg-red-600", B: "bg-blue-500 hover:bg-blue-600",
  C: "bg-yellow-500 hover:bg-yellow-600", D: "bg-green-500 hover:bg-green-600",
};
const OPTION_SHAPES: Record<string, string> = { A: "▲", B: "◆", C: "●", D: "■" };
const RANK_ICONS = [Crown, Medal, Award, Trophy, Trophy, Trophy, Trophy, Trophy, Trophy, Trophy];
const RANK_COLORS = [
  "text-yellow-500", "text-slate-400", "text-amber-600",
  "text-indigo-400", "text-indigo-400", "text-indigo-400",
  "text-indigo-400", "text-indigo-400", "text-indigo-400", "text-indigo-400",
];

const blankQuestion = (): QuizQuestion => ({
  id: crypto.randomUUID(),
  question: "",
  options: [{ id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }],
  correctId: "A",
  timeLimit: 30,
});

function calcDistribution(config: RewardConfig) {
  const pool = parseFloat(config.poolAmount) || 0;
  const n = config.totalWinners;
  if (n === 0 || pool === 0) return [];
  const rows: { rank: number; pct: number; amount: number }[] = [];
  if (config.distributionType === "equal") {
    const share = 100 / n;
    for (let i = 1; i <= n; i++) rows.push({ rank: i, pct: share, amount: (pool * share) / 100 });
  } else {
    const defaultPct = 100 / n;
    for (let i = 1; i <= n; i++) {
      const pct = parseFloat(config.customTiers[i] ?? String(defaultPct)) || 0;
      rows.push({ rank: i, pct, amount: (pool * pct) / 100 });
    }
  }
  return rows;
}

function customTierTotal(config: RewardConfig): number {
  return Array.from({ length: config.totalWinners }, (_, i) =>
    parseFloat(config.customTiers[i + 1] ?? "0") || 0
  ).reduce((a, b) => a + b, 0);
}

// ── Image Uploader Component ───────────────────────────────────
type CoverInputMode = "upload" | "url";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
}

function ImageUploader({ value, onChange, isUploading, setIsUploading }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<CoverInputMode>("upload");
  const [urlInput, setUrlInput] = useState(value.startsWith("http") ? value : "");

  // FIX: Upload to server instead of base64 to avoid large payloads being rejected
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Use JPG, PNG, GIF, WebP or SVG.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/api/upload-image`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        onChange(data.url);
        toast.success("Image uploaded!");
      } else {
        throw new Error(data.detail || "Upload failed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, [onChange, setIsUploading]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const handleUrlApply = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) { onChange(""); return; }
    if (!/^https?:\/\//i.test(trimmed)) { toast.error("URL must start with http:// or https://"); return; }
    onChange(trimmed);
    toast.success("Cover image URL set");
  };

  const clear = () => {
    onChange("");
    setUrlInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
            mode === "upload"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500"
          )}
        >
          <Upload className="h-3.5 w-3.5" /> Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
            mode === "url"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500"
          )}
        >
          <Link className="h-3.5 w-3.5" /> Paste URL
        </button>
      </div>

      {/* Preview */}
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-36 sm:h-44">
          <img
            src={value}
            alt="Cover preview"
            className="w-full h-full object-cover"
            onError={() => { toast.error("Could not load image"); onChange(""); }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg transition-all"
            >
              <XIcon className="h-3 w-3" /> Remove
            </button>
          </div>
          <div className="absolute bottom-2 left-3">
            <span className="text-white text-xs font-bold drop-shadow">Cover Image</span>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && !value && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
              "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all h-36 sm:h-44 select-none",
              isDragging
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]"
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20",
              isUploading && "pointer-events-none opacity-60"
            )}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uploading…</p>
              </div>
            ) : (
              <>
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                  isDragging ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-slate-100 dark:bg-slate-700"
                )}>
                  {isDragging
                    ? <Upload className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    : <ImageIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  }
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {isDragging ? "Drop it here!" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    JPG, PNG, GIF, WebP, SVG — max {MAX_FILE_SIZE_MB}MB
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* URL mode */}
      {mode === "url" && !value && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleUrlApply()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <Button
            type="button"
            onClick={handleUrlApply}
            disabled={!urlInput.trim()}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Apply
          </Button>
        </div>
      )}

      {/* Replace button */}
      {value && mode === "upload" && (
        <button
          type="button"
          onClick={clear}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
        >
          ↩ Replace with different image
        </button>
      )}
    </div>
  );
}

// ── Reward Preview ─────────────────────────────────────────────
function RewardPreview({ config }: { config: RewardConfig }) {
  const rows = useMemo(() => calcDistribution(config), [config]);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">Distribution Preview</p>
      <div className="space-y-1.5">
        {rows.map(row => {
          const Icon = RANK_ICONS[row.rank - 1] ?? Trophy;
          const color = RANK_COLORS[row.rank - 1] ?? "text-indigo-400";
          return (
            <div key={row.rank} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-800">
              <Icon className={cn("h-4 w-4 shrink-0", color)} />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-12">#{row.rank}</span>
              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all",
                    row.rank === 1 ? "bg-yellow-500" : row.rank === 2 ? "bg-slate-400" : row.rank === 3 ? "bg-amber-600" : "bg-indigo-500"
                  )}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-white text-right w-28 tabular-nums">
                {row.amount.toFixed(4)} <span className="font-medium text-slate-400 dark:text-slate-500">{config.tokenSymbol || "TKN"}</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 w-10 text-right">{row.pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared Reward Block ────────────────────────────────────────
function RewardBlock({ reward, setR, setReward, availableTokens, chainId, chainName, tokenPrice, isFetchingPrice, poolUsdValue, isBelowMinimum }: any) {
  return (
    <CardContent className="space-y-5 border-t pt-5">
      {chainId > 0 ? (
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Connected to</span>
          <span className="text-xs font-black text-slate-900 dark:text-white">{chainName}</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-auto">Chain {chainId}</Badge>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300">Connect your wallet to select a token</span>
        </div>
      )}

      {availableTokens.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-700 dark:text-slate-300">Reward Token <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 gap-2">
            {availableTokens.map((token: TokenConfiguration) => (
              <button key={token.address} type="button"
                onClick={() => setReward((prev: RewardConfig) => ({ ...prev, tokenAddress: token.address, tokenSymbol: token.symbol, tokenDecimals: token.decimals, tokenLogoUrl: token.logoUrl }))}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all",
                  reward.tokenAddress === token.address
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                )}
              >
                <img src={token.logoUrl} alt={token.symbol}
                  className="w-7 h-7 rounded-full object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                  onError={e => { (e.target as HTMLImageElement).src = "/fallback-token.png"; }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white leading-none">{token.symbol}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{token.name}</div>
                </div>
                {reward.tokenAddress === token.address && <Check className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500 ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5" /> Pool Amount <span className="text-red-500">*</span>
          <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 font-normal">Min ${MIN_POOL_USD_VALUE} USD</span>
        </Label>
        <div className="relative">
          <Input type="number" min="0" step="any" value={reward.poolAmount}
            onChange={e => setR({ poolAmount: e.target.value })} placeholder="0.00"
            className={cn("h-11 font-mono pr-24 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white",
              isBelowMinimum && "border-red-500 focus-visible:ring-red-500")} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isFetchingPrice && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
            {reward.tokenLogoUrl && <img src={reward.tokenLogoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />}
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{reward.tokenSymbol}</span>
          </div>
        </div>
        {poolUsdValue !== null && (
          <div className={cn("flex items-center gap-2 text-xs rounded-lg px-3 py-2",
            isBelowMinimum ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400" : "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400")}>
            {isBelowMinimum ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
            <span className="font-bold">≈ ${poolUsdValue.toFixed(2)} USD</span>
            {isBelowMinimum && <span className="opacity-80">— minimum is ${MIN_POOL_USD_VALUE}.</span>}
          </div>
        )}
        {tokenPrice === null && reward.tokenSymbol && !isFetchingPrice && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Could not fetch price. Minimum pool check skipped.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Number of Winners</Label>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 font-black"
            onClick={() => setR({ totalWinners: Math.max(1, reward.totalWinners - 1) })}>-</Button>
          <div className="flex-1 text-center text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{reward.totalWinners}</div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 font-black"
            onClick={() => setR({ totalWinners: Math.min(10, reward.totalWinners + 1) })}>+</Button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[1, 2, 3, 5, 10].map(n => (
            <Button key={n} variant={reward.totalWinners === n ? "default" : "outline"} size="sm"
              className="h-7 px-3 text-xs font-bold" onClick={() => setR({ totalWinners: n })}>Top {n}</Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-slate-700 dark:text-slate-300">Distribution Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { type: "equal" as const, icon: Equal, label: "Equal Split", desc: "Everyone wins the same" },
            { type: "custom" as const, icon: Percent, label: "Custom Tiers", desc: "Set each winner's % manually" },
          ] as const).map(({ type, icon: Icon, label, desc }) => (
            <button key={type} onClick={() => setR({ distributionType: type })}
              className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all text-xs",
                reward.distributionType === type
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900")}>
              <Icon className="h-5 w-5" />
              <span className="font-bold">{label}</span>
              <span className="opacity-70 text-[10px] leading-tight">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {reward.distributionType === "custom" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-700 dark:text-slate-300">Set % per winner rank</Label>
            {(() => {
              const total = customTierTotal(reward);
              return (
                <span className={cn("text-xs font-black tabular-nums",
                  total > 100 ? "text-red-500" : total < 100 ? "text-amber-500" : "text-green-500")}>
                  {total.toFixed(1)}% {total > 100 ? "⚠ over" : total < 100 ? `(${(100 - total).toFixed(1)}% left)` : "✓"}
                </span>
              );
            })()}
          </div>
          <div className="space-y-2">
            {Array.from({ length: reward.totalWinners }, (_, i) => {
              const rank = i + 1;
              const Icon = RANK_ICONS[i] ?? Trophy;
              const color = RANK_COLORS[i] ?? "text-indigo-400";
              return (
                <div key={rank} className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4 shrink-0", color)} />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-12">#{rank}</span>
                  <div className="flex-1 relative">
                    <Input type="number" min="0" max="100" step="0.1"
                      value={reward.customTiers[rank] ?? ""}
                      onChange={e => setReward((prev: RewardConfig) => ({ ...prev, customTiers: { ...prev.customTiers, [rank]: e.target.value } }))}
                      placeholder={`${(100 / reward.totalWinners).toFixed(1)}`}
                      className="h-9 pr-8 font-mono text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 w-24 text-right tabular-nums">
                    {reward.poolAmount ? `${((parseFloat(reward.poolAmount) || 0) * (parseFloat(reward.customTiers[rank] ?? "0") || 0) / 100).toFixed(4)} ${reward.tokenSymbol}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
            const equal = (100 / reward.totalWinners).toFixed(1);
            const reset: Record<number, string> = {};
            for (let i = 1; i <= reward.totalWinners; i++) reset[i] = equal;
            setReward((prev: RewardConfig) => ({ ...prev, customTiers: reset }));
          }}>Reset to Equal</Button>
        </div>
      )}

      <RewardPreview config={reward} />

      <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Rewards are processed automatically when the quiz ends. Ensure the reward pool is funded before starting.
        </p>
      </div>
    </CardContent>
  );
}
type DeployStep = "idle" | "deploying" | "saving" | "done" | "error";

interface DeployProgressProps {
  step: DeployStep;
  contractAddress?: string;
  error?: string;
}
export function DeployProgress({ step, contractAddress, error }: DeployProgressProps) {
  if (step === "idle") return null;

  const steps = [
    {
      key: "deploying" as DeployStep,
      label: "Deploy Contract",
      desc: "Creating your QuizReward contract on-chain",
    },
    {
      key: "saving" as DeployStep,
      label: "Save Quiz",
      desc: "Storing quiz + contract info on the backend",
    },
    {
      key: "done" as DeployStep,
      label: "Done!",
      desc: "Head to the lobby to fund & start",
    },
  ];

  const order: DeployStep[] = ["deploying", "saving", "done"];
  const currentIdx = order.indexOf(step);

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/30 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center gap-2">
        {step === "error" ? (
          // AlertCircle from lucide-react
          <span className="text-red-500 text-base">✗</span>
        ) : step === "done" ? (
          <span className="text-green-500 text-base">✓</span>
        ) : (
          // Spinning indicator via CSS
          <span
            className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
          />
        )}
        <p className="font-black text-sm text-slate-900 dark:text-white">
          {step === "error"
            ? "Transaction Failed"
            : step === "done"
            ? "Quiz Created Successfully!"
            : "Creating Your Quiz…"}
        </p>
      </div>

      {/* Step list */}
      {step !== "error" && (
        <div className="space-y-2.5">
          {steps.map(({ key, label, desc }, i) => {
            const stepIdx = order.indexOf(key);
            const isDone = step === "done" || stepIdx < currentIdx;
            const isActive = stepIdx === currentIdx && step !== "done";
            const isPending = stepIdx > currentIdx && step !== "done";

            return (
              <div key={key} className="flex items-start gap-3">
                <div
                  className={[
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 transition-all",
                    isDone
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
                  ].join(" ")}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      "text-xs font-bold",
                      isDone
                        ? "text-green-700 dark:text-green-400"
                        : isActive
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-slate-400 dark:text-slate-500",
                    ].join(" ")}
                  >
                    {label}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {desc}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error message */}
      {step === "error" && error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
          <p className="text-xs text-red-700 dark:text-red-400 font-medium break-words">
            {error}
          </p>
        </div>
      )}

      {/* Success: show contract address */}
      {step === "done" && contractAddress && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2 space-y-0.5">
          <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wide">
            Reward contract deployed
          </p>
          <p className="text-[10px] font-mono text-green-700 dark:text-green-300 break-all">
            {contractAddress}
          </p>
        </div>
      )}
    </div>
  );
}
export {};

// ══════════════════════════════════════════════════════════════
//  Main Page
// ══════════════════════════════════════════════════════════════
export default function CreateQuizPage() {
  const router = useRouter();
  const { address: userWalletAddress } = useWallet();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const chainId = activeWallet ? parseInt(activeWallet.chainId.split(":")[1] ?? "0") : 0;
  const availableTokens = ALL_TOKENS_BY_CHAIN[chainId] ?? [];
  const chainName = CHAIN_NAMES[chainId] ?? "Unknown Network";

  type DeployStep = "idle" | "deploying" | "saving" | "done" | "error";
  const [deployStep, setDeployStep] = useState<DeployStep>("idle");
  const [deployError, setDeployError] = useState("");
  const [rewardContractAddress, setRewardContractAddress] = useState("");
  
  const getQuizRewardConfig = (): QuizRewardConfig => {
    const selectedToken = availableTokens.find(t => t.address === reward.tokenAddress);
    return {
      name: title.trim() || "Quiz Reward",
      tokenAddress: reward.tokenAddress,
      tokenDecimals: reward.tokenDecimals,
      isNativeToken: selectedToken?.isNative ?? false,
      poolAmount: reward.poolAmount,
      claimWindowDuration: 172800, // 48h — winners have 48h to claim after quiz ends
    };
  };
  // Meta
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number>(0);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  // Cover image
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // FIX: Fetch creator username from profile instead of hardcoding ""
  const [creatorUsername, setCreatorUsername] = useState("");
  React.useEffect(() => {
    if (!userWalletAddress) return;
    fetch(`${API_BASE_URL}/api/profile/${userWalletAddress}`)
      .then(r => r.json())
      .then(d => {
        if (d.username) setCreatorUsername(d.username);
      })
      .catch(() => {});
  }, [userWalletAddress]);

  // Questions
  const [questions, setQuestions] = useState<QuizQuestion[]>([blankQuestion()]);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);

  // Reward
  const [reward, setReward] = useState<RewardConfig>({
    poolAmount: "", tokenAddress: "", tokenSymbol: "", tokenDecimals: 18,
    tokenLogoUrl: "", totalWinners: 3, distributionType: "equal", customTiers: {},
  });
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const poolUsdValue = tokenPrice !== null && reward.poolAmount
    ? (parseFloat(reward.poolAmount) || 0) * tokenPrice : null;
  const isBelowMinimum = poolUsdValue !== null && poolUsdValue < MIN_POOL_USD_VALUE;

  // AI
  const [aiTopic, setAiTopic] = useState("");
  const [aiNumQ, setAiNumQ] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [aiTimePerQ, setAiTimePerQ] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  React.useEffect(() => {
    if (availableTokens.length > 0 && !reward.tokenAddress) {
      const t = availableTokens[0];
      setReward(prev => ({ ...prev, tokenAddress: t.address, tokenSymbol: t.symbol, tokenDecimals: t.decimals, tokenLogoUrl: t.logoUrl }));
    }
  }, [chainId]);

  React.useEffect(() => {
    if (!reward.tokenSymbol) return;
    const geckoId = COINGECKO_IDS[reward.tokenSymbol];
    if (!geckoId) { setTokenPrice(null); return; }
    setIsFetchingPrice(true);
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`)
      .then(r => r.json()).then(d => setTokenPrice(d[geckoId]?.usd ?? null))
      .catch(() => setTokenPrice(null)).finally(() => setIsFetchingPrice(false));
  }, [reward.tokenSymbol]);

  const setR = (updates: Partial<RewardConfig>) => setReward(prev => ({ ...prev, ...updates }));

  const updateQuestion = useCallback((idx: number, updates: Partial<QuizQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
  }, []);
  const updateOption = (qIdx: number, optId: string, text: string) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx
      ? { ...q, options: q.options.map(o => o.id === optId ? { ...o, text } : o) } : q));
  };
  const addQuestion = () => { setQuestions(prev => [...prev, blankQuestion()]); setActiveQIdx(questions.length); };
  const removeQuestion = (idx: number) => {
    if (questions.length === 1) { toast.error("Need at least 1 question"); return; }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    setActiveQIdx(prev => Math.min(prev, questions.length - 2));
  };
  const moveQuestion = (idx: number, dir: "up" | "down") => {
    const next = dir === "up" ? idx - 1 : idx + 1;
    if (next < 0 || next >= questions.length) return;
    setQuestions(prev => { const arr = [...prev]; [arr[idx], arr[next]] = [arr[next], arr[idx]]; return arr; });
    setActiveQIdx(next);
  };
  const activeQ = questions[activeQIdx] ?? questions[0];

  // FIX: buildPayload now uses creatorUsername state (fetched from profile) and real coverImageUrl
  const buildPayload = () => ({
    title,
    description,
    questions,
    timePerQuestion: 30,
    maxParticipants,
    startTime: startTime || null,
    creatorAddress: userWalletAddress,
    creatorUsername: creatorUsername,       // ← from profile fetch, not hardcoded ""
    coverImageUrl: coverImageUrl || null,   // ← real Supabase URL from upload endpoint
    chainId,
    reward: {
      poolAmount: parseFloat(reward.poolAmount) || 0,
      tokenAddress: reward.tokenAddress,
      tokenSymbol: reward.tokenSymbol,
      tokenDecimals: reward.tokenDecimals,
      tokenLogoUrl: reward.tokenLogoUrl,
      chainId,
      totalWinners: reward.totalWinners,
      distributionType: reward.distributionType,
      distribution: calcDistribution(reward),
      poolUsdValue: poolUsdValue ?? undefined,
    },
  });

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) { toast.error("Enter a topic"); return; }
    if (!userWalletAddress) { toast.error("Connect your wallet"); return; }
    if (!FACTORY_ADDRESSES[chainId]) {
      toast.error("Quiz rewards are not supported on this network yet.");
      return;
    }

    setIsGenerating(true);
    setDeployStep("idle");
    setDeployError("");

    try {
      // ── Step 1: Deploy reward contract ──
      setDeployStep("deploying");
      const activeWallet = wallets[0];
      if (!activeWallet) throw new Error("No wallet connected");

      const privyProvider = await activeWallet.getEthereumProvider();
      const ethersProvider = new BrowserProvider(privyProvider);

      toast.info("Step 1/2: Deploying reward contract…");
      const { contractAddress, txHash: deployTxHash } = await deployQuizReward(
        ethersProvider,
        chainId,
        getQuizRewardConfig()
      );
      setRewardContractAddress(contractAddress);

      // ── Step 2: AI generate + save ──
      setDeployStep("saving");
      toast.info("Step 2/2: Generating quiz with AI…");

      const res = await fetch(`${API_BASE_URL}/api/quiz/generate-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic,
          numQuestions: aiNumQ,
          difficulty: aiDifficulty,
          timePerQuestion: aiTimePerQ,
          creatorAddress: userWalletAddress,
          creatorUsername,
          coverImageUrl: coverImageUrl || null,
          title: title || undefined,
          chainId,
          reward: {
            poolAmount: parseFloat(reward.poolAmount) || 0,
            tokenAddress: reward.tokenAddress,
            tokenSymbol: reward.tokenSymbol,
            tokenDecimals: reward.tokenDecimals,
            tokenLogoUrl: reward.tokenLogoUrl,
            chainId,
            totalWinners: reward.totalWinners,
            distributionType: reward.distributionType,
            distribution: calcDistribution(reward),
            poolUsdValue: poolUsdValue ?? undefined,
            contractAddress,
            deployTxHash,
            isOnChain: true,
            isFunded: false,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDeployStep("done");
        setCreatedCode(data.code);
        toast.success(`Quiz created! Code: ${data.code}`);
        setTimeout(() => router.push(`/quiz/${data.code}`), 1500);
      } else {
        throw new Error(data.detail || "Generation failed");
      }
    } catch (err: any) {
      setDeployStep("error");
      const msg = err?.reason || err?.message || "Failed";
      setDeployError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };
  const validateQuiz = () => {
    if (!title.trim()) return "Quiz title is required";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Question ${i + 1} has no text`;
      if (q.options.some(o => !o.text.trim())) return `Question ${i + 1} has empty options`;
    }
    if (!reward.poolAmount || parseFloat(reward.poolAmount) <= 0) return "Enter a valid reward pool amount";
    if (!reward.tokenAddress) return "Select a reward token";
    if (!reward.tokenSymbol.trim()) return "Token symbol is missing";
    if (isBelowMinimum) return `Pool must be worth at least $${MIN_POOL_USD_VALUE} USD`;
    if (reward.totalWinners < 1) return "Must have at least 1 winner";
    if (reward.distributionType === "custom") {
      const total = customTierTotal(reward);
      if (Math.abs(total - 100) > 0.5) return `Custom tiers must add up to 100% (currently ${total.toFixed(1)}%)`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validateQuiz();
    if (err) { toast.error(err); return; }
    if (!userWalletAddress) { toast.error("Connect your wallet"); return; }
    if (isUploadingCover) { toast.error("Please wait for image upload to finish"); return; }
    if (!FACTORY_ADDRESSES[chainId]) {
      toast.error("Quiz rewards are not supported on this network yet. Switch chains.");
      return;
    }

    setIsSubmitting(true);
    setDeployStep("idle");
    setDeployError("");

    try {
      // ── Step 1: Deploy reward contract (no fund yet) ──
      setDeployStep("deploying");
      const activeWallet = wallets[0];
      if (!activeWallet) throw new Error("No wallet connected");

      const privyProvider = await activeWallet.getEthereumProvider();
      const ethersProvider = new BrowserProvider(privyProvider);

      toast.info("Step 1/2: Deploying reward contract…");
      const { contractAddress, txHash: deployTxHash } = await deployQuizReward(
        ethersProvider,
        chainId,
        getQuizRewardConfig()
      );
      setRewardContractAddress(contractAddress);

      // ── Step 2: Save quiz to backend ──
      setDeployStep("saving");
      toast.info("Step 2/2: Saving quiz…");

      const payload = {
        ...buildPayload(),
        reward: {
          ...buildPayload().reward,
          contractAddress,
          deployTxHash,
          isOnChain: true,
          isFunded: false,        // creator funds later in lobby
        },
      };

      const res = await fetch(`${API_BASE_URL}/api/quiz/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setDeployStep("done");
        setCreatedCode(data.code);
        toast.success(`Quiz created! Code: ${data.code}`);
        setTimeout(() => router.push(`/quiz/${data.code}`), 1500);
      } else {
        throw new Error(data.detail || "Create failed");
      }
    } catch (err: any) {
      setDeployStep("error");
      const msg = err?.reason || err?.message || "Failed to create quiz";
      setDeployError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen ──
  if (createdCode) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
        <Header pageTitle="Quiz Created!" />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-sm text-center shadow-2xl border-green-200 dark:border-green-900 bg-white dark:bg-slate-900">
            <CardContent className="pt-10 pb-8 space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Quiz Ready!</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center justify-center gap-1">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  {reward.poolAmount} {reward.tokenSymbol} for top {reward.totalWinners}
                </p>
              </div>
              {coverImageUrl && (
                <div className="rounded-xl overflow-hidden h-24 border border-slate-200 dark:border-slate-700">
                  <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                <div className="text-5xl font-black tracking-widest text-indigo-600 dark:text-indigo-400">{createdCode}</div>
              </div>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                onClick={() => { navigator.clipboard.writeText(createdCode); toast.success("Copied!"); }}>
                <Copy className="mr-2 h-4 w-4" /> Copy Code
              </Button>
              <Button variant="outline" className="w-full border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                onClick={() => router.push(`/quiz/${createdCode}`)}>
                Open Quiz Lobby
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Header pageTitle="Create Quiz" />

      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 pb-24 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.back()}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">Create a Quiz</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Build manually or let AI generate it</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(p => !p)}
            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
            {previewMode ? <Edit3 className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {previewMode ? "Edit" : "Preview"}
          </Button>
        </div>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-xs mb-6 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="manual" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
              <BookOpen className="mr-2 h-4 w-4" />Manual
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
              <Sparkles className="mr-2 h-4 w-4" />AI Generate
            </TabsTrigger>
          </TabsList>

          {/* ══ MANUAL TAB ══ */}
          <TabsContent value="manual" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* LEFT col */}
              <div className="lg:col-span-2 space-y-5">

                {/* Quiz Details card */}
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-900 dark:text-white">Quiz Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 dark:text-slate-300">Title <span className="text-red-500">*</span></Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Web3 Trivia Challenge"
                        className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 dark:text-slate-300">Description</Label>
                      <Textarea value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="What is this quiz about?"
                        className="resize-none h-20 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                    </div>

                    {/* Cover Image */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 dark:text-slate-300">Cover Image</Label>
                      <ImageUploader
                        value={coverImageUrl}
                        onChange={setCoverImageUrl}
                        isUploading={isUploadingCover}
                        setIsUploading={setIsUploadingCover}
                      />
                    </div>

                    {/* Creator username indicator */}
                    {creatorUsername && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span>Creating as <span className="font-bold text-slate-700 dark:text-slate-300">@{creatorUsername}</span></span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Question editor / preview */}
                {!previewMode ? (
                  <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-slate-900 dark:text-white">
                          Question {activeQIdx + 1} of {questions.length}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            onClick={() => moveQuestion(activeQIdx, "up")} disabled={activeQIdx === 0}><ChevronUp className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            onClick={() => moveQuestion(activeQIdx, "down")} disabled={activeQIdx === questions.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => removeQuestion(activeQIdx)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 dark:text-slate-300">Question Text <span className="text-red-500">*</span></Label>
                        <Textarea value={activeQ.question}
                          onChange={e => updateQuestion(activeQIdx, { question: e.target.value })}
                          placeholder="Type your question here..."
                          className="resize-none h-24 text-base bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                        <Label className="whitespace-nowrap text-slate-700 dark:text-slate-300">Time Limit</Label>
                        <div className="flex gap-2 flex-wrap">
                          {[10, 15, 20, 30, 45, 60].map(t => (
                            <Button key={t} variant={activeQ.timeLimit === t ? "default" : "outline"} size="sm"
                              className="h-8 px-3 text-xs font-bold"
                              onClick={() => updateQuestion(activeQIdx, { timeLimit: t })}>{t}s</Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300">Answer Options <span className="text-red-500">*</span></Label>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Click the coloured button to mark the correct answer</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeQ.options.map(opt => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuestion(activeQIdx, { correctId: opt.id as any })}
                                className={cn(
                                  "w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-black text-lg transition-all border-2 border-transparent",
                                  OPTION_COLORS[opt.id],
                                  activeQ.correctId === opt.id && "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-white scale-110"
                                )}
                              >
                                {activeQ.correctId === opt.id ? <Check className="h-5 w-5" /> : OPTION_SHAPES[opt.id]}
                              </button>
                              <Input value={opt.text} onChange={e => updateOption(activeQIdx, opt.id, e.target.value)}
                                placeholder={`Option ${opt.id}`}
                                className={cn(
                                  "flex-1 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500",
                                  activeQ.correctId === opt.id && "border-green-500 ring-1 ring-green-500"
                                )} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                    <CardContent className="p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-white/10 text-white border-0">Q{activeQIdx + 1}/{questions.length}</Badge>
                        <Badge className="bg-indigo-600/80 border-0 text-white"><Clock className="mr-1 h-3 w-3" /> {activeQ.timeLimit}s</Badge>
                      </div>
                      <h2 className="text-xl font-bold text-center py-4 text-white">
                        {activeQ.question || "Your question appears here"}
                      </h2>
                      <div className="grid grid-cols-2 gap-3">
                        {activeQ.options.map(opt => (
                          <div key={opt.id} className={cn(
                            "rounded-xl p-4 flex items-center gap-3 text-white font-bold border-2 border-transparent",
                            OPTION_COLORS[opt.id],
                            activeQ.correctId === opt.id && "ring-2 ring-white"
                          )}>
                            <span className="text-xl">{OPTION_SHAPES[opt.id]}</span>
                            <span className="text-sm">{opt.text || `Option ${opt.id}`}</span>
                            {activeQ.correctId === opt.id && <Check className="ml-auto h-4 w-4" />}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button variant="outline"
                  className="w-full h-12 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-transparent text-slate-500 dark:text-slate-400"
                  onClick={addQuestion}>
                  <Plus className="mr-2 h-5 w-5" /> Add Question
                </Button>

                {/* Reward card */}
                <Card className="border-2 border-yellow-300 dark:border-yellow-500/30 bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-slate-900 dark:text-white">Reward System</CardTitle>
                          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Distribute tokens to top performers</CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/40 text-xs font-bold">Required</Badge>
                    </div>
                  </CardHeader>
                  <RewardBlock reward={reward} setR={setR} setReward={setReward}
                    availableTokens={availableTokens} chainId={chainId} chainName={chainName}
                    tokenPrice={tokenPrice} isFetchingPrice={isFetchingPrice}
                    poolUsdValue={poolUsdValue} isBelowMinimum={isBelowMinimum} />
                </Card>
              </div>

              {/* RIGHT col */}
              <div className="space-y-5">
                {/* Question list */}
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-slate-900 dark:text-white flex items-center justify-between">
                      Questions <Badge variant="outline" className="border-slate-200 dark:border-slate-700">{questions.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {questions.map((q, idx) => {
                      const isComplete = q.question.trim() && q.options.every(o => o.text.trim());
                      return (
                        <button key={q.id} onClick={() => setActiveQIdx(idx)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-3",
                            idx === activeQIdx
                              ? "bg-indigo-600 text-white"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}>
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                            isComplete ? "bg-green-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                          )}>
                            {isComplete ? "✓" : idx + 1}
                          </span>
                          <span className="truncate flex-1">{q.question || <span className="italic opacity-60">Untitled</span>}</span>
                          <span className="text-[10px] opacity-60 shrink-0">{q.timeLimit}s</span>
                        </button>
                        
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Settings */}
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-900 dark:text-white">Settings</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Max Participants</Label>
                      <Input type="number" min={0} value={maxParticipants === 0 ? "" : maxParticipants}
                        onChange={e => setMaxParticipants(Number(e.target.value) || 0)} placeholder="Unlimited"
                        className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">0 = unlimited</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Scheduled Start</Label>
                      <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
                        className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-1">
                      {[
                        ["Total Questions", questions.length, ""],
                        ["Complete", `${questions.filter(q => q.question.trim() && q.options.every(o => o.text.trim())).length}/${questions.length}`, "text-green-600 dark:text-green-400"],
                        ["Reward Pool", `${reward.poolAmount || "—"} ${reward.tokenSymbol}`, "text-yellow-600 dark:text-yellow-500"],
                        ["Cover Image", coverImageUrl ? "✓ Set" : "Not set", coverImageUrl ? "text-green-600 dark:text-green-400" : "text-slate-400"],
                        ["Creator", creatorUsername ? `@${creatorUsername}` : "Not set", creatorUsername ? "text-green-600 dark:text-green-400" : "text-slate-400"],
                      ].map(([label, value, cls]) => (
                        <div key={label as string} className="flex justify-between text-xs">
                          <span className="text-slate-400 dark:text-slate-500">{label}</span>
                          <span className={cn("font-bold text-slate-900 dark:text-white", cls as string)}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <DeployProgress
                  step={deployStep}
                  contractAddress={rewardContractAddress}
                  error={deployError}
                />

                <Button
                  className="w-full h-12 font-bold text-base bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUploadingCover || !FACTORY_ADDRESSES[chainId]}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {deployStep === "deploying" ? "Deploying contract…" : "Saving quiz…"}
                    </>
                  ) : isUploadingCover ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Uploading image…</>
                  ) : !FACTORY_ADDRESSES[chainId] ? (
                    "Switch to a Supported Network"
                  ) : (
                    <><Gift className="mr-2 h-5 w-5" /> Create Quiz with Rewards</>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ══ AI TAB ══ */}
          <TabsContent value="ai">
            <div className="max-w-xl mx-auto space-y-6">
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900 dark:text-white">Quiz Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300">Title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="Custom title (or AI will create one)"
                      className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300">Cover Image</Label>
                    <ImageUploader
                      value={coverImageUrl}
                      onChange={setCoverImageUrl}
                      isUploading={isUploadingCover}
                      setIsUploading={setIsUploadingCover}
                    />
                  </div>
                  {creatorUsername && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span>Creating as <span className="font-bold text-slate-700 dark:text-slate-300">@{creatorUsername}</span></span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" /> AI Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300">Topic <span className="text-red-500">*</span></Label>
                    <Textarea value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                      placeholder="e.g. 'Ethereum and DeFi basics', 'World capitals'..."
                      className="resize-none h-24 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-700 dark:text-slate-300">Questions</Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {[5, 10, 15, 20].map(n => (
                          <Button key={n} variant={aiNumQ === n ? "default" : "outline"} size="sm"
                            className="h-8 px-3 text-xs font-bold" onClick={() => setAiNumQ(n)}>{n}</Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-700 dark:text-slate-300">Difficulty</Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {(["easy", "medium", "hard"] as const).map(d => (
                          <Button key={d} variant={aiDifficulty === d ? "default" : "outline"} size="sm"
                            className={cn("h-8 px-3 text-xs font-bold capitalize",
                              aiDifficulty === d && d === "easy" && "bg-green-500 hover:bg-green-600 text-white",
                              aiDifficulty === d && d === "medium" && "bg-yellow-500 hover:bg-yellow-600 text-black",
                              aiDifficulty === d && d === "hard" && "bg-red-500 hover:bg-red-600 text-white"
                            )}
                            onClick={() => setAiDifficulty(d)}>{d}</Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-700 dark:text-slate-300">Seconds per Question</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[10, 15, 20, 30, 45, 60].map(t => (
                        <Button key={t} variant={aiTimePerQ === t ? "default" : "outline"} size="sm"
                          className="h-8 px-3 text-xs font-bold" onClick={() => setAiTimePerQ(t)}>{t}s</Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
                    <Lightbulb className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-purple-800 dark:text-purple-300">
                      <p className="font-semibold">Powered by FaucetDrops AI Engine</p>
                      <p className="mt-0.5">Generates {aiNumQ} unique {aiDifficulty} questions instantly.</p>
                    </div>
                  </div>
                  <DeployProgress
                    step={deployStep}
                    contractAddress={rewardContractAddress}
                    error={deployError}
                  />

                  <Button
                    className="w-full h-12 font-bold text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 disabled:opacity-60"
                    onClick={handleGenerateAI}
                    disabled={isGenerating || isUploadingCover || !FACTORY_ADDRESSES[chainId]}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {deployStep === "deploying" ? "Deploying contract…" : "Generating questions…"}
                      </>
                    ) : !FACTORY_ADDRESSES[chainId] ? (
                      "Switch to a Supported Network"
                    ) : (
                      <><Sparkles className="mr-2 h-5 w-5" /> Generate {aiNumQ} Questions</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Reward card in AI tab */}
              <Card className="border-2 border-yellow-300 dark:border-yellow-500/30 bg-white dark:bg-slate-900">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-slate-900 dark:text-white">Add Rewards</CardTitle>
                        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Distribute tokens to top performers</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/40 text-xs font-bold">Required</Badge>
                  </div>
                </CardHeader>
                <RewardBlock reward={reward} setR={setR} setReward={setReward}
                  availableTokens={availableTokens} chainId={chainId} chainName={chainName}
                  tokenPrice={tokenPrice} isFetchingPrice={isFetchingPrice}
                  poolUsdValue={poolUsdValue} isBelowMinimum={isBelowMinimum} />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


// "use client";
// import Image from 'next/image';
// import Link from 'next/link';
// import { siX, siTelegram, siGmail } from 'simple-icons/icons'

// interface IconProps {
//   path: string;
//   title?: string;
// }

// interface SimpleIconProps {
//   icon: IconProps;
//   size?: number | string;
//   className?: string;
// }

// export const SimpleIcon: React.FC<SimpleIconProps> = ({
//   icon,
//   size = 24,
//   className = 'text-white'
// }) => {
//   return (
//     <svg
//       role="img"
//       viewBox="0 0 24 24"
//       width={size}
//       height={size}
//       className={className}
//       fill="currentColor"
//       xmlns="http://www.w3.org/2000/svg"
//     >
//       <path d={icon.path} />
//     </svg>
//   );
// };

// export default function ComingSoon() {
//   const socialLinks = [
//     { icon: siX, href: 'https://x.com/FaucetDrops', label: 'Twitter' },
//     { icon: siTelegram, href: 'https://t.me/FaucetDropschat', label: 'Telegram' },
//     { icon: siGmail, href: 'mailto:drops.faucet@gmail.com', label: 'Email' },
//   ];

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-black transition-colors duration-300">
//       <div className="max-w-2xl w-full text-center space-y-8">
        
//         {/* Logo Section - Adapts to theme */}
//         <div className="flex justify-center relative">
//           {/* Light Mode Logo: Visible by default, hidden in dark mode */}
//           <Image
//             src="/lightlogo.png"
//             alt="FaucetDrops Logo"
//             width={200}
//             height={80}
//             className="h-12 w-auto sm:h-16 lg:h-20 rounded-md object-contain dark:hidden"
//           />
          
//           {/* Dark Mode Logo: Hidden by default, visible in dark mode */}
//           <Image
//             src="/darklogo.png"
//             alt="FaucetDrops Logo"
//             width={200}
//             height={80}
//             className="h-12 w-auto sm:h-16 lg:h-20 rounded-md object-contain hidden dark:block"
//           />
//         </div>

//         {/* Heading Section - Theme aware */}
//         <div className="space-y-4">
//           <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-white">
//             Coming Soon
//           </h1>
//           <p className="text-xl text-gray-600 dark:text-gray-400">
//             We&apos;re working on something amazing!
//           </p>
//           <p className="text-gray-600 dark:text-gray-400">
//             This page is under construction. Please check back later for updates.
//           </p>
//         </div>

//         {/* Status Badge - Theme aware */}
//         <div className="pt-4">
//           <div className="inline-flex items-center px-6 py-3 rounded-md bg-gray-100 dark:bg-white/10 text-black dark:text-white font-medium transition-colors duration-300">
//             <span className="relative flex h-3 w-3 mr-2">
//               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 dark:bg-white/75"></span>
//               <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-600 dark:bg-white"></span>
//             </span>
//             Under Development
//           </div>
//         </div>

//         {/* Social Media Links */}
//         <div className="pt-8">
//           <p className="text-sm text-gray-600 dark:text-gray-400">
//             In the meantime, you can follow us on social media or contact our team
//           </p>
//           <div className="flex justify-center space-x-6 pt-4">
//             {socialLinks.map((social, index) => (
//               <Link
//                 key={index}
//                 href={social.href}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-300 transform hover:scale-110"
//                 aria-label={social.label}
//                 title={social.label}
//               >
//                 <SimpleIcon
//                   icon={social.icon}
//                   size={24}
//                   className="text-black dark:text-white transition-colors duration-300"
//                 />
//               </Link>
//             ))}
//           </div>
//         </div>

//         {/* Footer Link - Theme aware */}
//         <div className="pt-8">
//           <p className="text-sm text-gray-600 dark:text-gray-400">
//             In the meantime, you can check out our
//             <Link 
//               href="/" 
//               className="text-black dark:text-white hover:underline font-semibold ml-1 transition-colors duration-300"
//             >
//               homepage
//             </Link>
//             .
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }