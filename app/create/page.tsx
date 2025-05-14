"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network"; // Import useNetwork
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { NetworkSelector } from "@/components/network-selector";
import { createFaucet } from "@/lib/faucet-factory";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

const ARBITRUM_SEPOLIA = 421614;

export default function CreateFaucet() {
  const { toast } = useToast();
  const router = useRouter();
  const { isConnected, provider, chainId, isSwitchingNetwork } = useWallet();
  const { network } = useNetwork(); // Use useNetwork
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!isConnected || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a faucet",
        variant: "destructive",
      });
      return;
    }

    if (chainId !== ARBITRUM_SEPOLIA) {
      toast({
        title: "Wrong network",
        description: "Please switch to Arbitrum Sepolia to create a faucet.",
        variant: "destructive",
      });
      return;
    }

    if (isSwitchingNetwork) {
      toast({
        title: "Network switch in progress",
        description: "Please wait until the network switch is complete.",
        variant: "destructive",
      });
      return;
    }

    if (!network) {
      toast({
        title: "Network not selected",
        description: "Please select a network to create a faucet.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const faucetAddress = await createFaucet(provider, network); // Pass network

      toast({
        title: "Faucet created successfully",
        description: `New faucet address: ${faucetAddress}`,
      });

      router.push("/");
    } catch (error: any) {
      console.error("Error creating faucet:", error);
      toast({
        title: "Failed to create faucet",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 max-w-2xl mx-auto">
          <header className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Create New Faucet</h1>
            <div className="ml-auto">
              <NetworkSelector />
            </div>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Create a Token Faucet</CardTitle>
              <CardDescription>
                Create a new faucet for distributing tokens on testnet. After creation, you'll be able to configure the
                token and other settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Clicking the button below will create a new faucet contract. Once created, you'll need to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Set the token address</li>
                <li>Configure claim parameters</li>
                <li>Fund the faucet with tokens</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={isCreating || !isConnected || isSwitchingNetwork || chainId !== ARBITRUM_SEPOLIA || !network}
              >
                {isCreating ? (
                  "Creating..."
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Faucet
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}