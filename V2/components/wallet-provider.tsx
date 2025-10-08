// File: hooks/use-wallet.tsx (WalletProvider)
"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { useDisconnect, useSwitchChain, useAccount, useChainId } from 'wagmi'
import { useToast } from "@/hooks/use-toast"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
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
  connect: async () => {},
  disconnect: () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const { toast } = useToast()
  
  // Use both AppKit and Wagmi hooks for better compatibility
  const { open } = useAppKit()
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  
  // Use Wagmi's native hooks for more reliable state
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const wagmiChainId = useChainId()
  
  // Prefer Wagmi state over AppKit state
  const address = wagmiAddress || appKitAddress
  const isConnected = wagmiConnected || appKitConnected
  const chainId = wagmiChainId || null

  // Update provider and signer when wallet connects
  useEffect(() => {
    const updateProviderAndSigner = async () => {
      if (isConnected && address) {
        try {
          console.log('Setting up provider for address:', address, 'chainId:', chainId)
          
          let ethersProvider: BrowserProvider | null = null
          
          // Try to get provider from walletProvider first
          if (walletProvider) {
            try {
              ethersProvider = new BrowserProvider(walletProvider)
              console.log('Created BrowserProvider from walletProvider')
            } catch (error) {
              console.warn('Failed to create provider from walletProvider:', error)
            }
          }
          
          // Fallback to window.ethereum if walletProvider fails
          if (!ethersProvider && typeof window !== 'undefined' && window.ethereum) {
            try {
              ethersProvider = new BrowserProvider(window.ethereum)
              console.log('Created BrowserProvider from window.ethereum')
            } catch (error) {
              console.warn('Failed to create provider from window.ethereum:', error)
            }
          }
          
          if (ethersProvider) {
            const ethersSigner = await ethersProvider.getSigner()
            
            setProvider(ethersProvider)
            setSigner(ethersSigner)
            
            console.log('✅ Wallet connected successfully:', { 
              address, 
              chainId,
              hasProvider: !!ethersProvider,
              hasSigner: !!ethersSigner
            })
          } else {
            console.error('❌ Failed to create ethers provider')
            setProvider(null)
            setSigner(null)
          }
        } catch (error) {
          console.error('❌ Error setting up provider/signer:', error)
          setProvider(null)
          setSigner(null)
        }
      } else {
        console.log('Wallet not connected, clearing provider and signer')
        setProvider(null)
        setSigner(null)
      }
    }

    updateProviderAndSigner()
  }, [isConnected, address, chainId, walletProvider])

  // Log connection state changes for debugging
  useEffect(() => {
    console.log('🔄 Connection state:', {
      isConnected,
      address,
      chainId,
      hasProvider: !!provider,
      hasSigner: !!signer,
      wagmiConnected,
      appKitConnected
    })
  }, [isConnected, address, chainId, provider, signer, wagmiConnected, appKitConnected])

  const connect = async () => {
    try {
      console.log('Opening wallet connection modal...')
      await open()
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  const disconnect = () => {
    try {
      console.log('Disconnecting wallet...')
      wagmiDisconnect()
      setProvider(null)
      setSigner(null)
      
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected",
      })
    } catch (error) {
      console.error("Error disconnecting:", error)
    }
  }

  const switchChain = async (newChainId: number) => {
    try {
      console.log('Switching to chain:', newChainId)
      await wagmiSwitchChain({ chainId: newChainId })
      
      toast({
        title: "Network switched",
        description: `Switched to chain ${newChainId}`,
      })
    } catch (error: any) {
      console.error("Failed to switch network:", error)
      toast({
        title: "Network switch failed",
        description: error.message || "Failed to switch network",
        variant: "destructive",
      })
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
        // Wait a bit for connection to establish
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
        // Wait a bit for network switch to complete
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
        chainId,
        isConnected,
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
  
  // Add debug logging
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