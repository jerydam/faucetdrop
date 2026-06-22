"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ShieldAlert, X, Eye, EyeOff, ShieldOff } from "lucide-react"
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

export function PinEntryModal() {
  const { session } = useWallet()

  const [open,    setOpen]    = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pin,     setPin]     = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error,   setError]   = useState("")

  const inputRef = useRef<HTMLInputElement>(null)
  const hasPin = session?.hasPIN !== false   // treat undefined as "has PIN" to avoid flash

  useEffect(() => { _setOpen = setOpen; return () => { _setOpen = null } }, [])
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) { setPin(""); setError(""); return }
    setPin(""); setError("")
    if (hasPin) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  const resolveWith = (resolvedPin: string) => {
    const resolve = _resolve
    _resolve = null; _reject = null
    setOpen(false)
    resolve?.(resolvedPin)
  }

  const cancel = () => {
    const reject = _reject
    _resolve = null; _reject = null
    setOpen(false)
    reject?.(new Error("cancelled"))
  }

  const submit = () => {
    if (!/^\d{6}$/.test(pin)) { setError("PIN must be 6 digits"); return }
    resolveWith(pin)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length === 6) submit()
    if (e.key === "Escape") cancel()
  }

  if (!open || !mounted) return null

  // ── User has no PIN yet — show setup nudge instead of PIN input ───────
  if (!hasPin) {
    return createPortal(
      <Backdrop onClose={cancel}>
        <Modal onClose={cancel}>
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-amber-500/10 border border-amber-500/30">
              <ShieldOff size={20} className="text-amber-500" />
            </div>
            <h2 className="text-base font-semibold mb-1.5">No PIN set</h2>
            <p className="text-xs leading-relaxed text-muted-foreground mb-5">
              You need a transaction PIN before you can sign anything.
              Set one up in <span className="font-medium text-foreground">Profile → Security</span>.
            </p>
            <button
              onClick={cancel}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Got it
            </button>
          </div>
        </Modal>
      </Backdrop>,
      document.body,
    )
  }

  // ── Normal PIN entry ──────────────────────────────────────────────────
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
              Enter your 6-digit PIN to sign this transaction.
            </p>
          </div>

          <div className="flex gap-1 mb-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-0.5 rounded-full transition-all duration-100 ${
                  i < pin.length ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>

          <div className="relative mb-4">
            <input
              ref={inputRef}
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                setError("")
              }}
              onKeyDown={handleKey}
              placeholder="••••••"
              maxLength={6}
              className={`w-full px-3 py-2.5 rounded-xl text-center text-lg font-mono tracking-[0.4em] pr-10 bg-muted border text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all ${
                error ? "border-destructive" : "border-border"
              }`}
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

          <button
            onClick={cancel}
            className="w-full py-2 text-xs text-muted-foreground opacity-30 hover:opacity-60 transition-opacity"
          >
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



