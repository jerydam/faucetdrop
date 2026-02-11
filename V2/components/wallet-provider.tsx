"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useDisconnect, useSwitchChain, useChainId } from 'wagmi'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { toast } from "sonner"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  walletType: 'embedded' | 'external' | null
  connect: () => Promise<void>
  disconnect: () => void
  disconnectExternalWallet: () => Promise<void> // NEW
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
  walletType: null,
  connect: async () => {},
  disconnect: () => {},
  disconnectExternalWallet: async () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [walletType, setWalletType] = useState<'embedded' | 'external' | null>(null)
  
  // Privy hooks
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  
  // Wagmi hooks
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  const chainId = useChainId()

  // Get active wallet (prefer embedded over external)
  const getActiveWallet = () => {
    if (!authenticated || wallets.length === 0) return null
    
    // CRITICAL: Prioritize embedded wallet
    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
    const externalWallet = wallets.find(w => w.walletClientType !== 'privy')
    
    // If user logged in with email/google/passkey (has user.email or user.google)
    // AND has embedded wallet, ALWAYS use embedded wallet
    const hasAuthMethod = user?.email || user?.google || user?.twitter
    
    if (hasAuthMethod && embeddedWallet) {
      console.log('[WalletProvider] User has auth method + embedded wallet, using embedded')
      return embeddedWallet
    }
    
    // Otherwise prefer embedded, fallback to external
    return embeddedWallet || externalWallet || wallets[0]
  }

  const activeWallet = getActiveWallet()
  const address = activeWallet?.address || null
  const isConnected = ready && authenticated && !!address
  const isConnecting = !ready || (authenticated && !address)

  // Auto-disconnect external wallet if embedded wallet exists + user has auth method
  useEffect(() => {
    const autoDisconnectExternal = async () => {
      if (!authenticated || wallets.length <= 1) return
      
      const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
      const externalWallet = wallets.find(w => w.walletClientType !== 'privy')
      const hasAuthMethod = user?.email || user?.google || user?.twitter
      
      // If user has both wallets + auth method, disconnect external
      if (hasAuthMethod && embeddedWallet && externalWallet) {
        console.log('[WalletProvider] Auto-disconnecting external wallet...')
        try {
          // Unlink external wallet from Privy account
          await externalWallet.disconnect()
          wagmiDisconnect()
          toast.info("Switched to embedded wallet")
        } catch (error) {
          console.error('[WalletProvider] Failed to disconnect external wallet:', error)
        }
      }
    }

    autoDisconnectExternal()
  }, [authenticated, wallets, user, wagmiDisconnect])

  // Setup provider from the active wallet
  useEffect(() => {
    const setupProvider = async () => {
      if (!activeWallet) {
        console.log('[WalletProvider] No wallet connected, clearing state')
        setProvider(null)
        setSigner(null)
        setWalletType(null)
        return
      }

      try {
        const isEmbedded = activeWallet.walletClientType === 'privy'
        
        console.log('[WalletProvider] Setting up wallet:', {
          totalWallets: wallets.length,
          walletTypes: wallets.map(w => w.walletClientType),
          selectedType: activeWallet.walletClientType,
          isEmbedded,
          address: activeWallet.address?.slice(0, 8)
        })
        
        const ethereumProvider = await activeWallet.getEthereumProvider()
        const ethersProvider = new BrowserProvider(ethereumProvider)
        const ethersSigner = await ethersProvider.getSigner()
        
        setProvider(ethersProvider)
        setSigner(ethersSigner)
        setWalletType(isEmbedded ? 'embedded' : 'external')
        
        console.log('✅ [WalletProvider] Wallet ready:', {
          address: activeWallet.address?.slice(0, 8),
          type: isEmbedded ? 'embedded' : 'external'
        })
      } catch (error) {
        console.error('❌ [WalletProvider] Error setting up wallet:', error)
        setProvider(null)
        setSigner(null)
        setWalletType(null)
      }
    }

    setupProvider()
  }, [authenticated, wallets, activeWallet])

  const connect = async () => {
    try {
      console.log('[WalletProvider] Opening Privy login modal...')
      await login()
    } catch (error: any) {
      console.error("[WalletProvider] Error connecting:", error)
      toast.error("Failed to connect wallet")
    }
  }

  const disconnect = async () => {
    try {
      console.log('[WalletProvider] Disconnecting all wallets...')
      
      // Disconnect all external wallets
      wagmiDisconnect()
      
      // Clear state
      setProvider(null)
      setSigner(null)
      setWalletType(null)
      
      // Logout from Privy (clears all wallets)
      await logout()
      
      toast.warning("Wallet disconnected")
    } catch (error) {
      console.error("[WalletProvider] Error disconnecting:", error)
    }
  }

  const disconnectExternalWallet = async () => {
    try {
      const externalWallet = wallets.find(w => w.walletClientType !== 'privy')
      if (externalWallet) {
        console.log('[WalletProvider] Disconnecting external wallet...')
        await externalWallet.disconnect()
        wagmiDisconnect()
        toast.success("External wallet disconnected")
      }
    } catch (error) {
      console.error("[WalletProvider] Error disconnecting external wallet:", error)
      toast.error("Failed to disconnect external wallet")
    }
  }

  const switchChain = async (newChainId: number) => {
    try {
      console.log('[WalletProvider] Switching to chain:', newChainId)
      
      if (!activeWallet) {
        throw new Error("No wallet connected")
      }
      
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
        address,
        chainId: chainId || null,
        isConnected,
        isConnecting,
        walletType,
        connect,
        disconnect,
        disconnectExternalWallet,
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