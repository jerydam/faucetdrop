'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verified = params.get('verified');
    const wallet = params.get('wallet');
    const txHash = params.get('tx_hash');
    const state = params.get('state'); // the EVM account address we passed in

    if (verified !== 'true' || !wallet) {
      setStatus('error');
      setMessage('Verification was not completed.');
      return;
    }

    // TODO: persist the verified status to your Supabase DB here
    // e.g. await fetch('/api/kyc/mark-verified', { method: 'POST', body: JSON.stringify({ wallet, stellarAddress: wallet, txHash }) })

    console.log('KYC verified:', { wallet, txHash, evmAccount: state });

    setStatus('success');
    setMessage('Your identity has been verified.');

    // Redirect back to home after 2s
    setTimeout(() => router.replace('/'), 2000);
  }, []);

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
      <div className="rounded-lg border border-gray-700 bg-[#020817] shadow-sm w-full max-w-sm p-8 text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto" />
            <p className="text-gray-300 text-sm">Processing verification result...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto" />
            <h2 className="text-xl font-bold text-gray-100">Verified!</h2>
            <p className="text-gray-400 text-sm">{message}</p>
            <p className="text-gray-600 text-xs">Redirecting you home...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-10 w-10 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-gray-100">Verification Failed</h2>
            <p className="text-gray-400 text-sm">{message}</p>
            <button
              onClick={() => router.replace('/verify')}
              className="text-blue-400 text-sm hover:underline"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}