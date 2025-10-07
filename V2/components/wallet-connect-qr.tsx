"use client"

import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { useWalletConnect } from "@/components/contexts/walletconnect-provider"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link, QrCode, Copy, Check, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface WalletConnectQRProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletConnectQR({ open, onOpenChange }: WalletConnectQRProps) {
  const { pair, activeSessions } = useWalletConnect()
  const { address, chainId } = useWallet()
  const { toast } = useToast()
  
  const [uri, setUri] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Generate your wallet URL for QR code
  const walletUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const wcDeepLink = uri ? `${walletUrl}/wc?uri=${encodeURIComponent(uri)}` : ''

  const handleConnect = async () => {
    if (!uri.trim()) {
      toast({
        title: "Empty URI",
        description: "Please provide a WalletConnect URI",
        variant: "destructive",
      })
      return
    }

    if (!uri.startsWith('wc:')) {
      toast({
        title: "Invalid URI",
        description: 'WalletConnect URI should start with "wc:"',
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    try {
      await pair(uri)
      toast({
        title: "Pairing initiated",
        description: "Waiting for session approval...",
      })
      setUri("")
      onOpenChange(false)
    } catch (error: any) {
      console.error("Connection failed:", error)
      toast({
        title: "Connection failed",
        description: error.message || 'Unknown error',
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "URI copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setUri("")
      setIsConnecting(false)
      setCopied(false)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to dApp</DialogTitle>
          <DialogDescription>
            Scan QR code or paste WalletConnect URI
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr">
              <QrCode className="mr-2 h-4 w-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="uri">
              <Link className="mr-2 h-4 w-4" />
              URI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="space-y-4">
            <div className="space-y-4">
              <Input
                placeholder="Paste WalletConnect URI here (wc:...)"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
              />
              
              {uri && uri.startsWith('wc:') ? (
                <div className="space-y-4">
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <QRCodeSVG 
                      value={wcDeepLink} 
                      size={256}
                      level="H"
                      includeMargin
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Scan this QR code with your mobile wallet app
                    </p>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => copyToClipboard(wcDeepLink)}
                      >
                        {copied ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copy Link
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="flex-1"
                      >
                        {isConnecting ? "Connecting..." : "Connect"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                  <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground text-center">
                    Paste a WalletConnect URI above to generate QR code
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="uri" className="space-y-4">
            <div className="space-y-4">
              <Input
                placeholder="wc:..."
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConnect()
                  }
                }}
              />
              
              <Button 
                onClick={handleConnect} 
                disabled={!uri.trim() || isConnecting}
                className="w-full"
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>

              {Object.keys(activeSessions).length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium">Active Sessions: {Object.keys(activeSessions).length}</p>
                  {Object.values(activeSessions).map((session) => (
                    <div key={session.topic} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {session.peer.metadata.icons?.[0] && (
                          <img 
                            src={session.peer.metadata.icons[0]} 
                            alt={session.peer.metadata.name}
                            className="w-6 h-6 rounded"
                          />
                        )}
                        <span className="text-sm">{session.peer.metadata.name}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}