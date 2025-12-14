"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ProfileSettingsModal } from "@/components/profile-setting"

// Backend URL (Ensure this matches your setup)
const API_BASE_URL = "https://fauctdrop-backend.onrender.com";

interface WalletConnectButtonProps {
  className?: string
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { toast } = useToast()

  // State for user profile
  const [username, setUsername] = useState<string>("Anonymous")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch Profile when address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchProfile()
    } else {
      // Reset if disconnected
      setUsername("Anonymous")
      setAvatarUrl(null)
    }
  }, [address, isConnected])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      // Add timestamp to prevent caching issues
      const res = await fetch(`${API_BASE_URL}/api/profile/${address}?t=${Date.now()}`)
      const data = await res.json()
      
      if (data.success && data.profile) {
        setUsername(data.profile.username || "Anonymous")
        setAvatarUrl(data.profile.avatar_url || null)
      } else {
        // Fallback if profile exists but fields are empty
        setUsername("Anonymous")
        setAvatarUrl(null)
      }
    } catch (error) {
      console.error("Failed to fetch profile for button", error)
    } finally {
      setLoading(false)
    }
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

  // 1. DISCONNECTED STATE: Show standard Connect Button
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

  // 2. CONNECTED STATE: Show Dropdown with Avatar & Username
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 pl-1 pr-3 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all rounded-full h-9"
        >
          {/* Avatar Section */}
          <Avatar className="h-6 w-6">
            <AvatarImage src={avatarUrl || ""} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
              {username === "Anonymous" ? <User2 className="h-3 w-3" /> : username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Username Section */}
          <span className="text-xs sm:text-sm font-medium max-w-[100px] truncate">
            {loading ? "Loading..." : username}
          </span>
          
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          {/* Dashboard Link */}
          <DropdownMenuItem asChild>
            <Link href="/faucet/dashboard" className="cursor-pointer flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>

          {/* Settings Modal Trigger (Wrapped in a div to fit MenuItem) */}
          <div className="px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm flex items-center gap-2">
             <div onClick={(e) => e.stopPropagation()} className="w-full">
                <ProfileSettingsModal />
             </div>
          </div>

          {/* Copy Address */}
          <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span>Copy Address</span>
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