"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePrivy, useWallets, type User } from '@privy-io/react-auth'
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
  Wallet,
  User as UserIcon
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

const API_BASE_URL = "https://fauctdrop-backend.onrender.com"

export function WalletConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  const { address, walletType, isConnected } = useWallet()
  
  const [username, setUsername] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // --- 1. Robust Fetching Logic ---
  useEffect(() => {
    if (!isConnected || !address) {
      setUsername(null)
      setAvatarUrl(null)
      return
    }

    let isMounted = true
    setLoading(true)
    
    setUsername(null)
    setAvatarUrl(null)

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${address.toLowerCase()}`)
        
        if (response.ok) {
          const data = await response.json()
          
          // FIX: Handle nested 'profile' object logic just like the Dashboard
          const profileData = data.profile || (data.username ? data : null)

          if (isMounted && profileData) {
            if (profileData.username) {
              setUsername(profileData.username)
            }
            // Handle both snake_case (DB) and camelCase (API variants)
            const avatar = profileData.avatar_url || profileData.avatarUrl
            if (avatar) {
              setAvatarUrl(avatar)
            }
          }
        }
      } catch (error) {
        console.error("❌ Failed to fetch user profile:", error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [address, isConnected])

  // --- 2. Listen for Manual Updates ---
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

  // --- 3. Helpers ---
  const getSocialImage = (user: User | null) => {
    if (!user) return ""
    const google = user.google as any
    const twitter = user.twitter as any
    return avatarUrl || google?.picture || google?.profilePictureUrl || twitter?.profilePictureUrl || ""
  }

  const getWalletName = () => {
    if (!wallets[0]) return null
    const wallet = wallets[0]
    if (wallet.walletClientType === 'privy') return 'Embedded Wallet'
    return wallet.walletClientType === 'metamask' ? 'MetaMask' :
           wallet.walletClientType === 'coinbase_wallet' ? 'Coinbase' :
           'External Wallet'
  }

  const displayName = username || "Anonymous"
  
  const dashboardLink = username 
    ? `/dashboard/${username}` 
    : `/dashboard/${address?.toLowerCase() || ''}`

  if (!ready) {
    return (
      <Button 
        size="sm" 
        disabled
        variant="outline"
        className="text-xs font-bold uppercase tracking-widest px-6 opacity-50 border-border"
      >
        Loading...
      </Button>
    )
  }

  if (!isConnected) {
    return (
      <Button 
        onClick={login}
        size="sm" 
        variant="default" // Use the primary theme color for maximum visibility
        className="text-xs font-bold uppercase tracking-widest px-6 shadow-md hover:scale-105 transition-all"
      >
        Get Started
      </Button>
    )
  }

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
                src={getSocialImage(user)} 
                className="object-cover" 
              />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>
            {walletType === 'external' && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-blue-500 rounded-full border border-background flex items-center justify-center">
                <Wallet className="h-2 w-2 text-white" />
              </div>
            )}
          </div>

          <span className="hidden sm:block text-xs sm:text-sm font-medium max-w-[100px] truncate">
            {loading ? "..." : displayName}
          </span>
          <ChevronDown className="hidden sm:block h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-56 z-[200]" 
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate">
              {displayName}
            </p>
            {user?.email && (
              <p className="text-xs leading-none text-muted-foreground truncate">
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
              href={dashboardLink} 
              className="cursor-pointer flex items-center gap-2"
            > 
              {username ? <UserIcon className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
              <span>{username ? "Profile" : "Dashboard"}</span>
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