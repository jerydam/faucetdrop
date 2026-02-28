"use client"

import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { privyConfig, supportedChains } from '@/config/privy'
import { http } from 'viem'
import { createConfig } from 'wagmi'
import { useTheme } from 'next-themes' // 💡 NEW: Import useTheme
import { useEffect, useState } from 'react' // 💡 NEW: For hydration fix

// Create wagmi config once
const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [supportedChains[0].id]: http(),
    [supportedChains[1].id]: http(),
    [supportedChains[2].id]: http(),
    [supportedChains[3].id]: http(),
    [supportedChains[4].id]: http(),
    [supportedChains[5].id]: http(),
  },
})

// Create query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// 💡 NEW: We create an inner component to safely access the theme context
function PrivyThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by waiting for the theme to mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Safely resolve the theme (resolves "system" to either "light" or "dark")
  const currentTheme = mounted && resolvedTheme === 'light' ? 'light' : 'dark'

  return (
    <PrivyProvider
      appId={privyConfig.appId}
      config={{
        ...privyConfig.config,
        appearance: {
          ...privyConfig.config.appearance,
          theme: currentTheme, // 💡 Dynamically inject the theme here!
        }
      }}
    >
      {children}
    </PrivyProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Note: Ensure <ThemeProvider> from next-themes is wrapping this in your layout.tsx!
    <PrivyThemeProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyThemeProvider>
  )
}