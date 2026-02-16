"use client"

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { WalletConnectButton } from "@/components/wallet-connect";
import { NetworkSelector, MiniNetworkIndicator } from "@/components/network-selector";
import Link from "next/link";
import { Menu, X, ChevronLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";

export function Header({ 
  pageTitle, 
  hideAction = false 
}: { 
  pageTitle: string; 
  hideAction?: boolean; 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 1. Create a ref for the menu content AND the toggle button
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null); // New Ref

  const router = useRouter();
  const pathname = usePathname();
  const { isConnected } = useWallet();

  const getActionConfig = () => {
    if (pathname.includes('/quest')) {
      return { label: "Create Quest", path: "/quest/create-quest" };
    }
    if (pathname.includes('/quiz')) {
      return { label: "Create Quiz", path: "/quiz/create-quiz" };
    }
    return { label: "Create Faucet", path: "/faucet/create-faucet" };
  };

  const action = getActionConfig();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // 2. Check if click is outside Menu AND outside the Button
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] w-full bg-[#030712]/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-10 h-20">
        <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between">
          
          {/* Left Section */}
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
                {!hideAction && (
                  <Button
                      onClick={() => router.push(action.path)}
                      variant="outline"
                      className="bg-transparent border-white/10 hover:border-blue-500 hover:bg-blue-500/10 text-xs font-bold uppercase tracking-widest px-6"
                  >
                      {action.label}
                  </Button>
                )}
              </>
            )}
            <WalletConnectButton />
          </div>

          {/* Mobile Actions */}
          <div className="lg:hidden flex items-center gap-2 sm:gap-3">
            <WalletConnectButton />
            {isConnected && (
              <MiniNetworkIndicator className="h-9 w-9" />
            )}
            <Button
              ref={buttonRef} // 3. Attach the ref to the button
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
            ref={menuRef} // 4. Keep this ref here
            className="lg:hidden absolute top-20 left-0 w-full bg-[#030712] border-b border-white/10 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-2"
          >
            {isConnected && !hideAction && (
              <Button
                onClick={() => {
                  router.push(action.path);
                  setIsMenuOpen(false);
                }}
                className="bg-transparent border-white text-white hover:border-blue-500 hover:bg-blue-500/10 text-xs font-bold uppercase tracking-widest px-6"
              >
                <span className="ml-2">{action.label}</span>
              </Button>
            )}
          </div>
        )}
      </header>
      
      {/* Spacer to prevent content from being hidden under fixed header */}
      <div className="h-20" />
    </>
  );
}