"use client"

import {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, type ReactNode,
} from "react"
import { BrowserProvider, ethers, JsonRpcProvider, Wallet, type JsonRpcSigner } from "ethers"
import { toast } from "sonner"
import { usePrivy } from "@privy-io/react-auth"
import { supportedChains, DEFAULT_CHAIN_ID, CHAIN_RPC } from "@/config/chain"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SocialProvider = "google" | "twitter" | "telegram" | "discord" | "github" | "farcaster" | "passkey"


export interface WalletSession {
  address:        string
  walletType:     "embedded" | "external"
  provider?:      string
  chainId:        number
  token?:         string
  linkedSocials?: SocialProvider[]
  solanaAddress?:  string | null
  stellarAddress?: string | null
  // ── Legacy Privy import fields ──
  legacyFound?:       boolean
  legacyPrivyId?:     string | null
  legacyEvmAddress?:  string | null
  legacySolAddress?:  string | null
  needsSeedImport?:   boolean
}

interface DetectedWallet {
  name:     string
  icon:     string
  provider: any
}

interface WalletContextType {
  session:          WalletSession | null
  address:          string | null
  chainId:          number | null
  isConnected:      boolean
  isConnecting:     boolean
  walletType:       "embedded" | "external" | null
  // NOTE: widened so embedded sessions can populate these directly, the
  // same way external sessions always have — see refreshEmbeddedSigner.
  provider:         BrowserProvider | JsonRpcProvider | null
  signer:           JsonRpcSigner | Wallet | null
  detectedWallets:  DetectedWallet[]
  showModal:        boolean
  solanaAddress:    string | null
  stellarAddress:   string | null
  legacyFound?:       boolean
  legacyPrivyId?:     string | null
  legacyEvmAddress?:  string | null
  legacySolAddress?:  string | null
  getEmbeddedSigner: (chainId: number) => Promise<Wallet | null>
  getActiveSigner:   (chainId?: number) => Promise<JsonRpcSigner | Wallet | null>

  clearLegacy:      () => Promise<void>
  fetchNonEvmAddresses: () => Promise<void>

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
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://thoughtful-carmencita-faucetdrops-02a54589.koyeb.app"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function detectWallets(): DetectedWallet[] {
  if (typeof window === "undefined") return []
  const eth = (window as any).ethereum
  if (!eth) return []

  const wallets: DetectedWallet[] = []
  const providers: any[] = eth.providers ?? [eth]

  for (const p of providers) {
    if (p.isBraveWallet)               continue  // ← add this first to skip early
    if (p.isMetaMask && !p.isRabby)    wallets.push({ name: "MetaMask",       icon: "🦊", provider: p })
    else if (p.isRabby)                wallets.push({ name: "Rabby",           icon: "🐰", provider: p })
    else if (p.isCoinbaseWallet)       wallets.push({ name: "Coinbase Wallet", icon: "🔵", provider: p })
    else if (p.isFrame)                wallets.push({ name: "Frame",           icon: "🖼", provider: p })
    else if (p.isOkxWallet)            wallets.push({ name: "OKX Wallet",      icon: "⭕", provider: p })
    else if (p.isTrust)                wallets.push({ name: "Trust Wallet",    icon: "🛡", provider: p })
    else if (p.isPhantom && p.ethereum)wallets.push({ name: "Phantom",         icon: "👻", provider: p.ethereum })
    else                               wallets.push({ name: "Browser Wallet",  icon: "🌐", provider: p })
}

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

/** Wipe all per-address import-dismissed markers from sessionStorage */
function clearImportSessionKeys() {
  if (typeof window === "undefined") return
  Object.keys(sessionStorage)
    .filter(k => k.startsWith("privy_import_dismissed_"))
    .forEach(k => sessionStorage.removeItem(k))
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
  getEmbeddedSigner: async () => null,
  disconnect: () => {},
  switchChain: async () => {},
  ensureCorrectNetwork: async () => false,
  linkSocial: async () => {},
  refreshProvider: async () => {},
  solanaAddress:  null,
  stellarAddress: null,
  clearLegacy:      async () => {},
  fetchNonEvmAddresses: async () => {},
  getActiveSigner:   async () => null,

})

export async function openOAuthPopup(
  apiBase: string,
  provider: string,
  onCancel?: () => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const state = crypto.randomUUID()
    const popup = window.open(
      `${apiBase}/api/auth/${provider}?client_state=${state}`,
      `${provider}_oauth`,
      "width=520,height=640,left=400,top=100",
    )
    if (!popup) {
      reject(new Error("Popup blocked — allow popups and try again"))
      return
    }

    let settled    = false
    let popupReady = false

    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      clearInterval(pollSession)
      clearInterval(pollClosed)
      fn()
    }

    setTimeout(() => { popupReady = true }, 3000)

    const pollSession = setInterval(async () => {
      try {
        const res  = await fetch(`${apiBase}/api/auth/session?state=${state}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === "pending") return
        popup.close()
        if (data.status === "done") settle(() => resolve(data.credential))
        else settle(() => reject(new Error("OAuth failed")))
      } catch { /* keep polling */ }
    }, 1000)

    const pollClosed = setInterval(() => {
      if (!popupReady) return
      if (popup.closed) {
        settle(() => {
          onCancel?.()
          reject(new Error("cancelled"))
        })
      }
    }, 500)

    setTimeout(() => {
      popup.close()
      settle(() => reject(new Error("OAuth timed out")))
    }, 180_000)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session,         setSession]         = useState<WalletSession | null>(null)
  const [provider,        setProvider]        = useState<BrowserProvider | JsonRpcProvider | null>(null)
  const [signer,          setSigner]          = useState<JsonRpcSigner | Wallet | null>(null)
  const [isConnecting,    setIsConnecting]    = useState(false)
  const [showModal,       setShowModal]       = useState(false)
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([])
  const rawProviderRef = useRef<any>(null)

  // ── Privy SDK logout hook ──────────────────────────────────────────────
  // We need this so that disconnecting / switching accounts on this app
  // also clears Privy's OWN internal session/wallet cache. Without this,
  // Privy's useWallets() can keep returning the previous user's embedded
  // wallet address even after our own session has switched to a new user.
  const { logout: privyLogout } = usePrivy()

  // NOTE: deliberately NOT gated on `usePrivy().authenticated`. That flag
  // can lag behind reality (it's just React state from the Privy SDK), and
  // gating on it caused stale-wallet bugs where a second account's import
  // flow kept seeing the previous account's cached Privy session/wallets
  // because we skipped logout thinking we were "already logged out".
  // Calling logout() when there's nothing to log out of is a safe no-op.
  const forcePrivyLogout = useCallback(async () => {
    try {
      await privyLogout()
    } catch {
      // non-fatal — Privy logout failing shouldn't block our own disconnect
    }
  }, [privyLogout])

  const isConnected = !!session?.address
  const address     = session?.address ?? null
  const chainId     = session?.chainId ?? null
  const walletType  = session?.walletType ?? null

  // ── Embedded signer/provider loader ───────────────────────────────────────
  // Pure fetch — takes explicit token/chainId instead of reading `session`
  // from closure, so it can never run against a stale session.
  const loadEmbeddedSigner = useCallback(async (token: string, targetChainId: number) => {
    try {
      const res = await fetch(
        `${API_BASE}/wallet/export-privatekey?chain_id=${targetChainId}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) {
        console.error(`[wallet] export-privatekey failed: ${res.status}`)
        return null
      }
      const data = await res.json()
      if (!data.private_key) {
        console.error("[wallet] export-privatekey returned no private_key")
        return null
      }
      const rpcUrl = CHAIN_RPC[targetChainId]
      if (!rpcUrl) {
        console.error(`[wallet] no RPC configured for chain ${targetChainId}`)
        return null
      }
      const jsonRpcProvider = new JsonRpcProvider(rpcUrl)
      const wallet = new ethers.Wallet(data.private_key, jsonRpcProvider)
      return { provider: jsonRpcProvider, signer: wallet }
    } catch (err) {
      console.error("[wallet] failed to load embedded signer", err)
      return null
    }
  }, [])

  // Loads the embedded signer AND writes it into context state, so
  // `useWallet().signer` / `useWallet().provider` work for embedded wallets
  // the same way they already do for external ones.
  const refreshEmbeddedSigner = useCallback(async (token: string, targetChainId: number) => {
    const result = await loadEmbeddedSigner(token, targetChainId)
    setProvider(result?.provider ?? null)
    setSigner(result?.signer ?? null)
    return result
  }, [loadEmbeddedSigner])

  // ── Mount: detect wallets + restore session ───────────────────────────────
  useEffect(() => {
    setDetectedWallets(detectWallets())

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

    const saved = loadSession()
    if (saved) {
      setSession(saved)
      if (saved.walletType === "external") {
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
      } else if (saved.walletType === "embedded" && saved.token) {
        refreshEmbeddedSigner(saved.token, saved.chainId ?? DEFAULT_CHAIN_ID)
      }
    }

    return () => window.removeEventListener("eip6963:announceProvider", handler)
  }, [])

  // ── Fetch Solana + Stellar addresses from backend ─────────────────────────
  const fetchNonEvmAddresses = useCallback(async () => {
    const s = session
    if (!s?.token || s.walletType !== "embedded") return
    if (s.solanaAddress !== undefined) return

    try {
      const res  = await fetch(`${API_BASE}/wallet/addresses`, {
        headers: { Authorization: `Bearer ${s.token}` },
      })
      if (!res.ok) return
      const data = await res.json()

      const updated: WalletSession = {
        ...s,
        solanaAddress:  data.solana  ?? null,
        stellarAddress: data.stellar ?? null,
      }
      setSession(updated)
      saveSession(updated)
    } catch {
      // non-fatal
    }
  }, [session])

  useEffect(() => {
    if (session?.walletType === "embedded" && session.solanaAddress === undefined) {
      fetchNonEvmAddresses()
    }
  }, [session?.address, session?.walletType, session?.solanaAddress])

  useEffect(() => {
    if (session?.walletType === "embedded" && session.solanaAddress === undefined) {
      fetchNonEvmAddresses()
    }
  }, [session?.address, session?.walletType])

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

      const res = await fetch(`${API_BASE}/wallet/external-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: result.signer.address }),
      })
      const data = await res.json()

      // Clear any stale import state from a previous user, including
      // Privy's own cached session — an external wallet connect should
      // never leave a stale embedded-wallet session behind either.
      await forcePrivyLogout()
      clearImportSessionKeys()
      localStorage.removeItem(SESSION_KEY)

      const newSession: WalletSession = {
        address:    result.signer.address,
        walletType: "external",
        provider:   wallet.name,
        chainId:    result.chainId,
        token:      data.token,
        linkedSocials: data.linked_socials,
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
  }, [forcePrivyLogout])

  // Public, backward-compatible accessor — fetches a one-off embedded
  // signer without necessarily touching context state. Most call sites
  // should prefer `getActiveSigner()` below; this is kept for callers that
  // already depend on this exact signature.
  const getEmbeddedSigner = useCallback(async (targetChainId: number) => {
    if (!session?.token || session.walletType !== "embedded") return null
    const result = await loadEmbeddedSigner(session.token, targetChainId)
    return result?.signer ?? null
  }, [session?.token, session?.walletType, loadEmbeddedSigner])

  // Single accessor that works the same way regardless of wallet type.
  // For external wallets this returns the cached signer (rebuilding the
  // provider first if it's gone stale). For embedded wallets it always
  // fetches a fresh signer AND syncs it into context state, so a stale
  // chain switch or expired key never silently no-ops a transaction.
  const getActiveSigner = useCallback(async (targetChainId?: number) => {
    if (session?.walletType === "external") {
      if (signer) return signer

      const raw = rawProviderRef.current
      if (raw) {
        const result = await buildProvider(raw)
        if (result) {
          setProvider(result.provider)
          setSigner(result.signer)
          return result.signer
        }
      }
      return null
    }

    if (session?.walletType === "embedded" && session.token) {
      const cid = targetChainId ?? chainId
      if (!cid) return null
      const result = await refreshEmbeddedSigner(session.token, cid)
      return result?.signer ?? null
    }

    return null
  }, [session?.walletType, session?.token, signer, chainId, refreshEmbeddedSigner])

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

      const data: {
        address:            string
        token:              string
        linked_socials:     SocialProvider[]
        legacy_found:       boolean
        legacy_privy_id:    string | null
        legacy_evm_address: string | null
        legacy_sol_address: string | null
        stellar_address:    string | null
        needs_seed_import:  boolean
      } = await res.json()

      // ── Clear ALL stale import/session state from any previous user ──
      // NOTE: we intentionally do NOT call forcePrivyLogout() here — this
      // is the path where Privy auth is what we're actively establishing
      // (e.g. via the export flow), so logging out here would undo it.
      clearImportSessionKeys()
      localStorage.removeItem(SESSION_KEY)

      const newSession: WalletSession = {
        address:        data.address,
        walletType:     "embedded",
        provider:       socialProvider,
        chainId:        DEFAULT_CHAIN_ID,
        token:          data.token,
        linkedSocials:  data.linked_socials,
        // Start as undefined so fetchNonEvmAddresses runs, but if backend
        // already returned stellar/solana from the login response, use it.
        solanaAddress:  undefined,
        stellarAddress: data.stellar_address ?? undefined,
        // ── Legacy fields ──
        legacyFound:      data.legacy_found || data.needs_seed_import,
        legacyEvmAddress: data.legacy_evm_address ?? data.address,
        legacyPrivyId:    data.legacy_privy_id,
        legacySolAddress: data.legacy_sol_address,
        needsSeedImport:  data.needs_seed_import,
      }

      setSession(newSession)
      saveSession(newSession)
      setShowModal(false)
      // Populate `signer`/`provider` right away — same contract as the
      // external-wallet path, instead of leaving them null for embedded.
      refreshEmbeddedSigner(data.token, DEFAULT_CHAIN_ID)
      toast.success("Wallet ready!")
    } catch (err: any) {
      if (err.message !== "cancelled") {
        toast.error(err.message ?? "Login failed")
      }
      throw err
    } finally {
      setIsConnecting(false)
    }
  }, [refreshEmbeddedSigner])

  // ── Clear legacy import flags ────────────────────────────────────────────
  // Called both on successful import AND when the modal is dismissed/skipped.
  // We force a Privy logout here too: once the legacy-import flow is done
  // (or abandoned), we don't want Privy's embedded-wallet session lingering
  // around to confuse the NEXT social login on this device. This is now
  // async and AWAITS the logout, so callers can rely on Privy actually
  // being logged out by the time this resolves (fixes the bug where a
  // second account's import kept reusing the first account's Privy wallet).
  const clearLegacy = useCallback(async () => {
    setSession(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        legacyFound:      false,
        legacyPrivyId:    null,
        legacyEvmAddress: null,
        legacySolAddress: null,
        needsSeedImport:  false,
      }
      saveSession(updated)
      return updated
    })
    await forcePrivyLogout()
  }, [forcePrivyLogout])

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    // Awaited now too — same reasoning as clearLegacy: don't let a fast
    // disconnect→reconnect-as-someone-else race ahead of Privy's logout.
    await forcePrivyLogout()
    clearImportSessionKeys()
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setProvider(null)
    setSigner(null)
    rawProviderRef.current = null
    toast.success("Disconnected")
  }, [forcePrivyLogout])

  // ── Switch chain ──────────────────────────────────────────────────────────
  const switchChain = useCallback(async (targetChainId: number) => {
    const viemChain = supportedChains.find(c => c.id === targetChainId)
    if (!viemChain) { toast.error("Unsupported chain"); return }

    if (walletType === "embedded") {
      const updated = { ...session!, chainId: targetChainId }
      setSession(updated)
      saveSession(updated)
      // Embedded signer is chain-specific (it's built on a JsonRpcProvider
      // pointed at one RPC) — refresh it so context state matches the new
      // chain instead of silently holding a signer for the old one.
      if (session?.token) refreshEmbeddedSigner(session.token, targetChainId)
      toast.success(`Switched to ${viemChain.name}`)
      return
    }

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
  }, [session, walletType, refreshEmbeddedSigner])

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

      const updated: WalletSession = {
        ...session,
        linkedSocials: data.linked_socials,
      }
      setSession(updated)
      saveSession(updated)
      toast.success(`${socialProvider} linked!`)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to link account")
      throw err
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
      solanaAddress:        session?.solanaAddress  ?? null,
      stellarAddress:       session?.stellarAddress ?? null,
      fetchNonEvmAddresses,
      getEmbeddedSigner,
      getActiveSigner,
      legacyFound:      session?.legacyFound      ?? false,
      legacyEvmAddress: session?.legacyEvmAddress ?? null,
      legacySolAddress: session?.legacySolAddress ?? null,
      legacyPrivyId:    session?.legacyPrivyId    ?? null,
      clearLegacy,
    }}>
      {children}
    </WalletContext.Provider>
  )
}


export function useWallet() {
  return useContext(WalletContext)
}