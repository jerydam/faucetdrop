"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { useWallet } from "@/components/wallet-provider"
import { toast } from "sonner"
import { DEFAULT_CHAIN_ID } from "@/config/chain"
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const WALLET_API = "https://thoughtful-carmencita-faucetdrops-02a54589.koyeb.app"

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
        if (error || !session) { router.replace("/?auth=failed"); return }

        const params   = new URLSearchParams(window.location.search)
        const provider = params.get("provider")
        const mode     = params.get("mode")

        if (!provider) { router.replace("/?auth=failed"); return }

        if (mode === "link") {
  const walletToken = localStorage.getItem("pending_link_wallet_token")
  localStorage.removeItem("pending_link_wallet_token")
  localStorage.removeItem("pending_link_provider")

  if (!walletToken) {
    // Genuine fallback — no token survived the redirect
    toast.error("Link session expired — logged in instead")
    await connectSocial(provider as any, session.access_token, "supabase_token")
    router.replace("/")
    return
  }

  const res = await fetch(`${WALLET_API}/wallet/link-social`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${walletToken}`,
    },
    body: JSON.stringify({
      provider,
      supabase_token: session.access_token,
    }),
  })

  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.detail || "Failed to link account")
  }

  // Restore the original wallet session — the OAuth redirect may have
  // overwritten it with a new Supabase session for the linked provider
  // but we want the user to stay on their original wallet
  const originalSession = localStorage.getItem("wallet_session")
  if (!originalSession) {
    // Session was wiped by the redirect — re-fetch from backend and restore
    const meRes = await fetch(`${WALLET_API}/wallet/me`, {
      headers: { Authorization: `Bearer ${walletToken}` },
    })
    if (meRes.ok) {
      const me = await meRes.json()
      // Rebuild a minimal session so the user isn't logged out
      const restoredSession = {
        address:       me.address,
        walletType:    me.wallet_type,
        chainId:       DEFAULT_CHAIN_ID,
        token:         walletToken,
        linkedSocials: me.linked_socials,
      }
      localStorage.setItem("wallet_session", JSON.stringify(restoredSession))
    }
  }

  window.dispatchEvent(new CustomEvent("socialLinked", { detail: provider }))
  router.replace(`/?linked=${provider}`)
} else {
          await connectSocial(provider as any, session.access_token, "supabase_token")
          router.replace("/")
        }
      } catch (err: any) {
        const msg = err?.message ?? ""
        if (msg === "cancelled") { router.replace("/"); return }
        toast.error(msg || "Authentication failed")
        router.replace("/?auth=failed")
      }
    })()
  }, [])

  // Show success toast on return
  useEffect(() => {
    const linked = new URLSearchParams(window.location.search).get("linked")
    if (linked) {
      toast.success(`${linked} connected!`)
      // Clean the URL without a re-render
      window.history.replaceState({}, "", window.location.pathname)
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