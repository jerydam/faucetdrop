// config/privy.ts
"use client"

import { type Chain } from 'viem'
import { arbitrum, base, lisk, celo } from 'viem/chains'
import { createConfig, http } from 'wagmi'

export const supportedChains: [Chain, ...Chain[]] = [
  arbitrum,
  base,
  celo,
  lisk
]

export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [arbitrum.id]: http(),
    [base.id]: http(),
    [celo.id]: http(),
    [lisk.id]: http(),
  },
})

// Privy configuration (EVM only, Solana fully disabled)
export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  config: {
    appearance: {
      theme: 'dark', // Changed from 'light' to match your app
      accentColor: '#3b82f6', // Matches your existing blue buttons
      // Updated to use the image you were using in the custom modal
      logo: typeof window !== 'undefined' ? `${window.location.origin}/favicon.png` : 'https://faucetdrops.io/favicon.png',
      landingHeader: 'Join FaucetDrops',
      loginMessage: 'Connect to start your onchain journey',
    },
    loginMethods: [
      'email',
      'wallet',
      
    ] as const,  // ← This "as const" fixes the TypeScript error
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const,
      solana: false,  // ← Explicitly disables all Solana wallet features
      noPromptOnSignature: false,
    },
    defaultChain: celo,
    supportedChains,
    externalWallets: {
      coinbaseWallet: {
        connectionOptions: 'all'
      }
    }
  }
}