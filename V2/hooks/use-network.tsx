"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ZeroAddress } from "ethers"
import { useToast } from "@/hooks/use-toast"
import { defineChain } from "thirdweb"
import { useActiveWalletChain, useSwitchActiveWalletChain, useActiveWallet } from "thirdweb/react"

export interface Network {
  name: string
  symbol: string
  chainId: number
  rpcUrl: string
  blockExplorerUrls: string
  explorerUrl?: string
  color: string
  logoUrl: string
  iconUrl?: string
  factoryAddresses: string[]
  factories: {
    dropcode?: string
    droplist?: string
    custom?: string
  }
  tokenAddress: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  isTestnet?: boolean
}

const networks: Network[] = [
  {
    name: "Celo",
    symbol: "CELO",
    chainId: 42220,
    rpcUrl: "https://forno.celo.org",
    blockExplorerUrls: "https://celoscan.io",
    color: "#35D07F",
    logoUrl: "/celo.png",
    iconUrl: "/celo.png",
    factoryAddresses: [
      "0xc9c89f695C7fa9D9AbA3B297C9b0d86C5A74f534"
      "0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB",
      "0xB8De8f37B263324C44FD4874a7FB7A0C59D8C58E",
      "0xc26c4Ea50fd3b63B6564A5963fdE4a3A474d4024",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0xF8707b53a2bEc818E96471DDdb34a09F28E0dE6D",
      "0x8D1306b3970278b3AB64D1CE75377BDdf00f61da",
      "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5"
    ],
    factories: {
      droplist: "0xF8707b53a2bEc818E96471DDdb34a09F28E0dE6D",
      dropcode: "0x8D1306b3970278b3AB64D1CE75377BDdf00f61da",
      custom: "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5"
    },
    tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    nativeCurrency: {
      name: "Celo",
      symbol: "CELO",
      decimals: 18,
    },
    isTestnet: false,
  },
  {
    name: "Lisk",
    symbol: "LSK",
    chainId: 1135,
    rpcUrl: "https://rpc.api.lisk.com",
    blockExplorerUrls: "https://blockscout.lisk.com",
    explorerUrl: "https://blockscout.lisk.com",
    color: "#0D4477",
    logoUrl: "/lsk.png",
    iconUrl: "/lsk.png",
    factoryAddresses: [
      "0x96E9911df17e94F7048cCbF7eccc8D9b5eDeCb5C",
      "0x4F5Cf906b9b2Bf4245dba9F7d2d7F086a2a441C2",
      "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7",
      "0xd6Cb67dF496fF739c4eBA2448C1B0B44F4Cf0a7C",
      "0x0837EACf85472891F350cba74937cB02D90E60A4"
    ],
    factories: {
      droplist: "0x0837EACf85472891F350cba74937cB02D90E60A4",
      dropcode: "0xd6Cb67dF496fF739c4eBA2448C1B0B44F4Cf0a7C",
      custom: "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7"
    },
    tokenAddress: ZeroAddress,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
  {
    name: "Arbitrum",
    symbol: "ARB",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorerUrls: "https://arbiscan.io",
    explorerUrl: "https://arbiscan.io",
    color: "#28A0F0",
    logoUrl: "/arb.jpeg",
    iconUrl: "/arb.jpeg",
    factoryAddresses: [
      "0x0a5C19B5c0f4B9260f0F8966d26bC05AAea2009C",
      "0x42355492298A89eb1EF7FB2fFE4555D979f1Eee9",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de"
    ],
    factories: {
      droplist: "0x0a5C19B5c0f4B9260f0F8966d26bC05AAea2009C",
      dropcode: "0x42355492298A89eb1EF7FB2fFE4555D979f1Eee9",
      custom: "0x9D6f441b31FBa22700bb3217229eb89b13FB49de"
    },
    tokenAddress: ZeroAddress,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
  {
    name: "Base",
    symbol: "BASE",
    chainId: 8453,
    rpcUrl: "https://base-mainnet.g.alchemy.com/v2/sXHCrL5-xwYkPtkRC_WTEZHvIkOVTbw-",
    blockExplorerUrls: "https://basescan.org",
    explorerUrl: "https://basescan.org",
    color: "#0052FF",
    logoUrl: "/base.png",
    iconUrl: "/base.png",
    factoryAddresses: [
      "0x945431302922b69D500671201CEE62900624C6d5",
      "0xda191fb5Ca50fC95226f7FC91C792927FC968CA9",
      "0x587b840140321DD8002111282748acAdaa8fA206"
    ],
    factories: {
      droplist: "0x945431302922b69D500671201CEE62900624C6d5",
      dropcode: "0xda191fb5Ca50fC95226f7FC91C792927FC968CA9",
      custom: "0x587b840140321DD8002111282748acAdaa8fA206"
    },
    tokenAddress: ZeroAddress,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  }
]

// Image component with fallback
interface NetworkImageProps {
  network: Network
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showFallback?: boolean
}

export function NetworkImage({ 
  network, 
  size = 'md', 
  className = '',
  showFallback = true 
}: NetworkImageProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const fallbackSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg', 
    xl: 'text-xl'
  }

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  // Use icon URL for smaller sizes, logo URL for larger
  const imageUrl = (size === 'xs' || size === 'sm') && network.iconUrl 
    ? network.iconUrl 
    : network.logoUrl

  if (imageError && showFallback) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ${className}`}
        style={{ backgroundColor: network.color }}
      >
        <span className={fallbackSizes[size]}>
          {network.symbol.slice(0, 2)}
        </span>
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      {imageLoading && showFallback && (
        <div 
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white absolute inset-0 animate-pulse`}
          style={{ backgroundColor: network.color }}
        >
          <span className={fallbackSizes[size]}>
            {network.symbol.slice(0, 2)}
          </span>
        </div>
      )}
      <img
        src={imageUrl}
        alt={`${network.name} logo`}
        className={`${sizeClasses[size]} rounded-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  )
}

interface NetworkContextType {
  network: Network | null
  networks: Network[]
  setNetwork: (network: Network) => void
  switchNetwork: (chainId: number) => Promise<void>
  getLatestFactoryAddress: (network?: Network) => string | null
  getFactoryAddress: (factoryType: 'dropcode' | 'droplist' | 'custom', network?: Network) => string | null
  isSwitchingNetwork: boolean
  currentChainId: number | null
  thirdwebChain: any | null
}

const NetworkContext = createContext<NetworkContextType>({
  network: null,
  networks: networks,
  setNetwork: () => {},
  switchNetwork: async () => {},
  getLatestFactoryAddress: () => null,
  getFactoryAddress: () => null,
  isSwitchingNetwork: false,
  currentChainId: null,
  thirdwebChain: null,
})

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [network, setNetwork] = useState<Network | null>(null)
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)
  const [thirdwebChain, setThirdwebChain] = useState<any | null>(null)

  // Use Thirdweb hooks for chain management
  const activeChain = useActiveWalletChain()
  const switchChain = useSwitchActiveWalletChain()
  const activeWallet = useActiveWallet()

  const currentChainId = activeChain?.id || null

  const getLatestFactoryAddress = (targetNetwork?: Network) => {
    const selectedNetwork = targetNetwork || network
    return selectedNetwork?.factoryAddresses[selectedNetwork.factoryAddresses.length - 1] || null
  }

  const getFactoryAddress = (factoryType: 'dropcode' | 'droplist' | 'custom', targetNetwork?: Network) => {
    const selectedNetwork = targetNetwork || network
    if (!selectedNetwork) return null
    
    return selectedNetwork.factories[factoryType] || null
  }

  const createThirdwebChain = (network: Network) => {
    return defineChain({
      id: network.chainId,
      name: network.name,
      nativeCurrency: network.nativeCurrency,
      rpc: network.rpcUrl,
      blockExplorers: [
        {
          name: network.name + " Explorer",
          url: network.blockExplorerUrls,
        },
      ],
    })
  }

  // Update network when active chain changes
  useEffect(() => {
    if (activeChain) {
      const currentNetwork = networks.find((n) => n.chainId === activeChain.id)
      if (currentNetwork) {
        setNetwork(currentNetwork)
        setThirdwebChain(createThirdwebChain(currentNetwork))
        console.log(`Active network: ${currentNetwork.name} (${currentNetwork.chainId})`)
      } else {
        // Chain is connected but not in our supported networks
        setNetwork(null)
        setThirdwebChain(null)
        toast({
          title: "Unsupported Network",
          description: `Chain ID ${activeChain.id} is not supported. Please switch to a supported network.`,
          variant: "destructive",
        })
      }
    } else {
      // No active chain
      setNetwork(null)
      setThirdwebChain(null)
    }
  }, [activeChain, toast])

  const switchNetwork = async (chainId: number) => {
    if (!activeWallet) {
      toast({
        title: "No Wallet Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    if (isSwitchingNetwork) {
      console.log("Network switch already in progress, skipping")
      return
    }

    const targetNetwork = networks.find((n) => n.chainId === chainId)
    if (!targetNetwork) {
      toast({
        title: "Network Not Supported",
        description: `Chain ID ${chainId} is not supported`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsSwitchingNetwork(true)
      console.log(`Attempting to switch to network ${targetNetwork.name} (${chainId})`)

      const thirdwebChain = createThirdwebChain(targetNetwork)
      await switchChain(thirdwebChain)

      console.log(`Successfully switched to ${targetNetwork.name}`)
      toast({
        title: "Network Switched",
        description: `Successfully switched to ${targetNetwork.name}`,
        variant: "default",
      })
    } catch (error: any) {
      console.error(`Error switching to ${targetNetwork.name}:`, error)
      toast({
        title: "Network Switch Failed",
        description: error?.message || `Could not switch to ${targetNetwork.name}`,
        variant: "destructive",
      })
    } finally {
      setIsSwitchingNetwork(false)
    }
  }

  const handleSetNetwork = (newNetwork: Network) => {
    switchNetwork(newNetwork.chainId)
  }

  return (
    <NetworkContext.Provider
      value={{
        network,
        networks,
        setNetwork: handleSetNetwork,
        switchNetwork,
        getLatestFactoryAddress,
        getFactoryAddress,
        isSwitchingNetwork,
        currentChainId,
        thirdwebChain,
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  return useContext(NetworkContext)
}

// Utility functions
export function getMainnetNetworks() {
  return networks.filter(network => !network.isTestnet)
}

export function getTestnetNetworks() {
  return networks.filter(network => network.isTestnet)
}

export function getNetworkByChainId(chainId: number) {
  return networks.find(network => network.chainId === chainId)
}

export function isFactoryTypeAvailable(chainId: number, factoryType: 'dropcode' | 'droplist' | 'custom'): boolean {
  const network = getNetworkByChainId(chainId)
  if (!network) return false
  
  return !!network.factories[factoryType]
}

export function getAvailableFactoryTypes(chainId: number): ('dropcode' | 'droplist' | 'custom')[] {
  const network = getNetworkByChainId(chainId)
  if (!network) return []
  
  const availableTypes: ('dropcode' | 'droplist' | 'custom')[] = []
  
  if (network.factories.dropcode) availableTypes.push('dropcode')
  if (network.factories.droplist) availableTypes.push('droplist')
  if (network.factories.custom) availableTypes.push('custom')
  
  return availableTypes
}
