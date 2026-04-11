"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contract, parseEther } from "ethers";
import {
  ShoppingBag, Droplets, X, CheckCircle2,
  AlertCircle, RefreshCw, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from "@/hooks/use-wallet";
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme';
import { WalletConnectButton } from "@/components/wallet-connect";
import { NetworkSelector } from "@/components/network-selector";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const POINTS_CONTRACT_ADDRESSES: Record<number, string> = {
  42220: "0xYOUR_CELO_CONTRACT_ADDRESS",
  8453:  "0xYOUR_BASE_CONTRACT_ADDRESS",
  42161: "0xYOUR_ARB_CONTRACT_ADDRESS",
  56:    "0xYOUR_BNB_CONTRACT_ADDRESS",
  1135:  "0xYOUR_LISK_CONTRACT_ADDRESS",
};

const CHAIN_META: Record<number, { name: string; color: string; explorer: string }> = {
  42220: { name: "Celo",      color: "#FCFF52", explorer: "https://celoscan.io/tx/" },
  8453:  { name: "Base",      color: "#0052FF", explorer: "https://basescan.org/tx/" },
  42161: { name: "Arbitrum",  color: "#28A0F0", explorer: "https://arbiscan.io/tx/" },
  56:    { name: "BNB Chain", color: "#F0B90B", explorer: "https://bscscan.com/tx/" },
  1135:  { name: "Lisk",      color: "#4CAF50", explorer: "https://blockscout.lisk.com/tx/" },
};

const RPC_URLS: Record<number, string> = {
  42220: "https://forno.celo.org",
  8453:  "https://mainnet.base.org",
  42161: "https://arb1.arbitrum.io/rpc",
  56:    "https://bsc-dataseed.binance.org",
  1135:  "https://rpc.api.lisk.com",
};

const REDEEM_ABI = [
  "function redeem(uint256 amount, string calldata rewardId) external",
  "function balanceOf(address account) external view returns (uint256)",
];

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app";

const MERCH_ITEMS = [
  {
    id: "merch_tshirt_01",
    title: "Builder T-Shirt",
    description: "Premium 280g cotton, embroidered FaucetDrops logo. Ships worldwide.",
    cost: 50,
    stock: 50,
    tag: "POPULAR" as const,
  },
  {
    id: "merch_hoodie_01",
    title: "Genesis Hoodie",
    description: "400g fleece, dark-mode inspired. Embroidered chest & back.",
    cost: 20,
    stock: 15,
    tag: "LIMITED" as const,
  },
  {
    id: "merch_cap_01",
    title: "Drop Points Cap",
    description: "Unstructured 6-panel dad cap, adjustable strap. One size.",
    cost: 35,
    stock: 30,
    tag: null,
  },
];

type MerchItem = typeof MERCH_ITEMS[0];
type ModalStep = "form" | "chain" | "confirm" | "processing" | "success";

interface ShippingForm {
  fullName: string; email: string; street: string;
  city: string; state: string; zip: string; country: string;
}

// ─── CHECKOUT MODAL ───────────────────────────────────────────────────────────

function CheckoutModal({
  item, address, signer, chainId, onClose, onSuccess,
}: {
  item: MerchItem;
  address: string;
  signer: any;
  chainId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<ModalStep>("form");
  const [selectedChainId, setSelectedChainId] = useState<number | null>(
    chainId && POINTS_CONTRACT_ADDRESSES[chainId] ? chainId : null
  );
  const [chainBalances, setChainBalances] = useState<Record<number, number>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [form, setForm] = useState<ShippingForm>({
    fullName: "", email: "", street: "",
    city: "", state: "", zip: "", country: "Nigeria",
  });

  const availableChains = Object.keys(POINTS_CONTRACT_ADDRESSES).map(Number);

  // Fetch each chain's on-chain DROP balance for this wallet
  const fetchChainBalances = useCallback(async () => {
    if (!address) return;
    setLoadingBalances(true);
    const results: Record<number, number> = {};
    await Promise.all(
      availableChains.map(async (cid) => {
        try {
          const { JsonRpcProvider } = await import("ethers");
          const prov = new JsonRpcProvider(RPC_URLS[cid]);
          const contract = new Contract(POINTS_CONTRACT_ADDRESSES[cid], REDEEM_ABI, prov);
          const raw: bigint = await contract.balanceOf(address);
          results[cid] = Number(raw) / 1e18;
        } catch {
          results[cid] = 0;
        }
      })
    );
    setChainBalances(results);
    setLoadingBalances(false);
  }, [address]);

  useEffect(() => {
    if (step === "chain") fetchChainBalances();
  }, [step, fetchChainBalances]);

  const formValid =
    form.fullName && form.email && form.street &&
    form.city && form.state && form.zip && form.country;

  const handleRedeem = async () => {
    if (!selectedChainId || !signer || !address) return;
    const contractAddr = POINTS_CONTRACT_ADDRESSES[selectedChainId];
    if (!contractAddr) return;
    setStep("processing");
    const tid = "merch-redeem";
    try {
      // Ask wallet to switch network if needed
      if (chainId !== selectedChainId && (window as any).ethereum) {
        toast.loading("Switching network…", { id: tid });
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${selectedChainId.toString(16)}` }],
        });
      }
      const contract = new Contract(contractAddr, REDEEM_ABI, signer);
      toast.loading("Confirm in your wallet…", { id: tid });
      const tx = await contract.redeem(parseEther(item.cost.toString()), item.id);
      toast.loading("Trading points on-chain…", { id: tid });
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      toast.loading("Securing your order…", { id: tid });
      const res = await fetch(`${API_BASE}/api/droplist/verify-merch-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: receipt.hash,
          chainId: selectedChainId,
          walletAddress: address,
          itemId: item.id,
          shippingDetails: {
            fullName: form.fullName,
            email: form.email,
            address: {
              street: form.street, city: form.city,
              state: form.state, zip: form.zip, country: form.country,
            },
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Order placed! Check your email.", { id: tid });
      setStep("success");
    } catch (e: any) {
      toast.dismiss(tid);
      if (e.code === 4001 || e.code === "ACTION_REJECTED")
        toast.error("Transaction cancelled.");
      else
        toast.error(e.reason || e.message || "Checkout failed");
      setStep("confirm");
    }
  };

  const Field = ({
    k, label, span2 = false, type = "text",
  }: {
    k: keyof ShippingForm; label: string; span2?: boolean; type?: string;
  }) => (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <input
        required type={type} value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm
          outline-none focus:border-primary transition-colors"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => step !== "processing" && onClose()}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="relative z-10 w-full sm:max-w-lg bg-card border border-border
          rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-accent/10">
          <div>
            <h2 className="font-bold text-xl">{item.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === "form" && "Enter your shipping details"}
              {step === "chain" && "Choose which chain to Trade from"}
              {step === "confirm" && "Review & confirm your order"}
              {step === "processing" && "Processing transaction…"}
              {step === "success" && "Order confirmed!"}
            </p>
          </div>
          {step !== "processing" && (
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center
                text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 no-scrollbar">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Shipping form ── */}
            {step === "form" && (
              <motion.div key="form"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                className="grid grid-cols-2 gap-3">
                <Field k="fullName" label="Full Name" span2 />
                <Field k="email" label="Email Address" span2 type="email" />
                <Field k="street" label="Street Address" span2 />
                <Field k="city" label="City" />
                <Field k="state" label="State / Province" />
                <Field k="country" label="Country" />
                <Field k="zip" label="ZIP / Postal Code" />
              </motion.div>
            )}

            {/* ── Step 2: Chain picker ── */}
            {step === "chain" && (
              <motion.div key="chain"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                className="space-y-2">
                <p className="text-xs text-muted-foreground mb-4">
                  Select the chain to Trade{" "}
                  <span className="text-primary font-bold">{item.cost.toLocaleString()} DROP</span>.
                  Balance must be sufficient on that chain.
                </p>
                {availableChains.map((cid) => {
                  const meta = CHAIN_META[cid];
                  const bal = chainBalances[cid] ?? null;
                  const ok = bal !== null && bal >= item.cost;
                  const sel = selectedChainId === cid;
                  return (
                    <button key={cid} onClick={() => ok && setSelectedChainId(cid)} disabled={!ok}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all
                        ${sel
                          ? "border-primary/50 bg-primary/5"
                          : ok
                            ? "border-border hover:border-border/60 bg-accent/20 hover:bg-accent/30"
                            : "border-border/30 bg-accent/5 opacity-40 cursor-not-allowed"}`}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[9px] font-black"
                        style={{
                          background: `${meta.color}15`,
                          border: `1px solid ${meta.color}30`,
                          color: meta.color,
                        }}>
                        {meta.name.slice(0, 4).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">{meta.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {loadingBalances
                            ? "Checking balance…"
                            : bal !== null
                              ? `${bal.toLocaleString(undefined, { maximumFractionDigits: 2 })} DROP available`
                              : "—"}
                        </p>
                      </div>
                      {sel && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}

            {/* ── Step 3: Confirm ── */}
            {step === "confirm" && (
              <motion.div key="confirm"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                className="space-y-3">
                {/* Item */}
                <div className="bg-accent/30 border border-border rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Item</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{item.title}</span>
                    <div className="flex items-center gap-1.5">
                      <Droplets size={14} className="text-primary fill-primary/20" />
                      <span className="font-black">{item.cost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {/* Chain */}
                {selectedChainId && (
                  <div className="bg-accent/30 border border-border rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      Trading from
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md text-[8px] font-black flex items-center justify-center"
                        style={{
                          background: `${CHAIN_META[selectedChainId].color}15`,
                          color: CHAIN_META[selectedChainId].color,
                        }}>
                        {CHAIN_META[selectedChainId].name.slice(0, 4).toUpperCase()}
                      </div>
                      <span className="font-bold">{CHAIN_META[selectedChainId].name}</span>
                    </div>
                  </div>
                )}
                {/* Address */}
                <div className="bg-accent/30 border border-border rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Ship to
                  </p>
                  <p className="font-bold text-sm">{form.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {form.street}<br />
                    {form.city}, {form.state} {form.zip}<br />
                    {form.country}
                  </p>
                  <p className="text-xs text-primary mt-2">{form.email}</p>
                </div>
                {/* Trade warning */}
                <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-500/80 leading-relaxed">
                    <strong>{item.cost.toLocaleString()} DROP points</strong> will be permanently
                    Traded on{" "}
                    {selectedChainId ? CHAIN_META[selectedChainId].name : "the selected chain"}.
                    This is irreversible.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Processing ── */}
            {step === "processing" && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-14 gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-border" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
                  <Droplets size={20} className="absolute inset-0 m-auto text-primary" />
                </div>
                <p className="font-bold">Processing your order…</p>
                <p className="text-xs text-muted-foreground text-center max-w-[220px]">
                  Confirm in your wallet and wait for block confirmation.
                </p>
              </motion.div>
            )}

            {/* ── Step 5: Success ── */}
            {step === "success" && (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-10 gap-4 text-center">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30
                    flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-primary" />
                </motion.div>
                <div>
                  <h3 className="font-black text-xl">Order Placed!</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confirmation sent to{" "}
                    <span className="text-primary">{form.email}</span>
                  </p>
                </div>
                {txHash && selectedChainId && (
                  <a href={`${CHAIN_META[selectedChainId].explorer}${txHash}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground
                      hover:text-primary transition-colors">
                    {txHash.slice(0, 14)}…{txHash.slice(-8)}
                    <ExternalLink size={10} />
                  </a>
                )}
                <button onClick={() => { onSuccess(); onClose(); }}
                  className="mt-2 px-8 py-3 bg-primary text-primary-foreground text-xs font-bold
                    rounded-xl hover:opacity-90 transition-all">
                  Done
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer CTA */}
        {step !== "processing" && step !== "success" && (
          <div className="px-6 py-5 border-t border-border bg-accent/10">
            {step === "form" && (
              <button
                onClick={() => formValid && setStep("chain")}
                disabled={!formValid}
                className="w-full py-4 rounded-xl font-bold text-sm transition-all
                  bg-primary text-primary-foreground hover:opacity-90
                  disabled:bg-accent disabled:text-muted-foreground disabled:cursor-not-allowed">
                Continue — Select Chain →
              </button>
            )}
            {step === "chain" && (
              <div className="flex gap-3">
                <button onClick={() => setStep("form")}
                  className="px-5 py-4 rounded-xl font-bold text-sm border border-border
                    text-muted-foreground hover:text-foreground transition-colors">
                  ← Back
                </button>
                <button
                  onClick={() => selectedChainId && setStep("confirm")}
                  disabled={!selectedChainId}
                  className="flex-1 py-4 rounded-xl font-bold text-sm transition-all
                    bg-primary text-primary-foreground hover:opacity-90
                    disabled:bg-accent disabled:text-muted-foreground disabled:cursor-not-allowed">
                  Review Order →
                </button>
              </div>
            )}
            {step === "confirm" && (
              <div className="flex gap-3">
                <button onClick={() => setStep("chain")}
                  className="px-5 py-4 rounded-xl font-bold text-sm border border-border
                    text-muted-foreground hover:text-foreground transition-colors">
                  ← Back
                </button>
                <button onClick={handleRedeem}
                  className="flex-1 py-4 rounded-xl font-bold text-sm transition-all
                    bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]
                    flex items-center justify-center gap-2">
                  <Droplets size={16} />
                  Trade &amp; Order
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function MerchandiseStore() {
  const { address, isConnected, signer, chainId } = useWallet();
  const [dropBalance, setDropBalance] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<MerchItem | null>(null);
  const [balanceKey, setBalanceKey] = useState(0);

  const fetchBalance = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`${API_BASE}/api/droplist/dashboard/${address}`);
      if (res.ok) {
        const data = await res.json();
        setDropBalance(data.total_points ?? 0);
      }
    } catch { /* silent */ }
  }, [address, balanceKey]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  return (
    <div className="min-h-screen text-foreground bg-background selection:bg-primary/30 pb-20">

      {/* ── Navigation (matches your app's pattern) ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
            <Image src="/drop-token.png" alt="FaucetDrops" width={28} height={28} className="rounded-lg" />
            <span className="font-black text-sm tracking-tight hidden sm:block">FaucetDrops</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            
            <span className="text-foreground font-bold">Store</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <NetworkSelector />
            <WalletConnectButton />
          </div>
        </div>
      </nav>

      <main className="pt-24 sm:pt-28 px-4 sm:px-6 max-w-[1400px] mx-auto">

        {/* ── Header row ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end
          gap-6 mb-10 border-b border-border pb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Merch Store</h1>
            <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
              Trade Drop Points for exclusive FaucetDrops gear.
              Redeem from any supported chain as long as your balance is sufficient.
            </p>
          </div>

          {/* Balance pill */}
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 min-w-[220px]">
            <div className="w-11 h-11 relative shrink-0">
              <Image src="/drop-token.png" alt="DROP" fill className="object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                My Balance
              </p>
              <p className="text-2xl font-black tabular-nums">
                {dropBalance !== null ? dropBalance.toLocaleString() : "---"}
              </p>
            </div>
            <button
              onClick={() => setBalanceKey((k) => k + 1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* ── Connect prompt ── */}
        {!isConnected && (
          <div className="mb-8 bg-primary/5 border border-primary/20 rounded-2xl p-5
            flex flex-wrap items-center gap-4">
            <AlertCircle size={18} className="text-primary shrink-0" />
            <p className="text-sm flex-1">Connect your wallet to see your balance and redeem items.</p>
            <WalletConnectButton />
          </div>
        )}

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {MERCH_ITEMS.map((item, i) => {
            const canAfford = dropBalance !== null && dropBalance >= item.cost;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4 }}
                className={`bg-card border rounded-2xl overflow-hidden flex flex-col transition-colors
                  ${canAfford && item.stock > 0
                    ? "border-border hover:border-primary/50"
                    : "border-border opacity-60"}`}
              >
                {/* Image / placeholder */}
                <div className="aspect-square bg-accent/30 relative flex items-center justify-center
                  border-b border-border">
                  {item.tag && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full
                        ${item.tag === "LIMITED"
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-500"
                          : "bg-primary/15 border border-primary/30 text-primary"}`}>
                        {item.tag}
                      </span>
                    </div>
                  )}
                  {/* Cost badge */}
                  <div className="absolute top-3 right-3 bg-background/90 backdrop-blur border border-border
                    px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10">
                    <Droplets size={11} className="text-primary fill-primary/20" />
                    <span className="text-[11px] font-black">{item.cost.toLocaleString()}</span>
                  </div>
                  <ShoppingBag className="w-16 h-16 text-muted-foreground/25" />
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-base mb-1.5 leading-tight">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-3">
                    {item.description}
                  </p>

                  {/* Stock + shortfall */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full
                        ${item.stock > 20 ? "bg-green-500" : item.stock > 5 ? "bg-amber-500" : "bg-red-500"}`} />
                      {item.stock} in stock
                    </div>
                    {isConnected && !canAfford && dropBalance !== null && (
                      <span className="text-destructive/70">
                        Need {(item.cost - dropBalance).toLocaleString()} more
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (!isConnected) { toast.error("Connect your wallet first"); return; }
                      if (canAfford && item.stock > 0) setSelectedItem(item);
                    }}
                    disabled={isConnected && (!canAfford || item.stock <= 0)}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all
                      ${canAfford && item.stock > 0
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-accent text-muted-foreground cursor-not-allowed"}`}
                  >
                    {item.stock <= 0
                      ? "Out of Stock"
                      : !isConnected
                        ? "Connect to Redeem"
                        : !canAfford
                          ? "Insufficient Points"
                          : "Redeem"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── How it works ── */}
        <div className="mt-20 pt-12 border-t border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-8">
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                n: "01",
                t: "Earn DROP Points",
                d: "Complete quests and daily check-ins on any supported chain.",
              },
              {
                n: "02",
                t: "Trade to Redeem",
                d: "Pick an item, choose which chain to Trade from, and confirm the on-chain transaction.",
              },
              {
                n: "03",
                t: "We Ship to You",
                d: "Dispatched within 5–10 business days. Tracking confirmation goes to your email.",
              },
            ].map((s) => (
              <div key={s.n} className="flex gap-5">
                <span className="text-4xl font-black text-border/60 leading-none">{s.n}</span>
                <div>
                  <p className="font-bold text-sm mb-1.5">{s.t}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Checkout modal */}
      <AnimatePresence>
        {selectedItem && signer && address && (
          <CheckoutModal
            item={selectedItem}
            address={address}
            signer={signer}
            chainId={chainId}
            onClose={() => setSelectedItem(null)}
            onSuccess={() => setBalanceKey((k) => k + 1)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}