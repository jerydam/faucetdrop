"use client"

import {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, type ReactNode,
} from "react"
import { ConnectModal } from "@jerydam/lumina-sdk"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { toast } from "sonner"
import { useLumina, WalletLogin } from "@jerydam/lumina-sdk"
import { SOLANA_CHAIN_ID, supportedChains, DEFAULT_CHAIN_ID, CHAIN_RPC } from "@/config/lumina"
import { usePrivy } from '@privy-io/react-auth'


// ── Types ─────────────────────────────────────────────────────────────────────

interface WalletContextType {
  provider:             BrowserProvider | null
  signer:               JsonRpcSigner | null
  evmChainId:           number | null
  address:              string | null
  chainId:              number | null
  isOnSolana:           boolean
  isConnected:          boolean
  isConnecting:         boolean
  walletType:           "embedded" | "external" | null
  showLoginModal:       boolean
  setShowLoginModal:    (val: boolean) => void
  connect:                  () => Promise<void>
  disconnect:               () => Promise<void>
  disconnectExternalWallet: () => Promise<void>
  ensureCorrectNetwork:     (requiredChainId: number) => Promise<boolean>
  switchChain:              (newChainId: number) => Promise<void>
  switchToSolana:           () => Promise<void>
  switchToEvm:              (chainId: number) => Promise<void>
  refreshProvider:          () => Promise<void>
}

export interface LuminaSession {
  account_id:            string
  evm_address:           string
  evm_signer:            string | null
  solana_address:        string | null
  solana_type:           string | null
  chain_id:              string
  is_deployed:           boolean
  wallet_type:           "embedded" | "external"
  signer_address?:       string
  smart_account_address?: string
}

const SESSION_KEY = "lumina_session"

export const WalletContext = createContext<WalletContextType>({
  provider: null, signer: null, evmChainId: null,
  address: null, chainId: null, isOnSolana: false,
  isConnected: false, isConnecting: false, walletType: null,
  showLoginModal: false, setShowLoginModal: () => {},
  connect: async () => {}, disconnect: async () => {},
  disconnectExternalWallet: async () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {}, switchToSolana: async () => {},
  switchToEvm: async () => {}, refreshProvider: async () => {},
})

// ── Small helpers ─────────────────────────────────────────────────────────────

function getRawProvider(): any | null {
  return typeof window !== "undefined" ? (window as any).ethereum ?? null : null
}

async function buildEthersProvider(raw: any) {
  try {
    const p = new BrowserProvider(raw)
    const [network, s] = await Promise.all([p.getNetwork(), p.getSigner()])
    return { provider: p, signer: s, chainId: Number(network.chainId) }
  } catch { return null }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const { fetchApi } = useLumina()

  const [provider,       setProvider]       = useState<BrowserProvider | null>(null)
  const [signer,         setSigner]         = useState<JsonRpcSigner | null>(null)
  const [walletType,     setWalletType]     = useState<"embedded" | "external" | null>(null)
  const [evmChainId,     setEvmChainId]     = useState<number | null>(null)
  const [isOnSolana,     setIsOnSolana]     = useState(false)
  const [session,        setSession]        = useState<LuminaSession | null>(null)
  const [isConnecting,   setIsConnecting]   = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { exportWallet } = usePrivy()
  const isOnSolanaRef = useRef(false)
  const setOnSolana = useCallback((val: boolean) => {
    isOnSolanaRef.current = val
    setIsOnSolana(val)
  }, [])
  const { defaultChainId, activeChainId, setActiveChainId, isChainSupported } = useLumina()

  // ── Derived ───────────────────────────────────────────────────────────────
  const isConnected = !!(session?.signer_address ?? session?.evm_address)
  const address = isOnSolana
    ? (session?.solana_address ?? null)
    : (session?.signer_address ?? session?.evm_address ?? null) 

  const chainId = isOnSolana ? SOLANA_CHAIN_ID : (evmChainId ?? null)
  const resolvedWalletType: "embedded" | "external" | null =
    walletType ?? (session ? "embedded" : null)

  // ── Hydrate session from localStorage on mount ────────────────────────────
  useEffect(() => {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return
  try {
    const s: LuminaSession = JSON.parse(raw)
    s.signer_address        = s.evm_signer ?? s.evm_address 
    s.smart_account_address = s.evm_address
    setSession(s)
    const sessionChainId = s.chain_id
    setEvmChainId(
      isChainSupported(sessionChainId)
        ? parseInt(sessionChainId, 10)
        : parseInt(defaultChainId, 10)
    )
    setActiveChainId(
      isChainSupported(sessionChainId) ? sessionChainId : defaultChainId
    )
  } catch {}
}, [])

  // ── Setup ethers provider ─────────────────────────────────────────────────
  const setupEvmProvider = useCallback(async () => {
    if (isOnSolanaRef.current) return
  const raw = getRawProvider()
  if (!raw) {
    setProvider(null); setSigner(null)
    // Don't blindly trust session.chain_id — it defaults to "1" from Lumina
    // Use session chain_id only if it's a chain you actually support
    const sessionChainId = session ? parseInt(session.chain_id, 10) : null
    const supported = supportedChains.map((c) => c.id)
    setEvmChainId(
      sessionChainId && supported.includes(sessionChainId as any)
        ? sessionChainId
        : DEFAULT_CHAIN_ID
    )

    setEvmChainId(sessionChainId && supported.includes(sessionChainId as any) ? sessionChainId : DEFAULT_CHAIN_ID)
    setWalletType("embedded")
    return
  }
    const result = await buildEthersProvider(raw)
    if (!result) { setProvider(null); setSigner(null); setEvmChainId(null); return }
    setProvider(result.provider)
    setSigner(result.signer)
    setEvmChainId(result.chainId)
    setWalletType("external")
  }, [session])

  const refreshProvider = useCallback(async () => {
    if (!isOnSolanaRef.current) await setupEvmProvider()
  }, [setupEvmProvider])

  useEffect(() => {
    if (session) setupEvmProvider()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.signer_address])

  // External wallet listeners
  useEffect(() => {
    const raw = getRawProvider()
    if (!raw) return
    const onChange = () => { if (!isOnSolanaRef.current) setupEvmProvider() }
    raw.on?.("chainChanged", onChange)
    raw.on?.("accountsChanged", onChange)
    return () => {
      raw.removeListener?.("chainChanged", onChange)
      raw.removeListener?.("accountsChanged", onChange)
    }
  }, [setupEvmProvider])

  // ── Auth ──────────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    setShowLoginModal(true)
  }, [])

  const handleLoginSuccess = useCallback((token: string) => {
    // Token is stored in localStorage by WalletLogin internally
    // Now hydrate the session from localStorage
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        const s: LuminaSession = JSON.parse(raw)
        setSession(s)
        setEvmChainId(parseInt(s.chain_id, 10) || null)
      } catch {}
    }
    setShowLoginModal(false)
    toast.success("Wallet connected!")
  }, [])

  const disconnect = useCallback(async () => {
    if (session?.signer_address) {
      try {
        await fetchApi(
          `/v1/connect/session?signer_address=${session.signer_address}`,
          { method: "DELETE" }
        )
      } catch {}
    }
    localStorage.removeItem(SESSION_KEY)
    setSession(null); setProvider(null); setSigner(null)
    setWalletType(null); setEvmChainId(null); setOnSolana(false)
    toast.success("Disconnected")
  }, [session, fetchApi, setOnSolana])

  const disconnectExternalWallet = useCallback(async () => {
    setProvider(null); setSigner(null)
    setWalletType(session ? "embedded" : null)
  }, [session])

  // ── switchToSolana ────────────────────────────────────────────────────────
  const switchToSolana = useCallback(async () => {
    if (!session?.solana_address) {
      toast.error("No Solana address linked to this wallet.")
      return
    }
    setOnSolana(true)
    setWalletType("embedded")
    toast.success("Switched to Solana")
  }, [session, setOnSolana])
useEffect(() => {
  if (evmChainId == null) return
  window.dispatchEvent(
    new CustomEvent("walletChainChanged", { detail: { chainId: evmChainId } })
  )
}, [evmChainId])
  // ── switchToEvm ───────────────────────────────────────────────────────────
// Then the full switchToEvm:
const switchToEvm = useCallback(async (targetChainId: number) => {
  // ── Validate against both sources ──────────────────────────────────────
  // supportedChains = viem chain objects from config (for metadata like name/rpc)
  // isChainSupported = Lumina context check (what the project declared)
  const viemChain = supportedChains.find((c) => c.id === targetChainId)
  if (!viemChain || !isChainSupported(String(targetChainId))) {
    toast.error(`Chain ${targetChainId} is not supported`)
    return
  }

  if (isOnSolanaRef.current) {
    setOnSolana(false)
    if (!provider) await setupEvmProvider()
  }

  const raw = getRawProvider()

  // ── Embedded wallet path ──────────────────────────────────────────────
  if (!raw) {
    if (!session) return
    try {
      const result = await fetchApi("/v1/connect/chain", {
        method: "POST",
        body: JSON.stringify({
          account_id:      session.account_id,
          target_chain_id: String(targetChainId),
        }),
      })
      const updated: LuminaSession = {
        ...session,
        smart_account_address: result.evm_address,
        chain_id:              String(targetChainId),
        is_deployed:           result.is_deployed,
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
      setSession(updated)
      setEvmChainId(targetChainId)
      setActiveChainId(String(targetChainId))   // ← sync Lumina context
      toast.success("Network switched")
    } catch {
      toast.error("Failed to switch network")
    }
    return
  }

  // ── External wallet path ──────────────────────────────────────────────
  const hexId = `0x${targetChainId.toString(16)}`
  try {
    try {
      await raw.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] })
    } catch (err: any) {
      if (err.code === 4902 || err.message?.includes("Unrecognized chain ID")) {
        await raw.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId:             hexId,
            chainName:           viemChain.name,
            nativeCurrency:      viemChain.nativeCurrency,
            rpcUrls:             [CHAIN_RPC[targetChainId] ?? viemChain.rpcUrls.default.http[0]],
            blockExplorerUrls:   viemChain.blockExplorers
              ? [Object.values(viemChain.blockExplorers)[0].url]
              : [],
          }],
        })
      } else {
        throw err
      }
    }

    // ── Poll until wallet confirms the switch ─────────────────────────
    let confirmed = false
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 500))
      try {
        const net = await new BrowserProvider(raw).getNetwork()
        if (Number(net.chainId) === targetChainId) { confirmed = true; break }
      } catch {}
    }

    if (!confirmed) {
      toast.warning("Network may not have switched — verify in your wallet")
      return
    }

    await setupEvmProvider()
    setActiveChainId(String(targetChainId))     // ← sync Lumina context
    toast.success("Network switched")

  } catch (err: any) {
    if (err?.code === 4001 || err?.message?.includes("rejected")) {
      toast.error("Network switch cancelled")
    } else {
      toast.error("Failed to switch network")
    }
    throw err
  }
}, [session, provider, setupEvmProvider, setOnSolana, isChainSupported, setActiveChainId])
  // ── switchChain ───────────────────────────────────────────────────────────
  const switchChain = useCallback(async (newChainId: number) => {
    if (newChainId === SOLANA_CHAIN_ID) await switchToSolana()
    else await switchToEvm(newChainId)
  }, [switchToSolana, switchToEvm])

  const ensureCorrectNetwork = useCallback(async (requiredChainId: number) => {
    if (!isConnected) { await connect(); return false }
    const current = isOnSolana ? SOLANA_CHAIN_ID : evmChainId
    if (current !== requiredChainId) await switchChain(requiredChainId)
    return true
  }, [isConnected, isOnSolana, evmChainId, connect, switchChain])

  return (
    <WalletContext.Provider value={{
      provider, signer, evmChainId,
      address, chainId, isOnSolana,
      isConnected, isConnecting,
      walletType: resolvedWalletType,
      showLoginModal, setShowLoginModal,
      connect, disconnect, disconnectExternalWallet,
      ensureCorrectNetwork, switchChain,
      switchToSolana, switchToEvm, refreshProvider,
    }}>
      {children}

      {/* ── Login Modal ───────────────────────────────────────────────────── */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false) }}
        >
          <ConnectModal
            apiKey={process.env.NEXT_PUBLIC_LUMINA_API_KEY!}
            chainId={String(DEFAULT_CHAIN_ID)}
            onRequestExport={exportWallet}        // ← add this line
            onSuccess={(raw: any) => {
            const normalized: LuminaSession = {
              ...raw,
              signer_address:        raw.evm_signer ?? raw.evm_address,   // ← the actual key (0xe5f093...)
              smart_account_address: raw.evm_address,                     // ← the smart account (0x1e41...)
              chain_id: raw.chain_id ?? String(DEFAULT_CHAIN_ID),
            }
            localStorage.setItem(SESSION_KEY, JSON.stringify(normalized))
            setSession(normalized)
            setEvmChainId(parseInt(normalized.chain_id, 10))
            setShowLoginModal(false)
            toast.success("Wallet connected!")
          }}
            onError={(err) => toast.error(err.message)}
            onClose={() => setShowLoginModal(false)}
          />
        </div>
      )}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}

// ── Session persistence helpers ───────────────────────────────────────────────

export function persistLuminaSession(response: LuminaSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(response))
}

export function getLuminaSession(): LuminaSession | null {
  if (typeof window === "undefined") return null
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") } catch { return null }
}