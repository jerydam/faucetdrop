"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Truck, CheckCircle2, Clock, MapPin, ExternalLink,
  Mail, Copy, AlertCircle, RefreshCw, Search, Loader2,
  BarChart2, Send, Box, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from "@/hooks/use-wallet";
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme';
import { WalletConnectButton } from "@/components/wallet-connect";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const ADMIN_WALLET = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785";
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app";

const CHAIN_EXPLORERS: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  8453:  "https://basescan.org/tx/",
  42161: "https://arbiscan.io/tx/",
  56:    "https://bscscan.com/tx/",
  1135:  "https://blockscout.lisk.com/tx/",
};

// ─── TYPES ───────────────────────────────────────────────────────────────────

type OrderStatus = "processing" | "shipped" | "delivered";

interface Order {
  orderId: string;
  txHash: string;
  walletAddress: string;
  itemId: string;
  fullName: string;
  email: string;
  status: OrderStatus;
  createdAt: string;
  chainId?: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const S = {
  processing: { label: "Processing", icon: Clock,         cls: "text-amber-500  bg-amber-500/10  border-amber-500/25"  },
  shipped:    { label: "Shipped",    icon: Truck,         cls: "text-blue-500   bg-blue-500/10   border-blue-500/25"   },
  delivered:  { label: "Delivered",  icon: CheckCircle2,  cls: "text-primary    bg-primary/10    border-primary/25"    },
} satisfies Record<OrderStatus, { label: string; icon: React.ElementType; cls: string }>;

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, extra }: {
  label: string; value: number; icon: React.ElementType; extra?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <p className="text-3xl font-black tabular-nums">{value}</p>
      {extra && <p className="text-[10px] text-muted-foreground mt-1">{extra}</p>}
    </div>
  );
}

// ─── ORDER ROW ────────────────────────────────────────────────────────────────

function OrderRow({ order, onUpdateStatus, updating }: {
  order: Order;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  updating: string | null;
}) {
  const [open, setOpen] = useState(false);
  const cfg = S[order.status];
  const StatusIcon = cfg.icon;
  const isUpdating = updating === order.orderId;
  const explorer = (order.chainId ? CHAIN_EXPLORERS[order.chainId] : null) ?? CHAIN_EXPLORERS[8453];

  const copyAddress = () => {
    const text = [
      order.fullName,
      order.shippingAddress.street,
      `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}`,
      order.shippingAddress.country,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Address copied!");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* ── Collapsed row ── */}
      <div
        className="flex flex-wrap items-center gap-4 px-6 py-4 cursor-pointer
          hover:bg-accent/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Status badge */}
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
          font-black uppercase tracking-widest border ${cfg.cls}`}>
          <StatusIcon size={10} />
          {cfg.label}
        </span>

        {/* Item title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">
            {order.itemId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            <span className="text-[10px] font-mono text-muted-foreground">
              {order.walletAddress.slice(0, 8)}…{order.walletAddress.slice(-6)}
            </span>
            <span className="text-border">·</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
            <span className="text-border">·</span>
            <a
              href={`${explorer}${order.txHash}`}
              target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-0.5 transition-colors"
            >
              Tx <ExternalLink size={9} />
            </a>
          </div>
        </div>

        {/* Order ID + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground/40 hidden sm:block">
            #{order.orderId.split("-")[0].toUpperCase()}
          </span>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* ── Expanded details ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="px-6 py-5 grid sm:grid-cols-2 gap-4">

              {/* Shipping address */}
              <div className="bg-accent/20 border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin size={12} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Destination</p>
                  </div>
                  <button onClick={copyAddress}
                    className="text-muted-foreground hover:text-primary transition-colors">
                    <Copy size={13} />
                  </button>
                </div>
                <p className="font-bold text-sm">{order.fullName}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {order.shippingAddress.street}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}<br />
                  {order.shippingAddress.country}
                </p>
                <a href={`mailto:${order.email}`}
                  className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                  <Mail size={12} className="text-muted-foreground" />
                  <span className="text-xs text-primary hover:underline">{order.email}</span>
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-col justify-end gap-2">
                {order.status === "processing" && (
                  <button
                    onClick={() => onUpdateStatus(order.orderId, "shipped")}
                    disabled={isUpdating}
                    className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2
                      bg-blue-500/10 border border-blue-500/25 text-blue-500
                      hover:bg-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />}
                    Mark as Shipped
                  </button>
                )}
                {order.status === "shipped" && (
                  <button
                    onClick={() => onUpdateStatus(order.orderId, "delivered")}
                    disabled={isUpdating}
                    className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2
                      bg-primary/10 border border-primary/25 text-primary
                      hover:bg-primary/20 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Mark as Delivered
                  </button>
                )}
                {order.status === "delivered" && (
                  <div className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2
                    bg-primary/5 border border-primary/15 text-primary/40">
                    <CheckCircle2 size={13} /> Fulfilled
                  </div>
                )}
                <button
                  onClick={() => { navigator.clipboard.writeText(order.email); toast.success("Email copied!"); }}
                  className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2
                    bg-accent border border-border text-muted-foreground hover:text-foreground
                    hover:border-border/60 transition-all"
                >
                  <Mail size={13} /> Copy Customer Email
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminOrderDashboard() {
  const { address, isConnected } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!address) return;
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/merch-orders?admin_address=${address}`);
      if (res.status === 403) { toast.error("Unauthorized. Admin access only."); return; }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [address]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/merch-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminAddress: address, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Order marked as ${newStatus}`);
      setOrders((prev) =>
        prev.map((o) => o.orderId === orderId ? { ...o, status: newStatus as OrderStatus } : o)
      );
    } catch { toast.error("Failed to update status"); }
    finally { setUpdating(null); }
  };

  const isAdmin = address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const stats = {
    total: orders.length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped:    orders.filter((o) => o.status === "shipped").length,
    delivered:  orders.filter((o) => o.status === "delivered").length,
  };

  const filtered = orders.filter((o) => {
    const matchStatus = filter === "all" || o.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || o.fullName.toLowerCase().includes(q)
      || o.email.toLowerCase().includes(q)
      || o.orderId.toLowerCase().includes(q)
      || o.itemId.toLowerCase().includes(q)
      || o.walletAddress.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="min-h-screen text-foreground bg-background">
        <nav className="border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/drop-token.png" alt="FaucetDrops" width={28} height={28} className="rounded-lg" />
              <span className="font-black text-sm hidden sm:block">FaucetDrops</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <WalletConnectButton />
            </div>
          </div>
        </nav>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <Package size={40} className="text-muted-foreground mx-auto mb-4" />
            <h2 className="font-black text-xl mb-2">Admin Portal</h2>
            <p className="text-muted-foreground text-sm mb-6">Connect your admin wallet to continue.</p>
            <WalletConnectButton />
          </div>
        </div>
      </div>
    );
  }

  // ── Access denied ──────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen text-foreground bg-background flex flex-col items-center
        justify-center gap-3">
        <AlertCircle size={40} className="text-destructive" />
        <h2 className="font-black text-xl">Access Denied</h2>
        <p className="text-muted-foreground text-sm">{address?.slice(0, 10)}…{address?.slice(-8)}</p>
        <p className="text-muted-foreground/60 text-xs">This wallet is not authorised.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground bg-background pb-20">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
            <Image src="/drop-token.png" alt="FaucetDrops" width={28} height={28} className="rounded-lg" />
            <span className="font-black text-sm hidden sm:block">FaucetDrops</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-bold">Orders</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground
                hover:text-foreground transition-colors"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
            <WalletConnectButton />
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-10">

        {/* ── Title ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Merchandise Logistics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage physical shipping and fulfilment for redeemed Drop Point orders.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card
            border border-border rounded-xl px-4 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {address?.slice(0, 8)}…{address?.slice(-6)}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total Orders"  value={stats.total}      icon={BarChart2} />
          <StatCard label="Processing"    value={stats.processing} icon={Clock}     />
          <StatCard label="Shipped"       value={stats.shipped}    icon={Send}      />
          <StatCard label="Delivered"     value={stats.delivered}  icon={CheckCircle2} />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Status pills */}
          <div className="flex bg-card border border-border rounded-xl p-1 gap-1">
            {(["all", "processing", "shipped", "delivered"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all
                  ${filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"}`}
              >
                {f}
                {f !== "all" && (
                  <span className="ml-1.5 opacity-60">
                    ({stats[f]})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-card border border-border
            rounded-xl px-4 py-2">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Name, email, wallet, order ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        {/* ── Order list ── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse"
                style={{ opacity: 1 - i * 0.18 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package size={36} className="text-muted-foreground/30 mb-4" />
            <p className="font-bold text-muted-foreground">
              {search ? "No matching orders" : "No orders yet"}
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {search ? "Try a different search query" : "New orders will appear here automatically"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((order) => (
                <OrderRow
                  key={order.orderId}
                  order={order}
                  onUpdateStatus={updateStatus}
                  updating={updating}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-[10px] text-muted-foreground/40 text-center mt-8">
            Showing {filtered.length} of {orders.length} orders
          </p>
        )}
      </main>
    </div>
  );
}