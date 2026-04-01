"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { Droplets, PackageCheck, GraduationCap, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface AnalyticsData {
  faucet: FaucetAnalytics;
  quest:  QuestAnalytics;
  quiz:   QuizAnalytics;
  last_updated?: string;
}
export interface FaucetAnalytics {
  totalFaucets:    number;
  totalDrops:      number;
  uniqueUsers:     number;
  avgDropPerUser:  number;
  monthlyVolume:   { month: string; dropcode: number; droplist: number; custom: number }[];
  typeSplit:       { name: string; value: number }[];
  topNetworks:     { name: string; value: number }[];
  recentActivity:  { name: string; type: string; network: string; drops: number }[];
}
export interface QuestAnalytics {
  activeQuests:      number;
  completions:       number;
  participants:      number;
  avgTasksPerQuest:  number;
  weeklyCompletions: { week: string; completions: number; dropoffs: number }[];
  taskTypes:         { name: string; value: number }[];
  topQuests:         { name: string; value: number }[];
}
export interface QuizAnalytics {
  totalQuizzes:      number;
  attempts:          number;
  passRate:          number;
  avgScore:          number;
  scoreDistribution: { score: string; count: number; band: string }[];
  dailyAttempts:     { day: string; value: number }[];
  categories:        { name: string; value: number }[];
}

// Types for direct lists
export interface QuestItem {
  faucetAddress: string;
  title: string;
  isActive: boolean;
  isDraft: boolean;
  isFunded: boolean;
  totalParticipants: number;
  tasksCount: number;
  rewardPool: string;
  tokenSymbol: string;
}

export interface QuizItem {
  code: string;
  title: string;
  status: string; // waiting, active, finished
  playerCount: number;
  totalQuestions: number;
  reward?: {
    poolAmount: number;
    tokenSymbol: string;
  };
}

type Tab = "faucet" | "quest" | "quiz";

// ─── API config ────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ─── Mock / fallback data ──────────────────────────────────────────────────────
const EMPTY_FAUCET: FaucetAnalytics = {
  totalFaucets: 0, totalDrops: 0, uniqueUsers: 0, avgDropPerUser: 0,
  monthlyVolume: [], typeSplit: [], topNetworks: [], recentActivity: [],
};
const EMPTY_QUEST: QuestAnalytics = {
  activeQuests: 0, completions: 0, participants: 0, avgTasksPerQuest: 0,
  weeklyCompletions: [], taskTypes: [], topQuests: [],
};
const EMPTY_QUIZ: QuizAnalytics = {
  totalQuizzes: 0, attempts: 0, passRate: 0, avgScore: 0,
  scoreDistribution: [], dailyAttempts: [], categories: [],
};
const EMPTY_DATA: AnalyticsData = { faucet: EMPTY_FAUCET, quest: EMPTY_QUEST, quiz: EMPTY_QUIZ };

// ─── Colour palettes ───────────────────────────────────────────────────────────
const FAUCET_COLORS = {
  dropcode: "#378ADD", droplist: "#1D9E75", custom: "#BA7517",
  donut: ["#378ADD", "#1D9E75", "#BA7517"],
};
const QUEST_COLORS = {
  completions: "#7F77DD", dropoffs: "#D4537E",
  bars: ["#AFA9EC", "#9FE1CB", "#FAC775", "#F0997B", "#85B7EB"],
};
const QUIZ_COLORS = { fail: "#E24B4A", pass: "#BA7517", excellent: "#1D9E75", line: "#D4537E" };
const SCORE_BAND_COLOR: Record<string, string> = {
  fail: QUIZ_COLORS.fail, pass: QUIZ_COLORS.pass, excellent: QUIZ_COLORS.excellent,
};
const TYPE_PILL: Record<string, { bg: string; text: string }> = {
  DropCode: { bg: "#E6F1FB", text: "#185FA5" },
  DropList: { bg: "#E1F5EE", text: "#0F6E56" },
  Custom:   { bg: "#FAEEDA", text: "#854F0B" },
};

// ─── Shared helpers ────────────────────────────────────────────────────────────
function fmt(n: number): string { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString(); }
function pct(n: number): string { return `${n}%`; }
const TICK_STYLE  = { fontSize: 11, fill: "#888780" };
const GRID_STROKE = "rgba(136,135,128,0.15)";

// ─── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, trend }: {
  label: string; value: string | number; sub: string; trend: "up" | "down" | "neutral";
}) {
  const trendColor =
    trend === "up"   ? "text-green-700 dark:text-green-400" :
    trend === "down" ? "text-red-700 dark:text-red-400"     : "text-muted-foreground";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div className="bg-muted/40 rounded-xl p-4 flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-semibold text-foreground leading-none">{value}</span>
      <span className={`text-[11px] flex items-center gap-1 font-medium ${trendColor}`}>
        <TrendIcon className="h-3 w-3" />{sub}
      </span>
    </div>
  );
}

function ChartCard({ title, sub, children, className = "" }: {
  title: string; sub?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-card border border-border/60 rounded-xl p-5 flex flex-col gap-1 ${className}`}>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {sub && <span className="text-xs text-muted-foreground mb-4">{sub}</span>}
      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mb-3">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-[2px] flex-shrink-0" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function RankedList({ items, color }: { items: { name: string; value: number }[]; color: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col divide-y divide-border/40 mt-2">
      {items.map((item, i) => (
        <div key={item.name} className="flex items-center gap-3 py-2.5">
          <span className="text-[11px] text-muted-foreground w-4 font-mono">{i + 1}</span>
          <span className="text-xs font-medium text-foreground flex-1 truncate">{item.name}</span>
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, background: color }} />
          </div>
          <span className="text-xs font-semibold text-foreground min-w-[36px] text-right">{fmt(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed({ items }: { items: FaucetAnalytics["recentActivity"] }) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {items.map((item, idx) => {
        const pill = TYPE_PILL[item.type] || { bg: "#F1EFE8", text: "#5F5E5A" };
        return (
          <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-muted/20 text-xs">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
              style={{ background: pill.bg, color: pill.text }}>
              {item.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-medium text-foreground flex-1 truncate">{item.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
              style={{ background: pill.bg, color: pill.text }}>{item.type}</span>
            <span className="text-muted-foreground flex-shrink-0">{item.network}</span>
            <span className="font-semibold text-foreground flex-shrink-0">{item.drops} drops</span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
      <AlertCircle className="h-6 w-6 opacity-40" />
      <span className="text-xs">{message}</span>
    </div>
  );
}

// ─── Tab panels ────────────────────────────────────────────────────────────────
function FaucetPanel({ data }: { data: FaucetAnalytics }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Faucets"   value={data.totalFaucets}                sub="Active across all chains" trend="up" />
        <MetricCard label="Total Drops"     value={fmt(data.totalDrops)}             sub="Cumulative claim count"   trend="up" />
        <MetricCard label="Unique Users"    value={fmt(data.uniqueUsers)}            sub="Distinct claimers"        trend="up" />
        <MetricCard label="Avg Drop / User" value={data.avgDropPerUser.toFixed(2)}   sub="Claims per unique wallet" trend="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Monthly drop volume" sub="Token distributions by faucet type" className="lg:col-span-2">
          <Legend items={[
            { label: "DropCode", color: FAUCET_COLORS.dropcode },
            { label: "DropList", color: FAUCET_COLORS.droplist },
            { label: "Custom",   color: FAUCET_COLORS.custom },
          ]} />
          {data.monthlyVolume.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlyVolume} barSize={14} barGap={2}>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="month" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", backgroundColor: "var(--background)" }} formatter={(v: number) => [fmt(v)]} />
                <Bar dataKey="dropcode" stackId="a" fill={FAUCET_COLORS.dropcode} />
                <Bar dataKey="droplist" stackId="a" fill={FAUCET_COLORS.droplist} />
                <Bar dataKey="custom"   stackId="a" fill={FAUCET_COLORS.custom} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No monthly volume data yet" />}
        </ChartCard>

        <ChartCard title="Faucet type split" sub="Share of active faucets by type">
          {data.typeSplit.length ? (
            <>
              <Legend items={data.typeSplit.map((t, i) => ({ label: `${t.name} ${t.value}%`, color: FAUCET_COLORS.donut[i] }))} />
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.typeSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {data.typeSplit.map((_, idx) => <Cell key={idx} fill={FAUCET_COLORS.donut[idx]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: "var(--background)" }} formatter={(v: number) => [`${v}%`]} />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : <EmptyState message="No type data yet" />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top networks by volume" sub="Total drops by chain">
          {data.topNetworks.length
            ? <RankedList items={data.topNetworks} color={FAUCET_COLORS.dropcode} />
            : <EmptyState message="No network data yet" />}
        </ChartCard>
        <ChartCard title="Recent activity" sub="Latest drops across all faucets">
          {data.recentActivity.length
            ? <ActivityFeed items={data.recentActivity} />
            : <EmptyState message="No recent activity yet" />}
        </ChartCard>
      </div>
    </div>
  );
}

function QuestPanel({ data, questsList }: { data: QuestAnalytics, questsList: QuestItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Active Quests"     value={data.activeQuests}                sub="Currently live"           trend="up" />
        <MetricCard label="Completions"       value={fmt(data.completions)}            sub="Total quest completions"  trend="up" />
        <MetricCard label="Participants"      value={fmt(data.participants)}           sub="Unique participants"       trend="up" />
        <MetricCard label="Avg Tasks / Quest" value={data.avgTasksPerQuest.toFixed(1)} sub="Mean task count"          trend="neutral" />
      </div>

      <ChartCard title="Quest completions by week" sub="Completions vs drop-offs">
        <Legend items={[
          { label: "Completions", color: QUEST_COLORS.completions },
          { label: "Drop-offs",   color: QUEST_COLORS.dropoffs },
        ]} />
        {data.weeklyCompletions.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.weeklyCompletions}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="week" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: "var(--background)" }} formatter={(v: number) => [fmt(v)]} />
              <Line type="monotone" dataKey="completions" stroke={QUEST_COLORS.completions} strokeWidth={2} dot={{ r: 3, fill: QUEST_COLORS.completions }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="dropoffs"    stroke={QUEST_COLORS.dropoffs}    strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: QUEST_COLORS.dropoffs }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyState message="No weekly completion data yet" />}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Task type breakdown" sub="Most common task actions">
          {data.taskTypes.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.taskTypes} layout="vertical" barSize={14}>
                <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                <XAxis type="number" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={TICK_STYLE} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: "var(--background)" }} formatter={(v: number) => [v]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.taskTypes.map((_, idx) => <Cell key={idx} fill={QUEST_COLORS.bars[idx % QUEST_COLORS.bars.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No task type data yet" />}
        </ChartCard>
        <ChartCard title="Top quests by participation" sub="Most engaged quests">
          {data.topQuests.length
            ? <RankedList items={data.topQuests} color={QUEST_COLORS.completions} />
            : <EmptyState message="No quest data yet" />}
        </ChartCard>
      </div>

      {/* Direct Backend Data Table */}
      <ChartCard title="All Platform Quests" sub="Direct index of all campaigns">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase border-b border-border/40">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Participants</th>
                <th className="px-4 py-3 font-medium">Tasks</th>
                <th className="px-4 py-3 font-medium">Reward Pool</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {questsList.length > 0 ? (
                questsList.map((quest, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{quest.title || "Untitled Quest"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                        quest.isDraft ? "bg-gray-500/20 text-gray-400" :
                        quest.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {quest.isDraft ? "Draft" : quest.isActive ? "Active" : "Ended"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{fmt(quest.totalParticipants)}</td>
                    <td className="px-4 py-3">{quest.tasksCount}</td>
                    <td className="px-4 py-3 font-mono text-xs">{quest.rewardPool} {quest.tokenSymbol}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No quests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function QuizPanel({ data, quizzesList }: { data: QuizAnalytics, quizzesList: QuizItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Quizzes" value={data.totalQuizzes}          sub="Deployed quizzes"       trend="up" />
        <MetricCard label="Attempts"      value={fmt(data.attempts)}         sub="Total submissions"      trend="up" />
        <MetricCard label="Pass Rate"     value={pct(data.passRate)}         sub="Score ≥ 6 / 10"         trend={data.passRate >= 60 ? "up" : "down"} />
        <MetricCard label="Avg Score"     value={data.avgScore.toFixed(1)}   sub="Mean across all quizzes" trend="neutral" />
      </div>

      <ChartCard title="Score distribution" sub="How participants scored across all quizzes (0–10)">
        <Legend items={[
          { label: "Fail (0–5)",      color: QUIZ_COLORS.fail },
          { label: "Pass (6–7)",      color: QUIZ_COLORS.pass },
          { label: "Excellent (8–10)", color: QUIZ_COLORS.excellent },
        ]} />
        {data.scoreDistribution.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.scoreDistribution} barSize={22}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="score" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: "var(--background)" }} formatter={(v: number) => [fmt(v), "Participants"]} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {data.scoreDistribution.map((entry, idx) => <Cell key={idx} fill={SCORE_BAND_COLOR[entry.band] ?? QUIZ_COLORS.pass} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState message="No score data yet" />}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Daily attempts" sub="Quiz attempt volume by day of week">
          {data.dailyAttempts.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.dailyAttempts}>
                <defs>
                  <linearGradient id="quizGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={QUIZ_COLORS.line} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={QUIZ_COLORS.line} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="day" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: "var(--background)" }} formatter={(v: number) => [fmt(v), "Attempts"]} />
                <Area type="monotone" dataKey="value" stroke={QUIZ_COLORS.line} strokeWidth={2} fill="url(#quizGrad)" dot={{ r: 3, fill: QUIZ_COLORS.line }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No daily attempt data yet" />}
        </ChartCard>
        <ChartCard title="Top quiz categories" sub="Attempts by topic">
          {data.categories.length
            ? <RankedList items={data.categories} color={QUIZ_COLORS.line} />
            : <EmptyState message="No category data yet" />}
        </ChartCard>
      </div>

      {/* Direct Backend Data Table */}
      <ChartCard title="All Platform Quizzes" sub="Direct index of all game rooms">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase border-b border-border/40">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Players</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Reward Pool</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {quizzesList.length > 0 ? (
                quizzesList.map((quiz, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">{quiz.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground truncate max-w-[200px]">{quiz.title || "Untitled"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold capitalize ${
                        quiz.status === "waiting" ? "bg-yellow-500/20 text-yellow-500" :
                        quiz.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                      }`}>
                        {quiz.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{fmt(quiz.playerCount)}</td>
                    <td className="px-4 py-3">{quiz.totalQuestions}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {quiz.reward ? `${quiz.reward.poolAmount} ${quiz.reward.tokenSymbol}` : "None"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No quizzes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/60" />)}
      </div>
      <div className="h-64 rounded-xl bg-muted/60" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-48 rounded-xl bg-muted/60" />
        <div className="h-48 rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
const TAB_CONFIG: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "faucet", label: "Faucets",  icon: Droplets    },
  { id: "quest",  label: "Quests",   icon: PackageCheck },
  { id: "quiz",   label: "Quizzes",  icon: GraduationCap },
];

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab]   = useState<Tab>("faucet");
  const [data, setData]             = useState<AnalyticsData>(EMPTY_DATA);
  const [questsList, setQuestsList] = useState<QuestItem[]>([]);
  const [quizzesList, setQuizzesList] = useState<QuizItem[]>([]);
  
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (isManual = false) => {
    try {
      isManual ? setRefreshing(true) : setLoading(true);
      setError(null);

      // Fetch aggregated analytics and direct lists simultaneously
      const [analyticsRes, questsRes, quizzesRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics`, { signal: AbortSignal.timeout(30_000) }),
        fetch(`${API_BASE}/api/quests`, { signal: AbortSignal.timeout(15_000) }).catch(() => null),
        fetch(`${API_BASE}/api/quiz/list`, { signal: AbortSignal.timeout(15_000) }).catch(() => null)
      ]);

      if (!analyticsRes.ok) throw new Error(`HTTP ${analyticsRes.status}: ${analyticsRes.statusText}`);

      const json = await analyticsRes.json();
      
      // Parse lists safely (they might be null if the fetch failed)
      const questsJson = questsRes?.ok ? await questsRes.json() : { quests: [] };
      const quizzesJson = quizzesRes?.ok ? await quizzesRes.json() : { quizzes: [] };

      // Merge with empty defaults so the UI never crashes on missing fields
      setData({
        faucet: { ...EMPTY_FAUCET, ...(json.faucet ?? {}) },
        quest:  { ...EMPTY_QUEST,  ...(json.quest  ?? {}) },
        quiz:   { ...EMPTY_QUIZ,   ...(json.quiz   ?? {}) },
      });
      
      setQuestsList(questsJson.quests || []);
      setQuizzesList(quizzesJson.quizzes || []);
      setLastUpdated(json.last_updated ?? null);

    } catch (err: any) {
      const msg = err?.name === "TimeoutError"
        ? "Request timed out — the backend may be waking up. Try again in a moment."
        : (err?.message ?? "Failed to fetch analytics");
      setError(msg);
      // Keep whatever data we already had (don't wipe on refresh failure)
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const formattedUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Analytics</p>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Platform Performance</h2>
          {formattedUpdated && !loading && (
            <p className="text-[11px] text-muted-foreground mt-0.5">Updated {formattedUpdated}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-all"
            title="Refresh analytics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60">
            {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={[
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  activeTab === id
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 mb-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium">Could not load analytics — </span>{error}
          </div>
          <button onClick={() => fetchAnalytics(true)} className="text-xs underline underline-offset-2 flex-shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : (
        <div className={refreshing ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
          {activeTab === "faucet" && <FaucetPanel data={data.faucet} />}
          {activeTab === "quest"  && <QuestPanel  data={data.quest}  questsList={questsList} />}
          {activeTab === "quiz"   && <QuizPanel   data={data.quiz}   quizzesList={quizzesList} />}
        </div>
      )}
    </section>
  );
}