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
import { AlertCircle, Loader2 } from "lucide-react";
import { Header } from "@/components/header";

export default function CreateFaucet() {
  const { provider, address, isConnected, connect, chainId } = useWallet();
  const { network } = useNetwork();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (network && chainId && chainId !== network.chainId) {
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

    if (!provider || !network || !chainId) {
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
        backendAddress: factoryAddress,
        chainId,
        networkId: network.chainId,
      });

      const faucetAddress = await createFaucet(
        provider,
        factoryAddress,
        name,
        tokenAddress,
        chainId,
        network.chainId
      );

      if (!faucetAddress) {
        throw new Error("Failed to get created faucet address");
      }

      toast({
        title: "Faucet Created",
        description: `Your faucet has been created at ${faucetAddress}`,
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

  const isDisabled = isCreating || !network || (chainId !== undefined && network && chainId !== network.chainId);

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
                    <li>Backend: Using the factory address as the backend</li>
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
                  "Create Faucet"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}