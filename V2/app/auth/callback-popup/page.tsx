"use client"

import { useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

// PKCE flow client — matches the main callback page
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: "pkce",
    },
  }
)

export default function CallbackPopup() {
  useEffect(() => {
    ;(async () => {
      const code = new URLSearchParams(window.location.search).get("code")

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) {
          console.error("Popup code exchange failed:", error)
          window.close()
          return
        }
        window.opener?.postMessage(
          { type: "supabase_oauth_token", access_token: data.session.access_token },
          window.location.origin,
        )
        window.close()
        return
      }

      // Fallback: implicit-style hash tokens, if you ever get those
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        window.opener?.postMessage(
          { type: "supabase_oauth_token", access_token: session.access_token },
          window.location.origin,
        )
      }
      window.close()
    })()
  }, [])

  return <p style={{ padding: 24, fontFamily: "sans-serif" }}>Authenticating…</p>
}