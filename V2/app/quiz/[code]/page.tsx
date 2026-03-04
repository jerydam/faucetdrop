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
  ArrowUp, ArrowDown, Minus, Home, Share2, Plus,
} from "lucide-react";
import { useWallets } from "@privy-io/react-auth";
import { BrowserProvider, Contract } from "ethers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE_URL = "http://127.0.0.1:8000";

// ── Safe WS URL — evaluated at runtime, not module level (avoids SSR crash) ──
function getWsBaseUrl(): string {
  if (typeof window === "undefined") return "ws://127.0.0.1:8000";
  return window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "ws://127.0.0.1:8000"
    : "wss://faucetdrop-backend.onrender.com";
}

// ── Types ──────────────────────────────────────────────────
type GamePhase =
  | "loading"
  | "lobby"
  | "countdown"
  | "question"
  | "reveal"
  | "leaderboard"
  | "game_over";

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
  correctId: string;
  streak: number;
}

// ── Option appearance ────────────────────────────────────────
const OPTION_STYLES: Record<string, { bg: string; hover: string; border: string; shape: string }> = {
  A: { bg: "bg-red-500",    hover: "hover:bg-red-400",    border: "border-red-300",    shape: "▲" },
  B: { bg: "bg-blue-500",   hover: "hover:bg-blue-400",   border: "border-blue-300",   shape: "◆" },
  C: { bg: "bg-yellow-500", hover: "hover:bg-yellow-400", border: "border-yellow-300", shape: "●" },
  D: { bg: "bg-green-500",  hover: "hover:bg-green-400",  border: "border-green-300",  shape: "■" },
};

// ── Confetti ─────────────────────────────────────────────────
const CONFETTI_COLORS = ["#FFD700","#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98FB98"];

function Confetti({ active }: { active: boolean }) {
  const particles = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 360,
    })), []
  );
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            backgroundColor: p.color,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Rank badge ───────────────────────────────────────────────
function RankBadge({ change }: { change: number }) {
  if (change > 0) return (
    <span className="flex items-center gap-0.5 text-green-400 font-bold text-sm animate-bounce">
      <ArrowUp className="h-3 w-3" /> {change}
    </span>
  );
  if (change < 0) return (
    <span className="flex items-center gap-0.5 text-red-400 font-bold text-sm">
      <ArrowDown className="h-3 w-3" /> {Math.abs(change)}
    </span>
  );
  return <Minus className="h-3 w-3 text-slate-400" />;
}

// ── Circular timer ───────────────────────────────────────────
function CircleTimer({ seconds, total }: { seconds: number; total: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const ratio = Math.max(0, seconds / total);
  const dash = ratio * circ;
  const color = ratio > 0.5 ? "#22c55e" : ratio > 0.25 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s linear, stroke 0.3s" }}
        />
      </svg>
      <span className="absolute text-2xl font-black text-white tabular-nums" style={{ color }}>
        {Math.ceil(seconds)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  QuizGameOver
// ─────────────────────────────────────────────────────────────
interface PayoutRecord {
  wallet_address: string;
  username: string;
  rank: number;
  points: number;
  amount: number;
  token_symbol: string;
  status: string;
  tx_hash: string | null;
}

interface PayoutsData {
  success: boolean;
  faucetAddress: string;
  chainId: number;
  payouts: PayoutRecord[];
}

function QuizGameOver({
  quizMeta, code, leaderboard, myWallet, isCreator, showConfetti, router,
}: {
  quizMeta: any;
  code: string;
  leaderboard: Player[];
  myWallet: string;
  isCreator: boolean;
  showConfetti: boolean;
  router: any;
}) {
  const [payoutsData, setPayoutsData] = useState<PayoutsData | null>(null);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedTx, setClaimedTx] = useState<string | null>(null);
  const { wallets } = useWallets();
  const activeWallet = wallets?.[0];

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/quiz/${code}/payouts`);
        const d = await r.json();
        if (d.success) setPayoutsData(d);
      } catch (e) {
        console.error("Failed to load payouts", e);
      } finally {
        setLoadingPayouts(false);
      }
    };
    load();
  }, [code]);

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

  const handleClaim = async () => {
    if (!activeWallet || !payoutsData?.faucetAddress) {
      toast.error("Wallet not connected or contract address missing");
      return;
    }
    setIsClaiming(true);
    try {
      const privyProvider = await activeWallet.getEthereumProvider();
      const ethersProvider = new BrowserProvider(privyProvider);
      const signer = await ethersProvider.getSigner();
      const CLAIM_ABI = ["function claim() external"];
      const contract = new Contract(payoutsData.faucetAddress, CLAIM_ABI, signer);

      toast.info("Confirm the claim transaction in your wallet...");
      const tx = await contract.claim();
      toast.info("Transaction sent — waiting for confirmation...");
      await tx.wait();

      setClaimedTx(tx.hash);
      toast.success(`Reward claimed! Tx: ${tx.hash.slice(0, 10)}...`);

      await fetch(`${API_BASE_URL}/api/quiz/${code}/claim-ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: myWallet, txHash: tx.hash }),
      }).catch(() => {});
    } catch (e: any) {
      toast.error(e.reason || e.shortMessage || e.message || "Claim failed");
    } finally {
      setIsClaiming(false);
    }
  };

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 flex flex-col overflow-auto">
      <Confetti active={showConfetti} />
      <div className="max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-16">

        {/* Title */}
        <div className="text-center pt-4 space-y-1">
          <div className="text-5xl">🏆</div>
          <h1 className="text-3xl font-black text-white">Quiz Complete!</h1>
          <p className="text-white/40 text-sm">{quizMeta?.title}</p>
        </div>

        {/* Prize pool banner */}
        {!loadingPayouts && totalWinners > 0 && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-5 text-center space-y-1">
            <p className="text-yellow-400 text-xs font-bold tracking-widest uppercase">Prize Pool</p>
            <p className="text-white/50 text-xs">
              Distributed to top {totalWinners} winner{totalWinners > 1 ? "s" : ""} • Self-claim on faucet contract
            </p>
          </div>
        )}

        {/* Podium */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-3">
            {top3[1] && (
              <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                <Avatar className="h-12 w-12 border-2 border-slate-400">
                  <AvatarImage src={top3[1].avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-700 text-white font-bold">{top3[1].username?.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-white text-xs font-bold truncate max-w-[80px]">{top3[1].username}</p>
                  <p className="text-slate-400 font-black">{top3[1].points} pts</p>
                </div>
                <div className="bg-slate-500 w-20 h-24 rounded-t-xl flex items-center justify-center text-3xl">🥈</div>
              </div>
            )}
            {top3[0] && (
              <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-2xl animate-bounce">👑</div>
                <Avatar className="h-16 w-16 border-4 border-yellow-500">
                  <AvatarImage src={top3[0].avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-700 text-white font-bold text-lg">{top3[0].username?.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-white text-sm font-black truncate max-w-[100px]">{top3[0].username}</p>
                  <p className="text-yellow-400 font-black text-lg">{top3[0].points} pts</p>
                </div>
                <div className="bg-yellow-500 w-24 h-32 rounded-t-xl flex items-center justify-center text-3xl">🥇</div>
              </div>
            )}
            {top3[2] && (
              <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                <Avatar className="h-12 w-12 border-2 border-amber-700">
                  <AvatarImage src={top3[2].avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-700 text-white font-bold">{top3[2].username?.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-white text-xs font-bold truncate max-w-[80px]">{top3[2].username}</p>
                  <p className="text-amber-700 font-black">{top3[2].points} pts</p>
                </div>
                <div className="bg-amber-800 w-20 h-20 rounded-t-xl flex items-center justify-center text-3xl">🥉</div>
              </div>
            )}
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-white/5 backdrop-blur rounded-2xl overflow-hidden border border-white/10">
          <div className="px-4 py-3 border-b border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest flex items-center justify-between">
            Final Results
            {isCreator && <span className="text-emerald-400 text-[10px] font-mono">HOST VIEW</span>}
          </div>
          {loadingPayouts ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {leaderboard.map((entry) => {
                const isMe = entry.walletAddress.toLowerCase() === myWallet.toLowerCase();
                const payout = payoutByWallet[entry.walletAddress.toLowerCase()];
                const isWinner = !!payout;
                const alreadyClaimed = isMe ? hasAlreadyClaimed : payout?.status === "claimed";

                return (
                  <div
                    key={entry.walletAddress}
                    className={cn(
                      "flex items-center gap-3 px-4 py-4 transition-all",
                      isMe && "bg-primary/10",
                      isWinner && "border-l-4 border-yellow-500"
                    )}
                  >
                    <span className="text-white/40 text-sm w-5 text-center font-bold shrink-0">{entry.rank}</span>
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={entry.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-slate-700 text-white text-xs font-bold">
                        {entry.username?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-medium text-sm truncate">{entry.username}</span>
                        {isMe && <Badge className="text-[9px] h-4 px-1 bg-primary border-0 shrink-0">You</Badge>}
                        {isWinner && <Badge className="text-[9px] h-4 px-1 bg-yellow-500 text-black border-0 shrink-0">🏆 Winner</Badge>}
                      </div>
                      {isWinner && payout.amount > 0 && (
                        <p className="text-yellow-400 text-xs font-bold mt-0.5">
                          {payout.amount} {payout.token_symbol}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-white font-black">{entry.points} pts</div>
                      {isMe && isWinner && !isCreator && (
                        alreadyClaimed ? (
                          <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px]">✓ Claimed</Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs font-black bg-yellow-500 hover:bg-yellow-400 text-black"
                            onClick={handleClaim}
                            disabled={isClaiming}
                          >
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

        {/* My result card */}
        {(() => {
          const me = leaderboard.find(e => e.walletAddress.toLowerCase() === myWallet.toLowerCase());
          if (!me) return null;
          return (
            <div className={cn(
              "rounded-2xl p-5 text-center space-y-1 border-2",
              me.rank === 1 ? "bg-yellow-500/20 border-yellow-500" : "bg-white/5 border-white/20"
            )}>
              <p className="text-white/60 text-xs uppercase tracking-widest">Your Result</p>
              <p className="text-4xl font-black text-white">#{me.rank}</p>
              <p className="text-2xl font-bold text-primary">{me.points} pts</p>
              {myPayout && (
                <p className="text-yellow-400 font-bold text-sm">
                  🎉 You earned {myPayout.amount} {myPayout.token_symbol}!
                </p>
              )}
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-white/20 text-white" onClick={() => router.push("/quiz")}>
            <Home className="mr-2 h-4 w-4" /> Home
          </Button>
          {isCreator && (
            <Button className="flex-1" onClick={() => router.push("/quiz/create-quiz")}>
              <Plus className="mr-2 h-4 w-4" /> New Quiz
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════
export default function QuizCodePage() {
  const params = useParams();
  const router = useRouter();
  const { address: userWalletAddress } = useWallet();
  const code = (params.code as string || "").toUpperCase();

  const [phase, setPhase] = useState<GamePhase>("loading");
  const [quizMeta, setQuizMeta] = useState<{ title: string; totalQuestions: number; creatorAddress: string } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [countdownVal, setCountdownVal] = useState(3);

  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const wsRef = useRef<WebSocket | null>(null);
  const myWallet = userWalletAddress?.toLowerCase() ?? "";

  // ── Load profile ─────────────────────────────────────────
  useEffect(() => {
    if (!userWalletAddress) return;
    fetch(`${API_BASE_URL}/api/profile/${userWalletAddress}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.profile) {
          setUsername(d.profile.username || "");
          setAvatarUrl(d.profile.avatar_url || "");
        }
      })
      .catch(() => {});
  }, [userWalletAddress]);

  // ── Load quiz meta ────────────────────────────────────────
  useEffect(() => {
    if (!code) return;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/quiz/${code}`);
        const d = await r.json();
        if (d.success) {
          setQuizMeta({
            title: d.quiz.title,
            totalQuestions: d.quiz.totalQuestions,
            creatorAddress: d.quiz.creatorAddress,
          });
          if (userWalletAddress && d.quiz.creatorAddress?.toLowerCase() === userWalletAddress.toLowerCase()) {
            setIsCreator(true);
            setIsSpectator(true);
            setHasJoined(true); // creator skips join flow
          }
          setPhase(d.quiz.status === "finished" ? "game_over" : "lobby");
        } else {
          toast.error("Quiz not found");
          router.push("/quiz");
        }
      } catch {
        toast.error("Failed to load quiz");
      }
    };
    load();
  }, [code, userWalletAddress]);

  // ── Auto-rejoin for non-creator players ──────────────────
  // Only fires when quiz is in lobby (waiting), never for finished quizzes
  useEffect(() => {
    if (isCreator || !userWalletAddress || !username.trim() || hasJoined || phase !== "lobby") return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/quiz/${code}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: userWalletAddress, username, avatarUrl: avatarUrl || null }),
        });
        const data = await res.json();
        if (data.success) {
          setHasJoined(true);
          toast.success("Welcome back!", { duration: 1200 });
        } else if (data.finished) {
          // Quiz ended while we were loading — jump to results
          setPhase("game_over");
        } else if (data.active) {
          // Quiz in progress — still connect WS to spectate
          setHasJoined(true);
          setIsSpectator(true);
        }
      } catch (err) {
        console.error("Auto-rejoin failed", err);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [isCreator, userWalletAddress, username, hasJoined, phase, code, avatarUrl]);

  // ── Timer ─────────────────────────────────────────────────
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

  // ── WebSocket ─────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (!code || !userWalletAddress) return;
    const ws = new WebSocket(`${getWsBaseUrl()}/ws/quiz/${code}`);
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: "identify", walletAddress: userWalletAddress }));

    ws.onmessage = (ev) => {
      let msg: any;
      try { msg = JSON.parse(ev.data); } catch { return; }

      switch (msg.type) {
        case "state_sync": {
          setQuizMeta(prev => prev ?? msg.quiz);
          setPlayers(msg.players || []);
          if (msg.status === "finished") setPhase("game_over");
          break;
        }
        case "player_list": {
          setPlayers(msg.players || []);
          break;
        }
        case "countdown": {
          setPhase("countdown");
          setCountdownVal(msg.value);
          break;
        }
        case "question": {
          if (timerRef.current) clearInterval(timerRef.current);
          setCurrentQ({
            index: msg.index, total: msg.total,
            question: msg.question, options: msg.options,
            timeLimit: msg.timeLimit, startedAt: msg.startedAt,
          });
          setSelectedId(null);
          setHasSubmitted(false);
          setRevealCorrectId(null);
          setPersonalResult(null);
          setPhase("question");
          startTimer(msg.startedAt, msg.timeLimit);
          break;
        }
        case "answer_result": {
          setPersonalResult({
            isCorrect: msg.isCorrect, pointsEarned: msg.pointsEarned,
            correctId: msg.correctId, streak: msg.streak,
          });
          break;
        }
        case "question_end": {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeLeft(0);
          setRevealCorrectId(msg.correctId);
          setPhase("reveal");
          break;
        }
        case "leaderboard": {
          const entries: Player[] = msg.entries || [];
          setLeaderboard(entries);
          setIsLastQuestion(!!msg.isLast);
          const me = entries.find(e => e.walletAddress.toLowerCase() === myWallet);
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
          const me = (msg.finalLeaderboard || []).find((e: any) => e.walletAddress.toLowerCase() === myWallet);
          if (me?.rank === 1) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 6000); }
          break;
        }
      }
    };

    ws.onclose = () => {
      setTimeout(() => { if (wsRef.current?.readyState !== WebSocket.OPEN) connectWS(); }, 2000);
    };
  }, [code, userWalletAddress, startTimer, myWallet]);

  useEffect(() => {
    if (hasJoined && userWalletAddress) connectWS();
    return () => {
      wsRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasJoined, connectWS]);

  // ── Join quiz ─────────────────────────────────────────────
  const handleJoin = async () => {
    if (!userWalletAddress || !username) { toast.error("Set a username in your profile"); return; }
    setIsJoining(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/quiz/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: userWalletAddress, username, avatarUrl }),
      });
      const d = await r.json();
      if (d.success) {
        setHasJoined(true);
        toast.success("Joined quiz!");
      } else if (d.finished) {
        setPhase("game_over");
        toast.info("This quiz has already ended. Showing results.");
      } else if (d.active) {
        // Join as spectator mid-game
        setHasJoined(true);
        setIsSpectator(true);
        toast.info("Quiz in progress — joining as spectator");
      } else {
        toast.error(d.message || d.detail || "Failed to join");
      }
    } catch {
      toast.error("Failed to join");
    } finally {
      setIsJoining(false);
    }
  };

  // ── Submit answer ─────────────────────────────────────────
  const handleSelectAnswer = (optId: string) => {
    if (!currentQ || timeLeft <= 0 || isSpectator) return;
    const timeTaken = (currentQ.timeLimit - timeLeft);
    wsRef.current?.send(JSON.stringify({
      type: hasSubmitted ? "change_answer" : "submit_answer",
      questionIndex: currentQ.index,
      answerId: optId,
      timeTaken,
    }));
    if (!hasSubmitted) setHasSubmitted(true);
    setSelectedId(optId);
  };

  // ── Start quiz ────────────────────────────────────────────
  const handleStartQuiz = () => {
    if (!userWalletAddress) return;
    setIsStarting(true);
    wsRef.current?.send(JSON.stringify({ type: "start_quiz", walletAddress: userWalletAddress }));
  };

  const myEntry = leaderboard.find(e => e.walletAddress.toLowerCase() === myWallet);

  // ══════════════════════════════════════════════════════════
  //  Render
  // ══════════════════════════════════════════════════════════

  if (phase === "loading") {
    return (
      <div className="flex flex-col min-h-screen">
        <Header pageTitle="Quiz" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
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
      />
    );
  }

  // Pre-join screen (non-creator, not yet joined, lobby)
  if (!hasJoined && !isCreator && phase === "lobby") {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <Header pageTitle={quizMeta?.title ?? "Quiz Lobby"} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 space-y-3">
              <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Quiz Code</p>
              <div className="text-6xl font-black tracking-widest text-white">{code}</div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">{quizMeta?.title}</h2>
              <p className="text-white/50 text-sm">{quizMeta?.totalQuestions} questions</p>
            </div>
            <Button
              className="w-full h-14 text-lg font-black bg-primary hover:bg-primary/90 rounded-2xl shadow-lg shadow-primary/30"
              onClick={handleJoin}
              disabled={isJoining || !username}
            >
              {isJoining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
              {!username ? "Set Username First" : "Join Quiz"}
            </Button>
            {!username && (
              <p className="text-amber-400 text-xs">Go to your profile to set a username before joining</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Lobby waiting room
  if (phase === "lobby") {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <Header pageTitle={quizMeta?.title ?? "Quiz Lobby"} />
        <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-20">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Quiz Code</p>
              <div className="text-4xl font-black tracking-widest text-white">{code}</div>
            </div>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/quiz/${code}`); toast.success("Link copied!"); }}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share Link
            </Button>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Players Joined
              </h3>
              <Badge className="bg-primary/20 text-primary border-primary/30">{players.length}</Badge>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {players.length === 0 ? (
                <p className="col-span-3 text-center text-white/30 py-6 text-sm">Waiting for players...</p>
              ) : players.map((p) => (
                <div key={p.walletAddress} className={cn(
                  "flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5",
                  p.walletAddress.toLowerCase() === myWallet && "bg-primary/20 border border-primary/30"
                )}>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={p.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs font-bold bg-slate-700 text-white">
                      {p.username?.slice(0, 2).toUpperCase() ?? "??"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white text-xs font-medium truncate">{p.username}</span>
                  {p.walletAddress.toLowerCase() === myWallet && (
                    <Badge className="text-[8px] h-4 px-1 bg-primary border-0 ml-auto shrink-0">You</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isCreator && (
            <div className="bg-gradient-to-br from-emerald-900 to-teal-950 border border-emerald-500/50 rounded-2xl p-6 text-center">
              <Crown className="h-8 w-8 mx-auto mb-3 text-emerald-400" />
              <p className="text-white font-black text-2xl">You are the Host</p>
              <p className="text-emerald-300 text-sm mt-1">Spectating Mode • Players compete below</p>
              <Button
                className="mt-6 w-full h-14 text-lg font-black bg-gradient-to-r from-emerald-500 to-teal-600"
                onClick={handleStartQuiz}
                disabled={isStarting}
              >
                {isStarting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
                START QUIZ ({players.length} players)
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Countdown
  if (phase === "countdown") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/50 text-lg uppercase tracking-widest font-bold">Get ready!</p>
          <div
            key={countdownVal}
            className="text-[12rem] font-black text-white leading-none"
            style={{ animation: "zoomFade 0.9s ease-out forwards" }}
          >
            {countdownVal}
          </div>
        </div>
        <style>{`
          @keyframes zoomFade {
            0%   { transform: scale(1.5); opacity: 0; }
            30%  { transform: scale(1);   opacity: 1; }
            80%  { transform: scale(0.9); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // Question / Reveal
  if ((phase === "question" || phase === "reveal") && currentQ) {
    const isReveal = phase === "reveal";
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col overflow-hidden">
        {isSpectator && (
          <div className="bg-amber-500/10 border border-amber-500 text-amber-400 py-3 px-4 text-center font-medium">
            👁️ You are spectating this round
          </div>
        )}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3 bg-black/30 border-b border-white/10">
          <div className="text-white/60 text-sm font-bold">Q{currentQ.index + 1} / {currentQ.total}</div>
          <div className="text-white font-black text-base sm:text-lg truncate max-w-[50%] text-center">{quizMeta?.title}</div>
          <div className="flex items-center gap-2">
            {myEntry && (
              <Badge className="bg-white/10 text-white border-0 font-bold">
                #{myEntry.rank} · {myEntry.points} pts
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 max-w-3xl mx-auto w-full">
          <div className="w-full space-y-4 pt-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 bg-white/10 backdrop-blur rounded-2xl px-6 py-5 text-center">
                <p className="text-white text-xl sm:text-2xl font-black leading-snug">{currentQ.question}</p>
              </div>
              {!isReveal && (
                <div className="shrink-0">
                  <CircleTimer seconds={timeLeft} total={currentQ.timeLimit} />
                </div>
              )}
            </div>

            {isReveal && personalResult && (
              <div className={cn(
                "rounded-2xl px-6 py-4 text-center font-black text-xl border-2 animate-in zoom-in-95 duration-300",
                personalResult.isCorrect
                  ? "bg-green-500/20 border-green-500 text-green-400"
                  : "bg-red-500/20 border-red-500 text-red-400"
              )}>
                {personalResult.isCorrect ? (
                  <span className="flex items-center justify-center gap-3">
                    <Check className="h-7 w-7" /> Correct! +{personalResult.pointsEarned} pts
                    {personalResult.streak > 1 && (
                      <Badge className="bg-orange-500 border-0 text-sm">🔥 {personalResult.streak} streak</Badge>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <X className="h-7 w-7" /> Incorrect
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 w-full pb-2">
            {currentQ.options.map(opt => {
              const style = OPTION_STYLES[opt.id];
              const isSelected = selectedId === opt.id;
              const isCorrect = isReveal && opt.id === revealCorrectId;
              const isWrong   = isReveal && isSelected && opt.id !== revealCorrectId;

              return (
                <button
                  key={opt.id}
                  disabled={isSpectator || isReveal || timeLeft <= 0}
                  onClick={() => handleSelectAnswer(opt.id)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl px-4 py-5 sm:py-6 text-white font-bold text-base sm:text-lg text-left transition-all duration-200 select-none border-2 border-transparent",
                    style.bg,
                    !isReveal && !isSelected && style.hover,
                    isSelected && !isReveal && "ring-4 ring-white scale-[0.97]",
                    isCorrect && "ring-4 ring-white scale-[1.02] brightness-110",
                    isWrong && "opacity-50 scale-95",
                    isReveal && !isCorrect && !isWrong && "opacity-40",
                  )}
                >
                  <span className="text-2xl shrink-0 opacity-80">{style.shape}</span>
                  <span className="leading-snug">{opt.text}</span>
                  {isCorrect && <div className="ml-auto shrink-0 bg-white/20 rounded-full p-1"><Check className="h-5 w-5" /></div>}
                  {isWrong   && <div className="ml-auto shrink-0 bg-white/20 rounded-full p-1"><X className="h-5 w-5" /></div>}
                  {isSelected && !isReveal && (
                    <div className="absolute top-2 right-2 bg-white/30 rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-white/40 text-xs text-center pb-1">
            {isReveal ? "Correct answer revealed — leaderboard coming up..." :
             hasSubmitted ? `Answer locked in: ${currentQ.options.find(o => o.id === selectedId)?.text} · tap to change` :
             timeLeft > 0 ? "Tap an answer to respond" : "Time's up!"}
          </div>
        </div>
      </div>
    );
  }

  // Leaderboard
  if (phase === "leaderboard") {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col overflow-hidden">
        <Confetti active={showConfetti} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-black text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" /> Leaderboard
          </h2>
          <Badge className="bg-white/10 text-white border-0">
            {isLastQuestion ? "Final Results!" : `Q${(currentQ?.index ?? 0) + 1}/${currentQ?.total ?? "?"} done`}
          </Badge>
        </div>

        {myRankChange !== 0 && (
          <div className={cn(
            "mx-auto mt-4 px-6 py-3 rounded-2xl font-black text-lg flex items-center gap-3 animate-in zoom-in-95 duration-500",
            myRankChange > 0
              ? "bg-green-500/20 text-green-400 border border-green-500/50"
              : "bg-red-500/20 text-red-400 border border-red-500/50"
          )}>
            {myRankChange > 0 ? (
              <><ArrowUp className="h-6 w-6" /> You moved up {myRankChange} {myRankChange === 1 ? "place" : "places"}! 🎉</>
            ) : (
              <><ArrowDown className="h-6 w-6" /> Down {Math.abs(myRankChange)} {Math.abs(myRankChange) === 1 ? "place" : "places"}</>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 max-w-xl mx-auto w-full">
          {leaderboard.slice(0, 10).map((entry, i) => {
            const isMe = entry.walletAddress.toLowerCase() === myWallet;
            return (
              <div
                key={entry.walletAddress}
                className={cn(
                  "flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-500 animate-in slide-in-from-bottom-2",
                  isMe ? "bg-primary/20 border-2 border-primary/50" : "bg-white/5 border border-white/10",
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0",
                  entry.rank === 1 ? "bg-yellow-500 text-black" :
                  entry.rank === 2 ? "bg-slate-400 text-black" :
                  entry.rank === 3 ? "bg-amber-700 text-white" :
                  "bg-white/10 text-white"
                )}>
                  {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : entry.rank}
                </div>
                <Avatar className="h-9 w-9 shrink-0 border border-white/20">
                  <AvatarImage src={entry.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-slate-700 text-white text-xs font-bold">
                    {entry.username?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm truncate">{entry.username}</span>
                    {isMe && <Badge className="text-[9px] h-4 px-1 bg-primary border-0">You</Badge>}
                    {entry.streak > 1 && <Badge className="text-[9px] h-4 px-1 bg-orange-500 border-0">🔥{entry.streak}</Badge>}
                  </div>
                  {entry.pointsThisRound > 0 && (
                    <span className="text-green-400 text-xs font-bold">+{entry.pointsThisRound}</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white font-black text-lg">{entry.points}</div>
                  <div className="flex items-center justify-end">
                    <RankBadge change={entry.rankChange} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center text-white/30 text-sm pb-4 animate-pulse">
          {isLastQuestion ? "Final results — Quiz over!" : "Next question coming up..."}
        </div>
      </div>
    );
  }

  return null;
}