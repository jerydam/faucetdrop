import { CELO_CHAIN_ID, BOTCHAIN_CHAIN_ID } from "@/lib/chain";

export interface SwapOutToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export interface SwapRoute {
  /** Intermediate hop tokens, empty for a direct pool */
  mids: string[];
  /** One fee tier per hop — length must be mids.length + 1 */
  fees: number[];
  label: string;
}

export interface SwapChainConfig {
  /** Uniswap-V3-style router (SwapRouter02 interface) */
  router: string;
  /** QuoterV2 */
  quoter: string;
  /** Your deployed DropsSwap wrapper — null until deployed on this chain */
  dropsSwap: string | null;
  /** Token being sold */
  tokenIn: string;
  tokenInSymbol: string;
  outTokens: SwapOutToken[];
  /** out-token symbol → candidate routes; best live quote wins */
  routes: Record<string, SwapRoute[]>;
}

/* ── Celo mainnet ─────────────────────────────────────────────────────────
   Routes verified against the Uniswap V3 factory: G$ only has real depth
   against USDm (1%) and CELO (1%). Stables bridge through those.          */

const CELO_G$   = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";
const CELO_USDM = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // Mento Dollar (ex-cUSD)
const CELO_USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const CELO_USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
const CELO      = "0x471EcE3750Da237f93B8E339c536989b8978a438";

const celoSwapConfig: SwapChainConfig = {
  router:        "0x5615CDAb10dc425a742d643d949a7F474C01abc4", // SwapRouter02
  quoter:        "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8", // QuoterV2
  dropsSwap:     "0x2FB3B5f7075f17D4a97889e81dacEFA26dCf7171", // ← paste your deployed DropsSwap address here
  tokenIn:       CELO_G$,
  tokenInSymbol: "$G",
  outTokens: [
    { symbol: "USDm", name: "Mento Dollar", address: CELO_USDM, decimals: 18 },
    { symbol: "USDC", name: "USD Coin",     address: CELO_USDC, decimals: 6  },
    { symbol: "USDT", name: "Tether USD",   address: CELO_USDT, decimals: 6  },
  ],
  routes: {
    USDm: [
      { mids: [],          fees: [10000],      label: "Direct 1%" },
    ],
    USDC: [
      { mids: [CELO_USDM], fees: [10000, 100], label: "via USDm"  },
      { mids: [CELO],      fees: [10000, 500], label: "via CELO"  },
    ],
    USDT: [
      { mids: [CELO_USDM], fees: [10000, 100], label: "via USDm"  },
      { mids: [CELO],      fees: [10000, 500], label: "via CELO"  },
    ],
  },
};

/* ── Botchain ─────────────────────────────────────────────────────────────
   Not yet configured. Fill this in once a DEX with WBOT liquidity exists.
   NOTE: this shape assumes a Uniswap V3-style router. If Botchain only has
   a V2 fork, it needs a separate code path — see notes.                   */

const botchainSwapConfig: SwapChainConfig | undefined = undefined;

export const SWAP_CONFIG: Record<number, SwapChainConfig | undefined> = {
  [CELO_CHAIN_ID]:     celoSwapConfig,
  [BOTCHAIN_CHAIN_ID]: botchainSwapConfig,
};

export function getSwapConfig(chainId: number): SwapChainConfig | undefined {
  return SWAP_CONFIG[chainId];
}

/* ── Path + quoting helpers ───────────────────────────────────────────── */

export function encodeV3Path(tokens: string[], fees: number[]): string {
  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    path += tokens[i].slice(2) + fees[i].toString(16).padStart(6, "0");
  }
  return (path + tokens[tokens.length - 1].slice(2)).toLowerCase();
}

export function buildCandidatePaths(cfg: SwapChainConfig, out: SwapOutToken) {
  return (cfg.routes[out.symbol] ?? []).map(r => ({
    path:  encodeV3Path([cfg.tokenIn, ...r.mids, out.address], r.fees),
    label: r.label,
  }));
}

/** Raw eth_call to QuoterV2 — avoids ethers request batching, which some
 *  public RPCs reject. Throws on revert so callers can log the reason. */
export async function quoteExactInputRaw(
  rpcUrl: string,
  quoter: string,
  path: string,
  amountIn: bigint,
): Promise<bigint> {
  const p = path.replace(/^0x/, "");
  const data =
    "0xcdca1753" +                                    // quoteExactInput(bytes,uint256)
    (64).toString(16).padStart(64, "0") +
    amountIn.toString(16).padStart(64, "0") +
    (p.length / 2).toString(16).padStart(64, "0") +
    p + "0".repeat((64 - (p.length % 64)) % 64);

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "eth_call",
      params: [{ to: quoter, data }, "latest"],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "quoter reverted");
  if (!json.result || json.result === "0x") throw new Error("empty quoter result");
  return BigInt("0x" + json.result.slice(2, 66));
}