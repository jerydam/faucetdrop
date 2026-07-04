// lib/getWBotPrice.ts
import { ethers } from "ethers";

// From the docs screenshot
const BDEX_V2_FACTORY  = "0x117115f3B72C8d1989178089A67D0C26f8EE0AA3";
const WBOT_ADDRESS     = "0xD5452816194a3784dBa983426cCe7c122F4abd30";
const BOTCHAIN_RPC     = process.env.NEXT_PUBLIC_BOTCHAIN_RPC_URL ?? "https://rpc.botchain.ai";

// You'll need to find/confirm the stablecoin address on Botchain
// Check scan.botchain.ai for USDT or USDC deployed there
// Placeholder — replace with the real one from "Common Tokens (Mainnet)" section of docs
const STABLE_ADDRESS   = "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C"; // USDT or USDC on Botchain mainnet
const STABLE_DECIMALS  = 6;
const WBOT_DECIMALS    = 18;
const WBOT_FALLBACK_PRICE_USD = 9.7;

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
];

const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
];

// ── In-memory cache (mirrors getGoodDollarPrice pattern) ─────────────────────
let cached: { price: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

export async function getWBotPrice(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const provider = new ethers.JsonRpcProvider(BOTCHAIN_RPC);

    // 1. Resolve pair address from factory
    const factory = new ethers.Contract(BDEX_V2_FACTORY, FACTORY_ABI, provider);
    const pairAddress: string = await factory.getPair(WBOT_ADDRESS, STABLE_ADDRESS);

    if (!pairAddress || pairAddress === ethers.ZeroAddress) {
      console.warn("[getWBotPrice] Pair not found on BDEX V2, using fallback");
      return WBOT_FALLBACK_PRICE_USD;
    }

    // 2. Read reserves
    const pair   = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    const [reserves, token0] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
    ]);

    const isWBotToken0  = token0.toLowerCase() === WBOT_ADDRESS.toLowerCase();
    const reserveWBOT   = isWBotToken0 ? reserves[0] : reserves[1];
    const reserveStable = isWBotToken0 ? reserves[1] : reserves[0];

    // 3. Compute spot price
    const wbotNorm   = parseFloat(ethers.formatUnits(reserveWBOT,   WBOT_DECIMALS));
    const stableNorm = parseFloat(ethers.formatUnits(reserveStable, STABLE_DECIMALS));

    if (wbotNorm === 0) throw new Error("Zero WBOT reserve");

    const price = stableNorm / wbotNorm;

    // Sanity check — reject obviously bad prices
    if (price <= 0 || price > 100_000) throw new Error(`Suspicious price: ${price}`);

    cached = { price, fetchedAt: Date.now() };
    return price;

  } catch (err) {
    console.error("[getWBotPrice] Failed, using fallback:", err);
    // Return stale cache if available, otherwise hardcoded fallback
    return cached?.price ?? WBOT_FALLBACK_PRICE_USD;
  }
}