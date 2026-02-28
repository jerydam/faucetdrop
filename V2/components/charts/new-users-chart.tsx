

// ─── new-users-chart.tsx ──────────────────────────────────────────────────────
'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { useDashboardContext } from "@/components/analytics-dashboard";

export function NewUsersChart() {
  const { data, loading } = useDashboardContext();

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-4xl font-bold">{data.total_unique_users.toLocaleString()}</p>
        <p className="text-muted-foreground">Unique Users</p>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data.users_chart} margin={{ top: 8, right: 8, left: 0, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Bar dataKey="newUsers" fill="#0052FF" radius={[4, 4, 0, 0]} name="New Users" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

