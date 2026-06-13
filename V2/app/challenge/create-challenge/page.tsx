"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";
import {
  Loader2, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Rocket, Globe, Lock,
  ArrowLeft, Flame,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  keccak256,
  toBytes,
  parseUnits,
  type Address,
} from "viem";
import { celo } from "viem/chains";
import { QUIZ_HUB_ABI } from "@/lib/abis";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const QUIZ_HUB_ADDRESS = (
  process.env.NEXT_PUBLIC_QUIZ_HUB_CELO ?? "0x349A019b4721DDF9C4E4CCDE46dd048632A41F8F"
) as `0x${string}`;

// DROPS token on Celo — 18 decimals
const DROPS_ADDRESS    = (process.env.NEXT_PUBLIC_DROPS_CONTRACT ?? "0xF8F6D74E61A0FC2dd2feCd41dE384ba2fbf91b9D") as `0x${string}`;
const DROPS_DECIMALS   = 18;
const DROPS_SYMBOL     = "DROPS";
const CELO_CHAIN_ID    = 42220;

// 10 DROPS minimum — must match QuizHub.MIN_STAKE
const MIN_STAKE        = 10;

function deriveQuizId(code: string): `0x${string}` {
  return keccak256(toBytes(code));
}

const STEPS = [
  { id: "topic",  emoji: "🎯", label: "Topic",  desc: "What to quiz about" },
  { id: "stake",  emoji: "💰", label: "Stake",  desc: "Set the wager"       },
  { id: "launch", emoji: "🚀", label: "Launch", desc: "Go live"             },
];

function WizardProgress({
  current,
  setStep,
}: {
  current: number;
  setStep: (n: number) => void;
}) {
  return (
    <div className="relative flex items-center justify-between w-full max-w-xs mx-auto px-2 mb-8">
      <div className="absolute top-5 left-8 right-8 h-1 bg-border rounded-full z-0" />
      <div
        className="absolute top-5 left-8 h-1 rounded-full z-0 transition-all duration-500 bg-primary"
        style={{ width: `calc(${(current / (STEPS.length - 1)) * 100}%)` }}
      />
      {STEPS.map((step, idx) => {
        const done   = idx < current;
        const active = idx === current;
        return (
          <button
            key={step.id}
            onClick={() => idx < current && setStep(idx)}
            disabled={idx > current}
            className="relative z-10 flex flex-col items-center gap-1.5"
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-lg border-[3px] transition-all duration-300 shadow-sm",
              done   ? "bg-primary border-primary text-primary-foreground scale-95"
                     : active
                     ? "bg-card border-primary text-primary scale-110 shadow-lg"
                     : "bg-card border-border text-muted-foreground",
            )}>
              {done ? "✓" : step.emoji}
            </div>
            <span className={cn(
              "text-[10px] font-bold hidden sm:block transition-colors",
              active ? "text-primary" : "text-muted-foreground/50",
            )}>
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type TxPhase = "idle" | "backend" | "approving" | "creating" | "done";

function TxStatusPill({ phase }: { phase: TxPhase }) {
  const labels: Record<TxPhase, string> = {
    idle:      "",
    backend:   "🤖 Generating questions…",
    approving: "⛓️ Approve DROPS spend…",
    creating:  "⛓️ Confirm Create transaction…",
    done:      "✅ Challenge live!",
  };
  if (phase === "idle") return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-card border-2 border-primary/30 shadow-xl flex items-center gap-3 text-sm font-bold text-foreground whitespace-nowrap">
      {phase !== "done" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
      {labels[phase]}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateChallengePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { address: userWalletAddress, chainId: walletChainId, ensureCorrectNetwork } = useWallet();

  const [wizardStep, setWizardStep]   = useState(0);
  const [txPhase, setTxPhase]         = useState<TxPhase>("idle");
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Step 0 — Topic & Visibility
  const [topic, setTopic]                     = useState("");
  const [creatorUsername, setCreatorUsername] = useState("");
  const [isPublic, setIsPublic]               = useState(!searchParams.get("inviteUsername"));
  const [questionCount, setQuestionCount]     = useState(15);

  // Duel routing
  const [inviteUsername, setInviteUsername]   = useState(searchParams.get("inviteUsername") ?? "");
  const [inviteWallet, setInviteWallet]       = useState(searchParams.get("inviteWallet") ?? "");
  const [usernameStatus, setUsernameStatus]   = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [resolvedUsername, setResolvedUsername] = useState(searchParams.get("inviteUsername") ?? "");

  // Step 1 — Stake (DROPS only)
  const [stakeAmount, setStakeAmount] = useState("");

  // Pre-fill if arriving from Ranks page with proper params
  useEffect(() => {
    if (searchParams.get("inviteWallet") && searchParams.get("inviteUsername")) {
      setUsernameStatus("found");
    }
  }, [searchParams]);

  // Load creator profile
  useEffect(() => {
    if (!userWalletAddress) return;
    fetch(`${API_BASE_URL}/api/players/${userWalletAddress}`)
      .then(r => r.json())
      .then(d => { if (d.username) setCreatorUsername(d.username); })
      .catch(() => {});
  }, [userWalletAddress]);

  const lookupUsername = async (username: string) => {
    if (!username.trim() || username.length < 3) return;
    setUsernameStatus("loading");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/players/by-username/${encodeURIComponent(username.trim())}`,
      );
      if (!res.ok) { setUsernameStatus("notfound"); return; }
      const data = await res.json();
      setInviteWallet(data.wallet);
      setResolvedUsername(data.username);
      setUsernameStatus("found");
    } catch {
      setUsernameStatus("notfound");
    }
  };

  const canAdvance = useCallback((): boolean => {
    const id = STEPS[wizardStep]?.id;
    if (id === "topic") {
      const topicOk = topic.trim().length > 3 && !!userWalletAddress;
      if (!isPublic) return topicOk && usernameStatus === "found";
      return topicOk;
    }
    if (id === "stake") {
      const amt = parseFloat(stakeAmount);
      return !!stakeAmount && !isNaN(amt) && amt >= MIN_STAKE;
    }
    return true;
  }, [wizardStep, topic, stakeAmount, userWalletAddress, isPublic, usernameStatus]);

  // ── On-chain: createQuiz(quizId, stakeAmount) ──────────────────────────────
  // New QuizHub v2: args are (bytes32 quizId, uint256 stakeAmount)
  // No token address — DROPS-only is enforced by the contract.
  const createQuizOnChain = async (code: string, stakeDROPS: number): Promise<void> => {
    if (!window.ethereum) throw new Error("No wallet found. Please open inside MiniPay.");
    await window.ethereum.request({ method: "eth_requestAccounts" });

    const walletClient = createWalletClient({
      chain: celo,
      transport: custom(window.ethereum),
    });
    const publicClient = createPublicClient({
      chain: celo,
      transport: http("https://forno.celo.org"),
    });

    const [account] = await walletClient.getAddresses();
    const quizId    = deriveQuizId(code);
    const stakeWei  = parseUnits(stakeDROPS.toString(), DROPS_DECIMALS);

    setTxPhase("creating");
    toast.info("Confirm quiz creation in your wallet…");

    const txHash = await walletClient.writeContract({
      address:      QUIZ_HUB_ADDRESS,
      abi:          QUIZ_HUB_ABI,
      functionName: "createQuiz",
      args:         [quizId],   // (bytes32, uint256) — no token address
      account,
      chain: celo,
    });

    toast.loading("Waiting for confirmation…", { id: "create-confirm" });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    toast.success("Quiz created on-chain! ⛓️✅", { id: "create-confirm" });

    try {
      await fetch(`${API_BASE_URL}/api/challenge/${code}/on-chain-confirmed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorWallet: userWalletAddress,
          txHash:        receipt.transactionHash,
        }),
      });
    } catch (err) {
      console.warn("[on-chain-confirmed] failed to notify:", err);
    }
  };

  const handleCreate = async () => {
    if (!userWalletAddress || !topic.trim() || !stakeAmount) {
      toast.error("Please fill all required fields");
      return;
    }

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < MIN_STAKE) {
      toast.error(`Minimum stake is ${MIN_STAKE} ${DROPS_SYMBOL}`);
      return;
    }

    try {
      await ensureCorrectNetwork(CELO_CHAIN_ID);
    } catch {
      return;
    }

    setTxPhase("backend");

    try {
      if (creatorUsername) {
        await fetch(
          `${API_BASE_URL}/api/players/register?wallet=${userWalletAddress}&username=${creatorUsername}`,
          { method: "POST" },
        ).catch(() => {});
      }

      const res = await fetch(`${API_BASE_URL}/api/challenge/create`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic:           topic.trim(),
          questionCount,
          creatorAddress:  userWalletAddress,
          creatorUsername: creatorUsername || userWalletAddress.slice(0, 8),
          stakeAmount:     stake,
          tokenSymbol:     DROPS_SYMBOL,   // always DROPS
          chainId:         CELO_CHAIN_ID,
          isPublic,
          inviteWallet:    !isPublic && inviteWallet.trim() ? inviteWallet.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.detail ?? "Challenge creation failed");

      const code: string = data.code;
      await createQuizOnChain(code, stake);

      setTxPhase("done");
      setCreatedCode(code);
      toast.success(`🎉 Challenge live! Code: ${code}`);
    } catch (err: any) {
      setTxPhase("idle");
      if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Transaction rejected — challenge not created.");
        return;
      }
      toast.error(`❌ ${err?.reason ?? err?.message ?? "Unknown error"}`);
    }
  };

  // ── Render: created ────────────────────────────────────────────────────────

  if (createdCode) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header pageTitle="Challenge Created!" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-4 text-center">
            <div className="text-8xl animate-bounce">🎉</div>
            <div className="bg-card rounded-3xl border-2 border-primary/20 p-8 shadow-2xl space-y-5">
              <div>
                <h2 className="text-2xl font-black text-foreground">Challenge is Live!</h2>
                <p className="text-muted-foreground text-sm mt-1">Topic: {topic}</p>
              </div>
              <div className="bg-primary/5 rounded-2xl p-6 border-2 border-primary/20">
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">
                  Challenge Code
                </p>
                <div className="text-5xl font-black tracking-[0.15em] text-primary">
                  {createdCode}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 rounded-2xl border-2 font-bold"
                onClick={() => router.push(`/challenge/${createdCode}/pre-lobby`)}
              >
                Open Pre-Lobby <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 0: Topic ──────────────────────────────────────────────────────────

  const renderStepTopic = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center space-y-2 pb-2">
        <div className="text-5xl">🎯</div>
        <h2 className="text-xl font-black text-foreground">What's the quiz about?</h2>
        <p className="text-sm text-muted-foreground">
          AI will generate {questionCount} questions on your topic
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground">
          Topic <span className="text-destructive">*</span>
        </Label>
        <Textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder='"Ethereum & DeFi basics", "World geography capitals", "Solidity security"'
          className="resize-none h-24 rounded-xl border-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground">Number of Questions</Label>
        <div className="grid grid-cols-4 gap-2">
          {[15, 18, 21, 24, 27, 30].map(num => (
            <button
              key={num}
              onClick={() => setQuestionCount(num)}
              className={cn(
                "py-2 rounded-xl border-2 text-xs font-bold transition-all",
                questionCount === num
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground">Visibility</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { val: true,  icon: Globe, label: "Public",  desc: "Anyone can join" },
            { val: false, icon: Lock,  label: "Private", desc: "Invite only"     },
          ] as const).map(({ val, icon: Icon, label, desc }) => (
            <button
              key={String(val)}
              onClick={() => setIsPublic(val)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                isPublic === val
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-black text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {!isPublic && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <Label className="text-sm font-bold text-foreground">Opponent username</Label>
          <div className="flex gap-2">
            <Input
              value={inviteUsername}
              onChange={e => {
                setInviteUsername(e.target.value);
                setUsernameStatus("idle");
                setInviteWallet("");
              }}
              onBlur={() => lookupUsername(inviteUsername)}
              placeholder="e.g. axelrod"
              className="h-11 rounded-xl border-2 text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => lookupUsername(inviteUsername)}
              disabled={usernameStatus === "loading"}
              className="px-4 rounded-xl border-2 border-border bg-card text-sm font-bold text-muted-foreground hover:border-primary/50 transition-all disabled:opacity-50"
            >
              {usernameStatus === "loading" ? "…" : "Find"}
            </button>
          </div>
          {usernameStatus === "found" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {resolvedUsername}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-1">
                  — {inviteWallet.slice(0, 6)}…{inviteWallet.slice(-4)}
                </span>
              </div>
            </div>
          )}
          {usernameStatus === "notfound" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Username not found.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Step 1: Stake ──────────────────────────────────────────────────────────

  const renderStepStake = () => {
    const amt    = parseFloat(stakeAmount);
    const belowMin = stakeAmount && !isNaN(amt) && amt > 0 && amt < MIN_STAKE;
    const pool   = !isNaN(amt) && amt >= MIN_STAKE ? (amt * 2).toFixed(0) : "—";

    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center space-y-2 pb-2">
          <div className="text-5xl">💰</div>
          <h2 className="text-xl font-black text-foreground">Set the stake</h2>
          <p className="text-sm text-muted-foreground">
            Both players burn this amount. Winner gets minted 2× back.
          </p>
        </div>

        {/* DROPS badge */}
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary/5 border-2 border-primary/20 w-fit mx-auto">
          <Flame className="h-4 w-4 text-primary" />
          <span className="text-sm font-black text-primary">DROPS token only</span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-black text-muted-foreground uppercase tracking-wider">
            Amount per player{" "}
            <span className="text-destructive">(min {MIN_STAKE} DROPS)</span>
          </Label>
          <div className="relative">
            <Input
              type="number"
              value={stakeAmount}
              onChange={e => setStakeAmount(e.target.value)}
              placeholder="0"
              min={MIN_STAKE}
              step="1"
              className="h-14 text-2xl font-black font-mono rounded-xl pr-24 border-2 text-center"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
              DROPS
            </span>
          </div>
          {belowMin && (
            <p className="text-xs text-destructive font-bold">
              Minimum stake is {MIN_STAKE} DROPS
            </p>
          )}
        </div>

        {/* Quick picks */}
        <div className="grid grid-cols-4 gap-2">
          {[10, 25, 50, 100].map(v => (
            <button
              key={v}
              onClick={() => setStakeAmount(String(v))}
              className={cn(
                "py-2 rounded-xl border-2 text-xs font-bold transition-all",
                parseFloat(stakeAmount) === v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Pool preview */}
        {!isNaN(amt) && amt >= MIN_STAKE && (
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/50 border border-border text-sm">
            <span className="text-muted-foreground font-bold">Winner receives</span>
            <span className="font-black text-foreground">{pool} DROPS</span>
          </div>
        )}
      </div>
    );
  };

  // ── Step 2: Launch ─────────────────────────────────────────────────────────

  const renderStepLaunch = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 max-w-xl mx-auto">
      <div className="text-center space-y-2 pb-2">
        <div className="text-5xl">🚀</div>
        <h2 className="text-xl font-black text-foreground">Ready to challenge?</h2>
        <p className="text-sm text-muted-foreground">Review and launch</p>
      </div>

      <div className="rounded-3xl border-2 border-border bg-card overflow-hidden p-5 space-y-4">
        {[
          { emoji: "🧠", label: "Topic",   value: topic || "—",                                  ok: !!topic },
          { emoji: "🔥", label: "Stake",   value: `${stakeAmount} DROPS`,                        ok: !!stakeAmount && parseFloat(stakeAmount) >= MIN_STAKE },
          { emoji: "🏆", label: "Prize",   value: `${(parseFloat(stakeAmount || "0") * 2).toFixed(0)} DROPS to winner`, ok: parseFloat(stakeAmount || "0") >= MIN_STAKE },
          { emoji: isPublic ? "🌐" : "🔒", label: "Visibility", value: isPublic ? "Public" : `Duel vs ${resolvedUsername}`, ok: true },
        ].map(item => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2.5 rounded-2xl px-3 py-2.5 border-2",
              item.ok
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200"
                : "bg-destructive/10 border-destructive/30",
            )}
          >
            <span className="text-xl">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground">{item.label}</p>
              <p className="text-sm font-black truncate text-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* What happens next */}
      <div className="flex flex-col gap-1.5 px-4 py-3 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground">
        <p className="font-black text-foreground text-[11px] uppercase tracking-widest mb-1">
          How it works
        </p>
        <p>1. Quiz is registered on QuizHub (this tx).</p>
        <p>2. You & your opponent each call <code>DROPS.redeem(stake, code)</code> to burn your stake.</p>
        <p>3. Winner gets <code>DROPS.claim(stake × 2)</code> minted to their wallet.</p>
      </div>

      <button
        onClick={handleCreate}
        disabled={txPhase !== "idle" || !userWalletAddress}
        className={cn(
          "w-full h-16 rounded-2xl font-black text-lg transition-all",
          userWalletAddress
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "bg-muted text-muted-foreground",
        )}
      >
        {txPhase !== "idle" ? (
          <><Loader2 className="h-5 w-5 animate-spin mr-2 inline" /> Creating…</>
        ) : (
          <><Rocket className="h-5 w-5 mr-2 inline" /> Launch Duel</>
        )}
      </button>
    </div>
  );

  const stepContent = [renderStepTopic, renderStepStake, renderStepLaunch];
  const lastStep    = STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header pageTitle="Create Challenge" />
      <div className="relative z-10 flex-1 max-w-2xl mx-auto w-full px-4 pb-24 pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl border-2 border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-black text-foreground">New Challenge</h1>
            <p className="text-xs text-muted-foreground">Step {wizardStep + 1} of {STEPS.length}</p>
          </div>
        </div>

        <WizardProgress current={wizardStep} setStep={setWizardStep} />

        <div className="bg-card rounded-3xl border-2 border-border p-5 shadow-sm">
          {stepContent[wizardStep]?.()}
        </div>

        {wizardStep < lastStep && (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setWizardStep(s => Math.max(0, s - 1))}
              disabled={wizardStep === 0}
              className="px-5 py-3 rounded-2xl border-2 border-border bg-card text-muted-foreground font-bold text-sm disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="h-4 w-4 inline mr-1" /> Back
            </button>
            <button
              onClick={() => setWizardStep(s => Math.min(lastStep, s + 1))}
              disabled={!canAdvance()}
              className={cn(
                "px-5 py-3 rounded-2xl font-bold text-sm transition-all",
                canAdvance()
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              Next <ChevronRight className="h-4 w-4 inline ml-1" />
            </button>
          </div>
        )}
      </div>
      <TxStatusPill phase={txPhase} />
    </div>
  );
}