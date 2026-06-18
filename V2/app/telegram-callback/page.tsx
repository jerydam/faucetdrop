"use client"
import { useEffect, useState } from "react"

export default function TelegramCallback() {
  const [status, setStatus] = useState<"waiting" | "done" | "error">("waiting")

  useEffect(() => {
    const botUsername = "Wallet Infra"
    if (!botUsername) {
      setStatus("error")
      console.error("bot username is not set")
      return
    }

    // ✅ Renamed parameter to avoid shorthand ambiguity
    ;(window as any).onTelegramAuth = (telegramUser: Record<string, unknown>) => {
      setStatus("done")
      window.opener?.postMessage(
        { type: "telegram_auth", user: telegramUser },
        "*",
      )
      setTimeout(() => window.close(), 500)
    }

    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute("data-telegram-login", botUsername)
    script.setAttribute("data-size", "large")
    script.setAttribute("data-onauth", "onTelegramAuth(user)")
    script.setAttribute("data-request-access", "write")
    script.async = true
    script.onerror = () => setStatus("error")
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) document.body.removeChild(script)
      delete (window as any).onTelegramAuth
    }
  }, [])

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#0f0f13", color: "white",
      fontFamily: "sans-serif", gap: 16,
    }}>
      {status === "waiting" && (
        <p style={{ fontSize: 14, opacity: 0.6 }}>
          Click the button below to sign in with Telegram
        </p>
      )}
      {status === "done"  && <p style={{ color: "#4ade80" }}>✓ Signed in! Closing…</p>}
      {status === "error" && (
        <p style={{ color: "#f87171" }}>
          Failed to load Telegram widget — check bot username config
        </p>
      )}
    </div>
  )
}