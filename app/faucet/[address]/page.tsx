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
import { NetworkSelector } from "@/components/network-selector";
import { WalletConnect } from "@/components/wallet-connect";
import {
  getFaucetDetails,
  claimTokens,
  fundFaucet,
  withdrawTokens,
  setClaimParameters,
  setWhitelist,
} from "@/lib/faucet";
import { formatUnits, parseUnits } from "ethers";
import { ArrowLeft, Clock, Coins, Download, Share2, Upload, Users } from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { claimViaBackend } from "@/lib/backend-service";
import { BatchClaim } from "@/components/batch-claim";
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
import { DivviInfo } from "@/components/divvi-info";

export default function FaucetDetails() {
  const { address: faucetAddress } = useParams<{ address: string }>();
  const searchParams = useSearchParams();
  const networkId = searchParams.get("networkId");
  const { toast } = useToast();
  const router = useRouter();
  const { address, chainId, isConnected, provider } = useWallet();
  const { network, networks, setNetwork } = useNetwork();

  const [faucetDetails, setFaucetDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
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
  const [txHash, setTxHash] = useState<string | null>(null);
  const [startCountdown, setStartCountdown] = useState<string | null>(null);
  const [endCountdown, setEndCountdown] = useState<string>("");

  const isOwner = address && faucetDetails?.owner && address.toLowerCase() === faucetDetails.owner.toLowerCase();

  // X/Twitter integration
  const xProfileLink = "https://x.com/FaucetDrops";
  const popupContent = (amount: string, txHash: string | null) =>
    `I just claimed ${amount} ${tokenSymbol} from @FaucetDrops on ${network?.name || "the network"}. Verify claim: ${
      txHash ? `${network?.blockExplorer}/tx/0x${txHash}` : "Transaction not available"
    }`;

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

    // Countdown logic
    useEffect(() => {
      if (!faucetDetails) return;
  
      const updateCountdown = () => {
        const now = Date.now();
        const start = Number(faucetDetails.startTime) * 1000;
        const end = Number(faucetDetails.endTime) * 1000;
  
        // Start time countdown
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
  
        // End time countdown
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
  
      updateCountdown(); // Initial call
      const interval = setInterval(updateCountdown, 1000); // Update every second
  
      return () => clearInterval(interval); // Cleanup on unmount
    }, [faucetDetails]);
  
  useEffect(() => {
    if (provider && faucetAddress && networkId) {
      loadFaucetDetails();
    }
  }, [provider, faucetAddress, networkId]);

  const loadFaucetDetails = async () => {
    if (!faucetAddress || !networkId) return;

    try {
      setLoading(true);
      const targetNetwork = networks.find((n) => n.chainId === Number(networkId));
      if (!targetNetwork) {
        toast({
          title: "Network Not Found",
          description: `Network ID ${networkId} is not supported`,
          variant: "destructive",
        });
        return;
      }

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
    if (!isDisconnected || !address || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to claim tokens",
        variant: "destructive",
      });
      return;
    }
  
    if (!checkNetwork()) return;
  
    try {
      setIsClaiming(true);
      // Ensure wallet is connected to Celo
      if (!window.ethereum) {
        throw new Error("Wallet not detected. Please install MetaMask or another Ethereum wallet.");
      }
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const result = await claimViaBackend(address, faucetAddress, provider);
      setTxHash(result.txHash);
  
      toast({
        title: "Tokens claimed successfully via backend",
        description: `You have claimed ${
          faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : ""
        } ${tokenSymbol}`,
      });
  
      setShowClaimPopup(true);
      await loadFaucetDetails();
    } catch (error: any) {
      console.error("Error claiming tokens via backend:", error);
      toast({
        title: "Failed to claim tokens via backend",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  }

  const handleFund = async () => {
    if (!isConnected || !provider || !fundAmount) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseUnits(fundAmount, tokenDecimals);
      const hash = await fundFaucet(provider, faucetAddress, amount, faucetDetails.isEther, chainId, Number(networkId));

      toast({
        title: "Faucet funded successfully",
        description: `You have added ${fundAmount} ${tokenSymbol} to the faucet`,
      });

      setFundAmount("");
      await loadFaucetDetails();
    } catch (error: any) {
      console.error("Error funding faucet:", error);
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork(); // Trigger toast alert
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
    if (!isConnected || !provider || !withdrawAmount) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseUnits(withdrawAmount, tokenDecimals);
      await withdrawTokens(provider, faucetAddress, amount, chainId, Number(networkId));

      toast({
        title: "Tokens withdrawn successfully",
        description: `You have withdrawn ${withdrawAmount} ${tokenSymbol} from the faucet`,
      });

      setWithdrawAmount("");
      await loadFaucetDetails();
    } catch (error: any) {
      console.error("Error withdrawing tokens:", error);
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork(); // Trigger toast alert
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
    if (!isConnected || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to update parameters",
        variant: "destructive",
      });
      return;
    }

    try {
      const claimAmountBN = parseUnits(claimAmount, tokenDecimals);
      const startTimestamp = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : 0;
      const endTimestamp = endTime ? Math.floor(new Date(endTime).getTime() / 1000) : 0;

      await setClaimParameters(provider, faucetAddress, claimAmountBN, startTimestamp, endTimestamp, chainId, Number(networkId));

      toast({
        title: "Claim parameters updated",
        description: "The faucet claim parameters have been updated successfully",
      });

      await loadFaucetDetails();
    } catch (error: any) {
      console.error("Error updating claim parameters:", error);
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork(); // Trigger toast alert
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
    if (!isConnected || !provider || !whitelistAddresses.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet and enter valid addresses",
        variant: "destructive",
      });
      return;
    }

    try {
      const addresses = whitelistAddresses
        .split(/[\n,]/)
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      if (addresses.length === 0) return;

      await setWhitelist(provider, faucetAddress, addresses, isWhitelistEnabled, chainId, Number(networkId));

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
        checkNetwork(); // Trigger toast alert
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
          <header className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold truncate">Faucet Details</h1>
            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <NetworkSelector />
              <WalletConnect />
            </div>
          </header>

          {faucetDetails ? (
            <>
              <DivviInfo />
              <Card className="w-full sm:max-w-2xl mx-auto">
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <CardTitle className="flex items-center text-lg sm:text-xl">
                      <span>{faucetDetails.name || tokenSymbol} Faucet</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {network && (
                        <Badge
                          style={{ backgroundColor: network.color }}
                          className="text-white text-xs font-medium px-2 py-1"
                        >
                          {network.name}
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
                      networkChainId={network?.chainId}
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
                </CardContent>
                <CardFooter className="flex flex-col gap-2 px-4 sm:px-6">
                  <Button
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={handleFollow}
                    disabled={isClaiming || hasFollowed}
                  >
                    {hasFollowed ? "Followed" : "Follow on 𝕏 to Claim"}
                  </Button>
                  <Button
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                    variant="outline"
                    onClick={handleBackendClaim}
                    disabled={isClaiming || !address || !faucetDetails.isClaimActive || hasClaimed}
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
                      <TabsList className="grid grid-cols-3">
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
                            <p className="text-xs text-muted-foreground">Add {tokenSymbol} to the faucet</p>
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

                          <Button onClick={handleUpdateClaimParameters} className="text-xs sm:text-sm">Update Parameters</Button>
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
                    </Tabs>
                  </CardContent>
                </Card>
              )}
              {isOwner && <BatchClaim faucetAddress={faucetAddress} />}
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
            <Button type="button" variant="outline" onClick={() => setShowClaimPopup(false)} className="text-xs sm:text-sm">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}