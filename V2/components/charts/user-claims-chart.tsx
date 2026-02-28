

// ─── user-claims-chart.tsx ────────────────────────────────────────────────────
'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardContext } from "@/components/analytics-dashboard";

const COLORS = ["#0052FF", "#35D07F", "#FFBB28", "#FF8042", "#8884d8", "#00C49F", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"];

const BLOCK_EXPLORERS: Record<string, string> = {
  Celo:      "https://celoscan.io/address/",
  Lisk:      "https://blockscout.lisk.com/address/",
  Arbitrum:  "https://arbiscan.io/address/",
  Base:      "https://basescan.org/address/",
  BNB:       "https://bscscan.com/address/",
  Avalanche: "https://snowtrace.io/address/",
};

export function UserClaimsChart() {
  const { data, loading } = useDashboardContext();

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium text-sm">{d.name}</p>
          <p className="text-sm">Drops: <span className="font-bold">{d.value.toLocaleString()}</span></p>
          {d.network && <p className="text-xs text-muted-foreground">{d.network}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{data.total_claims.toLocaleString()}</h2>
        <p className="text-muted-foreground">Total Drops</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Faucets by Drops</CardTitle>
            <CardDescription>Distribution of all claims</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>
                <Pie
                  data={data.claims_pie_data}
                  cx="50%" cy="50%"
                  outerRadius={140}
                  dataKey="value"
                >
                  {data.claims_pie_data.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rankings Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Active Faucets</CardTitle>
            <CardDescription>Ranked by latest activity</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b sticky top-0 bg-card z-10">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Rank</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Faucet</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Network</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Drops</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {data.faucet_rankings.map((item) => {
                    const explorerBase = BLOCK_EXPLORERS[item.network] ?? "https://celoscan.io/address/";
                    return (
                      <tr key={item.faucetAddress} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-medium text-muted-foreground">#{item.rank}</td>
                        <td className="p-3">
                          <div className="font-medium truncate max-w-[160px]">{item.faucetName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            {item.faucetAddress.slice(0, 6)}...{item.faucetAddress.slice(-4)}
                            <a
                              href={`${explorerBase}${item.faucetAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-400"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{item.network}</Badge>
                        </td>
                        <td className="p-3 text-right font-medium">{item.totalClaims.toLocaleString()}</td>
                        <td className="p-3 text-right text-xs text-muted-foreground">
                          {item.latestClaimTime
                            ? new Date(item.latestClaimTime * 1000).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}