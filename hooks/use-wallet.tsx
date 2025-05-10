"use client"

import { useWeb3 } from "@/lib/web3-provider"
import { SUPPORTED_NETWORKS } from "@/lib/constants"

export function useWallet() {
  const { address, isConnected, isConnecting, connect, disconnect, chainId, switchNetwork } = useWeb3()

  // Check if current network is supported
  const isNetworkSupported = SUPPORTED_NETWORKS.some((network) => network.id === chainId)

  // Get current network name
  const networkName = SUPPORTED_NETWORKS.find((network) => network.id === chainId)?.name || "Unknown Network"

  // Switch to a supported network if current network is not supported
  const ensureSupportedNetwork = async () => {
    if (!isNetworkSupported && SUPPORTED_NETWORKS.length > 0) {
      await switchNetwork(SUPPORTED_NETWORKS[0].id)
      return false
    }
    return true
  }

  return {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    chainId,
    networkName,
    isNetworkSupported,
    ensureSupportedNetwork,
    switchNetwork,
  }
}
