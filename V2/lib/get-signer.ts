// lib/get-signer.ts
import { JsonRpcProvider, Wallet, type JsonRpcSigner } from "ethers"

type SignerGetter = (chainId?: number) => Promise<JsonRpcSigner | Wallet | null>

// Module-level reference — set once on app boot from a client component
let _getActiveSigner: SignerGetter | null = null

export function registerSignerGetter(fn: SignerGetter) {
  _getActiveSigner = fn
}

export async function getActiveSigner(
  chainId?: number
): Promise<JsonRpcSigner | Wallet> {
  if (!_getActiveSigner) {
    throw new Error("Signer not initialized — call registerSignerGetter first")
  }
  const s = await _getActiveSigner(chainId)
  if (!s) throw new Error("Could not get signer — wallet not connected or session expired")
  return s
}