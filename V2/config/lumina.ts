import { type Chain } from 'viem'
import { arbitrum, base, lisk, celo, bsc } from 'viem/chains'

// ── Supported EVM chains (unchanged from Privy config) ────────────────────────
export const supportedChains: [Chain, ...Chain[]] = [
  arbitrum,
  base,
  celo,
  lisk,
  bsc,
]

// ── Chain → RPC mapping ───────────────────────────────────────────────────────
// Override with paid RPC URLs via env vars in production.
export const CHAIN_RPC: Record<number, string> = {
  [arbitrum.id]: process.env.NEXT_PUBLIC_RPC_ARBITRUM ?? 'https://arb1.llamarpc.com',
  [base.id]:     process.env.NEXT_PUBLIC_RPC_BASE     ?? 'https://mainnet.base.org',
  [celo.id]:     process.env.NEXT_PUBLIC_RPC_CELO     ?? 'https://forno.celo.org',
  [lisk.id]:     process.env.NEXT_PUBLIC_RPC_LISK     ?? 'https://rpc.api.lisk.com',
  [bsc.id]:      process.env.NEXT_PUBLIC_RPC_BSC      ?? 'https://bsc-dataseed.binance.org',
}

// ── Chain → block explorer ────────────────────────────────────────────────────
export const CHAIN_EXPLORERS: Record<number, { name: string; url: string }> = {
  [arbitrum.id]: { name: 'Arbiscan',    url: 'https://arbiscan.io'     },
  [base.id]:     { name: 'Basescan',    url: 'https://basescan.org'    },
  [celo.id]:     { name: 'Celoscan',    url: 'https://celoscan.io'     },
  [lisk.id]:     { name: 'Lisk Scan',   url: 'https://liskscan.com'    },
  [bsc.id]:      { name: 'BscScan',     url: 'https://bscscan.com'     },
}
export const DEFAULT_CHAIN_ID = celo.id  // 42220
// ── Lumina SDK config ─────────────────────────────────────────────────────────
export const luminaConfig = {
  apiKey:      process.env.NEXT_PUBLIC_LUMINA_API_KEY ?? '',
  environment: (process.env.NODE_ENV === 'production' ? 'production' : 'development') as
    'production' | 'development',
}

// ── Solana pseudo-chainId (kept for legacy compat in WalletContext) ───────────
export const SOLANA_CHAIN_ID = 102

// ── Default chain ─────────────────────────────────────────────────────────────
export const DEFAULT_CHAIN = celo