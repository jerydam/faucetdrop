"use client"

import Link from "next/link"
import { useAppKit } from '@reown/appkit/react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Wallet, 
  LayoutDashboard, 
  LogOut, 
  User2,
  Copy, 
  ChevronDown,
  ExternalLink
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/components/wallet-provider" // Make sure this path is correct

export function WalletConnectButton({ className }: { className?: string }) {
  const { open } = useAppKit()
  const { toast } = useToast()
  
  // Get state from our custom provider
  const { address, isConnected, isFarcaster } = useWallet() 
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  // --- 1. FARCASTER MODE ---
  // If in Farcaster, we HIDE the connect button completely.
  // We only display the connected wallet address as a static badge.
  if (isFarcaster) {
     if (address) {
       return (
         <div className={`flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-full border border-border/50 ${className}`}>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-xs font-medium text-foreground/80">
              {formatAddress(address)}
            </span>
         </div>
       );
     }
     // If loading or not connected yet in Farcaster, return nothing (clean UI)
     return null;
  }

  // --- 2. STANDARD WEB MODE ---
  // (Your existing AppKit Logic)
  
  if (!isConnected || !address) {
    return (
      <Button 
        onClick={() => open()}
        size="sm"
        className="flex items-center gap-2 font-semibold"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
        >
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-xs sm:text-sm">
            {formatAddress(address)}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          My Account
        </DropdownMenuLabel>
        
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/faucet/dashboard" className="cursor-pointer flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span>Copy Address</span>
          </DropdownMenuItem>
           <DropdownMenuItem asChild>
            <Link href="/verify" className="cursor-pointer flex items-center gap-2">
              <User2 className="h-4 w-4" />
              <span>Verify</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => open()} className="cursor-pointer flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            <span>Wallet Settings</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => open({ view: 'Account' })} 
            className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}