"use client"
import { useState, useEffect, useCallback } from "react"
import { useWallet, type LuminaSession } from "@/components/wallet-provider"
import { useLumina } from "@jerydam/lumina-sdk"
import { ConnectModal } from "@jerydam/lumina-sdk"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Save, Upload, Check, Edit2, RefreshCw,
  CheckCircle2, Link as LinkIcon, Wallet,
} from "lucide-react"
import { toast } from "sonner"

const API_BASE_URL = "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app"
const LUMINA_API   = "https://lumina-z3v8.onrender.com"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthMethod {
  id:           string
  auth_type:    string   // "google" | "twitter" | "github" | "evm_wallet" | "solana_wallet"
  identifier:   string   // email, @handle, or address
  display_name: string | null
  avatar_url:   string | null
  email:        string | null
}

interface UserProfile {
  wallet_address: string
  username:       string
  bio:            string
  avatar_url:     string
}

const GENERATED_SEEDS = [
  "Jerry","John","Aneka","Zack","Molly","Bear","Crypto","Whale","Pepe",
  "Satoshi","Vitalik","Gwei","HODL","WAGMI","Doge","Shiba","Solana",
  "Ether","Bitcoin","Chain","Block","DeFi","NFT","Alpha","Beta",
  "Neon","Cyber","Pixel","Glitch","Retro","Vapor","Synth","Wave",
  "Pulse","Echo","Flux","Spark","Glow","Shine","Shadow","Light",
]

// ── Lumina OAuth helper ───────────────────────────────────────────────────────

async function luminaOAuthLink(
  provider: "google" | "twitter" | "github",
  apiKey: string,
  accountId: string
): Promise<AuthMethod> {
  // 1. Init OAuth — get auth_url + state
  const initRes = await fetch(
    `${LUMINA_API}/v1/connect/oauth/init?provider=${provider}&chain_id=1`,
    { headers: { "X-API-Key": apiKey } }
  )
  if (!initRes.ok) throw new Error("Failed to start OAuth")
  const { auth_url, state } = await initRes.json()

  // 2. Open popup
  const popup = window.open(auth_url, "lumina_oauth", "width=500,height=700")
  if (!popup) throw new Error("Popup blocked — please allow popups for this site.")

  // 3. Poll for session
  const session = await new Promise<any>((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        if (popup.closed) { clearInterval(timer); reject(new Error("Cancelled")); return }
        const res = await fetch(
          `${LUMINA_API}/v1/connect/oauth/session?state=${state}`,
          { headers: { "X-API-Key": apiKey } }
        )
        if (res.status === 202) return   // still pending
        if (!res.ok) { clearInterval(timer); popup.close(); reject(new Error("OAuth failed")); return }
        const data = await res.json()
        clearInterval(timer)
        popup.close()
        resolve(data)
      } catch {}
    }, 1500)
    setTimeout(() => { clearInterval(timer); popup?.close(); reject(new Error("Timed out")) }, 300_000)
  })

  // 4. Link to existing account
  const linkRes = await fetch(`${LUMINA_API}/v1/connect/link/social`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      account_id:     accountId,
      oauth_provider: provider,
      oauth_token:    session.evm_signer ?? session.account_id,  // backend extracts from session
    }),
  })
  if (!linkRes.ok) {
    const err = await linkRes.json()
    throw new Error(err.detail || "Failed to link account")
  }
  const { auth_methods } = await linkRes.json()
  // Return the newly linked method
  return auth_methods.find((m: AuthMethod) => m.auth_type === provider)
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProfileSettingsModal() {
  const { address, isConnected, signer, isOnSolana } = useWallet()
  const { fetchApi } = useLumina()  

  // Read session directly for account_id and solana_address
  const [session, setSession] = useState<LuminaSession | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lumina_session")
      if (raw) setSession(JSON.parse(raw))
    } catch {}
  }, [isConnected])

  const accountId  = session?.account_id  ?? ""
  const solanaAddr = session?.solana_address ?? null
  
  const router = useRouter()
  const [isOpen,         setIsOpen]         = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [usernameError,  setUsernameError]  = useState<string | null>(null)
  const [seedOffset,     setSeedOffset]     = useState(0)
  const [authMethods,    setAuthMethods]    = useState<AuthMethod[]>([])
  const [loadingMethods, setLoadingMethods] = useState(false)
  
  const [formData, setFormData] = useState<UserProfile>({
    wallet_address: "",
    username:       "",
    bio:            "",
    avatar_url:     "",
  })

  // ── Derived from auth methods ──────────────────────────────────────────
  const getMethod = (type: string) => authMethods.find(m => m.auth_type === type)
  const googleMethod  = getMethod("google")
  const twitterMethod = getMethod("twitter")
  const githubMethod  = getMethod("github")

  // ── Fetch auth methods from Lumina ────────────────────────────────────
  const fetchAuthMethods = useCallback(async () => {
    if (!accountId) return
    try {
      const data = await fetchApi(`/v1/connect/auth-methods?account_id=${accountId}`)
      setAuthMethods(data.auth_methods ?? [])
    } catch {}
  }, [accountId, fetchApi])

  // ── Fetch user profile ────────────────────────────────────────────────
  const fetchProfile = useCallback(async (signal?: AbortSignal) => {
    if (!address) return
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/profile/${address}`, { signal })
      if (signal?.aborted) return
      const data = await res.json()
      setFormData({
        wallet_address: address,
        username:       data.profile?.username   || "",
        bio:            data.profile?.bio        || "",
        avatar_url:     data.profile?.avatar_url || "",
      })
    } catch (err: any) {
      if (err.name === "AbortError") return
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (!isOpen || !address) return
    const controller = new AbortController()
    fetchProfile(controller.signal)
    fetchAuthMethods()
    return () => controller.abort()
  }, [isOpen, address, fetchProfile, fetchAuthMethods])

  // ── Social link/unlink ────────────────────────────────────────────────
  const handleLinkSocial = async (provider: "google" | "twitter" | "github") => {
    if (!accountId) return toast.error("Not connected")
    try {
      // Init OAuth through SDK
      const { auth_url, state } = await fetchApi(
        `/v1/connect/oauth/init?provider=${provider}&chain_id=1`
      )

      const popup = window.open(auth_url, "lumina_oauth", "width=500,height=700")
      if (!popup) throw new Error("Popup blocked")

      // Poll for completion
      await new Promise<void>((resolve, reject) => {
        const timer = setInterval(async () => {
          try {
            if (popup.closed) { clearInterval(timer); reject(new Error("Cancelled")); return }
            const session = await fetchApi(`/v1/connect/oauth/session?state=${state}`)
            if (session?.signer_address) {
              clearInterval(timer)
              popup.close()

              // Link to existing account
              await fetchApi("/v1/connect/link/social", {
                method: "POST",
                body: JSON.stringify({
                  account_id:     accountId,
                  oauth_provider: provider,
                  oauth_token:    session.evm_signer ?? session.signer_address,
                }),
              })
              resolve()
            }
          } catch (e: any) {
            if (e.message !== "Pending") {
              clearInterval(timer); popup?.close(); reject(e)
            }
          }
        }, 1500)
        setTimeout(() => { clearInterval(timer); popup?.close(); reject(new Error("Timed out")) }, 300_000)
      })

      toast.success(`${provider} linked!`)
      await fetchAuthMethods()
    } catch (err: any) {
      const msg = (err?.message ?? "").toLowerCase()
      if (!msg.includes("cancelled") && !msg.includes("closed"))
        toast.error(err.message || `Failed to link ${provider}`)
    }
  }

  const handleUnlinkSocial = async (methodId: string, label: string) => {
    if (!accountId) return
    try {
      await fetchApi("/v1/connect/unlink", {
        method: "POST",
        body: JSON.stringify({ account_id: accountId, auth_method_id: methodId }),
      })
      toast.success(`${label} unlinked`)
      await fetchAuthMethods()
    } catch (err: any) {
      toast.error(err.message || `Failed to unlink ${label}`)
    }
  }

  // ── Save profile ──────────────────────────────────────────────────────
  const checkUsernameUniqueness = async (value: string) => {
    if (!value?.trim() || !address) return true
    try {
      const res  = await fetch(`${API_BASE_URL}/api/profile/check-availability`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field:          "username",
          value:          value.trim(),
          current_wallet: address.toLowerCase(),
        }),
      })
      const data = await res.json()
      if (!data.available) { setUsernameError(data.message); return false }
      setUsernameError(null)
      return true
    } catch { return true }
  }

  const handleSave = async () => {
    if (!isConnected || !address || !signer) return toast.error("Wallet not connected")
    setSaving(true)
    const validUsername = await checkUsernameUniqueness(formData.username || "")
    if (!validUsername) { setSaving(false); return }

    try {
      const nonce     = Math.floor(Math.random() * 1_000_000).toString()
      const message   = `Update Profile\nWallet: ${address}\nNonce: ${nonce}`
      const signature = await signer.signMessage(message)

      const payload = {
        wallet_address:   address,
        username:         formData.username,
        bio:              formData.bio,
        avatar_url:       formData.avatar_url,
        // Pull social handles from Lumina auth methods
        email:            googleMethod?.email        || googleMethod?.identifier || "",
        twitter_handle:   twitterMethod?.identifier  || "",
        solana_address:   solanaAddr                 || "",
        signature,
        message,
        nonce,
      }

      const res = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Update failed")

      toast.success("Profile saved!")
      setIsOpen(false)
      window.dispatchEvent(new Event("profileUpdated"))
      if (formData.username) router.push(`/dashboard/${formData.username}`)
    } catch {
      toast.error("Could not save profile")
    } finally {
      setSaving(false)
    }
  }

  // ── File upload ───────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res  = await fetch(`${API_BASE_URL}/upload-image`, { method: "POST", body })
      const data = await res.json()
      if (data.success) {
        setFormData(prev => ({ ...prev, avatar_url: data.imageUrl }))
        toast.success("Image uploaded")
      } else throw new Error(data.message)
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const currentSeeds = GENERATED_SEEDS.slice(seedOffset, seedOffset + 8)

  // ── Reusable social row ───────────────────────────────────────────────
  const SocialRow = ({
    label,
    provider,
    method,
  }: {
    label:    string
    provider: "google" | "twitter" | "github"
    method:   AuthMethod | undefined
  }) => {
    const [busy, setBusy] = useState(false)
    const handle = method?.display_name || method?.identifier || method?.email

    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground">
            {handle
              ? <span className="text-green-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3" />{handle}
                </span>
              : "Not linked"}
          </span>
        </div>
        {method ? (
          <Button
            size="sm" variant="ghost" type="button"
            disabled={busy}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={async () => {
              setBusy(true)
              await handleUnlinkSocial(method.id, label)
              setBusy(false)
            }}
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {busy ? "Removing…" : "Disconnect"}
          </Button>
        ) : (
          <Button
            size="sm" variant="outline" type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await handleLinkSocial(provider)
              setBusy(false)
            }}
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {busy ? "Opening…" : "Connect"}
          </Button>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background shadow-sm hover:bg-muted">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95%] sm:max-w-[600px] max-h-[90vh] rounded-lg flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-4">

              {/* Avatar */}
              <div className="flex flex-col items-center gap-4 w-full">
                <Avatar className="h-24 w-24 border-2 border-primary/20">
                  <AvatarImage src={formData.avatar_url} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold">
                    {formData.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>

                <Tabs defaultValue="generate" className="w-full max-w-sm">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="generate">Choose Avatar</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="pt-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer relative bg-muted/20">
                      <input type="file" accept="image/*" onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                      {uploading
                        ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        : <Upload className="h-8 w-8 text-muted-foreground mb-2" />}
                      <p className="text-xs text-muted-foreground text-center">
                        {uploading ? "Uploading…" : "Tap to upload (max 5 MB)"}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="generate" className="pt-4">
                    <div className="grid grid-cols-4 gap-3">
                      {currentSeeds.map((seed, idx) => {
                        const url        = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`
                        const isSelected = formData.avatar_url === url
                        return (
                          <div key={`${seed}-${idx}`}
                            onClick={() => setFormData(prev => ({ ...prev, avatar_url: url }))}
                            className={`relative aspect-square rounded-full cursor-pointer overflow-hidden border-2 transition-all hover:scale-105 ${
                              isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent bg-muted"
                            }`}>
                            <img src={url} alt={seed} className="w-full h-full" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSeedOffset(p => (p + 8) % GENERATED_SEEDS.length)}
                      className="w-full mt-4 text-muted-foreground hover:text-primary gap-2">
                      <RefreshCw className="h-3 w-3" /> Shuffle
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Username + Bio */}
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <Label className="sm:text-right pt-2">Username</Label>
                  <div className="col-span-3">
                    <Input
                      value={formData.username}
                      onChange={e => { setFormData(p => ({ ...p, username: e.target.value })); setUsernameError(null) }}
                      onBlur={() => checkUsernameUniqueness(formData.username)}
                      className={usernameError ? "border-red-500" : ""}
                    />
                    {usernameError
                      ? <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                      : formData.username && (
                          <p className="text-xs text-green-600 mt-1 flex items-center">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Available
                          </p>
                        )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <Label className="sm:text-right pt-2">Bio</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                    className="col-span-3"
                    placeholder="Tell us about yourself…"
                  />
                </div>
              </div>

              {/* Linked Wallets */}
              <div className="border-t pt-6">
                <h4 className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="h-3 w-3" /> Linked Wallets
                </h4>
                <div className="grid gap-3">
                  {address && (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">EVM Wallet</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {address.slice(0, 6)}…{address.slice(-4)}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {session?.wallet_type === "embedded" ? "Embedded" : "External"}
                      </Badge>
                    </div>
                  )}
                  {solanaAddr && (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">Solana Wallet</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {solanaAddr.slice(0, 6)}…{solanaAddr.slice(-4)}
                        </span>
                      </div>
                      <Badge variant="secondary">Embedded</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Verified Connections */}
              <div className="border-t pt-6">
                <h4 className="mb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <LinkIcon className="h-3 w-3" /> Verified Connections
                </h4>
                {loadingMethods
                  ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  : (
                    <div className="grid gap-3">
                      <SocialRow label="Email (Google)" provider="google"  method={googleMethod}  />
                      <SocialRow label="X (Twitter)"    provider="twitter" method={twitterMethod} />
                      <SocialRow label="GitHub"         provider="github"  method={githubMethod}  />
                    </div>
                  )}
                <p className="text-xs text-muted-foreground mt-3">
                  * Click "Save Profile" below to sync linked accounts to your public profile.
                </p>
              </div>

            </div>
          )}
        </div>

        <div className="shrink-0 px-6 pt-2 pb-6 border-t bg-background">
          <Button onClick={handleSave} disabled={saving || loading || !!usernameError} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}