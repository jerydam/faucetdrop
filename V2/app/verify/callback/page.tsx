'use client';

// app/(integrator-demo)/verify/callback/page.tsx
//
// Handles the redirect back from Kakushō after proof generation.
//
// Query params received:
//   verified    = "true" | "false"
//   wallet      = Stellar address the proof was generated for
//   tx_hash     = Soroban transaction hash (optional)
//   state       = the FaucetDrops EVM address we passed in as state
//
// On success we persist the verified status to the backend, then
// redirect the user back to wherever they came from (default: home).

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet'; // adjust to your actual path

type Status = 'processing' | 'success' | 'error';

export default function VerifyCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { session } = useWallet();

  const [status, setStatus]   = useState<Status>('processing');
  const [message, setMessage] = useState('');
  const [txHash, setTxHash]   = useState('');

  useEffect(() => {
    const verified      = params.get('verified');
    const stellarWallet = params.get('wallet');   // Stellar address from Kakushō
    const hash          = params.get('tx_hash') ?? '';
    const evmAddress    = params.get('state');    // FaucetDrops EVM address we set as state

    setTxHash(hash);

    if (verified !== 'true' || !stellarWallet) {
      setStatus('error');
      setMessage(
        verified === 'false'
          ? 'Verification was cancelled or failed. Please try again.'
          : 'Verification result is missing required parameters.',
      );
      return;
    }

    // Persist verified status to FaucetDrops backend.
    // We send both addresses so the backend can link the KYC record to the
    // user's FaucetDrops account regardless of which key they query by.
    const token = session?.token;

    const persist = async () => {
      try {
        const res = await fetch('/api/kyc/mark-verified', {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            // Include auth token if the user is still logged in on this tab.
            // The backend should also accept verification by EVM address / stellar
            // address as a fallback in case the token session has expired.
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            stellar_address: stellarWallet,
            evm_address:     evmAddress ?? null,
            tx_hash:         hash || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail ?? `Server error ${res.status}`);
        }
      } catch (e: any) {
        // Non-fatal — proof is already on-chain; the backend can re-verify
        // from Soroban if needed. Log and continue.
        console.warn('[KYC callback] persist failed:', e.message);
      }
    };

    persist().then(() => {
      setStatus('success');
      setMessage('Your identity has been verified. You now have full access to FaucetDrops.');
      // Give the user a moment to read the success state before redirecting
      setTimeout(() => router.replace('/'), 2500);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
      <div className="rounded-lg border border-gray-700 bg-[#0d1117] shadow-sm w-full max-w-sm p-8 text-center space-y-4">

        {/* ── Processing ── */}
        {status === 'processing' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-100">Processing…</h2>
            <p className="text-gray-400 text-sm">Saving your verification result.</p>
          </>
        )}

        {/* ── Success ── */}
        {status === 'success' && (
          <>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 border border-green-700/50 mx-auto">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-100">Verified!</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
            {txHash && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-left">
                <p className="text-[10px] text-gray-500 font-mono mb-1">TX HASH</p>
                <p className="text-[11px] text-gray-400 font-mono break-all">{txHash}</p>
              </div>
            )}
            <p className="text-gray-600 text-xs">Redirecting you home…</p>
          </>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-900/30 border border-red-700/50 mx-auto">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-100">Verification Failed</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => router.replace('/verify')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-md transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => router.replace('/')}
                className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
              >
                Back to home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}