"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import sdk from "@farcaster/miniapp-sdk"
import { useWallet } from "./wallet-provider" // Your custom wallet context
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
import { useState, useEffect } from "react"

interface WalletConnectButtonProps {
  className?: string
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const { address, isConnected, connect, chainId } = useWallet()
  const { toast } = useToast()
  const [isMiniApp, setIsMiniApp] = useState(false)
  
  // Detect if running in Farcaster MiniApp
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sdk.actions.ready()
        if (sdk.wallet) {
          setIsMiniApp(true)
        }
      } catch (e) {
        setIsMiniApp(false)
      }
    }
  }, [])
  
  // Format address for display
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

  // Get network name
  const getNetworkName = (chainId: number | null) => {
    if (!chainId) return "Unknown"
    const networks: Record<number, string> = {
      42220: "Celo",
      44787: "Alfajores",
      1135: "Lisk",
      4202: "Lisk Sepolia",
      8453: "Base",
      84532: "Base Sepolia",
      42161: "Arbitrum",
    }
    return networks[chainId] || `Chain ${chainId}`
  }

  // DISCONNECTED STATE
  if (!isConnected || !address) {
    return (
      <Button 
        onClick={connect}
        size="sm"
        className="flex items-center gap-2 font-semibold"
      >
        <Wallet className="h-4 w-4" />
        {isMiniApp ? "Connect Farcaster Wallet" : "Connect Wallet"}
      </Button>
    )
  }

  // CONNECTED STATE
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
        >
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <div className="flex flex-col items-start">
            <span className="font-mono text-xs">
              {formatAddress(address)}
            </span>
            {chainId && (
              <span className="text-[10px] text-muted-foreground">
                {getNetworkName(chainId)}
              </span>
            )}
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          My Account
        </DropdownMenuLabel>
        
        <DropdownMenuGroup>
          {/* Dashboard Link */}
          <DropdownMenuItem asChild>
            <Link href="/faucet/dashboard" className="cursor-pointer flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>

          {/* Copy Address */}
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
          {/* Network Info */}
          {chainId && (
            <DropdownMenuItem disabled className="text-xs">
              <span className="text-muted-foreground">
                Network: {getNetworkName(chainId)}
              </span>
            </DropdownMenuItem>
          )}
          
          {/* Show MiniApp indicator */}
          {isMiniApp && (
            <DropdownMenuItem disabled className="text-xs">
              <span className="text-muted-foreground">
                🟣 Farcaster MiniApp
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}