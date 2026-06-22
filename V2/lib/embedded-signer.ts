// lib/embedded-signer.ts
import { AbstractSigner, type Provider, type TransactionRequest, type TransactionResponse } from "ethers"
import { API_BASE } from "@/components/wallet-provider"
import { openPinEntryModal } from "@/components/pin-entry"

export class EmbeddedBackendSigner extends AbstractSigner {
  constructor(
    private addr: string,
    private token: string,
    private chainId: number,
    provider?: Provider,
  ) { super(provider) }

  async getAddress(): Promise<string> { return this.addr }

  connect(provider: Provider | null): EmbeddedBackendSigner {
    return new EmbeddedBackendSigner(this.addr, this.token, this.chainId, provider ?? undefined)
  }

  private grant: { token: string; expiresAt: number } | null = null

  private async ensureGrant(): Promise<string> {
    const now = Date.now()
    if (this.grant && this.grant.expiresAt - now > 10_000) return this.grant.token

    const pin = await new Promise<string>((resolve, reject) => openPinEntryModal(resolve, reject))
    const res = await fetch(`${API_BASE}/wallet/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ pin }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail ?? "PIN verification failed")
    this.grant = { token: data.signing_grant, expiresAt: now + data.expires_in * 1000 }
    return this.grant.token
  }

  async signTransaction(): Promise<string> {
    throw new Error("Use sendTransaction — embedded wallets sign and broadcast in one backend call")
  }

  /**
   * Ethers' TransactionRequest uses field names/types (gasLimit, bigint
   * value, a possibly-lazy `to`, etc.) that don't match what the Python
   * backend expects (gas, plain hex strings, etc). Passing the raw ethers
   * object straight through causes a shape mismatch that the backend
   * can't always catch cleanly — it surfaces as a 400 "Gas estimation
   * failed" once `w3.eth.estimate_gas` chokes on the malformed dict, or
   * worse, `JSON.stringify` throws outright on an unconverted bigint.
   * Normalize to a plain, backend-shaped object before sending.
   */
  private async toBackendTx(tx: TransactionRequest): Promise<Record<string, unknown>> {
    const to   = tx.to   ? await tx.to   : undefined   // `to` can be a Promise<string> in ethers
    const from = tx.from ? await tx.from : this.addr

    const out: Record<string, unknown> = { from }
    if (to !== undefined) out.to = to
    if (tx.data !== undefined && tx.data !== null) out.data = tx.data

    // bigint / BigNumberish -> hex string. Never pass a bigint to JSON.stringify.
    const toHex = (v: unknown): string | undefined => {
      if (v === undefined || v === null) return undefined
      if (typeof v === "bigint") return "0x" + v.toString(16)
      if (typeof v === "number") return "0x" + v.toString(16)
      if (typeof v === "string") return v.startsWith("0x") ? v : "0x" + BigInt(v).toString(16)
      return undefined
    }

    if (tx.value !== undefined) out.value = toHex(tx.value)
    if (tx.nonce !== undefined) out.nonce = Number(tx.nonce)

    // ethers calls it gasLimit; the backend (_sign_evm) checks for "gas"
    if (tx.gasLimit !== undefined) out.gas = toHex(tx.gasLimit)

    if (tx.gasPrice !== undefined) out.gasPrice = toHex(tx.gasPrice)
    if (tx.maxFeePerGas !== undefined) out.maxFeePerGas = toHex(tx.maxFeePerGas)
    if (tx.maxPriorityFeePerGas !== undefined) out.maxPriorityFeePerGas = toHex(tx.maxPriorityFeePerGas)

    return out
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    const signingGrant = await this.ensureGrant()
    const evmTx = await this.toBackendTx(tx)

    const res = await fetch(`${API_BASE}/wallet/sign-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ chain_id: this.chainId, evm_tx: evmTx, broadcast: true, signing_grant: signingGrant }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail ?? "Transaction failed")
    if (!this.provider) throw new Error("Signer has no provider attached — pass one via .connect()")
    const sent = await this.provider.getTransaction(data.tx_hash)
    if (!sent) throw new Error("Backend broadcast succeeded but provider can't find the tx yet")
    return sent
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const res = await fetch(`${API_BASE}/wallet/sign-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ message: typeof message === "string" ? message : Buffer.from(message).toString("hex") }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail ?? "Message signing failed")
    return data.signature
  }

  async signTypedData(): Promise<string> {
    throw new Error("Typed-data signing not yet supported for embedded wallets")
  }
}