'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { Loader2, CheckCircle, Shield, ArrowLeft, Smartphone, Upload, AlertCircle, User } from 'lucide-react';
import LoadingPage from '@/components/loading';
import { useWallet } from '@/hooks/use-wallet';

const KAKUSHO_URL = process.env.NEXT_PUBLIC_KAKUSHO_URL ?? 'https://kakusho-protocol.vercel.app';
const INTEGRATOR_ID = process.env.NEXT_PUBLIC_KAKUSHO_INTEGRATOR_ID ?? '6307ca06c7cec4a529f6b3b66cbef7a11f9cf6a44e066aa8c4cd2f11aaa043e9';

type Phase = 'loading' | 'checking' | 'already_verified' | 'ready' | 'done' | 'error';
type DesktopMode = 'choose' | 'qr' | 'upload';

export default function VerifyPage() {
  const router = useRouter();
  const { stellarAddress, address: evmAddress, isConnected, fetchNonEvmAddresses, setShowModal } = useWallet();

  const [phase, setPhase]             = useState<Phase>('loading');
  const [errorMsg, setErrorMsg]       = useState('');
  const [desktopMode, setDesktopMode] = useState<DesktopMode>('choose');
  const [sessionId]                   = useState(() => crypto.randomUUID());
  const [mobileUrl, setMobileUrl]     = useState('');

  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad/i.test(navigator.userAgent);
  const fmt = (a: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';

  // ── Resolve stellar address ───────────────────────────────────────────────

  useEffect(() => {
    if (!isConnected) { setPhase('ready'); return; }
    if (stellarAddress) { checkAlreadyVerified(stellarAddress); return; }
    fetchNonEvmAddresses().catch(() => {});
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected || !stellarAddress || phase !== 'loading') return;
    checkAlreadyVerified(stellarAddress);
  }, [stellarAddress]);

  async function checkAlreadyVerified(stellar: string) {
    setPhase('checking');
    try {
      const res  = await fetch(`${KAKUSHO_URL}/api/kakusho/verify/status?integrator_id=${INTEGRATOR_ID}&stellar_address=${stellar}`);
      const data = await res.json();
      if (data.verified) { setPhase('already_verified'); return; }
    } catch { /* non-fatal */ }
    setPhase('ready');
  }

  // ── Build mobile/QR URL ───────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'ready' || !stellarAddress) return;
    const callbackUrl = `${window.location.origin}/verify/callback`;
    const url =
      `${KAKUSHO_URL}/verify` +
      `?integrator_id=${INTEGRATOR_ID}` +
      `&stellar_address=${encodeURIComponent(stellarAddress)}` +
      `&evm_address=${encodeURIComponent(evmAddress ?? '')}` +
      `&callback_url=${encodeURIComponent(callbackUrl)}` +
      `&state=${encodeURIComponent(evmAddress ?? '')}`;
    setMobileUrl(url);
  }, [phase, stellarAddress, evmAddress]);

  // ── Desktop upload path — redirect to Kakushō with upload mode flag ───────

  function handleDesktopUpload() {
    if (!stellarAddress) return;
    const callbackUrl = `${window.location.origin}/verify/callback`;
    const url = new URL(`${KAKUSHO_URL}/verify`);
    url.searchParams.set('integrator_id',   INTEGRATOR_ID);
    url.searchParams.set('stellar_address', stellarAddress);
    url.searchParams.set('evm_address',     evmAddress ?? '');
    url.searchParams.set('callback_url',    callbackUrl);
    url.searchParams.set('state',           evmAddress ?? '');
    url.searchParams.set('input_mode',      'upload'); // tells Kakushō to show file inputs
    window.location.href = url.toString();
  }

  // ── Poll for QR session completion ────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'ready' || isMobile || desktopMode !== 'qr') return;

    const iv = setInterval(async () => {
      try {
        const res  = await fetch(`/api/kakusho/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'done') {
          clearInterval(iv);
          setPhase('done');
        }
        if (data.status === 'error') {
          clearInterval(iv);
          setErrorMsg(data.error ?? 'Verification failed on phone.');
          setPhase('error');
        }
      } catch { /* keep polling */ }
    }, 2000);

    return () => clearInterval(iv);
  }, [phase, isMobile, desktopMode, sessionId]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'loading' || phase === 'checking') return <LoadingPage />;

  if (phase === 'already_verified') return (
    <Screen>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 border border-green-700/50 mx-auto">
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-100">Already Verified</h2>
        <p className="text-gray-400 text-sm">Your identity is already anchored on Soroban.</p>
        <button onClick={() => router.replace('/')} className="btn-primary w-full">Back to FaucetDrops</button>
      </div>
    </Screen>
  );

  if (phase === 'done') return (
    <Screen>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 border border-green-700/50 mx-auto">
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-100">Identity Verified</h2>
        <p className="text-gray-400 text-sm">Your zero-knowledge proof is anchored on Soroban.</p>
        <button onClick={() => router.replace('/')} className="btn-primary w-full">Return to FaucetDrops</button>
      </div>
    </Screen>
  );

  if (phase === 'error') return (
    <Screen>
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-700/50 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-sm">{errorMsg}</p>
        </div>
        <button onClick={() => { setPhase('ready'); setDesktopMode('choose'); setErrorMsg(''); }} className="btn-primary w-full">
          Try again
        </button>
      </div>
    </Screen>
  );

  // ── Mobile: go straight to Kakushō with live camera mode ─────────────────

  if (isMobile) return (
    <Screen title="Identity Verification" subtitle={fmt(stellarAddress ?? '')}>
      <div className="space-y-4">
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-xs text-blue-300 space-y-1">
          <p className="font-medium text-blue-200">Kakushō will verify:</p>
          <p>• You are at least 18 years old</p>
          <p>• Your document is valid</p>
          <p>• Your nationality is not restricted</p>
        </div>
        <button
          onClick={() => mobileUrl && (window.location.href = mobileUrl)}
          disabled={!mobileUrl}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Smartphone className="h-4 w-4" />
          Start Verification
        </button>
      </div>
    </Screen>
  );

  // ── Desktop: choose QR or upload ──────────────────────────────────────────

  if (desktopMode === 'choose') return (
    <Screen title="Identity Verification" subtitle={fmt(stellarAddress ?? '')}>
      <div className="space-y-3">
        <p className="text-gray-400 text-sm text-center mb-2">How would you like to verify?</p>

        <button
          onClick={() => setDesktopMode('qr')}
          className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-700 hover:border-blue-600 hover:bg-blue-900/10 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-900/30 border border-blue-700/50 flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-gray-100 font-medium text-sm">Use your phone</p>
            <p className="text-gray-500 text-xs mt-0.5">Scan a QR code and capture with your phone camera</p>
          </div>
        </button>

        <button
          onClick={handleDesktopUpload}
          className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-700 hover:border-blue-600 hover:bg-blue-900/10 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-900/30 border border-purple-700/50 flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-gray-100 font-medium text-sm">Upload documents</p>
            <p className="text-gray-500 text-xs mt-0.5">Upload photos of your ID and a selfie from this device</p>
          </div>
        </button>
      </div>
    </Screen>
  );

  // ── Desktop QR mode ───────────────────────────────────────────────────────

  if (desktopMode === 'qr') return (
    <Screen title="Scan with your phone" subtitle={fmt(stellarAddress ?? '')}>
      <div className="space-y-5">
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-xs text-blue-300 space-y-1">
          <p className="font-medium text-blue-200">How this works:</p>
          <p>• Scan the QR with your phone camera</p>
          <p>• Your phone captures your ID and face live</p>
          <p>• The ZK proof generates on Kakushō's servers</p>
          <p>• This page updates automatically when done</p>
        </div>

        {mobileUrl && (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-xl">
              <QRCode value={mobileUrl} size={200} />
            </div>
            <p className="text-xs text-gray-500">Waiting for phone to complete…</p>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              Polling for result
            </div>
          </div>
        )}

        <button
          onClick={() => setDesktopMode('choose')}
          className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
        >
          ← Back to options
        </button>
      </div>
    </Screen>
  );

  return null;
}

// ── Shell ─────────────────────────────────────────────────────────────────────

function Screen({ children, title, subtitle }: {
  children: React.ReactNode;
  title?:    string;
  subtitle?: string;
}) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#020817] py-12">
      <div className="container mx-auto px-4 max-w-md space-y-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-200 flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {title && (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-100">{title}</h1>
            {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
          </div>
        )}
        <div className="rounded-lg border border-gray-700 bg-[#0d1117] p-6 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}