"use client"
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useDisconnect, useSwitchChain, useChainId } from "wagmi"
import { usePrivy, useWallets, type ConnectedWallet } from "@privy-io/react-auth"
import { toast } from "sonner"
import { useSolanaWallet } from "@/hooks/use-solana"
import { SolanaConnectModal } from "@/components/solana-connect-modal"

interface WalletContextType {
  // EVM state
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  evmChainId: number | null          // ← pure EVM chain, never 102
  // Shared / active state
  address: string | null             // active address (EVM or Solana depending on mode)
  chainId: number | null             // evmChainId OR 102 when on Solana (for legacy compat)
  isOnSolana: boolean                // ← NEW: clean flag, no chainId=102 tricks
  isConnected: boolean
  isConnecting: boolean
  walletType: "embedded" | "external" | null
  // Actions
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  disconnectExternalWallet: () => Promise<void>
  ensureCorrectNetwork: (requiredChainId: number) => Promise<boolean>
  switchChain: (newChainId: number) => Promise<void>
  switchToSolana: () => Promise<void>
  switchToEvm: (chainId: number) => Promise<void>
  refreshProvider: () => Promise<void>
}

export const WalletContext = createContext<WalletContextType>({
  provider: null, signer: null, evmChainId: null,
  address: null, chainId: null, isOnSolana: false,
  isConnected: false, isConnecting: false, walletType: null,
  connect: async () => {}, disconnect: async () => {},
  disconnectExternalWallet: async () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {}, switchToSolana: async () => {},
  switchToEvm: async () => {}, refreshProvider: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  // ── EVM state ────────────────────────────────────────────────────────────
  const [provider,    setProvider]    = useState<BrowserProvider | null>(null)
  const [signer,      setSigner]      = useState<JsonRpcSigner | null>(null)
  const [walletType,  setWalletType]  = useState<"embedded" | "external" | null>(null)
  const [evmChainId,  setEvmChainId]  = useState<number | null>(null)

  // ── Solana mode — completely separate from EVM chain tracking ────────────
  const [isOnSolana,  setIsOnSolana]  = useState(false)
  const isOnSolanaRef = useRef(false)  // sync mirror, readable in effects immediately
  const setOnSolana = useCallback((val: boolean) => {
    isOnSolanaRef.current = val
    setIsOnSolana(val)
  }, [])

  const [solanaConnectOpen, setSolanaConnectOpen] = useState(false)

  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  const wagmiChainId = useChainId()

  const {
    connectOrSwitchSolana,
    activeSolanaAccount,
    solanaAddress,
  } = useSolanaWallet()

  // ── Solana address set (from linkedAccounts — reliable source) ────────────
  const solanaAddressSet = useMemo(() => new Set(
    (user?.linkedAccounts || [])
      .filter((a: any) => a.type === "wallet" && a.chainType === "solana")
      .map((a: any) => a.address as string)
  ), [user?.linkedAccounts])

  const isSolanaAddr = useCallback(
    (addr: string) => solanaAddressSet.has(addr),
    [solanaAddressSet]
  )

  // ── EVM wallet resolution (ignores Solana wallets entirely) ───────────────
  const activeEvmWallet = useMemo(() => {
    if (!authenticated) return null
    const evm = wallets.filter((w) => !isSolanaAddr(w.address))
    const ext  = evm.find((w) => w.walletClientType !== "privy")
    const emb  = evm.find((w) => w.walletClientType === "privy")
    return ext ?? emb ?? evm[0] ?? null
  }, [authenticated, wallets, isSolanaAddr])

  // ── Derived active address ─────────────────────────────────────────────
  // When on Solana, expose Solana address; otherwise EVM address
  const address = isOnSolana
    ? (solanaAddress ?? null)
    : (activeEvmWallet?.address ?? null)

  const isConnected  = ready && authenticated && !!address
  const isConnecting = !ready || (authenticated && wallets.length > 0 && !address)

  // ── setupEvmProvider — only ever called for EVM ─────────────────────────
  const setupEvmProvider = useCallback(async (wallet?: ConnectedWallet) => {
    const target = wallet ?? activeEvmWallet
    if (!target) {
      setProvider(null); setSigner(null); setWalletType(null); setEvmChainId(null)
      return
    }
    // Safety: never run EVM logic on a Solana wallet
    if (isSolanaAddr(target.address)) return

    try {
      const isEmbedded       = target.walletClientType === "privy"
      const ethereumProvider = await target.getEthereumProvider()
      const ethersProvider   = new BrowserProvider(ethereumProvider)
      const network          = await ethersProvider.getNetwork()
      const ethersSigner     = await ethersProvider.getSigner()

      setProvider(ethersProvider)
      setSigner(ethersSigner)
      setWalletType(isEmbedded ? "embedded" : "external")
      setEvmChainId(Number(network.chainId))
    } catch (err) {
      console.error("❌ [WalletProvider] setupEvmProvider error:", err)
      setProvider(null); setSigner(null); setWalletType(null); setEvmChainId(null)
    }
  }, [activeEvmWallet, isSolanaAddr])

  const refreshProvider = useCallback(async () => {
    // On Solana: nothing to refresh (no ethers provider needed)
    if (isOnSolanaRef.current) return
    await setupEvmProvider()
  }, [setupEvmProvider])

  // ── Auto-setup EVM provider on mount / wallet change ─────────────────────
  // CRITICAL: skip completely when on Solana — this was the main clobber path
  useEffect(() => {
    if (!authenticated || wallets.length === 0) return
    if (isOnSolanaRef.current) return   // ← never clobber Solana mode
    setupEvmProvider()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, wallets.length, activeEvmWallet?.address])

  // ── EVM chain-change listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!activeEvmWallet) return
    let raw: any = null
    const onChange = () => { if (!isOnSolanaRef.current) setupEvmProvider() }

    activeEvmWallet.getEthereumProvider()
      .then((p) => {
        raw = p
        raw.on?.("chainChanged",    onChange)
        raw.on?.("accountsChanged", onChange)
      })
      .catch(() => {})

    return () => {
      raw?.removeListener?.("chainChanged",    onChange)
      raw?.removeListener?.("accountsChanged", onChange)
    }
  }, [activeEvmWallet?.address, setupEvmProvider])

  // ── Logout guard: only when NOT on Solana ────────────────────────────────
  useEffect(() => {
    if (ready && authenticated && wallets.length === 0 && !isOnSolanaRef.current) {
      const t = setTimeout(() => {
        if (wallets.length === 0 && !isOnSolanaRef.current) {
          toast.error("Wallet missing. Please log in again.")
          logout()
        }
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [ready, authenticated, wallets.length, logout])

  // ── Auth ──────────────────────────────────────────────────────────────────
  const connect = async () => {
    try { await login() } catch { toast.error("Failed to connect wallet") }
  }

  const disconnect = async () => {
    wagmiDisconnect()
    setProvider(null); setSigner(null); setWalletType(null)
    setEvmChainId(null); setOnSolana(false)
    await logout()
  }

  const disconnectExternalWallet = async () => {
    const ext = wallets.find((w) => w.walletClientType !== "privy")
    if (ext) { await ext.disconnect(); wagmiDisconnect() }
  }

  // ── switchToSolana ────────────────────────────────────────────────────────
  const switchToSolana = useCallback(async () => {
    const result = await connectOrSwitchSolana()

    switch (result.status) {
      case "connected":
        // Just flip the flag — EVM provider stays intact for when we switch back
        setOnSolana(true)
        setWalletType(result.type)
        return

      case "linking":
        setSolanaConnectOpen(true)
        return

      case "cancelled":
      case "error":
        return
    }
  }, [connectOrSwitchSolana, setOnSolana])

  // ── switchToEvm ───────────────────────────────────────────────────────────
  const switchToEvm = useCallback(async (targetChainId: number) => {
    // If coming from Solana, flip back first
    if (isOnSolanaRef.current) {
      setOnSolana(false)
      // EVM provider may already be set up from before the Solana switch;
      // if not (first load was on Solana), set it up now
      if (!provider) await setupEvmProvider()
    }

    if (!activeEvmWallet) { toast.error("No EVM wallet connected."); return }

    const hexChainId = `0x${targetChainId.toString(16)}`
    try {
      const rawProvider = await activeEvmWallet.getEthereumProvider()
      try {
        await rawProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }],
        })
      } catch (err: any) {
        if (err.code === 4902 || err.message?.includes("Unrecognized chain ID")) {
          await wagmiSwitchChain({ chainId: targetChainId })
        } else throw err
      }

      // Poll until confirmed
      let confirmed = false
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 500))
        try {
          const net = await new BrowserProvider(rawProvider).getNetwork()
          if (Number(net.chainId) === targetChainId) { confirmed = true; break }
        } catch {}
      }
      if (!confirmed) toast.warning("Network may not have switched — verify in your wallet")

      await setupEvmProvider(activeEvmWallet)
      toast.success("Network switched")
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        toast.error("Network switch cancelled")
      } else {
        toast.error("Failed to switch network")
      }
      throw err
    }
  }, [activeEvmWallet, provider, setupEvmProvider, wagmiSwitchChain, setOnSolana])

  // ── switchChain: legacy unified entry-point (used by NetworkProvider) ─────
  const switchChain = useCallback(async (newChainId: number) => {
    if (newChainId === 102) {
      await switchToSolana()
    } else {
      await switchToEvm(newChainId)
    }
  }, [switchToSolana, switchToEvm])

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    if (!isConnected) { await connect(); return false }
    const current = isOnSolana ? 102 : (evmChainId ?? wagmiChainId)
    if (current !== requiredChainId) await switchChain(requiredChainId)
    return true
  }

  // chainId: expose 102 when on Solana, evmChainId otherwise (legacy compat)
  const chainId = isOnSolana ? 102 : (evmChainId ?? wagmiChainId ?? null)

  return (
    <WalletContext.Provider value={{
      provider, signer, evmChainId,
      address, chainId, isOnSolana,
      isConnected, isConnecting, walletType,
      connect, disconnect, disconnectExternalWallet,
      ensureCorrectNetwork, switchChain,
      switchToSolana, switchToEvm,
      refreshProvider,
    }}>
      <SolanaConnectModal
        open={solanaConnectOpen}
        onOpenChange={setSolanaConnectOpen}
        onConnected={() => {
          setOnSolana(true)
          setWalletType(activeSolanaAccount?.walletClientType === "privy" ? "embedded" : "external")
        }}
      />
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}