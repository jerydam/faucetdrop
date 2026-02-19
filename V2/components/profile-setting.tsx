"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@/components/wallet-provider" // Using your new provider
// Removed BrowserProvider, Eip1193Provider imports as they aren't needed anymore
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Settings, Loader2, Save, Upload, Check, Edit2, RefreshCw, 
  AlertCircle, CheckCircle2, X, Link as LinkIcon 
} from "lucide-react"
import { toast } from "sonner"
import { TelegramLoginButton } from "./TelegramLoginButton"

const API_BASE_URL = "http://localhost:8000"
const TELEGRAM_BOT_NAME = "YourQuestBot" 

interface UserProfile {
  username: string
  email: string
  bio: string
  twitter_handle: string
  discord_handle: string
  telegram_handle: string
  farcaster_handle: string
  avatar_url: string
}

interface FieldStatus {
  username?: string | null;
  email?: string | null;
}

const GENERATED_SEEDS = [
  "Jerry","John", "Aneka", "Zack", "Molly", "Bear", "Crypto", "Whale", "Pepe",
  "Satoshi", "Vitalik", "Gwei"
];

export function ProfileSettingsModal() {
  // FIX 1: Destructure 'signer' directly. 'walletProvider' does not exist.
  const { address, isConnected, signer } = useWallet() 
  const router = useRouter()
  
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [fieldStatus, setFieldStatus] = useState<FieldStatus>({}) 
  const [seedOffset, setSeedOffset] = useState(0);

  const [formData, setFormData] = useState<UserProfile>({
    username: "",
    email: "",
    bio: "",
    twitter_handle: "",
    discord_handle: "",
    telegram_handle: "",
    farcaster_handle: "",
    avatar_url: ""
  })

  // ... (keep fetchProfile, useEffect, handleOAuthLink, handleTelegramAuth, handleMessage logic exactly the same) ...
  const fetchProfile = useCallback(async () => {
    if (!address) return;
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/${address}`)
      const data = await res.json()
      if (data.profile) {
        setFormData({
          username: data.profile.username || "",
          email: data.profile.email || "",
          bio: data.profile.bio || "",
          twitter_handle: data.profile.twitter_handle || "",
          discord_handle: data.profile.discord_handle || "",
          telegram_handle: data.profile.telegram_handle || "",
          farcaster_handle: data.profile.farcaster_handle || "",
          avatar_url: data.profile.avatar_url || ""
        })
      }
    } catch (error) {
      console.error("Failed to fetch profile", error)
    } finally {
      setLoading(false)
    }
  }, [address]);

  useEffect(() => {
    if (isOpen && address) {
      fetchProfile()
      setFieldStatus({})
    }
  }, [isOpen, address, fetchProfile])

  const handleOAuthLink = (provider: 'twitter' | 'discord' | 'google') => {
    if (!address) return toast.error("Connect wallet first");
    const width = 500, height = 650;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;
    const oauthUrl = `${API_BASE_URL}/auth/${provider}/login?wallet=${address}`;
    window.open(oauthUrl, `Verify ${provider}`, `width=${width},height=${height},top=${top},left=${left}`);
  };

  const handleTelegramAuth = async (user: any) => {
    try {
        const toastId = toast.loading("Verifying Telegram...");
        const res = await fetch(`${API_BASE_URL}/auth/telegram/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...user, wallet_address: address })
        });
        if (res.ok) {
            toast.dismiss(toastId);
            toast.success("Telegram verified successfully!");
            fetchProfile();
        } else {
            throw new Error("Verification failed");
        }
    } catch (e) {
        toast.error("Failed to verify Telegram signature");
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data === 'auth_success') {
            toast.success("Account linked successfully!");
            fetchProfile();
        }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchProfile]);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
      setFormData({ ...formData, [field]: value });
      if (fieldStatus[field as keyof FieldStatus] !== undefined) {
          setFieldStatus(prev => {
              const newStatus = { ...prev };
              delete newStatus[field as keyof FieldStatus];
              return newStatus;
          });
      }
  };

  const checkUniqueness = async (field: 'username' | 'email', value: string) => {
    if (!value || value.trim() === "") return true;
    if (!address) return true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/check-availability`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field, value: value.trim(), current_wallet: address.toLowerCase() })
        });
        const data = await res.json();
        if (!data.available) {
            setFieldStatus(prev => ({ ...prev, [field]: data.message }));
            return false;
        } else {
            setFieldStatus(prev => ({ ...prev, [field]: null }));
            return true;
        }
    } catch (error) { return true; }
  };

  // ... (Keep handleFileUpload, handleShuffle, SocialRow) ...
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /* Reuse logic */ }
  const handleShuffle = () => { setSeedOffset((prev) => (prev + 8) % GENERATED_SEEDS.length); }
  const currentSeeds = GENERATED_SEEDS.slice(seedOffset, seedOffset + 8);

  const SocialRow = ({ label, handle, provider }: { label: string, handle: string, provider: 'twitter' | 'discord' | 'google' }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
        <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
                {handle ? <span className="text-green-600 flex items-center font-medium"><CheckCircle2 className="h-3 w-3 mr-1" /> {handle}</span> : "Not linked"}
            </span>
        </div>
        {handle ? <Button size="sm" variant="ghost" disabled className="text-green-600 bg-green-50">Linked</Button> : 
        <Button size="sm" variant="outline" type="button" onClick={() => handleOAuthLink(provider)}>Connect</Button>}
    </div>
  );

  const handleSave = async () => {
    // FIX 2: Check for signer instead of walletProvider
    if (!isConnected || !address || !signer) return toast.error("Wallet error");
    if (!formData.email) return toast.error("Email is required");

    setSaving(true)

    const validUsername = await checkUniqueness('username', formData.username);
    const validEmail = await checkUniqueness('email', formData.email);

    if (!validUsername || !validEmail) {
        setSaving(false);
        return toast.error("Please fix the errors before saving.");
    }

    try {
      const nonce = Math.floor(Math.random() * 1000000).toString()
      const message = `Update Profile\nWallet: ${address}\nNonce: ${nonce}`

      // FIX 3: Remove BrowserProvider instantiation. Use 'signer' directly.
      // The WalletProvider already set this up for you.
      const signature = await signer.signMessage(message)

      const payload = {
        wallet_address: address,
        username: formData.username,
        email: formData.email,
        bio: formData.bio,
        avatar_url: formData.avatar_url,
        signature,
        message,
        nonce
      }

     const res = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error("Update failed")

      toast.success("Profile saved!")
      setIsOpen(false)
      window.dispatchEvent(new Event("profileUpdated"));
      
      if (formData.username && formData.username.toLowerCase() !== "anonymous") {
          router.push(`/dashboard/${formData.username}`);
      }

    } catch (error: any) {
      toast.error("Could not save profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background shadow-sm hover:bg-muted">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95%] sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-4">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 w-full">
                <Avatar className="h-24 w-24 border-2 border-primary/20">
                    <AvatarImage src={formData.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold">{formData.username?.[0] || "?"}</AvatarFallback>
                </Avatar>
                
                <Tabs defaultValue="generate" className="w-full max-w-sm">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">Upload Custom</TabsTrigger>
                        <TabsTrigger value="generate">Choose Avatar</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upload" className="pt-4">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer relative bg-muted/20">
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                            {uploading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <Upload className="h-8 w-8 text-muted-foreground mb-2" />}
                            <p className="text-xs sm:text-sm text-muted-foreground text-center">{uploading ? "Uploading..." : "Tap to upload image (max 5MB)"}</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="generate" className="pt-4">
                        <div className="grid grid-cols-4 gap-3">
                            {currentSeeds.map((seed, idx) => { 
                                const url = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`
                                const isSelected = formData.avatar_url === url
                                return (
                                    <div key={`${seed}-${idx}`} onClick={() => setFormData(prev => ({...prev, avatar_url: url}))} className={`relative aspect-square rounded-full cursor-pointer overflow-hidden border-2 transition-all hover:scale-105 ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent bg-muted'}`}>
                                        <img src={url} alt={seed} className="w-full h-full" />
                                        {isSelected && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check className="h-5 w-5 text-white" /></div>}
                                    </div>
                                )
                            })}
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleShuffle} className="w-full mt-4 text-muted-foreground hover:text-primary gap-2"><RefreshCw className="h-3 w-3" /> Shuffle Avatars</Button>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Manual Inputs */}
            <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                    <Label className="sm:text-right pt-2">Username</Label>
                    <div className="col-span-3">
                        <Input value={formData.username} onChange={(e) => handleInputChange('username', e.target.value)} onBlur={() => checkUniqueness('username', formData.username)} className={fieldStatus.username ? "border-red-500" : ""} />
                        {fieldStatus.username && <p className="text-xs text-red-500 mt-1">{fieldStatus.username}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                    <Label className="sm:text-right pt-2">Bio</Label>
                    <Textarea value={formData.bio} onChange={(e) => handleInputChange('bio', e.target.value)} className="col-span-3" placeholder="Tell us about yourself..." />
                </div>
            </div>

            {/* Verified Connections */}
            <div className="border-t pt-6">
              <h4 className="mb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="h-3 w-3" /> Verified Connections
              </h4>
              <div className="grid gap-3">
                <SocialRow label="Email (Google)" handle={formData.email} provider="google" />
                <SocialRow label="X (Twitter)" handle={formData.twitter_handle} provider="twitter" />
                <SocialRow label="Discord" handle={formData.discord_handle} provider="discord" />
                <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">Telegram</span>
                        <span className="text-xs text-muted-foreground">
                            {formData.telegram_handle ? <span className="text-green-600 flex items-center font-medium"><CheckCircle2 className="h-3 w-3 mr-1" /> @{formData.telegram_handle}</span> : "Not linked"}
                        </span>
                    </div>
                    {formData.telegram_handle ? <Button size="sm" variant="ghost" disabled className="text-green-600 bg-green-50">Linked</Button> : <TelegramLoginButton botName={TELEGRAM_BOT_NAME} onAuth={handleTelegramAuth} />}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-background pt-2 pb-4">
            <Button onClick={handleSave} disabled={saving || loading} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
            {saving ? "Saving..." : "Save Profile"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}