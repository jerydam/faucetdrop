"use client"

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { WalletConnectButton } from "@/components/wallet-connect";
import { NetworkSelector } from "@/components/network-selector";
import Link from "next/link";
import { Menu, X, Rocket, BookOpen, Droplets } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";

export function Header({ pageTitle }: { pageTitle: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected } = useWallet();

  // Determine which "Create" button to show based on the URL
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
    <header className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 bg-background border-b border-white/5">
     
      <h1 className="text-base sm:text-lg font-semibold tracking-tight" title="Go Back Home">
        <Link href="/">{pageTitle}</Link>
      </h1>
    
      {/* Mobile Toggle Button */}
      <div className="sm:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="p-1 ml-auto"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      <div
        ref={menuRef}
        className={`${isMenuOpen ? "block" : "hidden"} sm:hidden absolute top-16 right-4 bg-[#080d19] border border-white/10 rounded-xl shadow-2xl p-4 w-56 z-50 flex flex-col gap-3`}
      >
        <WalletConnectButton />
        
        {/* Only show additional mobile actions if connected */}
        {isConnected && (
          <>
            <NetworkSelector className="w-full" />
            <Button
              onClick={() => router.push(action.path)}
              size="sm"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 font-bold"
            >
              {action.icon}
              <span>{action.label}</span>
            </Button>
          </>
        )}
      </div>

      {/* Desktop Actions */}
      <div className="hidden sm:flex items-center gap-3">
        {/* When not connected, WalletConnectButton renders "Get Started".
            We wrap the other buttons in {isConnected} to hide them until login.
        */}
        <WalletConnectButton />

        {isConnected && (
          <>
            <NetworkSelector />
            <Button
              onClick={() => router.push(action.path)}
              size="sm"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 font-bold px-4"
            >
              {action.icon}
              <span>{action.label}</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}