"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useThirdweb } from "@/components/thirdweb-provider"
import { ConnectButton } from "thirdweb/react"
import { Button } from "@/components/ui/button"
import { 
  Wallet, 
  LogOut, 
  Copy, 
  ExternalLink, 
  Users, 
  Loader2, 
  Zap
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useNetwork } from "@/hooks/use-network"

interface WalletConnectProps {
  className?: string
  variant?: 'custom' | 'thirdweb'
}

// Separate component for connected wallet dropdown
function ConnectedWalletDropdown({ className }: { className?: string }) {
  const {
    thirdwebAddress,
    disconnectThirdweb,
    switchToSmartWallet,
    isSmartWallet,
  } = useThirdweb()
  
  const { toast } = useToast()
  const { network } = useNetwork()
  const router = useRouter()
  
  const [isNavigatingToVerify, setIsNavigatingToVerify] = useState(false)

  const handleDisconnect = async () => {
    try {
      await disconnectThirdweb()
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
      toast({
        title: "Disconnect failed", 
        description: "Failed to disconnect wallet.",
        variant: "destructive",
      })
    }
  }

  const handleCopyAddress = () => {
    if (thirdwebAddress) {
      navigator.clipboard.writeText(thirdwebAddress)
      toast({
        title: "Address copied",
        description: "Address copied to clipboard",
      })
    }
  }

  const handleVerifyClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsNavigatingToVerify(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push('/verify')
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigatingToVerify(false)
    }
  }

  const handleViewOnExplorer = () => {
    if (thirdwebAddress && network?.blockExplorerUrls) {
      window.open(`${network.blockExplorerUrls}/address/${thirdwebAddress}`, "_blank")
    }
  }

  const handleSwitchToSmartWallet = async () => {
    try {
      await switchToSmartWallet()
    } catch (error) {
      console.error("Error switching to smart wallet:", error)
      toast({
        title: "Smart Wallet Error",
        description: "Failed to switch to smart wallet",
        variant: "destructive",
      })
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getWalletTypeLabel = () => {
    return isSmartWallet ? "Smart Wallet" : "Thirdweb Wallet"
  }

  // Reset navigation loading states
  useEffect(() => {
    const handleRouteChange = () => {
      setIsNavigatingToVerify(false)
    }
    return () => {
      handleRouteChange()
    }
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`flex items-center gap-2 ${className}`}>
          {isSmartWallet ? <Zap className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
          {thirdwebAddress ? truncateAddress(thirdwebAddress) : "Connected"}
          <div className="text-xs opacity-75">
            {getWalletTypeLabel()}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>Wallet</span>
            <span className="text-xs font-normal opacity-75">
              {getWalletTypeLabel()}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleCopyAddress}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleVerifyClick}
            disabled={isNavigatingToVerify}
          >
            {isNavigatingToVerify ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Users className="mr-2 h-4 w-4" />
            )}
            {isNavigatingToVerify ? "Loading..." : "Verify"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewOnExplorer}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Explorer
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {!isSmartWallet && network?.factories.custom && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleSwitchToSmartWallet}>
                <Zap className="mr-2 h-4 w-4" />
                Upgrade to Smart Wallet
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Main wallet connect component
export function WalletConnect({ className, variant = 'custom' }: WalletConnectProps) {
  const { isThirdwebConnected, client, wallets } = useThirdweb()
  
  // Always use thirdweb variant when not connected or when explicitly requested
  if (variant === 'thirdweb' || !isThirdwebConnected) {
    return (
      <ConnectButton
        client={client}
        wallets={wallets}
        connectModal={{ 
          size: "compact",
          title: "Connect Wallet",
          showThirdwebBranding: false,
        }}
        connectButton={{
          label: "Connect Wallet",
          className: className,
        }}
        detailsButton={{
          displayBalanceToken: {
            // You can specify a token here if needed
          }
        }}
      />
    )
  }

  // Show custom dropdown when connected and using custom variant
  return <ConnectedWalletDropdown className={className} />
}

// Thirdweb's prebuilt connect button (recommended)
export function ThirdwebConnectButton({ className }: { className?: string }) {
  const { client, wallets } = useThirdweb()
  
  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      connectModal={{ 
        size: "compact",
        title: "Connect Wallet",
        showThirdwebBranding: false,
      }}
      connectButton={{
        label: "Connect Wallet",
        className: className,
      }}
      detailsButton={{
        displayBalanceToken: {
          // Add token address here if you want to show balance
        }
      }}
    />
  )
}