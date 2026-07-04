// lib/getTokenPrice.ts
import { getGoodDollarPrice } from "./getGoodDollarPrice";
import { getWBotPrice } from "./getWBotPrice";
import { CELO_CHAIN_ID, BOTCHAIN_CHAIN_ID } from "./chain";

export async function getGTokenPrice(chainId: number): Promise<number> {
  switch (chainId) {
    case CELO_CHAIN_ID:
      return getGoodDollarPrice();       // existing CoinGecko flow
    case BOTCHAIN_CHAIN_ID:
      return getWBotPrice();             // new on-chain pool read
    default:
      throw new Error(`No price feed for chain ${chainId}`);
  }
}