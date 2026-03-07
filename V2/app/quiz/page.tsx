"use client";
/**
 * /app/quiz/page.tsx  –  FaucetDrops Quiz Hub
 * Full dark/light theme + responsive
 */
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Plus, Zap, Trophy, Users, Clock, Loader2, Sparkles,
  Gamepad2, Play, CheckCircle2, Hash, RefreshCw, BookOpen,
  ChevronRight, Trash2, Droplets, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE_URL = "http://127.0.0.1:8000";

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
  reward?: { poolAmount: number; tokenSymbol: string; totalWinners: number };
}

const STATUS_CONFIG = {
  waiting: {
    label: "Waiting",
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40",
    dot: "bg-blue-500 dark:bg-blue-400",
    icon: Clock,
  },
  active: {
    label: "Live",
    color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/40 animate-pulse",
    dot: "bg-green-500 dark:bg-green-400",
    icon: Play,
  },
  finished: {
    label: "Ended",
    color: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600/40",
    dot: "bg-slate-400 dark:bg-slate-500",
    icon: CheckCircle2,
  },
};

function GridBg() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

function QuizCardItem({ quiz, onClick, isCreator, onDelete }: { quiz: QuizCard; onClick: () => void; isCreator: boolean; onDelete: (e: React.MouseEvent) => void }) {
  const s = STATUS_CONFIG[quiz.status];
  const isLive = quiz.status === "active";
  const isFull = quiz.maxParticipants > 0 && quiz.playerCount >= quiz.maxParticipants;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-300",
        "bg-white dark:bg-slate-900/80 border shadow-sm",
        "hover:shadow-xl hover:-translate-y-0.5",
        isLive
          ? "border-green-300 dark:border-green-500/30 hover:border-green-400 dark:hover:border-green-400/60 hover:shadow-green-100/60 dark:hover:shadow-green-500/10"
          : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-indigo-50 dark:hover:shadow-indigo-500/10"
      )}
    >
      {/* Cover strip */}
      <div className="relative h-28 overflow-hidden">
        {quiz.coverImageUrl ? (
          <img
            src={quiz.coverImageUrl} alt=""
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity scale-105 group-hover:scale-100 duration-500"
          />
        ) : (
          <div className={cn(
            "w-full h-full flex items-center justify-center",
            isLive
              ? "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:via-emerald-950 dark:to-slate-900"
              : quiz.status === "finished"
              ? "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950"
              : "bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-900/40 dark:via-violet-950 dark:to-slate-900"
          )}>
            <Gamepad2 className={cn(
              "h-12 w-12",
              isLive ? "text-green-400/60 dark:text-green-400/20" : "text-indigo-400/40 dark:text-indigo-400/20"
            )} />
          </div>
        )}

        <div className="absolute top-3 left-3">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur",
            s.color
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
            {s.label}
          </span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-2">
          {quiz.isAiGenerated && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/30 dark:text-purple-300 dark:border-purple-500/40 backdrop-blur">
              <Sparkles className="h-3 w-3" /> AI
            </span>
          )}
          {isCreator && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e);
              }}
              className="p-1.5 rounded-full bg-red-100/90 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-900/60 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white backdrop-blur transition-colors border border-red-200 dark:border-red-800 shadow-sm"
              title="Delete Quiz"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        {quiz.reward && quiz.reward.poolAmount > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/40 backdrop-blur">
              <Trophy className="h-3 w-3" /> {quiz.reward.poolAmount} {quiz.reward.tokenSymbol}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2">
            {quiz.title}
          </h3>
          {quiz.description && (
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 line-clamp-2">{quiz.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {quiz.totalQuestions}Q</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {quiz.playerCount}{quiz.maxParticipants > 0 && `/${quiz.maxParticipants}`}
          </span>
          {quiz.reward && (
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" /> {quiz.reward.totalWinners}W
            </span>
          )}
          <span className="ml-auto text-[10px]">
            by {quiz.creatorUsername || quiz.creatorAddress.slice(0, 6) + "…"}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="font-mono text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Hash className="h-3 w-3" />{quiz.code}
          </span>
          <span className={cn(
            "text-xs font-bold flex items-center gap-1 transition-colors",
            isFull ? "text-slate-400 dark:text-slate-500" :
            isLive ? "text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300" :
            quiz.status === "finished" ? "text-slate-400 dark:text-slate-500" :
            "text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300"
          )}>
            {isFull ? "Full" : quiz.status === "finished" ? "View Results" : isLive ? "Join Now" : "Enter Lobby"}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {isLive && (
        <div className="absolute inset-0 rounded-2xl border-2 border-green-400/20 dark:border-green-500/20 pointer-events-none animate-pulse" />
      )}
    </button>
  );
}

export default function QuizListPage() {
  const router = useRouter();
  const { address: userWalletAddress } = useWallet();
  const [quizzes, setQuizzes] = useState<QuizCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "active" | "finished">("all");
  const [codeInput, setCodeInput] = useState("");
  const [isJumping, setIsJumping] = useState(false);

  // ── Modal State for Deletion ──
  const [quizToDelete, setQuizToDelete] = useState<QuizCard | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fetchQuizzes = async (silent = false) => {
    if (!silent) setIsLoading(true); else setIsRefreshing(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/quiz/list?t=${Date.now()}`, { cache: "no-store" });
      const d = await r.json();
      if (d.success) setQuizzes(d.quizzes || []);
    } catch { if (!silent) toast.error("Failed to load quizzes"); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  };

  useEffect(() => { fetchQuizzes(); }, []);
  useEffect(() => {
    const t = setInterval(() => fetchQuizzes(true), 15000);
    return () => clearInterval(t);
  }, []);

  // ✅ New delete trigger
  const initiateDelete = (quiz: QuizCard) => {
    setQuizToDelete(quiz);
    setDeleteConfirmText("");
  };

  // ✅ New deletion confirmation logic
  const confirmDelete = async () => {
    if (!quizToDelete) return;
    if (deleteConfirmText !== quizToDelete.code) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/quiz/${quizToDelete.code}?walletAddress=${userWalletAddress}`, {
        method: "DELETE"
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Quiz deleted successfully");
        setQuizzes(prev => prev.filter(q => q.code !== quizToDelete.code));
        setQuizToDelete(null); // Close modal
      } else {
        toast.error(data.detail || "Failed to delete quiz");
      }
    } catch (err) {
      toast.error("Error deleting quiz");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleJumpToCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4) { toast.error("Enter a valid quiz code"); return; }
    setIsJumping(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/quiz/${code}`);
      const d = await r.json();
      if (d.success) router.push(`/quiz/${code}`);
      else toast.error("Quiz not found");
    } catch { toast.error("Failed to check code"); }
    finally { setIsJumping(false); }
  };

  const filtered = useMemo(() => {
    return quizzes.filter(q => {
      const matchStatus = statusFilter === "all" || q.status === statusFilter;
      const matchSearch = !searchQuery ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.creatorUsername?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    }).sort((a, b) => {
      const order = { active: 0, waiting: 1, finished: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [quizzes, statusFilter, searchQuery]);

  const liveCount = quizzes.filter(q => q.status === "active").length;
  const waitingCount = quizzes.filter(q => q.status === "waiting").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative">
      <GridBg />
      <Header pageTitle="Quiz Hub" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-20 space-y-6 sm:space-y-8 pt-6">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/80 dark:via-slate-900/90 dark:to-violet-950/80 p-6 sm:p-8 md:p-12">
          <div
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.05]"
            style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "32px 32px" }}
          />

          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-10">
            {/* Left */}
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center shrink-0">
                  <Gamepad2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">FaucetDrops Quiz</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none">
                Quiz <span className="text-indigo-600 dark:text-indigo-400">Hub</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg">
                Join a live quiz, browse upcoming games, or create your own — with real token rewards for winners.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {liveCount > 0 && (
                  <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
                    {liveCount} Live Now
                  </span>
                )}
                {waitingCount > 0 && (
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                    {waitingCount} Starting Soon
                  </span>
                )}
              </div>
            </div>

            {/* Right: join + create */}
            <div className="w-full lg:w-auto shrink-0 space-y-3">
              <div className="bg-white/70 dark:bg-black/30 backdrop-blur rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 space-y-3 w-full lg:min-w-[280px]">
                <p className="text-slate-500 dark:text-white/50 text-xs uppercase font-bold tracking-widest">Join with Code</p>
                <div className="flex gap-2">
                  <Input
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleJumpToCode()}
                    placeholder="ABC123"
                    maxLength={8}
                    className="font-mono font-black text-lg tracking-widest bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white h-12 placeholder:text-slate-300 dark:placeholder:text-white/20 focus-visible:border-indigo-500"
                  />
                </div>
              </div>
              {userWalletAddress && (
                <Button
                  className="w-full h-11 font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0"
                  onClick={handleJumpToCode}
                  disabled={isJumping || codeInput.length < 4}
                >
                  {isJumping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, code, or creator..."
              className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:border-indigo-500 h-11"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "active", "waiting", "finished"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border whitespace-nowrap",
                  statusFilter === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:text-slate-900 dark:hover:text-white"
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
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all disabled:opacity-50"
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
              <p className="text-slate-400 dark:text-slate-500 text-sm animate-pulse">Loading quizzes...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
              <Gamepad2 className="h-9 w-9 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-center">
              <h3 className="text-slate-900 dark:text-white font-bold text-lg">No quizzes found</h3>
              <p className="text-slate-500 text-sm mt-1">
                {searchQuery ? "Try a different search term" : "Be the first to create one!"}
              </p>
            </div>
            {userWalletAddress && (
              <Button onClick={() => router.push("/quiz/create-quiz")} className="bg-indigo-600 hover:bg-indigo-500 text-white">
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
                <QuizCardItem 
                  quiz={quiz} 
                  onClick={() => router.push(`/quiz/${quiz.code}`)} 
                  isCreator={userWalletAddress?.toLowerCase() === quiz.creatorAddress.toLowerCase()}
                  onDelete={() => initiateDelete(quiz)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-4 text-red-600 dark:text-red-500 mb-5">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete Quiz?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                To confirm, type the quiz code: <strong className="text-slate-900 dark:text-white select-none">{quizToDelete.code}</strong>
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                onPaste={(e) => {
                  e.preventDefault();
                  toast.warning("Pasting disabled. Please type the code.");
                }}
                placeholder="Type code here..."
                className="h-12 font-mono font-bold text-center tracking-widest uppercase border-red-200 dark:border-red-900/50 focus-visible:ring-red-500 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                onClick={() => setQuizToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
                disabled={deleteConfirmText !== quizToDelete.code || isDeleting}
                onClick={confirmDelete}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Forever"}
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}