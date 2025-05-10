"use client"

import { useWallet } from "@/hooks/use-wallet"
import { SUPPORTED_NETWORKS } from "@/lib/constants"

export function useNetwork() {
  const { chainId, networkName, isNetworkSupported, switchNetwork } = useWallet()

  return {
    network: networkName,
    chainId,
    isSupported: isNetworkSupported,
    supportedNetworks: SUPPORTED_NETWORKS,
    switchNetwork,
  }
}
