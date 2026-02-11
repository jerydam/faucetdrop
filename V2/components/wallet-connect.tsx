"use client"

import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useWallet } from "@/components/wallet-provider"
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
  LayoutDashboard, 
  LogOut, 
  Copy, 
  ChevronDown,
  Wallet
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

const API_BASE_URL = "https://fauctdrop-backend.onrender.com"

export function WalletConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  const { address, walletType, isConnected } = useWallet()
  
  const [username, setUsername] = useState<string>("Anonymous")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasFetchedProfile, setHasFetchedProfile] = useState(false)

  // Fetch user profile from backend
  const fetchProfile = useCallback(async () => {
    if (!address || hasFetchedProfile) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${address.toLowerCase()}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.username) {
          setUsername(data.username)
        }
        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl)
        }
        setHasFetchedProfile(true)
        console.log('✅ Profile fetched for:', address.slice(0, 8))
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
    } finally {
      setLoading(false)
    }
  }, [address, hasFetchedProfile])

  // Fetch profile when connected
  useEffect(() => {
    if (isConnected && address && !hasFetchedProfile) {
      fetchProfile()
    }
  }, [isConnected, address, hasFetchedProfile, fetchProfile])

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      const { username: newUsername, avatarUrl: newAvatarUrl } = event.detail
      if (newUsername) setUsername(newUsername)
      if (newAvatarUrl) setAvatarUrl(newAvatarUrl)
    }

    window.addEventListener('profileUpdated' as any, handleProfileUpdate)
    return () => {
      window.removeEventListener('profileUpdated' as any, handleProfileUpdate)
    }
  }, [])

  // Reset state when disconnected
  useEffect(() => {
    if (!isConnected) {
      setUsername("Anonymous")
      setAvatarUrl(null)
      setHasFetchedProfile(false)
    }
  }, [isConnected])

  // Get wallet display name
  const getWalletName = () => {
    if (!wallets[0]) return null
    
    const wallet = wallets[0]
    if (wallet.walletClientType === 'privy') {
      return 'Embedded Wallet'
    }
    // External wallets
    return wallet.walletClientType === 'metamask' ? 'MetaMask' :
           wallet.walletClientType === 'coinbase_wallet' ? 'Coinbase Wallet' :
           wallet.walletClientType === 'rainbow' ? 'Rainbow' :
           wallet.walletClientType === 'zerion' ? 'Zerion' :
           'External Wallet'
  }

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

  // --- UNAUTHENTICATED STATE ---
  if (!isConnected) {
    return (
      <Button 
        onClick={login}
        size="sm" 
        className="bg-transparent border-white hover:border-blue-500 border text-white hover:bg-blue-500/10 text-xs font-bold shadow-blue-900/20 uppercase tracking-widest px-6"
      >
        Get Started
      </Button>
    )
  }

  // --- AUTHENTICATED DROPDOWN ---
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
            {/* Small indicator for wallet type */}
            {walletType === 'external' && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-blue-500 rounded-full border border-background flex items-center justify-center">
                <Wallet className="h-2 w-2 text-white" />
              </div>
            )}
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
              <div className="flex items-center gap-1">
                <p className="text-xs leading-none text-muted-foreground font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
                {walletType === 'external' && (
                  <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                    {getWalletName()}
                  </span>
                )}
              </div>
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