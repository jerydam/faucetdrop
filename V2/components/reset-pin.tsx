"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Loader2, ShieldCheck, X } from "lucide-react"
import { useWallet, API_BASE } from "@/components/wallet-provider"
import { toast } from "sonner"

interface ResetPinModalProps {
  open?: boolean
  onClose?: () => void
  onSuccess?: () => void // called after PIN is cleared, so parent can open set-pin modal
}

export function ResetPinModal({ open: openProp, onClose, onSuccess }: ResetPinModalProps) {
  const { session, markPINSet } = useWallet()

  const [open,    setOpen]    = useState(false)
  const [mounted, setMounted] = useState(false)

  type Step = "questions" | "loading" | "done"
  const [step,       setStep]       = useState<Step>("questions")
  const [sqAnswers,  setSqAnswers]  = useState<{ question: string; answer: string }[]>([])
  const [sqError,    setSqError]    = useState("")
  const [loadingSq,  setLoadingSq]  = useState(false)

  useEffect(() => setMounted(true), [])

  const prevOpenProp = useRef<boolean | undefined>(undefined)

  useEffect(() => {
    if (openProp && prevOpenProp.current !== true) {
      setStep("questions")
      setSqAnswers([])
      setSqError("")
      setOpen(true)
      // Load questions
      if (session?.token) {
        setLoadingSq(true)
        fetch(`${API_BASE}/wallet/security-questions`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })
          .then(r => r.json())
          .then(data => {
            if (data.has_security_questions && data.questions?.length) {
              setSqAnswers(data.questions.map((q: string) => ({ question: q, answer: "" })))
            } else {
              setSqError("No security questions set. Please contact support.")
            }
          })
          .catch(() => setSqError("Failed to load security questions."))
          .finally(() => setLoadingSq(false))
      }
    }
    if (!openProp && prevOpenProp.current === true) {
      setOpen(false)
    }
    prevOpenProp.current = openProp
  }, [openProp, session?.token])

  const updateAnswer = (idx: number, value: string) => {
    setSqAnswers(prev => prev.map((item, i) => i === idx ? { ...item, answer: value } : item))
    setSqError("")
  }

  const handleVerify = async () => {
    if (sqAnswers.some(a => !a.answer.trim())) {
      setSqError("Please answer all questions.")
      return
    }
    const token = session?.token
    if (!token) { setSqError("Session expired."); return }

    setStep("loading")
    try {
      // Step 1: verify answers → get reset_grant
      const verifyRes = await fetch(`${API_BASE}/wallet/security-questions/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: sqAnswers }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) {
        setSqError(verifyData.detail ?? "One or more answers are incorrect")
        setStep("questions")
        return
      }

      // Step 2: clear the PIN using the grant
      const clearRes = await fetch(`${API_BASE}/wallet/reset-pin-clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reset_grant: verifyData.reset_grant }),
      })
      const clearData = await clearRes.json()
      if (!clearRes.ok) {
        setSqError(clearData.detail ?? "Failed to reset PIN")
        setStep("questions")
        return
      }

      // Mark PIN as unset in local session so auto-show triggers
      markPINSet(null)
      setStep("done")
      toast.success("PIN reset — please set a new one.")
      setTimeout(() => {
        setOpen(false)
        onClose?.()
        onSuccess?.()
      }, 1200)
    } catch {
      setSqError("Something went wrong. Try again.")
      setStep("questions")
    }
  }

  const dismiss = () => { setOpen(false); onClose?.() }

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div className="relative w-full max-w-[400px] rounded-2xl overflow-hidden bg-background border border-border shadow-2xl text-foreground">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {step === "questions" && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
                  <ShieldCheck size={20} className="text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Reset PIN</h2>
                <p className="text-xs mt-1.5 leading-relaxed text-muted-foreground">
                  Answer your security questions to clear your PIN, then set a new one.
                </p>
              </div>

              {loadingSq ? (
                <div className="py-8 text-center">
                  <Loader2 className="animate-spin mx-auto mb-2 text-muted-foreground" size={24} />
                  <p className="text-xs text-muted-foreground">Loading questions…</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {sqAnswers.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground px-1">{item.question}</p>
                        <input
                          type="text"
                          value={item.answer}
                          onChange={e => updateAnswer(idx, e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && idx === sqAnswers.length - 1) handleVerify() }}
                          placeholder="Your answer…"
                          className="w-full px-3 py-2 rounded-xl text-xs bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>

                  {sqError && <p className="text-xs mb-3 text-destructive">{sqError}</p>}

                  <button
                    onClick={handleVerify}
                    disabled={sqAnswers.some(a => !a.answer.trim()) || loadingSq}
                    className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 bg-primary text-primary-foreground"
                  >
                    Verify & Reset PIN
                  </button>
                </>
              )}
            </>
          )}

          {step === "loading" && (
            <div className="text-center py-10">
              <Loader2 className="animate-spin mx-auto mb-4 text-muted-foreground" size={32} />
              <p className="text-sm">Verifying answers…</p>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-muted border border-border">
                <ShieldCheck size={22} className="text-green-600" />
              </div>
              <p className="text-base font-semibold mb-1">PIN cleared!</p>
              <p className="text-xs text-muted-foreground">Setting up your new PIN now…</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}