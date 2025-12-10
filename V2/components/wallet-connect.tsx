"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/components/wallet-provider"
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
  Wallet, LayoutDashboard, LogOut, User2, Copy, ChevronDown 
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function WalletConnectButton({ className }: { className?: string }) {
  const { address, isConnected, isFarcaster, connect, disconnect } = useWallet()
  const { toast } = useToast()

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast({ title: "Address Copied" })
    }
  }

  // 1. Farcaster View (Minimal)
  if (isFarcaster && address) {
    return (
      <Button variant="ghost" className="font-mono text-xs border border-primary/20 bg-purple-500/10 text-purple-200">
        <div className="h-2 w-2 rounded-full bg-purple-500 mr-2 animate-pulse" />
        {formatAddress(address)}
      </Button>
    );
  }

  // 2. Disconnected State
  if (!isConnected) {
    return (
      <Button onClick={connect} size="sm" className="flex items-center gap-2 font-semibold">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  // 3. Web Connected State (Dropdown)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-xs">{formatAddress(address!)}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/faucet/dashboard" className="cursor-pointer flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopy} className="cursor-pointer flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span>Copy Address</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="text-red-500 cursor-pointer flex gap-2">
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}