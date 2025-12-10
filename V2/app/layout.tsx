"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { NetworkProvider } from "@/hooks/use-network"
import { WalletProvider } from "@/components/wallet-provider"
import { Footer } from "@/components/footer"
import { QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig, queryClient } from '@/config/appkit'
import sdk from "@farcaster/miniapp-sdk"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isReady, setIsReady] = useState(false)
  
  useEffect(() => {
    const init = async () => {
      try {
        // Wait for the DOM to be fully ready
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(null)
          } else {
            window.addEventListener('load', () => resolve(null))
          }
        })

        // Small delay to ensure React has rendered
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Signal to Farcaster that the app is ready
        sdk.actions.ready()
        setIsReady(true)
        
        console.log('✅ Farcaster SDK initialized')
      } catch (error) {
        console.warn("Not in Farcaster environment or failed to initialize:", error)
        setIsReady(true) // Still allow the app to render
      }
    }
    init()
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <title>FaucetDrops</title>
        <meta name="description" content="Token Drops Made Easy 💧" />
      </head>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark"
          enableSystem 
          disableTransitionOnChange
        >
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <NetworkProvider>
                <WalletProvider>
                  <div className="min-h-screen flex flex-col">
                    <main className="flex-1">
                      {children}
                    </main>
                    <Footer />
                  </div>
                  <Toaster />
                </WalletProvider>
              </NetworkProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}