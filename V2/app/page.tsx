"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Contract, BrowserProvider, JsonRpcProvider } from "ethers";
import { 
  Droplets, Gamepad2, Lightbulb, ArrowRight, Users, Zap, 
  BarChart3, ShieldCheck, Globe, Layers, Cpu, Loader2, CheckCircle2 
} from 'lucide-react';
import { CHECKIN_ABI } from '@/lib/abis';
import { toast } from 'sonner';
import { useWallet } from "@/hooks/use-wallet";
import { appendDivviReferralData, reportTransactionToDivvi } from "@/lib/divvi-integration";

import Image from 'next/image'
import { NetworkSelector } from "@/components/network-selector"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Plus, Menu, X } from "lucide-react"
import { WalletConnectButton } from "@/components/wallet-connect"
import Link from 'next/link'
import { Footer } from '@/components/footer';
import Ecosystem from '@/components/ecosystem';
// --- CONTRACT CONFIG ---
const DROPLIST_CONTRACT_ADDRESS = "0xB8De8f37B263324C44FD4874a7FB7A0C59D8C58E";


const COLORS = {
  bg: '#030712',
  card: '#080d19',
};


export default function Home() {
  const { address, isConnected, signer, chainId, ensureCorrectNetwork } = useWallet();
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter()  
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [totalUsers, setTotalUsers] = useState<string>("...");

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // --- CONTRACT LOGIC ---
  const handleJoinDroplist = async () => {
    if (!isConnected || !address || !signer) {
      toast.warning("Please connect your wallet first");
      return;
    }
    const isCorrectNetwork = await ensureCorrectNetwork(42220); // Celo
    if (!isCorrectNetwork) return;

    setIsJoining(true);
    try {
      const contract = new Contract(DROPLIST_CONTRACT_ADDRESS, CHECKIN_ABI, signer);
      const gasLimit = await contract.droplist.estimateGas();
      const gasLimitWithBuffer = (gasLimit * BigInt(120)) / BigInt(100);

      const txData = contract.interface.encodeFunctionData("droplist", []);
      const enhancedData = appendDivviReferralData(txData, address as `0x${string}`);

      const tx = await signer.sendTransaction({
        to: DROPLIST_CONTRACT_ADDRESS,
        data: enhancedData,
        gasLimit: gasLimitWithBuffer,
      });
      await tx.wait();
      await reportTransactionToDivvi(tx.hash as `0x${string}`, chainId!);
      toast.success("Successfully joined the droplist!");
    } catch (error: any) {
      toast.error(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsJoining(false);
    }
  };
useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        // Use an RPC Provider to fetch data even if the wallet isn't connected
        // Replace with your specific chain RPC (e.g., Celo or Lisk)
        const provider = new JsonRpcProvider("https://forno.celo.org"); 
        const contract = new Contract(DROPLIST_CONTRACT_ADDRESS, CHECKIN_ABI, provider);
        
        const count = await contract.getUniqueParticipantCount();
        // Format with commas for a professional look (e.g., 2,400)
        setTotalUsers(Number(count).toLocaleString());
      } catch (error) {
        console.error("Error fetching total users:", error);
        setTotalUsers("2,400+"); // Fallback value
      }
    };

    fetchTotalUsers();
    
    // Optional: Refresh data every 30 seconds
    const interval = setInterval(fetchTotalUsers, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="min-h-screen text-gray-100 selection:bg-blue-500/30" style={{ backgroundColor: COLORS.bg }}>
      
     {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-50 bg-[#030712]/90 backdrop-blur-md border-b border-white/5 px-4 sm:px-6">
        {/* Changed max-w-7xl to max-w-full to expand to the edges */}
        <div className="max-w-full mx-auto h-20 flex justify-between items-center">
          {/* Logo Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/">
              <div className="flex-shrink-0 relative">
                <Image
                  src="/lightlogo.png"
                  alt="FaucetDrops Logo"
                  width={160}
                  height={50}
                  className="h-10 w-auto dark:hidden"
                />
                <Image
                  src="/darklogo.png"
                  alt="FaucetDrops Logo"
                  width={160}
                  height={50}
                  className="h-10 w-auto hidden dark:block"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-4">
            
            <WalletConnectButton />

            {isConnected && <NetworkSelector />}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:bg-gray-800"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu Content */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 w-full bg-[#030712] border-b border-white/10 p-6 flex flex-col gap-4 shadow-2xl">
           
            <WalletConnectButton />
            {isConnected && <NetworkSelector className="w-full" />}
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl bg-blue-600/5 blur-[140px] rounded-full -z-10" />
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Now supporting Lisk & Celo Mainnets
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent"
          >
            Unify Your <br/>Onchain Growth
          </motion.h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
             Automate Your Rewards, Scale Engagement, and onboard real users at scale. The all-in-one stack for Web3 community builders.
          </p>
          
          <div className="flex flex-col items-center gap-8">
            <button 
              onClick={handleJoinDroplist}
              disabled={isJoining}
              className="px-12 py-5  bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xl transition-all shadow-xl shadow-blue-900/20 flex items-center gap-3 disabled:opacity-50"

            >
              {isJoining ? <Loader2 className="animate-spin" /> : <Users size={24} />}
              {isJoining ? "Joining..." : "Join the Droplist"}
            </button>
            <div className="flex -space-x-3 items-center">
               {[1,2,3,4].map(i => (
                 <div key={i} className="w-10 h-10 rounded-full border-2 border-[#030712] bg-gray-800 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" />
                 </div>
                  ))}
                  <span className="pl-6 text-sm text-gray-500 font-medium">+{totalUsers} people joined</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- PRODUCT SHOWCASE --- */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              title: "Faucets", 
              icon: <Droplets className="text-blue-400" />, 
              desc: "Smart token distribution with flexible access controls and automated reward drips.",
              items: ["Open Drop with unique codes", "Whitelist precision targeting", "Custom distribution logic", "Automated reward scheduling"],
              cta: "Create Faucet",
              href: "/faucet" // Add your route here
            },
            { 
              title: "Quests", 
              icon: <Gamepad2 className="text-blue-400" />, // Unified color to avoid riot
              desc: "Engage users with interactive missions that drive meaningful onchain actions.",
              items: ["Multi-step task campaigns", "Social & onchain verification", "Progress tracking & rewards", "Gamified user journeys"],
              cta: "Launch Quest",
              href: "/quest" // Add your route here
            },
            { 
              title: "Quizzes", 
              icon: <Lightbulb className="text-blue-400" />, // Unified color to avoid riot
              desc: "Educate and reward users through interactive knowledge challenges.",
              items: ["Custom question builder", "Instant reward distribution", "Learning analytics", "Community education at scale"],
              cta: "Build Quiz",
              href: "/quiz" // Add your route here
            }
          ].map((p, i) => (
            <motion.div 
              key={p.title}
              whileHover={{ y: -10 }}
              className="p-10 rounded-[2.5rem] bg-[#080d19] border border-white/5 hover:border-blue-500/30 transition-all duration-500 flex flex-col h-full group"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-blue-500/10 transition-colors">
                {p.icon}
              </div>
              
              <h3 className="text-3xl font-bold mb-4">{p.title}</h3>
              <p className="text-gray-400 mb-8 text-sm leading-relaxed">{p.desc}</p>
              
              <div className="space-y-4 mb-10 flex-grow">
                {p.items.map(item => (
                  <div key={item} className="flex items-start gap-3 text-sm font-medium text-gray-300">
                    <CheckCircle2 size={18} className="text-blue-500 mt-0.5 shrink-0" /> {item}
                  </div>
                ))}
              </div>

              {/* The CTA now uses the Next.js Link component */}
              <Link href={p.href} className="w-full">
                <button className="w-full py-4 bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-500 rounded-xl text-sm font-bold transition-all duration-300">
                  {p.cta}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
          
     
      {/* --- ECOSYSTEM SECTION --- */}
      <Ecosystem />
      <section className="py-24 bg-white/[0.02] border-y border-white/5">
            {/* Changed max-w-[98%] to a fixed max-width and increased padding for better "breathability" */}
            <div className="max-w-[1400px] mx-auto px-8 sm:px-12 lg:px-16">
              <div className="flex flex-col lg:flex-row gap-20 items-start">
                
                {/* Left Content */}
                <div className="lg:w-1/3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                    Live Network Stats
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                    Trusted by Top Web3 Protocols
                  </h2>
                  <p className="text-gray-400 mb-8 leading-relaxed max-w-md">
                    Powering growth for Celo, Lisk, Self Protocol & more through verifiable onchain metrics.
                  </p>
                  
                </div>

                {/* Right Content: Unified Grid */}
                <div className="lg:w-2/3 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* FAUCETS */}
                  <div className="p-8 rounded-[2rem] bg-[#030712] border border-white/5 group hover:border-blue-500/50 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                        <Droplets size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Faucets</span>
                    </div>
                    <div className="text-4xl font-black mb-1 tracking-tighter text-white">80+</div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Total Faucets</div>
                  </div>

                  {/* QUESTS */}
                  <div className="p-8 rounded-[2rem] bg-[#030712] border border-white/5 group hover:border-blue-500/50 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                        <Gamepad2 size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Quests</span>
                    </div>
                    <div className="text-4xl font-black mb-1 tracking-tighter text-white">5K+</div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Transactions</div>
                  </div>

                  {/* QUIZZES */}
                  <div className="p-8 rounded-[2rem] bg-[#030712] border border-white/5 group hover:border-blue-500/50 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                        <Lightbulb size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Quizzes</span>
                    </div>
                    <div className="text-4xl font-black mb-1 tracking-tighter text-white">2K+</div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Active Users</div>
                  </div>

                  {/* SHARED DROPS - Full width */}
                  <div className="sm:col-span-2 lg:col-span-3 p-8 rounded-[2.5rem] bg-[#030712] border border-white/5 group hover:border-blue-500/50 transition-all duration-500 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:rotate-12 transition-transform">
                        <Globe size={28} />
                      </div>
                      <div>
                        <div className="text-4xl font-black tracking-tighter text-white">2,000+</div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Total Drops Distributed</div>
                      </div>
                    </div>
                    
                    <div className="hidden sm:block h-12 w-px bg-white/10" />
                    
                    <div className="flex gap-12">
                        <div>
                            <div className="text-xl font-bold text-white tracking-tight">4.9/5</div>
                            <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Satisfaction</div>
                        </div>
                        <div>
                            <div className="text-xl font-bold text-white tracking-tight">99.9%</div>
                            <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Uptime</div>
                        </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>
    </div>
  );
}