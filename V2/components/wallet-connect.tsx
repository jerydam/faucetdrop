"use client"

import Link from "next/link"
import { useAppKit } from '@reown/appkit/react'
import { Button } from "@/components/ui/button"
import { useWallet } from "@/components/wallet-provider" // 1. Import your custom hook
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

interface WalletConnectButtonProps {
  className?: string
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const { open } = useAppKit()
  
  // 2. Use your custom hook, which now handles Farcaster + Wagmi unified
  const { address, isConnected, isFarcaster, disconnect } = useWallet() 
  const { toast } = useToast()
  
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

  // 3. Farcaster Specific View
  if (isFarcaster && address) {
     return (
        <Button variant="ghost" className="font-mono text-xs border border-primary/20">
           <div className="h-2 w-2 rounded-full bg-purple-500 mr-2 animate-pulse" />
           {formatAddress(address)}
        </Button>
     );
  }

  // 4. Standard Connect Logic (Fallback to AppKit/Reown modal for web users)
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

  // 5. Standard Connected Dropdown (Web users)
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
            onClick={() => disconnect()} 
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