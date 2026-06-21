"use client"

import { useCallback, useRef, useState } from "react"
import { useWallet, API_BASE } from "@/components/wallet-provider"
import { toast } from "sonner"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EvmTx {
  to?:          string
  value?:       string | number | bigint
  data?:        string
  gas?:         number
  gasPrice?:    string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce?:       number
  [key: string]: unknown
}

export interface SignResult {
  chain:       "evm" | "solana" | "stellar"
  chain_id?:   number
  from:        string
  tx_hash?:    string
  signed_raw?: string          // EVM: hex-encoded signed tx
  signed_tx_b64?: string       // Solana: base64 signed tx
  signed_tx_xdr?: string       // Stellar: XDR
  broadcast:   boolean
}

interface SignEvmParams {
  chainId:   number
  tx:        EvmTx
  broadcast?: boolean
}

interface SignSolanaParams {
  txB64:     string   // base64 unsigned transaction
  broadcast?: boolean
}

interface SignStellarParams {
  txXdr:     string   // base64 XDR unsigned envelope
  broadcast?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN entry UI — a modal-style overlay rendered into document.body.
// Replace this with your own <PinEntryModal> component if you want full
// styling control; the interface (resolve / reject) stays the same.
// ─────────────────────────────────────────────────────────────────────────────

function promptPin(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Import dynamically so the modal can be swapped without touching this file
    import("@/components/pin-entry")
      .then(({ openPinEntryModal }) => openPinEntryModal(resolve, reject))
      .catch(() => {
        // Fallback: browser prompt (good enough for dev, swap for production)
        const pin = window.prompt("Enter your 6-digit transaction PIN")
        if (!pin) reject(new Error("cancelled"))
        else resolve(pin)
      })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Signing grant cache
//
// A signing_grant is valid for PIN_GRANT_TTL_SECONDS (default 5 min).
// We cache it in memory so the user isn't prompted for every step of a
// multi-tx flow, but we always re-verify on expiry or after an error.
// ─────────────────────────────────────────────────────────────────────────────

interface GrantCache {
  token:     string
  expiresAt: number  // ms since epoch
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSignTransaction() {
  const { session } = useWallet()
  const grantRef    = useRef<GrantCache | null>(null)
  const [signing,   setSigning] = useState(false)

  // ── Get (or refresh) a signing grant ─────────────────────────────────────
  const ensureGrant = useCallback(async (): Promise<string> => {
    const now = Date.now()
    // Reuse if still valid (10 s buffer so we don't use a grant that's
    // about to expire mid-request)
    if (grantRef.current && grantRef.current.expiresAt - now > 10_000) {
      return grantRef.current.token
    }

    const token = session?.token
    if (!token) throw new Error("Not authenticated")

    // Ask user for PIN
    const pin = await promptPin()

    const res = await fetch(`${API_BASE}/wallet/verify-pin`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ pin }),
    })

    const data = await res.json()

    if (res.status === 429) {
      throw new Error("Too many wrong attempts — wait a few minutes and try again.")
    }
    if (res.status === 400) {
      throw new Error("No PIN set. Set a PIN in your wallet settings first.")
    }
    if (!res.ok) {
      throw new Error(data.detail ?? "PIN verification failed")
    }

    // Cache the grant
    grantRef.current = {
      token:     data.signing_grant,
      expiresAt: now + data.expires_in * 1000,
    }

    return data.signing_grant
  }, [session?.token])

  // ── Internal sign call ────────────────────────────────────────────────────
  const callSign = useCallback(async (body: Record<string, unknown>): Promise<SignResult> => {
    const token = session?.token
    if (!token) throw new Error("Not authenticated")

    const signingGrant = await ensureGrant()

    const res = await fetch(`${API_BASE}/wallet/sign-transaction`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ ...body, signing_grant: signingGrant }),
    })

    const data = await res.json()

    if (!res.ok) {
      // If the grant was rejected (e.g. clock skew / race), invalidate cache
      if (res.status === 401) grantRef.current = null
      throw new Error(data.detail ?? "Signing failed")
    }

    return data as SignResult
  }, [session?.token, ensureGrant])

  // ── Public helpers ────────────────────────────────────────────────────────

  const signEvm = useCallback(async ({
    chainId, tx, broadcast = false,
  }: SignEvmParams): Promise<SignResult> => {
    setSigning(true)
    try {
      return await callSign({ chain_id: chainId, evm_tx: tx, broadcast })
    } catch (err: any) {
      if (err.message !== "cancelled") toast.error(err.message)
      throw err
    } finally {
      setSigning(false)
    }
  }, [callSign])

  const signSolana = useCallback(async ({
    txB64, broadcast = false,
  }: SignSolanaParams): Promise<SignResult> => {
    setSigning(true)
    try {
      return await callSign({ chain_id: 900, solana_tx_b64: txB64, broadcast })
    } catch (err: any) {
      if (err.message !== "cancelled") toast.error(err.message)
      throw err
    } finally {
      setSigning(false)
    }
  }, [callSign])

  const signStellar = useCallback(async ({
    txXdr, broadcast = false,
  }: SignStellarParams): Promise<SignResult> => {
    setSigning(true)
    try {
      return await callSign({ chain_id: 901, stellar_tx_xdr: txXdr, broadcast })
    } catch (err: any) {
      if (err.message !== "cancelled") toast.error(err.message)
      throw err
    } finally {
      setSigning(false)
    }
  }, [callSign])

  /** Manually invalidate the cached grant (e.g. after logout or account switch) */
  const invalidateGrant = useCallback(() => {
    grantRef.current = null
  }, [])

  return {
    signEvm,
    signSolana,
    signStellar,
    signing,
    invalidateGrant,
  }
}