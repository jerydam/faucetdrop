"use client"

import {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, type ReactNode,
} from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { toast } from "sonner"
import { supportedChains, DEFAULT_CHAIN_ID, CHAIN_RPC } from "@/config/chain"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SocialProvider = "google" | "twitter" | "telegram" | "discord" | "github" | "farcaster" | "passkey"


export interface WalletSession {
  address:       string          // the wallet address (EOA for embedded, signer for external)
  walletType:    "embedded" | "external"
  provider?:     string          // e.g. "google", "twitter", "metamask", "rabby"
  chainId:       number
  token?:        string          // JWT from backend (embedded wallets only)
  linkedSocials?: SocialProvider[]
}

interface DetectedWallet {
  name:     string
  icon:     string
  provider: any                  // window.ethereum or sub-provider
}

interface WalletContextType {
  // State
  session:          WalletSession | null
  address:          string | null
  chainId:          number | null
  isConnected:      boolean
  isConnecting:     boolean
  walletType:       "embedded" | "external" | null
  provider:         BrowserProvider | null
  signer:           JsonRpcSigner | null
  detectedWallets:  DetectedWallet[]
  showModal:        boolean

  // Actions
  setShowModal:             (val: boolean) => void
  connectExternalWallet:    (wallet: DetectedWallet) => Promise<void>
  connectSocial:            (provider: SocialProvider, credential: string) => Promise<void>
  disconnect:               () => void
  switchChain:              (chainId: number) => Promise<void>
  ensureCorrectNetwork:     (requiredChainId: number) => Promise<boolean>
  linkSocial:               (provider: SocialProvider, credential: string) => Promise<void>
  refreshProvider:          () => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = "wallet_session"
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all EIP-1193 providers the browser exposes */
function detectWallets(): DetectedWallet[] {
  if (typeof window === "undefined") return []
  const eth = (window as any).ethereum
  if (!eth) return []

  const wallets: DetectedWallet[] = []

  // Multi-injected providers (EIP-6963 is the future, but providers[].isXxx covers today)
  const providers: any[] = eth.providers ?? [eth]

  for (const p of providers) {
    if (p.isMetaMask && !p.isRabby)    wallets.push({ name: "MetaMask",       icon: "🦊", provider: p })
    else if (p.isRabby)                wallets.push({ name: "Rabby",           icon: "🐰", provider: p })
    else if (p.isCoinbaseWallet)       wallets.push({ name: "Coinbase Wallet", icon: "🔵", provider: p })
    else if (p.isBraveWallet)          wallets.push({ name: "Brave Wallet",    icon: "🦁", provider: p })
    else if (p.isFrame)                wallets.push({ name: "Frame",           icon: "🖼", provider: p })
    else if (p.isOkxWallet)            wallets.push({ name: "OKX Wallet",      icon: "⭕", provider: p })
    else if (p.isTrust)                wallets.push({ name: "Trust Wallet",    icon: "🛡", provider: p })
    else if (p.isPhantom && p.ethereum)wallets.push({ name: "Phantom",         icon: "👻", provider: p.ethereum })
    else                               wallets.push({ name: "Browser Wallet",  icon: "🌐", provider: p })
  }

  // De-dupe by name
  return wallets.filter((w, i, arr) => arr.findIndex(x => x.name === w.name) === i)
}

async function buildProvider(raw: any) {
  try {
    const p = new BrowserProvider(raw)
    const [network, s] = await Promise.all([p.getNetwork(), p.getSigner()])
    return { provider: p, signer: s, chainId: Number(network.chainId) }
  } catch { return null }
}

function saveSession(s: WalletSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

function loadSession(): WalletSession | null {
  if (typeof window === "undefined") return null
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") } catch { return null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

export const WalletContext = createContext<WalletContextType>({
  session: null, address: null, chainId: null,
  isConnected: false, isConnecting: false, walletType: null,
  provider: null, signer: null, detectedWallets: [], showModal: false,
  setShowModal: () => {},
  connectExternalWallet: async () => {},
  connectSocial: async () => {},
  disconnect: () => {},
  switchChain: async () => {},
  ensureCorrectNetwork: async () => false,
  linkSocial: async () => {},
  refreshProvider: async () => {},
})

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session,         setSession]         = useState<WalletSession | null>(null)
  const [provider,        setProvider]        = useState<BrowserProvider | null>(null)
  const [signer,          setSigner]          = useState<JsonRpcSigner | null>(null)
  const [isConnecting,    setIsConnecting]    = useState(false)
  const [showModal,       setShowModal]       = useState(false)
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([])
  const rawProviderRef = useRef<any>(null)

  // ── Derived ───────────────────────────────────────────────────────────────
  const isConnected = !!session?.address
  const address     = session?.address ?? null
  const chainId     = session?.chainId ?? null
  const walletType  = session?.walletType ?? null

  // ── Mount: detect wallets + restore session ───────────────────────────────
  useEffect(() => {
    setDetectedWallets(detectWallets())

    // EIP-6963: listen for wallets that announce themselves after load
    const handler = (e: any) => {
      const { info, provider: p } = e.detail
      setDetectedWallets(prev => {
        const exists = prev.some(w => w.name === info.name)
        if (exists) return prev
        return [...prev, { name: info.name, icon: info.icon ?? "🌐", provider: p }]
      })
    }
    window.addEventListener("eip6963:announceProvider", handler)
    window.dispatchEvent(new Event("eip6963:requestProvider"))

    // Restore session
    const saved = loadSession()
    if (saved) {
      setSession(saved)
      if (saved.walletType === "external") {
        // Re-establish ethers provider for external wallets
        const wallets = detectWallets()
        if (wallets.length > 0) {
          buildProvider(wallets[0].provider).then(result => {
            if (result) {
              setProvider(result.provider)
              setSigner(result.signer)
              rawProviderRef.current = wallets[0].provider
            }
          })
        }
      }
    }

    return () => window.removeEventListener("eip6963:announceProvider", handler)
  }, [])

  // ── External wallet listeners ─────────────────────────────────────────────
  useEffect(() => {
    const raw = rawProviderRef.current
    if (!raw) return
    const rebuild = () => {
      buildProvider(raw).then(result => {
        if (!result) return
        setProvider(result.provider)
        setSigner(result.signer)
        setSession(prev => prev ? { ...prev, chainId: result.chainId, address: result.signer.address } : prev)
      })
    }
    raw.on?.("chainChanged", rebuild)
    raw.on?.("accountsChanged", rebuild)
    return () => {
      raw.removeListener?.("chainChanged", rebuild)
      raw.removeListener?.("accountsChanged", rebuild)
    }
  }, [rawProviderRef.current])

  // ── Connect external wallet ───────────────────────────────────────────────
  const connectExternalWallet = useCallback(async (wallet: DetectedWallet) => {
    setIsConnecting(true)
    try {
      await wallet.provider.request({ method: "eth_requestAccounts" })
      const result = await buildProvider(wallet.provider)
      if (!result) throw new Error("Failed to build provider")

      rawProviderRef.current = wallet.provider
      setProvider(result.provider)
      setSigner(result.signer)

      const newSession: WalletSession = {
        address:    result.signer.address,
        walletType: "external",
        provider:   wallet.name,
        chainId:    result.chainId,
      }
      setSession(newSession)
      saveSession(newSession)
      setShowModal(false)
      toast.success(`Connected with ${wallet.name}`)
    } catch (err: any) {
      if (err?.code === 4001) toast.error("Connection rejected")
      else toast.error("Failed to connect wallet")
      throw err
    } finally {
      setIsConnecting(false)
    }
  }, [])

  // ── Connect social (embedded wallet via backend) ──────────────────────────
  const connectSocial = useCallback(async (socialProvider: SocialProvider, credential: string) => {
    setIsConnecting(true)
    try {
      const res = await fetch(`${API_BASE}/wallet/social-login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ provider: socialProvider, credential }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? "Social login failed")
      }
      const data: { address: string; token: string; linked_socials: SocialProvider[] } = await res.json()

      const newSession: WalletSession = {
        address:       data.address,
        walletType:    "embedded",
        provider:      socialProvider,
        chainId:       DEFAULT_CHAIN_ID,
        token:         data.token,
        linkedSocials: data.linked_socials,
      }
      setSession(newSession)
      saveSession(newSession)
      setProvider(null)
      setSigner(null)
      setShowModal(false)
      toast.success("Wallet ready!")
    } catch (err: any) {
      toast.error(err.message ?? "Login failed")
      throw err
    } finally {
      setIsConnecting(false)
    }
  }, [])

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setProvider(null)
    setSigner(null)
    rawProviderRef.current = null
    toast.success("Disconnected")
  }, [])

  // ── Switch chain ──────────────────────────────────────────────────────────
  const switchChain = useCallback(async (targetChainId: number) => {
    const viemChain = supportedChains.find(c => c.id === targetChainId)
    if (!viemChain) { toast.error("Unsupported chain"); return }

    if (walletType === "embedded") {
      // For embedded wallets, the chain is a UI concept — just update session
      const updated = { ...session!, chainId: targetChainId }
      setSession(updated)
      saveSession(updated)
      toast.success(`Switched to ${viemChain.name}`)
      return
    }

    // External wallet: request switch
    const raw = rawProviderRef.current
    if (!raw) return
    const hexId = `0x${targetChainId.toString(16)}`
    try {
      try {
        await raw.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] })
      } catch (err: any) {
        if (err.code === 4902 || err.message?.includes("Unrecognized chain ID")) {
          await raw.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId:           hexId,
              chainName:         viemChain.name,
              nativeCurrency:    viemChain.nativeCurrency,
              rpcUrls:           [CHAIN_RPC[targetChainId] ?? viemChain.rpcUrls.default.http[0]],
              blockExplorerUrls: viemChain.blockExplorers
                ? [Object.values(viemChain.blockExplorers)[0].url] : [],
            }],
          })
        } else throw err
      }
      // Poll for confirmation
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 500))
        const net = await new BrowserProvider(raw).getNetwork()
        if (Number(net.chainId) === targetChainId) break
      }
      await buildProvider(raw).then(result => {
        if (!result) return
        setProvider(result.provider)
        setSigner(result.signer)
        const updated = { ...session!, chainId: targetChainId }
        setSession(updated)
        saveSession(updated)
      })
      toast.success(`Switched to ${viemChain.name}`)
    } catch (err: any) {
      if (err?.code === 4001) toast.error("Switch cancelled")
      else toast.error("Failed to switch network")
    }
  }, [session, walletType])

  const ensureCorrectNetwork = useCallback(async (requiredChainId: number) => {
    if (!isConnected) { setShowModal(true); return false }
    if (chainId !== requiredChainId) await switchChain(requiredChainId)
    return true
  }, [isConnected, chainId, switchChain])

  // ── Link additional social ────────────────────────────────────────────────
  const linkSocial = useCallback(async (socialProvider: SocialProvider, credential: string) => {
    if (!session?.token) { toast.error("Not connected"); return }
    try {
      const res = await fetch(`${API_BASE}/wallet/link-social`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.token}`,
        },
        body: JSON.stringify({ provider: socialProvider, credential }),
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      const data = await res.json()
      const updated: WalletSession = { ...session, linkedSocials: data.linked_socials }
      setSession(updated)
      saveSession(updated)
      toast.success(`${socialProvider} linked!`)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to link account")
    }
  }, [session])

  const refreshProvider = useCallback(async () => {
    const raw = rawProviderRef.current
    if (!raw) return
    const result = await buildProvider(raw)
    if (result) { setProvider(result.provider); setSigner(result.signer) }
  }, [])

  return (
    <WalletContext.Provider value={{
      session, address, chainId, isConnected, isConnecting,
      walletType, provider, signer, detectedWallets, showModal,
      setShowModal, connectExternalWallet, connectSocial,
      disconnect, switchChain, ensureCorrectNetwork,
      linkSocial, refreshProvider,
    }}>
      {children}
    </WalletContext.Provider>
  )
}


export function useWallet() {
  return useContext(WalletContext)
}