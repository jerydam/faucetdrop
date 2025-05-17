"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NetworkSelector } from "@/components/network-selector";
import {
  getFaucetDetails,
  claimTokens,
  fundFaucet,
  withdrawTokens,
  setClaimParameters,
  setWhitelist,
} from "@/lib/faucet";
import { ethers, formatUnits, parseUnits } from "ethers";
import { ArrowLeft, Clock, Coins, Download, Upload, Users } from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { claimViaBackend } from "@/lib/backend-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ClaimResponse {
  success: boolean;
  txHash?: string;
  status?: string;
}

interface BackendError {
  message?: string;
  detail?: string;
}

export default function FaucetDetails() {
  const { address: faucetAddress } = useParams<{ address: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const { address, isConnected, provider } = useWallet();

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
  const [tokenSymbol, setTokenSymbol] = useState("ETH");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [hasFollowed, setHasFollowed] = useState(false);
  const [showClaimPopup, setShowClaimPopup] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const xProfileLink = "https://x.com/FaucetDrops";
  const popupContent = (amount: string, txHash: string | null) =>
    `I just claimed ${amount} ETH from @FaucetDrops. Verify claim: ${
      txHash ? `https://arbiscan.io/tx/0x${txHash}` : "Transaction not available"
    }`;

  const isOwner = address && faucetDetails?.owner && address.toLowerCase() === faucetDetails.owner.toLowerCase();

  useEffect(() => {
    if (provider && faucetAddress) {
      loadFaucetDetails();
    }
  }, [provider, faucetAddress, address]);

  const loadFaucetDetails = async () => {
    if (!provider) return;

    try {
      setLoading(true);
      const details = await getFaucetDetails(provider, faucetAddress);
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

      setTokenSymbol(details.tokenSymbol || "ETH");
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

  const handleFollow = () => {
    window.open(xProfileLink, "_blank");
    setHasFollowed(true);
  };

  const handleBackendClaim = async () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to claim tokens",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsClaiming(true);
      const data: ClaimResponse = await claimViaBackend(address, faucetAddress);

      if (!data.success) {
        throw new Error("Claim request failed");
      }

      if (data.status === "pending" && data.txHash) {
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL || "https://arb1.arbitrum.io/rpc"
        );
        let attempts = 0;
        while (attempts < 30) {
          const receipt = await provider.getTransactionReceipt(data.txHash);
          if (receipt) {
            const claimedAmount = formatUnits(faucetDetails.claimAmount, tokenDecimals);
            setTxHash(data.txHash);
            toast({
              title: "Tokens claimed successfully via backend",
              description: `You have claimed ${claimedAmount} ${tokenSymbol}`,
            });
            setShowClaimPopup(true);
            await loadFaucetDetails();
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
          attempts++;
        }
        if (attempts >= 30) {
          throw new Error("Transaction not confirmed within timeout");
        }
      } else if (data.txHash) {
        const claimedAmount = formatUnits(faucetDetails.claimAmount, tokenDecimals);
        setTxHash(data.txHash);
        toast({
          title: "Tokens claimed successfully via backend",
          description: `You have claimed ${claimedAmount} ${tokenSymbol}`,
        });
        setShowClaimPopup(true);
        await loadFaucetDetails();
      } else {
        throw new Error("No transaction hash returned");
      }
    } catch (error) {
      console.error("Error claiming tokens via backend:", error);
      let errorMessage = "Failed to contact the backend server";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        const backendError = error as BackendError;
        errorMessage = backendError.message || backendError.detail || errorMessage;
      }

      if (errorMessage.includes("max fee per gas less than block base fee")) {
        errorMessage = "Transaction failed: Gas fee too low. Please try again later or contact support.";
      }

      toast({
        title: "Failed to claim tokens via backend",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleShareOnX = () => {
    const claimedAmount = formatUnits(faucetDetails.claimAmount, tokenDecimals);
    const shareText = encodeURIComponent(popupContent(claimedAmount, txHash));
    const shareUrl = `https://x.com/intent/tweet?text=${shareText}`;
    window.open(shareUrl, "_blank");
    setShowClaimPopup(false);
  };

  const handleFund = async () => {
    if (!isConnected || !provider || !fundAmount) return;

    try {
      const amount = parseUnits(fundAmount, tokenDecimals);
      await fundFaucet(provider, faucetAddress, amount);

      toast({
        title: "Faucet funded successfully",
        description: `You have added ${fundAmount} ${tokenSymbol} to the faucet`,
      });

      setFundAmount("");
      await loadFaucetDetails();
    } catch (error) {
      console.error("Error funding faucet:", error);
      toast({
        title: "Failed to fund faucet",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !provider || !withdrawAmount) return;

    try {
      const amount = parseUnits(withdrawAmount, tokenDecimals);
      await withdrawTokens(provider, faucetAddress, amount);

      toast({
        title: "Tokens withdrawn successfully",
        description: `You have withdrawn ${withdrawAmount} ${tokenSymbol} from the faucet`,
      });

      setWithdrawAmount("");
      await loadFaucetDetails();
    } catch (error) {
      console.error("Error withdrawing tokens:", error);
      toast({
        title: "Failed to withdraw tokens",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleUpdateClaimParameters = async () => {
    if (!isConnected || !provider) return;

    try {
      const claimAmountBN = parseUnits(claimAmount, tokenDecimals);
      const startTimestamp = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : 0;
      const endTimestamp = endTime ? Math.floor(new Date(endTime).getTime() / 1000) : 0;

      await setClaimParameters(provider, faucetAddress, claimAmountBN, startTimestamp, endTimestamp);

      toast({
        title: "Claim parameters updated",
        description: "The faucet claim parameters have been updated successfully",
      });

      await loadFaucetDetails();
    } catch (error) {
      console.error("Error updating claim parameters:", error);
      toast({
        title: "Failed to update claim parameters",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleUpdateWhitelist = async () => {
    if (!isConnected || !provider || !whitelistAddresses.trim()) return;

    try {
      const addresses = whitelistAddresses
        .split(/[\n,]/)
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      if (addresses.length === 0) return;

      await setWhitelist(provider, faucetAddress, addresses, isWhitelistEnabled);

      toast({
        title: "Whitelist updated",
        description: `${addresses.length} addresses have been ${isWhitelistEnabled ? "added to" : "removed from"} the whitelist`,
      });

      setWhitelistAddresses("");
    } catch (error) {
      console.error("Error updating whitelist:", error);
      let errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.includes("max fee per gas less than block base fee")) {
        errorMessage = "Transaction failed: Gas fee too low. Please try again later or contact support.";
      }
      toast({
        title: "Failed to update whitelist",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-sm sm:text-base">Loading faucet details...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col gap-4 sm:gap-6 max-w-5xl mx-auto">
          <header className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="w-9 h-9 sm:w-10 sm:h-10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">Faucet Details</h1>
            <div className="ml-auto">
              <NetworkSelector />
            </div>
          </header>

          {faucetDetails ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-base sm:text-lg lg:text-xl">{faucetDetails.name}</span>
                    {faucetDetails.isClaimActive ? (
                      <span className="text-xs sm:text-sm bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
                        Inactive
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex flex-col gap-1 mt-2 text-xs sm:text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Faucet Address:</span>
                        <span className="font-mono break-all">{faucetAddress}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Owner:</span>
                        <span className="font-mono break-all">{faucetDetails.owner}</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="flex flex-col p-3 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Balance</span>
                      <span className="text-base sm:text-lg lg:text-xl font-bold">
                        {faucetDetails.balance ? formatUnits(faucetDetails.balance, tokenDecimals) : "0"} {tokenSymbol}
                      </span>
                    </div>
                    <div className="flex flex-col p-3 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Claim Amount</span>
                      <span className="text-base sm:text-lg lg:text-xl font-bold">
                        {faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0"} {tokenSymbol}
                      </span>
                    </div>
                    <div className="flex flex-col p-3 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Status</span>
                      <span className="text-sm sm:text-base lg:text-lg font-medium">
                        {hasClaimed ? "Already Claimed" : "Available to Claim"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">
                        Active from{" "}
                        {faucetDetails.startTime
                          ? new Date(Number(faucetDetails.startTime) * 1000).toLocaleString()
                          : "N/A"}{" "} to{" "}
                        {faucetDetails.endTime
                          ? new Date(Number(faucetDetails.endTime) * 1000).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full h-9 sm:h-10 text-sm sm:text-base"
                    onClick={handleFollow}
                    disabled={isClaiming || hasFollowed}
                  >
                    {hasFollowed ? "Followed" : "Follow on 𝕏 to Claim"}
                  </Button>
                  <Button
                    className="w-full h-9 sm:h-10 text-sm sm:text-base"
                    variant="outline"
                    onClick={handleBackendClaim}
                    disabled={isClaiming || !address || !faucetDetails.isClaimActive || hasClaimed}
                  >
                    {isClaiming ? "Claiming..." : hasClaimed ? "Already Claimed" : `Claim`}
                  </Button>
                </CardFooter>
              </Card>

              {isOwner && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg lg:text-xl">Admin Controls</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Manage your faucet settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="fund">
                      <TabsList className="grid grid-cols-3 gap-2">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="fund-amount" className="text-xs sm:text-sm">Fund Amount</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Input
                                id="fund-amount"
                                placeholder="0.0"
                                value={fundAmount}
                                onChange={(e) => setFundAmount(e.target.value)}
                                className="h-9 text-sm"
                              />
                              <Button onClick={handleFund} disabled={!fundAmount} className="h-9 text-sm">
                                <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Fund
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Add ETH to the faucet</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="withdraw-amount" className="text-xs sm:text-sm">Withdraw Amount</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Input
                                id="withdraw-amount"
                                placeholder="0.0"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="h-9 text-sm"
                              />
                              <Button onClick={handleWithdraw} disabled={!withdrawAmount} variant="outline" className="h-9 text-sm">
                                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Withdraw
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Withdraw ETH from the faucet</p>
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
                              className="h-9 text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Amount of ETH users can claim</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="start-time" className="text-xs sm:text-sm">Start Time</Label>
                              <Input
                                id="start-time"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="end-time" className="text-xs sm:text-sm">End Time</Label>
                              <Input
                                id="end-time"
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>

                          <Button onClick={handleUpdateClaimParameters} className="h-9 text-sm">Update Parameters</Button>
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
                              className="text-sm"
                            />
                          </div>

                          <Button onClick={handleUpdateWhitelist} className="h-9 text-sm">Update Whitelist</Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              <Dialog open={showClaimPopup} onOpenChange={setShowClaimPopup}>
                <DialogContent className="w-[95vw] max-w-[380px] sm:max-w-[450px] p-3 sm:p-4 rounded-lg overflow-y-hidden">
                  <DialogHeader>
                    <DialogTitle className="text-sm sm:text-base md:text-lg">Claim Successful!</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm break-words">
                      <span className="flex flex-wrap">
                        {popupContent(formatUnits(faucetDetails.claimAmount, tokenDecimals), txHash)}
                      </span>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-2 sm:mt-3">
                    <Button 
                      onClick={handleShareOnX} 
                      className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                    >
                      Share on 𝕏
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Card>
              <CardContent className="py-6 sm:py-8 text-center">
                <p className="text-sm sm:text-base">Faucet not found or error loading details</p>
                <Button className="mt-3 h-9 text-sm sm:text-base" onClick={() => router.push("/")}>
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}