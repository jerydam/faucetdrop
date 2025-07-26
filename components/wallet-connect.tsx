"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown, Smartphone } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
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
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useNetwork } from "@/hooks/use-network"

interface WalletInfo {
  uuid: string
  name: string
  icon: string
  provider: any
}

interface MobileWallet {
  name: string
  icon: string
  downloadUrl: string
  deepLink: string
  scheme: string
}

// Mobile wallet configurations with simplified deep links
const MOBILE_WALLETS: MobileWallet[] = [
  {
    name: "MetaMask",
    icon: "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg",
    downloadUrl: "https://metamask.io/download/",
    deepLink: "metamask://",
    scheme: "metamask",
  },
  {
    name: "Trust Wallet",
    icon: "https://trustwallet.com/assets/images/media/assets/trust_platform.svg", 
    downloadUrl: "https://trustwallet.com/download",
    deepLink: "trust://",
    scheme: "trust",
  },
  {
    name: "Coinbase Wallet",
    icon: "https://avatars.githubusercontent.com/u/18060234?s=280&v=4",
    downloadUrl: "https://www.coinbase.com/wallet/downloads",
    deepLink: "cbwallet://",
    scheme: "cbwallet",
  },
  {
    name: "Rainbow",
    icon: "https://avatars.githubusercontent.com/u/48327834?s=200&v=4",
    downloadUrl: "https://rainbow.me/download",
    deepLink: "rainbow://",
    scheme: "rainbow",
  },
]

export function WalletConnect() {
  const { address, isConnected, connect, disconnect } = useWallet()
  const { toast } = useToast()
  const { network } = useNetwork()
  const [isConnecting, setIsConnecting] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null)

  // Detect if user is on mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(isMobileDevice)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Detect connected wallet name
  useEffect(() => {
    if (isConnected && window.ethereum) {
      let walletName = "Unknown Wallet"
      if (window.ethereum.isMetaMask) {
        walletName = "MetaMask"
      } else if (window.ethereum.isTrust) {
        walletName = "Trust Wallet"
      } else if (window.ethereum.isCoinbaseWallet) {
        walletName = "Coinbase Wallet"
      } else if (window.ethereum.isRabby) {
        walletName = "Rabby"
      } else if (window.ethereum.isRainbow) {
        walletName = "Rainbow"
      }
      setSelectedWalletName(walletName)
    } else {
      setSelectedWalletName(null)
    }
  }, [isConnected])

  // Detect available wallets using EIP-6963
  useEffect(() => {
    const detectWallets = () => {
      const wallets: WalletInfo[] = []

      if (typeof window !== 'undefined') {
        const announceProvider = (event: any) => {
          const { info, provider } = event.detail
          wallets.push({
            uuid: info.uuid,
            name: info.name,
            icon: info.icon,
            provider: provider
          })
        }

        window.addEventListener('eip6963:announceProvider', announceProvider)
        window.dispatchEvent(new Event('eip6963:requestProvider'))

        setTimeout(() => {
          if (window.ethereum && wallets.length === 0) {
            let walletName = "Unknown Wallet"
            let walletIcon = "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg"
            
            if (window.ethereum.isMetaMask) {
              walletName = "MetaMask"
            } else if (window.ethereum.isTrust) {
              walletName = "Trust Wallet"
              walletIcon = "https://trustwallet.com/assets/images/media/assets/trust_platform.svg"
            } else if (window.ethereum.isCoinbaseWallet) {
              walletName = "Coinbase Wallet"
              walletIcon = "https://avatars.githubusercontent.com/u/18060234?s=280&v=4"
            }

            wallets.push({
              uuid: "legacy-ethereum",
              name: walletName,
              icon: walletIcon,
              provider: window.ethereum
            })
          }
          
          setAvailableWallets([...wallets])
        }, 100)

        return () => {
          window.removeEventListener('eip6963:announceProvider', announceProvider)
        }
      }
    }

    detectWallets()
  }, [])

  const connectToWallet = async (walletInfo: WalletInfo) => {
    setIsConnecting(true)
    setShowWalletModal(false)
    
    try {
      if (typeof window !== 'undefined') {
        window.ethereum = walletInfo.provider
      }
      
      await walletInfo.provider.request({ method: "eth_requestAccounts" })
      
      setTimeout(async () => {
        try {
          await connect()
          setSelectedWalletName(walletInfo.name)
          toast({
            title: "Wallet Connected",
            description: `Successfully connected to ${walletInfo.name}`,
          })
        } catch (error: any) {
          console.error("Error in connect():", error)
        }
      }, 100)
      
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      if (error.code !== 4001) {
        toast({
          title: "Connection failed",
          description: `Failed to connect to ${walletInfo.name}: ${error.message}`,
          variant: "destructive",
        })
      }
      setIsConnecting(false)
    }
  }

  const openMobileWallet = (wallet: MobileWallet) => {
    if (!isMobile) {
      window.open(wallet.downloadUrl, '_blank')
      return
    }

    // For mobile, try to open the wallet app directly
    const currentDomain = window.location.hostname
    const currentPath = window.location.pathname
    
    try {
      // Simple deep link that just opens the wallet
      window.location.href = wallet.deepLink
      
      // Fallback to download if the app doesn't open within 2 seconds
      setTimeout(() => {
        const userAgent = navigator.userAgent.toLowerCase()
        
        if (userAgent.includes('android')) {
          // Android - try Google Play Store
          window.open(`https://play.google.com/store/search?q=${wallet.name}&c=apps`, '_blank')
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          // iOS - try App Store
          window.open(`https://apps.apple.com/search?term=${wallet.name}`, '_blank')
        } else {
          // Generic fallback
          window.open(wallet.downloadUrl, '_blank')
        }
      }, 2000)
      
    } catch (error) {
      console.error('Error opening wallet:', error)
      window.open(wallet.downloadUrl, '_blank')
    }
  }

  const handleConnect = async () => {
    if (isMobile && availableWallets.length === 0) {
      // On mobile with no injected wallets, show mobile wallet options
      setShowWalletModal(true)
      return
    }
    
    if (availableWallets.length === 0) {
      // Desktop with no wallets
      setShowWalletModal(true)
      return
    } else if (availableWallets.length === 1) {
      // Only one wallet, connect directly
      await connectToWallet(availableWallets[0])
    } else {
      // Multiple wallets, show selection
      setShowWalletModal(true)
    }
  }

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast({
        title: "Address copied",
        description: "Address copied to clipboard",
      })
    }
  }

  const handleViewOnExplorer = () => {
    if (address && network?.blockExplorerUrls) {
      window.open(`${network.blockExplorerUrls}/address/${address}`, "_blank")
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <>
        <Button 
          onClick={handleConnect} 
          disabled={isConnecting} 
          className="flex items-center gap-2"
        >
          <Wallet className="h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
          {(availableWallets.length > 1 || (isMobile && availableWallets.length === 0)) && <ChevronDown className="h-4 w-4" />}
        </Button>

        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isMobile && <Smartphone className="h-5 w-5" />}
                {availableWallets.length > 0 ? "Choose a Wallet" : (isMobile ? "Connect Mobile Wallet" : "Install a Wallet")}
              </DialogTitle>
              <DialogDescription>
                {availableWallets.length > 0 
                  ? "Select a wallet to connect to this application"
                  : isMobile 
                    ? "Choose a mobile wallet to connect with"
                    : "You need a wallet to connect. Install one of the following:"
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-3">
              {availableWallets.length > 0 ? (
                // Show detected wallets
                availableWallets.map((wallet) => (
                  <Button
                    key={wallet.uuid}
                    variant="outline"
                    className="flex items-center gap-3 h-12 justify-start"
                    onClick={() => connectToWallet(wallet)}
                    disabled={isConnecting}
                  >
                    <img 
                      src={wallet.icon} 
                      alt={wallet.name}
                      className="w-6 h-6 rounded"
                      onError={(e) => {
                        e.currentTarget.src = "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg"
                      }}
                    />
                    <span>{wallet.name}</span>
                  </Button>
                ))
              ) : (
                // Show wallet options (mobile-optimized for mobile, desktop for desktop)
                MOBILE_WALLETS.map((wallet) => (
                  <Button
                    key={wallet.name}
                    variant="outline"
                    className="flex items-center gap-3 h-12 justify-start"
                    onClick={() => openMobileWallet(wallet)}
                  >
                    <img 
                      src={wallet.icon} 
                      alt={wallet.name}
                      className="w-6 h-6 rounded"
                      onError={(e) => {
                        e.currentTarget.src = "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg"
                      }}
                    />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{wallet.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {isMobile ? "Open or install app" : "Install extension"}
                      </span>
                    </div>
                  </Button>
                ))
              )}
            </div>
            
            {availableWallets.length === 0 && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  {isMobile 
                    ? "After installing or opening a wallet app, return here and tap 'Connect Wallet' again" 
                    : "After installing a wallet extension, refresh this page to connect"
                  }
                </p>
                {!isMobile && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.location.reload()}
                    className="mt-2"
                  >
                    Refresh Page
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 min-w-[160px]">
          <Wallet className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {address ? truncateAddress(address) : "Connected"}
            </span>
            {selectedWalletName && (
              <span className="text-xs text-muted-foreground">
                {selectedWalletName}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col">
          <span>Wallet Connected</span>
          {selectedWalletName && (
            <span className="text-sm font-normal text-blue-600 mb-1">
              {selectedWalletName}
            </span>
          )}
          {address && (
            <span className="text-xs font-mono font-normal text-muted-foreground break-all bg-muted p-2 rounded">
              {address}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewOnExplorer}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
