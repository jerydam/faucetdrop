// app/auth/callback-popup/page.tsx
"use client"

import { useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { flowType: "pkce" } }
)

export default function CallbackPopup() {
  useEffect(() => {
    ;(async () => {
      try {
        const code = new URLSearchParams(window.location.search).get("code")
        if (!code) { window.close(); return }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) { window.close(); return }

        window.opener?.postMessage(
          { type: "supabase_oauth_token", access_token: data.session.access_token },
          window.location.origin,
        )
      } catch { /* ignore */ }
      window.close()
    })()
  }, [])

  return <p style={{ padding: 24, fontFamily: "sans-serif" }}>Authenticating…</p>
}