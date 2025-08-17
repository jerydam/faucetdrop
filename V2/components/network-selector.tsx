"use client"

import { useNetwork, type Network, NetworkImage } from "@/hooks/use-network"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Network as NetworkIcon, Wifi, WifiOff, AlertTriangle } from "lucide-react"

interface NetworkSelectorProps {
  showSymbol?: boolean // Option to show/hide network symbols
  displayMode?: 'name' | 'symbol' | 'both' // Different display modes
  compact?: boolean // Compact mode for smaller spaces
  showStatus?: boolean // Show connection status
  showLogos?: boolean // Show network logos
  className?: string // Additional CSS classes
}

export function NetworkSelector({ 
  showSymbol = true, 
  displayMode = 'both',
  compact = false,
  showStatus = true,
  showLogos = true,
  className = ""
}: NetworkSelectorProps) {
  const { network, networks, setNetwork, isSwitchingNetwork, currentChainId } = useNetwork()
  const isWalletAvailable = typeof window !== "undefined" && window.ethereum

  // Find the network name for the current chain ID, if available
  const currentNetwork = networks.find((net) => net.chainId === currentChainId)
  
  // Function to format network display text
  const formatNetworkDisplay = (net: Network | null, mode: 'name' | 'symbol' | 'both' = displayMode): string => {
    if (!net) return "Select Network"
    
    switch (mode) {
      case 'symbol':
        return net.symbol
      case 'name':
        return net.name
      case 'both':
      default:
        return compact ? `${net.symbol}` : `${net.name} (${net.symbol})`
    }
  }

  // Determine connection status
  const getConnectionStatus = () => {
    if (!isWalletAvailable) return 'no-wallet'
    if (isSwitchingNetwork) return 'switching'
    if (!currentChainId) return 'disconnected'
    if (network && currentChainId === network.chainId) return 'connected'
    if (currentNetwork) return 'wrong-network'
    return 'unknown-network'
  }

  const connectionStatus = getConnectionStatus()

  const displayText = () => {
    switch (connectionStatus) {
      case 'no-wallet':
        return "No Wallet Detected"
      case 'switching':
        return "Switching..."
      case 'disconnected':
        return "Connect Wallet"
      case 'connected':
        return formatNetworkDisplay(network)
      case 'wrong-network':
        return `Wrong Network (${currentNetwork?.symbol || currentChainId})`
      case 'unknown-network':
        return `Unknown Chain (ID: ${currentChainId})`
      default:
        return "Select Network"
    }
  }

  // Get status icon and color
  const getStatusIndicator = () => {
    switch (connectionStatus) {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`flex items-center gap-2 ${className}`}
          disabled={!isWalletAvailable || isSwitchingNetwork}
        >
          {/* Show network logo if available and connected */}
          {showLogos && network && connectionStatus === 'connected' ? (
            <NetworkImage network={network} size={compact ? "xs" : "sm"} />
          ) : showStatus ? (
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          ) : (
            <NetworkIcon className="h-4 w-4" />
          )}
          
          <span className={compact ? "text-sm" : ""}>{displayText()}</span>
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
              onClick={() => setNetwork(net)}
              className="flex items-center gap-3 cursor-pointer py-3"
              disabled={!isWalletAvailable || isSwitchingNetwork}
            >
              {/* Network Logo */}
              {showLogos ? (
                <NetworkImage network={net} size={compact ? "xs" : "sm"} />
              ) : (
                <span 
                  className="h-2 w-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: net.color }} 
                />
              )}
              
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                    {compact ? net.symbol : net.name}
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
                {!compact && showSymbol && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500 truncate">
                      {net.symbol} • Chain ID: {net.chainId}
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
            {networks.length} networks available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Alternative compact version for tight spaces
export function CompactNetworkSelector({ className }: { className?: string }) {
  return (
    <NetworkSelector 
      displayMode="symbol" 
      compact={true} 
      showSymbol={false}
      showStatus={false}
      showLogos={true}
      className={className}
    />
  )
}

// Symbol-only version
export function SymbolOnlyNetworkSelector({ className }: { className?: string }) {
  return (
    <NetworkSelector 
      displayMode="symbol" 
      showSymbol={false}
      showStatus={true}
      showLogos={true}
      className={className}
    />
  )
}

// Status-focused version
export function NetworkStatusSelector({ className }: { className?: string }) {
  return (
    <NetworkSelector 
      displayMode="both" 
      showSymbol={true}
      showStatus={true}
      showLogos={true}
      compact={false}
      className={className}
    />
  )
}

// Mobile-optimized version with logos
export function MobileNetworkSelector({ className }: { className?: string }) {
  const { networks, network, setNetwork, isSwitchingNetwork } = useNetwork()
  
  return (
    <div className={`grid grid-cols-2 gap-3 p-4 ${className}`}>
      {networks.map((net) => (
        <button
          key={net.chainId}
          onClick={() => setNetwork(net)}
          disabled={isSwitchingNetwork}
          className={`p-3 rounded-lg border-2 transition-all ${
            network?.chainId === net.chainId
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
          } ${isSwitchingNetwork ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center space-x-3">
            <NetworkImage network={net} size="sm" />
            <div className="text-left min-w-0">
              <div className="font-medium text-sm truncate">{net.symbol}</div>
              <div className="text-xs text-gray-500 truncate">{net.name}</div>
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

// Network breadcrumb component with logo
export function NetworkBreadcrumb({ className }: { className?: string }) {
  const { network } = useNetwork()
  
  if (!network) return null
  
  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
      <NetworkImage network={network} size="xs" />
      <span className="font-medium">{network.symbol}</span>
      <span className="text-xs text-gray-400">({network.name})</span>
      {network.isTestnet && (
        <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">
          Testnet
        </span>
      )}
    </div>
  )
}

// Network status indicator component with logo
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
          ? `Connected to ${network.symbol}` 
          : `Wrong network (expected ${network.symbol})`
        }
      </span>
    </div>
  )
}

// Large network display card
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
            <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {net.symbol}
            </span>
            {net.isTestnet && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                Testnet
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">Chain ID: {net.chainId}</p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-xs text-gray-500">
              {Object.keys(net.factories).length} factory types
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

// Grid layout for network selection
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

