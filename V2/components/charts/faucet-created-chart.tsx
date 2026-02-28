// ─── faucets-created-chart.tsx ────────────────────────────────────────────────
'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import { useDashboardContext } from "@/components/analytics-dashboard";

const NETWORK_COLORS: Record<string, string> = {
  Celo:      '#35D07F',
  Lisk:      '#0D4477',
  Arbitrum:  '#28A0F0',
  Base:      '#0052FF',
  BNB:       '#F3BA2F',
  Avalanche: '#E84142',
};

export function FaucetsCreatedChart() {
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Faucet Distribution</h3>
          <p className="text-sm text-muted-foreground">Across all networks</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold">{data.total_faucets.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Faucets</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data.network_faucets} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="network" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Bar dataKey="faucets" radius={[4, 4, 0, 0]}>
            {data.network_faucets.map((entry) => (
              <Cell key={entry.network} fill={NETWORK_COLORS[entry.network] ?? "#0052FF"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

