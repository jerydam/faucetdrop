import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useVerification } from '@/hooks/useVerification';
import { useWeb3 } from '@/components/providers/web3-provider';

/**
 * VerificationGuard - Component that protects content behind identity verification
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to show when verified
 * @param {React.ReactNode} props.fallback - Custom fallback component (optional)
 * @param {boolean} props.showButton - Whether to show verification button (default: true)
 * @param {string} props.title - Custom title for verification prompt
 * @param {string} props.message - Custom message for verification prompt
 * @param {string} props.redirectTo - Where to redirect for verification (default: '/verify')
 */
export function VerificationGuard({ 
  children, 
  fallback,
  showButton = true,
  title = "Identity Verification Required",
  message = "Please verify your identity to access this feature.",
  redirectTo = "/verify"
}) {
  const { account, connect } = useWeb3();
  const { isVerified, isLoading, error } = useVerification();

  // Show loading state while checking verification
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Checking verification status...</span>
      </div>
    );
  }

  // Show wallet connection prompt if not connected
  if (!account) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Wallet Connection Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your wallet to continue.
          </p>
          <Button onClick={connect} size="lg">
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show verification prompt if not verified
  if (!isVerified) {
    if (fallback) {
      return fallback;
    }

    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Verification Required</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-600">
                Error checking verification: {error}
              </p>
            </div>
          )}
          {showButton && (
            <Button asChild size="lg">
              <Link href={redirectTo}>
                Verify Identity
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show protected content if verified
  return children;
}

/**
 * VerificationBadge - Simple badge component showing verification status
 */
export function VerificationBadge({ className = "" }) {
  const { account } = useWeb3();
  const { isVerified, isLoading } = useVerification();

  if (!account) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Checking...</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 text-xs ${
      isVerified 
        ? 'text-green-600 bg-green-50 border border-green-200' 
        : 'text-amber-600 bg-amber-50 border border-amber-200'
    } px-2 py-1 rounded-full ${className}`}>
      <Shield className="h-3 w-3" />
      <span>{isVerified ? 'Verified' : 'Unverified'}</span>
    </div>
  );
}

/**
 * withVerification - HOC that wraps a component with verification guard
 */
export function withVerification(Component, guardProps = {}) {
  return function VerifiedComponent(props) {
    return (
      <VerificationGuard {...guardProps}>
        <Component {...props} />
      </VerificationGuard>
    );
  };
}