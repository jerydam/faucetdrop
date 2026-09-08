// app/auth/callback/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { useWallet } from "@/components/wallet-provider"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: "pkce",
    },
  }
)

const PROVIDER_MAP: Record<string, string> = {
  google:  "google",
  twitter: "twitter",
  github:  "github",
  discord: "discord",
}

export default function AuthCallback() {
  const { connectSocial } = useWallet()
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      try {
        // Extract the code from the URL
        const code = new URLSearchParams(window.location.search).get("code")

        if (!code) {
          // No code = possibly a hash-based session (PKCE implicit fallback)
          // Try getSession directly as a last resort
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            router.replace("/?auth=failed")
            return
          }
          await finishLogin(session)
          return
        }

        // Exchange the code for a session — this is the required step
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error || !data.session) {
          console.error("Code exchange failed:", error)
          router.replace("/?auth=failed")
          return
        }

        await finishLogin(data.session)
      } catch (err) {
        console.error("Auth callback error:", err)
        router.replace("/?auth=failed")
      }
    })()

    async function finishLogin(session: any) {
      const provider = session.user?.app_metadata?.provider as string | undefined
      if (!provider) {
        router.replace("/?auth=failed")
        return
      }

      const mapped = PROVIDER_MAP[provider] ?? provider

      try {
        await connectSocial(mapped as any, session.access_token, "supabase_token")
        router.replace("/")
      } catch (err) {
        console.error("connectSocial failed:", err)
        router.replace("/?auth=failed")
      }
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-muted-foreground text-sm">Signing you in…</p>
      </div>
    </div>
  )
}