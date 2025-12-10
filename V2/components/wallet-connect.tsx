"use client"

import Link from "next/link"
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Button } from "@/components/ui/button"
import { useWallet } from "./wallet-provider"
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
  const { address, isConnected } = useAppKitAccount()
  const { isFarcaster } = useWallet()
  const { toast } = useToast()
  
  // Format address for display (e.g., 0x12...3456)
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

  // FARCASTER MINIAPP: Show simplified UI
  if (isFarcaster) {
    if (!isConnected || !address) {
      return (
        <Button 
          onClick={() => open()}
          size="sm"
          variant="outline"
          className="flex items-center gap-2 border-purple-500/30 hover:bg-purple-500/10"
        >
          <Wallet className="h-4 w-4" />
          Connect
        </Button>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2 border-purple-500/30 hover:bg-purple-500/10"
          >
            <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="font-mono text-xs sm:text-sm">
              {formatAddress(address)}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded text-[10px] font-semibold">
              FARCASTER
            </span>
            <span>Wallet</span>
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
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // STANDARD WEB: Show full UI with disconnect option
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