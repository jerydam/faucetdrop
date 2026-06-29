'use client';

// app/(integrator-demo)/verify/page.tsx
//
// Desktop verify entry point.
// - Connects the user's EVM wallet (MetaMask etc.)
// - Creates a session and shows a QR code pointing to /verify/mobile/[session]
// - Polls the session until the mobile flow completes, then shows success
// - On mobile, bypasses QR and navigates directly to the mobile flow

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import {
  Loader2,
  CheckCircle,
  Shield,
  Wallet,
  ArrowLeft,
  Smartphone,
} from 'lucide-react';
import LoadingPage from '@/components/loading';

const KAKUSHO_URL = process.env.NEXT_PUBLIC_KAKUSHO_URL ?? 'https://kakusho-protocol.vercel.app';
const INTEGRATOR_ID =
  process.env.NEXT_PUBLIC_KAKUSHO_INTEGRATOR_ID ??
  '6307ca06c7cec4a529f6b3b66cbef7a11f9cf6a44e066aa8c4cd2f11aaa043e9';

declare global {
  interface Window {
    ethereum?: any;
  }
}

type Phase = 'wallet' | 'ready' | 'verified';
type SessionStatus = 'pending' | 'wallet_connected' | 'verified' | 'error';

// ── Tiny UI primitives (unchanged from original) ──────────────────────────────

const Button = ({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  className = '',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  disabled?: boolean;
}) => {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-600 bg-transparent hover:bg-gray-700 text-gray-200',
    ghost: 'hover:bg-gray-700 text-gray-200',
  };
  const sizes = { default: 'h-10 py-2 px-4', sm: 'h-9 px-3 text-sm', lg: 'h-11 px-8' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`rounded-lg border border-gray-700 bg-[#020817] shadow-sm ${className}`}>
    {children}
  </div>
);
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col space-y-1.5 p-6">{children}</div>
);
const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-2xl font-semibold leading-none tracking-tight text-gray-100">
    {children}
  </h3>
);
const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pt-0">{children}</div>
);

// ── Main component ────────────────────────────────────────────────────────────

export default function VerifyPage() {
  const router = useRouter();

  // Wallet
  const [walletLoading, setWalletLoading] = useState(true);
  const [account, setAccount] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [phase, setPhase] = useState<Phase>('wallet');

  // Session (desktop↔mobile handoff)
  const [sessionId] = useState(() => crypto.randomUUID());
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('pending');
  const [mobileUrl, setMobileUrl] = useState('');

  const fmt = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
  const isMobile =
    typeof navigator !== 'undefined' && /android|iphone|ipad/i.test(navigator.userAgent);

  // ── Auto-connect if already connected ──────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts[0]) {
            setAccount(accounts[0]);
            setPhase('ready');
          }
        }
      } finally {
        setWalletLoading(false);
      }
    })();
  }, []);

  // ── Create session + build mobile URL once wallet is ready ─────────────────

  useEffect(() => {
    if (phase !== 'ready' || !account) return;

    // Create the server-side session
    fetch(`/api/kakusho/sessions/${sessionId}`, { method: 'POST' }).catch(() => {});

    const callbackUrl = `${window.location.origin}/verify/callback`;
    const url =
      `${KAKUSHO_URL}/verify/mobile/${sessionId}` +
      `?integrator_id=${INTEGRATOR_ID}` +
      `&callback_url=${encodeURIComponent(callbackUrl)}` +
      `&state=${encodeURIComponent(account)}`;

    setMobileUrl(url);
  }, [phase, account, sessionId]);

  // ── Poll session status (desktop only) ────────────────────────────────────

  useEffect(() => {
    if (phase !== 'ready' || isMobile) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/kakusho/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        setSessionStatus(data.status as SessionStatus);
        if (data.status === 'verified') {
          setPhase('verified');
          clearInterval(interval);
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [phase, sessionId, isMobile]);

  // ── Connect wallet ─────────────────────────────────────────────────────────

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts[0]) {
        setAccount(accounts[0]);
        setPhase('ready');
      }
    } catch {
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (walletLoading) return <LoadingPage />;

  // ── Step 1: No wallet connected ────────────────────────────────────────────

  if (phase === 'wallet' || !account) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-gray-200 self-start mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <CardTitle>Connect Your Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300 text-sm">
              Connect your wallet to start identity verification.
            </p>
            <Button
              onClick={connectWallet}
              size="lg"
              className="w-full"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Requires MetaMask or another Web3 wallet
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step 2: Wallet connected — show QR (desktop) or direct link (mobile) ───

  return (
    <div className="min-h-screen bg-[#020817] py-12">
      <div className="container mx-auto px-4 max-w-lg space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-100 mb-1">Identity Verification</h1>
          <p className="text-gray-500 text-sm">Connected as {fmt(account)}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verify with Kakushō
              {phase === 'verified' && (
                <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" /> Verified
                </span>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {/* ── Desktop: QR code + status ── */}
            {phase === 'ready' && !isMobile && mobileUrl && (
              <div className="space-y-6">
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-xs text-blue-300 space-y-1">
                  <p className="font-medium text-blue-200">Kakushō will verify:</p>
                  <p>• You are at least 18 years old</p>
                  <p>• Your document is valid</p>
                  <p>• Your nationality is not restricted</p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  {/* Status banner above QR */}
                  {sessionStatus === 'pending' && (
                    <p className="text-sm text-gray-300">
                      Scan with your phone to complete verification:
                    </p>
                  )}
                  {sessionStatus === 'wallet_connected' && (
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Phone connected — proof generating on your phone…
                    </div>
                  )}

                  {/* QR fades once phone is connected */}
                  <div
                    className={cn(
                      'bg-white p-5 rounded-xl transition-opacity duration-500',
                      sessionStatus !== 'pending' && 'opacity-20 pointer-events-none',
                    )}
                  >
                    <QRCode value={mobileUrl} size={220} />
                  </div>

                  {sessionStatus === 'pending' && (
                    <>
                      <a
                        href={mobileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline"
                      >
                        Or open link on this device →
                      </a>
                      <p className="text-xs text-gray-500 text-center">
                        Waiting for phone… (refreshes automatically)
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Mobile: direct CTA ── */}
            {phase === 'ready' && isMobile && mobileUrl && (
              <div className="space-y-6">
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-xs text-blue-300 space-y-1">
                  <p className="font-medium text-blue-200">Kakushō will verify:</p>
                  <p>• You are at least 18 years old</p>
                  <p>• Your document is valid</p>
                  <p>• Your nationality is not restricted</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-gray-300 text-center">
                    Tap below to verify on this device — no QR scanning needed.
                  </p>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => router.push(mobileUrl)}
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    Start Verification
                  </Button>
                </div>
              </div>
            )}

            {/* ── Verified ── */}
            {phase === 'verified' && (
              <div className="space-y-6">
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <h3 className="font-medium text-green-200">Identity Verified</h3>
                  </div>
                  <p className="text-sm text-green-300">
                    Your zero-knowledge proof was accepted. You can now use FaucetDrops.
                  </p>
                </div>
                <Button size="lg" className="w-full">
                  <Link href="/">Return to FaucetDrops</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}