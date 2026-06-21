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

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    const signingGrant = await this.ensureGrant()
    const res = await fetch(`${API_BASE}/wallet/sign-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ chain_id: this.chainId, evm_tx: tx, broadcast: true, signing_grant: signingGrant }),
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