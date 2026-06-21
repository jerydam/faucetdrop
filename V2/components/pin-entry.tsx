"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ShieldAlert, X, Eye, EyeOff, Loader2, Fingerprint, Settings } from "lucide-react"
import { useWallet, API_BASE } from "@/components/wallet-provider"

// ─────────────────────────────────────────────────────────────────────────────
// Imperative API
//
// Usage:
//   import { openPinEntryModal } from "@/components/pin-entry"
//   const pin = await new Promise<string>((res, rej) => openPinEntryModal(res, rej))
// ─────────────────────────────────────────────────────────────────────────────

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

async function assertPasskey(credId: string): Promise<boolean> {
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge:        crypto.getRandomValues(new Uint8Array(32)),
        timeout:          60000,
        userVerification: "required",
        allowCredentials: [{
          id:   Uint8Array.from(atob(credId.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0)),
          type: "public-key",
        }],
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

export function PinEntryModal() {
  const { session } = useWallet()

  const [open,          setOpen]          = useState(false)
  const [pin,           setPin]           = useState("")
  const [showPin,       setShowPin]       = useState(false)
  const [error,         setError]         = useState("")
  const [mounted,       setMounted]       = useState(false)
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [mode,          setMode]          = useState<"auto" | "pin">("auto")

  const inputRef = useRef<HTMLInputElement>(null)

  const isPasskeyUser = session?.pinMethod === "passkey"
  const hasPIN        = session?.hasPIN === true
  const address       = session?.address

  useEffect(() => {
    _setOpen = setOpen
    return () => { _setOpen = null }
  }, [])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    setPin("")
    setError("")
    setMode("auto")

    if (isPasskeyUser && address) {
      triggerBiometric()
    } else {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  const triggerBiometric = async () => {
    if (!address) return
    setBiometricBusy(true)
    setError("")
    try {
      const data = await getPasskeyData(address)
      if (!data) {
        setMode("pin")
        setTimeout(() => inputRef.current?.focus(), 80)
        return
      }

      const verified = await assertPasskey(data.credId)
      if (!verified) {
        setError("Biometric not recognised. Try again or use PIN.")
        setBiometricBusy(false)
        return
      }

      const resolve = _resolve
      _resolve = null
      _reject  = null
      setOpen(false)
      resolve?.(data.pin)
    } catch (err: any) {
      const msg = err?.message ?? ""
      if (msg.includes("cancel") || msg.includes("abort") || msg.includes("NotAllowedError")) {
        setMode("pin")
        setError("")
        setTimeout(() => inputRef.current?.focus(), 80)
      } else {
        setError("Biometric failed. Enter your PIN instead.")
        setMode("pin")
      }
      setBiometricBusy(false)
    }
  }

  const submit = () => {
    if (!/^\d{6}$/.test(pin)) { setError("PIN must be 6 digits"); return }
    const resolve = _resolve
    _resolve = null
    _reject  = null
    setOpen(false)
    resolve?.(pin)
  }

  const cancel = () => {
    const reject = _reject
    _resolve = null
    _reject  = null
    setBiometricBusy(false)
    setOpen(false)
    reject?.(new Error("cancelled"))
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length === 6) submit()
    if (e.key === "Escape") cancel()
  }

  if (!open || !mounted) return null

  // ── No PIN set yet ─────────────────────────────────────────────────────
  if (!hasPIN) {
    return createPortal(
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={e => { if (e.target === e.currentTarget) cancel() }}>
        <div className="relative w-full max-w-[340px] rounded-2xl overflow-hidden bg-background border border-border shadow-2xl text-foreground">
          <button onClick={cancel}
            className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-muted border border-border">
              <ShieldAlert size={20} className="text-amber-500" />
            </div>
            <h2 className="text-base font-semibold mb-2">Transaction PIN not set</h2>
            <p className="text-xs leading-relaxed mb-5 text-muted-foreground">
              You need to set a transaction PIN or biometric before you can sign transactions.
            </p>
            <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl text-left mb-4 bg-muted/40 border border-border">
              <Settings className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Go to <span className="font-semibold text-foreground">Profile → Security</span> to set up your transaction PIN or fingerprint.
              </p>
            </div>
            <button onClick={cancel}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 bg-primary text-primary-foreground">
              Got it
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  // ── Biometric waiting screen ───────────────────────────────────────────
  if (isPasskeyUser && mode === "auto" && !error) {
    return createPortal(
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={e => { if (e.target === e.currentTarget) cancel() }}>
        <div className="relative w-full max-w-[340px] rounded-2xl overflow-hidden bg-background border border-border shadow-2xl text-foreground">
          <button onClick={cancel}
            className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
          <div className="p-6 text-center py-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-muted border border-border">
              {biometricBusy
                ? <Loader2 size={28} className="animate-spin text-primary" />
                : <Fingerprint size={28} className="text-primary" />}
            </div>
            <p className="text-sm font-semibold mb-2">Authorise transaction</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {biometricBusy ? "Waiting for biometric…" : "Touch the sensor or use Face ID to confirm."}
            </p>
            <button
              onClick={triggerBiometric}
              disabled={biometricBusy}
              className="mt-6 text-xs text-primary transition-opacity hover:opacity-80 disabled:opacity-30">
              {biometricBusy ? "Waiting…" : "Try again"}
            </button>
            <button
              onClick={() => { setMode("pin"); setTimeout(() => inputRef.current?.focus(), 80) }}
              className="block w-full mt-2 text-xs text-muted-foreground opacity-30 hover:opacity-60 transition-opacity">
              Use PIN instead
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  // ── PIN entry (default or fallback from biometric) ─────────────────────
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) cancel() }}>
      <div className="relative w-full max-w-[340px] rounded-2xl overflow-hidden bg-background border border-border shadow-2xl text-foreground">
        <button onClick={cancel}
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors">
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
              <ShieldAlert size={20} className="text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">Authorise transaction</h2>
            <p className="text-xs mt-1.5 leading-relaxed text-muted-foreground">
              {isPasskeyUser
                ? "Biometric unavailable on this device — enter your backup PIN."
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
            <button type="button" onClick={() => setShowPin(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:opacity-80 transition-opacity" tabIndex={-1}>
              {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && <p className="text-xs mb-3 text-center text-destructive">{error}</p>}

          <button onClick={submit} disabled={pin.length !== 6}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 mb-2 bg-primary text-primary-foreground">
            Confirm
          </button>

          {isPasskeyUser && (
            <button onClick={triggerBiometric} disabled={biometricBusy}
              className={`w-full py-2 text-xs flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80 mb-1 text-primary ${biometricBusy ? "opacity-40" : ""}`}>
              <Fingerprint size={13} />
              {biometricBusy ? "Waiting for biometric…" : "Try biometric again"}
            </button>
          )}

          <button onClick={cancel}
            className="w-full py-2 text-xs text-muted-foreground opacity-30 hover:opacity-60 transition-opacity">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}