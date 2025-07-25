import { useState, useEffect } from 'react';
import { useWeb3 } from '@/components/providers/web3-provider';

export function useVerification() {
  const { account } = useWeb3();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [error, setError] = useState(null);

  const checkVerificationStatus = async (userAddress = account) => {
    if (!userAddress) {
      setIsVerified(false);
      setVerificationData(null);
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First check localStorage for quick response
      const stored = localStorage.getItem(`verification_${userAddress.toLowerCase()}`);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.verified && data.timestamp) {
          // Check if verification is not too old (30 days)
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          if (data.timestamp > thirtyDaysAgo) {
            setIsVerified(true);
            setVerificationData(data);
            setIsLoading(false);
            return true;
          }
        }
      }

      // Check server for verification status
      const response = await fetch(`/api/verify/status/${userAddress}`);
      const result = await response.json();
      
      if (result.status === 'success' && result.verified && !result.isExpired) {
        const verificationRecord = {
          verified: true,
          timestamp: Date.now(),
          userAddress: userAddress.toLowerCase(),
          verificationData: result.discloseOutput,
          disclosures: {
            nationality: result.discloseOutput?.nationality || "Verified",
            name: result.discloseOutput?.name || "Verified User",
            dateOfBirth: result.discloseOutput?.dateOfBirth || null,
            gender: result.discloseOutput?.gender || null,
            minimumAge: 15,
          }
        };

        // Store in localStorage for quick access
        localStorage.setItem(
          `verification_${userAddress.toLowerCase()}`,
          JSON.stringify(verificationRecord)
        );

        setVerificationData(verificationRecord);
        setIsVerified(true);
        setIsLoading(false);
        return true;
      } else {
        setIsVerified(false);
        setVerificationData(null);
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error("Error checking verification status:", err);
      setError(err.message);
      setIsVerified(false);
      setVerificationData(null);
      setIsLoading(false);
      return false;
    }
  };

  const clearVerification = () => {
    if (account) {
      localStorage.removeItem(`verification_${account.toLowerCase()}`);
    }
    setIsVerified(false);
    setVerificationData(null);
    setError(null);
  };

  // Auto-check when account changes
  useEffect(() => {
    if (account) {
      checkVerificationStatus(account);
    } else {
      setIsVerified(false);
      setVerificationData(null);
      setError(null);
    }
  }, [account]);

  return {
    isVerified,
    isLoading,
    verificationData,
    error,
    checkVerificationStatus,
    clearVerification,
    refetch: () => checkVerificationStatus(account)
  };
}