import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { WalletProvider } from "@/components/wallet-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { NetworkProvider } from "@/hooks/use-network"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Token Faucet",
  description: "Claim testnet tokens from faucets",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NetworkProvider>
            <WalletProvider>
              {children}
              <Toaster />
            </WalletProvider>
          </NetworkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
