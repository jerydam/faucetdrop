"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Loader2, ShieldCheck, Eye, EyeOff, X, ChevronDown, HelpCircle } from "lucide-react"
import { useWallet, API_BASE } from "@/components/wallet-provider"
import { toast } from "sonner"

export interface PinSetupModalProps {
  onDone?:  () => void
  onSkip?:  () => void
  required?: boolean
  open?:    boolean
  onClose?: () => void
  // When true, this modal is being opened to CHANGE an existing PIN.
  // It will first ask security questions (or current PIN), then allow
  // the user to set a new one.
  mode?: "setup" | "change"
}

type Step =
  | "pin-setup"
  | "security-questions"
  | "change-verify"        // verify identity before changing PIN
  | "change-verify-sq"     // answer security questions to change PIN
  | "saving"
  | "saving-sq"
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
              className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${
                q === value ? "text-primary font-medium" : "text-foreground"
              }`}
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

export function PinSetupModal({
  onDone,
  onSkip,
  required = false,
  open: openProp,
  onClose,
  mode = "setup",
}: PinSetupModalProps) {
  const { session, markPINSet } = useWallet()

  const [open,    setOpen]    = useState(false)
  const [mounted, setMounted] = useState(false)

  // ── Step starts as "pin-setup"; corrected in effects below ───────────
  const [step,    setStep]    = useState<Step>("pin-setup")
  const [pin,     setPin]     = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error,   setError]   = useState("")

  // For "change PIN" flow: current PIN verification
  const [currentPin,     setCurrentPin]     = useState("")
  const [showCurrentPin, setShowCurrentPin] = useState(false)
  const [currentPinErr,  setCurrentPinErr]  = useState("")

  // For "change PIN via security questions" flow
  const [sqAnswers,    setSqAnswers]    = useState<{ question: string; answer: string }[]>([])
  const [sqQuestions,  setSqQuestions]  = useState<string[]>([])
  const [sqAnswerErrs, setSqAnswerErrs] = useState("")
  const [loadingSq,    setLoadingSq]    = useState(false)
  const [resetGrant,   setResetGrant]   = useState<string | null>(null)

  // For setup: new security questions
  const [sqItems, setSqItems] = useState([
    { question: "", answer: "" },
    { question: "", answer: "" },
    { question: "", answer: "" },
  ])
  const [sqError, setSqError] = useState("")
  const modeRef = useRef(mode)
  useEffect(() => { modeRef.current = mode }, [mode])

  const inputRef      = useRef<HTMLInputElement>(null)
  const confirmRef    = useRef<HTMLInputElement>(null)
  const currentPinRef = useRef<HTMLInputElement>(null)

  // ── resetForm reads current mode explicitly so the correct initial
  //    step is always used regardless of stale closure values ───────────
  const resetForm = (currentMode: "setup" | "change" = modeRef.current) => {
    const initialStep = currentMode === "change" ? "change-verify" : "pin-setup"
    setStep(initialStep)
    setPin(""); setConfirm(""); setError(""); setShowPin(false)
    setCurrentPin(""); setShowCurrentPin(false); setCurrentPinErr("")
    setSqAnswers([]); setSqAnswerErrs(""); setResetGrant(null)
    setSqItems([{ question: "", answer: "" }, { question: "", answer: "" }, { question: "", answer: "" }])
    setSqError("")
  }

  useEffect(() => setMounted(true), [])

  const SKIP_KEY         = `fd_pin_setup_skipped_${session?.address}`
  const SKIP_DURATION_MS = 24 * 60 * 60 * 1000

  // ── Auto-show for embedded wallets that haven't set a PIN ────────────
  useEffect(() => {
    if (mode === "change") return
    if (session?.walletType === "embedded" && session.hasPIN === false && !session.needsSeedImport) {
      const skippedAt = Number(localStorage.getItem(SKIP_KEY) || 0)
      if (Date.now() - skippedAt > SKIP_DURATION_MS) setOpen(true)
    }
  }, [session?.walletType, session?.hasPIN, session?.needsSeedImport])

  // ── Open/reset when openProp fires — pass current mode explicitly ─────
  // Add this right after the mode prop is destructured
useEffect(() => { modeRef.current = mode }, [mode])

// Replace the openProp effect
useEffect(() => {
  if (openProp) {
    const currentMode = modeRef.current  // always fresh
    resetForm(currentMode)
    setOpen(true)
  }
}, [openProp])

// Replace the mode-sync effect
useEffect(() => {
  if (open) {
    setStep(modeRef.current === "change" ? "change-verify" : "pin-setup")
  }
}, [mode, open])

  // ── Focus management ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    if (step === "pin-setup")     setTimeout(() => inputRef.current?.focus(), 80)
    if (step === "change-verify") setTimeout(() => currentPinRef.current?.focus(), 80)
  }, [open, step])

  // ── Load security questions when entering the SQ-verify step ─────────
  useEffect(() => {
    if (step !== "change-verify-sq" || !session?.token) return
    setLoadingSq(true)
    fetch(`${API_BASE}/wallet/security-questions`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.has_security_questions && data.questions?.length) {
          setSqQuestions(data.questions)
          setSqAnswers(data.questions.map((q: string) => ({ question: q, answer: "" })))
        } else {
          setSqAnswerErrs("No security questions set up. You cannot change your PIN this way.")
        }
      })
      .catch(() => setSqAnswerErrs("Failed to load security questions."))
      .finally(() => setLoadingSq(false))
  }, [step, session?.token])

  // ── Helpers ───────────────────────────────────────────────────────────
  const digits       = (v: string) => v.replace(/\D/g, "").slice(0, 6)
  const usedQuestions = sqItems.map(i => i.question).filter(Boolean)

  const updateSq = (idx: number, field: "question" | "answer", value: string) => {
    setSqItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
    setSqError("")
  }

  const updateAnswer = (idx: number, value: string) => {
    setSqAnswers(prev => prev.map((item, i) => i === idx ? { ...item, answer: value } : item))
    setSqAnswerErrs("")
  }

  // ── Change PIN: verify current PIN ────────────────────────────────────
  const handleVerifyCurrentPin = async () => {
    setCurrentPinErr("")
    if (!/^\d{6}$/.test(currentPin)) { setCurrentPinErr("PIN must be 6 digits"); return }

    const token = session?.token
    if (!token) { setCurrentPinErr("Session expired."); return }

    setStep("saving")
    try {
      const res  = await fetch(`${API_BASE}/wallet/verify-pin`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ pin: currentPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCurrentPinErr(data.detail ?? "Incorrect PIN")
        setStep("change-verify")
        return
      }
      // Current PIN verified — proceed to set new PIN
      setStep("pin-setup")
    } catch {
      setCurrentPinErr("Something went wrong. Try again.")
      setStep("change-verify")
    }
  }

  // ── Change PIN: verify security questions ─────────────────────────────
  const handleVerifySecurityAnswers = async () => {
    setSqAnswerErrs("")
    if (sqAnswers.some(a => !a.answer.trim())) {
      setSqAnswerErrs("Please answer all questions."); return
    }
    const token = session?.token
    if (!token) { setSqAnswerErrs("Session expired."); return }

    setStep("saving")
    try {
      const res  = await fetch(`${API_BASE}/wallet/security-questions/verify`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ answers: sqAnswers }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSqAnswerErrs(data.detail ?? "One or more answers are incorrect")
        setStep("change-verify-sq")
        return
      }
      setResetGrant(data.reset_grant)
      setStep("pin-setup")
    } catch {
      setSqAnswerErrs("Something went wrong. Try again.")
      setStep("change-verify-sq")
    }
  }

  // ── Save security questions (after PIN setup) ─────────────────────────
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
      setTimeout(() => { setOpen(false); resetForm(mode); onDone?.(); onClose?.() }, 1400)
      return
    }

    setStep("saving-sq")
    try {
      const res  = await fetch(`${API_BASE}/wallet/security-questions/set`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          items: sqItems.map(i => ({ question: i.question, answer: i.answer.trim() })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to save security questions")

      setStep("done")
      toast.success("Security questions saved — your wallet is fully protected.")
      setTimeout(() => { setOpen(false); resetForm(mode); onDone?.(); onClose?.() }, 1600)
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
      const body: Record<string, string> = { pin }
      // If we have a reset_grant (came via security questions), pass it
      if (resetGrant) body.reset_grant = resetGrant
      // If change mode and current PIN was verified, pass it
      if (mode === "change" && currentPin && !resetGrant) body.current_pin = currentPin

      const res  = await fetch(`${API_BASE}/wallet/set-pin`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to set PIN")

      markPINSet("pin")

      if (mode === "change") {
        // Change flow is done — no need to set up security questions again
        setStep("done")
        toast.success("PIN changed successfully.")
        setTimeout(() => { setOpen(false); resetForm(mode); onDone?.(); onClose?.() }, 1600)
      } else {
        toast.success("PIN set — now add recovery questions.")
        setStep("security-questions")
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Try again.")
      setStep("pin-setup")
    }
  }

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div className="relative w-full max-w-[400px] rounded-2xl overflow-hidden bg-background border border-border shadow-2xl text-foreground">

        {!required &&
          step !== "saving" && step !== "saving-sq" && step !== "done" && (
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="p-6">

          {/* ── Step: verify current PIN (change mode) ────────────────── */}
          {step === "change-verify" && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
                  <ShieldCheck size={20} className="text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Change PIN</h2>
                <p className="text-xs mt-1.5 leading-relaxed text-muted-foreground">
                  Enter your current PIN to continue, or use your security questions if you've forgotten it.
                </p>
              </div>

              <div className="relative mb-4">
                <input
                  ref={currentPinRef}
                  type={showCurrentPin ? "text" : "password"}
                  inputMode="numeric"
                  value={currentPin}
                  onChange={e => { setCurrentPin(digits(e.target.value)); setCurrentPinErr("") }}
                  onKeyDown={e => { if (e.key === "Enter" && currentPin.length === 6) handleVerifyCurrentPin() }}
                  placeholder="Current PIN"
                  maxLength={6}
                  className={`w-full px-3 py-2.5 rounded-xl text-center text-lg font-mono tracking-[0.4em] pr-10 bg-muted border text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all ${
                    currentPinErr ? "border-destructive" : "border-border"
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:opacity-80 transition-opacity"
                  tabIndex={-1}
                >
                  {showCurrentPin ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {currentPinErr && <p className="text-xs mb-3 text-center text-destructive">{currentPinErr}</p>}

              <button
                onClick={handleVerifyCurrentPin}
                disabled={currentPin.length !== 6}
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 bg-primary text-primary-foreground mb-3"
              >
                Continue
              </button>

              <button
                onClick={() => setStep("change-verify-sq")}
                className="w-full py-2 text-xs text-muted-foreground opacity-50 hover:opacity-80 transition-opacity"
              >
                Forgot PIN? Use security questions
              </button>
            </>
          )}

          {/* ── Step: answer security questions (change mode fallback) ── */}
          {step === "change-verify-sq" && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setStep("change-verify")}
                  className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-muted hover:bg-muted/70 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <div>
                  <h2 className="text-base font-semibold">Security questions</h2>
                  <p className="text-xs text-muted-foreground">Answer correctly to reset your PIN</p>
                </div>
              </div>

              {loadingSq ? (
                <div className="py-8 text-center">
                  <Loader2 className="animate-spin mx-auto mb-2 text-muted-foreground" size={24} />
                  <p className="text-xs text-muted-foreground">Loading questions…</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-5 max-h-[300px] overflow-y-auto pr-0.5">
                    {sqAnswers.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground px-1">{item.question}</p>
                        <input
                          type="text"
                          value={item.answer}
                          onChange={e => updateAnswer(idx, e.target.value)}
                          placeholder="Your answer…"
                          className="w-full px-3 py-2 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>

                  {sqAnswerErrs && <p className="text-xs mb-3 text-destructive">{sqAnswerErrs}</p>}

                  <button
                    onClick={handleVerifySecurityAnswers}
                    disabled={sqAnswers.some(a => !a.answer.trim())}
                    className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 bg-primary text-primary-foreground"
                  >
                    Verify answers
                  </button>
                </>
              )}
            </>
          )}

          {/* ── Step: set new PIN ─────────────────────────────────────── */}
          {step === "pin-setup" && (
            <>
              <div className="flex items-center gap-3 mb-5">
                {mode === "change" && (
                  <button
                    onClick={() => setStep("change-verify")}
                    className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-muted hover:bg-muted/70 transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
                <div>
                  <h2 className="text-base font-semibold">
                    {mode === "change" ? "New PIN" : "Set a PIN"}
                  </h2>
                  <p className="text-xs text-muted-foreground">6 digits, required before every transaction</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-[11px] mb-1.5 font-medium text-muted-foreground">
                    {mode === "change" ? "New PIN" : "Choose PIN"}
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      value={pin}
                      onChange={e => { setPin(digits(e.target.value)); setError("") }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && pin.length === 6) confirmRef.current?.focus()
                      }}
                      placeholder="••••••"
                      maxLength={6}
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-mono tracking-widest pr-10 bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                      autoComplete="new-password"
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
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-0.5 rounded-full transition-all duration-150 ${
                          i < pin.length ? "bg-primary" : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] mb-1.5 font-medium text-muted-foreground">
                    Confirm PIN
                  </label>
                  <input
                    ref={confirmRef}
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    value={confirm}
                    onChange={e => { setConfirm(digits(e.target.value)); setError("") }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && confirm.length === 6) handlePinSubmit()
                    }}
                    placeholder="••••••"
                    maxLength={6}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm font-mono tracking-widest bg-muted border text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all ${
                      error && confirm ? "border-destructive" : "border-border"
                    }`}
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
                {mode === "change" ? "Set new PIN" : "Set PIN"}
              </button>
            </>
          )}

          {/* ── Step: security questions (setup only) ─────────────────── */}
          {step === "security-questions" && (
            <>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
                  <HelpCircle size={20} className="text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Recovery questions</h2>
                <p className="text-xs mt-1.5 leading-relaxed text-muted-foreground">
                  These let you change your PIN if you forget it. Pick 3 questions and memorise your answers.
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
              <p className="text-base font-semibold mb-1">
                {mode === "change" ? "PIN changed!" : "All set!"}
              </p>
              <p className="text-xs text-muted-foreground">
                {mode === "change"
                  ? "Your new PIN is active."
                  : "Your wallet is protected. You'll be prompted before every transaction."}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body,
  )
}
