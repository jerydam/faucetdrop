"use client"

import { useState, useEffect } from "react"
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react"
import { BrowserProvider, Eip1193Provider } from 'ethers'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, Loader2, Save, Upload, Check, Edit2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Backend URL
const API_BASE_URL = "https://fauctdrop-backend.onrender.com";

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

const GENERATED_SEEDS = ["Felix", "Aneka", "Zack", "Molly", "Bear", "Crypto", "Whale", "Pepe"];

export function ProfileSettingsModal() {
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  const { toast } = useToast()
  
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
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

  // Fetch Profile on Open
  useEffect(() => {
    if (isOpen && address) {
      fetchProfile()
    }
  }, [isOpen, address])

  const fetchProfile = async () => {
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
  }

  // Handle Image Upload to Backend
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/upload-image`, {
        method: 'POST',
        body: uploadData
      })

      const data = await response.json()
      
      if (data.success) {
        setFormData(prev => ({ ...prev, avatar_url: data.imageUrl }))
        toast({ title: "Image Uploaded", description: "Your custom avatar is ready to save." })
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!isConnected || !walletProvider || !address) {
      toast({ title: "Error", description: "Wallet not connected", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      // 1. Signature
      const nonce = Math.floor(Math.random() * 1000000).toString()
      const message = `I am updating my FaucetDrops profile.\n\nWallet: ${address}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`

      const ethersProvider = new BrowserProvider(walletProvider as Eip1193Provider)
      const signer = await ethersProvider.getSigner()
      const signature = await signer.signMessage(message)

      // 2. Payload
      const payload = {
        wallet_address: address,
        ...formData,
        signature,
        message,
        nonce
      }

      // 3. API Call
      const res = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const result = await res.json()

      if (!res.ok) throw new Error(result.detail || "Update failed")

      toast({ title: "Success", description: "Profile updated successfully!" })
      setIsOpen(false)
      window.location.reload() 

    } catch (error: any) {
      console.error(error)
      toast({ 
        title: "Save Failed", 
        description: error.message || "Could not save profile", 
        variant: "destructive" 
      })
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
      {/* Responsive Dialog Content: Full width on mobile, max-width-lg on desktop */}
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
            
            {/* --- Avatar Selection Section --- */}
            <div className="flex flex-col items-center gap-4 w-full">
                <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-sm">
                    <AvatarImage src={formData.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold bg-muted">{formData.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                </Avatar>

                <Tabs defaultValue="generate" className="w-full max-w-sm">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">Upload Custom</TabsTrigger>
                        <TabsTrigger value="generate">Choose Avatar</TabsTrigger>
                    </TabsList>
                    
                    {/* Upload Tab */}
                    <TabsContent value="upload" className="pt-4">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer relative bg-muted/20">
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                disabled={uploading}
                            />
                            {uploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            ) : (
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            )}
                            <p className="text-xs sm:text-sm text-muted-foreground text-center">
                                {uploading ? "Uploading..." : "Tap to upload image (max 5MB)"}
                            </p>
                        </div>
                    </TabsContent>

                    {/* Generate Tab */}
                    <TabsContent value="generate" className="pt-4">
                        <div className="grid grid-cols-4 gap-3">
                            {GENERATED_SEEDS.map((seed) => {
                                const url = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`
                                const isSelected = formData.avatar_url === url
                                return (
                                    <div 
                                        key={seed} 
                                        onClick={() => setFormData(prev => ({...prev, avatar_url: url}))}
                                        className={`
                                            relative aspect-square rounded-full cursor-pointer overflow-hidden border-2 transition-all hover:scale-105
                                            ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent bg-muted'}
                                        `}
                                    >
                                        {/* Image tag used here for SVG support from Dicebear */}
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
                    </TabsContent>
                </Tabs>
            </div>

            {/* --- Text Inputs --- */}
            {/* Grid Layout: Stacks on mobile, Side-by-side on SM+ screens */}
            <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="username" className="text-left sm:text-right font-medium text-muted-foreground">Username</Label>
                    <Input 
                        id="username" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="col-span-1 sm:col-span-3" 
                        placeholder="CryptoKing"
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="bio" className="text-left sm:text-right font-medium text-muted-foreground">Bio</Label>
                    <Textarea 
                        id="bio" 
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="col-span-1 sm:col-span-3 min-h-[80px]" 
                        placeholder="Tell us about yourself..."
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="email" className="text-left sm:text-right font-medium text-muted-foreground">Email</Label>
                    <Input 
                        id="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="col-span-1 sm:col-span-3" 
                        placeholder="Optional"
                    />
                </div>
            </div>

            {/* --- Socials --- */}
            <div className="border-t pt-4">
              <h4 className="mb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Social Connections</h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right font-medium text-muted-foreground">X (Twitter)</Label>
                  <Input 
                    value={formData.twitter_handle} 
                    onChange={(e) => setFormData({...formData, twitter_handle: e.target.value})} 
                    className="col-span-1 sm:col-span-3" 
                    placeholder="@handle" 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right font-medium text-muted-foreground">Telegram</Label>
                  <Input 
                    value={formData.telegram_handle} 
                    onChange={(e) => setFormData({...formData, telegram_handle: e.target.value})} 
                    className="col-span-1 sm:col-span-3" 
                    placeholder="@username" 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right font-medium text-muted-foreground">Farcaster</Label>
                  <Input 
                    value={formData.farcaster_handle} 
                    onChange={(e) => setFormData({...formData, farcaster_handle: e.target.value})} 
                    className="col-span-1 sm:col-span-3" 
                    placeholder="handle" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-background pt-2 pb-4 sm:static sm:pb-0">
            <Button onClick={handleSave} disabled={saving || loading || uploading} className="w-full">
            {saving ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing & Saving...
                </>
            ) : (
                <>
                <Save className="mr-2 h-4 w-4" /> Save Profile
                </>
            )}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}