"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/header";
import {
  getFaucetDetails,
  fundFaucet,
  withdrawTokens,
  setWhitelist,
  storeClaim,
  setClaimParameters,
  resetClaimedStatus,
  retrieveSecretCode,
  saveToStorage,
  getFromStorage,
} from "@/lib/faucet";
import { formatUnits, parseUnits, BrowserProvider } from "ethers";
import { Clock, Coins, Download, Share2, Upload, Users, Key, RotateCcw } from "lucide-react";
import { claimViaBackend } from "@/lib/backend-service";
import { Batchclaim } from "@/components/batch-claim";
import { useNetwork } from "@/hooks/use-network";
import { TokenBalance } from "@/components/token-balance";
import { Badge } from "@/components/ui/badge";
import { JsonRpcProvider } from "ethers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FaucetDetails() {
  const { address: faucetAddress } = useParams<{ address: string }>();
  const searchParams = useSearchParams();
  const networkId = searchParams.get("networkId");
  const { toast } = useToast();
  const router = useRouter();
  const { address, chainId, isConnected, provider } = useWallet();
  const { networks, setNetwork } = useNetwork();

  const [faucetDetails, setFaucetDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [adjustedFundAmount, setAdjustedFundAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [whitelistAddresses, setWhitelistAddresses] = useState("");
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState(false);
  const [tokenSymbol, setTokenSymbol] = useState("CELO");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [hasFollowed, setHasFollowed] = useState(false);
  const [showClaimPopup, setShowClaimPopup] = useState(false);
  const [showFundPopup, setShowFundPopup] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [startCountdown, setStartCountdown] = useState<string | null>(null);
  const [endCountdown, setEndCountdown] = useState<string>("");
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null);
  const [secretCode, setSecretCode] = useState("");
  const [generatedSecretCode, setGeneratedSecretCode] = useState("");
  const [showSecretCodeDialog, setShowSecretCodeDialog] = useState(false);
  const [resetAddresses, setResetAddresses] = useState("");
  const [isResetEnabled, setIsResetEnabled] = useState(true);
  const [currentSecretCode, setCurrentSecretCode] = useState("");
  const [showCurrentSecretDialog, setShowCurrentSecretDialog] = useState(false);

  const isOwner = address && faucetDetails?.owner && address.toLowerCase() === faucetDetails.owner.toLowerCase();
  const isSecretCodeValid = secretCode.length === 6 && /^[A-Z0-9]{6}$/.test(secretCode);

  const xProfileLink = "https://x.com/FaucetDrops";
  const popupContent = (amount: string, txHash: string | null) =>
    `I just received a drop of ${amount} ${tokenSymbol} from @FaucetDrops on ${selectedNetwork?.name || "the network"}. Verify Drop 💧: ${
      txHash ? `${selectedNetwork?.blockExplorer || "https://explorer.unknown"}/tx/0x${txHash.slice(2)}` : "Transaction not available"
    }`;

  // Calculate platform fee (5%), net funded amount, and recommended input for original amount
  const calculateFee = (amount: string) => {
    try {
      const parsedAmount = parseUnits(amount, tokenDecimals); // Returns BigInt
      const fee = (parsedAmount * BigInt(5)) / BigInt(100); // 5% fee
      const netAmount = parsedAmount - fee;
      // To achieve original amount as net, input = original / 0.95
      const recommendedInput = (parsedAmount * BigInt(100)) / BigInt(95);
      // Round recommendedInput to 3 decimal places for display
      const recommendedInputStr = Number(formatUnits(recommendedInput, tokenDecimals)).toFixed(3);
      return {
        fee: formatUnits(fee, tokenDecimals),
        netAmount: formatUnits(netAmount, tokenDecimals),
        recommendedInput: recommendedInputStr,
      };
    } catch {
      return { fee: "0", netAmount: "0", recommendedInput: "0" };
    }
  };

  // Adjust funding amount to achieve desired net amount after fee
  const adjustFundingAmount = (desiredNet: string) => {
    try {
      const parsedNet = parseUnits(desiredNet, tokenDecimals); // Returns BigInt
      // Net amount = Input * (1 - 0.05) => Input = Net / 0.95
      const adjusted = (parsedNet * BigInt(100)) / BigInt(95);
      return formatUnits(adjusted, tokenDecimals);
    } catch {
      return "";
    }
  };

  const { fee, netAmount, recommendedInput } = calculateFee(fundAmount);

  const handleFollow = () => {
    window.open(xProfileLink, "_blank");
    setHasFollowed(true);
  };

  const handleShareOnX = () => {
    const claimedAmount = faucetDetails ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0";
    const shareText = encodeURIComponent(popupContent(claimedAmount, txHash));
    const shareUrl = `https://x.com/intent/tweet?text=${shareText}`;
    window.open(shareUrl, "_blank");
    setShowClaimPopup(false);
  };

  const handleRetrieveSecretCode = async () => {
  if (!faucetAddress) {
    toast({
      title: "Error",
      description: "No faucet address available",
      variant: "destructive",
    });
    return;
  }

  // Optional: Verify the user is the faucet owner
  if (!isOwner) {
    toast({
      title: "Unauthorized",
      description: "Only the faucet owner can retrieve the Drop code",
      variant: "destructive",
    });
    return;
  }

  try {
    const code = await retrieveSecretCode(faucetAddress);
    setCurrentSecretCode(code);
    setShowCurrentSecretDialog(true);

    // Check if code was from cache or backend
    const wasCached = getFromStorage(`secretCode_${faucetAddress}`) === code;
    toast({
      title: "Drop code Retrieved",
      description: wasCached ? "Code retrieve Successfully, Don't forget it again" : "",
    });
  } catch (error: any) {
    toast({
      title: "Failed to retrieve Drop code",
      description: error.message || "Unknown error occurred",
      variant: "destructive",
    });
  }
};

  const handleResetClaimed = async () => {
    if (!isConnected || !provider || !resetAddresses.trim() || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter valid addresses",
        variant: "destructive",
      });
      return;
    }

    if (!checkNetwork()) return;

    try {
      const addresses = resetAddresses
        .split(/[\n,]/)
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      if (addresses.length === 0) return;

      await resetClaimedStatus(
        provider as BrowserProvider,
        faucetAddress,
        addresses,
        isResetEnabled,
        BigInt(chainId),
        BigInt(Number(networkId))
      );

      toast({
        title: "Claim status reset",
        description: `${addresses.length} addresses have been ${
          isResetEnabled ? "enabled to claim again" : "disabled from claiming"
        }`,
      });

      setResetAddresses("");
    } catch (error: any) {
      console.error("Error resetting claim status:", error);
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork();
      } else {
        toast({
          title: "Failed to reset claim status",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    if (!faucetDetails) return;

    const updateCountdown = () => {
      const now = Date.now();
      const start = Number(faucetDetails.startTime) * 1000;
      const end = Number(faucetDetails.endTime) * 1000;

      if (start > now) {
        const diff = start - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setStartCountdown(
          `${days}d ${hours}h ${minutes}m ${seconds}s until active`
        );
      } else {
        setStartCountdown("Already Active");
      }

      if (end > now && faucetDetails.isClaimActive) {
        const diff = end - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setEndCountdown(
          `${days}d ${hours}h ${minutes}m ${seconds}s until inactive`
        );
      } else if (end > 0 && end <= now) {
        setEndCountdown("Ended");
      } else {
        setEndCountdown("N/A");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [faucetDetails]);

  useEffect(() => {
    if (provider && faucetAddress && networkId) {
      loadFaucetDetails();
    }
  }, [provider, faucetAddress, networkId]);

  const loadFaucetDetails = async () => {
    if (!faucetAddress || !networkId) {
      toast({
        title: "Invalid Parameters",
        description: "Faucet address or network ID is missing",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const targetNetwork = networks.find((n) => n.chainId === Number(networkId));
      if (!targetNetwork) {
        toast({
          title: "Network Not Found",
          description: `Network ID ${networkId} is not supported`,
          variant: "destructive",
        });
        setLoading(false);
        router.push("/");
        return;
      }

      setSelectedNetwork(targetNetwork);
      const detailsProvider = new JsonRpcProvider(targetNetwork.rpcUrl);
      const details = await getFaucetDetails(detailsProvider, faucetAddress);
      setFaucetDetails(details);

      if (details.claimAmount) {
        setClaimAmount(formatUnits(details.claimAmount, details.tokenDecimals));
      }
      if (details.startTime) {
        const date = new Date(Number(details.startTime) * 1000);
        setStartTime(date.toISOString().slice(0, 16));
      }
      if (details.endTime) {
        const date = new Date(Number(details.endTime) * 1000);
        setEndTime(date.toISOString().slice(0, 16));
      }

      setTokenSymbol(details.tokenSymbol || "CELO");
      setTokenDecimals(details.tokenDecimals || 18);
      setHasClaimed(details.hasClaimed || false);
    } catch (error) {
      console.error("Error loading faucet details:", error);
      toast({
        title: "Failed to load faucet details",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkNetwork = () => {
    if (!chainId) {
      toast({
        title: "Network not detected",
        description: "Please ensure your wallet is connected to a supported network",
        variant: "destructive",
      });
      return false;
    }
    if (networkId && Number(networkId) !== chainId) {
      const targetNetwork = networks.find((n) => n.chainId === Number(networkId));
      if (targetNetwork) {
        toast({
          title: "Wrong Network",
          description: "Switch to the network to perform operation",
          variant: "destructive",
          action: (
            <Button
              onClick={() => setNetwork(targetNetwork)}
              variant="outline"
            >
              Switch to {targetNetwork.name}
            </Button>
          ),
        });
        return false;
      }
    }
    return true;
  };

  async function handleBackendClaim() {
    if (!isConnected || !address || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to claim tokens",
        variant: "destructive",
      });
      return;
    }
  
    if (!chainId || !networkId) {
      toast({
        title: "Network not detected",
        description: "Please ensure your wallet is connected to a supported network",
        variant: "destructive",
      });
      return;
    }
  
    if (!isSecretCodeValid) {
      toast({
        title: "Invalid Drop code",
        description: "Please enter a valid 6-character alphanumeric Drop code",
        variant: "destructive",
      });
      return;
    }
  
    if (!checkNetwork()) return;
  
    try {
      setIsClaiming(true);
      if (!window.ethereum) {
        throw new Error("Wallet not detected. Please install MetaMask or another Ethereum wallet.");
      }
      await window.ethereum.request({ method: 'eth_requestAccounts' });
  
      console.log("Sending claim request with Drop code:", secretCode); // Debug log
  
      const result = await claimViaBackend(address, faucetAddress, provider as BrowserProvider, secretCode);
      const formattedTxHash = result.txHash.startsWith('0x') ? result.txHash : `0x${result.txHash}` as `0x${string}`;
      setTxHash(formattedTxHash);
  
      const networkName = selectedNetwork?.name || "Unknown Network";
  
      const claimAmountBN = faucetDetails?.claimAmount || BigInt(0);
      await storeClaim(
        provider as BrowserProvider,
        address,
        faucetAddress,
        claimAmountBN,
        formattedTxHash,
        BigInt(chainId),
        BigInt(Number(networkId)),
        networkName
      );
  
      toast({
        title: "Tokens claimed successfully",
        description: `You have claimed ${
          faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : ""
        } ${tokenSymbol} and recorded the claim on-chain on ${networkName}`,
      });
  
      setShowClaimPopup(true);
      setSecretCode("");
      await loadFaucetDetails();
    } catch (error: any) {
      console.error("Error claiming tokens:", error);
      let errorMessage = error.message || "Unknown error occurred";
      if (errorMessage.includes("Unauthorized: Invalid Drop code")) {
        errorMessage = "Invalid Drop code. Please check and try again.";
      }
      toast({
        title: "Failed to claim tokens",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  }

  const handleFund = async () => {
    if (!isConnected || !provider || !fundAmount || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Show the funding confirmation popup
    setAdjustedFundAmount(fundAmount);
    setShowFundPopup(true);
  };

  const confirmFund = async () => {
    if (!isConnected || !provider || !adjustedFundAmount || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!checkNetwork()) return;

    try {
      const amount = parseUnits(adjustedFundAmount, tokenDecimals);
      const hash = await fundFaucet(
        provider as BrowserProvider,
        faucetAddress,
        amount,
        faucetDetails.isEther,
        BigInt(chainId),
        BigInt(Number(networkId))
      );

      toast({
        title: "Faucet funded successfully",
        description: `You have added ${formatUnits(amount, tokenDecimals)} ${tokenSymbol} to the faucet (after 5% platform fee)`,
      });

      setFundAmount("");
      setAdjustedFundAmount("");
      setShowFundPopup(false);
      await loadFaucetDetails();
    } catch (error: any) {
      console.error("Error funding faucet:", error);
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork();
      } else {
        toast({
          title: "Failed to fund faucet",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !provider || !withdrawAmount || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!checkNetwork()) return;

    try {
      const amount = parseUnits(withdrawAmount, tokenDecimals);
      await withdrawTokens(
        provider as BrowserProvider,
        faucetAddress,
        amount,
        BigInt(chainId),
        BigInt(Number(networkId))
      );

      toast({
        title: "Tokens withdrawn successfully",
        description: `You have withdrawn ${withdrawAmount} ${tokenSymbol} from the faucet`,
      });

      setWithdrawAmount("");
      await loadFaucetDetails();
    } catch (error: any) {
      console.error("Error withdrawing tokens:", error);
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork();
      } else {
        toast({
          title: "Failed to withdraw tokens",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpdateClaimParameters = async () => {
  if (!isConnected || !provider || !chainId) {
    toast({
      title: "Wallet not connected",
      description: "Please connect your wallet and ensure a network is selected",
      variant: "destructive",
    });
    return;
  }

  if (!claimAmount || !startTime || !endTime) {
    toast({
      title: "Invalid Input",
      description: "Please fill in all claim parameters",
      variant: "destructive",
    });
    return;
  }

  if (!checkNetwork()) return;

  try {
    const claimAmountBN = parseUnits(claimAmount, tokenDecimals);
    const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

    // Call backend endpoint to generate Drop code
    const response = await fetch("https://fauctdrop-backend-1.onrender.com/set-claim-parameters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        faucetAddress,
        claimAmount: claimAmountBN.toString(),
        startTime: startTimestamp,
        endTime: endTimestamp,
        chainId: Number(chainId),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to set claim parameters");
    }

    const result = await response.json();
    const secretCodeFromBackend = result.secretCode;

    // Store the Drop code in localStorage
    saveToStorage(`secretCode_${faucetAddress}`, secretCodeFromBackend);

    // Update smart contract with claim parameters (without Drop code)
    await setClaimParameters(
      provider as BrowserProvider,
      faucetAddress,
      claimAmountBN,
      startTimestamp,
      endTimestamp,
      BigInt(chainId),
      BigInt(Number(networkId))
    );

    setGeneratedSecretCode(secretCodeFromBackend);
    setShowSecretCodeDialog(true);

    toast({
      title: "Claim parameters updated",
      description: `Parameters updated successfully. Drop code generated and stored.`,
    });

    await loadFaucetDetails();
  } catch (error: any) {
    console.error("Error updating claim parameters:", error);
    if (error.message === "Switch to the network to perform operation") {
      checkNetwork();
    } else {
      toast({
        title: "Failed to update claim parameters",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    }
  }
};
  const handleUpdateWhitelist = async () => {
    if (!isConnected || !provider || !whitelistAddresses.trim() || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter valid addresses",
        variant: "destructive",
      });
      return;
    }

    if (!checkNetwork()) return;

    try {
      const addresses = whitelistAddresses
        .split(/[\n,]/)
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      if (addresses.length === 0) return;

      await setWhitelist(
        provider as BrowserProvider,
        faucetAddress,
        addresses,
        isWhitelistEnabled,
        BigInt(chainId),
        BigInt(Number(networkId))
      );

      toast({
        title: "Whitelist updated",
        description: `${addresses.length} addresses have been ${
          isWhitelistEnabled ? "added to" : "removed from"
        } the whitelist`,
      });

      setWhitelistAddresses("");
    } catch (error: any) {
      console.error("Error updating whitelist:", error);
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork();
      } else {
        toast({
          title: "Failed to update whitelist",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base">Loading faucet details...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:gap-8 max-w-3xl sm:max-w-4xl mx-auto">
          <Header pageTitle="Faucet Details" />

          {faucetDetails ? (
            <>
              <Card className="w-full sm:max-w-2xl mx-auto">
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <CardTitle className="flex items-center text-lg sm:text-xl">
                      <span>{faucetDetails.name || tokenSymbol} Faucet</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {selectedNetwork ? (
                        <Badge
                          style={{ backgroundColor: selectedNetwork.color }}
                          className="text-white text-xs font-medium px-2 py-1"
                        >
                          {selectedNetwork.name}
                        </Badge>
                      ) : (
                        <Badge
                          className="text-white text-xs font-medium px-2 py-1 bg-gray-500"
                        >
                          Unknown Network
                        </Badge>
                      )}
                      {faucetDetails.isClaimActive ? (
                        <span className="text-xs sm:text-sm bg-green-500/20 text-green-600 dark:text-green-400 px-2 sm:px-3 py-1 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm bg-red-500/20 text-red-600 dark:text-red-400 px-2 sm:px-3 py-1 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    <div className="flex flex-col gap-1 sm:gap-2 mt-2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Faucet Address:</span>
                        <span className="text-xs font-mono break-all">{faucetAddress}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Token Address:</span>
                        <span className="text-xs font-mono break-all">{faucetDetails.token}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Owner:</span>
                        <span className="text-xs font-mono break-all">{faucetDetails.owner}</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                {faucetDetails && (
                  <div className="px-4 sm:px-6 pb-2">
                    <TokenBalance
                      tokenAddress={faucetDetails.token}
                      tokenSymbol={tokenSymbol}
                      tokenDecimals={tokenDecimals}
                      isNativeToken={faucetDetails.isEther}
                      networkChainId={selectedNetwork?.chainId}
                    />
                  </div>
                )}
                <CardContent className="space-y-4 px-4 sm:px-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="flex flex-col p-3 sm:p-4 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Balance</span>
                      <span className="text-lg sm:text-2xl font-bold truncate">
                        {faucetDetails.balance ? formatUnits(faucetDetails.balance, tokenDecimals) : "0"} {tokenSymbol}
                      </span>
                    </div>
                    <div className="flex flex-col p-3 sm:p-4 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Claim Amount</span>
                      <span className="text-lg sm:text-2xl font-bold truncate">
                        {faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0"} {tokenSymbol}
                      </span>
                    </div>
                    <div className="flex flex-col p-3 sm:p-4 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Status</span>
                      <span className="text-base sm:text-lg font-medium">
                        {hasClaimed ? "Already Claimed" : "Available to Claim"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">
                        {startCountdown}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">
                        {endCountdown}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secret-code" className="text-xs sm:text-sm">Drop code</Label>
                    <Input
                      id="secret-code"
                      placeholder="Enter 6-character code (e.g., ABC123)"
                      value={secretCode}
                      onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                      className="text-xs sm:text-sm"
                      maxLength={6}
                    />
                    <p className="text-xs text-muted-foreground">Enter the 6-character alphanumeric code to claim tokens</p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 px-4 sm:px-6">
                  <Button
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={handleFollow}
                    disabled={hasFollowed}
                  >
                    {hasFollowed ? "Followed on 𝕏" : "Follow on 𝕏 to Claim"}
                  </Button>
                  <Button
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                    variant="outline"
                    onClick={handleBackendClaim}
                    disabled={isClaiming || !address || !faucetDetails.isClaimActive || hasClaimed || !isSecretCodeValid}
                  >
                    {isClaiming ? "Claiming..." : hasClaimed ? "Already Claimed" : `Claim ${
                            faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : ""
                          } ${tokenSymbol}`}
                  </Button>
                </CardFooter>
              </Card>

              {isOwner && (
                <Card className="w-full sm:max-w-2xl mx-auto">
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl">Admin Controls</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Manage your faucet settings</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <Tabs defaultValue="fund">
                      <TabsList className="grid grid-cols-4">
                        <TabsTrigger value="fund" className="text-xs sm:text-sm">
                          <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Fund
                        </TabsTrigger>
                        <TabsTrigger value="parameters" className="text-xs sm:text-sm">
                          <Coins className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Parameters
                        </TabsTrigger>
                        <TabsTrigger value="whitelist" className="text-xs sm:text-sm">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Whitelist
                        </TabsTrigger>
                        <TabsTrigger value="reset" className="text-xs sm:text-sm">
                          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Reset
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="fund" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fund-amount" className="text-xs sm:text-sm">Fund Amount</Label>
                            <div className="flex gap-2">
                              <Input
                                id="fund-amount"
                                placeholder="0.0"
                                value={fundAmount}
                                onChange={(e) => setFundAmount(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Button onClick={handleFund} disabled={!fundAmount} className="text-xs sm:text-sm">
                                <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Fund
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Add {tokenSymbol} to the faucet (5% platform fee applies)</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="withdraw-amount" className="text-xs sm:text-sm">Withdraw Amount</Label>
                            <div className="flex gap-2">
                              <Input
                                id="withdraw-amount"
                                placeholder="0.0"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Button onClick={handleWithdraw} disabled={!withdrawAmount} variant="outline" className="text-xs sm:text-sm">
                                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Withdraw
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Withdraw {tokenSymbol} from the faucet</p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="parameters" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="claim-amount" className="text-xs sm:text-sm">Claim Amount</Label>
                            <Input
                              id="claim-amount"
                              placeholder="0.0"
                              value={claimAmount}
                              onChange={(e) => setClaimAmount(e.target.value)}
                              className="text-xs sm:text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Amount of {tokenSymbol} users can claim</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="start-time" className="text-xs sm:text-sm">Start Time</Label>
                              <Input
                                id="start-time"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="end-time" className="text-xs sm:text-sm">End Time</Label>
                              <Input
                                id="end-time"
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              onClick={handleUpdateClaimParameters} 
                              className="text-xs sm:text-sm flex-1"
                              disabled={!claimAmount || !startTime || !endTime}
                            >
                              Update Parameters & Generate Drop code
                            </Button>
                            <Button
                              onClick={handleRetrieveSecretCode}
                              variant="outline"
                              className="text-xs sm:text-sm"
                            >
                              <Key className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Get Current Code
                            </Button>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="whitelist" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="whitelist-mode"
                              checked={isWhitelistEnabled}
                              onCheckedChange={setIsWhitelistEnabled}
                            />
                            <Label htmlFor="whitelist-mode" className="text-xs sm:text-sm">
                              {isWhitelistEnabled ? "Add to whitelist" : "Remove from whitelist"}
                            </Label>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="whitelist-addresses" className="text-xs sm:text-sm">Addresses (one per line or comma separated)</Label>
                            <Textarea
                              id="whitelist-addresses"
                              placeholder="0x..."
                              value={whitelistAddresses}
                              onChange={(e) => setWhitelistAddresses(e.target.value)}
                              rows={5}
                              className="text-xs sm:text-sm"
                            />
                          </div>

                          <Button onClick={handleUpdateWhitelist} className="text-xs sm:text-sm">Update Whitelist</Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="reset" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="reset-mode"
                              checked={isResetEnabled}
                              onCheckedChange={setIsResetEnabled}
                            />
                            <Label htmlFor="reset-mode" className="text-xs sm:text-sm">
                              {isResetEnabled ? "Enable claiming (reset to unclaimed)" : "Disable claiming (set as claimed)"}
                            </Label>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reset-addresses" className="text-xs sm:text-sm">Addresses to Reset (one per line or comma separated)</Label>
                            <Textarea
                              id="reset-addresses"
                              placeholder="0x..."
                              value={resetAddresses}
                              onChange={(e) => setResetAddresses(e.target.value)}
                              rows={5}
                              className="text-xs sm:text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              Reset claim status for specific addresses. Enable = allow them to claim again, Disable = prevent them from claiming.
                            </p>
                          </div>

                          <Button onClick={handleResetClaimed} className="text-xs sm:text-sm">
                            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Reset Claim Status
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
              {isOwner && <Batchclaim faucetAddress={faucetAddress} />}
            </>
          ) : (
            <Card className="w-full sm:max-w-2xl mx-auto">
              <CardContent className="py-6 sm:py-10 text-center">
                <p className="text-sm sm:text-base">Faucet not found or error loading details</p>
                <Button className="mt-4 text-xs sm:text-sm" onClick={() => router.push("/")}>
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showClaimPopup} onOpenChange={setShowClaimPopup}>
        <DialogContent className="w-11/12 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Claim Successful!</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              You have successfully claimed{" "}
              {faucetDetails?.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0"} {tokenSymbol}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <p className="text-xs sm:text-sm">Share your claim on X to help spread the word about FaucetDrops!</p>
          </div>
          <DialogFooter className="sm:justify-start flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="default" onClick={handleShareOnX} className="flex items-center gap-2 text-xs sm:text-sm">
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
              Share on 𝕏
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSecretCodeDialog} onOpenChange={setShowSecretCodeDialog}>
        <DialogContent className="w-11/12 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Drop code Generated</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              A new Drop code has been generated for this faucet. Share this code with users to allow them to claim tokens. Do well to keep it secure!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="generated-secret-code" className="text-xs sm:text-sm">Drop code</Label>
              <Input
                id="generated-secret-code"
                value={generatedSecretCode}
                readOnly
                className="text-xs sm:text-sm font-mono"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-start flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                navigator.clipboard.writeText(generatedSecretCode);
                toast({
                  title: "Copied to Clipboard",
                  description: "The Drop code has been copied to your clipboard",
                });
              }}
              className="text-xs sm:text-sm"
            >
              Copy Code
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSecretCodeDialog(false)}
              className="text-xs sm:text-sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCurrentSecretDialog} onOpenChange={setShowCurrentSecretDialog}>
        <DialogContent className="w-11/12 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Current Drop code</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This is the current active Drop code for this faucet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-secret-code" className="text-xs sm:text-sm">Drop code</Label>
              <Input
                id="current-secret-code"
                value={currentSecretCode}
                readOnly
                className="text-xs sm:text-sm font-mono"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-start flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                navigator.clipboard.writeText(currentSecretCode);
                toast({
                  title: "Copied to Clipboard",
                  description: "The Drop code has been copied to your clipboard",
                });
              }}
              className="text-xs sm:text-sm"
            >
              Copy Code
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCurrentSecretDialog(false)}
              className="text-xs sm:text-sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFundPopup} onOpenChange={setShowFundPopup}>
        <DialogContent className="w-11/12 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Confirm Faucet Funding</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              A 5% platform fee will be deducted from your funding amount.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Funding Details</Label>
              <p className="text-xs sm:text-sm">
                Input Amount: {fundAmount} {tokenSymbol}
              </p>
              <p className="text-xs sm:text-sm">
                Platform Fee (5%): {fee} {tokenSymbol}
              </p>
              <p className="text-xs sm:text-sm font-medium">
                Net Funded Amount: {netAmount} {tokenSymbol}
              </p>
              <p className="text-xs sm:text-sm font-medium">
                To fund {fundAmount} {tokenSymbol} after the fee, input: {recommendedInput} {tokenSymbol}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjusted-fund-amount" className="text-xs sm:text-sm">
                Adjust Funding Amount
              </Label>
              <Input
                id="adjusted-fund-amount"
                placeholder="Enter amount"
                value={adjustedFundAmount}
                onChange={(e) => setAdjustedFundAmount(e.target.value)}
                className="text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter the total amount to send, including the 5% fee. To fund {fundAmount} {tokenSymbol} after the fee, use {recommendedInput} {tokenSymbol}.
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-start flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="default"
              onClick={confirmFund}
              disabled={!adjustedFundAmount || parseFloat(adjustedFundAmount) <= 0}
              className="text-xs sm:text-sm"
            >
              Proceed
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFundPopup(false)}
              className="text-xs sm:text-sm"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}