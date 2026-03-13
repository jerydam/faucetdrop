"use client";
/**
 * /app/quiz/[code]/page.tsx
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2, Users, Trophy, Crown, Zap, Check, X,
  ArrowUp, ArrowDown, Minus, Home, Share2, Play,
  Plus,
  Clock,
} from "lucide-react";
import { getContractFundedStatus } from "@/lib/quiz";
import { Wallet, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";
import { BrowserProvider, Contract, parseUnits,Interface, formatUnits, TransactionRequest } from "ethers";
import { fundQuizReward } from "@/lib/quiz";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WalletConnectButton } from "@/components/wallet-connect";
// ── On-chain error parser ──────────────────────────────────────
function parseOnchainError(err: any): string {
  // User rejected the transaction in their wallet
  if (
    err?.code === 4001 ||
    err?.code === "ACTION_REJECTED" ||
    err?.info?.error?.code === 4001 ||
    err?.message?.toLowerCase().includes("user rejected") ||
    err?.message?.toLowerCase().includes("user denied")
  ) {
    return "Transaction cancelled — you rejected it in your wallet.";
  }

  // Insufficient funds for gas
  if (
    err?.message?.toLowerCase().includes("insufficient funds") ||
    err?.message?.toLowerCase().includes("insufficient balance")
  ) {
    return "Insufficient balance to cover this transaction + gas fees.";
  }

  // Contract revert with a reason string
  if (err?.reason && typeof err.reason === "string" && err.reason.trim()) {
    return `Contract error: ${err.reason}`;
  }

  // ethers v6 nested revert data
  if (err?.info?.error?.message) {
    const inner = err.info.error.message as string;
    // Strip verbose RPC prefixes like "execution reverted: "
    const cleaned = inner.replace(/^execution reverted:\s*/i, "").trim();
    if (cleaned) return `Contract error: ${cleaned}`;
  }

  // Network / RPC issues
  if (
    err?.message?.toLowerCase().includes("network") ||
    err?.message?.toLowerCase().includes("could not detect network")
  ) {
    return "Network error — check your connection and try again.";
  }

  // Gas estimation failed (usually means the tx would revert)
  if (
    err?.message?.toLowerCase().includes("cannot estimate gas") ||
    err?.message?.toLowerCase().includes("gas required exceeds")
  ) {
    return "Transaction would fail on-chain — check your balance and allowance.";
  }

  // Nonce issues
  if (err?.message?.toLowerCase().includes("nonce")) {
    return "Transaction nonce conflict — please reset your wallet activity and retry.";
  }
  if (
    err?.data === "0x2c5211c6" ||
    err?.message?.includes("2c5211c6") ||
    err?.reason === "InvalidAmount"
  ) {
    return "Fund amount rejected by contract — the pool amount may have changed. Try refreshing the page.";
  }
  // Fallback: trim long raw messages
  const raw: string = err?.message || "Unknown error";
  return raw.length > 120 ? raw.slice(0, 120) + "…" : raw;
}
const API_BASE_URL = "https://faucetdrop-backend.onrender.com";

// ── Safe WS URL ──
function getWsBaseUrl(): string {
  if (typeof window === "undefined") return "ws://127.0.0.1:8000";
  return window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "ws://127.0.0.1:8000"
    : "wss://faucetdrop-backend.onrender.com";
}

// ── Types ──
type GamePhase = "loading" | "lobby" | "countdown" | "question" | "reveal" | "leaderboard" | "game_over";

interface Player {
  walletAddress: string;
  username: string;
  avatarUrl?: string | null;
  points: number;
  pointsThisRound: number;
  rank: number;
  rankChange: number;
  streak: number;
  answeredCorrectly: boolean;
}

interface QuizOption { id: string; text: string }
interface Question {
  index: number;
  total: number;
  question: string;
  options: QuizOption[];
  timeLimit: number;
  startedAt: number;
}

interface PersonalResult {
  isCorrect: boolean;
  pointsEarned: number;
  streak: number;
}

// ── Option appearance ──
const OPTION_STYLES: Record<string, { bg: string; shape: string; selectedRing: string }> = {
  A: { bg: "bg-red-500 hover:bg-red-600", shape: "▲", selectedRing: "ring-red-400 dark:ring-red-500" },
  B: { bg: "bg-blue-500 hover:bg-blue-600", shape: "◆", selectedRing: "ring-blue-400 dark:ring-blue-500" },
  C: { bg: "bg-yellow-500 hover:bg-yellow-600", shape: "●", selectedRing: "ring-yellow-400 dark:ring-yellow-500" },
  D: { bg: "bg-green-500 hover:bg-green-600", shape: "■", selectedRing: "ring-green-400 dark:ring-green-500" },
};

const SOUND_FILES: Record<string, string> = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  "rank-up": "/sounds/rank-up.mp3",
  "rank-down": "/sounds/rank-down.mp3",
  winner: "/sounds/winner.mp3",
  loser: "/sounds/loser.mp3",
};

// Cache Audio objects so files aren't re-fetched every play
const audioCache: Record<string, HTMLAudioElement> = {};

const playSound = (type: "correct" | "wrong" | "rank-up" | "rank-down" | "winner" | "loser") => {
  if (typeof window === "undefined") return;
  try {
    const src = SOUND_FILES[type];
    if (!src) return;

    // Reuse cached instance or create a new one
    if (!audioCache[type]) {
      audioCache[type] = new Audio(src);
      audioCache[type].volume = 0.4;
    }

    const audio = audioCache[type];
    audio.currentTime = 0;   // rewind so rapid replays work
    audio.play().catch(e => console.log("Audio play error:", e));
  } catch (e) {
    console.log("Audio error:", e);
  }
};

// ── Confetti ──
const CONFETTI_COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98FB98"];

function Confetti({ active }: { active: boolean }) {
  const particles = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: -10 - Math.random() * 20, size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.8, duration: 2 + Math.random() * 2, rotation: Math.random() * 360,
    })), []
  );
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-sm"
          style={{
            left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, backgroundColor: p.color,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`, transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`@keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
    </div>
  );
}

// ── Rank Reaction Overlay ──
function RankReaction({ change }: { change: number }) {
  if (change === 0) return null;
  const isUp = change > 0;
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center" style={{ animation: "reactionFade 3s ease-in-out forwards" }}>
      <div className={cn(
        "p-8 rounded-[3rem] flex flex-col items-center gap-3 backdrop-blur-md border-2 shadow-2xl",
        isUp ? "bg-green-50 dark:bg-green-500/10 border-green-400 dark:border-green-500/30 shadow-green-500/20" : "bg-red-50 dark:bg-red-500/10 border-red-400 dark:border-red-500/30 shadow-red-500/20"
      )}>
        <span className="text-8xl md:text-9xl drop-shadow-lg">{isUp ? "🚀" : "😢"}</span>
        <span className={cn("text-3xl md:text-5xl font-black italic uppercase tracking-tighter drop-shadow-sm", isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
          {isUp ? `+${change} POSITIONS!` : `${change} POSITIONS`}
        </span>
      </div>
      <style>{`@keyframes reactionFade { 0% { transform: scale(0.5); opacity: 0; } 15% { transform: scale(1.1); opacity: 1; } 25% { transform: scale(1); opacity: 1; } 80% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.8); opacity: 0; } }`}</style>
    </div>
  );
}

// ── Rank badge ──
function RankBadge({ change }: { change: number }) {
  if (change > 0) return <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 font-bold text-sm animate-bounce"><ArrowUp className="h-3 w-3" /> {change}</span>;
  if (change < 0) return <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 font-bold text-sm"><ArrowDown className="h-3 w-3" /> {Math.abs(change)}</span>;
  return <Minus className="h-3 w-3 text-slate-400" />;
}

// ── Horizontal Timer ──
function LinearTimer({ seconds, total }: { seconds: number; total: number }) {
  const percentage = Math.max(0, (seconds / total) * 100);
  const color = percentage > 50 ? "bg-green-500" : percentage > 25 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
      <div className={cn("h-full transition-all duration-300 ease-linear", color)} style={{ width: `${percentage}%` }} />
    </div>
  );
}
interface ClaimBannerProps { code: string; myWallet: string; }
function ClaimBanner({ code, myWallet }: ClaimBannerProps) {
  const { wallets } = useWallets();
  const { address: userWalletAddress } = useWallet();
  const activeWallet = 
  wallets.find((w) => w.walletClientType === 'privy') || 
  wallets.find((w) => w.address.toLowerCase() === userWalletAddress?.toLowerCase()) || 
  wallets?.[0];
  const [status, setStatus] = useState<"loading" | "eligible" | "claimed" | "expired" | "not_winner">("loading");
  const [amount, setAmount] = useState<number>(0);
  const [symbol, setSymbol] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedTx, setClaimedTx] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!myWallet) return;
    fetch(`${API_BASE_URL}/api/quiz/${code}/payouts`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setStatus("not_winner"); return; }
        const me = d.payouts?.find((p: any) => p.wallet_address.toLowerCase() === myWallet.toLowerCase());
        if (!me) { setStatus("not_winner"); return; }
        if (me.status === "claimed") { setStatus("claimed"); return; }
        setAmount(me.amount);
        setSymbol(me.token_symbol);
        fetch(`${API_BASE_URL}/api/quiz/${code}/claim-window`)
          .then(r => r.json())
          .then(w => {
            if (w.isActive && w.secondsRemaining > 0) { setTimeLeft(w.secondsRemaining); setStatus("eligible"); }
            else setStatus("expired");
          })
          .catch(() => setStatus("eligible")); // fallback: show button anyway
      })
      .catch(() => setStatus("not_winner"));
  }, [code, myWallet]);

  useEffect(() => {
    if (status !== "eligible" || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); setStatus("expired"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [status, timeLeft]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const handleClaim = async () => {
    if (!activeWallet) { toast.error("Wallet not connected"); return; }
    setIsClaiming(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/quiz/${code}/claim`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: myWallet }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message || "Claim failed");
      setClaimedTx(data.txHash);
      setStatus("claimed");
      toast.success("Reward claimed! It's now in your wallet.");
    } catch (e: any) {
      toast.error(parseOnchainError(e));
    }finally { setIsClaiming(false); }
  };

  if (status === "loading") return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400 shrink-0" />
      <p className="text-slate-500 dark:text-slate-400 text-sm">Checking your reward status...</p>
    </div>
  );
  if (status === "not_winner") return null;
  if (status === "claimed") return (
    <div className="max-w-xl mx-auto bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
      <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-green-700 dark:text-green-400 font-bold text-sm">Reward Claimed ✓</p>
        <p className="text-green-600 dark:text-green-500 text-xs mt-0.5">{amount} {symbol} has been sent to your wallet</p>
      </div>
      {claimedTx && (
        <a href={`https://celoscan.io/tx/${claimedTx}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <ExternalLink className="h-4 w-4 text-green-500" />
        </a>
      )}
    </div>
  );
  if (status === "expired") return (
    <div className="max-w-xl mx-auto bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
      <AlertCircle className="h-5 w-5 text-slate-400 shrink-0" />
      <div>
        <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">Claim Window Expired</p>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">The reward claim period for this quiz has closed.</p>
      </div>
    </div>
  );
  return (
    <div className="max-w-xl mx-auto bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600/30 rounded-2xl p-4 shadow-sm animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-200 dark:border-yellow-500/30 flex items-center justify-center shrink-0">
          <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-yellow-800 dark:text-yellow-300 font-black text-base">You won {amount} {symbol}!</p>
          <p className="text-yellow-700 dark:text-yellow-400/80 text-xs mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Claim window closes in <span className="font-bold tabular-nums">{formatTime(timeLeft)}</span>
          </p>
        </div>
        <Button className="shrink-0 h-10 px-4 font-bold bg-yellow-500 hover:bg-yellow-400 text-black border-0" onClick={handleClaim} disabled={isClaiming}>
          {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim Now"}
        </Button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────
//  QuizGameOver
// ─────────────────────────────────────────────────────────────
interface PayoutRecord { wallet_address: string; username: string; rank: number; points: number; amount: number; token_symbol: string; status: string; tx_hash: string | null; }
interface PayoutsData { success: boolean; faucetAddress: string; chainId: number; payouts: PayoutRecord[]; }

function QuizGameOver({ quizMeta, code, leaderboard, myWallet, isCreator, showConfetti, router }: any) {
  const [payoutsData, setPayoutsData] = useState<PayoutsData | null>(null);
  const { address: userWalletAddress } = useWallet();
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedTx, setClaimedTx] = useState<string | null>(null);
  const { wallets } = useWallets();
  const activeWallet = 
  wallets.find((w) => w.walletClientType === 'privy') || 
  wallets.find((w) => w.address.toLowerCase() === userWalletAddress?.toLowerCase()) || 
  wallets?.[0];

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/quiz/${code}/payouts`).then(r => r.json()).then(d => { if (d.success) setPayoutsData(d); }).finally(() => setLoadingPayouts(false));
  }, [code]);


  const myPayout = payoutsData?.payouts.find(p => p.wallet_address.toLowerCase() === myWallet.toLowerCase());
  const hasAlreadyClaimed = myPayout?.status === "claimed" || !!claimedTx;
  const totalWinners = payoutsData?.payouts.length ?? 0;
  const payoutByWallet = useMemo(() => {
    const map: Record<string, PayoutRecord> = {};
    payoutsData?.payouts.forEach(p => { map[p.wallet_address.toLowerCase()] = p; });
    return map;
  }, [payoutsData]);

  const handleClaim = async () => {
    if (!activeWallet) { 
      toast.error("Wallet not connected"); 
      return; 
    }
    
    setIsClaiming(true);
    toast.info("Processing claim... please wait.");
    
    try {
      // ✅ Request the backend to execute the claim
      const res = await fetch(`${API_BASE_URL}/api/quiz/${code}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: myWallet })
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.detail || data.message || "Claim failed");
      }

      setClaimedTx(data.txHash);
      toast.success("Reward claimed successfully! It is now in your wallet.");
      
      // Update local state so the button changes to "✓ Claimed"
      setPayoutsData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          payouts: prev.payouts.map(p => 
            p.wallet_address.toLowerCase() === myWallet.toLowerCase() 
              ? { ...p, status: "claimed", tx_hash: data.txHash } 
              : p
          )
        };
      });

    } catch (e: any) {
      console.error("Claim error:", e);
      toast.error(e.message || "Failed to process claim");
    } finally {
      setIsClaiming(false);
    }
  };

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-auto">
      <Confetti active={showConfetti} />
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 pb-24 pt-8 md:pt-12">

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="text-6xl md:text-7xl drop-shadow-md mb-4">🏆</div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">Quiz Complete!</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">{quizMeta?.title}</p>
        </div>

        {!isCreator && <ClaimBanner code={code} myWallet={myWallet} />}

        {/* Prize Pool Banner */}
        {!loadingPayouts && totalWinners > 0 && (
          <div className="max-w-xl mx-auto bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-yellow-700 dark:text-yellow-400 text-xs font-black tracking-widest uppercase">Prize Pool Distributed</p>
            <p className="text-yellow-600 dark:text-yellow-500/80 text-sm mt-1">Top {totalWinners} winner{totalWinners > 1 ? "s" : ""} can self-claim via the contract</p>
          </div>
        )}

        {/* Podium - Fully Responsive */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6 mt-8 md:mt-16">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-8 duration-500 delay-200">
                <Avatar className="h-14 w-14 md:h-20 md:w-20 border-4 border-slate-300 dark:border-slate-600 shadow-lg">
                  <AvatarImage src={top3[1].avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-bold">{top3[1].username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-slate-900 dark:text-white text-xs md:text-sm font-bold truncate max-w-[80px] md:max-w-[100px]">{top3[1].username}</p>
                  <p className="text-slate-500 dark:text-slate-400 font-black text-sm md:text-base">{top3[1].points}</p>
                </div>
                <div className="bg-slate-300 dark:bg-slate-700 w-20 sm:w-24 md:w-32 h-24 md:h-36 rounded-t-xl flex items-center justify-center text-3xl md:text-4xl shadow-inner">🥈</div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-8 duration-500">
                <div className="text-3xl md:text-5xl animate-bounce mb-1">👑</div>
                <Avatar className="h-20 w-20 md:h-28 md:w-28 border-4 border-yellow-400 dark:border-yellow-500 shadow-xl">
                  <AvatarImage src={top3[0].avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl">{top3[0].username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-slate-900 dark:text-white text-sm md:text-base font-black truncate max-w-[100px] md:max-w-[120px]">{top3[0].username}</p>
                  <p className="text-yellow-600 dark:text-yellow-400 font-black text-lg md:text-xl">{top3[0].points}</p>
                </div>
                <div className="bg-yellow-400 dark:bg-yellow-600 w-24 sm:w-28 md:w-40 h-32 md:h-48 rounded-t-xl flex items-center justify-center text-4xl md:text-5xl shadow-inner">🥇</div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-8 duration-500 delay-300">
                <Avatar className="h-12 w-12 md:h-16 md:w-16 border-4 border-amber-600 dark:border-amber-700 shadow-lg">
                  <AvatarImage src={top3[2].avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-bold">{top3[2].username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-slate-900 dark:text-white text-xs md:text-sm font-bold truncate max-w-[80px] md:max-w-[100px]">{top3[2].username}</p>
                  <p className="text-amber-700 dark:text-amber-600 font-black text-sm md:text-base">{top3[2].points}</p>
                </div>
                <div className="bg-amber-600 dark:bg-amber-800 w-20 sm:w-24 md:w-28 h-20 md:h-28 rounded-t-xl flex items-center justify-center text-3xl md:text-4xl shadow-inner">🥉</div>
              </div>
            )}
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center justify-between">
            Final Standings
            {isCreator && <span className="text-indigo-500 font-mono">HOST VIEW</span>}
          </div>
          {loadingPayouts ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.map((entry: any) => {
                const isMe = entry.walletAddress.toLowerCase() === myWallet.toLowerCase();
                const payout = payoutByWallet[entry.walletAddress.toLowerCase()];
                const isWinner = !!payout;
                const alreadyClaimed = isMe ? hasAlreadyClaimed : payout?.status === "claimed";

                return (
                  <div key={entry.walletAddress} className={cn("flex items-center gap-3 px-4 py-4 transition-all", isMe && "bg-indigo-50 dark:bg-indigo-950/20", isWinner && "border-l-4 border-l-yellow-400 dark:border-l-yellow-500")}>
                    <span className="text-slate-400 dark:text-slate-500 text-sm w-5 text-center font-bold shrink-0">{entry.rank}</span>
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={entry.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white text-xs font-bold">{entry.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-900 dark:text-white font-bold text-sm truncate">{entry.username}</span>
                        {isMe && <Badge className="text-[9px] h-4 px-1.5 bg-indigo-600 text-white border-0 shrink-0">YOU</Badge>}
                        {isWinner && <Badge className="text-[9px] h-4 px-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-500 dark:text-black border-0 shrink-0">🏆 Winner</Badge>}
                      </div>
                      {isWinner && payout.amount > 0 && (
                        <p className="text-yellow-600 dark:text-yellow-400 text-xs font-bold mt-0.5">{payout.amount} {payout.token_symbol}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-slate-900 dark:text-white font-black">{entry.points} pts</div>
                      {isMe && isWinner && !isCreator && (
                        alreadyClaimed ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]">✓ Claimed</Badge>
                        ) : (
                          <Button size="sm" className="h-7 px-3 text-xs font-bold bg-yellow-400 hover:bg-yellow-500 text-black" onClick={handleClaim} disabled={isClaiming}>
                            {isClaiming ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim Reward"}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 max-w-2xl mx-auto">
          <Button variant="outline" className="flex-1 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" onClick={() => router.push("/quiz")}>
            <Home className="mr-2 h-4 w-4" /> Back to Hub
          </Button>
          {isCreator && (
            <Button className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => router.push("/quiz/create-quiz")}>
              <Plus className="mr-2 h-4 w-4" /> Create New Quiz
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
interface FundRewardButtonProps {
  quizReward: {
    contractAddress: string;
    tokenSymbol: string;
    tokenLogoUrl: string;
    poolAmount: string;
  } | null;
  isFunded: boolean;
  isFunding: boolean;
  isFundedCheckLoading: boolean;
  contractBalance: string;
  fundTxHash: string;
  fundError: string;
  onFund: () => void;
  chainId: number;
}

export function FundRewardButton({
  quizReward,
  isFunded,
  isFunding,
  isFundedCheckLoading,
  contractBalance,
  fundTxHash,
  fundError,
  onFund,
  chainId,
}: FundRewardButtonProps) {
  if (!quizReward) return null;

  const explorerBase: Record<number, string> = {
    42220: "https://celoscan.io/tx/",
    1135: "https://blockscout.lisk.com/tx/",
    42161: "https://arbiscan.io/tx/",
    8453: "https://basescan.org/tx/",
    56: "https://bscscan.com/tx/",
  };

  return (
    <div className="space-y-3">
      {/* Funded status banner */}
      {isFunded ? (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-700 dark:text-green-400">
              Reward Pool Funded ✓
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
              {contractBalance} {quizReward.tokenSymbol} locked in contract
            </p>
          </div>
          {fundTxHash && explorerBase[chainId] && (
            <a
              href={`${explorerBase[chainId]}${fundTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 dark:text-green-400 hover:text-green-700 shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Unfunded warning */}
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                Reward Pool Not Yet Funded
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                Fund {quizReward.poolAmount} {quizReward.tokenSymbol} to enable the Start button.
                Winners will be able to self-claim from the contract.
              </p>
              {isFundedCheckLoading && (
                <p className="text-[10px] text-amber-500 mt-1 animate-pulse">
                  Checking balance…
                </p>
              )}
            </div>
          </div>

          {/* Fund button */}
          <button
            onClick={onFund}
            disabled={isFunding}
            className={[
              "w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
              isFunding
                ? "bg-indigo-400 dark:bg-indigo-700 text-white cursor-wait"
                : "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-md shadow-indigo-500/20",
            ].join(" ")}
          >
            {isFunding ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Confirm in wallet…
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Fund {quizReward.poolAmount} {quizReward.tokenSymbol}
              </>
            )}
          </button>
        </div>
      )}

      {/* Error message */}
      {fundError && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
          <p className="text-xs text-red-700 dark:text-red-400 font-medium break-words">
            {fundError}
          </p>
        </div>
      )}

      {/* Contract address */}
      <div className="flex items-center gap-2 px-1">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Contract:</p>
        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate flex-1">
          {quizReward.contractAddress}
        </p>
      </div>
    </div>
  );
}
export { }
// ═══════════════════════════════════════════════════════════════
//  Main Component (Phase router)
// ═══════════════════════════════════════════════════════════════
export default function QuizCodePage() {
  const params = useParams();
  const router = useRouter();
  const { address: userWalletAddress } = useWallet();
  const { wallets } = useWallets();
   const activeWallet = 
  wallets.find((w) => w.walletClientType === 'privy') || 
  wallets.find((w) => w.address.toLowerCase() === userWalletAddress?.toLowerCase()) || 
  wallets?.[0];
  const code = (params.code as string || "").toUpperCase();
  const sessionKeyRef = useRef<CryptoKey | null>(null);
  const [quizReward, setQuizReward] = useState<{
    contractAddress: string;
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;
    tokenLogoUrl: string;
    isNativeToken: boolean;
    poolAmount: string;
    isFunded: boolean;
  } | null>(null);
  const reconnectAttempts = useRef(0);
  const [isFunded, setIsFunded] = useState(false);
  const [contractBalance, setContractBalance] = useState("0");
  const [isFunding, setIsFunding] = useState(false);
  const [fundError, setFundError] = useState("");
  const [fundTxHash, setFundTxHash] = useState("");
  const [isFundedCheckLoading, setIsFundedCheckLoading] = useState(false);
  const [isReturningPlayer, setIsReturningPlayer] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [quizMeta, setQuizMeta] = useState<{ title: string; totalQuestions: number; creatorAddress: string; coverImageUrl?: string | null } | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [countdownVal, setCountdownVal] = useState(3);

  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameOverSoundPlayed = useRef<boolean>(false);

  const [revealCorrectId, setRevealCorrectId] = useState<string | null>(null);
  const [personalResult, setPersonalResult] = useState<PersonalResult | null>(null);

  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [myRankChange, setMyRankChange] = useState(0);
  const [isLastQuestion, setIsLastQuestion] = useState(false);

  const [isCreator, setIsCreator] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const hasSubmittedOnChain = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const myWallet = userWalletAddress?.toLowerCase() ?? "";
  const chainId = activeWallet
    ? parseInt(activeWallet.chainId.split(":")[1] ?? "0")
    : 0;
  // ── Load profile ──
  useEffect(() => {
    if (!userWalletAddress) return;
    fetch(`${API_BASE_URL}/api/profile/${userWalletAddress}`)
      .then(r => r.json())
      .then(d => { if (d.success && d.profile) { setUsername(d.profile.username || ""); setAvatarUrl(d.profile.avatar_url || ""); } })
      .catch(() => { });
  }, [userWalletAddress]);

  const handleSyncFunding = async () => {
  if (!quizReward) return;
  setIsFundedCheckLoading(true);
  try {
    const privyProvider = await wallets[0].getEthereumProvider();
    const ethersProvider = new BrowserProvider(privyProvider);
    const result = await getContractFundedStatus(
      ethersProvider,
      quizReward.contractAddress,
      quizReward.tokenAddress,
      quizReward.tokenDecimals,
      quizReward.isNativeToken,
      quizReward.poolAmount
    );
    if (result.isFunded) {
      setIsFunded(true);
      setContractBalance(result.balance);
      await fetch(`${API_BASE_URL}/api/quiz/${code}/mark-funded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: "manual-sync",
          contractAddress: quizReward.contractAddress,
        }),
      });
      toast.success("Funding status synced!");
    } else {
      toast.error(`Contract balance is ${result.balance} — not yet funded.`);
    }
  } catch (e: any) {
    toast.error("Sync failed: " + e.message);
  } finally {
    setIsFundedCheckLoading(false);
  }
};
// ── Smart Funding Check & Auto-Heal ──
  useEffect(() => {
    // Only run if the user is the creator, the contract is known, and a wallet is connected
    if (!isCreator || !quizReward?.contractAddress || !wallets[0]) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval>;

    const checkFunded = async () => {
      setIsFundedCheckLoading(true);
      
      try {
        const privyProvider = await wallets[0].getEthereumProvider();
        const ethersProvider = new BrowserProvider(privyProvider);
        
        const result = await getContractFundedStatus(
          ethersProvider,
          quizReward.contractAddress,
          quizReward.tokenAddress,
          quizReward.tokenDecimals,
          quizReward.isNativeToken,
          quizReward.poolAmount
        );
        
        if (!cancelled) {
          setContractBalance(result.balance);
          setIsFunded(result.isFunded);

          // 🚀 IF FUNDED: Stop checking and tell the database!
          if (result.isFunded) {
            // 1. Immediately kill the polling interval so we don't spam the RPC
            clearInterval(intervalId);
            
            // 2. Tell the backend to update the DB (Self-Healing)
            fetch(`${API_BASE_URL}/api/quiz/${code}/mark-funded`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                txHash: "auto-detected-on-reload", // Indicates the frontend found the balance
                contractAddress: quizReward.contractAddress 
              }),
            }).catch(err => console.error("Failed to sync funding to DB:", err));
          }
        }
      } catch (e) { 
        console.error("Balance check error:", e);
      } finally {
        if (!cancelled) setIsFundedCheckLoading(false);
      }
    };

    // 1. ALWAYS do one immediate hard-check when the page loads
    checkFunded();
    
    // 2. Start polling every 10 seconds. 
    // (If the check above returns true, it instantly clears this interval!)
    intervalId = setInterval(checkFunded, 10_000); 
    
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  // Re-run this effect ONLY if the contract address or connected wallet changes
  }, [isCreator, quizReward?.contractAddress, wallets[0]?.address, code]);

  // ── Load quiz meta ──
  useEffect(() => {
    if (!code) return;
    fetch(`${API_BASE_URL}/api/quiz/${code}`).then(r => r.json()).then(d => {
      if (d.success) {
        setQuizMeta({ title: d.quiz.title, totalQuestions: d.quiz.totalQuestions, creatorAddress: d.quiz.creatorAddress, coverImageUrl: d.quiz.coverImageUrl ?? null });
        if (d.quiz.reward?.isOnChain && d.quiz.reward?.contractAddress) {
          setQuizReward({
            contractAddress: d.quiz.reward.contractAddress,
            tokenAddress: d.quiz.reward.tokenAddress,
            tokenSymbol: d.quiz.reward.tokenSymbol,
            tokenDecimals: d.quiz.reward.tokenDecimals,
            tokenLogoUrl: d.quiz.reward.tokenLogoUrl,
            isNativeToken: d.quiz.reward.isNativeToken ?? false,
            poolAmount: String(d.quiz.reward.poolAmount),
            isFunded: d.quiz.reward.isFunded ?? false,
          });
          setIsFunded(d.quiz.reward.isFunded ?? false);
        }
        if (userWalletAddress && d.quiz.creatorAddress?.toLowerCase() === userWalletAddress.toLowerCase()) {
          setIsCreator(true); setIsSpectator(true); setHasJoined(true);
        }
        setPhase(d.quiz.status === "finished" ? "game_over" : "lobby");
      } else { toast.error("Quiz not found"); router.push("/quiz"); }
    }).catch(() => toast.error("Failed to load quiz"));
  }, [code, userWalletAddress, router]);

  // ── Timer ──
  const startTimer = useCallback((startedAt: number, timeLimit: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const tick = () => {
      const remaining = Math.max(0, timeLimit - (Date.now() - startedAt) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 250);
  }, []);

async function decryptMessage(keyMaterial: CryptoKey, b64: string): Promise<any> {
  const raw    = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const nonce  = raw.slice(0, 12);
  const ct     = raw.slice(12);
  const plain  = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, keyMaterial, ct);
  return JSON.parse(new TextDecoder().decode(plain));
}

async function importKey(b64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64Key), c => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
}

const connectWS = useCallback(() => {
    if (!code || !userWalletAddress) return;
    const ws = new WebSocket(`${getWsBaseUrl()}/ws/quiz/${code}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0; // Reset attempts on successful connection
      ws.send(JSON.stringify({ type: "identify", walletAddress: userWalletAddress }));
    };

    ws.onmessage = async (ev) => {
      let msg: any;
      try {
        // If we have a session key, decrypt — otherwise parse raw (for the key handshake itself)
        if (sessionKeyRef.current) {
          msg = await decryptMessage(sessionKeyRef.current, ev.data);
        } else {
          msg = JSON.parse(ev.data);
          // First message should always be session_key
          if (msg.type === "session_key") {
            sessionKeyRef.current = await importKey(msg.key);
            return; // don't process further
          }
        }
      } catch { return; }

      switch (msg.type) {
        case "state_sync":
          setQuizMeta(prev => prev ?? msg.quiz);
          setPlayers(msg.players || []);
          
          // Check if I am already in the backend's player list
          const amIPlaying = (msg.players || []).some((p: any) => p.walletAddress.toLowerCase() === myWallet);
          
          if (amIPlaying) {
            setIsReturningPlayer(true); // <--- Tells the button to say "Continue"
          }
          
          // Only auto-bypass the join screen if you are the CREATOR (Host)
          if (msg.isCreator) {
            setHasJoined(true);
            setIsSpectator(true);
          }

          if (msg.status === "finished") setPhase("game_over");
          break;  

        case "game_starting":
          toast.success(msg.message);
          break;
        case "player_list": setPlayers(msg.players || []); break;
        case "countdown": setPhase("countdown"); setCountdownVal(msg.value); break;
        case "question":
          if (timerRef.current) clearInterval(timerRef.current);
          setCurrentQ({ index: msg.index, total: msg.total, question: msg.question, options: msg.options, timeLimit: msg.timeLimit, startedAt: msg.startedAt });
          setSelectedId(null); setHasSubmitted(false); setRevealCorrectId(null); setPersonalResult(null); setPhase("question");
          startTimer(msg.startedAt, msg.timeLimit);
          break;
        case "answer_result": setPersonalResult({ isCorrect: msg.isCorrect, pointsEarned: msg.pointsEarned, streak: msg.streak }); break;
        case "question_end":
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeLeft(0); setRevealCorrectId(msg.correctId); setPhase("reveal");
          break;
        // ADD — wrap each case body in {}
        case "leaderboard": {
          setLeaderboard(msg.entries || []);
          setIsLastQuestion(!!msg.isLast);
          const me = (msg.entries || []).find((e: any) => e.walletAddress.toLowerCase() === myWallet);
          if (me) {
            setMyRankChange(me.rankChange);
            if (me.rankChange > 0) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); }
          }
          setPhase("leaderboard");
          break;
        }
        case "game_over": {
          setLeaderboard(msg.finalLeaderboard || []);
          setPhase("game_over");
          const fMe = (msg.finalLeaderboard || []).find((e: any) => e.walletAddress.toLowerCase() === myWallet);
          if (fMe?.rank === 1) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 6000); }
          break;
        }
      }
    };

    ws.onclose = (event) => {
      sessionKeyRef.current = null;
      // If server explicitly closes it normally (1000) or for policy violation (1008), do not reconnect.
      if (event.code === 1000 || event.code === 1008) return;

      // Stop trying after 5 failed attempts (prevents infinite server spam)
      if (reconnectAttempts.current >= 5) {
        toast.error("Lost connection to the quiz server. Please refresh the page.");
        return;
      }

      reconnectAttempts.current += 1;
      
      // Exponential backoff: 2s, 4s, 6s, 8s, 10s
      const delay = 2000 * reconnectAttempts.current; 
      
      setTimeout(() => { 
        if (wsRef.current?.readyState !== WebSocket.OPEN) connectWS(); 
      }, delay);
    };
  }, [code, userWalletAddress, startTimer, myWallet]);

  // ── Connect WS instantly to restore session state ──
  useEffect(() => {
    if (!userWalletAddress || wsRef.current?.readyState === WebSocket.OPEN) return;

    connectWS();

    return () => { 
      if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
      }
    };
  }, [userWalletAddress, connectWS]);


  // ── SOUND EFFECTS TRIGGERS ──
  useEffect(() => {
    if (phase === "reveal" && personalResult) {
      if (personalResult.isCorrect) playSound("correct");
      else playSound("wrong");
    }
    if (phase === "leaderboard") {
      if (myRankChange > 0) playSound("rank-up");
      else if (myRankChange < 0) playSound("rank-down");
    }
    if (phase === "game_over" && leaderboard.length > 0 && !gameOverSoundPlayed.current) {
      const me = leaderboard.find(e => e.walletAddress.toLowerCase() === myWallet);
      if (me) {
        if (me.rank <= 3) playSound("winner");
        else playSound("loser");
        gameOverSoundPlayed.current = true;
      }
    }
  }, [phase, personalResult, myRankChange, leaderboard, myWallet]);

  const handleJoin = async () => {
    if (!userWalletAddress || !username) { toast.error("Set a username in your profile"); return; }
    setIsJoining(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/quiz/${code}/join`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ walletAddress: userWalletAddress, username, avatarUrl }) 
      });
      const d = await r.json();
      
      if (d.success) { 
        setHasJoined(true); 
        setIsSpectator(false); // Make sure they are playing, not spectating
        
        if (d.status === "active") {
          toast.success("Joined mid-game! Wait for the next question."); 
        } else {
          toast.success(d.message || "Joined quiz!"); 
        }
      } else if (d.finished) { 
        setPhase("game_over"); 
        toast.info("This quiz has already ended."); 
      } else { 
        toast.error(d.message || "Failed to join"); 
      }
    } catch { 
      toast.error("Failed to join"); 
    } finally { 
      setIsJoining(false); 
    }
  };

const handleFundReward = async () => {
  if (!quizReward) { toast.error("No reward configured"); return; }
  if (!activeWallet) { toast.error("Wallet not ready"); return; }

  setIsFunding(true);
  setFundError("");

  try {
    const privyProvider = await activeWallet.getEthereumProvider();
    const provider = new BrowserProvider(privyProvider);

    const { txHash } = await fundQuizReward(provider, chainId, quizReward.contractAddress, {
      tokenAddress: quizReward.tokenAddress,
      tokenDecimals: quizReward.tokenDecimals,
      isNativeToken: quizReward.isNativeToken,
      poolAmount: quizReward.poolAmount,
    });

    setFundTxHash(txHash);
    setIsFunded(true);
    toast.success("Reward pool funded! 🎉");

    await fetch(`${API_BASE_URL}/api/quiz/${code}/mark-funded`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash, contractAddress: quizReward.contractAddress }),
    }).catch(() => {});

  } catch (err: any) {
    console.error("Funding Error:", err);
    const msg = parseOnchainError(err);
    setFundError(msg);
    toast.error(msg);
  } finally {
    setIsFunding(false);
  }
};
  const handleSelectAnswer = (optId: string) => {
    if (!currentQ || timeLeft <= 0 || isSpectator) return;
    
    const timeTaken = (currentQ.timeLimit - timeLeft);
    
    // Standard WebSocket Sync
    wsRef.current?.send(JSON.stringify({ 
      type: hasSubmitted ? "change_answer" : "submit_answer", 
      questionIndex: currentQ.index, 
      answerId: optId, 
      timeTaken 
    }));
    
    if (!hasSubmitted) setHasSubmitted(true);
    setSelectedId(optId);

    // 🚀 NEW: Trigger On-Chain Submit (Only on the VERY FIRST answer of the quiz)
    if (!hasSubmittedOnChain.current && userWalletAddress) {
      hasSubmittedOnChain.current = true; // Mark as triggered so we don't spam the blockchain
      
    }
  };

  const handleStartQuiz = () => {
    if (!userWalletAddress) return;
    setIsStarting(true);
    
    // 1. Instantly start the game for players via WebSocket
    wsRef.current?.send(JSON.stringify({ type: "start_quiz", walletAddress: userWalletAddress }));

    // 🚀 2. NEW: Trigger On-Chain Start (Fire and forget)
    fetch(`${API_BASE_URL}/api/quiz/${code}/on-chain-start`, {
      method: "POST"
    }).catch(err => console.error("On-chain start error:", err));
  };

  const myEntry = leaderboard.find(e => e.walletAddress.toLowerCase() === myWallet);

  // ══════════════════════════════════════════════════════════
  //  Render Phases
  // ══════════════════════════════════════════════════════════

  if (phase === "loading") {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
        <Header pageTitle="Quiz" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>
      </div>
    );
  }

  if (phase === "game_over") {
    return <QuizGameOver quizMeta={quizMeta} code={code} leaderboard={leaderboard} myWallet={myWallet} isCreator={isCreator} showConfetti={showConfetti} router={router} />;
  }

  // Pre-join screen
   if (!hasJoined && !isCreator && phase === "lobby") {
    const cover = quizMeta?.coverImageUrl;
    return (
    <div className="w-full max-w-sm space-y-5 text-center">
  {/* Code pill */}
  <div className="inline-flex flex-col items-center gap-1 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-2xl px-8 py-5 shadow-xl">
    <p className="text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest">Quiz Code</p>
    <div className="text-5xl font-black tracking-[0.15em] text-slate-900 dark:text-white drop-shadow">{code}</div>
  </div>
  {/* Title */}
  <div className="space-y-1.5">
    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{quizMeta?.title}</h2>
    <p className="text-slate-500 dark:text-white/60 text-sm font-medium">{quizMeta?.totalQuestions} questions</p>
  </div>
  {/* Join button */}
  <Button
    className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-blue-600 text-white rounded-2xl shadow-xl shadow-indigo-900/40 border-0"
    onClick={handleJoin}
    disabled={isJoining || !username}
  >
    {isJoining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
    {!username ? "Set Username First" : (isReturningPlayer ? "Continue" : "Join Quiz")}
  </Button>
  {!username && (
    <p className="text-amber-600 dark:text-amber-400 text-xs font-medium">Connect Profile to join Quiz<WalletConnectButton/> </p>
  )}
</div>
    );
  }
const grossDisplayAmount = quizReward
  ? (parseFloat(quizReward.poolAmount) * 100 / 95).toFixed(4)
  : "0";
  // Lobby waiting room
   if (phase === "lobby") {
    const cover = quizMeta?.coverImageUrl;
    return (
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-20">
  {/* Code + share row */}
  <div className="bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
    <div className="text-center sm:text-left">
      <p className="text-slate-500 dark:text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Quiz Code</p>
      <div className="text-4xl font-black tracking-widest text-slate-900 dark:text-white">{code}</div>
    </div>
    <Button
      variant="outline"
      className="border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 bg-transparent"
      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/quiz/${code}`); toast.success("Link copied!"); }}
    >
      <Share2 className="mr-2 h-4 w-4" /> Share Link
    </Button>
  </div>

  {/* Players */}
  <div className="bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 rounded-2xl overflow-hidden shadow-sm">
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
      <h3 className="text-slate-800 dark:text-white font-bold flex items-center gap-2">
        <Users className="h-4 w-4 text-indigo-500 dark:text-indigo-300" /> Players Joined
      </h3>
      <Badge className="bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-400/30">{players.length}</Badge>
    </div>
    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto">
      {players.length === 0 ? (
        <p className="col-span-full text-center text-slate-400 dark:text-white/40 py-10 text-sm font-medium">Waiting for players to join...</p>
      ) : players.map((p) => (
        <div key={p.walletAddress} className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2.5 border",
          p.walletAddress.toLowerCase() === myWallet
            ? "border-indigo-300 dark:border-indigo-400/40 bg-indigo-50 dark:bg-indigo-500/20"
            : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/10"
        )}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={p.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xs font-bold bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-white">{p.username?.slice(0, 2).toUpperCase() ?? "??"}</AvatarFallback>
          </Avatar>
          <span className="text-slate-800 dark:text-white text-sm font-bold truncate">{p.username}</span>
          {p.walletAddress.toLowerCase() === myWallet && (
            <Badge className="text-[9px] h-4 px-1.5 bg-indigo-500 text-white border-0 ml-auto shrink-0">YOU</Badge>
          )}
        </div>
      ))}
    </div>
  </div>

  {/* Host panel */}
  {isCreator && (
    <div className="bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 rounded-2xl p-6 space-y-5 max-w-lg mx-auto shadow-sm">
      <div className="text-center">
        <Crown className="h-8 w-8 mx-auto mb-3 text-indigo-500 dark:text-indigo-300" />
        <p className="text-slate-900 dark:text-white font-black text-2xl">You are the Host</p>
        <p className="text-slate-500 dark:text-white/60 text-sm mt-1">Fund the reward pool to unlock the Start button.</p>
      </div>

      {isFunded && quizReward ? (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-500/15 border border-green-200 dark:border-green-400/30 rounded-xl px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-700 dark:text-green-300">Reward Pool Funded ✓</p>
            <p className="text-xs text-green-600 dark:text-green-400/80 mt-0.5">
              {contractBalance} {quizReward.tokenSymbol} locked in contract
            </p>
          </div>
          {fundTxHash && (
            <a href={`https://celoscan.io/tx/${fundTxHash}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 text-green-500 dark:text-green-400" />
            </a>
          )}
        </div>
      ) : quizReward ? (
        <Button
          variant="outline"
          className="w-full h-12 border-amber-400 dark:border-amber-400/40 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 font-bold"
          onClick={handleFundReward}
          disabled={isFunding || isFundedCheckLoading}
        >
          {isFunding ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming in wallet...</>
          ) : isFundedCheckLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking on-chain balance...</>
          ) : (
            <><Wallet className="mr-2 h-4 w-4" /> Fund {grossDisplayAmount} {quizReward.tokenSymbol} (Required)</>
          )}
        </Button>
      ) : null}

     

      {isFunded && (
        <Button
          className="w-full h-14 text-lg font-bold text-white shadow-xl shadow-indigo-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] border-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          onClick={handleStartQuiz}
          disabled={isStarting}
        >
          {isStarting ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting…</>
          ) : (
            <><Play className="mr-2 h-5 w-5 fill-current" /> START QUIZ ({players.length} players)</>
          )}
        </Button>
      )}

      {fundError && (
        <div className="bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-400/30 rounded-lg px-3 py-2">
          <p className="text-xs text-red-600 dark:text-red-300 font-medium break-words">{fundError}</p>
        </div>
      )}

      {quizReward && (
        <div className="flex items-center gap-2 px-1">
          <p className="text-[10px] text-slate-400 dark:text-white/30 font-medium">Contract:</p>
          <p className="text-[10px] font-mono text-slate-500 dark:text-white/40 truncate flex-1">{quizReward.contractAddress}</p>
        </div>
      )}
    </div>
  )}
</div>
    );
  }

  // Countdown
  if (phase === "countdown") {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center select-none z-50">
        <div className="text-center space-y-4">
          <p className="text-slate-500 dark:text-slate-400 text-xl uppercase tracking-widest font-black">Get ready!</p>
          <div key={countdownVal} className="text-[10rem] md:text-[15rem] font-black text-indigo-600 dark:text-indigo-400 leading-none drop-shadow-sm" style={{ animation: "zoomFade 0.9s ease-out forwards" }}>
            {countdownVal}
          </div>
        </div>
        <style>{`@keyframes zoomFade { 0% { transform: scale(1.5); opacity: 0; } 30% { transform: scale(1); opacity: 1; } 80% { transform: scale(0.9); opacity: 1; } 100% { transform: scale(0.8); opacity: 0; } }`}</style>
      </div>
    );
  }

  // Mobile-Optimized Stacked Question & Reveal View
  if ((phase === "question" || phase === "reveal") && currentQ) {
    const isReveal = phase === "reveal";
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden select-none z-50">
        {/* Header & Horizontal Timer */}
        <div className="w-full shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          {!isReveal && <LinearTimer seconds={timeLeft} total={currentQ.timeLimit} />}
          {isSpectator && <div className="bg-amber-100 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500 text-amber-800 dark:text-amber-400 py-1.5 px-4 text-center text-xs font-bold uppercase tracking-wider">👁️ Spectator Mode</div>}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-5xl mx-auto w-full">
            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 rounded-full font-bold">
              Q{currentQ.index + 1} / {currentQ.total}
            </Badge>
            <div className="font-black text-slate-800 dark:text-white/80 italic tracking-tighter text-lg truncate max-w-[40%] text-center">{quizMeta?.title}</div>
            <div className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/20 px-3 py-1 rounded-full">
              <Zap className="h-4 w-4 fill-current" /> {myEntry?.points || 0}
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 text-center max-w-5xl mx-auto w-full">
          {/* CLEAN READABLE TEXT */}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug">
            {currentQ.question}
          </h2>

          {/* Reaction Pill for correct/wrong reveal */}
          {isReveal && personalResult && !isSpectator && (
            <div className={cn(
              "mt-8 px-8 py-3.5 rounded-full font-black text-xl shadow-lg border-2 animate-in zoom-in-90",
              personalResult.isCorrect ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-400 dark:border-green-500/50" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-400 dark:border-red-500/50"
            )}>
              {personalResult.isCorrect ? (
                <span className="flex items-center gap-2">
                  <Check className="h-7 w-7" /> CORRECT +{personalResult.pointsEarned}
                  {personalResult.streak > 1 && <span className="ml-2 bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-sm shadow-sm">🔥 {personalResult.streak}</span>}
                </span>
              ) : (
                <span className="flex items-center gap-2"><X className="h-7 w-7" /> INCORRECT</span>
              )}
            </div>
          )}
        </div>

        {/* Answer Stack: Stacked on mobile, 2-cols on desktop */}
        <div className="w-full max-w-5xl mx-auto px-4 pb-8 md:pb-12 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 shrink-0">
          {currentQ.options.map(opt => {
            const style = OPTION_STYLES[opt.id];
            const isSelected = selectedId === opt.id;
            const isCorrect = isReveal && opt.id === revealCorrectId;
            const isWrong = isReveal && isSelected && opt.id !== revealCorrectId;

            return (
              <button
                key={opt.id}
                disabled={isSpectator || isReveal || timeLeft <= 0}
                onClick={() => handleSelectAnswer(opt.id)}
                className={cn(
                  "relative w-full flex items-center justify-between px-6 py-5 sm:py-6 md:py-8 rounded-2xl",
                  "text-white font-bold text-lg md:text-xl transition-all duration-150",
                  "active:scale-[0.98] cursor-pointer shadow-md",
                  style.bg,

                  !isReveal && !isSelected && "opacity-90 hover:opacity-100 hover:scale-[1.01] hover:shadow-lg",
                  isSelected && !isReveal && ["opacity-100 scale-[1.02] shadow-xl ring-4", style.selectedRing],
                  isReveal && !isCorrect && !isWrong && "opacity-40 scale-[0.98] grayscale-[0.5] shadow-none",
                  isCorrect && ["opacity-100 scale-[1.03] ring-4 ring-white dark:ring-green-300 shadow-2xl brightness-110"],
                  isWrong && ["opacity-70 ring-4 ring-red-400 before:absolute before:inset-0 before:rounded-2xl before:bg-black/20"],
                  (isSpectator || timeLeft <= 0) && "cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-4 text-left">
                  <span className="text-2xl md:text-3xl opacity-90">{style.shape}</span>
                  <span className="leading-snug">{opt.text}</span>
                </div>

                {isReveal && isCorrect && <div className="bg-white/20 rounded-full p-1.5"><Check className="h-6 w-6 stroke-[4px]" /></div>}
                {isReveal && isWrong && <div className="bg-white/20 rounded-full p-1.5"><X className="h-6 w-6 stroke-[4px]" /></div>}
                {isSelected && !isReveal && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/30 backdrop-blur shrink-0"><Check className="h-5 w-5 stroke-[3px] text-white" /></div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Leaderboard
  if (phase === "leaderboard") {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden z-50">
        <Confetti active={showConfetti} />
        <RankReaction change={myRankChange} />

        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10">
          <h2 className="text-slate-900 dark:text-white font-black text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" /> Leaderboard
          </h2>
          <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-slate-200 dark:border-slate-700">
            {isLastQuestion ? "Final Results!" : `Q${(currentQ?.index ?? 0) + 1}/${currentQ?.total ?? "?"} done`}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 max-w-3xl mx-auto w-full z-10">
          {leaderboard.slice(0, 10).map((entry, i) => {
            const isMe = entry.walletAddress.toLowerCase() === myWallet;
            return (
              <div
                key={entry.walletAddress}
                className={cn(
                  "flex items-center gap-3 sm:gap-4 rounded-2xl px-4 py-3 sm:py-4 transition-all duration-500 animate-in slide-in-from-bottom-4 shadow-sm",
                  isMe ? "bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-500/50 shadow-indigo-100 dark:shadow-none" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0",
                  entry.rank === 1 ? "bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-black shadow-inner" :
                    entry.rank === 2 ? "bg-slate-300 text-slate-800 dark:bg-slate-300 dark:text-black" :
                      entry.rank === 3 ? "bg-amber-600 text-white dark:bg-amber-600" :
                        "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}>
                  {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                </div>
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 border border-slate-200 dark:border-slate-700">
                  <AvatarImage src={entry.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white font-bold">{entry.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 dark:text-white font-bold text-base truncate">{entry.username}</span>
                    {isMe && <Badge className="text-[9px] h-4 px-1.5 bg-indigo-600 text-white border-0 shrink-0">YOU</Badge>}
                    {entry.streak > 1 && <Badge className="text-[9px] h-4 px-1.5 bg-orange-500 text-white border-0 shrink-0">🔥{entry.streak}</Badge>}
                  </div>
                  {entry.pointsThisRound > 0 && <span className="text-green-600 dark:text-green-400 text-xs font-black">+{entry.pointsThisRound} pts</span>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-slate-900 dark:text-white font-black text-xl">{entry.points}</div>
                  <div className="flex items-center justify-end"><RankBadge change={entry.rankChange} /></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 text-center z-10">
          <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
            {isLastQuestion ? "Finalizing results..." : "Next question coming up..."}
          </span>
        </div>
      </div>
    );
  }

  return null;
}