"use client"

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { WalletConnectButton } from "@/components/wallet-connect";
// Added MiniNetworkIndicator to imports
import { NetworkSelector, MiniNetworkIndicator } from "@/components/network-selector";
import Link from "next/link";
import { Menu, X, Rocket, BookOpen, Droplets, ChevronLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";

export function Header({ pageTitle }: { pageTitle: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected } = useWallet();

  const getActionConfig = () => {
    if (pathname.includes('/quest')) {
      return { label: "Create Quest", icon: <Rocket className="h-4 w-4" />, path: "/quest/create-quest" };
    }
    if (pathname.includes('/quiz')) {
      return { label: "Create Quiz", icon: <BookOpen className="h-4 w-4" />, path: "/quiz/create-quiz" };
    }
    return { label: "Create Faucet", icon: <Droplets className="h-4 w-4" />, path: "/faucet/create-faucet" };
  };

  const action = getActionConfig();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-[100] w-full bg-[#030712]/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-10 h-20">
      <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between">
        
        {/* Left Section: Back Button + Title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
            title="Go Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          
          <h1 className="text-sm sm:text-base font-black tracking-tighter uppercase text-white/90">
            <Link href="/" className="hover:text-blue-500 transition-colors">
              {pageTitle}
            </Link>
          </h1>
        </div>
      
        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-4">
          {isConnected && (
            <>
              <NetworkSelector />
              <Button
                onClick={() => router.push(action.path)}
                variant="outline"
                className="bg-transparent border-white/10 hover:border-blue-500 hover:bg-blue-500/10 text-xs font-bold uppercase tracking-widest px-6"
              >
                {action.label}
              </Button>
            </>
          )}
          <WalletConnectButton />
        </div>

        {/* Mobile Actions: Wallet + Mini Indicator + Menu */}
        <div className="lg:hidden flex items-center gap-2 sm:gap-3">
         
          
          <WalletConnectButton />
           {isConnected && (
            <MiniNetworkIndicator className="h-9 w-9" />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white p-1"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="lg:hidden absolute top-20 left-0 w-full bg-[#030712] border-b border-white/10 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-2"
        >
          {isConnected && (
            <Button
              onClick={() => {
                router.push(action.path);
                setIsMenuOpen(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 font-black uppercase text-xs tracking-widest py-6"
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </Button>
          )}
          
          {/* Note: Network Selector is removed from menu because it's now accessible via Mini Indicator in the header */}
        </div>
      )}
    </header>
  );
}