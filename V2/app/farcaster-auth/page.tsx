"use client"
import { useEffect, useState } from "react"

export default function FarcasterCallback() {
  const [status, setStatus]   = useState<"loading" | "qr" | "done" | "error">("loading")
  const [qrUrl,  setQrUrl]    = useState<string | null>(null)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [errMsg, setErrMsg]   = useState<string | null>(null)

  useEffect(() => {
    let poll: ReturnType<typeof setInterval>
    let timeout: ReturnType<typeof setTimeout>

    const init = async () => {
      try {
        const { createAppClient, viemConnector } = await import("@farcaster/auth-client")
        const appClient = createAppClient({
          relay:    "https://relay.farcaster.xyz",
          ethereum: viemConnector(),
        })

        const origin   = window.opener?.location?.origin ?? window.location.origin
        const hostname = window.opener?.location?.hostname ?? window.location.hostname
        const nonce    = crypto.randomUUID().replace(/-/g, "")

        const { data: channel, isError } = await appClient.createChannel({
          siweUri: origin,
          domain:  hostname,
          nonce,
        })

        if (isError || !channel?.channelToken) throw new Error("Failed to start channel")

        setQrUrl(channel.url)
        setDeepLink(channel.url)
        setStatus("qr")

        poll = setInterval(async () => {
          try {
            const { data: st, isError: pollErr } = await appClient.watchStatus({
              channelToken: channel.channelToken,
            })
            if (pollErr) return
            if (st?.state === "completed") {
              clearInterval(poll)
              clearTimeout(timeout)
              setStatus("done")
              window.opener?.postMessage(
                { type: "farcaster_auth", data: { fid: st.fid, username: st.username ?? "" } },
                "*",
              )
              setTimeout(() => window.close(), 600)
            }
          } catch { /* keep polling */ }
        }, 1500)

        timeout = setTimeout(() => {
          clearInterval(poll)
          setStatus("error")
          setErrMsg("Timed out — please try again")
        }, 180_000)
      } catch (err: any) {
        setStatus("error")
        setErrMsg(err?.message ?? "Failed to start Farcaster sign-in")
      }
    }

    init()
    return () => { clearInterval(poll); clearTimeout(timeout) }
  }, [])

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh",
      background: "#0f0f13", color: "#fff",
      fontFamily: "sans-serif", gap: 20, padding: 28, textAlign: "center",
    }}>
      {/* Logo / brand mark */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "#855DCD", display: "flex",
        alignItems: "center", justifyContent: "center", marginBottom: 4,
      }}>
        <svg viewBox="0 0 24 24" width={28} height={28} fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#855DCD"/>
          <path d="M6.5 7h11v2.2h-3.1V17h-2.2v-7.8H8.7V17H6.5V7z" fill="white"/>
        </svg>
      </div>

      {status === "loading" && (
        <>
          <div style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#855DCD", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 14, opacity: 0.6 }}>Setting up Farcaster sign-in…</p>
        </>
      )}

      {status === "qr" && qrUrl && (
        <>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Connect with Farcaster</p>
          <p style={{ fontSize: 13, opacity: 0.6, maxWidth: 280 }}>
            Scan this QR code with Warpcast to approve the connection
          </p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}&color=ffffff&bgcolor=0f0f13`}
            alt="Farcaster sign-in QR"
            style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}
          />
          {deepLink && (
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#855DCD", fontSize: 13, textDecoration: "underline" }}
            >
              Open in Warpcast instead
            </a>
          )}
          <p style={{ fontSize: 12, opacity: 0.35 }}>Waiting for approval…</p>
        </>
      )}

      {status === "done" && (
        <p style={{ color: "#4ade80", fontSize: 16, fontWeight: 600 }}>✓ Connected! Closing…</p>
      )}

      {status === "error" && (
        <>
          <p style={{ color: "#f87171", fontSize: 14 }}>{errMsg ?? "Something went wrong"}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent", color: "#fff", cursor: "pointer", fontSize: 13,
            }}
          >
            Try again
          </button>
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}