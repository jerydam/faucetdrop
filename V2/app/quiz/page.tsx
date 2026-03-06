"use client";
/**
 * /app/quiz/page.tsx  –  FaucetDrops Quiz Hub
 * Lists all quizzes. Users can search, filter by status, join by code, or create.
 * Aesthetic: dark arcade / neon-grid – bold, game-lobby energy.
 */
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Plus, Zap, Trophy, Users, Clock, ArrowRight,
  Loader2, Sparkles, Gamepad2, Lock, Play, CheckCircle2,
  Star, Hash, RefreshCw, BookOpen, ChevronRight, Coins,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE_URL = "https://faucetdrop-backend.onrender.com";

// ── Types ─────────────────────────────────────────────────────
interface QuizCard {
  code: string;
  title: string;
  description: string;
  coverImageUrl?: string | null;
  status: "waiting" | "active" | "finished";
  creatorUsername: string;
  creatorAddress: string;
  totalQuestions: number;
  playerCount: number;
  maxParticipants: number;
  createdAt: string;
  startTime?: string | null;
  isAiGenerated?: boolean;
  reward?: {
    poolAmount: number;
    tokenSymbol: string;
    totalWinners: number;
  };
}

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  waiting: { label: "Waiting", color: "bg-blue-500/20 text-blue-400 border-blue-500/40", dot: "bg-blue-400", icon: Clock },
  active:  { label: "Live",    color: "bg-green-500/20 text-green-400 border-green-500/40 animate-pulse", dot: "bg-green-400", icon: Play },
  finished:{ label: "Ended",   color: "bg-slate-500/20 text-slate-400 border-slate-500/40", dot: "bg-slate-400", icon: CheckCircle2 },
};

// ── Neon grid background ──────────────────────────────────────
function GridBg() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(#6366f1 1px, transparent 1px),
            linear-gradient(90deg, #6366f1 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950" />
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
    </div>
  );
}

// ── Quiz card ─────────────────────────────────────────────────
function QuizCard({ quiz, onClick }: { quiz: QuizCard; onClick: () => void }) {
  const s = STATUS_CONFIG[quiz.status];
  const StatusIcon = s.icon;
  const isLive = quiz.status === "active";
  const isFull = quiz.maxParticipants > 0 && quiz.playerCount >= quiz.maxParticipants;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-300",
        "bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50",
        "hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-0.5",
        isLive && "border-green-500/30 hover:border-green-500/60",
      )}
    >
      {/* Cover image / gradient top strip */}
      <div className="relative h-28 overflow-hidden">
        {quiz.coverImageUrl ? (
          <img src={quiz.coverImageUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity scale-105 group-hover:scale-100 duration-500" />
        ) : (
          <div className={cn(
            "w-full h-full",
            isLive
              ? "bg-gradient-to-br from-green-900/50 via-emerald-950 to-slate-900"
              : quiz.status === "finished"
              ? "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950"
              : "bg-gradient-to-br from-indigo-900/40 via-violet-950 to-slate-900"
          )}>
            <div className="w-full h-full flex items-center justify-center">
              <Gamepad2 className={cn(
                "h-12 w-12 opacity-20",
                isLive ? "text-green-400" : "text-indigo-400"
              )} />
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur",
            s.color
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
            {s.label}
          </span>
        </div>

        {/* AI badge */}
        {quiz.isAiGenerated && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-purple-500/30 text-purple-300 border border-purple-500/40 backdrop-blur">
              <Sparkles className="h-3 w-3" /> AI
            </span>
          </div>
        )}

        {/* Reward badge */}
        {quiz.reward && quiz.reward.poolAmount > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 backdrop-blur">
              <Trophy className="h-3 w-3" /> {quiz.reward.poolAmount} {quiz.reward.tokenSymbol}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-black text-white text-base leading-tight group-hover:text-indigo-300 transition-colors line-clamp-2">
            {quiz.title}
          </h3>
          {quiz.description && (
            <p className="text-slate-400 text-xs mt-1 line-clamp-2">{quiz.description}</p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> {quiz.totalQuestions}Q
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {quiz.playerCount}
            {quiz.maxParticipants > 0 && `/${quiz.maxParticipants}`}
          </span>
          {quiz.reward && (
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500/70" /> {quiz.reward.totalWinners} winner{quiz.reward.totalWinners !== 1 ? "s" : ""}
            </span>
          )}
          <span className="ml-auto text-[10px]">by {quiz.creatorUsername || quiz.creatorAddress.slice(0, 6) + "…"}</span>
        </div>

        {/* Code + CTA */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <span className="font-mono text-xs text-slate-500 flex items-center gap-1">
            <Hash className="h-3 w-3" />{quiz.code}
          </span>
          <span className={cn(
            "text-xs font-bold flex items-center gap-1 transition-colors",
            isFull ? "text-slate-500" :
            isLive ? "text-green-400 group-hover:text-green-300" :
            quiz.status === "finished" ? "text-slate-500" :
            "text-indigo-400 group-hover:text-indigo-300"
          )}>
            {isFull ? "Full" :
             quiz.status === "finished" ? "View Results" :
             isLive ? "Join Now" : "Enter Lobby"}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {/* Live glow pulse */}
      {isLive && (
        <div className="absolute inset-0 rounded-2xl border-2 border-green-500/20 pointer-events-none animate-pulse" />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Main Page
// ═══════════════════════════════════════════════════════════════
export default function QuizListPage() {
  const router = useRouter();
  const { address: userWalletAddress } = useWallet();

  const [quizzes, setQuizzes] = useState<QuizCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "active" | "finished">("all");

  // Join-by-code modal
  const [codeInput, setCodeInput] = useState("");
  const [isJumping, setIsJumping] = useState(false);

  // ── Fetch quizzes ────────────────────────────────────────
  const fetchQuizzes = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/quiz/list?t=${Date.now()}`, { cache: "no-store" });
      const d = await r.json();
      if (d.success) setQuizzes(d.quizzes || []);
    } catch {
      if (!silent) toast.error("Failed to load quizzes");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, []);

  // Auto-refresh every 15s
  useEffect(() => {
    const t = setInterval(() => fetchQuizzes(true), 15000);
    return () => clearInterval(t);
  }, []);

  // ── Jump to code ─────────────────────────────────────────
  const handleJumpToCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4) { toast.error("Enter a valid quiz code"); return; }
    setIsJumping(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/quiz/${code}`);
      const d = await r.json();
      if (d.success) {
        router.push(`/quiz/${code}`);
      } else {
        toast.error("Quiz not found");
      }
    } catch {
      toast.error("Failed to check code");
    } finally {
      setIsJumping(false);
    }
  };

  // ── Filtered list ────────────────────────────────────────
  const filtered = useMemo(() => {
    return quizzes.filter(q => {
      const matchStatus = statusFilter === "all" || q.status === statusFilter;
      const matchSearch = !searchQuery ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.creatorUsername?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    }).sort((a, b) => {
      // Live first, then waiting, then finished; within same status sort by newest
      const order = { active: 0, waiting: 1, finished: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [quizzes, statusFilter, searchQuery]);

  const liveCount = quizzes.filter(q => q.status === "active").length;
  const waitingCount = quizzes.filter(q => q.status === "waiting").length;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative">
      <GridBg />
      <Header pageTitle="Quiz Hub" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-20 space-y-8 pt-6">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-violet-950/80 backdrop-blur p-8 sm:p-12">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }} />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                  <Gamepad2 className="h-5 w-5 text-indigo-400" />
                </div>
                <span className="text-indigo-400 font-bold text-sm uppercase tracking-widest">FaucetDrops Quiz</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-none">
                Quiz <span className="text-indigo-400">Hub</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-lg">
                Join a live quiz, browse upcoming games, or create your own — with real token rewards for winners.
              </p>
              <div className="flex items-center gap-4 pt-1">
                {liveCount > 0 && (
                  <span className="flex items-center gap-2 text-green-400 text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    {liveCount} Live Now
                  </span>
                )}
                {waitingCount > 0 && (
                  <span className="flex items-center gap-2 text-blue-400 text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    {waitingCount} Starting Soon
                  </span>
                )}
              </div>
            </div>

            {/* Join by code */}
            <div className="w-full sm:w-auto shrink-0 space-y-3">
              <div className="bg-black/30 backdrop-blur rounded-2xl border border-white/10 p-4 space-y-3 min-w-[260px]">
                <p className="text-white/50 text-xs uppercase font-bold tracking-widest">Join with Code</p>
                <div className="flex gap-2">
                  <Input
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleJumpToCode()}
                    placeholder="ABC123"
                    maxLength={8}
                    className="font-mono font-black text-lg tracking-widest bg-white/5 border-white/20 text-white h-12 placeholder:text-white/20 focus-visible:border-indigo-500"
                  />
                  <Button
                    onClick={handleJumpToCode}
                    disabled={isJumping || codeInput.length < 4}
                    className="h-12 px-4 bg-indigo-600 hover:bg-indigo-500 shrink-0"
                  >
                    {isJumping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {userWalletAddress && (
                <Button
                  className="w-full h-11 font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0"
                  onClick={() => router.push("/quiz/create-quiz")}
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Quiz
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, code, or creator..."
              className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus-visible:border-indigo-500 h-11"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(["all", "active", "waiting", "finished"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border",
                  statusFilter === s
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:border-indigo-500/50 hover:text-white"
                )}
              >
                {s === "all" ? `All (${quizzes.length})` :
                 s === "active" ? `🟢 Live (${liveCount})` :
                 s === "waiting" ? `🔵 Soon (${waitingCount})` :
                 `Ended (${quizzes.filter(q => q.status === "finished").length})`}
              </button>
            ))}

            <button
              onClick={() => fetchQuizzes(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
              <p className="text-slate-500 text-sm animate-pulse">Loading quizzes...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Gamepad2 className="h-9 w-9 text-slate-600" />
            </div>
            <div className="text-center">
              <h3 className="text-white font-bold text-lg">No quizzes found</h3>
              <p className="text-slate-500 text-sm mt-1">
                {searchQuery ? "Try a different search term" : "Be the first to create one!"}
              </p>
            </div>
            {userWalletAddress && (
              <Button onClick={() => router.push("/quiz/create-quiz")} className="bg-indigo-600 hover:bg-indigo-500">
                <Plus className="mr-2 h-4 w-4" /> Create Quiz
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((quiz, i) => (
              <div
                key={quiz.code}
                className="animate-in fade-in slide-in-from-bottom-3"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
              >
                <QuizCard quiz={quiz} onClick={() => router.push(`/quiz/${quiz.code}`)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}