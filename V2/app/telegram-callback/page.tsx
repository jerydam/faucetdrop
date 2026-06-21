"use client"
import { useEffect, useRef, useState } from "react"

// ⚠️  Must match BotFather EXACTLY (no _bot suffix, exact capitalisation)
// ⚠️  Domain serving this page must be registered via BotFather → /setdomain
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "FaucetDrop_Bot"

export default function TelegramCallback() {
  const [status, setStatus] = useState<"waiting" | "done" | "error">("waiting")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(window as any).onTelegramAuth = (tgUser: Record<string, unknown>) => {
      setStatus("done")
      // Small delay so parent listener is definitely attached before message fires
      setTimeout(() => {
        window.opener?.postMessage({ type: "telegram_auth", user: tgUser }, "*")
        setTimeout(() => window.close(), 300)
      }, 200)
    }

    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute("data-telegram-login", BOT_USERNAME)
    script.setAttribute("data-size", "large")
    script.setAttribute("data-onauth", "onTelegramAuth(user)")
    script.setAttribute("data-request-access", "write")
    script.async = true
    script.onerror = () => setStatus("error")
    containerRef.current?.appendChild(script)

    return () => {
      if (containerRef.current?.contains(script)) containerRef.current.removeChild(script)
      delete (window as any).onTelegramAuth
    }
  }, [])

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#0f0f13", color: "white",
      fontFamily: "sans-serif", gap: 16, padding: 24,
    }}>
      {status === "waiting" && (
        <p style={{ fontSize: 13, opacity: 0.5, textAlign: "center", maxWidth: 280 }}>
          Tap the button below to sign in with Telegram.
          {/* If button doesn't appear, domain isn't registered with BotFather */}
        </p>
      )}
      <div ref={containerRef} />
      {status === "done" && <p style={{ color: "#4ade80" }}>✓ Signed in — closing…</p>}
      {status === "error" && (
        <div style={{ textAlign: "center", maxWidth: 300 }}>
          <p style={{ color: "#f87171", marginBottom: 8 }}>Widget failed to load.</p>
          <p style={{ fontSize: 12, opacity: 0.5 }}>
            Check: (1) bot username in code matches BotFather exactly,
            (2) this domain is registered via BotFather → /setdomain
          </p>
        </div>
      )}
    </div>
  )
}