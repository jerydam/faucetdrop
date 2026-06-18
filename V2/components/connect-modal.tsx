"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useWallet, type SocialProvider, API_BASE } from "./wallet-provider"
import { X, Loader2, ChevronRight, Shield, Fingerprint } from "lucide-react"
import { cn } from "@/lib/utils"
import { createAppClient, viemConnector } from "@farcaster/auth-client"

// ─────────────────────────────────────────────────────────────────────────────
// Real brand icons (inline SVG, currentColor-friendly where possible)
// ─────────────────────────────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" fill="#34A853"/>
      <path d="M5.84 14.14A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.14V7.02H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.98l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.48 6.16-4.48z" fill="#EA4335"/>
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.9.57.1.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.75 2.68 1.25 3.33.95.1-.74.39-1.25.71-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .3.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/>
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.32 4.74A19.8 19.8 0 0 0 15.87 3.3c-.2.36-.43.85-.59 1.24a18.3 18.3 0 0 0-5.56 0 8.4 8.4 0 0 0-.6-1.24 19.9 19.9 0 0 0-4.45 1.44C2.1 8.4 1.42 12 1.74 15.55a19.9 19.9 0 0 0 5.06 2.62c.41-.57.77-1.18 1.08-1.82a13 13 0 0 1-1.7-.84c.14-.11.28-.22.41-.34a13.9 13.9 0 0 0 11.82 0c.14.12.28.23.41.34-.54.32-1.11.6-1.7.84.31.64.67 1.25 1.08 1.82a19.9 19.9 0 0 0 5.06-2.62c.38-4.1-.62-7.66-2.94-10.81zM8.68 13.4c-.83 0-1.5-.78-1.5-1.74 0-.96.66-1.74 1.5-1.74s1.51.78 1.5 1.74c0 .96-.66 1.74-1.5 1.74zm6.64 0c-.83 0-1.5-.78-1.5-1.74 0-.96.66-1.74 1.5-1.74s1.51.78 1.5 1.74c0 .96-.66 1.74-1.5 1.74z"/>
    </svg>
  )
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .5C5.65.5.5 5.65.5 12s5.15 11.5 11.5 11.5S23.5 18.35 23.5 12 18.35.5 12 .5zm5.4 7.86-1.83 8.63c-.14.62-.5.77-1 .48l-2.77-2.04-1.34 1.29c-.15.15-.27.27-.55.27l.2-2.79 5.09-4.6c.22-.2-.05-.31-.34-.11l-6.29 3.96-2.71-.85c-.59-.18-.6-.59.12-.87l10.6-4.09c.49-.18.92.12.82.72z"/>
    </svg>
  )
}

function FarcasterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#855DCD"/>
      <path d="M6.5 7h11v2.2h-3.1V17h-2.2v-7.8H8.7V17H6.5V7z" fill="white"/>
      <path d="M5.8 7h1.6l.4 1.8-.4 1.6H5.8z" fill="white"/>
      <path d="M16.6 7h1.6v3.4l-.4 1.6h-1.2l-.4-1.6z" fill="white"/>
    </svg>
  )
}

const SOCIALS: { id: SocialProvider; label: string; Icon: (props: { className?: string }) => JSX.Element; color: string; bg: string }[] = [
  { id: "google",    label: "Google",    Icon: GoogleIcon,    color: "#EA4335", bg: "rgba(234,67,53,0.08)"  },
  { id: "twitter",   label: "Twitter/X", Icon: XIcon,         color: "#FFFFFF", bg: "rgba(255,255,255,0.08)" },
  { id: "github",    label: "GitHub",    Icon: GithubIcon,    color: "#E5E5E5", bg: "rgba(255,255,255,0.10)" },
  { id: "discord",   label: "Discord",   Icon: DiscordIcon,   color: "#5865F2", bg: "rgba(88,101,242,0.08)" },
  { id: "telegram",  label: "Telegram",  Icon: TelegramIcon,  color: "#2AABEE", bg: "rgba(42,171,238,0.08)" },
  { id: "farcaster", label: "Farcaster", Icon: FarcasterIcon, color: "#855DCD", bg: "rgba(133,93,205,0.08)" },
]

// ─────────────────────────────────────────────────────────────────────────────

interface ConnectModalProps {
  onSuccess?: () => void
}

export function ConnectModal({ onSuccess }: ConnectModalProps) {
  const {
    showModal, setShowModal,
    detectedWallets, connectExternalWallet, connectSocial,
    isConnecting,
  } = useWallet()

  const [tab,       setTab]       = useState<"social" | "wallet">("social")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => setMounted(true), [])

  // ── Social login ──────────────────────────────────────────────────────────
  const handleSocial = useCallback((providerId: SocialProvider) => {
    if (providerId === "passkey") { handlePasskey(); return }

    setLoadingId(providerId)

    const state = crypto.randomUUID()
    const w = window.open(
      `${API_BASE}/api/auth/${providerId}?client_state=${state}`,
      "oauth",
      "width=500,height=700,left=200,top=100",
    )

    if (!w) {
      setLoadingId(null)
      return
    }

    let settled = false

    const settle = (cancelled = false) => {
      if (settled) return
      settled = true
      clearInterval(pollId)
      if (cancelled) setLoadingId(null)
    }

    // Single interval: always check session first, then check closed.
    // This avoids the race where window.close() fires and we mistake it
    // for a user cancellation before the session poll resolves.
    const pollId = setInterval(async () => {
      // ── 1. Always try the session endpoint first ──────────────────────
      try {
        const res  = await fetch(`${API_BASE}/api/auth/session?state=${state}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === "done") {
            // Success — popup already closed itself via window.close()
            settle(false)
            setLoadingId(null)
            try { w.close() } catch {}
            await connectSocial(data.provider as SocialProvider, data.credential)
            onSuccess?.()
            return
          }
        }
      } catch {
        // Network hiccup — keep polling
      }

      // ── 2. Only treat closed popup as cancellation if session is still
      //       pending (i.e. we didn't just succeed above) ─────────────────
      try {
        if (w.closed) settle(true)   // user manually closed without completing OAuth
      } catch {
        // Cross-origin frame check can throw — ignore
      }
    }, 800)

    // Safety timeout: 3 minutes
    setTimeout(() => {
      try { w.close() } catch {}
      settle(true)
    }, 180_000)
  }, [connectSocial, onSuccess])
  // In ConnectModal, replace handleSocial for "telegram":

  const handleTelegram = useCallback(() => {
  setLoadingId("telegram")

  // Open your Next.js page as a popup (not a blank window)
  const popup = window.open(
    "/telegram-callback",
    "telegram_login",
    "width=420,height=500,left=200,top=100",
  )

  if (!popup) {
    setLoadingId(null)
    return
  }

  let settled = false
  const settle = () => {
    if (settled) return
    settled = true
    setLoadingId(null)
    window.removeEventListener("message", onMessage)
    clearInterval(closedPoll)
  }
  // Listen for the postMessage from the popup
  const onMessage = async (e: MessageEvent) => {
    // Only accept messages from our own origin
    if (e.origin !== window.location.origin) return
    if (e.data?.type !== "telegram_auth") return

    settle()
    try {
      await connectSocial("telegram", JSON.stringify(e.data.user))
      onSuccess?.()
    } catch (err: any) {
      console.error("Telegram login failed:", err)
    }
  }

  window.addEventListener("message", onMessage)

  // Detect if user closes popup manually without completing
  const closedPoll = setInterval(() => {
    if (popup.closed) settle()
  }, 500)

  // Safety timeout
  setTimeout(() => {
    try { popup.close() } catch {}
    settle()
  }, 180_000)
}, [connectSocial, onSuccess])

const handleFarcaster = useCallback(async () => {
  setLoadingId("farcaster")
  try {
    const { createAppClient, viemConnector } = await import("@farcaster/auth-client")
    
    const appClient = createAppClient({
      relay: "https://relay.farcaster.xyz",
      ethereum: viemConnector(),
    })

    const nonce = crypto.randomUUID().replace(/-/g, "")

    // createChannel is the correct method in auth-client v0.x+
    const { data: channel, isError: channelError } = await appClient.createChannel({
      siweUri: window.location.origin,
      domain:  window.location.hostname,
      nonce,
    })

    if (channelError || !channel?.channelToken) {
      throw new Error("Failed to create Farcaster channel")
    }

    // Open the Warpcast QR/deeplink in a popup
    const popup = window.open(
      channel.url,
      "farcaster_login",
      "width=460,height=680,left=200,top=100",
    )

    // Poll for completion
    await new Promise<void>((resolve, reject) => {
      let settled = false

      const settle = (err?: Error) => {
        if (settled) return
        settled = true
        clearInterval(pollId)
        clearInterval(closedPoll)
        if (err) reject(err)
        else resolve()
      }

      const pollId = setInterval(async () => {
        try {
          const { data: status, isError } = await appClient.watchStatus({
            channelToken: channel.channelToken,
          })

          if (isError) { settle(new Error("Farcaster auth failed")); return }

          if (status?.state === "completed") {
            try { popup?.close() } catch {}
            settle()

            await connectSocial("farcaster", JSON.stringify({
              fid:      status.fid,
              username: status.username ?? "",
            }))
            onSuccess?.()
          }
        } catch { /* keep polling */ }
      }, 1500)

      // Detect manual popup close
      const closedPoll = setInterval(() => {
        if (popup?.closed) settle(new Error("cancelled"))
      }, 500)

      // 3 min timeout
      setTimeout(() => {
        try { popup?.close() } catch {}
        settle(new Error("Farcaster sign-in timed out"))
      }, 180_000)
    })

  } catch (err: any) {
    if (err?.message !== "cancelled") {
      console.error("Farcaster error:", err)
    }
  } finally {
    setLoadingId(null)
  }
}, [connectSocial, onSuccess])

  // ── Passkey ───────────────────────────────────────────────────────────────
  const handlePasskey = useCallback(async () => {
  setLoadingId("passkey")
  try {
    // First try authenticating with an existing passkey
    let credentialId: string

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: "required",
        },
      }) as PublicKeyCredential
      credentialId = assertion.id
    } catch {
      // No existing passkey — register a new one
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: "FaucetDrops", id: window.location.hostname },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: `user-${Date.now()}`,
            displayName: "FaucetDrops User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256
            { alg: -257, type: "public-key" },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "required", // required for discoverable credentials
          },
        },
      }) as PublicKeyCredential
      credentialId = credential.id
    }

    await connectSocial("passkey", credentialId)
    onSuccess?.()
  } catch (err: any) {
    if (!err?.message?.includes("cancel")) {
      console.error("Passkey error:", err)
    }
  } finally {
    setLoadingId(null)
  }
}, [connectSocial, onSuccess])

  // ── External wallet ───────────────────────────────────────────────────────
  const handleExternalWallet = useCallback(async (wallet: typeof detectedWallets[number]) => {
    setLoadingId(wallet.name)
    try {
      await connectExternalWallet(wallet)
      onSuccess?.()
    } finally {
      setLoadingId(null)
    }
  }, [connectExternalWallet, onSuccess])

  if (!showModal || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
    >
      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl"
        style={{
          background:  "var(--modal-bg, #0f0f13)",
          border:      "1px solid rgba(255,255,255,0.07)",
          boxShadow:   "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Connect</h2>
            <p className="text-xs text-white/40 mt-0.5">Sign in or connect your wallet</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="h-8 w-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 mb-4">
          <div className="flex rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["social", "wallet"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 text-xs font-medium py-2 rounded-lg transition-all capitalize",
                  tab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70",
                )}
              >
                {t === "social" ? "Social Login" : "Browser Wallet"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-2">
          {tab === "social" ? (
            <>
              {SOCIALS.map(s => (
  <SocialButton
    key={s.id}
    label={s.label}
    Icon={s.Icon}
    color={s.color}
    bg={s.bg}
    loading={loadingId === s.id}
    disabled={!!loadingId}
    onClick={() => {
      if (s.id === "telegram")  { handleTelegram();  return }
      if (s.id === "farcaster") { handleFarcaster(); return }
      handleSocial(s.id)
    }}
  />
))}

              {/* Passkey */}
              <button
                onClick={handlePasskey}
                disabled={!!loadingId}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  "text-white/80 hover:text-white",
                  "border border-white/10 hover:border-white/20 hover:bg-white/5",
                  loadingId === "passkey" && "opacity-60 pointer-events-none",
                )}
              >
                <span
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-lg"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  {loadingId === "passkey"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Fingerprint className="h-4 w-4" />}
                </span>
                <span className="flex-1 text-left">Passkey</span>
                <ChevronRight className="h-4 w-4 opacity-30" />
              </button>
            </>
          ) : (
            <>
              {detectedWallets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-3">🔍</div>
                  <p className="text-sm text-white/50">No wallets detected</p>
                  <p className="text-xs text-white/30 mt-1">Install MetaMask or another browser wallet</p>
                </div>
              ) : (
                detectedWallets.map(w => (
                  <button
                    key={w.name}
                    onClick={() => handleExternalWallet(w)}
                    disabled={!!loadingId}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      "text-white/80 hover:text-white",
                      "border border-white/10 hover:border-white/20 hover:bg-white/5",
                      loadingId === w.name && "opacity-60 pointer-events-none",
                    )}
                  >
                    <span
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-xl"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      {loadingId === w.name ? <Loader2 className="h-4 w-4 animate-spin" /> : w.icon}
                    </span>
                    <span className="flex-1 text-left">{w.name}</span>
                    <ChevronRight className="h-4 w-4 opacity-30" />
                  </button>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center gap-2">
          <Shield className="h-3 w-3 text-white/20 shrink-0" />
          <p className="text-[11px] text-white/25 leading-tight">
            Social logins create a self-custodial wallet. Your encrypted seed phrase is stored securely.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function SocialButton({
  label, Icon, color, bg, loading, disabled, onClick,
}: {
  label: string; Icon: (props: { className?: string }) => JSX.Element; color: string; bg: string
  loading: boolean; disabled: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        "border hover:scale-[1.01] active:scale-[0.99]",
        loading || disabled ? "opacity-60 pointer-events-none" : "cursor-pointer",
      )}
      style={{ color, borderColor: color + "30", background: bg }}
    >
      <span
        className="h-8 w-8 rounded-lg flex items-center justify-center"
        style={{ background: color + "18" }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </span>
      <span className="flex-1 text-left" style={{ color: "rgba(255,255,255,0.85)" }}>
        Continue with {label}
      </span>
      <ChevronRight className="h-4 w-4 opacity-30" />
    </button>
  )
}