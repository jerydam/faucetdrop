"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ShieldAlert, X, Eye, EyeOff, Loader2, Fingerprint } from "lucide-react"
import { useWallet } from "@/components/wallet-provider"

type Resolver = (pin: string) => void
type Rejecter = (err: Error) => void

let _resolve: Resolver | null = null
let _reject:  Rejecter | null = null
let _setOpen: ((v: boolean) => void) | null = null

export function openPinEntryModal(resolve: Resolver, reject: Rejecter) {
  _resolve = resolve
  _reject  = reject
  _setOpen?.(true)
}

// ─────────────────────────────────────────────────────────────────────────────
// Passkey helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getPasskeyData(address: string): Promise<{ pin: string; credId: string } | null> {
  try {
    const raw = localStorage.getItem(`fd_passkey_data_${address}`)
    if (!raw) return null
    return JSON.parse(atob(raw))
  } catch {
    return null
  }
}

async function assertPasskey(credId?: string): Promise<boolean> {
  // If we have a stored credId use it (faster, skips picker).
  // Without allowCredentials the browser shows its own cross-device UI
  // (QR / phone picker) on desktops that have no platform authenticator —
  // no custom QR code needed because residentKey:"required" at registration
  // already made this a discoverable credential.
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge:        crypto.getRandomValues(new Uint8Array(32)),
        timeout:          120_000,
        userVerification: "required",
        ...(credId ? {
          allowCredentials: [{
            id:   Uint8Array.from(atob(credId.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
            type: "public-key" as const,
          }],
        } : {}),
      },
    }) as PublicKeyCredential | null
    return !!assertion
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type Mode = "biometric" | "pin"

export function PinEntryModal() {
  const { session } = useWallet()

  const [open,    setOpen]    = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mode,    setMode]    = useState<Mode>("biometric")
  const [pin,     setPin]     = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error,   setError]   = useState("")
  const [busy,    setBusy]    = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const isPasskeyUser = session?.pinMethod === "passkey"
  const address       = session?.address

  useEffect(() => { _setOpen = setOpen; return () => { _setOpen = null } }, [])
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) { setPin(""); setError(""); setBusy(false); return }
    setPin(""); setError(""); setBusy(false)

    if (isPasskeyUser) {
      setMode("biometric")
      triggerBiometric()
    } else {
      setMode("pin")
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  const resolveWith = (resolvedPin: string) => {
    const resolve = _resolve
    _resolve = null; _reject = null
    setBusy(false); setOpen(false)
    resolve?.(resolvedPin)
  }

  const cancel = () => {
    const reject = _reject
    _resolve = null; _reject = null
    setBusy(false); setOpen(false)
    reject?.(new Error("cancelled"))
  }

  // ── Biometric — browser handles cross-device natively ─────────────────
  const triggerBiometric = async () => {
    if (!address) return
    setBusy(true); setError("")
    try {
      const data     = await getPasskeyData(address)
      // Pass credId when available for a fast direct assertion.
      // Omit it and the browser shows its own "use a phone / QR" picker.
      const verified = await assertPasskey(data?.credId)

      if (!verified) {
        setError("Biometric not recognised.")
        setBusy(false)
        return
      }

      if (data?.pin) {
        resolveWith(data.pin)
      } else {
        // Credential verified but no silent PIN stored — shouldn't happen
        // after a normal setup, but fall back gracefully.
        setError("Passkey ok but no PIN stored — enter it manually.")
        setMode("pin")
        setBusy(false)
        setTimeout(() => inputRef.current?.focus(), 80)
      }
    } catch (err: any) {
      setBusy(false)
      const msg = err?.message ?? ""
      // User dismissed the browser's own dialog (including its QR flow)
      if (msg.includes("cancel") || msg.includes("abort") || msg.includes("NotAllowedError")) {
        setMode("pin")
        setTimeout(() => inputRef.current?.focus(), 80)
      } else {
        setError("Biometric failed.")
        setMode("pin")
        setTimeout(() => inputRef.current?.focus(), 80)
      }
    }
  }

  // ── PIN ───────────────────────────────────────────────────────────────
  const submit = () => {
    if (!/^\d{6}$/.test(pin)) { setError("PIN must be 6 digits"); return }
    resolveWith(pin)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length === 6) submit()
    if (e.key === "Escape") cancel()
  }

  if (!open || !mounted) return null

  // ── Biometric waiting screen ──────────────────────────────────────────
  if (mode === "biometric") {
    return createPortal(
      <Backdrop onClose={cancel}>
        <Modal onClose={cancel}>
          <div className="p-6 text-center py-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-muted border border-border">
              {busy
                ? <Loader2 size={28} className="animate-spin text-primary" />
                : <Fingerprint size={28} className="text-primary" />}
            </div>
            <p className="text-sm font-semibold mb-2">Authorise transaction</p>
            <p className="text-xs leading-relaxed text-muted-foreground mb-1">
              {busy
                ? "Waiting — use your fingerprint, Face ID, or follow your browser's prompt…"
                : "Touch the sensor, use Face ID, or scan with your phone."}
            </p>

            {error && <p className="text-xs text-destructive mt-3 mb-1">{error}</p>}

            {!busy && (
              <button
                onClick={triggerBiometric}
                className="mt-4 text-xs text-primary hover:opacity-80 transition-opacity"
              >
                Try again
              </button>
            )}

            <button
              onClick={() => { setBusy(false); setMode("pin"); setTimeout(() => inputRef.current?.focus(), 80) }}
              className="block w-full mt-3 text-xs text-muted-foreground opacity-30 hover:opacity-60 transition-opacity"
            >
              Use PIN instead
            </button>
          </div>
        </Modal>
      </Backdrop>,
      document.body,
    )
  }

  // ── PIN entry ─────────────────────────────────────────────────────────
  return createPortal(
    <Backdrop onClose={cancel}>
      <Modal onClose={cancel}>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
              <ShieldAlert size={20} className="text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">Authorise transaction</h2>
            <p className="text-xs mt-1.5 leading-relaxed text-muted-foreground">
              {isPasskeyUser
                ? "Biometric unavailable — enter your backup PIN."
                : "Enter your 6-digit PIN to sign this transaction."}
            </p>
          </div>

          <div className="flex gap-1 mb-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`flex-1 h-0.5 rounded-full transition-all duration-100 ${i < pin.length ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>

          <div className="relative mb-4">
            <input
              ref={inputRef}
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
              onKeyDown={handleKey}
              placeholder="••••••"
              maxLength={6}
              className={`w-full px-3 py-2.5 rounded-xl text-center text-lg font-mono tracking-[0.4em] pr-10 bg-muted border text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all ${error ? "border-destructive" : "border-border"}`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPin(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:opacity-80 transition-opacity"
              tabIndex={-1}
            >
              {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && <p className="text-xs mb-3 text-center text-destructive">{error}</p>}

          <button
            onClick={submit}
            disabled={pin.length !== 6}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 mb-2 bg-primary text-primary-foreground"
          >
            Confirm
          </button>

          {isPasskeyUser && (
            <button
              onClick={() => { setMode("biometric"); triggerBiometric() }}
              className="w-full py-2 text-xs flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80 mb-1 text-primary opacity-60"
            >
              <Fingerprint size={13} /> Try biometric again
            </button>
          )}

          <button onClick={cancel} className="w-full py-2 text-xs text-muted-foreground opacity-30 hover:opacity-60 transition-opacity">
            Cancel
          </button>
        </div>
      </Modal>
    </Backdrop>,
    document.body,
  )
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="relative w-full max-w-[340px] rounded-2xl overflow-hidden bg-background border border-border shadow-2xl text-foreground">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  )
}