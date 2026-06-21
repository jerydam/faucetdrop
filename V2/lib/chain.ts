import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  type Chain,
} from "viem";
 

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;          // for compact UI (badges, pills)
  icon: string;                // emoji or local asset path
  rpcUrl: string;
  explorerUrl: string;
  explorerName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  contracts: {
    dropsToken: `0x${string}`;
    quizHub: `0x${string}`;
    dropsRedeemPool?: `0x${string}`;
    gToken?: `0x${string}`;     // only Celo has $G for now
  };
  // Flip to false to hide a chain from the switcher without deleting config
  // (handy for "Botchain not live yet" type states).
  enabled: boolean;
}

export const CELO_CHAIN_ID = 42220;
export const BOTCHAIN_CHAIN_ID = 968; // ← placeholder, swap when Botchain assigns a real chain ID

export const CHAINS: Record<number, ChainConfig> = {
  [CELO_CHAIN_ID]: {
    id: CELO_CHAIN_ID,
    name: "Celo Mainnet",
    shortName: "Celo",
    icon: "🟡",
    rpcUrl: "https://forno.celo.org",
    explorerUrl: "https://celoscan.io",
    explorerName: "CeloScan",
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
    contracts: {
      dropsToken: (process.env.NEXT_PUBLIC_DROPS_CONTRACT_CELO ??
        "0x213DF7A728E545BdAff8ff8c4BF9cFD7359Def0B") as `0x${string}`,
      quizHub: (process.env.NEXT_PUBLIC_QUIZ_HUB_CELO ??
        "0xB19aA952c94faB37716131D8C3d9Bb564e6253Ed") as `0x${string}`,
      dropsRedeemPool: (process.env.NEXT_PUBLIC_DROPS_REDEEM_POOL_CELO ??
        "0xBC6D8A2D7CB11273834f46e8ad9047ca46AA4553") as `0x${string}`,
      gToken: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
    },
    enabled: true,
  },

  [BOTCHAIN_CHAIN_ID]: {
    id: BOTCHAIN_CHAIN_ID,
    name: "Botchain",
    shortName: "Botchain",
    icon: "🤖",
    // ← placeholder RPC, swap once Botchain ships a public endpoint
    rpcUrl: process.env.NEXT_PUBLIC_BOTCHAIN_RPC_URL ?? "https://rpc.botchain.example",
    explorerUrl: process.env.NEXT_PUBLIC_BOTCHAIN_EXPLORER_URL ?? "https://explorer.botchain.example",
    explorerName: "BotchainScan",
    nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
    contracts: {
      // ← placeholders — Botchain is EVM-compatible so the same ABIs apply,
      // just swap these addresses once deployed.
      dropsToken: (process.env.NEXT_PUBLIC_DROPS_CONTRACT_BOTCHAIN ??
        "0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1") as `0x${string}`,
      quizHub: (process.env.NEXT_PUBLIC_QUIZ_HUB_BOTCHAIN ??
        "0x90Fae824F272e502f9f565f280485F84157Ca731") as `0x${string}`,
      dropsRedeemPool: (process.env.NEXT_PUBLIC_DROPS_REDEEM_POOL_CELO ??
        "0x4B8c7A12660C4847c65662a953F517198fBFc0ED") as `0x${string}`,  
      gToken: "0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1",
      // No DROPS redeem pool / $G on Botchain yet — buy/redeem-to-$G flow
      // stays Celo-only until that's live there too.
    },
    enabled: true,
  },
};

export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);

export const DEFAULT_CHAIN_ID = CELO_CHAIN_ID;

export function getChainConfig(chainId: number | null | undefined): ChainConfig {
  if (chainId && CHAINS[chainId]) return CHAINS[chainId];
  return CHAINS[DEFAULT_CHAIN_ID];
}

export function isSupportedChain(chainId: number | null | undefined): boolean {
  return !!chainId && chainId in CHAINS && CHAINS[chainId].enabled;
}

export function getEnabledChains(): ChainConfig[] {
  return Object.values(CHAINS).filter(c => c.enabled);
}

/** Hex chain ID for wallet_switchEthereumChain / wallet_addEthereumChain */
export function toHexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

/** Build the params object EIP-1193 wallets expect for wallet_addEthereumChain */
export function toAddEthereumChainParams(chainId: number) {
  const c = getChainConfig(chainId);
  return {
    chainId: toHexChainId(c.id),
    chainName: c.name,
    nativeCurrency: c.nativeCurrency,
    rpcUrls: [c.rpcUrl],
    blockExplorerUrls: [c.explorerUrl],
  };
}
// ── Network switching ─────────────────────────────────────────────────────────

/**
 * Switch the injected wallet to the given chain, adding it if needed.
 * Works for any chain in lib/chain.ts — not Celo-specific.
 */
export async function ensureChainNetwork(chainId: number): Promise<void> {
  if (!window.ethereum) throw new Error("No wallet detected.");
  const current = await (window.ethereum as any).request({ method: "eth_chainId" });
  if (parseInt(current, 16) === chainId) return;

  try {
    await (window.ethereum as any).request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: toHexChainId(chainId) }],
    });
  } catch (switchErr: any) {
    if (switchErr.code === 4902) {
      await (window.ethereum as any).request({
        method: "wallet_addEthereumChain",
        params: [toAddEthereumChainParams(chainId)],
      });
    } else {
      throw switchErr;
    }
  }
}

// ── Viem client factory ───────────────────────────────────────────────────────

/**
 * Returns a viem Chain object built from our ChainConfig so we never
 * have to hard-code `celo` from "viem/chains".
 */
export function toViemChain(chainId: number): Chain {
  const cfg = getChainConfig(chainId);
  return {
    id:             cfg.id,
    name:           cfg.name,
    nativeCurrency: cfg.nativeCurrency,
    rpcUrls:        { default: { http: [cfg.rpcUrl] } },
    blockExplorers: { default: { name: cfg.explorerName, url: cfg.explorerUrl } },
  } as Chain;
}

/**
 * Creates a viem WalletClient using the injected provider for the given chain.
 * Use for write operations (sendTransaction, writeContract).
 */
export function makeWalletClient(chainId: number) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found — use getActiveSigner() for embedded wallets.");
  }
  return createWalletClient({
    chain:     toViemChain(chainId),
    transport: custom(window.ethereum!),
  });
}

/**
 * Creates a viem PublicClient using the chain's own RPC URL.
 * Use for read operations and waitForTransactionReceipt.
 */
export function makePublicClient(chainId: number) {
  const cfg = getChainConfig(chainId);
  return createPublicClient({
    chain:     toViemChain(chainId),
    transport: http(cfg.rpcUrl),
  });
}
 