"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Droplets, PackageCheck, GraduationCap, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  faucet: FaucetAnalytics;
  quest: QuestAnalytics;
  quiz: QuizAnalytics;
}

interface FaucetAnalytics {
  totalFaucets: number;
  totalDrops: number;
  uniqueUsers: number;
  avgDropPerUser: number;
  monthlyVolume: { month: string; dropcode: number; droplist: number; custom: number }[];
  typeSplit: { name: string; value: number }[];
  topNetworks: { name: string; value: number }[];
  recentActivity: { name: string; type: string; network: string; drops: number }[];
}

interface QuestAnalytics {
  activeQuests: number;
  completions: number;
  participants: number;
  avgTasksPerQuest: number;
  weeklyCompletions: { week: string; completions: number; dropoffs: number }[];
  taskTypes: { name: string; value: number }[];
  topQuests: { name: string; value: number }[];
}

interface QuizAnalytics {
  totalQuizzes: number;
  attempts: number;
  passRate: number;
  avgScore: number;
  scoreDistribution: { score: string; count: number; band: string }[];
  dailyAttempts: { day: string; value: number }[];
  categories: { name: string; value: number }[];
}

type Tab = "faucet" | "quest" | "quiz";

// ─── Mock data (replace with real API calls) ──────────────────────────────────

const MOCK_DATA: AnalyticsData = {
  faucet: {
    totalFaucets: 147,
    totalDrops: 84200,
    uniqueUsers: 31500,
    avgDropPerUser: 2.67,
    monthlyVolume: [
      { month: "Aug", dropcode: 5200, droplist: 3100, custom: 1200 },
      { month: "Sep", dropcode: 6100, droplist: 3400, custom: 1800 },
      { month: "Oct", dropcode: 7800, droplist: 4200, custom: 2100 },
      { month: "Nov", dropcode: 8400, droplist: 5100, custom: 2400 },
      { month: "Dec", dropcode: 9200, droplist: 5600, custom: 2800 },
      { month: "Jan", dropcode: 10100, droplist: 5900, custom: 3100 },
      { month: "Feb", dropcode: 11400, droplist: 6800, custom: 3500 },
    ],
    typeSplit: [
      { name: "DropCode", value: 52 },
      { name: "DropList", value: 31 },
      { name: "Custom", value: 17 },
    ],
    topNetworks: [
      { name: "Celo", value: 24100 },
      { name: "Base", value: 19800 },
      { name: "BNB Chain", value: 14200 },
      { name: "Arbitrum", value: 9600 },
      { name: "Lisk", value: 6100 },
    ],
    recentActivity: [
      { name: "ETH Global Faucet", type: "DropCode", network: "Base", drops: 128 },
      { name: "Celo Dev Fund", type: "DropList", network: "Celo", drops: 94 },
      { name: "Nigeria Web3", type: "Custom", network: "BNB", drops: 61 },
      { name: "Base Ecosystem", type: "DropCode", network: "Base", drops: 49 },
      { name: "ZK Hack Fund", type: "DropList", network: "Arbitrum", drops: 38 },
    ],
  },
  quest: {
    activeQuests: 34,
    completions: 12800,
    participants: 9200,
    avgTasksPerQuest: 4.1,
    weeklyCompletions: [
      { week: "W1", completions: 820, dropoffs: 310 },
      { week: "W2", completions: 1040, dropoffs: 280 },
      { week: "W3", completions: 980, dropoffs: 340 },
      { week: "W4", completions: 1320, dropoffs: 290 },
      { week: "W5", completions: 1580, dropoffs: 260 },
      { week: "W6", completions: 1890, dropoffs: 320 },
      { week: "W7", completions: 1740, dropoffs: 280 },
      { week: "W8", completions: 2100, dropoffs: 250 },
    ],
    taskTypes: [
      { name: "Follow", value: 68 },
      { name: "Join", value: 54 },
      { name: "Like", value: 41 },
      { name: "Retweet", value: 29 },
      { name: "Subscribe", value: 18 },
    ],
    topQuests: [
      { name: "ETH Global Quest", value: 2620 },
      { name: "Nigeria Web3 Q1", value: 2410 },
      { name: "Africa Blockchain", value: 2290 },
      { name: "ZK Hack Series", value: 2110 },
      { name: "DeFi Africa Intro", value: 1970 },
    ],
  },
  quiz: {
    totalQuizzes: 61,
    attempts: 28400,
    passRate: 68,
    avgScore: 7.2,
    scoreDistribution: [
      { score: "0", count: 180, band: "fail" },
      { score: "1", count: 240, band: "fail" },
      { score: "2", count: 390, band: "fail" },
      { score: "3", count: 520, band: "fail" },
      { score: "4", count: 810, band: "fail" },
      { score: "5", count: 1240, band: "fail" },
      { score: "6", count: 2100, band: "pass" },
      { score: "7", count: 3800, band: "pass" },
      { score: "8", count: 4600, band: "excellent" },
      { score: "9", count: 3200, band: "excellent" },
      { score: "10", count: 1900, band: "excellent" },
    ],
    dailyAttempts: [
      { day: "Mon", value: 680 },
      { day: "Tue", value: 920 },
      { day: "Wed", value: 1100 },
      { day: "Thu", value: 880 },
      { day: "Fri", value: 1340 },
      { day: "Sat", value: 1820 },
      { day: "Sun", value: 940 },
    ],
    categories: [
      { name: "DeFi Basics", value: 8400 },
      { name: "Smart Contracts", value: 6100 },
      { name: "Web3 Security", value: 4800 },
      { name: "ZK Proofs", value: 3200 },
      { name: "Layer 2 Tech", value: 2100 },
    ],
  },
};

// ─── Colour palettes ──────────────────────────────────────────────────────────

const FAUCET_COLORS = {
  dropcode: "#378ADD",
  droplist: "#1D9E75",
  custom: "#BA7517",
  donut: ["#378ADD", "#1D9E75", "#BA7517"],
};

const QUEST_COLORS = {
  completions: "#7F77DD",
  dropoffs: "#D4537E",
  bars: ["#AFA9EC", "#9FE1CB", "#FAC775", "#F0997B", "#85B7EB"],
};

const QUIZ_COLORS = {
  fail: "#E24B4A",
  pass: "#BA7517",
  excellent: "#1D9E75",
  line: "#D4537E",
};

const SCORE_BAND_COLOR: Record<string, string> = {
  fail: QUIZ_COLORS.fail,
  pass: QUIZ_COLORS.pass,
  excellent: QUIZ_COLORS.excellent,
};

const TYPE_PILL: Record<string, { bg: string; text: string }> = {
  DropCode: { bg: "#E6F1FB", text: "#185FA5" },
  DropList: { bg: "#E1F5EE", text: "#0F6E56" },
  Custom: { bg: "#FAEEDA", text: "#854F0B" },
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function pct(n: number): string {
  return `${n}%`;
}

const TICK_STYLE = { fontSize: 11, fill: "#888780" };

const GRID_STROKE = "rgba(136,135,128,0.15)";

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string | number;
  sub: string;
  trend: "up" | "down" | "neutral";
}) {
  const trendColor =
    trend === "up"
      ? "text-green-700 dark:text-green-400"
      : trend === "down"
      ? "text-red-700 dark:text-red-400"
      : "text-muted-foreground";

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className="bg-muted/40 rounded-xl p-4 flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-semibold text-foreground leading-none">
        {value}
      </span>
      <span className={`text-[11px] flex items-center gap-1 font-medium ${trendColor}`}>
        <TrendIcon className="h-3 w-3" />
        {sub}
      </span>
    </div>
  );
}

function ChartCard({
  title,
  sub,
  children,
  className = "",
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card border border-border/60 rounded-xl p-5 flex flex-col gap-1 ${className}`}
    >
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {sub && <span className="text-xs text-muted-foreground mb-2">{sub}</span>}
      {children}
    </div>
  );
}

function Legend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-3">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <span
            className="inline-block w-2 h-2 rounded-[2px] flex-shrink-0"
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function RankedList({
  items,
  color,
}: {
  items: { name: string; value: number }[];
  color: string;
}) {
  const max = Math.max(...items.map((i) => i.value));
  return (
    <div className="flex flex-col divide-y divide-border/40 mt-2">
      {items.map((item, i) => (
        <div key={item.name} className="flex items-center gap-3 py-2.5">
          <span className="text-[11px] text-muted-foreground w-4 font-mono">
            {i + 1}
          </span>
          <span className="text-xs font-medium text-foreground flex-1 truncate">
            {item.name}
          </span>
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: color,
              }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground min-w-[36px] text-right">
            {fmt(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed({
  items,
}: {
  items: FaucetAnalytics["recentActivity"];
}) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {items.map((item) => {
        const pill = TYPE_PILL[item.type] || { bg: "#F1EFE8", text: "#5F5E5A" };
        return (
          <div
            key={item.name}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-muted/20 text-xs"
          >
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
              style={{ background: pill.bg, color: pill.text }}
            >
              {item.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-medium text-foreground flex-1 truncate">
              {item.name}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
              style={{ background: pill.bg, color: pill.text }}
            >
              {item.type}
            </span>
            <span className="text-muted-foreground flex-shrink-0">
              {item.network}
            </span>
            <span className="font-semibold text-foreground flex-shrink-0">
              {item.drops} drops
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function FaucetPanel({ data }: { data: FaucetAnalytics }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Faucets" value={data.totalFaucets} sub="+12 this month" trend="up" />
        <MetricCard label="Total Drops" value={fmt(data.totalDrops)} sub="+18% vs last mo." trend="up" />
        <MetricCard label="Unique Users" value={fmt(data.uniqueUsers)} sub="+9% vs last mo." trend="up" />
        <MetricCard label="Avg Drop / User" value={data.avgDropPerUser.toFixed(2)} sub="-4% vs last mo." trend="down" />
      </div>

      {/* Volume + Type split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Monthly drop volume"
          sub="Token distributions over last 7 months"
          className="lg:col-span-2"
        >
          <Legend
            items={[
              { label: "DropCode", color: FAUCET_COLORS.dropcode },
              { label: "DropList", color: FAUCET_COLORS.droplist },
              { label: "Custom", color: FAUCET_COLORS.custom },
            ]}
          />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthlyVolume} barSize={14} barGap={2}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)" }}
                formatter={(v: number) => [fmt(v)]}
              />
              <Bar dataKey="dropcode" stackId="a" fill={FAUCET_COLORS.dropcode} radius={[0, 0, 0, 0]} />
              <Bar dataKey="droplist" stackId="a" fill={FAUCET_COLORS.droplist} radius={[0, 0, 0, 0]} />
              <Bar dataKey="custom" stackId="a" fill={FAUCET_COLORS.custom} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Faucet type split" sub="Share of active faucets by type">
          <Legend
            items={[
              { label: "DropCode 52%", color: FAUCET_COLORS.dropcode },
              { label: "DropList 31%", color: FAUCET_COLORS.droplist },
              { label: "Custom 17%", color: FAUCET_COLORS.custom },
            ]}
          />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data.typeSplit}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                paddingAngle={2}
              >
                {data.typeSplit.map((_, idx) => (
                  <Cell key={idx} fill={FAUCET_COLORS.donut[idx]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => [`${v}%`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Networks + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top networks by volume" sub="Total drops by chain this month">
          <RankedList items={data.topNetworks} color={FAUCET_COLORS.dropcode} />
        </ChartCard>

        <ChartCard title="Recent activity" sub="Latest drops across all faucets">
          <ActivityFeed items={data.recentActivity} />
        </ChartCard>
      </div>
    </div>
  );
}

function QuestPanel({ data }: { data: QuestAnalytics }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Active Quests" value={data.activeQuests} sub="+5 this month" trend="up" />
        <MetricCard label="Completions" value={fmt(data.completions)} sub="+31% vs last mo." trend="up" />
        <MetricCard label="Participants" value={fmt(data.participants)} sub="+22% vs last mo." trend="up" />
        <MetricCard label="Avg Tasks / Quest" value={data.avgTasksPerQuest.toFixed(1)} sub="+0.3 vs last mo." trend="up" />
      </div>

      {/* Weekly trend */}
      <ChartCard title="Quest completions by week" sub="Completions vs drop-offs over 8 weeks">
        <Legend
          items={[
            { label: "Completions", color: QUEST_COLORS.completions },
            { label: "Drop-offs", color: QUEST_COLORS.dropoffs },
          ]}
        />
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.weeklyCompletions}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="week" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(v: number) => [fmt(v)]}
            />
            <Line
              type="monotone"
              dataKey="completions"
              stroke={QUEST_COLORS.completions}
              strokeWidth={2}
              dot={{ r: 3, fill: QUEST_COLORS.completions }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="dropoffs"
              stroke={QUEST_COLORS.dropoffs}
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: QUEST_COLORS.dropoffs }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Task types + Top quests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Task type breakdown" sub="Most common task actions configured">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.taskTypes} layout="vertical" barSize={14}>
              <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => [v]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.taskTypes.map((_, idx) => (
                  <Cell key={idx} fill={QUEST_COLORS.bars[idx % QUEST_COLORS.bars.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top quests by participation" sub="Most engaged quests this month">
          <RankedList items={data.topQuests} color={QUEST_COLORS.completions} />
        </ChartCard>
      </div>
    </div>
  );
}

function QuizPanel({ data }: { data: QuizAnalytics }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Quizzes" value={data.totalQuizzes} sub="+8 this month" trend="up" />
        <MetricCard label="Attempts" value={fmt(data.attempts)} sub="+44% vs last mo." trend="up" />
        <MetricCard label="Pass Rate" value={pct(data.passRate)} sub="-3% vs last mo." trend="down" />
        <MetricCard label="Avg Score" value={data.avgScore.toFixed(1)} sub="+0.4 vs last mo." trend="up" />
      </div>

      {/* Score distribution */}
      <ChartCard title="Score distribution" sub="How participants scored across all quizzes (0–10)">
        <Legend
          items={[
            { label: "Fail (0–5)", color: QUIZ_COLORS.fail },
            { label: "Pass (6–7)", color: QUIZ_COLORS.pass },
            { label: "Excellent (8–10)", color: QUIZ_COLORS.excellent },
          ]}
        />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.scoreDistribution} barSize={22}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="score" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(v: number) => [fmt(v), "Participants"]}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.scoreDistribution.map((entry, idx) => (
                <Cell key={idx} fill={SCORE_BAND_COLOR[entry.band]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Daily attempts + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Daily attempts" sub="Quiz attempt volume by day of week">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.dailyAttempts}>
              <defs>
                <linearGradient id="quizGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={QUIZ_COLORS.line} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={QUIZ_COLORS.line} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="day" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => [fmt(v), "Attempts"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={QUIZ_COLORS.line}
                strokeWidth={2}
                fill="url(#quizGrad)"
                dot={{ r: 3, fill: QUIZ_COLORS.line }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top quiz categories" sub="Attempts by topic">
          <RankedList items={data.categories} color={QUIZ_COLORS.line} />
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TAB_CONFIG: {
  id: Tab;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "faucet", label: "Faucets", icon: Droplets },
  { id: "quest", label: "Quests", icon: PackageCheck },
  { id: "quiz", label: "Quizzes", icon: GraduationCap },
];

interface AnalyticsDashboardProps {
  /**
   * Pass real data from your API here.
   * Falls back to mock data when undefined.
   */
  data?: AnalyticsData;
  /**
   * Show a loading skeleton while parent is fetching data.
   */
  loading?: boolean;
}

export default function AnalyticsDashboard({
  data = MOCK_DATA,
  loading = false,
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("faucet");

  return (
    <section className="w-full">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Analytics
          </p>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Platform Performance
          </h2>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 w-fit">
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

      {/* Loading skeleton */}
      {loading ? (
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/60" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-muted/60" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 rounded-xl bg-muted/60" />
            <div className="h-48 rounded-xl bg-muted/60" />
          </div>
        </div>
      ) : (
        <div>
          {activeTab === "faucet" && <FaucetPanel data={data.faucet} />}
          {activeTab === "quest" && <QuestPanel data={data.quest} />}
          {activeTab === "quiz" && <QuizPanel data={data.quiz} />}
        </div>
      )}
    </section>
  );
}

// ─── Named export of types for external use ───────────────────────────────────
export type { AnalyticsData, FaucetAnalytics, QuestAnalytics, QuizAnalytics };