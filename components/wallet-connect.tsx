"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown } from "lucide-react"
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

// Common wallet configurations for fallback
const COMMON_WALLETS = [
  {
    name: "MetaMask",
    icon: "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg",
    downloadUrl: "https://metamask.io/download/",
    mobileDeepLink: "https://metamask.app.link/dapp/",
  },
  {
    name: "Trust Wallet",
    icon: "https://trustwallet.com/assets/images/media/assets/trust_platform.svg",
    downloadUrl: "https://trustwallet.com/download",
    mobileDeepLink: "https://link.trustwallet.com/open_url?coin_id=60&url=",
  },
  {
    name: "Coinbase Wallet",
    icon: "https://avatars.githubusercontent.com/u/18060234?s=280&v=4",
    downloadUrl: "https://www.coinbase.com/wallet/downloads",
    mobileDeepLink: "https://go.cb-w.com/dapp?cb_url=",
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
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
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
      } else if (window.ethereum.isOkxWallet) {
        walletName = "OKX Wallet"
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

      // Check for EIP-6963 providers (modern standard)
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

        // Fallback: Check for legacy window.ethereum
        setTimeout(() => {
          if (window.ethereum && wallets.length === 0) {
            // Try to identify the wallet
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
      // Set the provider for connection
      if (typeof window !== 'undefined') {
        window.ethereum = walletInfo.provider
      }
      
      // Request account access directly
      await walletInfo.provider.request({ method: "eth_requestAccounts" })
      
      // Wait a moment for the provider to be set, then call your existing connect
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
      if (error.code !== 4001) { // 4001 is user rejected request
        toast({
          title: "Connection failed",
          description: `Failed to connect to ${walletInfo.name}: ${error.message}`,
          variant: "destructive",
        })
      }
      setIsConnecting(false)
    }
  }

  const openWalletApp = (walletName: string) => {
    const wallet = COMMON_WALLETS.find(w => w.name === walletName)
    if (!wallet) return

    if (isMobile) {
      // Try to open the wallet app with current URL
      const currentUrl = window.location.href
      const deepLink = `${wallet.mobileDeepLink}${encodeURIComponent(currentUrl)}`
      window.open(deepLink, '_blank')
      
      // Fallback to app store after a delay
      setTimeout(() => {
        window.open(wallet.downloadUrl, '_blank')
      }, 2000)
    } else {
      window.open(wallet.downloadUrl, '_blank')
    }
  }

  const handleConnect = async () => {
    if (availableWallets.length === 0) {
      // No wallets detected, show installation options
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
          {availableWallets.length > 1 && <ChevronDown className="h-4 w-4" />}
        </Button>

        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {availableWallets.length > 0 ? "Choose a Wallet" : "Install a Wallet"}
              </DialogTitle>
              <DialogDescription>
                {availableWallets.length > 0 
                  ? "Select a wallet to connect to this application"
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
                // Show installation options
                COMMON_WALLETS.map((wallet) => (
                  <Button
                    key={wallet.name}
                    variant="outline"
                    className="flex items-center gap-3 h-12 justify-start"
                    onClick={() => openWalletApp(wallet.name)}
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
                        {isMobile ? "Open app or install" : "Install extension"}
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
                    ? "After installing a wallet app, return to this page to connect" 
                    : "After installing a wallet extension, refresh this page to connect"
                  }
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Refresh Page
                </Button>
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