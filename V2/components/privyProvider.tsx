"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LuminaProvider} from "@jerydam/lumina-sdk"
import { luminaConfig } from '@/config/lumina'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 minute
      gcTime:    5 * 60 * 1000,   // 5 minutes
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LuminaProvider
      apiKey={luminaConfig.apiKey}
      environment={luminaConfig.environment}
      theme="dark"
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </LuminaProvider>
  )
}