"use client"
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
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
  disconnect: () => Promise<void>
  disconnectExternalWallet: () => Promise<void>
  ensureCorrectNetwork: (requiredChainId: number) => Promise<boolean>
  switchChain: (newChainId: number) => Promise<void>
  refreshProvider: () => Promise<void>
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
  disconnect: async () => {},
  disconnectExternalWallet: async () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {},
  refreshProvider: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [walletType, setWalletType] = useState<'embedded' | 'external' | null>(null)
  // ✅ Track chainId from the LIVE provider, not wagmi
  const [liveChainId, setLiveChainId] = useState<number | null>(null)

  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  const wagmiChainId = useChainId() // only used as fallback

  const getActiveWallet = useCallback(() => {
    if (!authenticated || wallets.length === 0) return null
    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
    const externalWallet = wallets.find(w => w.walletClientType !== 'privy')
    const hasAuthMethod = user?.email || user?.google || user?.twitter || user?.discord || user?.telegram
    if (hasAuthMethod && embeddedWallet) return embeddedWallet
    return embeddedWallet || externalWallet || wallets[0]
  }, [authenticated, wallets, user])

  const activeWallet = getActiveWallet()
  const address = activeWallet?.address || null
  const isConnected = ready && authenticated && !!address && !!signer
  const isConnecting = !ready || (authenticated && wallets.length > 0 && !address)

  // ✅ Core fix: always build a fresh provider and read chainId directly from RPC
  const setupProvider = useCallback(async (wallet = activeWallet) => {
    if (!wallet) {
      setProvider(null)
      setSigner(null)
      setWalletType(null)
      setLiveChainId(null)
      return
    }
    try {
      const isEmbedded = wallet.walletClientType === 'privy'
      const ethereumProvider = await wallet.getEthereumProvider()
      const ethersProvider = new BrowserProvider(ethereumProvider)

      // ✅ Read chainId directly from RPC — never trust cached values on mobile
      const network = await ethersProvider.getNetwork()
      const detectedChainId = Number(network.chainId)

      const ethersSigner = await ethersProvider.getSigner()

      setProvider(ethersProvider)
      setSigner(ethersSigner)
      setWalletType(isEmbedded ? 'embedded' : 'external')
      setLiveChainId(detectedChainId)
    } catch (error) {
      console.error('❌ [WalletProvider] Error setting up wallet:', error)
      if (activeWallet?.walletClientType !== 'privy') {
        toast.error("Could not connect to your wallet app. Please ensure it is unlocked.", { duration: 5000 })
        logout()
      }
      setProvider(null)
      setSigner(null)
      setWalletType(null)
      setLiveChainId(null)
    }
  }, [activeWallet, logout])

  const refreshProvider = useCallback(async () => {
    await setupProvider()
  }, [setupProvider])

  // Re-setup whenever wallet list or auth changes
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!cancelled) await setupProvider()
    }
    run()
    return () => { cancelled = true }
  }, [authenticated, wallets.length, activeWallet?.address])

  // ✅ Listen for chainChanged on the raw provider and refresh
  useEffect(() => {
    if (!activeWallet) return
    let rawProvider: any = null

    const handleChainChange = async (chainHex: string) => {
      const newChainId = parseInt(chainHex, 16)
      console.log('[WalletProvider] chainChanged ->', newChainId)
      // Rebuild provider with new chain context
      await setupProvider()
    }

    const attach = async () => {
      try {
        rawProvider = await activeWallet.getEthereumProvider()
        rawProvider.on?.('chainChanged', handleChainChange)
        rawProvider.on?.('accountsChanged', refreshProvider)
      } catch (e) {
        console.error('[WalletProvider] Could not attach chain listener', e)
      }
    }

    attach()

    return () => {
      try {
        rawProvider?.removeListener?.('chainChanged', handleChainChange)
        rawProvider?.removeListener?.('accountsChanged', refreshProvider)
      } catch {}
    }
  }, [activeWallet?.address])

  // Missing wallet safety net
  useEffect(() => {
    if (ready && authenticated && wallets.length === 0) {
      const timer = setTimeout(() => {
        if (wallets.length === 0) {
          toast.error(
            "Account recognized, but your external wallet is missing on this device. Please log in using WalletConnect or your mobile wallet app browser.",
            { duration: 6000 }
          )
          logout()
        }
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [ready, authenticated, wallets.length, logout])

  // Auto-disconnect external when embedded exists
  useEffect(() => {
    const autoDisconnectExternal = async () => {
      if (!authenticated || wallets.length <= 1) return
      const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
      const externalWallet = wallets.find(w => w.walletClientType !== 'privy')
      const hasAuthMethod = user?.email || user?.google || user?.twitter || user?.discord || user?.telegram
      if (hasAuthMethod && embeddedWallet && externalWallet) {
        try {
          await externalWallet.disconnect()
          wagmiDisconnect()
          toast.info("Switched to embedded wallet")
        } catch (error) {
          console.error('[WalletProvider] Failed to disconnect external wallet:', error)
        }
      }
    }
    autoDisconnectExternal()
  }, [authenticated, wallets.length, user])

  const connect = async () => {
    try {
      await login()
    } catch {
      toast.error("Failed to connect wallet")
    }
  }

  const disconnect = async () => {
    try {
      wagmiDisconnect()
      setProvider(null)
      setSigner(null)
      setWalletType(null)
      setLiveChainId(null)
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
        await externalWallet.disconnect()
        wagmiDisconnect()
        toast.success("External wallet disconnected")
      }
    } catch {
      toast.error("Failed to disconnect external wallet")
    }
  }

  // ✅ Fixed switchChain: uses raw provider request, works for ALL wallet types on mobile
  const switchChain = async (newChainId: number) => {
    if (!activeWallet) throw new Error("No wallet connected")

    const hexChainId = `0x${newChainId.toString(16)}`

    try {
      const rawProvider = await activeWallet.getEthereumProvider()

      try {
        await rawProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }],
        })
      } catch (switchErr: any) {
        // Chain not added to wallet yet — add it
        if (switchErr.code === 4902 || switchErr.message?.includes("Unrecognized chain ID")) {
          // Try wagmi as fallback for adding the chain
          await wagmiSwitchChain({ chainId: newChainId })
        } else {
          throw switchErr
        }
      }

      // ✅ Poll until the provider confirms the new chain (mobile doesn't fire chainChanged reliably)
      let confirmed = false
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 500))
        try {
          const ethProvider = new BrowserProvider(rawProvider)
          const network = await ethProvider.getNetwork()
          if (Number(network.chainId) === newChainId) {
            confirmed = true
            break
          }
        } catch {}
      }

      if (!confirmed) {
        toast.warning("Network may not have switched — please verify in your wallet")
      }

      // Rebuild provider with confirmed new chain
      await setupProvider()
      toast.success("Network switched")

    } catch (error: any) {
      if (error?.code === 4001 || error?.message?.includes("rejected")) {
        toast.error("Network switch cancelled")
      } else {
        toast.error("Failed to switch network — try switching manually in your wallet")
      }
      throw error
    }
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    if (!isConnected) {
      try {
        await connect()
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch {
        return false
      }
    }

    // ✅ Use liveChainId (from actual RPC) not wagmi's cached chainId
    const currentChain = liveChainId ?? wagmiChainId
    if (currentChain !== requiredChainId) {
      try {
        await switchChain(requiredChainId)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return true
      } catch {
        return false
      }
    }
    return true
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        chainId: liveChainId ?? wagmiChainId ?? null, // ✅ live RPC chain wins
        isConnected,
        isConnecting,
        walletType,
        connect,
        disconnect,
        disconnectExternalWallet,
        ensureCorrectNetwork,
        switchChain,
        refreshProvider,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}