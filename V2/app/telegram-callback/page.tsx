"use client"
import { useEffect, useRef, useState } from "react"

export default function TelegramCallback() {
  const [status, setStatus] = useState<"waiting" | "done" | "error">("waiting")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const botUsername = "FaucetDrops" // must match BotFather exactly

    ;(window as any).onTelegramAuth = (tgUser: Record<string, unknown>) => {
      setStatus("done")
      window.opener?.postMessage({ type: "telegram_auth", user: tgUser }, "*")
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

    // ✅ Append to the container div, not document.body
    containerRef.current?.appendChild(script)

    return () => {
      if (containerRef.current?.contains(script)) {
        containerRef.current.removeChild(script)
      }
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
      {/* ✅ This is where the widget button renders */}
      <div ref={containerRef} />
      {status === "done"  && <p style={{ color: "#4ade80" }}>✓ Signed in! Closing…</p>}
      {status === "error" && (
        <p style={{ color: "#f87171" }}>
          Failed to load Telegram widget — check bot username config
        </p>
      )}
    </div>
  )
}