"use client";
// app/admin/visits/page.tsx  (or wherever your admin section lives)
// Shows daily / weekly / monthly visit charts + top pages.

import React, { useState, useEffect } from "react";
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Users, LayoutGrid, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE_URL = "https://xeric-gwendolen-faucetdrops-4f72016d.koyeb.app";

interface DailyPoint  { date: string;  visits: number }
interface WeeklyPoint { week: string;  visits: number }
interface MonthlyPoint{ month: string; visits: number }
interface TopPage     { path: string;  visits: number }

interface VisitStats {
    daily:           DailyPoint[];
    weekly:          WeeklyPoint[];
    monthly:         MonthlyPoint[];
    top_pages:       TopPage[];
    total:           number;
    unique_visitors: number | null;
    period_days:     number;
}

type Period = "daily" | "weekly" | "monthly";
type Range  = 7 | 30 | 90 | 365;

const RANGE_LABELS: Record<Range, string> = {
    7:   "Last 7 days",
    30:  "Last 30 days",
    90:  "Last 90 days",
    365: "Last year",
};

/** Format axis labels per period */
const formatLabel = (period: Period, key: string): string => {
    if (period === "daily") {
        const d = new Date(key + "T00:00:00");
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    if (period === "weekly") {
        // "2025-W22" → "W22"
        return key.split("-")[1] ?? key;
    }
    // "2025-06" → "Jun 2025"
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};

export default function VisitsDashboard() {
    const [stats, setStats]       = useState<VisitStats | null>(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const [period, setPeriod]     = useState<Period>("daily");
    const [range, setRange]       = useState<Range>(30);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/visit-stats?days=${range}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: VisitStats = await res.json();
            setStats(data);
        } catch (e: any) {
            setError(e.message ?? "Failed to load visit stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, [range]);

    // Build chart data for the active period
    const chartData = stats
        ? (period === "daily"
            ? stats.daily.map(d => ({ key: d.date,  visits: d.visits, label: formatLabel("daily",   d.date)  }))
            : period === "weekly"
            ? stats.weekly.map(d => ({ key: d.week,  visits: d.visits, label: formatLabel("weekly",  d.week)  }))
            : stats.monthly.map(d => ({ key: d.month, visits: d.visits, label: formatLabel("monthly", d.month) }))
          )
        : [];

    const totalInPeriod = chartData.reduce((s, d) => s + d.visits, 0);
    const avgPerPoint   = chartData.length ? Math.round(totalInPeriod / chartData.length) : 0;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Visit Analytics</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Website traffic — {RANGE_LABELS[range]}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {([7, 30, 90, 365] as Range[]).map(r => (
                        <Button
                            key={r}
                            size="sm"
                            variant={range === r ? "default" : "outline"}
                            onClick={() => setRange(r)}
                            className="text-xs"
                        >
                            {RANGE_LABELS[r]}
                        </Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={fetchStats} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: "Total visits",
                        value: stats?.total.toLocaleString() ?? "—",
                        icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
                        bg:   "bg-blue-50 dark:bg-blue-950/30",
                    },
                    {
                        label: "Unique visitors",
                        value: stats?.unique_visitors != null
                            ? stats.unique_visitors.toLocaleString()
                            : "—",
                        icon: <Users className="h-5 w-5 text-purple-500" />,
                        bg:   "bg-purple-50 dark:bg-purple-950/30",
                    },
                    {
                        label: `Avg per ${period === "daily" ? "day" : period === "weekly" ? "week" : "month"}`,
                        value: loading ? "—" : avgPerPoint.toLocaleString(),
                        icon: <Calendar className="h-5 w-5 text-emerald-500" />,
                        bg:   "bg-emerald-50 dark:bg-emerald-950/30",
                    },
                    {
                        label: "Top page visits",
                        value: stats?.top_pages[0]?.visits.toLocaleString() ?? "—",
                        icon: <LayoutGrid className="h-5 w-5 text-orange-500" />,
                        bg:   "bg-orange-50 dark:bg-orange-950/30",
                        sub:  stats?.top_pages[0]?.path,
                    },
                ].map(c => (
                    <Card key={c.label} className={cn("p-4 border-0", c.bg)}>
                        <div className="flex items-center gap-2 mb-1">
                            {c.icon}
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                {c.label}
                            </span>
                        </div>
                        <p className="text-2xl font-bold">{c.value}</p>
                        {c.sub && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.sub}</p>
                        )}
                    </Card>
                ))}
            </div>

            {/* Period toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit border dark:border-slate-700">
                {(["daily", "weekly", "monthly"] as Period[]).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-sm font-semibold transition-all capitalize",
                            period === p
                                ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* Main chart */}
            <Card className="p-6">
                <h2 className="text-base font-semibold mb-4">
                    Visits — {period.charAt(0).toUpperCase() + period.slice(1)}
                </h2>
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2">
                        <p className="text-sm">{error}</p>
                        <Button size="sm" variant="outline" onClick={fetchStats}>Retry</Button>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                        No visits recorded in this period.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    border: "1px solid var(--border)",
                                    fontSize: 12,
                                }}
                                formatter={(v: number) => [v.toLocaleString(), "Visits"]}
                            />
                            <Line
                                type="monotone"
                                dataKey="visits"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "#3b82f6" }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Card>

            {/* Top pages */}
            {stats && stats.top_pages.length > 0 && (
                <Card className="p-6">
                    <h2 className="text-base font-semibold mb-4">Top pages</h2>
                    <div className="space-y-2">
                        {stats.top_pages.map((page, i) => {
                            const pct = Math.round((page.visits / (stats.top_pages[0]?.visits || 1)) * 100);
                            return (
                                <div key={page.path} className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-mono truncate text-foreground">
                                                {page.path}
                                            </span>
                                            <span className="text-sm font-semibold text-foreground ml-4 shrink-0">
                                                {page.visits.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className="h-1.5 rounded-full bg-blue-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}