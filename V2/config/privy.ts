"use client"

import { type Chain } from 'viem'
import { arbitrum, base, lisk, celo, avalanche, bsc } from 'viem/chains'
import type { PrivyClientConfig } from '@privy-io/react-auth' // Ensure this is imported!

export const supportedChains: [Chain, ...Chain[]] = [
  arbitrum,
  base,
  celo,
  lisk,
  bsc,
  avalanche,
]

// Explicitly type the export to enforce strict checking
export const privyConfig: { appId: string; config: PrivyClientConfig } = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  config: {
    appearance: {
      // FIX 1: Set a strict static fallback. 
      // (The dynamic light/dark switch still happens in Providers.tsx!)
      theme: "dark", 
      accentColor: '#3b82f6',
      logo: 'https://FaucetDrops.io/favicon.png',
      landingHeader: 'Join FaucetDrops',
      loginMessage: 'Connect to start your onchain journey',
    },
    loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord', 'telegram', 'farcaster'],
    embeddedWallets: {
      // FIX 2: In the latest Privy SDK, embedded wallet rules are scoped by chain ecosystem
      ethereum: {
        createOnLogin: 'all-users',
      },
      // Note: 'requireUserPasswordOnCreate' and 'noPromptOnSignature' were deprecated/moved 
      // in recent SDK versions and are now managed via your Privy Dashboard.
    },
    defaultChain: celo,
    supportedChains,
    walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  }
}