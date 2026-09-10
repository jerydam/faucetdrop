"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { useWallet } from "@/components/wallet-provider"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallback() {
  const { connectSocial } = useWallet()
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    ;(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          console.error("[callback] no session:", error)
          router.replace("/?auth=failed")
          return
        }

        // ← read the provider we passed in the redirect URL, not app_metadata
        const provider = new URLSearchParams(window.location.search).get("provider")

        console.log("[callback] provider from URL:", provider)
        console.log("[callback] user id:", session.user.id)

        if (!provider) {
          console.error("[callback] no provider param in URL")
          router.replace("/?auth=failed")
          return
        }

        await connectSocial(provider as any, session.access_token, "supabase_token")
        router.replace("/")
      } catch (err: any) {
        console.error("[callback] error:", err)
        router.replace(err?.message === "cancelled" ? "/" : "/?auth=failed")
      }
    })()
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