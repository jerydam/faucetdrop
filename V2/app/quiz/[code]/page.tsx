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
  ArrowLeft,
} from "lucide-react";
import { getContractFundedStatus } from "@/lib/quiz";
import { Wallet, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";
import { BrowserProvider, Contract, JsonRpcProvider, parseUnits, Interface, formatUnits, TransactionRequest } from "ethers";
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
  isReady?: boolean;  // ← add this
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

interface PayoutRecord { wallet_address: string; username: string; rank: number; points: number; amount: number; token_symbol: string; status: string; tx_hash: string | null; }
interface PayoutsData { success: boolean; faucetAddress: string; chainId: number; payouts: PayoutRecord[]; }

function QuizGameOver({
  quizMeta, code, leaderboard, myWallet, isCreator, showConfetti, router,
  initialResults, loadingInitialResults, rewardsReady,
  quizReward,   // ← add
        // ← add
}: any) {
  const [payoutsData, setPayoutsData] = useState<PayoutsData | null>(null);
  const { address: userWalletAddress } = useWallet();
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedTx, setClaimedTx] = useState<string | null>(null);
  const [showFullResults, setShowFullResults] = useState(!!initialResults);
  const [resultsData, setResultsData] = useState<any>(initialResults ?? null);
  const [loadingResults, setLoadingResults] = useState(false);
  const { wallets } = useWallets();
  
  const activeWallet =
    wallets.find((w) => w.walletClientType === "privy") ||
    wallets.find((w) => w.address.toLowerCase() === userWalletAddress?.toLowerCase()) ||
    wallets?.[0];

 const [claimWindowExpired, setClaimWindowExpired] = useState(false);
 const [claimWindowChecked, setClaimWindowChecked] = useState(false);

useEffect(() => {
  if (!quizReward?.contractAddress || !isCreator) return;

  const CHAIN_RPC: Record<number, string> = {
    42220: "https://forno.celo.org",
    1135:  "https://rpc.api.lisk.com",
    42161: "https://arb1.arbitrum.io/rpc",
    8453:  "https://mainnet.base.org",
    56:    "https://bsc-dataseed.binance.org",
  };

  let cancelled = false;

  const checkWindow = async () => {
    try {
      const rpcUrl = quizReward.chainId ? CHAIN_RPC[quizReward.chainId] : null;
      if (!rpcUrl) return;

      const provider = new JsonRpcProvider(rpcUrl);
      const contract = new Contract(
        quizReward.contractAddress,
        [
          "function claimWindowEnd() view returns (uint256)",
          "function isClaimActive() view returns (bool)",
        ],
        provider
      );

      const [claimWindowEnd, isClaimActive] = await Promise.all([
        contract.claimWindowEnd(),
        contract.isClaimActive(),
      ]);

      const nowTs = Math.floor(Date.now() / 1000);
      const windowEnd = Number(claimWindowEnd);

      if (!cancelled) {
        // Window expired = end time has passed AND claim is no longer active
        // windowEnd === 0 means rewards never dispatched yet
        const expired = windowEnd > 0 && nowTs > windowEnd && !isClaimActive;
        setClaimWindowExpired(expired);
        setClaimWindowChecked(true);

        // Drive the marquee countdown for creator
        if (windowEnd > 0 && isClaimActive) {
          let secondsLeft = windowEnd - nowTs;
          if (secondsLeft > 0) {
            setCountdownDisplay(fmt(secondsLeft));
            const interval = setInterval(() => {
              secondsLeft -= 1;
              if (secondsLeft <= 0) {
                clearInterval(interval);
                setCountdownDisplay("Expired");
                setClaimWindowExpired(true);
              } else {
                setCountdownDisplay(fmt(secondsLeft));
              }
            }, 1000);
            // cleanup handled by outer effect cleanup
          }
        } else if (expired) {
          setCountdownDisplay("Expired");
        }
      }
    } catch (e) {
      console.error("Claim window check failed:", e);
      if (!cancelled) setClaimWindowChecked(true);
    }
  };

  checkWindow();
  const interval = setInterval(checkWindow, 30_000);
  return () => { cancelled = true; clearInterval(interval); };
}, [quizReward?.contractAddress, quizReward?.chainId, isCreator]);
  // 1. Add new state variables at the top of QuizGameOver
const [onChainStatus, setOnChainStatus] = useState<{
  hasReward: boolean;
  claimed: boolean;
  rewardAmount: string;
  canClaim: boolean;
  timeRemaining: number;
} | null>(null);
const [checkingChain, setCheckingChain] = useState(false);

useEffect(() => {
  if (!quizReward?.contractAddress || !wallets?.[0] || !myWallet) return;

  let cancelled = false;
  const CHAIN_RPC: Record<number, string> = {
    42220: "https://forno.celo.org",
    1135:  "https://rpc.api.lisk.com",
    42161: "https://arb1.arbitrum.io/rpc",
    8453:  "https://mainnet.base.org",
    56:    "https://bsc-dataseed.binance.org",
  };

  const checkOnChain = async () => {
    setCheckingChain(true);
    try {
      // Always use the contract's chain RPC — never the user's current wallet chain
      const contractChainId = quizReward.chainId;
      const rpcUrl = contractChainId ? CHAIN_RPC[contractChainId] : null;

      let provider;
      if (rpcUrl) {
        // Read-only provider on the correct chain — works regardless of user's current network
        const { JsonRpcProvider } = await import("ethers");
        provider = new JsonRpcProvider(rpcUrl);
      } else {
        // Fallback to wallet provider if chainId unknown
        const privyProvider = await wallets[0].getEthereumProvider();
        provider = new BrowserProvider(privyProvider);
      }

      const contract = new Contract(
        quizReward.contractAddress,
        ["function getClaimStatus(address user) view returns (bool claimed, bool hasRewardAmount, uint256 rewardAmount, bool canClaim, uint256 timeRemaining)"],
        provider
      );
      const [claimed, hasRewardAmount, rewardAmount, canClaim, timeRemaining] =
        await contract.getClaimStatus(myWallet);
      if (!cancelled) {
        setOnChainStatus({
          hasReward: hasRewardAmount,
          claimed,
          rewardAmount: formatUnits(rewardAmount, quizReward.tokenDecimals),
          canClaim,
          timeRemaining: Number(timeRemaining),
        });
      }
    } catch (e) {
      console.error("On-chain claim status check failed:", e);
    } finally {
      if (!cancelled) setCheckingChain(false);
    }
  };

  checkOnChain();
  return () => { cancelled = true; };
}, [quizReward?.contractAddress, wallets?.[0]?.address, myWallet, claimedTx, rewardsReady]);

const [countdownDisplay, setCountdownDisplay] = useState("");

const fmt = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
};

useEffect(() => {
  if (!onChainStatus || onChainStatus.timeRemaining <= 0) {
    setCountdownDisplay("");
    return;
  }
  let secondsLeft = onChainStatus.timeRemaining;
  // timeRemaining from contract is seconds remaining
  
  setCountdownDisplay(fmt(secondsLeft));
  const interval = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      clearInterval(interval);
      setCountdownDisplay("Expired");
      // Re-check chain so canClaim updates
      setOnChainStatus(prev => prev ? { ...prev, canClaim: false, timeRemaining: 0 } : prev);
    } else {
      setCountdownDisplay(fmt(secondsLeft));
    }
  }, 1000);
  return () => clearInterval(interval);
}, [onChainStatus?.canClaim, onChainStatus?.timeRemaining]);

  useEffect(() => {
    if (initialResults && !resultsData) {
      setResultsData(initialResults);
      setShowFullResults(true);
    }
  }, [initialResults]);

  // 🚀 Re-fetches instantly when rewardsReady turns true!
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/quiz/${code}/payouts`)
      .then(r => r.json())
      .then(d => { if (d.success) setPayoutsData(d); })
      .finally(() => setLoadingPayouts(false));
  }, [code, rewardsReady]);

  const myPayout = payoutsData?.payouts.find(
    p => p.wallet_address.toLowerCase() === myWallet.toLowerCase()
  );
  const hasAlreadyClaimed = myPayout?.status === "claimed" || !!claimedTx;
  const totalWinners = payoutsData?.payouts.length ?? 0;

  const payoutByWallet = useMemo(() => {
    const map: Record<string, PayoutRecord> = {};
    payoutsData?.payouts.forEach(p => { map[p.wallet_address.toLowerCase()] = p; });
    return map;
  }, [payoutsData]);

  const handleSwitchAndClaim = async () => {
  if (!activeWallet || !quizReward) { toast.error("Wallet not connected"); return; }
  
  // Get the quiz's required chain from quizReward or fallback to payouts data
  const requiredChainId = quizReward?.chainId ?? payoutsData?.chainId;
  
  if (requiredChainId) {
    const currentChainId = parseInt(activeWallet.chainId.split(":")[1] ?? "0");
    if (currentChainId !== requiredChainId) {
      try {
        toast.info("Switching to the correct network...");
        await activeWallet.switchChain(requiredChainId);
        await new Promise(r => setTimeout(r, 1500)); // wait for switch
      } catch (e: any) {
        toast.error("Please switch to the correct network in your wallet");
        return;
      }
    }
  }
  handleClaim();
};

  const handleClaim = async () => {
    if (!activeWallet) { toast.error("Wallet not connected"); return; }
    setIsClaiming(true);
    toast.info("Processing claim...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/quiz/${code}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: myWallet }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message || "Claim failed");
      setClaimedTx(data.txHash);
      toast.success("Reward claimed! It is now in your wallet.");
      setPayoutsData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          payouts: prev.payouts.map(p =>
            p.wallet_address.toLowerCase() === myWallet.toLowerCase()
              ? { ...p, status: "claimed", tx_hash: data.txHash }
              : p
          ),
        };
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to process claim");
    } finally {
      setIsClaiming(false);
    }
  };

  const fetchResults = async () => {
    if (resultsData) { setShowFullResults(true); return; }
    setLoadingResults(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/quiz/${code}/results`);
      const d = await res.json();
      if (d.success) {
        if ((!d.leaderboard || d.leaderboard.length === 0) && leaderboard.length > 0) {
          d.leaderboard = leaderboard;
          d.totalPlayers = leaderboard.length;
        }
        setResultsData(d);
        setShowFullResults(true);
      } else {
        setResultsData({ success: true, quiz: quizMeta, leaderboard, payouts: payoutByWallet, totalPlayers: leaderboard.length, endedAt: null });
        setShowFullResults(true);
      }
    } catch {
      setResultsData({ success: true, quiz: quizMeta, leaderboard, payouts: payoutByWallet, totalPlayers: leaderboard.length, endedAt: null });
      setShowFullResults(true);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleShareResults = () => {
    navigator.clipboard.writeText(`${window.location.origin}/quiz/${code}/results`);
    toast.success("Results link copied!");
  };

  const top3 = leaderboard.slice(0, 3);
  const EXPLORER_BASE: Record<number, string> = {
    42220: "https://celoscan.io/tx/",
    1135:  "https://blockscout.lisk.com/tx/",
    42161: "https://arbiscan.io/tx/",
    8453:  "https://basescan.org/tx/",
    56:    "https://bscscan.com/tx/",
  };

  // ── Full Results View ──────────────────────────────────────
  if (showFullResults) {
    if (loadingInitialResults && !resultsData) {
      return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Loading results...</p>
          </div>
        </div>
      );
    }

    const rd = resultsData;
    if (!rd) return null;

    const { quiz: rQuiz, leaderboard: fullLb, payouts: fullPayouts, totalPlayers, endedAt } = rd;
    const fullTop3 = fullLb.slice(0, 3);
    const explorerBase = EXPLORER_BASE[rQuiz?.chainId] || "";

    const formatDate = (iso: string | null) => {
      if (!iso) return "";
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
     <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-auto">
        <Confetti active={showConfetti} />
        {countdownDisplay && countdownDisplay !== "Expired" && (
          <div className="w-full bg-amber-500 dark:bg-amber-600 overflow-hidden shrink-0">
            <div className="py-1.5 flex whitespace-nowrap" style={{ animation: "marqueeScroll 18s linear infinite" }}>
              {[...Array(4)].map((_, i) => (
                <span key={i} className="text-white text-xs font-bold flex items-center gap-2 px-12">
                  <Clock className="h-3 w-3 shrink-0" />
                  {onChainStatus?.claimed || claimedTx
                    ? `✓ Claimed — Claim window expires in ${countdownDisplay}`
                    : `Claim window expires in ${countdownDisplay}`
                  }
                </span>
              ))}
            </div>
            <style>{`@keyframes marqueeScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
          </div>
        )}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
         <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            {leaderboard.length > 0 ? (
              <button onClick={() => setShowFullResults(false)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-bold transition-colors">
                <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Game Summary</span>
              </button>
            ) : (
              <button onClick={() => router.push("/quiz")} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-bold transition-colors">
                <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Quiz Hub</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-0 font-mono text-xs">{code}</Badge>
              <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-0 text-xs">Ended</Badge>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-20">
          <div className="text-center space-y-2">
            {rQuiz?.coverImageUrl ? (
              <div className="relative w-full max-w-md mx-auto aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 mb-4">
                <img src={rQuiz.coverImageUrl} alt={rQuiz.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h1 className="text-white font-black text-lg sm:text-2xl text-left drop-shadow">{rQuiz.title}</h1>
                </div>
              </div>
            ) : (
              <>
                <div className="text-4xl sm:text-6xl mb-2">🏆</div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{rQuiz?.title || quizMeta?.title}</h1>
              </>
            )}
            <div className="flex items-center justify-center gap-3 flex-wrap text-slate-500 dark:text-slate-400 text-sm">
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{totalPlayers} players</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" />{rQuiz?.totalQuestions} questions</span>
              {endedAt && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>{formatDate(endedAt)}</span>
                </>
              )}
            </div>
          </div>

{myWallet && (() => {
  const myEntry = fullLb.find((e: any) => e.walletAddress?.toLowerCase() === myWallet);
  if (!myEntry) return null;

  const myFullPayout = fullPayouts?.[myWallet];

  // ── Merge backend + on-chain truth ──
  const isClaimed =
    claimedTx ||
    onChainStatus?.claimed ||
    myFullPayout?.status === "claimed";

  const hasReward = onChainStatus?.hasReward || !!myFullPayout;

  const rewardAmt =
    onChainStatus?.rewardAmount ||
    (myFullPayout ? String(myFullPayout.amount) : null);

  const tokenSymbol =
    quizReward?.tokenSymbol ||
    myFullPayout?.tokenSymbol ||
    myFullPayout?.token_symbol ||
    "";

  return (
    <div className={cn(
      "rounded-2xl p-4 border flex items-center gap-4",
      myEntry.rank === 1
        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/30"
        : myEntry.rank <= 3
          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700/30"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
    )}>
      {/* Rank icon */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0",
        myEntry.rank === 1 ? "bg-yellow-400 text-yellow-900" :
        myEntry.rank === 2 ? "bg-slate-300 text-slate-800" :
        myEntry.rank === 3 ? "bg-amber-600 text-white" :
        "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
      )}>
        {myEntry.rank <= 3 ? ["🥇","🥈","🥉"][myEntry.rank - 1] : `#${myEntry.rank}`}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-black text-slate-900 dark:text-white">Your Result</p>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Rank #{myEntry.rank} • {myEntry.points} points
        </p>
      </div>

      {/* Reward section — driven by on-chain status */}
      <div className="text-right shrink-0 space-y-1.5">
        {/* Still loading chain */}
        {checkingChain && !onChainStatus && (
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-400 border-0 gap-1 flex items-center">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking chain…
          </Badge>
        )}

        {/* On-chain check done */}
        {!checkingChain && onChainStatus && (
          <>
            {hasReward && rewardAmt && (
              <p className="text-yellow-600 dark:text-yellow-400 font-black text-sm">
                {rewardAmt} {tokenSymbol}
              </p>
            )}

            {!isCreator && (
              isClaimed ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                  ✓ Claimed
                </Badge>
              ) : onChainStatus.canClaim ? (
                        <>
                          <Button size="sm" className="h-7 px-3 text-xs font-bold bg-yellow-400 hover:bg-yellow-500 text-black border-0 shadow-sm" onClick={handleSwitchAndClaim} disabled={isClaiming}>
                            {isClaiming ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Claim Reward
                          </Button>
                          {countdownDisplay && (
                            <p className="text-slate-400 dark:text-slate-500 text-[10px] flex items-center justify-end gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" /> {countdownDisplay} left
                            </p>
                          )}
                        </>
              ) : onChainStatus.hasReward ? (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
                  Claim window not open
                </Badge>
              ) : (
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-0 text-xs">
                  Not eligible
                </Badge>
              )
            )}
          </>
        )}

        {/* Chain check failed / no wallet — fall back to backend data */}
        {!checkingChain && !onChainStatus && myFullPayout && (
          <>
            <p className="text-yellow-600 dark:text-yellow-400 font-black text-sm">
              {myFullPayout.amount} {tokenSymbol}
            </p>
            {!isCreator && (
              isClaimed ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                  ✓ Claimed
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs font-bold bg-yellow-400 hover:bg-yellow-500 text-black border-0 shadow-sm"
                  onClick={handleSwitchAndClaim}
                  disabled={isClaiming}
                >
                  {isClaiming
                    ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    : null}
                  Claim Reward
                </Button>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
})()}


          {rQuiz?.reward && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-yellow-700 dark:text-yellow-400 font-black text-lg">{rQuiz.reward.poolAmount} {rQuiz.reward.tokenSymbol}</p>
                <p className="text-yellow-600 dark:text-yellow-500 text-xs mt-0.5">Prize pool • Top {rQuiz.reward.totalWinners} winner{rQuiz.reward.totalWinners > 1 ? "s" : ""}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-400 dark:text-yellow-600 shrink-0" />
            </div>
          )}

          {/* Podium */}
          {fullTop3.length > 0 && (
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest text-center mb-4">Top 3</p>
              <div className="flex items-end justify-center gap-2 sm:gap-4">
                {fullTop3[1] && (
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                    <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-4 border-slate-300 dark:border-slate-600 shadow-lg">
                      <AvatarImage src={fullTop3[1].avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-slate-200 dark:bg-slate-700 font-bold text-sm">{fullTop3[1].username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="text-slate-900 dark:text-white text-xs font-bold truncate max-w-[70px] sm:max-w-[90px]">{fullTop3[1].username}</p>
                      <p className="text-slate-500 dark:text-slate-400 font-black text-xs sm:text-sm">{fullTop3[1].points} pts</p>
                    </div>
                    <div className="bg-slate-300 dark:bg-slate-700 w-16 sm:w-28 h-20 sm:h-32 rounded-t-xl flex items-center justify-center text-2xl sm:text-4xl">🥈</div>
                  </div>
                )}
                {fullTop3[0] && (
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                    <div className="text-2xl sm:text-4xl animate-bounce">👑</div>
                    <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-4 border-yellow-400 shadow-xl">
                      <AvatarImage src={fullTop3[0].avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-yellow-100 dark:bg-yellow-900/30 font-bold text-lg text-yellow-800 dark:text-yellow-300">{fullTop3[0].username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="text-slate-900 dark:text-white text-sm font-black truncate max-w-[90px] sm:max-w-[120px]">{fullTop3[0].username}</p>
                      <p className="text-yellow-600 dark:text-yellow-400 font-black text-base sm:text-xl">{fullTop3[0].points} pts</p>
                    </div>
                    <div className="bg-yellow-400 dark:bg-yellow-600 w-20 sm:w-36 h-28 sm:h-44 rounded-t-xl flex items-center justify-center text-3xl sm:text-5xl">🥇</div>
                  </div>
                )}
                {fullTop3[2] && (
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                    <Avatar className="h-10 w-10 sm:h-14 sm:w-14 border-4 border-amber-600 shadow-lg">
                      <AvatarImage src={fullTop3[2].avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-amber-100 dark:bg-amber-900/30 font-bold text-xs text-amber-800 dark:text-amber-300">{fullTop3[2].username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="text-slate-900 dark:text-white text-xs font-bold truncate max-w-[60px] sm:max-w-[90px]">{fullTop3[2].username}</p>
                      <p className="text-amber-700 dark:text-amber-500 font-black text-xs sm:text-sm">{fullTop3[2].points} pts</p>
                    </div>
                    <div className="bg-amber-600 dark:bg-amber-800 w-14 sm:w-24 h-16 sm:h-24 rounded-t-xl flex items-center justify-center text-2xl sm:text-3xl">🥉</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full standings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-slate-800 dark:text-white font-bold text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> Final Standings
              </h2>
              <span className="text-slate-400 dark:text-slate-500 text-xs">{totalPlayers} players</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {fullLb.map((entry: any) => {
                const isMe = entry.walletAddress?.toLowerCase() === myWallet;
                const payout = fullPayouts?.[entry.walletAddress?.toLowerCase()];
                const isWinner = !!payout;
                return (
                  <div key={entry.walletAddress} className={cn("flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4", isMe && "bg-indigo-50 dark:bg-indigo-950/20", isWinner && "border-l-4 border-l-yellow-400 dark:border-l-yellow-500")}>
                    <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-black text-xs sm:text-sm shrink-0", entry.rank === 1 ? "bg-yellow-400 text-yellow-900" : entry.rank === 2 ? "bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-white" : entry.rank === 3 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                      {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : `#${entry.rank}`}
                    </div>
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 border border-slate-200 dark:border-slate-700">
                      <AvatarImage src={entry.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-xs font-bold">{entry.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm truncate">{entry.username}</span>
                        {isMe && <Badge className="text-[9px] h-4 px-1 bg-indigo-600 text-white border-0 shrink-0">YOU</Badge>}
                        {isWinner && <Badge className="text-[9px] h-4 px-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300 border-0 shrink-0">🏆</Badge>}
                        {(entry.streak > 1) && <Badge className="text-[9px] h-4 px-1 bg-orange-500 text-white border-0 shrink-0">🔥{entry.streak}</Badge>}
                      </div>
                      {isWinner && payout.amount > 0 && (
                        <p className="text-yellow-600 dark:text-yellow-400 text-xs font-bold mt-0.5 flex items-center gap-1.5">
                          {payout.amount} {payout.tokenSymbol}
                          <span className={cn("text-[10px]", payout.status === "claimed" ? "text-green-500" : "text-amber-500")}>
                            {payout.status === "claimed" ? "• Claimed ✓" : "• Unclaimed"}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-slate-900 dark:text-white font-black text-sm sm:text-lg leading-tight">{entry.points}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {leaderboard.length > 0 && (
              <Button variant="outline" className="flex-1 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" onClick={() => setShowFullResults(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Game Summary
              </Button>
            )}
            <Button variant="outline" className="flex-1 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" onClick={handleShareResults}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            {isCreator && quizReward && (
               <Button
                className={cn(
                  "flex-1 h-12 font-bold border-0",
                  claimWindowChecked && claimWindowExpired
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                )}
                    
                disabled={!claimWindowChecked || !claimWindowExpired}
                onClick={async () => {
                  if (!activeWallet || !quizReward) return;
                  try {
                    const requiredChainId = quizReward.chainId;
                    if (requiredChainId) {
                      const currentChainId = parseInt(activeWallet.chainId.split(":")[1] ?? "0");
                      if (currentChainId !== requiredChainId) {
                        toast.info("Switching to the correct network...");
                        await activeWallet.switchChain(requiredChainId);
                        await new Promise(r => setTimeout(r, 1500));
                      }
                    }
                    const privyProvider = await activeWallet.getEthereumProvider();
                    const provider = new BrowserProvider(privyProvider);
                    const signer = await provider.getSigner();
                    const contract = new Contract(
                      quizReward.contractAddress,
                      ["function withdraw(uint256 amount) external", "function token() view returns (address)", "function isEther() view returns (bool)"],
                      signer
                    );
                    toast.info("Processing withdrawal...");
                    // Get full balance and withdraw all
                    const { JsonRpcProvider: JRP } = await import("ethers");
                    const readProvider = new JRP(quizReward.chainId ? ({
                      42220: "https://forno.celo.org",
                      1135: "https://rpc.api.lisk.com",
                      42161: "https://arb1.arbitrum.io/rpc",
                      8453: "https://mainnet.base.org",
                      56: "https://bsc-dataseed.binance.org",
                    } as Record<number, string>)[quizReward.chainId] : "https://forno.celo.org");
                    const readContract = new Contract(
                      quizReward.contractAddress,
                      ["function customClaimAmounts(address) view returns (uint256)", "function token() view returns (address)"],
                      readProvider
                    );
                    const tokenAddr = quizReward.tokenAddress;
                    const erc20 = new Contract(tokenAddr, ["function balanceOf(address) view returns (uint256)"], readProvider);
                    const bal = await erc20.balanceOf(quizReward.contractAddress);
                    const tx = await contract.withdraw(bal);
                    await tx.wait();
                    toast.success("Withdrawal successful!");
                  } catch (e: any) {
                    toast.error(parseOnchainError(e));
                  }
                }}
              >
                 {!claimWindowChecked ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</>
                ) : !claimWindowExpired ? (
                  <><Clock className="mr-2 h-4 w-4" /> Withdraw {countdownDisplay ? `(${countdownDisplay} left)` : "(claim window open)"}</>
                ) : (
                  <><Wallet className="mr-2 h-4 w-4" /> Withdraw Funds</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Game Over Summary (Live View) ─────
  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-auto">
        <Confetti active={showConfetti} />
        {countdownDisplay && countdownDisplay !== "Expired" && (
          <div className="w-full bg-amber-500 dark:bg-amber-600 overflow-hidden shrink-0">
            <div className="py-1.5 flex whitespace-nowrap" style={{ animation: "marqueeScroll 18s linear infinite" }}>
              {[...Array(4)].map((_, i) => (
                <span key={i} className="text-white text-xs font-bold flex items-center gap-2 px-12">
                  <Clock className="h-3 w-3 shrink-0" />
                  {onChainStatus?.claimed || claimedTx
                    ? `✓ Claimed — Claim window expires in ${countdownDisplay}`
                    : `Claim window expires in ${countdownDisplay}`
                  }
                </span>
              ))}
            </div>
            <style>{`@keyframes marqueeScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
          </div>
        )}
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-24 space-y-6 sm:space-y-8">

        <div className="text-center space-y-2">
          <div className="text-5xl sm:text-7xl drop-shadow-md mb-3">🏆</div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">Quiz Complete!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium">{quizMeta?.title}</p>
        </div>

        {/* 🚀 My Result Card (With Claim Button) */}
        {myWallet && (() => {
          const myEntry = leaderboard.find((e: any) => e.walletAddress?.toLowerCase() === myWallet);
          if (!myEntry) return null;
          const myPayout = payoutByWallet[myWallet];
          return (
            <div className={cn(
              "max-w-xl mx-auto w-full rounded-2xl p-4 border flex items-center gap-4 shadow-sm",
              myEntry.rank === 1 ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/30" : 
              myEntry.rank <= 3 ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700/30" : 
              "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0",
                myEntry.rank === 1 ? "bg-yellow-400 text-yellow-900" :
                myEntry.rank === 2 ? "bg-slate-300 text-slate-800" :
                myEntry.rank === 3 ? "bg-amber-600 text-white" :
                "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
              )}>
                {myEntry.rank <= 3 ? ["🥇","🥈","🥉"][myEntry.rank - 1] : `#${myEntry.rank}`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 dark:text-white">Your Result</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Rank #{myEntry.rank} • {myEntry.points} points</p>
              </div>
              <div className="text-right shrink-0 space-y-1.5">
                {checkingChain && !onChainStatus && (
                  <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-400 border-0 gap-1 flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking…
                  </Badge>
                )}
                {!checkingChain && onChainStatus && (
                  <>
                    {onChainStatus.hasReward && (
                      <p className="text-yellow-600 dark:text-yellow-400 font-black text-sm">
                        {onChainStatus.rewardAmount} {quizReward?.tokenSymbol}
                      </p>
                    )}
                    {!isCreator && (
                     (claimedTx || onChainStatus.claimed) ? (
                        <>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">✓ Claimed</Badge>
                          {countdownDisplay && (
                            <p className="text-slate-400 dark:text-slate-500 text-[10px] flex items-center justify-end gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" /> {countdownDisplay} left
                            </p>
                          )}
                        </>
                      ) : onChainStatus.canClaim ? (
                        <>
                          <Button size="sm" className="h-7 px-3 text-xs font-bold bg-yellow-400 hover:bg-yellow-500 text-black border-0 shadow-sm" onClick={handleSwitchAndClaim} disabled={isClaiming}>
                            {isClaiming ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Claim Reward
                          </Button>
                          {countdownDisplay && (
                            <p className="text-slate-400 dark:text-slate-500 text-[10px] flex items-center justify-end gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" /> {countdownDisplay} left
                            </p>
                          )}
                        </>
                      ) : onChainStatus.hasReward ? (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
                          Claim window not open
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-0 text-xs">
                          Not eligible
                        </Badge>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {!loadingPayouts && totalWinners > 0 && (
          <div className="max-w-xl mx-auto bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-yellow-700 dark:text-yellow-400 text-xs font-black tracking-widest uppercase">Prize Pool Distributed</p>
            <p className="text-yellow-600 dark:text-yellow-500/80 text-sm mt-1">
              Top {totalWinners} winner{totalWinners > 1 ? "s" : ""} can self-claim via the contract
            </p>
          </div>
        )}

        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6">
            {top3[1] && (
              <div className="flex flex-col items-center gap-1.5 sm:gap-2 animate-in slide-in-from-bottom-8 duration-500 delay-200">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 border-4 border-slate-300 dark:border-slate-600 shadow-lg">
                  <AvatarImage src={top3[1].avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-700 font-bold text-xs sm:text-base">{top3[1].username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-slate-900 dark:text-white text-xs font-bold truncate max-w-[70px] sm:max-w-[100px]">{top3[1].username}</p>
                  <p className="text-slate-500 dark:text-slate-400 font-black text-xs sm:text-base">{top3[1].points} pts</p>
                </div>
                <div className="bg-slate-300 dark:bg-slate-700 w-16 sm:w-24 md:w-32 h-20 sm:h-28 md:h-36 rounded-t-xl flex items-center justify-center text-2xl sm:text-3xl md:text-4xl shadow-inner">🥈</div>
              </div>
            )}
            {top3[0] && (
              <div className="flex flex-col items-center gap-1.5 sm:gap-2 animate-in slide-in-from-bottom-8 duration-500">
                <div className="text-2xl sm:text-4xl md:text-5xl animate-bounce mb-1">👑</div>
                <Avatar className="h-16 w-16 sm:h-24 sm:w-24 md:h-28 md:w-28 border-4 border-yellow-400 dark:border-yellow-500 shadow-xl">
                  <AvatarImage src={top3[0].avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-700 font-bold text-base sm:text-xl">{top3[0].username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-slate-900 dark:text-white text-sm sm:text-base font-black truncate max-w-[90px] sm:max-w-[120px]">{top3[0].username}</p>
                  <p className="text-yellow-600 dark:text-yellow-400 font-black text-base sm:text-xl">{top3[0].points} pts</p>
                </div>
                <div className="bg-yellow-400 dark:bg-yellow-600 w-20 sm:w-32 md:w-40 h-28 sm:h-40 md:h-48 rounded-t-xl flex items-center justify-center text-3xl sm:text-4xl md:text-5xl shadow-inner">🥇</div>
              </div>
            )}
            {top3[2] && (
              <div className="flex flex-col items-center gap-1.5 sm:gap-2 animate-in slide-in-from-bottom-8 duration-500 delay-300">
                <Avatar className="h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 border-4 border-amber-600 dark:border-amber-700 shadow-lg">
                  <AvatarImage src={top3[2].avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-700 font-bold text-xs">{top3[2].username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-slate-900 dark:text-white text-xs font-bold truncate max-w-[65px] sm:max-w-[100px]">{top3[2].username}</p>
                  <p className="text-amber-700 dark:text-amber-600 font-black text-xs sm:text-base">{top3[2].points} pts</p>
                </div>
                <div className="bg-amber-600 dark:bg-amber-800 w-14 sm:w-22 md:w-28 h-16 sm:h-22 md:h-28 rounded-t-xl flex items-center justify-center text-2xl sm:text-3xl md:text-4xl shadow-inner">🥉</div>
              </div>
            )}
          </div>
        )}

        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Final Standings
            </span>
            {isCreator && <span className="text-indigo-500 font-mono text-xs">HOST VIEW</span>}
          </div>
          {loadingPayouts ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.map((entry: any) => {
                const isMe = entry.walletAddress.toLowerCase() === myWallet.toLowerCase();
                const payout = payoutByWallet[entry.walletAddress.toLowerCase()];
                const isWinner = !!payout;
                return (
                  <div key={entry.walletAddress} className={cn(
                    "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4",
                    isMe && "bg-indigo-50 dark:bg-indigo-950/20",
                    isWinner && "border-l-4 border-l-yellow-400 dark:border-l-yellow-500"
                  )}>
                    <div className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0",
                      entry.rank === 1 ? "bg-yellow-400 text-yellow-900" :
                      entry.rank === 2 ? "bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-white" :
                      entry.rank === 3 ? "bg-amber-600 text-white" :
                      "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : entry.rank}
                    </div>
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                      <AvatarImage src={entry.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-xs font-bold">{entry.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm truncate">{entry.username}</span>
                        {isMe && <Badge className="text-[9px] h-4 px-1 bg-indigo-600 text-white border-0 shrink-0">YOU</Badge>}
                        {isWinner && <Badge className="text-[9px] h-4 px-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300 border-0 shrink-0">🏆</Badge>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-slate-900 dark:text-white font-black text-sm sm:text-base">{entry.points} pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button className="h-12 font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-0" onClick={fetchResults} disabled={loadingResults}>
              {loadingResults ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : <><Trophy className="mr-2 h-4 w-4" />View Full Results</>}
            </Button>
            <Button variant="outline" className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" onClick={handleShareResults}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" onClick={() => router.push("/quiz")}>
              <Home className="mr-2 h-4 w-4" /> Back to Hub
            </Button>
            {isCreator && (
              <Button className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold border-0" onClick={() => router.push("/quiz/create-quiz")}>
                <Plus className="mr-2 h-4 w-4" /> New Quiz
              </Button>
            )}
            {isCreator && quizReward && (
              <Button
                className={cn(
                  "flex-1 h-12 font-bold border-0",
                  onChainStatus && onChainStatus.timeRemaining === 0
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                )}
                disabled={!claimWindowChecked || !claimWindowExpired}
                onClick={async () => {
                  if (!activeWallet || !quizReward) return;
                  try {
                    const requiredChainId = quizReward.chainId;
                    if (requiredChainId) {
                      const currentChainId = parseInt(activeWallet.chainId.split(":")[1] ?? "0");
                      if (currentChainId !== requiredChainId) {
                        toast.info("Switching to the correct network...");
                        await activeWallet.switchChain(requiredChainId);
                        await new Promise(r => setTimeout(r, 1500));
                      }
                    }
                    const privyProvider = await activeWallet.getEthereumProvider();
                    const provider = new BrowserProvider(privyProvider);
                    const signer = await provider.getSigner();
                    const contract = new Contract(
                      quizReward.contractAddress,
                      ["function withdraw(uint256 amount) external", "function token() view returns (address)", "function isEther() view returns (bool)"],
                      signer
                    );
                    toast.info("Processing withdrawal...");
                    // Get full balance and withdraw all
                    const { JsonRpcProvider: JRP } = await import("ethers");
                    const readProvider = new JRP(quizReward.chainId ? ({
                      42220: "https://forno.celo.org",
                      1135: "https://rpc.api.lisk.com",
                      42161: "https://arb1.arbitrum.io/rpc",
                      8453: "https://mainnet.base.org",
                      56: "https://bsc-dataseed.binance.org",
                    } as Record<number, string>)[quizReward.chainId] : "https://forno.celo.org");
                    const readContract = new Contract(
                      quizReward.contractAddress,
                      ["function customClaimAmounts(address) view returns (uint256)", "function token() view returns (address)"],
                      readProvider
                    );
                    const tokenAddr = quizReward.tokenAddress;
                    const erc20 = new Contract(tokenAddr, ["function balanceOf(address) view returns (uint256)"], readProvider);
                    const bal = await erc20.balanceOf(quizReward.contractAddress);
                    const tx = await contract.withdraw(bal);
                    await tx.wait();
                    toast.success("Withdrawal successful!");
                  } catch (e: any) {
                    toast.error(parseOnchainError(e));
                  }
                }}
              >
                {!onChainStatus || onChainStatus.timeRemaining > 0 ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    {onChainStatus && onChainStatus.timeRemaining > 0 ? `Withdraw (${countdownDisplay} left)` : "Withdraw (waiting...)"}
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" /> Withdraw Funds
                  </>
                )}
              </Button>
            )}
          </div>
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
  const [initialResults, setInitialResults] = useState<any>(null);
  const [loadingInitialResults, setLoadingInitialResults] = useState(false);
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
    chainId?: number;
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
  const grossDisplayAmount = quizReward
  ? (parseFloat(quizReward.poolAmount) * 100 / 95).toFixed(4)
  : "0";
  const [players, setPlayers] = useState<Player[]>([]);
  const [countdownVal, setCountdownVal] = useState(3);
  const [rewardsReady, setRewardsReady] = useState(false);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameOverSoundPlayed = useRef<boolean>(false);

  const [revealCorrectId, setRevealCorrectId] = useState<string | null>(null);
  const [personalResult, setPersonalResult] = useState<PersonalResult | null>(null);
  const [isReady, setIsReady] = useState(false);
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
const myWallet = useMemo(() => userWalletAddress?.toLowerCase() ?? "", [userWalletAddress]);
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
  fetch(`${API_BASE_URL}/api/quiz/${code}`)
    .then(r => r.json())
    .then(async d => {
      if (d.success) {
        setQuizMeta({
          title: d.quiz.title,
          totalQuestions: d.quiz.totalQuestions,
          creatorAddress: d.quiz.creatorAddress,
          coverImageUrl: d.quiz.coverImageUrl ?? null,
        });
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
            chainId: d.quiz.chainId ?? d.quiz.reward.chainId,
          });
          setIsFunded(d.quiz.reward.isFunded ?? false);
        }
        if (
          userWalletAddress &&
          d.quiz.creatorAddress?.toLowerCase() === userWalletAddress.toLowerCase()
        ) {
          setIsCreator(true);
          setIsSpectator(true);
          setHasJoined(true);
        }

        if (d.quiz.status === "finished") {
          // Fetch results immediately — don't wait for a button click
          setLoadingInitialResults(true);
          try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${code}/results`);
            const rd = await res.json();
            if (rd.success) setInitialResults(rd);
          } catch (e) {
            console.error("Failed to load results:", e);
          } finally {
            setLoadingInitialResults(false);
          }
          setPhase("game_over");
        } else {
          setPhase(d.quiz.status === "finished" ? "game_over" : "lobby");
        }
      } else {
        toast.error("Quiz not found");
        router.push("/quiz");
      }
    })
    .catch(() => toast.error("Failed to load quiz"));
}, [code, userWalletAddress, router]);

  const handleToggleReady = () => {
  const newState = !isReady;
  setIsReady(newState);
  wsRef.current?.send(JSON.stringify({
    type: "set_ready",
    walletAddress: userWalletAddress,
    isReady: newState,
  }));
};

const handleKickPlayer = (targetWallet: string) => {
  wsRef.current?.send(JSON.stringify({
    type: "kick_player",
    walletAddress: userWalletAddress,
    targetWallet,
  }));
};
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
     if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return; 
    const ws = new WebSocket(`${getWsBaseUrl()}/ws/quiz/${code}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0; // Reset attempts on successful connection
      ws.send(JSON.stringify({ type: "identify", walletAddress: userWalletAddress }));
    };

ws.onmessage = async (ev) => {
  console.log("[WS RAW]", ev.data);
  let msg: any;
  try {
    if (sessionKeyRef.current) {
      msg = await decryptMessage(sessionKeyRef.current, ev.data);
    } else {
      msg = JSON.parse(ev.data);
      if (msg.type === "session_key") {
        sessionKeyRef.current = await importKey(msg.key);
        console.log("[WS] Session key imported");
        return;
      }
    }
    console.log("[WS DECODED]", msg);
  } catch (e) {
    console.warn("Failed to parse/decrypt WS message", e);
    return;
  }

  switch (msg.type) {

    // ── 1. Initial state sync
    case "state_sync": {
  setQuizMeta(prev => prev ?? msg.quiz);
  setPlayers(msg.players || []);

  const amIPlaying = (msg.players || []).some((p: any) =>
    p.walletAddress.toLowerCase() === myWallet
  );
  if (amIPlaying) setIsReturningPlayer(true);

  if (msg.isCreator) {
    setHasJoined(true);
    setIsSpectator(true);
  }

  // If quiz is already active on connect, jump straight into the game.
  // The backend loop will broadcast a "question" message within seconds
  // which will populate currentQ and start the timer.
  if (msg.status === "active") {
    setHasJoined(true);
    setPhase("question"); // show loading state until "question" msg arrives
  }

  if (msg.status === "finished") setPhase("game_over");
  break;
}

    // ── 2. Player list update
    case "player_list": {
      setPlayers(msg.players || []);
      break;
    }

    // ── 3. Creator clicked START → game is about to begin
    case "game_starting": {
      toast.success(msg.message || "Quiz starting in 3 seconds...");
      setIsStarting(false);
      setPhase("countdown");
      setCountdownVal(3);
      break;
    }
  case "waiting_for_ready": {
    toast.warning(msg.message || "Some players are not ready yet!");
    break;
  }

case "kicked": {
  toast.error(msg.message || "You were removed from this quiz.");
  router.push("/quiz");
  break;
}
    // ── 4. Countdown tick (3 → 2 → 1)
    case "countdown": {
      setPhase("countdown");
      setCountdownVal(msg.value);
      break;
    }

    // ── 5. New question
    case "question": {
      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentQ({
        index: msg.index,
        total: msg.total,
        question: msg.question,
        options: msg.options,
        timeLimit: msg.timeLimit,
        startedAt: msg.startedAt,
      });
      setSelectedId(null);
      setHasSubmitted(false);
      setRevealCorrectId(null);
      setPersonalResult(null);
      setPhase("question");
      startTimer(msg.startedAt, msg.timeLimit);
      break;
    }

    // ── 6. Personal answer feedback
    case "answer_result": {
      setPersonalResult({
        isCorrect: msg.isCorrect,
        pointsEarned: msg.pointsEarned,
        streak: msg.streak,
      });
      break;
    }

    // ── 7. Question ended — reveal correct answer
    case "question_end": {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(0);
      setRevealCorrectId(msg.correctId);
      setPhase("reveal");
      break;
    }

    // ── 8. Leaderboard after each question
    case "leaderboard": {
      setLeaderboard(msg.entries || []);
      setIsLastQuestion(!!msg.isLast);
      const me = (msg.entries || []).find((e: any) =>
        e.walletAddress.toLowerCase() === myWallet
      );
      if (me) {
        setMyRankChange(me.rankChange);
        if (me.rankChange > 0) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
      }
      setPhase("leaderboard");
      break;
    }

    // ── 9. Game over
    case "game_over": {
      setLeaderboard(msg.finalLeaderboard || []);
      setPhase("game_over");
      const me = (msg.finalLeaderboard || []).find((e: any) =>
        e.walletAddress.toLowerCase() === myWallet
      );
      if (me?.rank === 1) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
      }
      break;
    }

    // ── 10. Rewards dispatched after game ends
    case "rewards_dispatched": {
      toast.success("🏆 Winners have been whitelisted! Claim window is now open.");
      setRewardsReady(true);
      break;
    }

    // ── 11. Server error message
    case "error": {
      console.error("[WS ERROR]", msg.message);
      toast.error(msg.message || "Something went wrong");
      setIsStarting(false);
      break;
    }

    default:
      console.log("[WS] Unhandled message type:", msg.type, msg);
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
  }, [code, userWalletAddress, startTimer]);

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
  console.log("[START] Creator clicked start", { code, userWalletAddress, wsState: wsRef.current?.readyState });
  setIsStarting(true);

  const msg = JSON.stringify({ type: "start_quiz", walletAddress: userWalletAddress });
  console.log("[START] Sending WS message:", msg);
  wsRef.current?.send(msg);
  console.log("[START] WS message sent, ws readyState:", wsRef.current?.readyState);

  fetch(`${API_BASE_URL}/api/quiz/${code}/on-chain-start`, { method: "POST" })
    .then(r => { console.log("[START] on-chain-start response status:", r.status); return r.json(); })
    .then(d => console.log("[START] on-chain-start response body:", d))
    .catch(err => console.warn("[START] on-chain-start fetch failed:", err.message))
    .finally(() => { console.log("[START] fetch done, clearing isStarting"); setIsStarting(false); });
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
  return (
    <QuizGameOver
      quizMeta={quizMeta}
      code={code}
      leaderboard={leaderboard}
      myWallet={myWallet}
      isCreator={isCreator}
      showConfetti={showConfetti}
      router={router}
      initialResults={initialResults}
      loadingInitialResults={loadingInitialResults}
      rewardsReady={rewardsReady}
      quizReward={quizReward}        // ← add this
      wallets={wallets}              // ← add this (needed for the provider)
    />
  );
}
// ── Pre-Join Screen ──
if (!hasJoined && !isCreator && phase === "lobby") return (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center px-4 py-8">
    <div className="w-full max-w-sm space-y-6 text-center">

      {/* Quiz code pill */}
      <div className="inline-flex flex-col items-center gap-1 bg-white/10 border border-white/20 rounded-2xl px-8 py-5 shadow-2xl backdrop-blur-sm">
        <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Quiz Code</p>
        <div className="text-5xl font-black tracking-[0.15em] text-white drop-shadow">{code}</div>
      </div>

      {/* Cover image */}
      {quizMeta?.coverImageUrl && (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-xl border border-white/10">
          <img
            src={quizMeta.coverImageUrl}
            alt={quizMeta.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Meta */}
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-white leading-tight">{quizMeta?.title}</h2>
        <p className="text-white/50 text-sm">{quizMeta?.totalQuestions} questions</p>
      </div>

      {/* Player count preview */}
      {players.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
          <Users className="h-4 w-4" />
          <span>{players.length} player{players.length !== 1 ? "s" : ""} already joined</span>
        </div>
      )}

      {/* Join / wallet connect */}
      <div className="space-y-3">
        {!username ? (
          <div className="space-y-2">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-300 text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Connect your profile to join
            </div>
            <WalletConnectButton />
          </div>
        ) : (
          <>
            {/* Player preview */}
            <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-4 py-3">
              <Avatar className="h-10 w-10 shrink-0 border-2 border-white/20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-indigo-600 text-white font-bold text-sm">
                  {username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white font-bold text-sm truncate">{username}</p>
                <p className="text-white/40 text-xs truncate">
                  {userWalletAddress?.slice(0, 6)}...{userWalletAddress?.slice(-4)}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
            </div>

            <Button
              className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-900/50 border-0 transition-all active:scale-95"
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining
                ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Joining...</>
                : <><Zap className="mr-2 h-5 w-5" />{isReturningPlayer ? "Rejoin Quiz" : "Join Quiz"}</>
              }
            </Button>
          </>
        )}
      </div>
    </div>
  </div>
);

// ── Lobby Waiting Room ──
if (phase === "lobby") {
  const creatorAddr = quizMeta?.creatorAddress?.toLowerCase() ?? "";
  const nonCreatorPlayers = players.filter(p => p.walletAddress.toLowerCase() !== creatorAddr);
  const readyCount = nonCreatorPlayers.filter(p => p.isReady).length;
  const totalCount = nonCreatorPlayers.length;
  const allReady = readyCount === totalCount && totalCount > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">
              <p className="text-slate-400 dark:text-white/30 text-[10px] font-bold uppercase tracking-widest leading-none">Code</p>
              <p className="text-xl sm:text-2xl font-black tracking-widest text-slate-900 dark:text-white leading-tight">{code}</p>
            </div>
            <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-white/10" />
            <div className="hidden sm:block min-w-0">
              <p className="text-slate-900 dark:text-white font-bold text-sm truncate">{quizMeta?.title}</p>
              <p className="text-slate-400 dark:text-white/30 text-xs">{quizMeta?.totalQuestions} questions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 border-0 text-xs px-2 py-1 hidden xs:flex items-center gap-1">
              <Users className="h-3 w-3" />{players.length}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-800 dark:border-blue-700 text-blue-900 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 bg-transparent h-8 px-2 sm:px-3"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/quiz/${code}`);
                toast.success("Link copied!");
              }}
            >
              <Share2 className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline text-xs">Share</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 sm:gap-6">

          {/* ── Left: Players ── */}
          <div className="space-y-4">

            {/* Players card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-white font-bold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Players
                  <span className="text-slate-400 dark:text-white/30 font-normal">({players.length})</span>
                </h3>
                {totalCount > 0 && (
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    allReady
                      ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                      : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  )}>
                    {allReady ? "All ready!" : `${readyCount}/${totalCount} ready`}
                  </span>
                )}
              </div>

              {players.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-slate-300 dark:text-white/20" />
                  </div>
                  <p className="text-slate-400 dark:text-white/40 text-sm font-medium">Waiting for players...</p>
                  <p className="text-slate-300 dark:text-white/20 text-xs mt-1">Share the code above</p>
                </div>
              ) : (
                <div className="p-3 sm:p-4 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2.5 max-h-[55vh] overflow-y-auto">
                  {players.map(p => {
                    const isMe = p.walletAddress.toLowerCase() === myWallet;
                    const isHost = p.walletAddress.toLowerCase() === creatorAddr;
                    const ready = p.isReady ?? false;
                    return (
                      <div
                        key={p.walletAddress}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 border transition-all",
                          isMe
                            ? "border-indigo-300 dark:border-indigo-400/40 bg-indigo-50 dark:bg-indigo-500/15"
                            : isHost
                              ? "border-yellow-300 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10"
                              : ready
                                ? "border-green-300 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10"
                                : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                        )}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.avatarUrl ?? undefined} />
                            <AvatarFallback className={cn(
                              "text-xs font-bold",
                              isHost ? "bg-yellow-200 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300" : "bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-white"
                            )}>
                              {p.username?.slice(0, 2).toUpperCase() ?? "??"}
                            </AvatarFallback>
                          </Avatar>
                          {/* Ready indicator dot */}
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 transition-colors",
                            isHost
                              ? "bg-yellow-400"
                              : ready
                                ? "bg-green-500"
                                : "bg-slate-300 dark:bg-slate-600"
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-slate-800 dark:text-white text-xs font-bold truncate leading-tight">
                              {p.username}
                            </span>
                            {isMe && (
                              <span className="text-[9px] bg-indigo-500 text-white px-1 py-0.5 rounded font-bold shrink-0 leading-none">YOU</span>
                            )}
                            {isHost && (
                              <span className="text-[9px] bg-yellow-400 text-yellow-900 px-1 py-0.5 rounded font-bold shrink-0 leading-none">HOST</span>
                            )}
                          </div>
                          <p className={cn(
                            "text-[10px] font-semibold mt-0.5 leading-none",
                            isHost
                              ? "text-yellow-600 dark:text-yellow-400"
                              : ready
                                ? "text-green-600 dark:text-green-400"
                                : "text-slate-400 dark:text-white/25"
                          )}>
                            {isHost ? "Host" : ready ? "Ready ✓" : "Not ready"}
                          </p>
                        </div>

                        {/* Kick button */}
                        {isCreator && !isMe && !isHost && (
                          <button
                            onClick={() => handleKickPlayer(p.walletAddress)}
                            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-300 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                            title={`Kick ${p.username}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ready button for non-creator players */}
              {!isCreator && hasJoined && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 mt-1">
                  <button
                    onClick={handleToggleReady}
                    className={cn(
                      "w-full h-11 sm:h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95",
                      isReady
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20"
                        : "bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white border border-slate-200 dark:border-white/15"
                    )}
                  >
                    {isReady ? (
                      <><Check className="h-4 w-4 stroke-[3px]" /> Ready! (click to unready)</>
                    ) : (
                      <><Zap className="h-4 w-4" /> Click to Ready Up</>
                    )}
                  </button>
                </div>
              )}

              {/* Waiting message for player after ready */}
              {!isCreator && hasJoined && isReady && (
                <div className="px-4 pb-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-white/30 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Waiting for host to start the quiz...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Host Panel ── */}
          {isCreator && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden self-start">

              {/* Header */}
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-yellow-300" />
                </div>
                <div>
                  <p className="text-white font-black text-base leading-tight">Host Controls</p>
                  <p className="text-indigo-200 text-xs">You are the quiz host</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">

                {/* Ready status summary */}
                {totalCount > 0 && (
                  <div className={cn(
                    "rounded-xl px-4 py-3 flex items-center gap-3",
                    allReady
                      ? "bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20"
                      : "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      allReady ? "bg-green-100 dark:bg-green-500/20" : "bg-amber-100 dark:bg-amber-500/20"
                    )}>
                      {allReady
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        : <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold leading-tight",
                        allReady ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
                      )}>
                        {allReady ? "All players are ready!" : `${readyCount} of ${totalCount} ready`}
                      </p>
                      {!allReady && totalCount > 0 && (
                        <p className="text-amber-600 dark:text-amber-500 text-xs mt-0.5 truncate">
                          Waiting: {nonCreatorPlayers.filter(p => !p.isReady).map(p => p.username).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {totalCount === 0 && (
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-center">
                    <p className="text-slate-400 dark:text-white/30 text-sm">No players yet</p>
                    <p className="text-slate-300 dark:text-white/15 text-xs mt-0.5">Share the code to invite players</p>
                  </div>
                )}

                {/* Funding status */}
                {quizReward ? (
                  isFunded ? (
                    <div className="flex items-start gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-green-700 dark:text-green-400 font-bold text-sm">Reward Pool Funded ✓</p>
                        <p className="text-green-600 dark:text-green-500 text-xs mt-0.5">
                          {contractBalance} {quizReward.tokenSymbol} locked
                        </p>
                      </div>
                      {fundTxHash && (
                        <a href={`https://celoscan.io/tx/${fundTxHash}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <ExternalLink className="h-4 w-4 text-green-500" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-700 dark:text-amber-400 font-bold text-sm">Reward Pool Required</p>
                          <p className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">
                            Fund to unlock the Start button
                          </p>
                          {isFundedCheckLoading && (
                            <p className="text-amber-400 text-[10px] mt-1 animate-pulse">Checking balance…</p>
                          )}
                        </div>
                      </div>
                      <Button
                        className="w-full h-11 font-bold bg-blue-700 hover:bg-blue-600 text-white border-0 text-sm"
                        onClick={handleFundReward}
                        disabled={isFunding || isFundedCheckLoading}
                      >
                        {isFunding
                          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming...</>
                          : isFundedCheckLoading
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking...</>
                            : <><Wallet className="mr-2 h-4 w-4" />Fund {grossDisplayAmount} {quizReward.tokenSymbol}</>
                        }
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <p className="text-green-700 dark:text-green-400 text-sm font-medium">Free quiz — no reward pool needed</p>
                  </div>
                )}

                {/* Start button */}
                {(isFunded || !quizReward) && (
                  <Button
                    className="w-full h-14 text-base font-black text-white border-0 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-900/30 disabled:opacity-60 disabled:scale-100"
                    style={{ background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)" }}
                    onClick={handleStartQuiz}
                    disabled={isStarting}
                  >
                    {isStarting
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Starting…</>
                      : totalCount === 0
                        ? <><Play className="mr-2 h-5 w-5 fill-current" />START QUIZ</>
                        : allReady
                          ? <><Play className="mr-2 h-5 w-5 fill-current" />START QUIZ ({players.length})</>
                          : <><Play className="mr-2 h-5 w-5 fill-current" />START ANYWAY ({readyCount}/{totalCount} ready)</>
                    }
                  </Button>
                )}

                {fundError && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium break-words">{fundError}</p>
                  </div>
                )}

                {quizReward && (
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-400 dark:text-white/20 shrink-0">Contract:</p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-white/30 truncate flex-1">
                      {quizReward.contractAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
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
        <div className="w-full max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 shrink-0 overflow-y-auto pb-6 md:pb-10" style={{ maxHeight: "55vh" }}>
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
                  "relative w-full flex items-center justify-between px-6 py-5 sm:py-6 md:py-8 rounded-2xl last:mb-4",
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