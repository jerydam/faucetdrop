"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PinSetupModal } from "@/components/pin-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWallet, openOAuthPopup, type SocialProvider } from "@/components/wallet-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Save, Upload, Check, Edit2, RefreshCw,ShieldCheck,
  CheckCircle2, Link as LinkIcon, Wallet, Copy, ExternalLink, X,
} from "lucide-react"
import { toast } from "sonner"

const API_BASE_URL = "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UserProfile {
  wallet_address: string
  username:       string
  bio:            string
  avatar_url:     string
}

type IconComponent = (props: { className?: string; style?: React.CSSProperties }) => JSX.Element

interface DetectedChainWallet {
  name:     string
  icon:     IconComponent
  provider: any
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GENERATED_SEEDS = [
  "Jerry","John","Aneka","Zack","Molly","Bear","Crypto","Whale","Pepe",
  "Satoshi","Vitalik","Gwei","HODL","WAGMI","Doge","Shiba","Solana",
  "Ether","Bitcoin","Chain","Block","DeFi","NFT","Alpha","Beta",
  "Neon","Cyber","Pixel","Glitch","Retro","Vapor","Synth","Wave",
  "Pulse","Echo","Flux","Spark","Glow","Shine","Shadow","Light",
]

const CHAIN_META: Record<string, { label: string; badge: string; explorerBase: string }> = {
  evm:     { label: "EVM",     badge: "EVM", explorerBase: "https://celoscan.io/address/" },
  solana:  { label: "Solana",  badge: "SOL", explorerBase: "https://solscan.io/account/" },
  stellar: { label: "Stellar", badge: "XLM", explorerBase: "https://stellar.expert/explorer/public/account/" },
}

// ─────────────────────────────────────────────────────────────────────────────
// Social brand icons (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

function GoogleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" fill="#34A853"/>
      <path d="M5.84 14.14A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.14V7.02H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.98l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.48 6.16-4.48z" fill="#EA4335"/>
    </svg>
  )
}
function XIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}
function GithubIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.9.57.1.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.75 2.68 1.25 3.33.95.1-.74.39-1.25.71-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .3.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/>
    </svg>
  )
}
function DiscordIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.32 4.74A19.8 19.8 0 0 0 15.87 3.3c-.2.36-.43.85-.59 1.24a18.3 18.3 0 0 0-5.56 0 8.4 8.4 0 0 0-.6-1.24 19.9 19.9 0 0 0-4.45 1.44C2.1 8.4 1.42 12 1.74 15.55a19.9 19.9 0 0 0 5.06 2.62c.41-.57.77-1.18 1.08-1.82a13 13 0 0 1-1.7-.84c.14-.11.28-.22.41-.34a13.9 13.9 0 0 0 11.82 0c.14.12.28.23.41.34-.54.32-1.11.6-1.7.84.31.64.67 1.25 1.08 1.82a19.9 19.9 0 0 0 5.06-2.62c.38-4.1-.62-7.66-2.94-10.81zM8.68 13.4c-.83 0-1.5-.78-1.5-1.74 0-.96.66-1.74 1.5-1.74s1.51.78 1.5 1.74c0 .96-.66 1.74-1.5 1.74zm6.64 0c-.83 0-1.5-.78-1.5-1.74 0-.96.66-1.74 1.5-1.74s1.51.78 1.5 1.74c0 .96-.66 1.74-1.5 1.74z"/>
    </svg>
  )
}
function TelegramIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12s5.15 11.5 11.5 11.5S23.5 18.35 23.5 12 18.35.5 12 .5zm5.4 7.86-1.83 8.63c-.14.62-.5.77-1 .48l-2.77-2.04-1.34 1.29c-.15.15-.27.27-.55.27l.2-2.79 5.09-4.6c.22-.2-.05-.31-.34-.11l-6.29 3.96-2.71-.85c-.59-.18-.6-.59.12-.87l10.6-4.09c.49-.18.92.12.82.72z"/>
    </svg>
  )
}
function FarcasterIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#855DCD"/>
      <path d="M6.5 7h11v2.2h-3.1V17h-2.2v-7.8H8.7V17H6.5V7z" fill="white"/>
      <path d="M5.8 7h1.6l.4 1.8-.4 1.6H5.8z" fill="white"/>
      <path d="M16.6 7h1.6v3.4l-.4 1.6h-1.2l-.4-1.6z" fill="white"/>
    </svg>
  )
}

const SOCIALS: { id: SocialProvider; label: string; Icon: IconComponent; color: string; bg: string }[] = [
  { id: "google",    label: "Google",    Icon: GoogleIcon,    color: "#EA4335", bg: "rgba(234,67,53,0.08)"  },
  { id: "twitter",   label: "Twitter/X", Icon: XIcon,         color: "#FFFFFF", bg: "rgba(255,255,255,0.08)" },
  { id: "github",    label: "GitHub",    Icon: GithubIcon,    color: "#E5E5E5", bg: "rgba(255,255,255,0.10)" },
  { id: "discord",   label: "Discord",   Icon: DiscordIcon,   color: "#5865F2", bg: "rgba(88,101,242,0.08)" },
  { id: "telegram",  label: "Telegram",  Icon: TelegramIcon,  color: "#2AABEE", bg: "rgba(42,171,238,0.08)" },
  { id: "farcaster", label: "Farcaster", Icon: FarcasterIcon, color: "#855DCD", bg: "rgba(133,93,205,0.08)" },
]

const getSocialMeta = (provider: SocialProvider) => SOCIALS.find(s => s.id === provider)

// ─────────────────────────────────────────────────────────────────────────────
// Wallet brand icons (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function PhantomIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#AB9FF2"/><path d="M12 4.5c-3.6 0-6.2 2.9-6.2 6.7 0 2.1.6 3.9 1.7 5.2.3.4.9.3 1.1-.1l.4-.9c.1-.3.5-.4.8-.2.6.4 1.3.6 2.2.6s1.6-.2 2.2-.6c.3-.2.7-.1.8.2l.4.9c.2.4.8.5 1.1.1 1.1-1.3 1.7-3.1 1.7-5.2 0-3.8-2.6-6.7-6.2-6.7z" fill="white"/><circle cx="9.8" cy="11" r="1" fill="#AB9FF2"/><circle cx="14.2" cy="11" r="1" fill="#AB9FF2"/></svg>
}
function BackpackIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#111111"/><path d="M8 9.5c0-1.9 1.8-3.5 4-3.5s4 1.6 4 3.5v7a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-7z" fill="#E5E5E5"/><rect x="9.5" y="9" width="5" height="3" rx="0.5" fill="#111111"/><rect x="10.5" y="4.5" width="3" height="2.5" rx="1" fill="#E5E5E5"/></svg>
}
function SolflareIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#181818"/><path d="M12 4l1.8 4.6L18 12l-4.2 3.4L12 20l-1.8-4.6L6 12l4.2-3.4z" fill="#FC9B30"/><circle cx="12" cy="12" r="2.4" fill="#FFDD55"/></svg>
}
function GlowIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><defs><linearGradient id="g" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#FF5F6D"/><stop offset="50%" stopColor="#9C5FFF"/><stop offset="100%" stopColor="#36D1DC"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#g)"/><circle cx="12" cy="12" r="4.5" fill="white" opacity="0.85"/></svg>
}
function ExodusIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0A0A0A"/><path d="M12 4l5 4-5 4-5-4z" fill="white"/><path d="M7 12l5 4 5-4-5 8z" fill="#7C7CFF"/></svg>
}
function FreighterIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#000000"/><path d="M5 12l14-7-5.5 16-2.5-6.5z" fill="white"/><path d="M11 14.5l3-3" stroke="white" strokeWidth="1.2"/></svg>
}
function LobstrIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#E0473E"/><path d="M9 7c-1.8 0-3 1.4-3 3.2 0 1.1.5 1.9 1.3 2.5L6 16l2.6-1.2c.7.3 1.5.5 2.4.5.6 0 1.1-.1 1.6-.2" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><path d="M15 7c1.8 0 3 1.4 3 3.2 0 1.1-.5 1.9-1.3 2.5L18 16l-2.6-1.2c-.7.3-1.5.5-2.4.5-.6 0-1.1-.1-1.6-.2" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
}
function RabetIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#3B3FE0"/><path d="M9 10c-1-2.5-1.6-5-.6-5.6 1-.6 2.4 1.6 3.2 4" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><path d="M15 10c1-2.5 1.6-5 .6-5.6-1-.6-2.4 1.6-3.2 4" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><ellipse cx="12" cy="14" rx="4.2" ry="3.6" fill="white"/><circle cx="10.4" cy="13.6" r="0.6" fill="#3B3FE0"/><circle cx="13.6" cy="13.6" r="0.6" fill="#3B3FE0"/></svg>
}
function XBullIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#111111"/><path d="M6 9c-1.3-.5-2-1.6-1.6-2.6.5-1 2-1 2.9-.2" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round"/><path d="M18 9c1.3-.5 2-1.6 1.6-2.6-.5-1-2-1-2.9-.2" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round"/><path d="M8 11c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 5-4 5-4-2.8-4-5z" fill="white"/><circle cx="10.3" cy="10.6" r="0.6" fill="#111111"/><circle cx="13.7" cy="10.6" r="0.6" fill="#111111"/><path d="M11 13.5h2" stroke="#111111" strokeWidth="0.8" strokeLinecap="round"/></svg>
}
function GenericWalletIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#374151"/><rect x="5" y="8" width="14" height="9" rx="2" fill="#9CA3AF"/><rect x="5" y="8" width="14" height="3" rx="1.5" fill="#D1D5DB"/><circle cx="15.5" cy="12.5" r="1.2" fill="#374151"/></svg>
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet detection helpers (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function detectSolanaWallets(): DetectedChainWallet[] {
  if (typeof window === "undefined") return []
  const w = window as any
  const wallets: DetectedChainWallet[] = []
  if (w.solana?.isPhantom)    wallets.push({ name: "Phantom",       icon: PhantomIcon,  provider: w.solana })
  if (w.backpack?.isBackpack) wallets.push({ name: "Backpack",      icon: BackpackIcon, provider: w.backpack })
  if (w.solflare?.isSolflare) wallets.push({ name: "Solflare",      icon: SolflareIcon, provider: w.solflare })
  if (w.glow?.isGlow)         wallets.push({ name: "Glow",          icon: GlowIcon,     provider: w.glow })
  if (w.exodus?.solana)       wallets.push({ name: "Exodus",        icon: ExodusIcon,   provider: w.exodus.solana })
  if (w.solana && wallets.length === 0) wallets.push({ name: "Browser Wallet", icon: GenericWalletIcon, provider: w.solana })
  return wallets
}

function detectStellarWallets(): DetectedChainWallet[] {
  if (typeof window === "undefined") return []
  const w = window as any
  const wallets: DetectedChainWallet[] = []
  if (w.freighter)       wallets.push({ name: "Freighter", icon: FreighterIcon, provider: { type: "freighter" } })
  if (w.lobstr?.stellar) wallets.push({ name: "Lobstr",    icon: LobstrIcon,    provider: { type: "lobstr",  raw: w.lobstr } })
  if (w.rabet?.stellar)  wallets.push({ name: "Rabet",     icon: RabetIcon,     provider: { type: "rabet",   raw: w.rabet } })
  if (w.xbull?.stellar)  wallets.push({ name: "xBull",     icon: XBullIcon,     provider: { type: "xbull",   raw: w.xbull } })
  return wallets
}

async function signWithSolana(provider: any, message: string): Promise<{ address: string; signature: string }> {
  if (!provider.isConnected) await provider.connect()
  const pubkey = provider.publicKey?.toString()
  if (!pubkey) throw new Error("No public key — connect your wallet first")
  const encoded = new TextEncoder().encode(message)
  const { signature } = await provider.signMessage(encoded, "utf8")
  const base58 = await uint8ArrayToBase58(signature)
  return { address: pubkey, signature: base58 }
}

async function signWithStellar(provider: { type: string; raw?: any }, message: string): Promise<{ address: string; signature: string }> {
  if (provider.type === "freighter") {
    const freighterApi = await import("@stellar/freighter-api")
    const addressResult = await freighterApi.getAddress()
    const address = "address" in addressResult ? addressResult.address : (addressResult as any).address
    if (!address) throw new Error("Freighter not connected")
    const signResult = await freighterApi.signMessage(message, { address })
    const signature = "signature" in signResult && signResult.signature
      ? signResult.signature
      : (signResult as any).signedMessage
    if (!signature) throw new Error("Freighter returned no signature")
    return { address, signature }
  }
  throw new Error(`${provider.type} signing not yet supported — use Freighter`)
}

async function uint8ArrayToBase58(bytes: Uint8Array): Promise<string> {
  try {
    const bs58 = await import("bs58")
    return bs58.default.encode(bytes)
  } catch {
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    let carry = BigInt(0)
    for (const b of bytes) carry = carry * 256n + BigInt(b)
    let result = ""
    while (carry > 0n) { result = ALPHABET[Number(carry % 58n)] + result; carry /= 58n }
    for (const b of bytes) { if (b !== 0) break; result = "1" + result }
    return result
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet picker (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function WalletPicker({ wallets, chain, onPick, onCancel }: {
  wallets: DetectedChainWallet[]; chain: string
  onPick: (w: DetectedChainWallet) => void; onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/40 mt-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Choose a {CHAIN_META[chain]?.label} wallet
        </p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {wallets.map(w => {
        const Icon = w.icon
        return (
          <button key={w.name} onClick={() => onPick(w)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/60 transition-colors text-left">
            <Icon className="h-6 w-6 shrink-0" />
            <span className="text-sm font-medium">{w.name}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WalletAddressRow (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function WalletAddressRow({ chain, address, onLink }: {
  chain: string; address: string | null | undefined
  onLink?: (chain: string, addr: string, sig: string, msg: string) => Promise<void>
}) {
  const meta = CHAIN_META[chain]
  type LinkStep = "idle" | "picking" | "signing" | "done"
  const [step,    setStep]    = useState<LinkStep>("idle")
  const [wallets, setWallets] = useState<DetectedChainWallet[]>([])
  const [errMsg,  setErrMsg]  = useState<string | null>(null)

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success(`${meta.label} address copied`) }

  const handleLinkClick = () => {
    setErrMsg(null)
    const detected = chain === "solana" ? detectSolanaWallets() : detectStellarWallets()
    if (detected.length === 0) { setErrMsg(`No ${meta.label} wallet detected.`); return }
    if (detected.length === 1) { handlePick(detected[0]) } else { setWallets(detected); setStep("picking") }
  }

  const handlePick = async (wallet: DetectedChainWallet) => {
    setStep("signing"); setErrMsg(null)
    try {
      const message = `Link ${meta.label} wallet to FaucetDrops\nTimestamp: ${Date.now()}`
      const { address: walletAddr, signature } = chain === "solana"
        ? await signWithSolana(wallet.provider, message)
        : await signWithStellar(wallet.provider, message)
      await onLink!(chain, walletAddr, signature, message)
      setStep("done")
    } catch (err: any) {
      const msg = err?.message ?? "Signing failed"
      if (!msg.toLowerCase().includes("cancel") && !msg.toLowerCase().includes("reject")) setErrMsg(msg)
      setStep("idle")
    }
  }

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{meta.label}</span>
          <Badge variant="secondary" className="text-[10px]">{meta.badge}</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {short ? (
            <>
              <span className="text-xs text-muted-foreground font-mono">{short}</span>
              <button onClick={() => copy(address!)} className="text-muted-foreground hover:text-foreground p-1 rounded">
                <Copy className="h-3 w-3" />
              </button>
              <a href={`${meta.explorerBase}${address}`} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground p-1 rounded">
                <ExternalLink className="h-3 w-3" />
              </a>
              {onLink && (
                <Button size="sm" variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                  onClick={handleLinkClick} disabled={step === "signing"}>
                  {step === "signing" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Edit2 className="h-3 w-3" />}
                </Button>
              )}
            </>
          ) : onLink ? (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={handleLinkClick} disabled={step === "signing"}>
              {step === "signing" ? <><Loader2 className="h-3 w-3 animate-spin" /> Signing…</> : "Link wallet"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Not available</span>
          )}
        </div>
      </div>
      {step === "picking" && <WalletPicker wallets={wallets} chain={chain} onPick={handlePick} onCancel={() => setStep("idle")} />}
      {step === "signing" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          Waiting for wallet signature…
        </div>
      )}
      {errMsg && <p className="text-xs text-red-500 px-1">{errMsg}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ProfileSettingsModal() {
  const {
    address, isConnected, session,
    linkSocial, walletType, solanaAddress, stellarAddress,
    getActiveSigner,   // ← replaces direct `signer` usage for save
  } = useWallet()

  const router        = useRouter()
  const walletApiBase = process.env.NEXT_PUBLIC_API_URL ?? "https://thoughtful-carmencita-faucetdrops-02a54589.koyeb.app"

  const [isOpen,          setIsOpen]          = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [uploading,       setUploading]       = useState(false)
  const [usernameError,   setUsernameError]   = useState<string | null>(null)
  const [seedOffset,      setSeedOffset]      = useState(0)
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null)
  const [embeddedSolAddr, setEmbeddedSolAddr] = useState<string | null | undefined>(undefined)
  const [embeddedXlmAddr, setEmbeddedXlmAddr] = useState<string | null | undefined>(undefined)
  const [extSolAddr,      setExtSolAddr]      = useState<string | null>(null)
  const [extXlmAddr,      setExtXlmAddr]      = useState<string | null>(null)
  const [freshLinkedSocials, setFreshLinkedSocials] = useState<string[] | null>(null)
  const [unlinkedOverride,   setUnlinkedOverride]   = useState<SocialProvider[] | null>(null)
  const [securityModalOpen, setSecurityModalOpen] = useState(false)
  const [formData, setFormData] = useState<UserProfile>({
    wallet_address: "", username: "", bio: "", avatar_url: "",
  })

  const isEmbedded   = walletType === "embedded"
  const effectiveSol = isEmbedded ? (solanaAddress ?? null) : extSolAddr
  const effectiveXlm = isEmbedded
    ? (embeddedXlmAddr !== undefined ? embeddedXlmAddr : (stellarAddress ?? undefined))
    : extXlmAddr

  // ── Reset on close ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setEmbeddedSolAddr(undefined); setEmbeddedXlmAddr(undefined)
      setExtSolAddr(null);           setExtXlmAddr(null)
      setFreshLinkedSocials(null);   setUnlinkedOverride(null)
    }
  }, [isOpen])

  // ── Fetch profile + addresses + socials on open ───────────────────────
  const fetchProfile = useCallback(async (signal?: AbortSignal) => {
    if (!address) return
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/profile/${address}`, { signal })
      if (signal?.aborted) return
      const data = await res.json()
      setFormData({
        wallet_address: address,
        username:       data.profile?.username   || "",
        bio:            data.profile?.bio        || "",
        avatar_url:     data.profile?.avatar_url || "",
      })
    } catch (err: any) {
      if (err.name === "AbortError") return
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [address])

  const fetchChainAddresses = useCallback(async () => {
    if (!session?.token) return
    try {
      const res  = await fetch(`${walletApiBase}/wallet/addresses`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      if (isEmbedded) {
        setEmbeddedSolAddr(data.solana ?? null)
        setEmbeddedXlmAddr(data.stellar ?? null)
      } else {
        setExtSolAddr(data.solana ?? null)
        setExtXlmAddr(data.stellar ?? null)
      }
    } catch { /* non-fatal */ }
  }, [session?.token, isEmbedded, walletApiBase])

  const fetchLinkedSocials = useCallback(async () => {
    if (!session?.token) return
    try {
      const res  = await fetch(`${walletApiBase}/wallet/me`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setFreshLinkedSocials(data.linked_socials ?? [])
    } catch { /* non-fatal */ }
  }, [session?.token, walletApiBase])

  useEffect(() => {
    if (!isOpen || !address) return
    const controller = new AbortController()
    fetchProfile(controller.signal)
    fetchChainAddresses()
    fetchLinkedSocials()
    return () => controller.abort()
  }, [isOpen, address, fetchProfile, fetchChainAddresses, fetchLinkedSocials])

  // ── Link external non-EVM address ────────────────────────────────────
  const handleLinkAddress = async (chain: string, addr: string, signature: string, message: string) => {
    if (!session?.token) throw new Error("Not authenticated")
    const res = await fetch(`${walletApiBase}/wallet/link-external-address`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ chain, address: addr, signature, message }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Failed to link address")
    }
    if (chain === "solana")  setExtSolAddr(addr)
    if (chain === "stellar") setExtXlmAddr(addr)
    toast.success(`${CHAIN_META[chain].label} wallet verified and linked!`)
  }

  // ── Save profile — works for both embedded and external wallets ───────
  const handleSave = async () => {
  if (!isConnected || !address) return toast.error("Wallet not connected")
  setSaving(true)
  const valid = await checkUsernameUniqueness(formData.username || "")
  if (!valid) { setSaving(false); return }
  try {
    // Close the dialog BEFORE requesting the signer so the PIN modal
    // isn't buried under the Radix overlay and can receive pointer events.
    setIsOpen(false)
    
    const activeSigner = await getActiveSigner()
    if (!activeSigner) {
      toast.error("Could not get wallet signer — please reconnect")
      setIsOpen(true)   // reopen so user isn't left in a blank state
      setSaving(false)
      return
    }
    const nonce     = Math.floor(Math.random() * 1_000_000).toString()
    const message   = `Update Profile\nWallet: ${address}\nNonce: ${nonce}`
    const signature = await activeSigner.signMessage(message)
    const res = await fetch(`${API_BASE_URL}/api/profile/update`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_address: address,
        username: formData.username, bio: formData.bio,
        avatar_url: formData.avatar_url, signature, message, nonce,
      }),
    })
    if (!res.ok) throw new Error("Update failed")
    toast.success("Profile saved!")
    window.dispatchEvent(new Event("profileUpdated"))
    if (formData.username) router.push(`/dashboard/${formData.username}`)
  } catch (err: any) {
    // If user cancelled the PIN or it failed, reopen the profile dialog
    if (err?.message !== "cancelled") {
      const msg = err?.reason ?? err?.shortMessage ?? err?.message ?? "Unknown error"
      toast.error(msg)
    }
    setIsOpen(true)
  } finally {
    setSaving(false)
  }
  }

  // ── Username availability ─────────────────────────────────────────────
  const checkUsernameUniqueness = async (value: string) => {
    if (!value?.trim() || !address) return true
    try {
      const res  = await fetch(`${API_BASE_URL}/api/profile/check-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "username", value: value.trim(), current_wallet: address.toLowerCase() }),
      })
      const data = await res.json()
      if (!data.available) { setUsernameError(data.message); return false }
      setUsernameError(null); return true
    } catch { return true }
  }

  // ── Social linking — POPUP approach for all providers ─────────────────

  // Generic helper: opens a popup and returns a promise that resolves
  // to the credential when the popup posts back, or rejects on close/timeout.
  const openSocialPopup = (
    url: string,
    expectedType: string,
    name: string = "auth",
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const popup = window.open(url, name, "width=520,height=640,left=400,top=100")
      if (!popup) { reject(new Error("Popup blocked — allow popups and try again")); return }

      let settled = false
      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        clearInterval(closedPoll)
        window.removeEventListener("message", messageHandler)
        fn()
      }

      const messageHandler = (e: MessageEvent) => {
        if (e.data?.type !== expectedType) return
        popup.close()
        settle(() => resolve(JSON.stringify(e.data.user ?? e.data.data)))
      }

      window.addEventListener("message", messageHandler)

      const closedPoll = setInterval(() => {
        if (popup.closed) settle(() => reject(new Error("cancelled")))
      }, 500)

      setTimeout(() => {
        popup.close()
        settle(() => reject(new Error("OAuth timed out")))
      }, 180_000)
    })
  }

  const handleLinkSocial = async (provider: SocialProvider) => {
    setLinkingProvider(provider)
    try {
      let credential: string

      if (provider === "telegram") {
        // Opens the existing /auth/telegram page (your TelegramCallback component)
        credential = await openSocialPopup("/auth/telegram", "telegram_auth", "telegram_auth")
      } else if (provider === "farcaster") {
        // Opens the new /auth/farcaster page
        credential = await openSocialPopup("/auth/farcaster", "farcaster_auth", "farcaster_auth")
      } else {
        // Standard OAuth popup for Google, Twitter, GitHub, Discord
        credential = await openOAuthPopup(walletApiBase, provider, () => setLinkingProvider(null))
      }

      await linkSocial(provider, credential)
      setUnlinkedOverride(null)
      // Re-fetch so the UI reflects the new linked state immediately
      await fetchLinkedSocials()
    } catch (err: any) {
      if (err.message === "cancelled") return
      if (err.message !== "OAuth timed out") toast.error(err.message || `Failed to connect ${provider}`)
    } finally {
      setLinkingProvider(null)
    }
  }

  const handleUnlinkSocial = async (provider: SocialProvider) => {
    if (!session?.token) return toast.error("Not authenticated")
    const effective = new Set(unlinkedOverride ?? session?.linkedSocials ?? [])
    if (effective.size <= 1) return toast.error("Can't remove your only login method")
    setLinkingProvider(provider)
    try {
      const res = await fetch(`${walletApiBase}/wallet/unlink-social`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ provider }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || "Unlink failed")
      const data = await res.json()
      toast.success(`${getSocialMeta(provider)?.label ?? provider} disconnected`)
      window.dispatchEvent(new CustomEvent("socialUnlinked", { detail: data.linked_socials }))
      await fetchLinkedSocials()
    } catch (err: any) {
      toast.error(err.message || `Failed to disconnect ${provider}`)
    } finally {
      setLinkingProvider(null)
    }
  }

  useEffect(() => {
    const handler = (e: any) => setUnlinkedOverride(e.detail)
    window.addEventListener("socialUnlinked", handler)
    return () => window.removeEventListener("socialUnlinked", handler)
  }, [])

  const effectiveLinked = new Set(
    unlinkedOverride ?? freshLinkedSocials ?? session?.linkedSocials ?? []
  )

  // ── File upload ───────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res  = await fetch(`${API_BASE_URL}/upload-image`, { method: "POST", body })
      const data = await res.json()
      if (data.success) { setFormData(prev => ({ ...prev, avatar_url: data.imageUrl })); toast.success("Image uploaded") }
      else throw new Error(data.message)
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const currentSeeds = GENERATED_SEEDS.slice(seedOffset, seedOffset + 8)

  // ── Social row ────────────────────────────────────────────────────────
  const SocialRow = ({ provider }: { provider: SocialProvider }) => {
    const linked = effectiveLinked.has(provider)
    const busy   = linkingProvider === provider
    const meta   = getSocialMeta(provider)
    const Icon   = meta?.Icon
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-8 w-8 rounded-full shrink-0"
            style={{ background: meta?.bg ?? "rgba(255,255,255,0.08)" }}>
            {Icon ? <Icon className="h-4 w-4" style={{ color: meta?.color }} /> : null}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{meta?.label ?? provider}</span>
            <span className="text-xs">
              {linked
                ? <span className="text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 className="h-3 w-3" /> Connected</span>
                : <span className="text-muted-foreground">Not connected</span>}
            </span>
          </div>
        </div>
        {linked ? (
          <Button size="sm" variant="ghost" type="button" disabled={busy || !!linkingProvider}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
            onClick={() => handleUnlinkSocial(provider)}>
            {busy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {busy ? "Removing…" : "Disconnect"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" type="button" disabled={busy || !!linkingProvider}
            className="shrink-0" onClick={() => handleLinkSocial(provider)}>
            {busy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {busy ? "Connecting…" : "Connect"}
          </Button>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background shadow-sm hover:bg-muted">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95%] sm:max-w-[600px] max-h-[90vh] rounded-lg flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-4">

              {/* Avatar */}
              <div className="flex flex-col items-center gap-4 w-full">
                <Avatar className="h-24 w-24 border-2 border-primary/20">
                  <AvatarImage src={formData.avatar_url} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold">{formData.username?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <Tabs defaultValue="generate" className="w-full max-w-sm">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="generate">Choose Avatar</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="pt-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer relative bg-muted/20">
                      <input type="file" accept="image/*" onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                      {uploading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <Upload className="h-8 w-8 text-muted-foreground mb-2" />}
                      <p className="text-xs text-muted-foreground text-center">
                        {uploading ? "Uploading…" : "Tap to upload (max 5 MB)"}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="generate" className="pt-4">
                    <div className="grid grid-cols-4 gap-3">
                      {currentSeeds.map((seed, idx) => {
                        const url        = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`
                        const isSelected = formData.avatar_url === url
                        return (
                          <div key={`${seed}-${idx}`}
                            onClick={() => setFormData(prev => ({ ...prev, avatar_url: url }))}
                            className={`relative aspect-square rounded-full cursor-pointer overflow-hidden border-2 transition-all hover:scale-105 ${
                              isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent bg-muted"
                            }`}>
                            <img src={url} alt={seed} className="w-full h-full" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <Button variant="ghost" size="sm"
                      onClick={() => setSeedOffset(p => (p + 8) % GENERATED_SEEDS.length)}
                      className="w-full mt-4 text-muted-foreground hover:text-primary gap-2">
                      <RefreshCw className="h-3 w-3" /> Shuffle
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Username + Bio */}
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <Label className="sm:text-right pt-2">Username</Label>
                  <div className="col-span-3">
                    <Input
                      value={formData.username}
                      onChange={e => { setFormData(p => ({ ...p, username: e.target.value })); setUsernameError(null) }}
                      onBlur={() => checkUsernameUniqueness(formData.username)}
                      className={usernameError ? "border-red-500" : ""}
                    />
                    {usernameError
                      ? <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                      : formData.username && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Available
                          </p>
                        )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <Label className="sm:text-right pt-2">Bio</Label>
                  <Textarea value={formData.bio}
                    onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                    className="col-span-3" placeholder="Tell us about yourself…" />
                </div>
              </div>

              {/* Linked Wallets */}
              <div className="border-t pt-6">
                <h4 className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="h-3 w-3" /> Linked Wallets
                </h4>
                <div className="grid gap-3">
                  {address && <WalletAddressRow chain="evm" address={address} />}
                  <WalletAddressRow chain="solana"  address={effectiveSol} onLink={!isEmbedded ? handleLinkAddress : undefined} />
                  <WalletAddressRow chain="stellar" address={effectiveXlm} onLink={!isEmbedded ? handleLinkAddress : undefined} />
                </div>
                <p className="text-xs text-muted-foreground mt-3 px-1">
                  {isEmbedded
                    ? "All addresses are derived from your seed phrase."
                    : "Link your Solana and Stellar wallets to receive multi-chain rewards."}
                </p>
              </div>
               {isEmbedded && (
                <div className="border-t pt-6">
                  <h4 className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Wallet Security
                  </h4>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">PIN / Passkey</span>
                      <span className="text-xs">
                        {session?.hasPIN
                          ? <span className="text-green-600 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Protected
                            </span>
                          : <span className="text-muted-foreground">Not set up</span>}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" type="button"
                      onClick={() => { setIsOpen(false); setSecurityModalOpen(true) }}>
                      {session?.hasPIN ? "Change" : "Set up"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 px-1">
                    Required before signing transactions — separate from your login.
                  </p>
                </div>
              )}     
              {/* Verified Connections */}
              <div className="border-t pt-6">
                <h4 className="mb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <LinkIcon className="h-3 w-3" /> Verified Connections
                </h4>
                <div className="grid gap-3">
                  <SocialRow provider="google"    />
                  <SocialRow provider="twitter"   />
                  <SocialRow provider="github"    />
                  <SocialRow provider="telegram"  />
                  <SocialRow provider="discord"   />
                  <SocialRow provider="farcaster" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Linked accounts let you sign in from any device and always land on the same wallet.
                </p>
              </div>

            </div>
          )}
        </div>

        <div className="shrink-0 px-6 pt-2 pb-6 border-t bg-background">
          <Button onClick={handleSave} disabled={saving || loading || !!usernameError} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <PinSetupModal
      open={securityModalOpen}
      onClose={() => setSecurityModalOpen(false)}
      onDone={() => { setSecurityModalOpen(false); setIsOpen(true) }}  
    />
  </>
  )
}
