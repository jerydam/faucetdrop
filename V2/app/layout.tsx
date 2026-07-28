"use client"

import type React from "react"
import { useEffect, useMemo } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemedToaster } from "@/components/themed-toaster";
import { NetworkProvider } from "@/hooks/use-network"
import { WalletProvider } from "@/components/wallet-provider"
import { PrivyProvider } from "@privy-io/react-auth"
import { Footer } from "@/components/footer"
import { SubscriptionModalProvider } from "@/components/subscribe"
import { useVisitTracker } from "@/hooks/use-visit-tracker"
import { Providers } from "@/components/privyProvider"
import { PinSetupModal } from "@/components/pin-modal"
import { PinEntryModal } from "@/components/pin-entry"
import { PresenceProvider } from "@/components/presence-provider"
import { DMProvider } from "@/components/dm-provider"
import { DMPanel } from "@/components/dm-panel"
// ── Solana wallet adapter ─────────────────────────────────────────────────────
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets"
import { PrivyImportModal } from "@/components/privy_import"
import { SignerBootstrap } from "@/components/signer-bootstrap"

// ─────────────────────────────────────────────────────────────────────────────

const inter = Inter({ subsets: ["latin"] })

// Solana providers are extracted into their own component so the `useMemo`
// for wallet adapters runs in a proper client component without touching the
// root layout's server-component boundary.
function SolanaProviders({ children }: { children: React.ReactNode }) {
  // Memoised so adapter instances are stable across re-renders
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  )

  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com"

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
function FooterWrapper() {
  const pathname = usePathname()
  const HIDE_ON = ["/challenge/create"]
  if (HIDE_ON.some(p => pathname.startsWith(p))) return null
  return <Footer />
}
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  useVisitTracker()

 

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />

        {/* Primary Meta Tags */}
        <title>FaucetDrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution</title>
        <meta name="title" content="FaucetDrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution" />
        <meta
          name="description"
          content="The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧. Distribute rewards effortlessly across multiple chains."
        />
        <meta name="talentapp:project_verification" content="98f7ce94c39130cef543fae892959918754270dff34594b8d7a129a75b6e2b6f052016215082a0071b59805b26c86d58ae8dec2460ee57a9652ab98f089e8461"/>

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://app.faucetdrops.io/" />
        <meta property="og:site_name" content="app.faucetdrops" />
        <meta property="og:title" content="app.faucetdrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution" />
        <meta
          property="og:description"
          content="The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧. Distribute rewards effortlessly across multiple chains."
        />
        <meta property="og:image" content="https://app.faucetdrops.io/opengraph-image" />
        <meta property="og:image:secure_url" content="https://app.faucetdrops.io/opengraph-image" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="app.faucetdrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution"
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://app.faucetdrops.io/" />
        <meta name="twitter:title" content="app.faucetdrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution" />
        <meta
          name="twitter:description"
          content="The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧. Distribute rewards effortlessly across multiple chains."
        />
        <meta name="twitter:image" content="https://app.faucetdrops.io/opengraph-image" />
        <meta
          name="twitter:image:alt"
          content="app.faucetdrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution"
        />

        {/* Additional SEO */}
        <meta
          name="keywords"
          content="token drops, crypto faucet, onchain rewards, web3 engagement, token distribution, blockchain rewards"
        />
        <meta name="author" content="FaucetDrops" />
        <link rel="canonical" href="https://app.faucetdrops.io/" />
        <meta name="theme-color" content="#020817" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          
          
           <PrivyProvider
              appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
              config={{
                loginMethods: ["google", "twitter", "discord", "github", "email"],
              }}
            >
            <SolanaProviders>
              <NetworkProvider>
                <PinSetupModal />
                <PinEntryModal />
                <WalletProvider >
                  <SignerBootstrap />
                  <PrivyImportModal
                      onDismiss={() => console.log("skipped")}
                      onComplete={({ evmAddress, solanaAddress }) => console.log(evmAddress, solanaAddress)}
                    />
                  <Providers>
                  <SubscriptionModalProvider>
                    <PresenceProvider>
                      <DMProvider>
                        <div className="min-h-screen flex flex-col">
                          <main className="flex-1">{children}</main>
                          <FooterWrapper />
                        </div>
                        <DMPanel />
                        <ThemedToaster />
                      </DMProvider>
                    </PresenceProvider>
                  </SubscriptionModalProvider>
                  </Providers>
                </WalletProvider>
              </NetworkProvider>
            </SolanaProviders>
          </PrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}