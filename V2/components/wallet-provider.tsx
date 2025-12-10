"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useDisconnect, useSwitchChain, useAccount, useChainId, useConnect } from 'wagmi'
import { useToast } from "@/hooks/use-toast"
import sdk from "@farcaster/miniapp-sdk"

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
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [farcasterChainId, setFarcasterChainId] = useState<number | null>(null)
  const { toast } = useToast()
  
  const { connectAsync } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  
  const { address, isConnected: wagmiConnected, isConnecting } = useAccount()
  const wagmiChainId = useChainId()
  
  // Effective chainId - prefer Farcaster's chain if available
  const chainId = isFarcaster && farcasterChainId ? farcasterChainId : wagmiChainId

  // Detect Farcaster environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sdk.actions.ready()
        if (sdk.wallet) {
          setIsFarcaster(true)
          console.log('[WalletProvider] Detected Farcaster Environment')
        }
      } catch (e) {
        console.log('[WalletProvider] Not in Farcaster environment')
      }
    }
  }, [])
  
  // Setup provider and signer
  useEffect(() => {
    const updateProviderAndSigner = async () => {
      // FARCASTER ENVIRONMENT
      if (isFarcaster) {
        try {
          console.log('[WalletProvider] Setting up Farcaster wallet')
          const farcasterProvider = sdk.wallet.getEthereumProvider()
          
          // Get chain ID from Farcaster provider
          const chainIdHex = await farcasterProvider.request({ 
            method: 'eth_chainId' 
          }) as string
          const detectedChainId = parseInt(chainIdHex, 16)
          setFarcasterChainId(detectedChainId)
          
          // Wrap with Ethers
          const ethersProvider = new BrowserProvider(farcasterProvider as any)
          const ethersSigner = await ethersProvider.getSigner()

          setProvider(ethersProvider)
          setSigner(ethersSigner)
          
          console.log('✅ [WalletProvider] Farcaster wallet connected:', {
            chainId: detectedChainId,
            address: await ethersSigner.getAddress()
          })
          
          return
        } catch (error) {
          console.error('[WalletProvider] Farcaster connection error', error)
        }
      }

      // STANDARD WEB ENVIRONMENT
      if (wagmiConnected && address && typeof window !== 'undefined' && window.ethereum) {
        try {
          console.log('[WalletProvider] Setting up standard wallet')
          const ethersProvider = new BrowserProvider(window.ethereum)
          const ethersSigner = await ethersProvider.getSigner()
          
          setProvider(ethersProvider)
          setSigner(ethersSigner)
          
          console.log('✅ [WalletProvider] Standard wallet connected:', {
            address,
            chainId: wagmiChainId
          })
        } catch (error) {
          console.error('[WalletProvider] Standard wallet error:', error)
          setProvider(null)
          setSigner(null)
        }
      } else {
        setProvider(null)
        setSigner(null)
      }
    }

    updateProviderAndSigner()
  }, [wagmiConnected, address, wagmiChainId, isFarcaster])

  // Connection state - true when we have address AND provider/signer ready
  const isConnected = (wagmiConnected || isFarcaster) && !!address && !!provider && !!signer

  // Connect function
  const connect = async () => {
    if (isFarcaster) {
      try {
        const farcasterProvider = sdk.wallet.getEthereumProvider()
        await farcasterProvider.request({ method: 'eth_requestAccounts' })
      } catch (error: any) {
        toast({ 
          title: "Connection failed", 
          description: error.message, 
          variant: "destructive" 
        })
      }
    } else {
      try {
        await connectAsync()
      } catch (error: any) {
        toast({ 
          title: "Connection failed", 
          description: error.message, 
          variant: "destructive" 
        })
      }
    }
  }

  const disconnect = () => {
    if (!isFarcaster) {
      wagmiDisconnect()
    }
    setProvider(null)
    setSigner(null)
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    })
  }

  const switchChain = async (newChainId: number) => {
    try {
      if (isFarcaster) {
        const farcasterProvider = sdk.wallet.getEthereumProvider()
        await farcasterProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${newChainId.toString(16)}` }]
        })
        setFarcasterChainId(newChainId)
      } else {
        await wagmiSwitchChain({ chainId: newChainId })
      }
      
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
// Add to your WalletProvider component
useEffect(() => {
  const autoConnect = async () => {
    if (isFarcaster && !isConnected) {
      console.log('[WalletProvider] Auto-connecting to Farcaster wallet...')
      try {
        await connect()
      } catch (error) {
        console.error('[WalletProvider] Auto-connect failed:', error)
      }
    }
  }
  
  // Add a small delay to ensure SDK is ready
  const timer = setTimeout(autoConnect, 500)
  return () => clearTimeout(timer)
}, [isFarcaster, isConnected])
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
        chainId,
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