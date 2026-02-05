"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Contract } from "ethers";
import { 
  Droplets, PackageCheck, GraduationCap, Users, 
  ChevronRight, Zap, Layers, 
  CheckCircle2, Loader2, Globe, ArrowRight,
  DropletIcon
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
    icon: <PackageCheck className="h-4 w-4 text-blue-400" />, 
    title: "Quests", 
    desc: "Engage users with interactive missions.", 
    points: "20+ Quests", 
    
    path: "/quest",
    bgImage: "/quest-bg.png",
    cta: "Launch Quest"
  },
  { 
    id: 3, 
    icon: <GraduationCap className="h-4 w-4 text-blue-400" />, 
    title: "Quizzes", 
    desc: "Educate and reward users through challenges.", 
    points: "50+ Quizzes", 
    
    path: "/quiz",
    bgImage: "/quiz-bg.png",
    cta: "Build Quiz"
  },
];  

// --- INFRASTRUCTURE & PROTOCOLS ---

export const LayerZeroLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="black"/>
    <path d="M16.6 8.5L10.2 16.5H7.5L13.9 8.5H16.6Z" fill="white"/>
    <path d="M7.5 7.5H10.2L11.5 9.1L8.8 9.1L7.5 7.5Z" fill="white"/>
    <path d="M13.9 16.5H16.6L15.3 14.9L12.6 14.9L13.9 16.5Z" fill="white"/>
  </svg>
);

export const ScrollLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#FFF0DD"/>
    <path d="M8 7C8 5.89543 8.89543 5 10 5H14C15.1046 5 16 5.89543 16 7V17C16 18.1046 15.1046 19 14 19H10C8.89543 19 8 18.1046 8 17V7Z" stroke="#111" strokeWidth="1.5"/>
    <path d="M12 8V10" stroke="#111" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 14V16" stroke="#111" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const StarkNetLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#1C1C3E"/>
    <path d="M16.7 9.8C16.7 9.8 13.9 9.8 12 9.8C10.1 9.8 7.3 9.8 7.3 9.8C6.9 9.8 6.5 10.1 6.5 10.5C6.5 10.9 6.8 11.2 7.2 11.3L9.5 12.1L8.6 14.4C8.5 14.8 8.7 15.2 9.1 15.3C9.5 15.4 9.9 15.2 10 14.8L11.2 11.8L12 9.8L12.8 11.8L14 14.8C14.1 15.2 14.5 15.4 14.9 15.3C15.3 15.2 15.5 14.8 15.4 14.4L14.5 12.1L16.8 11.3C17.2 11.2 17.5 10.9 17.5 10.5C17.5 10.1 17.1 9.8 16.7 9.8Z" fill="#5E80F9"/>
  </svg>
);

export const FuelLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="12" fill="#00C06B"/>
    <path d="M8 8H11V11H8V8Z" fill="white"/>
    <path d="M13 8H16V11H13V8Z" fill="white"/>
    <path d="M8 13H11V16H8V13Z" fill="white"/>
    <path d="M13 13H16V16H13V13Z" fill="white"/>
  </svg>
);

export const PendleLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#000"/>
    <path d="M8.5 7C8.5 7 11 7 12.5 7C14.9853 7 17 9.01472 17 11.5C17 13.9853 14.9853 16 12.5 16H10.5V11.5C10.5 10.3954 9.60457 9.5 8.5 9.5V7Z" fill="#589BFF"/>
  </svg>
);

// --- ECOSYSTEMS & CHAINS ---

export const PolygonGuildLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#8247E5"/>
    <path d="M15.4 12.6L13.8 11.7L12.2 12.6V14.4L13.8 15.3L15.4 14.4V12.6Z" fill="white"/>
    <path d="M11.8 11.7L10.2 12.6V14.4L11.8 15.3V11.7Z" fill="white"/>
    <path d="M15.4 9.9L13.8 9L12.2 9.9V11.7L13.8 12.6L15.4 11.7V9.9Z" fill="white"/>
    <path d="M11.8 6.3L10.2 7.2V9L11.8 9.9V6.3Z" fill="white"/>
    <path d="M10.2 9.9L8.6 9L7 9.9V11.7L8.6 12.6L10.2 11.7V9.9Z" fill="white"/>
  </svg>
);

export const ChainlinkBuildersLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#375BD2"/>
    <path d="M12 6L7 8.5V15.5L12 18L17 15.5V8.5L12 6Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12 9.5V14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const BaseEcosystemLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#0052FF"/>
    <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="3"/>
  </svg>
);

// --- COMMUNITIES & DAOs ---

export const EthGlobalLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#111"/>
    <path d="M12 4.5L7.5 11.5L12 19.5L16.5 11.5L12 4.5Z" stroke="#627EEA" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M7.5 11.5H16.5" stroke="#627EEA" strokeWidth="1.5"/>
    <path d="M12 11.5V4.5" stroke="#627EEA" strokeWidth="1.5"/>
    <path d="M12 13V19.5" stroke="#627EEA" strokeWidth="1.5"/>
  </svg>
);

export const NigeriaWeb3Logo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#008751"/>
    <path d="M12 6V18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 8L16 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 8L8 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const AfricaBlockchainLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#FBBF24"/>
    {/* Stylized Africa outline approximation */}
    <path d="M14 6C14 6 10 6 9 8C8 10 6 11 6 13C6 15 9 19 12 19C15 19 16 15 17 12C18 9 17 7 14 6Z" fill="#111827"/>
  </svg>
);

export const ZKHackLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#111"/>
    <path d="M7 8H17L7 16H17" stroke="#00FFA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DeFiAfricaLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#1E3A8A"/>
    <path d="M7 12H17" stroke="#60A5FA" strokeWidth="2"/>
    <path d="M12 7V17" stroke="#60A5FA" strokeWidth="2"/>
    <rect x="9" y="9" width="6" height="6" stroke="#60A5FA" strokeWidth="2"/>
  </svg>
);

export const Web3LadiesLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#EC4899"/>
    <path d="M7 10L9.5 16L12 12L14.5 16L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const SolanaNigeriaLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#14F195"/>
    <path d="M7 9L17 7" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 13L17 11" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 17L17 15" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);



const NEW_SPACES = [
  { id: 1, name: "LayerZero", tags: ["Infra", "Cross-chain"], quests: "3", funding: "$263M", followers: "180K", logo: LayerZeroLogo },
  { id: 2, name: "Scroll", tags: ["ZK", "Layer2"], quests: "2", funding: "$83M", followers: "145K", logo: ScrollLogo },
  { id: 3, name: "StarkNet", tags: ["ZK", "Infra"], quests: "4", funding: "$282M", followers: "320K", logo: StarkNetLogo },
  { id: 4, name: "Fuel Network", tags: ["Layer2", "Infra"], quests: "1", funding: "$81M", followers: "98K", logo: FuelLogo },
  { id: 5, name: "Pendle Finance", tags: ["DeFi", "Yield"], quests: "2", funding: "$11M", followers: "110K", logo: PendleLogo },
];


const HOT_SPACES = [
  { rank: "1", name: "ETH Global", participation: "2.62K", verified: true, logo: EthGlobalLogo},
  { rank: "2", name: "Nigeria Web3 Community", participation: "2.41K", verified: true, logo:NigeriaWeb3Logo },
  { rank: "3", name: "Africa Blockchain Devs", participation: "2.29K", logo: AfricaBlockchainLogo },
  { rank: "4", name: "ZK Hack", participation: "2.11K", verified: true , logo: ZKHackLogo},
  { rank: "5", name: "DeFi Africa", participation: "1.97K", logo: DeFiAfricaLogo },
  { rank: "6", name: "Web3 Ladies", participation: "1.84K", verified: true, logo: Web3LadiesLogo },
  { rank: "7", name: "Solana Nigeria", participation: "1.76K", logo: SolanaNigeriaLogo },
  { rank: "8", name: "Polygon Guild", participation: "1.63K", verified: true , logo: PolygonGuildLogo},
  { rank: "9", name: "Chainlink Builders", participation: "1.52K", logo:ChainlinkBuildersLogo },
  { rank: "10", name: "Base Ecosystem", participation: "1.44K", verified: true, logo: BaseEcosystemLogo },
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
    <h1 className="text-xl sm:text-xl lg:text-xl font-bold mb-6 tracking-tight leading-tight text-center lg:text-left">
      The all-in-one stack for your Web3 Growth,  <br className="hidden sm:block" /> 
      Engagment and Reward Distribution.
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
           <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><DropletIcon size={18}/></div>
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
            <h2 className="text-xl sm:text-2xl font-bold">Trending Quests</h2>
            <Link href="#" className="flex items-center gap-1 text-gray-400 text-xs sm:text-sm">View All <ChevronRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-x-12 bg-[#080d19]/40 rounded-2xl sm:rounded-[2rem] border border-white/5 p-4 sm:p-8">
            {[HOT_SPACES.slice(0, 5), HOT_SPACES.slice(5, 10)].map((column, idx) => (
              <div key={idx} className="space-y-1">
                {column.map((s) => (
                  <div key={s.rank} className="flex items-center gap-4 py-3 px-4 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group">
                    <span className="w-6 text-sm font-mono text-gray-500">{s.rank}</span>
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <s.logo className="w-7 h-7" />
                  </div>

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
            <h2 className="text-xl sm:text-2xl font-bold">New Quests</h2>
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
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <space.logo className="w-7 h-7" />
                </div>
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
                    <div className="text-4xl font-black mb-1 tracking-tighter text-white">100+</div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Total Faucets</div>
                  </div>

                  {/* QUESTS */}
                  <div className="p-8 rounded-[2rem] bg-[#030712] border border-white/5 group hover:border-blue-500/50 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                        <PackageCheck size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Quests</span>
                    </div>
                    <div className="text-4xl font-black mb-1 tracking-tighter text-white">8,000+</div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Transactions</div>
                  </div>

                  {/* QUIZZES */}
                  <div className="p-8 rounded-[2rem] bg-[#030712] border border-white/5 group hover:border-blue-500/50 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                        <GraduationCap size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Quizzes</span>
                    </div>
                    <div className="text-4xl font-black mb-1 tracking-tighter text-white">2,000+</div>
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

      </main>
    </div>
  );
}