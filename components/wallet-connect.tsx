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

// WalletConnect v2 configuration
const WALLET_CONNECT_PROJECT_ID = "74741d9e8bc67b41af442f267e9514b1"

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
  const [showQrCode, setShowQrCode] = useState(false)

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

  // Initialize WalletConnect v2
  useEffect(() => {
    const initWalletConnect = async () => {
      try {
        // Import WalletConnect v2 packages
        const { createWeb3Modal, defaultConfig } = await import('@web3modal/ethers')
        
        // Configure chains
        const chains = networks.map(network => ({
          chainId: network.chainId,
          name: network.name,
          currency: network.nativeCurrency.symbol,
          explorerUrl: network.blockExplorerUrls,
          rpcUrl: network.rpcUrl
        }))

        // Create Web3Modal configuration
        const ethersConfig = defaultConfig({
          metadata: {
            name: 'Your App Name',
            description: 'Your App Description',
            url: window.location.origin,
            icons: ['https://avatars.githubusercontent.com/u/37784886']
          },
          defaultChainId: 42220, // Celo
          rpcUrl: 'https://cloudflare-eth.com'
        })

        // Create Web3Modal instance
        const modal = createWeb3Modal({
          ethersConfig,
          chains,
          projectId: WALLET_CONNECT_PROJECT_ID,
          enableAnalytics: false,
          featuredWalletIds: [
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
            '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
            'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
          ]
        })

        setWalletConnectClient(modal)
      } catch (error) {
        console.error('Failed to initialize WalletConnect:', error)
        
        // Fallback to older WalletConnect if new version fails
        try {
          const { default: WalletConnectProvider } = await import('@walletconnect/web3-provider')
          
          const rpcConfig = networks.reduce((acc, network) => {
            acc[network.chainId] = network.rpcUrl
            return acc
          }, {} as Record<number, string>)
          
          const provider = new WalletConnectProvider({
            rpc: rpcConfig,
            chainId: 42220,
            qrcode: true,
            qrcodeModalOptions: {
              mobileLinks: MOBILE_WALLETS.map(w => w.scheme)
            }
          })
          
          setWalletConnectClient(provider)
        } catch (fallbackError) {
          console.error('Fallback WalletConnect initialization failed:', fallbackError)
        }
      }
    }

    initWalletConnect()
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

  // Fixed WalletConnect connection for mobile
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
    setShowQrCode(true)
    
    try {
      // For Web3Modal (WalletConnect v2)
      if (walletConnectClient.open) {
        await walletConnectClient.open()
        
        // Listen for connection
        walletConnectClient.subscribeProvider((newState: any) => {
          if (newState.isConnected) {
            setIsWaitingForConnection(false)
            setShowWalletModal(false)
            setShowQrCode(false)
            
            toast({
              title: "Wallet Connected",
              description: "Successfully connected via WalletConnect",
            })
          }
        })
      } 
      // For legacy WalletConnect
      else if (walletConnectClient.enable) {
        await walletConnectClient.enable()
        
        if (typeof window !== 'undefined') {
          window.ethereum = walletConnectClient
        }
        
        await connect()
        
        setIsWaitingForConnection(false)
        setShowWalletModal(false)
        setShowQrCode(false)
        
        toast({
          title: "Wallet Connected",
          description: "Successfully connected via WalletConnect",
        })
      }
      
    } catch (error: any) {
      console.error("WalletConnect error:", error)
      setIsWaitingForConnection(false)
      setShowQrCode(false)
      
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

  // Improved mobile wallet connection with proper WalletConnect flow
  const openMobileWallet = async (wallet: MobileWallet) => {
    if (!isMobile) {
      window.open(wallet.downloadUrl, '_blank')
      return
    }

    // Always use WalletConnect for mobile connections
    if (wallet.supportsWalletConnect && walletConnectClient) {
      await connectWithWalletConnect()
      return
    }

    // Fallback: Show instructions to download wallet
    toast({
      title: `Install ${wallet.name}`,
      description: `Please install ${wallet.name} from your app store and return to connect.`,
      variant: "default",
    })
    
    // Open app store
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('android')) {
      window.open(`https://play.google.com/store/search?q=${wallet.name}&c=apps`, '_blank')
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      window.open(`https://apps.apple.com/search?term=${wallet.name}`, '_blank')
    } else {
      window.open(wallet.downloadUrl, '_blank')
    }
  }

  const handleConnect = async () => {
    // On mobile, show WalletConnect option first
    if (isMobile) {
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
          {!isWaitingForConnection && <ChevronDown className="h-4 w-4" />}
        </Button>

        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent className="sm:max-w-md bg-[#020817] border-gray-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-100">
                {isMobile && <Smartphone className="h-5 w-5" />}
                {isMobile ? "Connect Mobile Wallet" : "Choose a Wallet"}
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                {isMobile 
                  ? "Connect using WalletConnect or install a mobile wallet app."
                  : availableWallets.length > 0 
                    ? "Select a wallet to connect to this application"
                    : "You need a wallet to connect. Install one of the following:"
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-3 bg-[#020817] p-4 rounded-lg">
              {/* Show WalletConnect option first for mobile */}
              {isMobile && (
                <Button
                  variant="outline"
                  className="flex items-center gap-3 h-12 justify-start border-blue-600 bg-blue-900/20 hover:bg-blue-800/30 text-gray-200"
                  onClick={connectWithWalletConnect}
                  disabled={isWaitingForConnection}
                >
                  <QrCode className="w-6 h-6 text-blue-400" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-blue-200">WalletConnect</span>
                    <span className="text-xs text-blue-300">
                      Connect any mobile wallet
                    </span>
                  </div>
                  {isWaitingForConnection && (
                    <RefreshCw className="ml-auto w-4 h-4 animate-spin text-blue-400" />
                  )}
                </Button>
              )}

              {availableWallets.length > 0 ? (
                // Show detected wallets
                availableWallets.map((wallet) => (
                  <Button
                    key={wallet.uuid}
                    variant="outline"
                    className="flex items-center gap-3 h-12 justify-start border-gray-600 bg-transparent hover:bg-gray-700 text-gray-200"
                    onClick={() => connectToWallet(wallet)}
                    disabled={isConnecting}
                  >
                    <span>{wallet.name}</span>
                  </Button>
                ))
              ) : (
                // Show wallet installation options
                MOBILE_WALLETS.map((wallet) => (
                  <Button
                    key={wallet.name}
                    variant="outline"
                    className="flex items-center gap-3 h-12 justify-start border-gray-600 bg-transparent hover:bg-gray-700 text-gray-200"
                    onClick={() => openMobileWallet(wallet)}
                    disabled={isWaitingForConnection}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{wallet.name}</span>
                      <span className="text-xs text-gray-400">
                        {isMobile ? "Install and connect" : "Install extension"}
                      </span>
                    </div>
                  </Button>
                ))
              )}
            </div>
            
            {/* Instructions */}
            <div className="text-center pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">
                {isMobile 
                  ? "Tap WalletConnect above to connect with any mobile wallet app." 
                  : "After installing a wallet extension, refresh this page to connect"
                }
              </p>
              {!isMobile && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="mt-2 text-gray-300 hover:text-gray-100 hover:bg-gray-700"
                >
                  Refresh Page
                </Button>
              )}
            </div>
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