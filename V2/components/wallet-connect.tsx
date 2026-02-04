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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Wallet, 
  LayoutDashboard, 
  LogOut, 
  Copy, 
  ChevronDown,
  Mail,
  UserPlus,
  Zap,
  Sparkles,
  ExternalLink
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import Image from "next/image"

const API_BASE_URL = "https://fauctdrop-backend.onrender.com" 

export function WalletConnectButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  
  const [username, setUsername] = useState<string>("Anonymous")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      fetchProfile();
      setIsAuthModalOpen(false); // Close the popup automatically on connect
      
      const handleUpdate = () => fetchProfile();
      window.addEventListener("profileUpdated", handleUpdate);
      return () => window.removeEventListener("profileUpdated", handleUpdate);
    } else {
      setUsername("Anonymous");
      setAvatarUrl(null);
    }
  }, [address, isConnected]);
 
  const fetchProfile = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/${address.toLowerCase()}?t=${Date.now()}`);
      const data = await res.json();
      if (data.success && data.profile?.username) {
        setUsername(data.profile.username);
        setAvatarUrl(data.profile.avatar_url || null);
      }
    } catch (error) {
      console.error("Profile fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  // --- UNAUTHENTICATED STATE WITH POPUP ---
  if (!isConnected || !address) {
    return (
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogTrigger asChild>
          <Button 
            size="sm" 
             className="bg-transparent border-white hover:border-blue-500 border  text-white hover:bg-blue-500/10 text-xs font-bold shadow-blue-900/20 uppercase tracking-widest px-6"
          >
            Get Started
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-[400px] bg-[#080d19] border-white/10 text-white rounded-[2rem] overflow-hidden">
        <DialogHeader className="items-center text-center pb-2">
          {/* The container maintains the same 14x14 (56px) size and rounded styling */}
          <div className="w-14 h-14 flex items-center justify-center mb-4  overflow-hidden">
            <Image
              src="/favicon.png" // Replace with your square logo path if you have one
              alt="FaucetDrops Favicon"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Join FaucetDrops
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose your preferred way to start your onchain journey.
          </DialogDescription>
        </DialogHeader>

          <div className="grid gap-3 py-6">
            {/* Wallet Connect Path */}
            <Button 
              onClick={() => { open(); }}
              variant="outline" 
              className="h-16 justify-start gap-4 border-white/5 bg-white/5 hover:bg-blue-600/10 hover:border-blue-500/50 transition-all rounded-2xl px-5 group"
            >
              <div className="bg-blue-500 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">Connect Wallet</div>
                <div className="text-[10px] text-gray-500 font-medium">MetaMask, Phantom, or Mobile App</div>
              </div>
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black"><span className="bg-[#080d19] px-3 text-gray-600">Secure Web2 Auth</span></div>
            </div>

            {/* Email Path */}
            <div className="grid grid-cols-2 gap-3">
               <Button 
                variant="outline" 
                className="h-12 gap-2 border-white/5 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs"
              >
                <Mail className="h-4 w-4 text-emerald-500" />
                Login
              </Button>
              <Button 
                variant="outline" 
                className="h-12 gap-2 border-white/5 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs"
              >
                <UserPlus className="h-4 w-4 text-purple-500" />
                Sign Up
              </Button>
            </div>
          </div>

          <p className="text-center text-[10px] text-gray-600">
            By connecting, you agree to our Terms of Service.
          </p>
        </DialogContent>
      </Dialog>
    )
  }

  // --- AUTHENTICATED DROPDOWN ---
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
      <Button 
        variant="outline" 
        size="sm"
        // Reduced padding and height for a more compact mobile look
        className="flex items-center gap-2 p-1 sm:pr-3 border-primary/20 hover:bg-primary/5 transition-all rounded-full h-9 relative"
      >
        <div className="relative">
          <Avatar className="h-7 w-7 border border-background shadow-sm">
            <AvatarImage src={avatarUrl || ""} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
              {username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* 'hidden' hides the username and arrow on mobile.
            'sm:flex' or 'sm:block' restores them on larger screens.
        */}
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
            <p className="text-xs leading-none text-muted-foreground font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link 
            href={`/dashboard/${username === 'Anonymous' ? address.toLowerCase() : username}`} 
            className="cursor-pointer flex items-center gap-2"> 
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => {
            navigator.clipboard.writeText(address);
            toast.success("Address copied to clipboard!");
          }} className="cursor-pointer flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span>Copy Address</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => open()} className="cursor-pointer flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          <span>Wallet Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => open({ view: 'Account' })} className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}