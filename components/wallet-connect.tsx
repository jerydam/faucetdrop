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

// Network configurations
const ZeroAddress = "0x0000000000000000000000000000000000000000"

interface Network {
  name: string
  chainId: number
  rpcUrl: string
  blockExplorerUrls: string
  explorerUrl?: string
  color: string
  factoryAddresses: string[]
  tokenAddress: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

const networks: Network[] = [
  {
    name: "Celo",
    chainId: 42220,
    rpcUrl: "https://forno.celo.org",
    blockExplorerUrls: "https://celoscan.io",
    color: "#35D07F",
    factoryAddresses: [
      "0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f"
    ],
    tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    nativeCurrency: {
      name: "Celo",
      symbol: "CELO",
      decimals: 18,
    },
  },
  {
    name: "Lisk",
    chainId: 1135,
    rpcUrl: "https://rpc.api.lisk.com",
    blockExplorerUrls: "https://blockscout.lisk.com",
    explorerUrl: "https://blockscout.lisk.com",
    color: "#0D4477",
    factoryAddresses: [
      "0x96E9911df17e94F7048cCbF7eccc8D9b5eDeCb5C",
      "0x4F5Cf906b9b2Bf4245dba9F7d2d7F086a2a441C2"
    ],
    tokenAddress: ZeroAddress,
    nativeCurrency: {
      name: "Lisk",
      symbol: "LISK",
      decimals: 18,
    },
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorerUrls: "https://arbiscan.io",
    explorerUrl: "https://arbiscan.io",
    color: "#28A0F0",
    factoryAddresses: ["0x0F779235237Fc136c6EE9dD9bC2545404CDeAB36"],
    tokenAddress: ZeroAddress,
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
]

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
  const [walletConnectClient, setWalletConnectClient] = useState<any>(null)

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

  // Initialize WalletConnect with your specific chains
  useEffect(() => {
    const initWalletConnect = async () => {
      try {
        const WalletConnectProvider = (await import('@walletconnect/web3-provider')).default;
        
        // Build RPC configuration from networks array
        const rpcConfig = networks.reduce((acc, network) => {
          acc[network.chainId] = network.rpcUrl
          return acc
        }, {} as Record<number, string>)
        
        // Add Ethereum mainnet as fallback
        rpcConfig[1] = `https://mainnet.infura.io/v3/ ${process.env.INFURA_KEY}`
        
        const provider = new WalletConnectProvider({
          rpc: rpcConfig,
          chainId: 42220, // Default to Celo
          qrcode: true,
          qrcodeModalOptions: {
            mobileLinks: MOBILE_WALLETS.map(w => w.scheme)
          }
        });
        setWalletConnectClient(provider);
      } catch (error) {
        console.error('Failed to initialize WalletConnect:', error)
      }
    }

    if (isMobile) {
      initWalletConnect()
    }
  }, [isMobile])

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

  // Fixed: Proper WalletConnect connection for mobile
  const connectWithWalletConnect = async () => {
    if (!walletConnectClient) {
      toast({
        title: "WalletConnect not available",
        description: "Please try connecting on desktop or install a wallet browser extension.",
        variant: "destructive",
      })
      return
    }

    setIsWaitingForConnection(true)
    
    try {
      // Enable WalletConnect
      await walletConnectClient.enable()
      
      // Set up provider
      if (typeof window !== 'undefined') {
        window.ethereum = walletConnectClient
      }
      
      // Connect using your existing hook
      await connect()
      
      setIsWaitingForConnection(false)
      setShowWalletModal(false)
      
      toast({
        title: "Wallet Connected",
        description: "Successfully connected via WalletConnect",
      })
      
    } catch (error: any) {
      console.error("WalletConnect error:", error)
      setIsWaitingForConnection(false)
      
      if (error.code !== 4001) { // User rejected
        toast({
          title: "Connection failed",
          description: "Failed to connect with WalletConnect. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const connectToWallet = async (walletInfo: WalletInfo) => {
    setIsConnecting(true)
    setShowWalletModal(false)
    
    try {
      // Set the provider globally
      if (typeof window !== 'undefined') {
        window.ethereum = walletInfo.provider
      }
      
      // Request account access
      const accounts = await walletInfo.provider.request({ 
        method: "eth_requestAccounts" 
      })
      
      if (accounts && accounts.length > 0) {
        // Small delay to ensure provider is set
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Connect using your existing hook
        await connect()
        
        setSelectedWalletName(walletInfo.name)
        
        toast({
          title: "Wallet Connected",
          description: `Successfully connected to ${walletInfo.name}`,
        })
      } else {
        throw new Error("No accounts returned")
      }
      
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      
      if (error.code === 4001) {
        // User rejected the request
        toast({
          title: "Connection cancelled",
          description: "Wallet connection was cancelled by user",
        })
      } else {
        toast({
          title: "Connection failed",
          description: `Failed to connect to ${walletInfo.name}: ${error.message}`,
          variant: "destructive",
        })
      }
    } finally {
      setIsConnecting(false)
    }
  }

  // Fixed: Mobile wallet connection with proper deep linking
  const openMobileWallet = async (wallet: MobileWallet) => {
    if (!isMobile) {
      window.open(wallet.downloadUrl, '_blank')
      return
    }

    // For mobile, we should use WalletConnect instead of just opening the app
    if (wallet.supportsWalletConnect) {
      await connectWithWalletConnect()
      return
    }

    // Fallback: try to open the wallet app and show instructions
    setIsWaitingForConnection(true)
    
    try {
      // Try to open the wallet app
      window.location.href = wallet.deepLink
      
      toast({
        title: "Opening Wallet",
        description: `Opening ${wallet.name}. Please return to this browser and refresh if the connection doesn't complete automatically.`,
      })

      // Set a timer to check for connection
      setTimeout(() => {
        setIsWaitingForConnection(false)
        
        // Check if we're still not connected
        if (!isConnected) {
          toast({
            title: "Manual Connection Required",
            description: `Please open ${wallet.name} manually and connect to this site, or try using WalletConnect.`,
            variant: "default",
          })
        }
      }, 5000)
      
    } catch (error) {
      console.error('Error opening wallet:', error)
      setIsWaitingForConnection(false)
      
      // Fallback to app store
      const userAgent = navigator.userAgent.toLowerCase()
      if (userAgent.includes('android')) {
        window.open(`https://play.google.com/store/search?q=${wallet.name}&c=apps`, '_blank')
      } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        window.open(`https://apps.apple.com/search?term=${wallet.name}`, '_blank')
      } else {
        window.open(wallet.downloadUrl, '_blank')
      }
    }
  }

  // Fixed: Better connection handling
  const handleConnect = async () => {
    // On mobile with no detected wallets, show WalletConnect option
    if (isMobile && availableWallets.length === 0) {
      setShowWalletModal(true)
      return
    }
    
    // If no wallets detected, show installation options
    if (availableWallets.length === 0) {
      setShowWalletModal(true)
      return
    } 
    
    // If only one wallet, connect directly
    if (availableWallets.length === 1) {
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
                    ? "Connect using WalletConnect or install a mobile wallet app."
                    : "You need a wallet to connect. Install one of the following:"
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-3">
              {/* Show WalletConnect option for mobile */}
              {isMobile && availableWallets.length === 0 && (
                <Button
                  variant="outline"
                  className="flex items-center gap-3 h-12 justify-start border-blue-200 bg-blue-50 hover:bg-blue-100"
                  onClick={connectWithWalletConnect}
                  disabled={isWaitingForConnection}
                >
                  <QrCode className="w-6 h-6 text-blue-600" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-blue-900">WalletConnect</span>
                    <span className="text-xs text-blue-600">
                      Universal connection method
                    </span>
                  </div>
                  <div className="ml-auto">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </Button>
              )}

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
                // Show wallet installation options
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
                        {isMobile ? "Install and connect" : "Install extension"}
                      </span>
                    </div>
                  </Button>
                ))
              )}
            </div>
            
            {/* Instructions */}
            {availableWallets.length === 0 && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  {isMobile 
                    ? "For best results, use WalletConnect above or install a wallet app and return to this page." 
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