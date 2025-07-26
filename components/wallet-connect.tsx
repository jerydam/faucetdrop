"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown, Smartphone, QrCode, RefreshCw } from "lucide-react"
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
  universalLink?: string
  supportsWalletConnect: boolean
}

// Enhanced mobile wallet configurations with connection support
const MOBILE_WALLETS: MobileWallet[] = [
  {
    name: "MetaMask",
    icon: "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg",
    downloadUrl: "https://metamask.io/download/",
    deepLink: "metamask://",
    scheme: "metamask",
    universalLink: "https://metamask.app.link",
    supportsWalletConnect: true,
  },
  {
    name: "Trust Wallet",
    icon: "https://trustwallet.com/assets/images/media/assets/trust_platform.svg", 
    downloadUrl: "https://trustwallet.com/download",
    deepLink: "trust://",
    scheme: "trust",
    universalLink: "https://link.trustwallet.com",
    supportsWalletConnect: true,
  },
  {
    name: "Coinbase Wallet",
    icon: "https://avatars.githubusercontent.com/u/18060234?s=280&v=4",
    downloadUrl: "https://www.coinbase.com/wallet/downloads",
    deepLink: "cbwallet://",
    scheme: "cbwallet",
    universalLink: "https://go.cb-w.com",
    supportsWalletConnect: true,
  },
  {
    name: "Rainbow",
    icon: "https://avatars.githubusercontent.com/u/48327834?s=200&v=4",
    downloadUrl: "https://rainbow.me/download",
    deepLink: "rainbow://",
    scheme: "rainbow",
    universalLink: "https://rnbwapp.com",
    supportsWalletConnect: true,
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
  const [connectionUri, setConnectionUri] = useState<string>("")
  const [isWaitingForConnection, setIsWaitingForConnection] = useState(false)

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

  // Generate a mock WalletConnect URI (in a real app, this would come from WalletConnect)
  const generateConnectionUri = () => {
    const topic = Math.random().toString(36).substring(2, 15)
    const version = "2"
    const bridge = encodeURIComponent("wss://relay.walletconnect.org")
    const key = Math.random().toString(36).substring(2, 15)
    
    return `wc:${topic}@${version}?relay-protocol=irn&symKey=${key}`
  }

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

    setIsWaitingForConnection(true)
    
    // Generate connection URI
    const uri = generateConnectionUri()
    setConnectionUri(uri)

    try {
      let connectionUrl = ""
      
      if (wallet.supportsWalletConnect && wallet.universalLink) {
        // Use universal link with WalletConnect URI for supported wallets
        connectionUrl = `${wallet.universalLink}/wc?uri=${encodeURIComponent(uri)}`
      } else {
        // Fallback to basic deep link
        connectionUrl = wallet.deepLink
      }

      // Try to open the wallet with connection context
      window.location.href = connectionUrl
      
      // Show instructions and set timeout
      toast({
        title: "Opening Wallet",
        description: `Opening ${wallet.name}. Please approve the connection request in the app.`,
      })

      // Simulate connection process (in real implementation, this would be handled by WalletConnect)
      setTimeout(() => {
        setIsWaitingForConnection(false)
        // In a real app, you'd check if the connection was successful
        // For demo purposes, we'll show a message
        toast({
          title: "Waiting for Connection",
          description: "If the wallet didn't open, please open it manually and scan the QR code or try again.",
          variant: "default",
        })
      }, 3000)
      
      // Fallback to app store if wallet doesn't open
      setTimeout(() => {
        if (isWaitingForConnection) {
          const userAgent = navigator.userAgent.toLowerCase()
          
          if (userAgent.includes('android')) {
            window.open(`https://play.google.com/store/search?q=${wallet.name}&c=apps`, '_blank')
          } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            window.open(`https://apps.apple.com/search?term=${wallet.name}`, '_blank')
          } else {
            window.open(wallet.downloadUrl, '_blank')
          }
        }
      }, 5000)
      
    } catch (error) {
      console.error('Error opening wallet:', error)
      setIsWaitingForConnection(false)
      window.open(wallet.downloadUrl, '_blank')
    }
  }

  const handleConnect = async () => {
    if (isMobile && availableWallets.length === 0) {
      setShowWalletModal(true)
      return
    }
    
    if (availableWallets.length === 0) {
      setShowWalletModal(true)
      return
    } else if (availableWallets.length === 1) {
      await connectToWallet(availableWallets[0])
    } else {
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

  const handleCopyConnectionUri = () => {
    if (connectionUri) {
      navigator.clipboard.writeText(connectionUri)
      toast({
        title: "Connection URI copied",
        description: "You can paste this in your wallet's WalletConnect section",
      })
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
          disabled={isConnecting || isWaitingForConnection} 
          className="flex items-center gap-2"
        >
          {isWaitingForConnection ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {isConnecting ? "Connecting..." : isWaitingForConnection ? "Waiting..." : "Connect Wallet"}
          {(availableWallets.length > 1 || (isMobile && availableWallets.length === 0)) && !isWaitingForConnection && <ChevronDown className="h-4 w-4" />}
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
                    ? "Choose a mobile wallet to connect with. The app will open and prompt for connection."
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
                // Show wallet options
                MOBILE_WALLETS.map((wallet) => (
                  <Button
                    key={wallet.name}
                    variant="outline"
                    className="flex items-center gap-3 h-12 justify-start"
                    onClick={() => openMobileWallet(wallet)}
                    disabled={isWaitingForConnection}
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
                        {isMobile 
                          ? (wallet.supportsWalletConnect ? "Open with connection" : "Open app") 
                          : "Install extension"
                        }
                      </span>
                    </div>
                    {wallet.supportsWalletConnect && isMobile && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    )}
                  </Button>
                ))
              )}
            </div>
            
            {/* Connection instructions for mobile */}
            {isMobile && connectionUri && (
              <div className="border-t pt-4 space-y-3">
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">Alternative: Scan QR Code</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <QrCode className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2">
                      QR code would appear here in a real implementation
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCopyConnectionUri}
                    className="mt-2"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Connection URI
                  </Button>
                </div>
              </div>
            )}
            
            {availableWallets.length === 0 && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  {isMobile 
                    ? "If a wallet doesn't open automatically, you can manually open your wallet app and use WalletConnect to scan the QR code above" 
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
