"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Contract } from "ethers";
import { 
  Droplets, Gamepad2, Lightbulb, Users, 
  ChevronRight, Zap, Layers, 
  CheckCircle2, Loader2, Globe, ArrowRight
} from 'lucide-react';
import { CHECKIN_ABI } from '@/lib/abis';
import { toast } from 'sonner';
import { useWallet } from "@/hooks/use-wallet";
import { appendDivviReferralData, reportTransactionToDivvi } from "@/lib/divvi-integration";

import Image from 'next/image';
import { MiniNetworkIndicator, NetworkSelector } from "@/components/network-selector";
import { WalletConnectButton } from "@/components/wallet-connect";
import Link from 'next/link';

const DROPLIST_CONTRACT_ADDRESS = "0xB8De8f37B263324C44FD4874a7FB7A0C59D8C58E";

const CAMPAIGNS = [
  { 
    id: 1, 
    icon: <Droplets className="h-4 w-4 text-blue-400" />, 
    title: "Faucets", 
    desc: "Smart token distribution with flexible access controls.", 
    points: "100+ Faucets", 
    
    path: "/faucet",
    bgImage: "/faucet-bg.png",
    cta: "Create Faucet"
  },
  { 
    id: 2, 
    icon: <Gamepad2 className="h-4 w-4 text-blue-400" />, 
    title: "Quests", 
    desc: "Engage users with interactive missions.", 
    points: "20+ Quests", 
    
    path: "/quest",
    bgImage: "/quest-bg.png",
    cta: "Launch Quest"
  },
  { 
    id: 3, 
    icon: <Lightbulb className="h-4 w-4 text-blue-400" />, 
    title: "Quizzes", 
    desc: "Educate and reward users through challenges.", 
    points: "50+ Quizzes", 
    
    path: "/quiz",
    bgImage: "/quiz-bg.png",
    cta: "Build Quiz"
  },
];  

const NEW_SPACES = [
  { id: 1, name: "Yieldbay", tags: ["DeFi"], quests: "0", funding: "Undisclosed", followers: "6.0K", color: "bg-gray-800" },
  { id: 2, name: "OZNi_Ni28 Official", tags: ["DeFi", "Staking"], quests: "0", funding: "Undisclosed", followers: "7.2K", color: "bg-teal-900" },
  { id: 3, name: "UniMex", tags: ["DeFi"], quests: "1", funding: "Undisclosed", followers: "16.0K", color: "bg-lime-500" },
  { id: 4, name: "Sphere", tags: ["DeFi", "Infra"], quests: "2", funding: "Undisclosed", followers: "56.3K", color: "bg-white" },
];

const HOT_SPACES = [
  { rank: "01", name: "Prophexx", participation: "10.74K" },
  { rank: "02", name: "Binstarter.ai", participation: "10.54K" },
  { rank: "03", name: "Haven", participation: "6.08K" },
  { rank: "04", name: "Lazbubu", participation: "5.31K" },
  { rank: "05", name: "Perle Labs", participation: "5.00K", verified: true },
  { rank: "06", name: "PolyPay", participation: "4.01K" },
  { rank: "07", name: "Mey Real", participation: "3.55K" },
  { rank: "08", name: "Kodeus", participation: "3.18K" },
  { rank: "09", name: "Permission", participation: "2.98K", verified: true },
  { rank: "10", name: "SmartGold", participation: "2.84K" },
];

export default function Home() {
  const { address, isConnected, signer, chainId, ensureCorrectNetwork } = useWallet();
  const [isJoining, setIsJoining] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);

const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  if (e.currentTarget.scrollLeft > 20) {
    setShowScrollHint(false);
  }
};
  const handleJoinDroplist = async () => {
    if (!isConnected || !address || !signer) {
      toast.warning("Please connect your wallet first");
      return;
    }
    const isCorrectNetwork = await ensureCorrectNetwork(42220); 
    if (!isCorrectNetwork) return;
    setIsJoining(true);
    try {
      const contract = new Contract(DROPLIST_CONTRACT_ADDRESS, CHECKIN_ABI, signer);
      const txData = contract.interface.encodeFunctionData("droplist", []);
      const enhancedData = appendDivviReferralData(txData, address as `0x${string}`);
      const tx = await signer.sendTransaction({ to: DROPLIST_CONTRACT_ADDRESS, data: enhancedData });
      await tx.wait();
      await reportTransactionToDivvi(tx.hash as `0x${string}`, chainId!);
      toast.success("Successfully joined!");
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-100 bg-[#030712] selection:bg-blue-500/30">
      
      {/* --- NAVIGATION FIXED --- */}
      <nav className="fixed top-0 w-full z-[100] bg-[#030712]/90 backdrop-blur-md border-b border-white/5 px-4 h-16 sm:h-20 flex justify-between items-center">
        <Link href="/">
          <div className="relative w-28 sm:w-40 h-8 sm:h-10">
            <Image src="/darklogo.png" alt="Logo" fill className="object-contain" priority />
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* MOBILE LOGO ONLY SELECTOR */}
          

          <WalletConnectButton />
          {isConnected && (
            <div className="flex sm:hidden items-center justify-center">
              <MiniNetworkIndicator className="p-1 border border-white/10 rounded-full bg-white/5 h-8 w-8 flex items-center justify-center" />
            </div>
          )}
          {/* DESKTOP SELECTOR */}
          {isConnected && (
            <div className="hidden sm:block">
              <NetworkSelector />
            </div>
          )}
        </div>
      </nav>

      <main className="pt-24 sm:pt-32 pb-20 px-4 sm:px-6 max-w-[1400px] mx-auto space-y-16 sm:space-y-24">
        
      {/* --- HERO SECTION --- */}
<div className="flex flex-col lg:flex-row gap-8 items-stretch"> {/* Changed to items-stretch to align card heights */}
  <div className="flex-1 w-full overflow-hidden"> {/* Added overflow-hidden to prevent carousel bleed */}
    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-6 tracking-tight leading-tight text-center lg:text-left">
      The all-in-one stack for your <br className="hidden sm:block" /> 
      Web3 Growth & Rewards.
    </h1>
    
    <div className="relative group">
      {/* Animated Scroll Hint - Mobile Only */}
      {showScrollHint && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
        >
          <div className="bg-blue-600/20 backdrop-blur-md border border-blue-500/50 p-3 rounded-full animate-bounce">
            <ArrowRight size={20} className="text-blue-400" />
          </div>
        </motion.div>
      )}

      <div 
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory shadow-inner"
      >
        <motion.div 
            // Auto-scroll animation: nudges the carousel left and right slightly
            animate={{ x: [0, -15, 0] }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut",
              repeatDelay: 2
            }}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory shadow-inner"
          >
        {CAMPAIGNS.map((c) => (
  <Link href={c.path} key={c.id}>
    <div className={`min-w-[85vw] sm:min-w-[400px] h-64 sm:h-72 rounded-2xl p-6 sm:p-8 bg-gradient-to-br  border border-white/10 flex flex-col justify-between snap-center cursor-pointer transition-transform duration-300 hover:scale-[1.01] overflow-hidden relative group`}>
      
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-30 transition-opacity">
        <Image 
          src={c.bgImage} 
          alt="pattern" 
          fill 
          className="object-cover"
        />
      </div>

      {/* Content Layer (Ensure z-10 so it stays on top of the bg) */}
      <div className="relative z-10">
        <div className="mb-2">{c.icon}</div>
        <h3 className="text-xl sm:text-2xl font-bold mt-2 leading-tight">{c.title}</h3>
        <p className="text-xs sm:text-sm text-gray-300 mt-2 line-clamp-2">{c.desc}</p>
      </div>
      
      <div className="flex justify-between items-end relative z-10">
        <button className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-xs sm:text-sm transition-colors">
          {c.cta}
        </button>
        <div className="bg-black/40 px-3 py-1 rounded-md text-[10px] sm:text-xs font-mono">
          {c.points}
        </div>
      </div>
    </div>
  </Link>
))}
        </motion.div>
      </div>
    </div>
  </div>

  {/* MY ASSETS - Placed against the campaign cards on desktop */}
  <div className="w-full lg:w-[320px] flex flex-col justify-end"> {/* Flex end aligns it with the bottom of the carousel on desktop */}
    <div className="bg-[#0d121f] rounded-2xl border border-white/5 p-6 h-auto min-h-[144px] lg:h-72 flex flex-col justify-between shadow-xl">
      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">My Assets</h4>
      
      <div className="flex flex-col gap-6"> {/* Changed to column gap for better vertical spacing against large cards */}
        <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Layers size={18}/></div>
           <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Earn   Drop Points</span>
              <span className="text-[10px] text-gray-500">Coming Soon</span>
           </div>
        </div>
        
        {/* Progress indicator can be added here in the future */}
      </div>

      <button 
        onClick={handleJoinDroplist}
        disabled={isJoining}
        className="w-full text-[11px] font-bold text-blue-400 border border-blue-400/20 px-4 py-3 rounded-xl hover:bg-blue-400/10 transition-colors disabled:opacity-50"
      >
        {isJoining ? "Joining..." : "Join Droplist"}
      </button>
    </div>
  </div>
</div>
        {/* --- HOT SPACES --- */}
        <section>
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-xl sm:text-2xl font-bold">Hot Spaces</h2>
            <Link href="#" className="flex items-center gap-1 text-gray-400 text-xs sm:text-sm">View All <ChevronRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-x-12 bg-[#080d19]/40 rounded-2xl sm:rounded-[2rem] border border-white/5 p-4 sm:p-8">
            {[HOT_SPACES.slice(0, 5), HOT_SPACES.slice(5, 10)].map((column, idx) => (
              <div key={idx} className="space-y-1">
                {column.map((s) => (
                  <div key={s.rank} className="flex items-center gap-4 py-3 px-4 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group">
                    <span className="w-6 text-sm font-mono text-gray-500">{s.rank}</span>
                    <div className="w-8 h-8 rounded-full bg-gray-700 border border-white/10" />
                    <div className="flex-1 flex items-center gap-1.5"><span className="font-semibold text-sm">{s.name}</span>{s.verified && <CheckCircle2 size={14} className="text-blue-500" />}</div>
                    <span className="text-sm font-medium text-gray-400">{s.participation}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* --- NEW SPACES RESTORED --- */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">New Spaces</h2>
            <div className="flex items-center gap-2 text-gray-400 text-sm hover:text-white cursor-pointer"><ArrowRight size={20} /></div>
          </div>
          <motion.div 
            // Auto-scroll animation: nudges the carousel left and right slightly
            animate={{ x: [0, -15, 0] }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut",
              repeatDelay: 2
            }}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory shadow-inner"
          >
          
            {NEW_SPACES.map((space) => (
              <div key={space.id} className="min-w-[300px] sm:min-w-[320px] bg-[#080d19] border border-white/10 rounded-2xl p-6 relative group hover:border-blue-500/50 transition-all duration-300">
                <div className="absolute top-4 right-4 bg-blue-600 text-[10px] font-black px-2 py-0.5 rounded uppercase">New</div>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-full ${space.color} flex-shrink-0 border border-white/10`} />
                  <div>
                    <h3 className="font-bold text-sm sm:text-base mb-1">{space.name}</h3>
                    <div className="flex gap-1 flex-wrap">
                      {space.tags.map(tag => (
                        <span key={tag} className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-white/5">
                  <div><p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Quests</p><p className="text-sm font-bold">{space.quests}</p></div>
                  <div><p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Funding</p><p className="text-xs font-bold text-gray-300 truncate">{space.funding}</p></div>
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* --- STATS SECTION --- */}
        <section className="py-12 sm:py-24 bg-white/[0.02] rounded-2xl sm:rounded-[3rem] border border-white/5 px-6 sm:px-12">
          <div className="flex flex-col lg:flex-row gap-10 sm:gap-20 items-center">
            <div className="lg:w-1/3 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase mb-6">Live Network Stats</div>
              <h2 className="text-3xl sm:text-5xl font-bold mb-6 tracking-tight">Trusted by Top Web3 Protocols</h2>
              <p className="text-gray-400 text-sm sm:text-base">Powering growth for Celo, Lisk, Self Protocol & more through verifiable metrics.</p>
            </div>

            <div className="lg:w-2/3 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[{ label: "Total Faucets", val: "80+", icon: <Droplets /> }, { label: "Transactions", val: "5K+", icon: <Gamepad2 /> }, { label: "Active Users", val: "2K+", icon: <Lightbulb /> }].map((stat) => (
                <div key={stat.label} className="p-6 sm:p-8 rounded-2xl bg-[#030712] border border-white/5 flex flex-col items-center lg:items-start group hover:border-blue-500/50 transition-all">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 mb-4 group-hover:scale-110 transition-transform">{stat.icon}</div>
                  <div className="text-3xl sm:text-4xl font-black">{stat.val}</div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}