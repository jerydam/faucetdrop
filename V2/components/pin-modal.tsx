"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Loader2, ShieldCheck, Eye, EyeOff, X, Fingerprint } from "lucide-react"
import { useWallet, API_BASE } from "@/components/wallet-provider"
import { toast } from "sonner"

export interface PinSetupModalProps {
  onDone?: () => void
  onSkip?: () => void
  required?: boolean
  open?: boolean
  onClose?: () => void
}

type Step = "choose" | "pin-setup" | "passkey-setup" | "saving" | "done"

export function PinSetupModal({ onDone, onSkip, required = false, open: openProp, onClose }: PinSetupModalProps) {
  const { session, markPINSet } = useWallet()

  const [open,    setOpen]    = useState(false)
  const [mounted, setMounted] = useState(false)
  const [step,    setStep]    = useState<Step>("choose")
  const [pin,     setPin]     = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error,   setError]   = useState("")

  const inputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setStep("choose"); setPin(""); setConfirm(""); setError(""); setShowPin(false)
  }

  useEffect(() => setMounted(true), [])

  const SKIP_KEY = `fd_pin_setup_skipped_${session?.address}`
const SKIP_DURATION_MS = 24 * 60 * 60 * 1000 // 1 day

useEffect(() => {
  if (session?.walletType === "embedded" && session.hasPIN === false && !session.needsSeedImport) {
    const skippedAt = Number(localStorage.getItem(SKIP_KEY) || 0)
    if (Date.now() - skippedAt > SKIP_DURATION_MS) setOpen(true)
  }
}, [session?.walletType, session?.hasPIN, session?.needsSeedImport])

const dismiss = () => {
  if (required) return
  if (session?.address) localStorage.setItem(SKIP_KEY, String(Date.now()))
  setOpen(false); resetForm(); onSkip?.(); onClose?.()
}

  // External trigger from Profile Settings ("Set up" / "Change")
  useEffect(() => {
    if (openProp) { resetForm(); setOpen(true) }
  }, [openProp])

  // Auto-focus PIN input when entering PIN setup step
  useEffect(() => {
    if (open && step === "pin-setup") {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open, step])



  // ── PIN submission ────────────────────────────────────────────────────
  const handlePinSubmit = async () => {
    setError("")
    if (!/^\d{6}$/.test(pin)) { setError("PIN must be exactly 6 digits."); return }
    if (pin !== confirm)       { setError("PINs don't match — try again."); setConfirm(""); return }
    const token = session?.token
    if (!token)                { setError("Session expired — please log in again."); return }

    setStep("saving")
    try {
      const res  = await fetch(`${API_BASE}/wallet/set-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to set PIN")

      markPINSet("pin")
      setStep("done")
      toast.success("PIN set — you're all set to sign transactions.")
      setTimeout(() => { setOpen(false); resetForm(); onDone?.(); onClose?.() }, 1600)
    } catch (err: any) {
      setError(err.message || "Something went wrong. Try again.")
      setStep("pin-setup")
    }
  }

  // ── Passkey enrollment ────────────────────────────────────────────────
  const handlePasskeySetup = async () => {
    setError("")
    setStep("passkey-setup")
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: "FaucetDrops", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(session?.address ?? `user-${Date.now()}`),
            name: session?.address ?? `user-${Date.now()}`,
            displayName: "FaucetDrops Wallet",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          authenticatorSelection: {  userVerification: "required", residentKey: "required" },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null

      if (!credential) throw new Error("No credential returned")

      const credId = credential.id
      localStorage.setItem(`fd_passkey_cred_${session?.address}`, credId)

      // NOTE: this is a locally-generated convenience PIN, gated by a local
      // WebAuthn assertion — it is NOT verified by the backend as a passkey.
      // It is base64-encoded (NOT encrypted) below; security comes solely
      // from requiring a biometric prompt before localStorage is read.
      const silentPin =
        Array.from(crypto.getRandomValues(new Uint8Array(3))).map(b => b % 10).join("") +
        Array.from(crypto.getRandomValues(new Uint8Array(3))).map(b => b % 10).join("")

      const token = session?.token
      if (!token) throw new Error("Session expired")

      const res = await fetch(`${API_BASE}/wallet/set-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin: silentPin }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.detail ?? "Failed to register passkey")
      }

      const encoded = btoa(JSON.stringify({ pin: silentPin, credId, addr: session?.address }))
      localStorage.setItem(`fd_passkey_data_${session?.address}`, encoded)

      markPINSet("passkey")
      setStep("done")
      toast.success("Biometric authentication set up — your wallet is protected.")
      setTimeout(() => { setOpen(false); resetForm(); onDone?.(); onClose?.() }, 1600)
    } catch (err: any) {
      const msg = err?.message ?? ""
      if (msg.includes("cancel") || msg.includes("abort") || msg.includes("NotAllowedError")) {
        setError("Biometric setup was cancelled. Try again or use a PIN instead.")
      } else {
        setError(msg || "Biometric setup failed.")
      }
      setStep("choose")
    }
  }

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6)

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div className="relative w-full max-w-[380px] rounded-2xl overflow-hidden bg-background border border-border shadow-2xl text-foreground">

        {!required && step !== "saving" && step !== "done" && (
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="p-6">

          {step === "choose" && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
                  <ShieldCheck size={20} className="text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Secure your wallet</h2>
                <p className="text-xs mt-1.5 leading-relaxed text-muted-foreground">
                  Choose how you'll authorise transactions. This is separate from your
                  login — a stolen session can't move funds without it.
                </p>
              </div>

              {error && <p className="text-xs mb-4 text-center text-destructive">{error}</p>}

              <div className="flex flex-col gap-3 mb-5">
                <button
                  onClick={handlePasskeySetup}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] bg-primary/5 border-primary/25 hover:bg-primary/10"
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                    <Fingerprint className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Fingerprint / Face ID</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">Use your device biometric — fastest and most secure</p>
                  </div>
                </button>

                <button
                  onClick={() => setStep("pin-setup")}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] bg-muted/40 border-border hover:bg-muted/60"
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-muted">
                    <span className="text-lg font-mono font-bold text-muted-foreground">••••</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">6-digit PIN</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">Set a numeric PIN you'll enter before each transaction</p>
                  </div>
                </button>
              </div>

              {!required && (
                <button
                  onClick={dismiss}
                  className="w-full py-2 text-xs text-muted-foreground opacity-30 hover:opacity-60 transition-opacity"
                >
                  Set this up later
                </button>
              )}
            </>
          )}

          {step === "passkey-setup" && (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-muted border border-border">
                <Fingerprint size={28} className="text-primary" />
              </div>
              <p className="text-sm font-semibold mb-2">Follow your device prompt</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Use your fingerprint, face, or PIN when your device asks.
              </p>
              <Loader2 className="animate-spin mx-auto mt-6 text-muted-foreground" size={20} />
            </div>
          )}

          {step === "pin-setup" && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => { setStep("choose"); setError(""); setPin(""); setConfirm("") }}
                  className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-muted hover:bg-muted/70 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <div>
                  <h2 className="text-base font-semibold">Set a PIN</h2>
                  <p className="text-xs text-muted-foreground">6 digits, required before every transaction</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-[11px] mb-1.5 font-medium text-muted-foreground">Choose PIN</label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      value={pin}
                      onChange={e => { setPin(digits(e.target.value)); setError("") }}
                      onKeyDown={e => { if (e.key === "Enter" && pin.length === 6) document.getElementById("pin-confirm")?.focus() }}
                      placeholder="••••••"
                      maxLength={6}
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-mono tracking-widest pr-10 bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPin(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:opacity-80 transition-opacity" tabIndex={-1}>
                      {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={`flex-1 h-0.5 rounded-full transition-all duration-150 ${i < pin.length ? "bg-primary" : "bg-border"}`} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] mb-1.5 font-medium text-muted-foreground" htmlFor="pin-confirm">
                    Confirm PIN
                  </label>
                  <input
                    id="pin-confirm"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    value={confirm}
                    onChange={e => { setConfirm(digits(e.target.value)); setError("") }}
                    onKeyDown={e => { if (e.key === "Enter" && confirm.length === 6) handlePinSubmit() }}
                    placeholder="••••••"
                    maxLength={6}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm font-mono tracking-widest bg-muted border text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all ${error && confirm ? "border-destructive" : "border-border"}`}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && <p className="text-xs mb-4 text-destructive">{error}</p>}

              <button
                onClick={handlePinSubmit}
                disabled={pin.length !== 6 || confirm.length !== 6}
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 bg-primary text-primary-foreground"
              >
                Set PIN
              </button>
            </>
          )}

          {step === "saving" && (
            <div className="text-center py-10">
              <Loader2 className="animate-spin mx-auto mb-4 text-muted-foreground" size={32} />
              <p className="text-sm">Securing your wallet…</p>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
                <ShieldCheck size={22} className="text-green-600" />
              </div>
              <p className="text-base font-semibold mb-1">All set!</p>
              <p className="text-xs text-muted-foreground">
                Your wallet is now protected. You'll be prompted before every transaction.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body,
  )
}