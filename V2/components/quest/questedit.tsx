"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Plus, Trash2, Save, Edit2, X, Lock, GripVertical,
  CheckCircle2, ChevronDown, ChevronUp, Upload, ExternalLink,
  Shield, Sparkles, Zap, AlertTriangle, Send, ShieldCheck,
  MessageSquareText, Code, Link as LinkIcon,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────

const API_BASE_URL = "http://127.0.0.1:8000";

const STAGES = ["Beginner", "Intermediate", "Advance", "Legend", "Ultimate"] as const;
type Stage = (typeof STAGES)[number];

const VERIFICATION_TYPES = [
  { value: "auto_social", label: "Auto Social" },
  { value: "auto_tx", label: "Auto TX" },
  { value: "onchain", label: "⚡ On-Chain Engine" },
  { value: "manual_link", label: "Manual Link" },
  { value: "manual_upload", label: "Manual Upload" },
  { value: "none", label: "Instant (Auto-Complete)" },
] as const;

const SOCIAL_PLATFORMS = ["Twitter", "Discord", "Telegram", "YouTube", "Instagram", "Website", "Other"] as const;

const ONCHAIN_ACTIONS = [
  { value: "hold_token", label: "Hold Token Balance" },
  { value: "hold_nft", label: "Hold NFT" },
  { value: "wallet_age", label: "Wallet Age Check" },
  { value: "tx_count", label: "Transaction Count" },
];

const getAvailableActions = (platform: string) => {
  switch (platform) {
    case "Twitter": return ["follow", "like & retweet", "quote", "comment"];
    case "Discord": return ["join", "role"];
    case "Telegram": return ["join", "message_count"];
    case "YouTube": return ["subscribe", "watch"];
    case "Website": return ["visit"];
    default: return ["follow", "join", "visit", "like"];
  }
};

const GENERAL_ACTIONS = [
  "follow", "join", "subscribe", "like", "retweet", "quote",
  "comment", "visit", "watch", "share", "swap", "trade",
  "hold_token", "hold_nft", "tx_count", "wallet_age",
];

const STAGE_COLORS: Record<Stage, string> = {
  Beginner: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  Advance: "bg-violet-100 text-violet-700 border-violet-200",
  Legend: "bg-amber-100 text-amber-700 border-amber-200",
  Ultimate: "bg-rose-100 text-rose-700 border-rose-200",
};

// ─── Suggested Tasks by Stage ─────────────────────────────────

const SUGGESTED_TASKS_BY_STAGE: Record<Stage, Array<Partial<EditableTask>>> = {
  Beginner: [
    { title: "Follow us on Twitter", description: "Follow our official X account.", category: "social", action: "follow", targetPlatform: "Twitter", points: 50, verificationType: "auto_social" },
    { title: "Join our Discord", description: "Become part of the community on Discord.", category: "social", action: "join", targetPlatform: "Discord", points: 50, verificationType: "auto_social" },
    { title: "Join Telegram Group", description: "Join our Telegram channel.", category: "social", action: "join", targetPlatform: "Telegram", points: 40, verificationType: "auto_social" },
    { title: "Like & Retweet on X", description: "Like & Retweet our post on X.", category: "social", action: "like & retweet", targetPlatform: "Twitter", points: 20, verificationType: "auto_social" },
    { title: "Visit Project Homepage", description: "Check out our official website.", category: "social", action: "visit", targetPlatform: "Website", points: 30, verificationType: "none" },
    { title: "Quote Quest on X", description: "Quote our post on X.", category: "social", action: "quote", targetPlatform: "Twitter", points: 20, verificationType: "auto_social" },
  ],
  Intermediate: [
    { title: "Attain 'Verified' Discord Role", description: "Get the Verified role in our server.", category: "social", action: "role", targetPlatform: "Discord", points: 80, verificationType: "auto_social" },
    { title: "Send 2 Messages in Telegram", description: "Be active and send 2 messages in the main chat.", category: "social", action: "message_count", targetPlatform: "Telegram", points: 60, verificationType: "auto_social", minTxCount: "2" },
    { title: "Subscribe to YouTube", description: "Subscribe to our YouTube channel.", category: "social", action: "subscribe", targetPlatform: "YouTube", points: 60, verificationType: "manual_upload" },
    { title: "Hold at least 0.01 ETH", description: "Hold a small amount of native token.", category: "trading", action: "hold_token", points: 80, verificationType: "onchain", minAmount: "0.01" },
    { title: "Make a Swap on DEX", description: "Execute at least one swap on a DEX.", category: "trading", action: "swap", points: 120, verificationType: "manual_link" },
  ],
  Advance: [
    { title: "Hold an NFT from Our Collection", description: "Own at least 1 NFT from the official collection.", category: "trading", action: "hold_nft", points: 200, verificationType: "onchain" },
    { title: "Make 3+ On-chain Transactions", description: "Complete at least 3 transactions on the target chain.", category: "trading", action: "tx_count", points: 180, verificationType: "onchain", minTxCount: "3" },
    { title: "Provide Liquidity ($50+)", description: "Add liquidity with at least $50 equivalent.", category: "trading", action: "swap", points: 250, verificationType: "manual_link", minAmount: "50" },
  ],
  Legend: [
    { title: "Cross-chain Bridge (2+ chains)", description: "Bridge assets between at least two different chains.", category: "trading", action: "swap", points: 600, verificationType: "manual_link" },
    { title: "Provide Liquidity for 7+ Days", description: "Add liquidity and maintain position for at least 7 days.", category: "trading", action: "swap", points: 500, verificationType: "manual_link" },
    { title: "Interact with Our Smart Contract", description: "Send at least one tx to our main contract.", category: "trading", action: "tx_count", points: 350, verificationType: "manual_link" },
  ],
  Ultimate: [
    { title: "Wallet Age > 90 Days + 50+ TX", description: "Have an aged wallet with significant on-chain history.", category: "trading", action: "wallet_age", points: 1200, verificationType: "onchain", minDays: "90", minTxCount: "50" },
    { title: "High Volume Trader ($10,000+)", description: "Execute swaps with cumulative value of $10k or more.", category: "trading", action: "swap", points: 1500, verificationType: "manual_link", minAmount: "10000" },
    { title: "Become an Ambassador", description: "Upload proof of Ambassador role assignment.", category: "general", action: "apply", points: 1000, verificationType: "manual_upload" },
  ],
};

// ─── Types ───────────────────────────────────────────────────

interface EditableTask {
  id: string;
  title: string;
  description: string;
  points: number;
  required: boolean;
  category: string;
  url: string;
  action: string;
  verificationType: string;
  targetPlatform: string;
  stage: Stage;
  targetHandle: string;
  targetContractAddress: string;
  minAmount: string;
  minTxCount: string;
  minDays: string;
  isSystem?: boolean;
  _isDirty?: boolean;
  _isNew?: boolean;
}

interface QuestEditPanelProps {
  questData: any;
  faucetAddress: string;
  creatorAddress: string;
  onQuestUpdated?: (partial: Partial<any>) => void;
}

// ─── Helpers ─────────────────────────────────────────────────

function makeBlankTask(stage: Stage = "Beginner"): EditableTask {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    description: "",
    points: 50,
    required: true,
    category: "social",
    url: "",
    action: "follow",
    verificationType: "auto_social",
    targetPlatform: "Twitter",
    stage,
    targetHandle: "",
    targetContractAddress: "",
    minAmount: "",
    minTxCount: "",
    minDays: "",
    _isNew: true,
    _isDirty: true,
  };
}

function verificationIcon(vtype: string) {
  if (vtype === "auto_social") return <Sparkles className="h-3 w-3 text-blue-500" />;
  if (vtype === "onchain") return <Zap className="h-3 w-3 text-violet-500" />;
  if (vtype === "auto_tx") return <Shield className="h-3 w-3 text-green-500" />;
  return <ExternalLink className="h-3 w-3 text-slate-400" />;
}

function generateSocialTitle(platform: string, action: string): string {
  if (!platform || !action) return "";
  if (action === "role") return `Attain Role in ${platform}`;
  if (action === "message_count") return `Send Messages in ${platform}`;
  return `${action.charAt(0).toUpperCase() + action.slice(1)} our ${platform}`;
}

function normalizeUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;
  return clean.replace(/\/+$/, "");
}

// ─── Task Form (Add / Edit) ───────────────────────────────────

interface TaskFormProps {
  initial: EditableTask;
  onSave: (task: EditableTask) => void;
  onCancel: () => void;
}

function TaskForm({ initial, onSave, onCancel }: TaskFormProps) {
  const [task, setTask] = useState<EditableTask>({ ...initial });

  const [discordStatus, setDiscordStatus] = useState<{ checking: boolean; ok: boolean | null; msg: string }>({ checking: false, ok: null, msg: "" });
  const [telegramStatus, setTelegramStatus] = useState<{ checking: boolean; ok: boolean | null; botUsername: string }>({ checking: false, ok: null, botUsername: "" });

  const patch = (p: Partial<EditableTask>) => setTask((prev) => ({ ...prev, ...p, _isDirty: true }));

  const isSocial = task.category === "social";
  const isOnchain = task.verificationType === "onchain";
  const showContractAddress = ["hold_token", "hold_nft", "swap", "trade", "interact_contract"].includes(task.action);
  const showMinAmount = ["hold_token", "swap", "trade"].includes(task.action);
  const showMinTxCount = task.action === "tx_count";
  const showMinDays = task.action === "wallet_age";

  const getSocialInputLabel = () => {
    const p = task.targetPlatform;
    if (["Discord", "Telegram"].includes(p)) return "Server/Group Invite Link";
    if (["YouTube", "Instagram", "Website"].includes(p)) return "Profile / Content URL";
    return "Target Profile/Post URL";
  };

  const checkDiscord = async () => {
    if (!task.url) { toast.error("Enter a Discord URL first"); return; }
    setDiscordStatus({ checking: true, ok: null, msg: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/api/bot/check-discord-status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteUrl: task.url }),
      });
      const data = await res.json();
      setDiscordStatus({ checking: false, ok: data.is_in_server, msg: data.message || "" });
      data.is_in_server ? toast.success("Bot detected in server!") : toast.error("Bot not found in server.");
    } catch {
      setDiscordStatus({ checking: false, ok: false, msg: "Check failed" });
    }
  };

  const checkTelegram = async () => {
    if (!task.url || !task.url.includes("t.me")) { toast.error("Enter a Telegram URL first"); return; }
    setTelegramStatus((p) => ({ ...p, checking: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/bot/check-telegram-admin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: task.url }),
      });
      const data = await res.json();
      setTelegramStatus({ checking: false, ok: data.is_admin, botUsername: data.bot_username || "" });
    } catch {
      setTelegramStatus({ checking: false, ok: false, botUsername: "" });
    }
  };

  const suggestedForStage = SUGGESTED_TASKS_BY_STAGE[task.stage] || [];

  const applySuggestion = (s: Partial<EditableTask>) => {
    setTask((prev) => ({
      ...prev,
      ...s,
      stage: s.stage || prev.stage,
      id: prev.id,
      _isDirty: true,
      _isNew: prev._isNew,
    }));
    setDiscordStatus({ checking: false, ok: null, msg: "" });
    setTelegramStatus({ checking: false, ok: null, botUsername: "" });
  };

  const handleSave = () => {
    if (!task.title.trim()) { toast.error("Title is required"); return; }
    if (task.points < 0) { toast.error("Points must be ≥ 0"); return; }
    if (task.targetPlatform === "Twitter" && ["quote", "comment"].includes(task.action) && !task.targetHandle) {
      toast.error("Target handle is required for quote/comment tasks"); return;
    }
    if (task.targetPlatform === "Discord" && task.action === "role" && !task.targetHandle) {
      toast.error("Role ID is required for Discord Role verification"); return;
    }
    if (task.targetPlatform === "Telegram" && task.action === "message_count" && (!task.minTxCount || Number(task.minTxCount) < 1)) {
      toast.error("A valid message count is required"); return;
    }
    onSave(task);
  };

  return (
    <div className="space-y-5 p-5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">

      {/* ── Stage selector + Quick Add Templates ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage</Label>
            <Select value={task.stage} onValueChange={(v) => patch({ stage: v as Stage })}>
              <SelectTrigger className="h-9 bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[s]}`}>{s}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" /> Quick Add Templates
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {suggestedForStage.map((s, i) => (
              <Button key={i} variant="outline" size="sm"
                className="text-xs h-7 bg-white dark:bg-slate-900 hover:border-primary hover:text-primary transition-colors"
                onClick={() => applySuggestion(s)}>
                <Plus className="h-3 w-3 mr-1" />{s.title}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700" />

      {/* ── Title + Points ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Task Title <span className="text-red-500">*</span>
          </Label>
          <Input value={task.title} placeholder="e.g. Follow us on Twitter"
            onChange={(e) => patch({ title: e.target.value })}
            className="h-10 bg-white dark:bg-slate-950" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Points</Label>
          <Input type="number" min={0} max={10000} value={task.points}
            onChange={(e) => patch({ points: Number(e.target.value) })}
            className="h-10 bg-white dark:bg-slate-950" />
        </div>
      </div>

      {/* ── Description ── */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</Label>
        <Textarea value={task.description} rows={2} placeholder="Describe what the user must do…"
          onChange={(e) => patch({ description: e.target.value })}
          className="resize-none bg-white dark:bg-slate-950 text-sm" />
      </div>

      {/* ── Category + Verification + Required ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</Label>
          <Select value={task.category} onValueChange={(v) => patch({ category: v })}>
            <SelectTrigger className="h-10 bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["social", "trading", "onchain", "community", "content", "general"].map((c) => (
                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verification</Label>
          <Select value={task.verificationType}
            onValueChange={(v) => patch({
              verificationType: v,
              action: v === "onchain" && !["hold_token","hold_nft","wallet_age","tx_count"].includes(task.action) ? "hold_token" : task.action,
            })}>
            <SelectTrigger className="h-10 bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VERIFICATION_TYPES.map(({ value, label }) => (
                <SelectItem key={value} value={value} className={value === "onchain" ? "font-bold text-violet-600" : ""}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pb-1">
          <Switch id={`req-${task.id}`} checked={task.required} onCheckedChange={(v) => patch({ required: v })} />
          <Label htmlFor={`req-${task.id}`} className="text-sm font-medium cursor-pointer">Required</Label>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SOCIAL TASK CONFIGURATION
      ══════════════════════════════════════════ */}
      {isSocial && (
        <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/10 space-y-4">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Social Task Configuration
          </p>

          {/* Platform + Action */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Platform</Label>
              <Select value={task.targetPlatform || "Twitter"}
                onValueChange={(v) => {
                  const firstAction = getAvailableActions(v)[0];
                  patch({ targetPlatform: v, action: firstAction, title: generateSocialTitle(v, firstAction) });
                }}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-950 border-blue-200 dark:border-blue-800/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOCIAL_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Action</Label>
              <Select value={task.action}
                onValueChange={(v) => patch({ action: v, title: generateSocialTitle(task.targetPlatform, v) })}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-950 border-blue-200 dark:border-blue-800/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getAvailableActions(task.targetPlatform || "Twitter").map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-generated title (editable) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Generated Title (editable)</Label>
            <Input value={task.title} onChange={(e) => patch({ title: e.target.value })}
              className="h-9 bg-white dark:bg-slate-950 border-blue-200 dark:border-blue-800/50 text-sm font-medium" />
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> {getSocialInputLabel()}
            </Label>
            <Input value={task.url} placeholder="https://..."
              onChange={(e) => patch({ url: e.target.value })}
              onBlur={() => { if (task.url?.includes(".")) patch({ url: normalizeUrl(task.url) }); }}
              className="h-9 bg-white dark:bg-slate-950 font-mono text-xs" />
          </div>

          {/* Twitter: handle for quote/comment/follow */}
          {task.targetPlatform === "Twitter" && ["quote", "comment", "follow"].includes(task.action) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {task.action === "follow" ? "Twitter Handle to Follow" : "Target Tag/Handle"}
              </Label>
              <Input className="h-9 bg-white dark:bg-slate-950"
                placeholder="@YourProject"
                value={task.targetHandle}
                onChange={(e) => patch({ targetHandle: e.target.value.replace("@", "") })} />
            </div>
          )}

          {/* Discord: Role ID */}
          {task.targetPlatform === "Discord" && task.action === "role" && (
            <div className="space-y-1.5 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <Label className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Required Role ID
              </Label>
              <Input className="h-9 bg-white dark:bg-slate-950" placeholder="e.g. 104239849202392"
                value={task.targetHandle}
                onChange={(e) => patch({ targetHandle: e.target.value })} />
              <p className="text-[10px] text-muted-foreground">Enable Developer Mode in Discord → right-click Role → "Copy Role ID"</p>
            </div>
          )}

          {/* Telegram: message count */}
          {task.targetPlatform === "Telegram" && task.action === "message_count" && (
            <div className="space-y-1.5 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
              <Label className="text-xs font-bold text-sky-600 flex items-center gap-1">
                <MessageSquareText className="h-3 w-3" /> Required Message Count
              </Label>
              <Input type="number" className="h-9 bg-white dark:bg-slate-950" placeholder="e.g. 10"
                value={task.minTxCount}
                onChange={(e) => patch({ minTxCount: e.target.value })} />
              <p className="text-[10px] text-muted-foreground">Users must send this many messages in the group to pass.</p>
            </div>
          )}

          {/* ── Discord Bot Helper ── */}
          {task.targetPlatform === "Discord" && task.verificationType === "auto_social" && (
            <div className={`p-4 rounded-lg border text-sm transition-colors ${
              discordStatus.ok === true ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800"
              : discordStatus.ok === false ? "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800"
              : "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800"
            }`}>
              {discordStatus.ok === true ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span><strong>✅ Bot is in your server.</strong> Auto-verification is enabled!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    {discordStatus.ok === false
                      ? <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                      : <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />}
                    <div>
                      <strong className="block mb-1">{discordStatus.ok === false ? "Bot not detected!" : "Action Required: Add Discord Bot"}</strong>
                      <p className="text-xs opacity-90">To verify server memberships automatically, our bot must be in your server.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                    <Button type="button" variant="outline" size="sm" className="text-xs h-8 bg-white dark:bg-slate-900"
                      onClick={() => window.open("https://discord.com/oauth2/authorize?client_id=1466125172342915145&permissions=8&integration_type=0&scope=bot", "_blank")}>
                      <Plus className="h-3 w-3 mr-1" /> Add Bot
                    </Button>
                    <Button type="button" size="sm" onClick={checkDiscord} disabled={discordStatus.checking || !task.url}
                      className={`text-xs h-8 text-white ${discordStatus.ok === false ? "bg-orange-600 hover:bg-orange-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                      {discordStatus.checking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                      {discordStatus.ok === false ? "Check Again" : "Verify Bot"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Telegram Bot Helper ── */}
          {task.targetPlatform === "Telegram" && task.verificationType === "auto_social" && (
            <div className={`p-4 rounded-lg border text-sm transition-colors ${
              telegramStatus.ok === true ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800"
              : telegramStatus.ok === false ? "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800"
              : "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-900/20 dark:border-sky-800"
            }`}>
              {telegramStatus.ok === true ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span><strong>✅ Bot is admin.</strong> Auto-verification is enabled!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    {telegramStatus.ok === false
                      ? <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                      : <ShieldCheck className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />}
                    <div>
                      <strong className="block mb-1">{telegramStatus.ok === false ? "Bot is not an admin yet!" : "Action Required: Add Bot to Telegram"}</strong>
                      <p className="text-xs opacity-90">Add our bot to your channel/group as an administrator to enable auto-verification.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                    <Button type="button" variant="outline" size="sm" className="text-xs h-8 bg-white dark:bg-slate-900"
                      onClick={() => window.open(`https://t.me/${telegramStatus.botUsername || "FaucetDropsauth_bot"}?startgroup=true`, "_blank")}>
                      <Plus className="h-3 w-3 mr-1" /> Add Bot
                    </Button>
                    <Button type="button" size="sm" onClick={checkTelegram} disabled={telegramStatus.checking || !task.url}
                      className={`text-xs h-8 text-white ${telegramStatus.ok === false ? "bg-orange-600 hover:bg-orange-700" : "bg-sky-600 hover:bg-sky-700"}`}>
                      {telegramStatus.checking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                      {telegramStatus.ok === false ? "Check Again" : "Verify Bot"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          ON-CHAIN VERIFICATION ENGINE
      ══════════════════════════════════════════ */}
      {isOnchain && (
        <div className="p-4 rounded-lg border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/10 space-y-4">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> On-Chain Verification Engine
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requirement Type</Label>
            <Select value={task.action} onValueChange={(v) => patch({ action: v })}>
              <SelectTrigger className="h-10 bg-white dark:bg-slate-950 border-violet-200 dark:border-violet-800/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ONCHAIN_ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {showContractAddress && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Code className="h-3 w-3" /> Contract Address
                </Label>
                <Input value={task.targetContractAddress} placeholder="0x… (empty for native token)"
                  onChange={(e) => patch({ targetContractAddress: e.target.value })}
                  className="h-9 font-mono text-xs bg-white dark:bg-slate-950" />
              </div>
            )}
            {showMinAmount && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Min Amount</Label>
                <Input type="number" min={0} value={task.minAmount} placeholder="0"
                  onChange={(e) => patch({ minAmount: e.target.value })}
                  className="h-9 bg-white dark:bg-slate-950" />
              </div>
            )}
            {showMinTxCount && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Min TX Count</Label>
                <Input type="number" min={1} value={task.minTxCount} placeholder="10"
                  onChange={(e) => patch({ minTxCount: e.target.value })}
                  className="h-9 bg-white dark:bg-slate-950" />
              </div>
            )}
            {showMinDays && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Min Wallet Age (days)</Label>
                <Input type="number" min={1} value={task.minDays} placeholder="30"
                  onChange={(e) => patch({ minDays: e.target.value })}
                  className="h-9 bg-white dark:bg-slate-950" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Non-social, non-onchain: General Action + URL ── */}
      {!isSocial && !isOnchain && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</Label>
            <Select value={task.action} onValueChange={(v) => patch({ action: v })}>
              <SelectTrigger className="h-10 bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENERAL_ACTIONS.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference URL</Label>
            <Input value={task.url} placeholder="https://…"
              onChange={(e) => patch({ url: e.target.value })}
              className="h-10 font-mono text-xs bg-white dark:bg-slate-950" />
          </div>
        </div>
      )}

      {/* ── Target Handle for non-social manual tasks ── */}
      {["auto_social", "manual_link"].includes(task.verificationType) && !isSocial && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Target Handle / Role ID <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input value={task.targetHandle} placeholder="@handle or role ID"
            onChange={(e) => patch({ targetHandle: e.target.value })}
            className="h-10 bg-white dark:bg-slate-950" />
        </div>
      )}

      {/* ── Save / Cancel ── */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} className="min-w-[120px]">
          <Save className="h-4 w-4 mr-2" />
          {initial._isNew ? "Add Task" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function QuestEditPanel({
  questData,
  faucetAddress,
  creatorAddress,
  onQuestUpdated,
}: QuestEditPanelProps) {
  const [metaTitle, setMetaTitle] = useState(questData?.title ?? "");
  const [metaImage, setMetaImage] = useState(questData?.imageUrl ?? "");
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [tasks, setTasks] = useState<EditableTask[]>([]);
  const [isFetchingTasks, setIsFetchingTasks] = useState(true);
  const [isSavingTasks, setIsSavingTasks] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newTaskDraft, setNewTaskDraft] = useState<EditableTask | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [systemTaskCount, setSystemTaskCount] = useState(0);

  const defaultStageForNew = (): Stage => {
    if (tasks.length === 0) return "Beginner";
    return tasks[tasks.length - 1].stage ?? "Beginner";
  };

  // ── Load tasks ──
  useEffect(() => {
    if (!faucetAddress || !creatorAddress) return;
    const load = async () => {
      setIsFetchingTasks(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/tasks/editable?adminAddress=${creatorAddress}`);
        const json = await res.json();
        if (json.success) {
          const mapped: EditableTask[] = (json.userTasks ?? []).map((t: any) => ({
            id: t.id ?? `task_${Date.now()}`,
            title: t.title ?? "",
            description: t.description ?? "",
            points: Number(t.points ?? 50),
            required: t.required ?? true,
            category: t.category ?? "social",
            url: t.url ?? "",
            action: t.action ?? "follow",
            verificationType: t.verificationType ?? "manual_link",
            targetPlatform: t.targetPlatform ?? "",
            stage: (STAGES.includes(t.stage) ? t.stage : "Beginner") as Stage,
            targetHandle: t.targetHandle ?? "",
            targetContractAddress: t.targetContractAddress ?? "",
            minAmount: String(t.minAmount ?? ""),
            minTxCount: String(t.minTxCount ?? ""),
            minDays: String(t.minDays ?? ""),
          }));
          setTasks(mapped);
          setSystemTaskCount(json.systemTasksCount ?? 0);
        } else {
          toast.error("Could not load tasks");
        }
      } catch {
        toast.error("Failed to connect to server");
      } finally {
        setIsFetchingTasks(false);
      }
    };
    load();
  }, [faucetAddress, creatorAddress]);

  // ── Meta save ──
  const handleSaveMeta = async () => {
    if (!metaTitle.trim() || metaTitle.trim().length < 3) { toast.error("Title must be at least 3 characters"); return; }
    setIsSavingMeta(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminAddress: creatorAddress, title: metaTitle.trim(), imageUrl: metaImage.trim() || null }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Quest details saved!");
        onQuestUpdated?.({ title: metaTitle.trim(), imageUrl: metaImage.trim() });
      } else {
        toast.error(json.detail ?? "Save failed");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setIsSavingMeta(false);
    }
  };

  // ── Image upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE_URL}/upload-image`, { method: "POST", body: fd });
      const json = await res.json();
      const url = json.imageUrl ?? json.url;
      if (url) { setMetaImage(url); toast.success("Image uploaded!"); }
      else toast.error("Upload failed");
    } catch { toast.error("Upload error"); }
    finally { setIsUploadingImage(false); if (imageInputRef.current) imageInputRef.current.value = ""; }
  };

  // ── Task CRUD ──
  const startAddingTask = () => {
    const blank = makeBlankTask(defaultStageForNew());
    setNewTaskDraft(blank);
    setAddingNew(true);
    setEditingTaskId(null);
    setExpandedTask(null);
  };

  const handleNewTaskSave = (task: EditableTask) => {
    setTasks((prev) => [...prev, task]);
    setAddingNew(false);
    setNewTaskDraft(null);
    toast.success("Task added — click Save All Tasks to persist");
  };

  const startEditing = (id: string) => {
    setEditingTaskId(id);
    setAddingNew(false);
    setNewTaskDraft(null);
    setExpandedTask(null);
  };

  const handleEditSave = (updated: EditableTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTaskId(null);
    toast.success("Task updated — click Save All Tasks to persist");
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeleteCandidate(null);
    if (editingTaskId === id) setEditingTaskId(null);
    toast.success("Task removed");
  };

  const moveTask = (index: number, direction: "up" | "down") => {
    setTasks((prev) => {
      const next = [...prev];
      const swap = direction === "up" ? index - 1 : index + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  };

  const handleSaveTasks = async () => {
    for (const t of tasks) {
      if (!t.title.trim()) { toast.error("A task has no title — please fill it in"); return; }
      if (t.points < 0) { toast.error(`"${t.title}": points must be ≥ 0`); return; }
    }
    setIsSavingTasks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminAddress: creatorAddress,
          tasks: tasks.map(({ _isDirty, _isNew, ...t }) => t),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message ?? "Tasks saved!");
        setTasks((prev) => prev.map((t) => ({ ...t, _isDirty: false, _isNew: false })));
      } else {
        toast.error(json.detail ?? "Save failed");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Network error");
    } finally {
      setIsSavingTasks(false);
    }
  };

  const hasDirtyTasks = tasks.some((t) => t._isDirty || t._isNew) || addingNew;
  const metaChanged =
    metaTitle.trim() !== (questData?.title ?? "").trim() ||
    metaImage.trim() !== (questData?.imageUrl ?? "").trim();

  return (
    <div className="space-y-8">
      {/* ══════════════════════════════════════════════════
          SECTION 1 — QUEST META
      ══════════════════════════════════════════════════ */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-slate-500" /> Quest Details
              </CardTitle>
              <CardDescription className="mt-1">
                Edit the quest name and cover image.{" "}
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Reward pool &amp; token details cannot be changed post-deploy.
                </span>
              </CardDescription>
            </div>
            {metaChanged && (
              <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20 animate-pulse">
                Unsaved changes
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="meta-title" className="text-sm font-semibold">
              Quest Title <span className="text-red-500">*</span>
            </Label>
            <Input id="meta-title" value={metaTitle} maxLength={80} placeholder="e.g. DeFi Explorer Season 1"
              onChange={(e) => setMetaTitle(e.target.value)} className="h-11" />
            <p className="text-xs text-muted-foreground text-right">{metaTitle.length}/80</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Quest Cover Image</Label>
            <div className="flex gap-3">
              <Input value={metaImage} placeholder="https://..." onChange={(e) => setMetaImage(e.target.value)}
                className="h-11 flex-1 font-mono text-sm" />
              <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageUpload} />
              <Button variant="outline" className="h-11 px-4 shrink-0" onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage}>
                {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Upload</span>
              </Button>
            </div>
            {metaImage && (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-900">
                <img src={metaImage} alt="Preview" className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <button className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                  onClick={() => setMetaImage("")}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <Lock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-300">Locked after deployment:</strong>{" "}
              Reward pool, token address, token symbol, and distribution config.
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-end">
          <Button onClick={handleSaveMeta} disabled={isSavingMeta || !metaChanged} className="min-w-[140px]">
            {isSavingMeta ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Details
          </Button>
        </CardFooter>
      </Card>

      {/* ══════════════════════════════════════════════════
          SECTION 2 — TASK EDITOR
      ══════════════════════════════════════════════════ */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-slate-500" /> Quest Tasks
              </CardTitle>
              <CardDescription className="mt-1">
                Add, edit, or remove user tasks. Use templates to speed up task creation.
                System tasks (Daily Check-in, Referral) are locked and preserved automatically.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {systemTaskCount > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Lock className="h-3 w-3" />
                  {systemTaskCount} system task{systemTaskCount !== 1 ? "s" : ""} locked
                </Badge>
              )}
              {hasDirtyTasks && (
                <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20 animate-pulse text-xs">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {isFetchingTasks ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading tasks…</span>
            </div>
          ) : (
            <>
              {tasks.length === 0 && !addingNew && (
                <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <Plus className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-muted-foreground font-medium">No user tasks yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Click "Add Task" to create the first one.</p>
                </div>
              )}

              <div className="space-y-3">
                {tasks.map((task, idx) => (
                  <div key={task.id}>
                    <TaskRow
                      task={task}
                      index={idx}
                      total={tasks.length}
                      isExpanded={expandedTask === task.id && editingTaskId !== task.id}
                      isEditing={editingTaskId === task.id}
                      onToggle={() => {
                        if (editingTaskId === task.id) return;
                        setExpandedTask((prev) => (prev === task.id ? null : task.id));
                      }}
                      onEdit={() => startEditing(task.id)}
                      onMove={(dir) => moveTask(idx, dir)}
                      onDeleteRequest={() => setDeleteCandidate(task.id)}
                    />
                    {editingTaskId === task.id && (
                      <div className="mt-2">
                        <TaskForm
                          initial={task}
                          onSave={handleEditSave}
                          onCancel={() => setEditingTaskId(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* New task form */}
              {addingNew && newTaskDraft && (
                <div>
                  <div className="flex items-center gap-2 my-3">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">New Task</span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <TaskForm
                    initial={newTaskDraft}
                    onSave={handleNewTaskSave}
                    onCancel={() => { setAddingNew(false); setNewTaskDraft(null); }}
                  />
                </div>
              )}

              {!addingNew && (
                <Button variant="outline"
                  className="w-full border-dashed h-11 gap-2 hover:border-primary hover:text-primary transition-colors"
                  onClick={startAddingTask}>
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              )}
            </>
          )}
        </CardContent>

        {!isFetchingTasks && (
          <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {tasks.length} user task{tasks.length !== 1 ? "s" : ""}
            </p>
            <Button onClick={handleSaveTasks} disabled={isSavingTasks || (tasks.every((t) => !t._isDirty && !t._isNew) && !addingNew)} className="min-w-[160px]">
              {isSavingTasks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save All Tasks
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the task from the list. Click <strong>Save All Tasks</strong> to persist.
              Users who already completed this task keep their points.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteCandidate && deleteTask(deleteCandidate)}>
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── TaskRow ─────────────────────────────────────────────────

interface TaskRowProps {
  task: EditableTask;
  index: number;
  total: number;
  isExpanded: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMove: (dir: "up" | "down") => void;
  onDeleteRequest: () => void;
}

function TaskRow({ task, index, total, isExpanded, isEditing, onToggle, onEdit, onMove, onDeleteRequest }: TaskRowProps) {
  const stageColor = STAGE_COLORS[task.stage as Stage] ?? "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      isEditing ? "border-primary/60 shadow-md shadow-primary/10"
      : isExpanded ? "border-primary/30 shadow-sm"
      : task._isNew ? "border-green-400/50 bg-green-50/30 dark:bg-green-950/10"
      : task._isDirty ? "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/10"
      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
    }`}>
      <div className="flex items-center gap-3 p-4 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onMove("up"); }} disabled={index === 0}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-20 p-0.5">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <GripVertical className="h-4 w-4 text-slate-300" />
          <button onClick={(e) => { e.stopPropagation(); onMove("down"); }} disabled={index === total - 1}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-20 p-0.5">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm truncate ${!task.title ? "text-muted-foreground italic" : ""}`}>
              {task.title || "Untitled task"}
            </span>
            {task._isNew && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] h-4 px-1.5">New</Badge>}
            {task._isDirty && !task._isNew && <Badge variant="outline" className="border-amber-400 text-amber-600 text-[10px] h-4 px-1.5">Edited</Badge>}
            {isEditing && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] h-4 px-1.5">Editing</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={`text-[10px] h-5 px-2 ${stageColor}`}>{task.stage}</Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {verificationIcon(task.verificationType)}
              {task.verificationType.replace(/_/g, " ")}
            </span>
            <span className="text-xs font-bold text-primary">{task.points} pts</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10"
            onClick={onEdit} title="Edit task">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={onDeleteRequest}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Read-only expanded view */}
      {isExpanded && !isEditing && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            {task.description && (
              <div className="sm:col-span-3 text-foreground/80">{task.description}</div>
            )}
            <div><span>Category: </span><span className="font-medium text-foreground">{task.category}</span></div>
            <div><span>Action: </span><span className="font-medium text-foreground">{task.action}</span></div>
            {task.targetPlatform && <div><span>Platform: </span><span className="font-medium text-foreground">{task.targetPlatform}</span></div>}
            {task.url && <div className="sm:col-span-3 break-all"><span>URL: </span><span className="font-mono text-[11px] text-foreground">{task.url}</span></div>}
            {task.minAmount && <div><span>Min Amount: </span><span className="font-medium text-foreground">{task.minAmount}</span></div>}
            {task.minTxCount && <div><span>Min TX: </span><span className="font-medium text-foreground">{task.minTxCount}</span></div>}
            {task.minDays && <div><span>Min Days: </span><span className="font-medium text-foreground">{task.minDays}</span></div>}
          </div>
          <Button size="sm" variant="outline" className="mt-4 h-8 text-xs" onClick={onEdit}>
            <Edit2 className="h-3 w-3 mr-1" /> Edit Task
          </Button>
        </div>
      )}
    </div>
  );
}