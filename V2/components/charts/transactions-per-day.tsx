// ─── transactions-per-day.tsx ─────────────────────────────────────────────────
'use client';
import { Loader2, Activity } from "lucide-react";
import { useDashboardContext } from "@/components/analytics-dashboard";

export function TransactionsPerDayChart() {
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
        <p className="text-4xl font-bold">{data.total_transactions.toLocaleString()}</p>
        <p className="text-muted-foreground">Total Transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.network_transactions.map((net) => (
          <div key={net.name} className="border rounded-xl p-6 bg-card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: net.color }} />
              <div>
                <h3 className="font-semibold text-lg leading-tight">{net.name}</h3>
                <p className="text-xs text-muted-foreground">Chain ID: {net.chainId}</p>
              </div>
            </div>
            <p className="text-3xl font-bold">{net.totalTransactions.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">transactions</p>

            {/* Simple visual bar */}
            <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  backgroundColor: net.color,
                  width: `${Math.min(100, (net.totalTransactions / Math.max(...data.network_transactions.map(n => n.totalTransactions), 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
