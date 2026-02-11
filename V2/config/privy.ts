// config/privy.ts
"use client"

import { type Chain } from 'viem'
import { arbitrum, base, lisk, celo } from 'viem/chains'

export const supportedChains: [Chain, ...Chain[]] = [
  arbitrum,
  base,
  celo,
  lisk
]

// Privy configuration - supports BOTH embedded and external wallets
export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  config: {
    appearance: {
      theme: 'dark' as const,
      accentColor: '#3b82f6',
      logo: 'https://faucetdrops.io/favicon.png',
      landingHeader: 'Join FaucetDrops',
      loginMessage: 'Connect to start your onchain journey',
    },
    // All login methods available
    loginMethods: ['email', 'google', 'wallet'] as const,
    embeddedWallets: {
      createOnLogin: 'all-users' as const, // CHANGED: Always create embedded wallet
      requireUserPasswordOnCreate: false,
      noPromptOnSignature: false,
    },
    defaultChain: celo,
    supportedChains,
    walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  }
}