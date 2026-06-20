import { type Chain, defineChain } from "viem"
import { arbitrum, base, lisk, celo, bsc } from "viem/chains"

export const botchain = defineChain({
  id: 968,
  name: "Botchain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_BOTCHAIN_URL ?? "https://rpc.bohr.life"] },
  },
  blockExplorers: {
    default: { name: "Botchain Explorer", url: "https://scan.bohr.life" },
  },
  testnet: true,
})
export const solana = defineChain({
  id: 102,
  name: "Solana Devnet",
  nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_BOTCHAIN_URL ?? "https://api.devnet.solana.com"] },
  },
  blockExplorers: {
    default: { name: "Botchain Explorer", url: "https://solscan.io/?cluster=devnet" },
  },
  testnet: true,
})
export const supportedChains: [Chain, ...Chain[]] = [arbitrum, base, celo, lisk, bsc, botchain, solana]

export const CHAIN_RPC: Record<number, string> = {
  [arbitrum.id]: process.env.NEXT_PUBLIC_RPC_ARBITRUM ?? "https://arb1.llamarpc.com",
  [base.id]:     process.env.NEXT_PUBLIC_RPC_BASE     ?? "https://mainnet.base.org",
  [celo.id]:     process.env.NEXT_PUBLIC_RPC_CELO     ?? "https://forno.celo.org",
  [lisk.id]:     process.env.NEXT_PUBLIC_RPC_LISK     ?? "https://rpc.api.lisk.com",
  [bsc.id]:      process.env.NEXT_PUBLIC_RPC_BSC      ?? "https://bsc-dataseed.binance.org",
  [botchain.id]: process.env.NEXT_PUBLIC_BOTCHAIN_URL ?? "https://rpc.bohr.life",
  [solana.id]: process.env.NEXT_PUBLIC_BOTCHAIN_URL ?? "https://api.devnet.solana.com",

}

export const CHAIN_EXPLORERS: Record<number, { name: string; url: string }> = {
  [arbitrum.id]: { name: "Arbiscan",  url: "https://arbiscan.io"  },
  [base.id]:     { name: "Basescan",  url: "https://basescan.org" },
  [celo.id]:     { name: "Celoscan",  url: "https://celoscan.io"  },
  [lisk.id]:     { name: "Lisk Scan", url: "https://liskscan.com" },
  [bsc.id]:      { name: "BscScan",   url: "https://bscscan.com"  },
  [botchain.id]: { name: "Botchain Explorer", url: "https://scan.bohr.life" },
  [solana.id]: { name: "Botchain Explorer", url: "https://solscan.io/?cluster=devnet" },
}

export const DEFAULT_CHAIN_ID = celo.id
export const DEFAULT_CHAIN    = celo

