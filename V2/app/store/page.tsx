"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contract, parseEther } from "ethers";
import { ShoppingBag, DropletIcon, X, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from "@/hooks/use-wallet";
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme';
import { WalletConnectButton } from "@/components/wallet-connect";
import { NetworkSelector } from "@/components/network-selector";

// --- CONFIG ---
const POINTS_CONTRACT_ADDRESSES: Record<number, string> = {
  42220: "0xYOUR_CELO_CONTRACT_ADDRESS",
  8453:  "0xYOUR_BASE_CONTRACT_ADDRESS",
};

const POINTS_ABI = [
  "function redeem(uint256 amount, string calldata rewardId) external"
];

const MERCH_ITEMS = [
  {
    id: "merch_tshirt_01",
    title: "FaucetDrops 'Builder' T-Shirt",
    description: "Premium heavy-weight cotton t-shirt for Web3 builders.",
    cost: 500, 
    image: "/merch/tshirt.png", 
    stock: 50,
  },
  {
    id: "merch_hoodie_01",
    title: "Genesis Droplist Hoodie",
    description: "Cozy, dark-mode inspired hoodie with embroidered logo.",
    cost: 1200,
    image: "/merch/hoodie.png",
    stock: 15,
  }
];

export default function MerchandiseStore() {
  const { address, isConnected, signer, chainId } = useWallet();
  const [dropBalance, setDropBalance] = useState<number | null>(null);
  const [API_BASE_URL] = useState(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000");

  // Modal State
  const [selectedItem, setSelectedItem] = useState<typeof MERCH_ITEMS[0] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "Nigeria" // Defaulting to your region!
  });

  const fetchBalance = async () => {
    if (!address) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/droplist/dashboard/${address}`);
      if (res.ok) {
        const data = await res.json();
        setDropBalance(data.total_points || 0);
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  };

  useEffect(() => { fetchBalance(); }, [address, API_BASE_URL]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !signer || !chainId || !address) return;

    const contractAddress = POINTS_CONTRACT_ADDRESSES[chainId];
    if (!contractAddress) {
      toast.error("Store is not supported on this network.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Trigger Smart Contract
      toast.loading(`Confirming payment for ${selectedItem.title}...`, { id: "merch-tx" });
      const contract = new Contract(contractAddress, POINTS_ABI, signer);
      const amountInWei = parseEther(selectedItem.cost.toString());
      
      const tx = await contract.redeem(amountInWei, selectedItem.id);
      
      toast.loading("Transaction sent, awaiting block confirmation...", { id: "merch-tx" });
      const receipt = await tx.wait();

      // 2. Send Order to Backend
      toast.loading("Securing your order...", { id: "merch-tx" });
      
      const orderPayload = {
        txHash: receipt.hash,
        chainId: chainId,
        walletAddress: address,
        itemId: selectedItem.id,
        shippingDetails: {
          fullName: formData.fullName,
          email: formData.email,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country
          }
        }
      };

      const verifyRes = await fetch(`${API_BASE_URL}/api/droplist/verify-merch-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload) 
      });
      
      if (!verifyRes.ok) throw new Error("Backend verification failed");

      // Success!
      await fetchBalance(); 
      toast.success("Order placed successfully! Check your email for tracking.", { id: "merch-tx" });
      setSelectedItem(null); // Close modal

    } catch (error: any) {
      console.error(error);
      toast.error(error.reason || error.message || "Checkout failed", { id: "merch-tx" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen text-foreground bg-background selection:bg-primary/30 pb-20">
      {/* ... NAVIGATION HEADER (Same as before) ... */}

      <main className="pt-28 sm:pt-36 px-4 sm:px-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-border pb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Merch Store</h1>
            <p className="text-muted-foreground mt-3 max-w-xl">Turn Drop Points into exclusive gear.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 min-w-[240px] flex items-center gap-4">
            <div className="w-12 h-12 relative"><Image src="/drop-token.png" alt="Drop Points" fill className="object-contain" /></div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">My Balance</p>
              <p className="text-2xl font-black">{dropBalance !== null ? dropBalance.toLocaleString() : "---"}</p>
            </div>
          </div>
        </div>

        {/* MERCH GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {MERCH_ITEMS.map((item) => {
            const canAfford = dropBalance !== null && dropBalance >= item.cost;
            return (
              <motion.div key={item.id} whileHover={{ y: -4 }} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col hover:border-primary/50">
                <div className="aspect-square bg-accent/30 relative flex items-center justify-center border-b border-border">
                  <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-md border border-border px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 z-10">
                    <DropletIcon size={12} className="text-primary" /> {item.cost.toLocaleString()}
                  </div>
                  <ShoppingBag className="w-20 h-20 text-muted-foreground opacity-50" />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6 flex-1">{item.description}</p>
                  <button
                    onClick={() => setSelectedItem(item)}
                    disabled={!canAfford || item.stock <= 0}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all ${
                      canAfford && item.stock > 0 ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-accent text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {!canAfford ? "Not enough points" : item.stock <= 0 ? "Out of Stock" : "Checkout"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* --- CHECKOUT MODAL --- */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setSelectedItem(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-lg rounded-3xl overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-accent/10">
                <div>
                  <h2 className="text-xl font-bold">Shipping Details</h2>
                  <p className="text-xs text-muted-foreground mt-1">For: {selectedItem.title}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedItem(null)} className="p-2 hover:bg-accent rounded-full"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto no-scrollbar">
                <form id="shipping-form" onSubmit={handleCheckout} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Full Name</label>
                      <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Street Address</label>
                      <input required type="text" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">City</label>
                      <input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">State/Province</label>
                      <input required type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Country</label>
                      <input required type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Zip/Postal Code</label>
                      <input required type="text" value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-border bg-accent/10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-muted-foreground">Total Cost:</span>
                  <div className="flex items-center gap-1.5 font-black text-xl">
                    <DropletIcon size={20} className="text-primary fill-primary/20" />
                    {selectedItem.cost.toLocaleString()}
                  </div>
                </div>
                <button
                  type="submit"
                  form="shipping-form"
                  disabled={isProcessing}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-70 transition-all"
                >
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Executing Transaction...</> : "Pay with Drop Points"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}