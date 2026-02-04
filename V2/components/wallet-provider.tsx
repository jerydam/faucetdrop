"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useDisconnect, useSwitchChain, useAccount, useChainId, useConnect } from 'wagmi'
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
  const [isReady, setIsReady] = useState(false)
  
  
  const { connectAsync } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  
  const { address, isConnected: wagmiConnected, isConnecting } = useAccount()
  const chainId = useChainId()

  // Stable connection state: only true when we have address AND provider/signer ready
  const isConnected = wagmiConnected && !!address && !!provider && !!signer

  useEffect(() => {
    const updateProviderAndSigner = async () => {
      if (wagmiConnected && address && typeof window !== 'undefined' && window.ethereum) {
        try {
          console.log('[WalletProvider: Update] Setting up provider for address:', address, 'chainId:', chainId)
          const ethersProvider = new BrowserProvider(window.ethereum)
          const ethersSigner = await ethersProvider.getSigner()
          
          setProvider(ethersProvider)
          setSigner(ethersSigner)
          setIsReady(true)
          
          console.log('✅ [WalletProvider: Update] Wallet connected successfully:', { 
            address, 
            chainId,
            hasProvider: !!ethersProvider,
            hasSigner: !!ethersSigner
          })
        } catch (error) {
          console.error('❌ [WalletProvider: Update] Error setting up provider/signer:', error)
          setProvider(null)
          setSigner(null)
          setIsReady(false)
        }
      } else {
        console.log('[WalletProvider: Update] Wallet disconnected or missing dependencies. Clearing state.')
        setProvider(null)
        setSigner(null)
        setIsReady(false)
      }
    }

    updateProviderAndSigner()
  }, [wagmiConnected, address, chainId])

  useEffect(() => {
    console.log('🔄 [WalletProvider: State] Connection update:', {
      isConnected, // <-- This is the key flag for QuestCreator
      isConnecting,
      wagmiConnected,
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
      chainId,
      hasProvider: !!provider,
      hasSigner: !!signer,
      isReady,
      fullAddress: address
    })
  }, [isConnected, isConnecting, wagmiConnected, address, chainId, provider, signer, isReady])

  const connect = async () => {
    try {
      console.log('Opening wallet connection modal...')
      await connectAsync()
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      toast.error("Failed to connect wallet")
    }
  }

  const disconnect = () => {
    try {
      console.log('Disconnecting wallet...')
      wagmiDisconnect()
      setProvider(null)
      setSigner(null)
      setIsReady(false)
      
      toast.warning("Wallet disconnected")
    } catch (error) {
      console.error("Error disconnecting:", error)
    }
  }

  const switchChain = async (newChainId: number) => {
    try {
      console.log('Switching to chain:', newChainId)
      await wagmiSwitchChain({ chainId: newChainId })
      
      toast.warning("Network switched")
    } catch (error: any) {
      console.error("Failed to switch network:", error)
      toast.error("Failed to switch network")
      throw error
    }
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    console.log('Ensuring correct network:', { 
      current: chainId, 
      required: requiredChainId,
      isConnected 
    })
    
    if (!isConnected) {
      console.log('Wallet not connected, opening connection modal...')
      try {
        await connect()
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error('Failed to connect wallet:', error)
        return false
      }
    }

    if (chainId !== requiredChainId) {
      console.log(`Network mismatch: current=${chainId}, required=${requiredChainId}`)
      try {
        await switchChain(requiredChainId)
        await new Promise(resolve => setTimeout(resolve, 1500))
        return true
      } catch (error) {
        console.error('Failed to switch network:', error)
        return false
      }
    }

    console.log('✅ On correct network')
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
  const context = useContext(WalletContext)
  
  useEffect(() => {
    console.log('useWallet hook state:', {
      address: context.address,
      isConnected: context.isConnected,
      chainId: context.chainId,
      hasProvider: !!context.provider,
      hasSigner: !!context.signer
    })
  }, [context])
  
  return context
}