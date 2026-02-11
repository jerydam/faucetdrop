"use client"

import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'
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
// Removed Dialog imports since we are using Privy's native modal now
import { 
  LayoutDashboard, 
  LogOut, 
  Copy, 
  ChevronDown
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

const API_BASE_URL = "https://fauctdrop-backend.onrender.com"

export function WalletConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { address, isConnected: wagmiConnected } = useAccount()
  
  const [username, setUsername] = useState<string>("Anonymous")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasFetchedProfile, setHasFetchedProfile] = useState(false)

  const isConnected = authenticated && wagmiConnected && !!address

  // ... (Keep your existing fetchProfile and useEffect logic exactly as it is) ...
  // [Paste your existing fetchProfile, useEffects, and event listeners here]
  
  // Note: I am omitting the fetch logic here for brevity, 
  // but you should keep the exact same logic you provided in your snippet.

  // --- LOADING STATE ---
  if (!ready) {
    return (
      <Button 
        size="sm" 
        disabled
        className="bg-transparent border-white hover:border-blue-500 border text-white hover:bg-blue-500/10 text-xs font-bold shadow-blue-900/20 uppercase tracking-widest px-6"
      >
        Loading...
      </Button>
    )
  }

  // --- UNAUTHENTICATED STATE (Simplified) ---
  if (!isConnected) {
    return (
      <Button 
        onClick={login} // Direct Privy Login
        size="sm" 
        className="bg-transparent border-white hover:border-blue-500 border text-white hover:bg-blue-500/10 text-xs font-bold shadow-blue-900/20 uppercase tracking-widest px-6"
      >
        Get Started
      </Button>
    )
  }

  // --- AUTHENTICATED DROPDOWN (Unchanged) ---
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 p-1 sm:pr-3 border-primary/20 hover:bg-primary/5 transition-all rounded-full h-9 relative"
        >
          <div className="relative">
            <Avatar className="h-7 w-7 border border-background shadow-sm">
              <AvatarImage 
                src={avatarUrl || user?.google?.profilePictureUrl || user?.twitter?.profilePictureUrl || ""} 
                className="object-cover" 
              />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                {username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <span className="hidden sm:block text-xs sm:text-sm font-medium max-w-[100px] truncate">
            {loading ? "..." : username}
          </span>
          <ChevronDown className="hidden sm:block h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            {user?.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email.address}
              </p>
            )}
            {address && (
              <p className="text-xs leading-none text-muted-foreground font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link 
              href={`/dashboard/${username === 'Anonymous' ? address?.toLowerCase() : username}`} 
              className="cursor-pointer flex items-center gap-2"
            > 
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>

          {address && (
            <DropdownMenuItem 
              onClick={() => {
                navigator.clipboard.writeText(address)
                toast.success("Address copied to clipboard!")
              }} 
              className="cursor-pointer flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              <span>Copy Address</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      
        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={logout} 
          className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}