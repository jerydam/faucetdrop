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
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">{data.total_claims.toLocaleString()}</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Total Drops</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Top 10 Faucets by Drops</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Distribution of all claims</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={300} className="sm:!h-[380px]">
              <PieChart>
                <Pie
                  data={data.claims_pie_data}
                  cx="50%" cy="50%"
                  outerRadius="55%"
                  dataKey="value"
                >
                  {data.claims_pie_data.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "11px" }}
                  iconSize={10}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rankings Table */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">All Active Faucets</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Ranked by latest activity</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Scrollable wrapper with horizontal scroll on mobile */}
            <div className="max-h-[400px] sm:max-h-[460px] overflow-auto">
              <div className="min-w-[420px]">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="border-b sticky top-0 bg-card z-10">
                    <tr>
                      <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground w-10">#</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground">Faucet</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground">Network</th>
                      <th className="text-right p-2 sm:p-3 font-medium text-muted-foreground">Drops</th>
                      {/* Hide "Latest" column on mobile */}
                      <th className="text-right p-2 sm:p-3 font-medium text-muted-foreground hidden sm:table-cell">Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.faucet_rankings.map((item) => {
                      const explorerBase = BLOCK_EXPLORERS[item.network] ?? "https://celoscan.io/address/";
                      return (
                        <tr key={item.faucetAddress} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2 sm:p-3 font-medium text-muted-foreground">#{item.rank}</td>
                          <td className="p-2 sm:p-3">
                            <div className="font-medium truncate max-w-[120px] sm:max-w-[160px]">{item.faucetName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span className="font-mono">
                                {item.faucetAddress.slice(0, 5)}…{item.faucetAddress.slice(-3)}
                              </span>
                              <a
                                href={`${explorerBase}${item.faucetAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-400 flex-shrink-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3">
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{item.network}</Badge>
                          </td>
                          <td className="p-2 sm:p-3 text-right font-medium">{item.totalClaims.toLocaleString()}</td>
                          {/* Hide on mobile */}
                          <td className="p-2 sm:p-3 text-right text-xs text-muted-foreground hidden sm:table-cell">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}