// providers/PrivyProvider.tsx
"use client"

import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { privyConfig, supportedChains } from '@/config/privy'
import { http } from 'viem'
import { createConfig } from 'wagmi'

// Create wagmi config for Privy
const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [supportedChains[0].id]: http(),
    [supportedChains[1].id]: http(),
    [supportedChains[2].id]: http(),
    [supportedChains[3].id]: http(),
    [supportedChains[4].id]: http(),
  },
})

// Create query client
const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={privyConfig.appId}
      config={privyConfig.config}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}