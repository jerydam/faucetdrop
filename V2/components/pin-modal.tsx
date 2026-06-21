"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Loader2, ShieldCheck, Eye, EyeOff, X, Fingerprint, ChevronDown, HelpCircle } from "lucide-react"
import { useWallet, API_BASE } from "@/components/wallet-provider"
import { toast } from "sonner"

export interface PinSetupModalProps {
  onDone?: () => void
  onSkip?: () => void
  required?: boolean
  open?: boolean
  onClose?: () => void
}

type Step =
  | "choose"
  | "pin-setup"
  | "passkey-setup"
  | "security-questions"   // NEW — shown after PIN or passkey is saved
  | "saving"
  | "saving-sq"            // saving security questions
  | "done"

// ─────────────────────────────────────────────────────────────────────────────
// Security question bank
// ─────────────────────────────────────────────────────────────────────────────

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your primary school?",
  "What was your childhood nickname?",
  "What street did you grow up on?",
  "What was the make of your first car?",
  "What is the name of your oldest sibling?",
  "What was the name of the first company you worked for?",
  "What is the middle name of your youngest child?",
  "What was your high school mascot?",
  "In what city did your parents meet?",
  "What is the name of your favourite childhood friend?",
  "What was the first concert you attended?",
  "What is your paternal grandfather's first name?",
  "What was the name of the road you lived on at age 10?",
  "What was the first album you owned?",
  "What is the name of your favourite sports team?",
  "What was the first foreign country you visited?",
  "What was the model of your first mobile phone?",
]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function QuestionSelect({
  value,
  onChange,
  usedQuestions,
  index,
}: {
  value: string
  onChange: (q: string) => void
  usedQuestions: string[]
  index: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const available = SECURITY_QUESTIONS.filter(q => q === value || !usedQuestions.includes(q))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs bg-muted border border-border text-left transition-all hover:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || `Select question ${index + 1}…`}
        </span>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-background border border-border shadow-xl">
          {available.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => { onChange(q); setOpen(false) }}
              className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${q === value ? "text-primary font-medium" : "text-foreground"}`}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

export function PinSetupModal({ onDone, onSkip, required = false, open: openProp, onClose }: PinSetupModalProps) {
  const { session, markPINSet } = useWallet()

  const [open,    setOpen]    = useState(false)
  const [mounted, setMounted] = useState(false)
  const [step,    setStep]    = useState<Step>("choose")
  const [pin,     setPin]     = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error,   setError]   = useState("")

  // Security questions state — 3 Q&A pairs
  const [sqItems, setSqItems] = useState([
    { question: "", answer: "" },
    { question: "", answer: "" },
    { question: "", answer: "" },
  ])
  const [sqError, setSqError] = useState("")

  const inputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setStep("choose")
    setPin(""); setConfirm(""); setError(""); setShowPin(false)
    setSqItems([{ question: "", answer: "" }, { question: "", answer: "" }, { question: "", answer: "" }])
    setSqError("")
  }

  useEffect(() => setMounted(true), [])

  const SKIP_KEY = `fd_pin_setup_skipped_${session?.address}`
  const SKIP_DURATION_MS = 24 * 60 * 60 * 1000

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

  useEffect(() => {
    if (openProp) { resetForm(); setOpen(true) }
  }, [openProp])

  useEffect(() => {
    if (open && step === "pin-setup") {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open, step])

  // ── Helpers ───────────────────────────────────────────────────────────
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6)
  const usedQuestions = sqItems.map(i => i.question).filter(Boolean)

  const updateSq = (idx: number, field: "question" | "answer", value: string) => {
    setSqItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
    setSqError("")
  }

  // ── Save security questions ───────────────────────────────────────────
  const handleSaveSecurityQuestions = async (skip = false) => {
    if (!skip) {
      for (const item of sqItems) {
        if (!item.question) { setSqError("Please select all three questions."); return }
        if (!item.answer.trim() || item.answer.trim().length < 2) {
          setSqError("Each answer must be at least 2 characters."); return
        }
      }
    }

    const token = session?.token
    if (!token) { setSqError("Session expired."); return }

    if (skip) {
      setStep("done")
      setTimeout(() => { setOpen(false); resetForm(); onDone?.(); onClose?.() }, 1400)
      return
    }

    setStep("saving-sq")
    try {
      const res = await fetch(`${API_BASE}/wallet/security-questions/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: sqItems.map(i => ({ question: i.question, answer: i.answer.trim() })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to save security questions")

      setStep("done")
      toast.success("Security questions saved — your wallet is fully protected.")
      setTimeout(() => { setOpen(false); resetForm(); onDone?.(); onClose?.() }, 1600)
    } catch (err: any) {
      setSqError(err.message || "Something went wrong. Try again.")
      setStep("security-questions")
    }
  }

  // ── PIN submission ────────────────────────────────────────────────────
  const handlePinSubmit = async () => {
    setError("")
    if (!/^\d{6}$/.test(pin))  { setError("PIN must be exactly 6 digits."); return }
    if (pin !== confirm)        { setError("PINs don't match — try again."); setConfirm(""); return }
    const token = session?.token
    if (!token)                 { setError("Session expired — please log in again."); return }

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
      toast.success("PIN set — now add recovery questions.")
      setStep("security-questions")   // ← go to SQ step, not done
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
          authenticatorSelection: { userVerification: "required", residentKey: "required" },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null

      if (!credential) throw new Error("No credential returned")

      const credId   = credential.id
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
      localStorage.setItem(`fd_passkey_cred_${session?.address}`, credId)

      markPINSet("passkey")
      toast.success("Biometric set — now add recovery questions.")
      setStep("security-questions")   // ← go to SQ step, not done
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

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div className="relative w-full max-w-[400px] rounded-2xl overflow-hidden bg-background border border-border shadow-2xl text-foreground">

        {!required && step !== "saving" && step !== "saving-sq" && step !== "done" && step !== "passkey-setup" && (
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="p-6">

          {/* ── Choose method ─────────────────────────────────────────── */}
          {step === "choose" && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
                  <ShieldCheck size={20} className="text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Secure your wallet</h2>
                <p className="text-xs mt-1.5 leading-relaxed text-muted-foreground">
                  Choose how you'll authorise transactions. A stolen session token
                  can't move funds without this.
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

          {/* ── Passkey waiting ───────────────────────────────────────── */}
          {step === "passkey-setup" && (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-muted border border-border">
                <Fingerprint size={28} className="text-primary" />
              </div>
              <p className="text-sm font-semibold mb-2">Follow your device prompt</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Use your fingerprint, face, or device PIN when prompted.
              </p>
              <Loader2 className="animate-spin mx-auto mt-6 text-muted-foreground" size={20} />
            </div>
          )}

          {/* ── PIN setup ─────────────────────────────────────────────── */}
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

          {/* ── Security questions ────────────────────────────────────── */}
          {step === "security-questions" && (
            <>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
                  <HelpCircle size={20} className="text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Recovery questions</h2>
                <p className="text-xs mt-1.5 leading-relaxed text-muted-foreground">
                  These let you change your PIN if you forget it, or prove ownership
                  when connecting a new device. Pick 3 questions and memorise your answers.
                </p>
              </div>

              <div className="space-y-4 mb-5 max-h-[340px] overflow-y-auto pr-0.5">
                {sqItems.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <QuestionSelect
                      value={item.question}
                      onChange={q => updateSq(idx, "question", q)}
                      usedQuestions={usedQuestions}
                      index={idx}
                    />
                    <input
                      type="text"
                      value={item.answer}
                      onChange={e => updateSq(idx, "answer", e.target.value)}
                      placeholder="Your answer…"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>

              {sqError && <p className="text-xs mb-3 text-destructive">{sqError}</p>}

              <button
                onClick={() => handleSaveSecurityQuestions(false)}
                disabled={sqItems.some(i => !i.question || !i.answer.trim())}
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 bg-primary text-primary-foreground mb-2"
              >
                Save recovery questions
              </button>

              <button
                onClick={() => handleSaveSecurityQuestions(true)}
                className="w-full py-2 text-xs text-muted-foreground opacity-30 hover:opacity-60 transition-opacity"
              >
                Skip for now
              </button>
            </>
          )}

          {/* ── Saving spinners ───────────────────────────────────────── */}
          {(step === "saving" || step === "saving-sq") && (
            <div className="text-center py-10">
              <Loader2 className="animate-spin mx-auto mb-4 text-muted-foreground" size={32} />
              <p className="text-sm">
                {step === "saving-sq" ? "Saving recovery questions…" : "Securing your wallet…"}
              </p>
            </div>
          )}

          {/* ── Done ─────────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
                <ShieldCheck size={22} className="text-green-600" />
              </div>
              <p className="text-base font-semibold mb-1">All set!</p>
              <p className="text-xs text-muted-foreground">
                Your wallet is protected. You'll be prompted before every transaction.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body,
  )
}