"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { useWallet } from "@/components/wallet-provider"
import { toast } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallback() {
const { connectSocial, linkSocial } = useWallet()
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    ;(async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) { router.replace("/?auth=failed"); return }

    const params   = new URLSearchParams(window.location.search)
    const provider = params.get("provider")
    const mode     = params.get("mode")

    if (!provider) { router.replace("/?auth=failed"); return }

    if (mode === "link") {
  // After linkIdentity redirect, session.provider_token contains the 
  // linked provider's token — use that to inform your backend
  const providerToken = session.provider_token ?? session.access_token
  await linkSocial(provider as any, session.access_token)
  
  // Show success toast on return
  router.replace(`/?linked=${provider}`)
} else {
  await connectSocial(provider as any, session.access_token, "supabase_token")
  router.replace("/")
}
  } catch (err: any) {
    router.replace(err?.message === "cancelled" ? "/" : "/?auth=failed")
  }
})()
  }, [])
useEffect(() => {
  const linked = new URLSearchParams(window.location.search).get("linked")
  if (linked) {
    toast.success(`${linked} connected!`)
    router.replace(window.location.pathname)  // clean the URL
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