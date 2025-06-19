"use client";

import { Alert } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { createFaucet } from "@/lib/faucet";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Info } from "lucide-react";
import { Header } from "@/components/header";
import { Switch } from "@/components/ui/switch";

export default function CreateFaucet() {
  const { provider, address, isConnected, connect, chainId } = useWallet();
  const { network } = useNetwork();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackend, setUseBackend] = useState(true); // Backend toggle

  useEffect(() => {
    if (network && chainId !== null && BigInt(chainId) !== BigInt(network.chainId)) {
      setError(`Please switch to the ${network.name} network to create a faucet`);
    } else {
      setError(null);
    }
  }, [network, chainId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter a faucet name");
      return;
    }
    if (chainId === null) {
      setError("Wallet chain ID is not available. Please ensure your wallet is connected.");
      return;
    }

    setError(null);

    if (!isConnected) {
      try {
        await connect();
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        setError("Failed to connect wallet. Please try again.");
        return;
      }
    }

    if (!provider || !network || chainId === null) {
      setError("Wallet not connected or network not selected");
      return;
    }

    setIsCreating(true);

    try {
      const factoryAddress = network.factoryAddress;
      const tokenAddress = network.tokenAddress;

      console.log("Creating faucet with params:", {
        factoryAddress,
        name,
        tokenAddress,
        chainId: chainId.toString(),
        networkId: network.chainId.toString(),
        useBackend,
        faucetType: useBackend ? "Backend Managed" : "Manual Whitelist",
      });

      const faucetAddress = await createFaucet(
        provider,
        factoryAddress,
        name,
        tokenAddress,
        BigInt(chainId), // Convert chainId to bigint
        BigInt(network.chainId), // Convert network.chainId to bigint
        useBackend // Pass the backend toggle
      );

      if (!faucetAddress) {
        throw new Error("Failed to get created faucet address");
      }

      toast({
        title: "Faucet Created",
        description: `Your ${useBackend ? "backend-managed" : "manually-managed"} faucet has been created at ${faucetAddress}`,
      });

      window.location.href = `/faucet/${faucetAddress}?networkId=${network.chainId}`;
    } catch (error: any) {
      console.error("Error creating faucet:", error);
      let errorMessage = error.message || "Failed to create faucet";

      if (errorMessage.includes("Switch to the network")) {
        toast({
          title: "Network Mismatch",
          description: `Please switch to the ${network?.name} network to create a faucet`,
          variant: "destructive",
          action: (
            <Button
              onClick={() =>
                network &&
                window.ethereum.request({
                  method: "wallet_switchEthereumChain",
                  params: [{ chainId: `0x${network.chainId.toString(16)}` }],
                })
              }
            >
              Switch to {network?.name}
            </Button>
          ),
        });
      } else {
        toast({
          title: "Failed to create faucet",
          description: errorMessage,
          variant: "destructive",
        });
      }
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const isDisabled = isCreating || !network || (chainId !== null && network && BigInt(chainId) !== BigInt(network.chainId));

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Header pageTitle="Create Faucet" />
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create New Faucet</CardTitle>
              <CardDescription>
                Create a new token faucet on {network?.name || "the current network"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Faucet Name</Label>
                <Input
                  id="name"
                  placeholder="Enter a name for your faucet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Faucet Management Type</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="backend-toggle"
                      checked={useBackend}
                      onCheckedChange={setUseBackend}
                    />
                    <Label htmlFor="backend-toggle">
                      {useBackend ? "Backend Managed (Automatic)" : "Manual Whitelist Management"}
                    </Label>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>
                    {useBackend ? "Backend Managed Mode" : "Manual Whitelist Mode"}
                  </AlertTitle>
                  <AlertDescription>
                    {useBackend ? (
                      <div>
                        <p>The backend will automatically handle:</p>
                        <ul className="list-disc pl-5 mt-2">
                          <li>User whitelist validation</li>
                          <li>Claim processing with secret codes</li>
                          <li>Automatic token distribution</li>
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <p>You will manually manage:</p>
                        <ul className="list-disc pl-5 mt-2">
                          <li>Adding addresses to whitelist</li>
                          <li>Setting custom claim amounts per user</li>
                          <li>Claim button visibility (only for whitelisted users)</li>
                          <li>File uploads for batch operations</li>
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Automatic Configuration</AlertTitle>
                <AlertDescription>
                  <p>The following will be configured automatically:</p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>
                      Token:{" "}
                      {network?.tokenAddress === "0x0000000000000000000000000000000000000000"
                        ? `Native Token (${network?.nativeCurrency?.symbol || "ETH"})`
                        : `ERC20 Token (${network?.tokenAddress})`}
                    </li>
                    <li>Backend: Always configured for claim processing</li>
                    <li>Faucet Type: {useBackend ? "0 (Backend Managed)" : "1 (Manual Whitelist)"}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleCreate}
                disabled={isDisabled}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : !isConnected ? (
                  "Connect & Create Faucet"
                ) : (
                  `Create ${useBackend ? "Backend-Managed" : "Manual"} Faucet`
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}