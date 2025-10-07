"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useWalletConnect } from "@/components/contexts/walletconnect-provider"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

function WCContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { pair } = useWalletConnect()
  const { toast } = useToast()

  useEffect(() => {
    const uri = searchParams.get('uri')
    const requestId = searchParams.get('requestId')
    const sessionTopic = searchParams.get('sessionTopic')

    if (uri) {
      // Handle new connection
      handlePairing(uri)
    } else if (requestId && sessionTopic) {
      // Handle session request
      handleSessionRequest(requestId, sessionTopic)
    } else {
      router.push('/')
    }
  }, [searchParams])

  const handlePairing = async (uri: string) => {
    try {
      await pair(decodeURIComponent(uri))
      toast({
        title: "Pairing initiated",
        description: "Please approve the connection in your wallet",
      })
      
      // Redirect back after successful pairing
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error: any) {
      console.error("Pairing failed:", error)
      toast({
        title: "Pairing failed",
        description: error.message,
        variant: "destructive",
      })
      router.push('/')
    }
  }

  const handleSessionRequest = async (requestId: string, sessionTopic: string) => {
    // Handle session request - you can show a modal here
    console.log('Session request:', { requestId, sessionTopic })
    router.push(`/?requestId=${requestId}&sessionTopic=${sessionTopic}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Connecting to dApp...</p>
      </div>
    </div>
  )
}

export default function WCPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <WCContent />
    </Suspense>
  )
}