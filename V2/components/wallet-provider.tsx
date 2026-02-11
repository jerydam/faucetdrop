"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useDisconnect, useSwitchChain, useAccount, useChainId } from 'wagmi'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { toast } from "sonner"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  ensureCorrectNetwork: (requiredChainId: number) => Promise<boolean>
  switchChain: (newChainId: number) => Promise<void>
}

export const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [isProviderReady, setIsProviderReady] = useState(false)
  
  // Privy hooks
  const { ready, authenticated, login } = usePrivy()
  const { wallets } = useWallets()
  
  // Wagmi hooks
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  const { address, isConnected: wagmiConnected } = useAccount()
  const chainId = useChainId()

  // FIXED: Simplified connection state - if we have address from wagmi and authenticated, we're connected
  // Don't wait for provider/signer to consider connected (they can be set up async)
  const isConnected = ready && authenticated && wagmiConnected && !!address
  const isConnecting = !ready || (authenticated && !wagmiConnected)

  // Setup provider and signer when wallet is available
  useEffect(() => {
    const setupProvider = async () => {
      if (!authenticated || !wagmiConnected || !address || wallets.length === 0) {
        setProvider(null)
        setSigner(null)
        setIsProviderReady(false)
        return
      }

      try {
        console.log('[WalletProvider] Setting up provider for:', address.slice(0, 6))
        
        // Get the embedded wallet provider from Privy
        const wallet = wallets[0]
        const ethereumProvider = await wallet.getEthereumProvider()
        
        const ethersProvider = new BrowserProvider(ethereumProvider)
        const ethersSigner = await ethersProvider.getSigner()
        
        setProvider(ethersProvider)
        setSigner(ethersSigner)
        setIsProviderReady(true)
        
        console.log('✅ [WalletProvider] Provider ready')
      } catch (error) {
        console.error('❌ [WalletProvider] Error setting up provider:', error)
        setProvider(null)
        setSigner(null)
        setIsProviderReady(false)
      }
    }

    setupProvider()
  }, [authenticated, wagmiConnected, address, wallets])

  const connect = async () => {
    try {
      console.log('[WalletProvider] Opening Privy login...')
      await login()
    } catch (error: any) {
      console.error("[WalletProvider] Error connecting:", error)
      toast.error("Failed to connect wallet")
    }
  }

  const disconnect = () => {
    try {
      console.log('[WalletProvider] Disconnecting...')
      wagmiDisconnect()
      setProvider(null)
      setSigner(null)
      setIsProviderReady(false)
      toast.warning("Wallet disconnected")
    } catch (error) {
      console.error("[WalletProvider] Error disconnecting:", error)
    }
  }

  const switchChain = async (newChainId: number) => {
    try {
      console.log('[WalletProvider] Switching to chain:', newChainId)
      await wagmiSwitchChain({ chainId: newChainId })
      toast.success("Network switched")
    } catch (error: any) {
      console.error("[WalletProvider] Failed to switch network:", error)
      toast.error("Failed to switch network")
      throw error
    }
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    console.log('[WalletProvider] Ensuring correct network:', { 
      current: chainId, 
      required: requiredChainId,
      isConnected 
    })
    
    if (!isConnected) {
      console.log('[WalletProvider] Wallet not connected, opening login...')
      try {
        await connect()
        // Wait for connection to establish
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error('[WalletProvider] Failed to connect:', error)
        return false
      }
    }

    if (chainId !== requiredChainId) {
      console.log(`[WalletProvider] Network mismatch: ${chainId} → ${requiredChainId}`)
      try {
        await switchChain(requiredChainId)
        await new Promise(resolve => setTimeout(resolve, 1500))
        return true
      } catch (error) {
        console.error('[WalletProvider] Failed to switch network:', error)
        return false
      }
    }

    console.log('✅ [WalletProvider] On correct network')
    return true
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address: address || null,
        chainId: chainId || null,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        ensureCorrectNetwork,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}