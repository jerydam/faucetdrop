"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle2, Clock, MapPin, ExternalLink, Mail, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from "@/hooks/use-wallet";
import Link from 'next/link';

// You can match this to your backend's PLATFORM_OWNER address
const ADMIN_WALLET = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785";

type Order = {
  orderId: string;
  txHash: string;
  walletAddress: string;
  itemId: string;
  fullName: string;
  email: string;
  status: 'processing' | 'shipped' | 'delivered';
  createdAt: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};

export default function AdminOrderDashboard() {
  const { address, isConnected } = useWallet();
  const [API_BASE_URL] = useState(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000");
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'processing' | 'shipped'>('all');

  const fetchOrders = async () => {
    if (!address) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/merch-orders?admin_address=${address}`);
      if (!res.ok) {
        if (res.status === 403) toast.error("Unauthorized. Admin access required.");
        return;
      }
      const data = await res.json();
      setOrders(data.orders);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      toast.error("Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address?.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
      fetchOrders();
    } else if (isConnected) {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      toast.loading("Updating status...", { id: "update-status" });
      const res = await fetch(`${API_BASE_URL}/api/admin/merch-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminAddress: address, status: newStatus })
      });
      
      if (!res.ok) throw new Error("Failed to update status");
      
      toast.success(`Order marked as ${newStatus}!`, { id: "update-status" });
      fetchOrders(); // Refresh the list
    } catch (error) {
      toast.error("Status update failed.", { id: "update-status" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

  if (!isConnected) {
    return <div className="min-h-screen flex items-center justify-center font-bold">Please connect your wallet.</div>;
  }

  if (address?.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
    return <div className="min-h-screen flex flex-col items-center justify-center">
      <AlertCircle size={48} className="text-red-500 mb-4" />
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground mt-2">This dashboard is for platform administrators only.</p>
    </div>;
  }

  return (
    <div className="min-h-screen text-foreground bg-background pb-20">
      <main className="pt-24 px-4 sm:px-6 max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Merchandise Logistics</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage physical shipping and fulfillment.</p>
          </div>

          <div className="flex bg-accent/50 p-1 rounded-xl border border-border">
            {['all', 'processing', 'shipped'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${
                  filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ORDERS LIST */}
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-accent/30 rounded-2xl border border-border" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-accent/10 border border-border rounded-2xl flex flex-col items-center">
            <Package size={48} className="text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-bold text-lg">No orders found</h3>
            <p className="text-muted-foreground text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <motion.div 
                key={order.orderId}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col lg:flex-row gap-6 justify-between shadow-sm"
              >
                
                {/* Left: Product & Status */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    {order.status === 'processing' && <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full"><Clock size={12}/> Processing</span>}
                    {order.status === 'shipped' && <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full"><Truck size={12}/> Shipped</span>}
                    {order.status === 'delivered' && <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-3 py-1 rounded-full"><CheckCircle2 size={12}/> Delivered</span>}
                    
                    <span className="text-xs text-muted-foreground font-mono">
                      ID: {order.orderId.split('-')[0]}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">{order.itemId}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{order.walletAddress.slice(0,6)}...{order.walletAddress.slice(-4)}</span>
                      <span>•</span>
                      <a href={`https://basescan.org/tx/${order.txHash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        View Tx <ExternalLink size={12}/>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Middle: Shipping Details */}
                <div className="flex-1 bg-accent/20 rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5"><MapPin size={14}/> Destination</h4>
                    <button onClick={() => copyToClipboard(`${order.fullName}\n${order.shippingAddress.street}\n${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}\n${order.shippingAddress.country}`)} className="text-muted-foreground hover:text-primary"><Copy size={14}/></button>
                  </div>
                  <p className="font-bold text-sm">{order.fullName}</p>
                  <p className="text-sm text-muted-foreground leading-snug mt-1">
                    {order.shippingAddress.street}<br/>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}<br/>
                    {order.shippingAddress.country}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50 text-sm">
                    <Mail size={14} className="text-muted-foreground"/>
                    <a href={`mailto:${order.email}`} className="text-primary hover:underline">{order.email}</a>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="w-full lg:w-48 flex flex-col justify-end gap-2">
                  {order.status === 'processing' && (
                    <button onClick={() => updateStatus(order.orderId, 'shipped')} className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                      <Truck size={14}/> Mark as Shipped
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button onClick={() => updateStatus(order.orderId, 'delivered')} className="w-full py-2.5 bg-green-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                      <CheckCircle2 size={14}/> Mark Delivered
                    </button>
                  )}
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    Ordered: {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>

              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}