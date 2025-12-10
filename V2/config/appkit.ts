import { http, createConfig } from 'wagmi'
import { celo, celoAlfajores, lisk, liskSepolia, base, baseSepolia, arbitrum } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { QueryClient } from '@tanstack/react-query'

// Create Wagmi config with Farcaster connector
export const wagmiConfig = createConfig({
  chains: [celo,  base],
  transports: {
    [celo.id]: http(),
    [base.id]: http(),
   
  },
  connectors: [
    farcasterMiniApp(), // This is the critical connector for Farcaster
  ],
})

export const queryClient = new QueryClient()

// Export for backward compatibility if needed
export const wagmiAdapter = {
  wagmiConfig
}