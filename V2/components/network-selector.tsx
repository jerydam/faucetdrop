// File: components/network-selector.tsx (NetworkSelector with optional debounce)
"use client"

import { useNetwork, type Network } from "@/hooks/use-network"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Network as NetworkIcon, Wifi, WifiOff, AlertTriangle, Loader2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

// Network image component with fallback
interface NetworkImageProps {
  network: Network
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

function NetworkImage({ network, size = 'md', className = '' }: NetworkImageProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const fallbackSizes = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  if (imageError || !network?.logoUrl) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ${className}`}
        style={{ backgroundColor: network?.color || '#6B7280' }}
      >
        <span className={fallbackSizes[size]}>
          {network?.symbol?.slice(0, 2) || 'N/A'}
        </span>
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      {imageLoading && (
        <div 
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white absolute inset-0 animate-pulse`}
          style={{ backgroundColor: network?.color || '#6B7280' }}
        >
          <span className={fallbackSizes[size]}>
            {network?.symbol?.slice(0, 2) || 'N/A'}
          </span>
        </div>
      )}
      <img
        src={network.logoUrl}
        alt={`${network.name} logo`}
        className={`${sizeClasses[size]} rounded-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  )
}

interface NetworkSelectorProps {
  showName?: boolean
  displayMode?: 'name' | 'logo' | 'both'
  compact?: boolean
  showStatus?: boolean
  showLogos?: boolean
  className?: string
}

export function NetworkSelector({ 
  showName = true, 
  displayMode = 'both',
  compact = false,
  showStatus = true,
  showLogos = true,
  className = ""
}: NetworkSelectorProps) {
  const { network, networks, setNetwork, isSwitchingNetwork, currentChainId, isConnecting } = useNetwork() // NEW: Destructure isConnecting
  const { address, connect } = useWallet()
  const { toast } = useToast()
  
  const isWalletAvailable = typeof window !== "undefined" && window.ethereum
  const hasWalletConnected = !!address

  // Add debounce state
  const [isSelecting, setIsSelecting] = useState(false)
  
  // Find the network name for the current chain ID, if available
  const currentNetwork = networks.find((net) => net.chainId === currentChainId)
  
  // Function to format network display text
  const formatNetworkDisplay = (net: Network | null, mode: 'name' | 'logo' | 'both' = displayMode): string => {
    if (!net) return "Select Network"
    
    switch (mode) {
      case 'logo':
        return ''
      case 'name':
        return net.name
      case 'both':
      default:
        return compact ? net.name : net.name
    }
  }

  // FIXED: Enhanced status with connecting state
  const getConnectionStatus = () => {
    if (isConnecting) return 'connecting' // NEW: Handle connecting
    if (!isWalletAvailable) return 'no-wallet'
    if (!hasWalletConnected) return 'disconnected'
    if (isSwitchingNetwork) return 'switching'
    if (!currentChainId) return 'disconnected'
    if (network && currentChainId === network.chainId) return 'connected'
    if (currentNetwork) return 'wrong-network'
    return 'unknown-network'
  }

  const connectionStatus = getConnectionStatus()

  const displayText = () => {
    switch (connectionStatus) {
      case 'connecting': // NEW
        return "Connecting..."
      case 'no-wallet':
        return "No Wallet Detected"
      case 'switching':
        return "Switching..."
      case 'disconnected':
        return "Connect Wallet"
      case 'connected':
        return formatNetworkDisplay(network)
      case 'wrong-network':
        return `Wrong Network`
      case 'unknown-network':
        return `Unknown Chain`
      default:
        return "Select Network"
    }
  }

  // Get status icon and color
  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connecting': // NEW
        return { icon: Loader2, color: 'text-blue-500 animate-spin' }
      case 'connected':
        return { icon: Wifi, color: 'text-green-500' }
      case 'wrong-network':
        return { icon: AlertTriangle, color: 'text-orange-500' }
      case 'switching':
        return { icon: NetworkIcon, color: 'text-blue-500 animate-pulse' }
      case 'no-wallet':
      case 'disconnected':
        return { icon: WifiOff, color: 'text-red-500' }
      case 'unknown-network':
        return { icon: AlertTriangle, color: 'text-yellow-500' }
      default:
        return { icon: NetworkIcon, color: 'text-gray-500' }
    }
  }

  const { icon: StatusIcon, color: statusColor } = getStatusIndicator()

  // IMPROVED: Handle network selection with better checks and debounce
  const handleNetworkSelect = async (net: Network) => {
    if (isSelecting || isSwitchingNetwork || isConnecting) return // NEW: Block during connect
    setIsSelecting(true)
    
    console.log('Network selection clicked:', { 
      network: net.name, 
      hasAddress: hasWalletConnected,
      isSwitchingNetwork,
      isConnecting, // NEW
      address 
    })

    // Don't interrupt if already switching
    if (isSwitchingNetwork || isConnecting) {
      console.log('Already switching/connecting, ignoring click')
      setIsSelecting(false)
      return
    }

    // Check if wallet is connected using address (more reliable than isConnected)
    if (!hasWalletConnected) {
      console.log('Wallet not connected, prompting connection...')
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first to switch networks",
        variant: "destructive",
      })
      
      // Trigger wallet connection
      try {
        await connect()
        // FIXED: Post-connect check (give 1s for state to propagate)
        setTimeout(() => {
          if (network && network.chainId === net.chainId) {
            toast({ title: "Ready", description: `Connected to ${network.name}` })
          } else {
            toast({ 
              title: "Connection Complete", 
              description: "Now switch to your desired network.", 
              action: { label: "Switch Now", onClick: () => setNetwork(net) }
            })
          }
          setIsSelecting(false)
        }, 1000)
      } catch (error) {
        console.error('Failed to connect wallet:', error)
        setIsSelecting(false)
      }
      return
    }

    // Proceed with network switch
    try {
      await setNetwork(net)
    } catch (error: any) {
      console.error('Failed to switch network:', error)
      // Error toast is already handled in use-network
    } finally {
      setIsSelecting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`flex items-center gap-2 ${className}`}
          disabled={!isWalletAvailable || isSwitchingNetwork || isSelecting || isConnecting} // NEW: Add isConnecting
        >
          {showLogos && network && connectionStatus === 'connected' ? (
            <NetworkImage network={network} size={compact ? "xs" : "sm"} />
          ) : showStatus ? (
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          ) : (
            <NetworkIcon className="h-4 w-4" />
          )}
          
          {displayMode !== 'logo' && (
            <span className={compact ? "text-sm" : ""}>{displayText()}</span>
          )}
          
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={compact ? "w-48" : "w-64"}>
        {/* Connection Status Header */}
        {!compact && (
          <>
            <div className="px-3 py-2 text-xs text-gray-500 border-b">
              <div className="flex items-center space-x-2">
                <StatusIcon className={`h-3 w-3 ${statusColor}`} />
                <span>
                  {connectionStatus === 'connected' && "Connected to"}
                  {connectionStatus === 'wrong-network' && "Wrong Network"}
                  {connectionStatus === 'switching' && "Switching Networks..."}
                  {connectionStatus === 'connecting' && "Connecting..."} {/* NEW */}
                  {connectionStatus === 'disconnected' && "Not Connected"}
                  {connectionStatus === 'no-wallet' && "No Wallet Found"}
                  {connectionStatus === 'unknown-network' && "Unsupported Chain"}
                </span>
              </div>
            </div>
          </>
        )}
        
        {/* Network List */}
        {networks.map((net: Network) => {
          const isActive = network?.chainId === net.chainId
          const isCurrent = currentChainId === net.chainId
          
          return (
            <DropdownMenuItem
              key={net.chainId}
              onClick={() => handleNetworkSelect(net)}
              className="flex items-center gap-3 cursor-pointer py-3"
              disabled={!isWalletAvailable || isSwitchingNetwork || isSelecting || isConnecting || !hasWalletConnected} // NEW: Add isConnecting
            >
              <NetworkImage network={net} size={compact ? "xs" : "sm"} />
              
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                    {net.name}
                  </span>
                  <div className="flex items-center space-x-1 ml-2">
                    {isActive && (
                      <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">
                        Active
                      </span>
                    )}
                    {!isActive && isCurrent && (
                      <span className="text-xs bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full flex-shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                </div>
                {!compact && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500 truncate">
                      Chain ID: {net.chainId}
                    </span>
                    {net.isTestnet && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">
                        Testnet
                      </span>
                    )}
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          )
        })}
        
        {/* Footer Information */}
        {!compact && (
          <div className="px-3 py-2 text-xs text-gray-500 border-t">
            {hasWalletConnected 
              ? `${networks.length} networks available`
              : "Connect wallet to switch networks"
            }
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CompactNetworkSelector({ className }: { className?: string }) {
  return (
    <NetworkSelector 
      displayMode="logo" 
      compact={true} 
      showName={false}
      showStatus={false}
      showLogos={true}
      className={className}
    />
  )
}

export function LogoOnlyNetworkSelector({ className }: { className?: string }) {
  return (
    <NetworkSelector 
      displayMode="logo" 
      showName={false}
      showStatus={true}
      showLogos={true}
      className={className}
    />
  )
}

export function NetworkStatusSelector({ className }: { className?: string }) {
  return (
    <NetworkSelector 
      displayMode="both" 
      showName={true}
      showStatus={true}
      showLogos={true}
      compact={false}
      className={className}
    />
  )
}

export function MobileNetworkSelector({ className }: { className?: string }) {
  const { networks, network, setNetwork, isSwitchingNetwork } = useNetwork()
  const { address, connect } = useWallet()
  const { toast } = useToast()
  
  const hasWalletConnected = !!address
  
  const handleNetworkSelect = async (net: Network) => {
    if (isSwitchingNetwork) return
    
    if (!hasWalletConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      try {
        await connect()
      } catch (error) {
        console.error('Failed to connect wallet:', error)
      }
      return
    }
    
    try {
      await setNetwork(net)
    } catch (error: any) {
      console.error('Failed to switch network:', error)
    }
  }
  
  return (
    <div className={`grid grid-cols-2 gap-3 p-4 ${className}`}>
      {networks.map((net) => (
        <button
          key={net.chainId}
          onClick={() => handleNetworkSelect(net)}
          disabled={isSwitchingNetwork || !hasWalletConnected}
          className={`p-3 rounded-lg border-2 transition-all ${
            network?.chainId === net.chainId
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
          } ${isSwitchingNetwork || !hasWalletConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center space-x-3">
            <NetworkImage network={net} size="sm" />
            <div className="text-left min-w-0">
              <div className="font-medium text-sm truncate">{net.name}</div>
              <div className="text-xs text-gray-500 truncate">Chain {net.chainId}</div>
              {net.isTestnet && (
                <div className="text-xs bg-orange-100 text-orange-600 px-1 rounded mt-1 inline-block">
                  Testnet
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

export function NetworkBreadcrumb({ className }: { className?: string }) {
  const { network } = useNetwork()
  
  if (!network) return null
  
  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
      <NetworkImage network={network} size="xs" />
      <span className="font-medium">{network.name}</span>
      {network.isTestnet && (
        <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">
          Testnet
        </span>
      )}
    </div>
  )
}

export function NetworkStatusIndicator({ className }: { className?: string }) {
  const { network, currentChainId, isSwitchingNetwork } = useNetwork()
  
  if (isSwitchingNetwork) {
    return (
      <div className={`flex items-center space-x-2 text-amber-600 ${className}`}>
        <div className="w-4 h-4 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-sm">Switching networks...</span>
      </div>
    )
  }
  
  if (!network || !currentChainId) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <div className="w-4 h-4 bg-red-400 rounded-full" />
        <span className="text-sm">No network connected</span>
      </div>
    )
  }
  
  const isCorrectNetwork = network.chainId === currentChainId
  
  return (
    <div className={`flex items-center space-x-2 ${isCorrectNetwork ? 'text-green-600' : 'text-amber-600'} ${className}`}>
      <NetworkImage network={network} size="xs" />
      <span className="text-sm">
        {isCorrectNetwork 
          ? `Connected to ${network.name}` 
          : `Wrong network (expected ${network.name})`
        }
      </span>
    </div>
  )
}

export function NetworkCard({ network: net, onClick, isActive }: { 
  network: Network; 
  onClick?: () => void; 
  isActive?: boolean 
}) {
  return (
    <div 
      className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
        isActive 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <NetworkImage network={net} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold">{net.name}</h3>
            {net.isTestnet && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                Testnet
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">Chain ID: {net.chainId}</p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-xs text-gray-500">
              {Object.keys(net.factories || {}).length} factory types
            </span>
            {isActive && (
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                Active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function NetworkGrid({ onNetworkSelect }: { onNetworkSelect?: (network: Network) => void }) {
  const { networks, network } = useNetwork()
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {networks.map((net) => (
        <NetworkCard
          key={net.chainId}
          network={net}
          isActive={network?.chainId === net.chainId}
          onClick={() => onNetworkSelect?.(net)}
        />
      ))}
    </div>
  )
}

export function HorizontalNetworkSelector({ className }: { className?: string }) {
  const { networks, network, setNetwork, isSwitchingNetwork } = useNetwork()
  const { address, connect } = useWallet()
  const { toast } = useToast()
  
  const hasWalletConnected = !!address
  
  const handleNetworkSelect = async (net: Network) => {
    if (isSwitchingNetwork) return
    
    if (!hasWalletConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      try {
        await connect()
      } catch (error) {
        console.error('Failed to connect wallet:', error)
      }
      return
    }
    
    try {
      await setNetwork(net)
    } catch (error: any) {
      console.error('Failed to switch network:', error)
    }
  }
  
  return (
    <div className={`flex items-center space-x-2 overflow-x-auto ${className}`}>
      {networks.map((net) => (
        <button
          key={net.chainId}
          onClick={() => handleNetworkSelect(net)}
          disabled={isSwitchingNetwork || !hasWalletConnected}
          className={`flex-shrink-0 p-2 rounded-lg border-2 transition-all ${
            network?.chainId === net.chainId
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
          } ${isSwitchingNetwork || !hasWalletConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={net.name}
        >
          <NetworkImage network={net} size="sm" />
        </button>
      ))}
    </div>
  )
}

export function MiniNetworkIndicator({ className }: { className?: string }) {
  const { network } = useNetwork()
  
  if (!network) return null
  
  return (
    <div className={`flex items-center ${className}`} title={network.name}>
      <NetworkImage network={network} size="xs" />
    </div>
  )
}