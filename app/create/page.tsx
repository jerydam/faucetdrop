"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NetworkSelector } from "@/components/network-selector";
import { createFaucet } from "@/lib/faucet-factory";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

const ARBITRUM_MAINNET = 42161;

export default function CreateFaucet() {
  const { toast } = useToast();
  const router = useRouter();
  const { isConnected, provider, chainId, isSwitchingNetwork } = useWallet();
  const { network } = useNetwork();
  const [isCreating, setIsCreating] = useState(false);
  const [faucetName, setFaucetName] = useState("");

  const handleCreate = async () => {
    if (!isConnected || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a faucet",
        variant: "destructive",
      });
      return;
    }

    if (chainId !== ARBITRUM_MAINNET) {
      toast({
        title: "Wrong network",
        description: "Please switch to Arbitrum Mainnet to create a faucet.",
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

    if (!faucetName.trim()) {
      toast({
        title: "Faucet name required",
        description: "Please enter a name for the faucet.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const faucetAddress = await createFaucet(provider, network, faucetName);

      toast({
        title: "Faucet created successfully",
        description: `New faucet address: ${faucetAddress}`,
      });

      router.push(`/faucet/${faucetAddress}`);
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
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <header className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="w-10 h-10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold">Create New Faucet</h1>
            <div className="ml-auto">
              <NetworkSelector />
            </div>
          </header>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Create a Token Faucet</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Create a new faucet for distributing tokens on Arbitrum Mainnet. After creation, you'll be able to configure the
                token and other settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="faucet-name" className="text-xs sm:text-sm">Faucet Name</Label>
                  <Input
                    id="faucet-name"
                    placeholder="Enter faucet name"
                    value={faucetName}
                    onChange={(e) => setFaucetName(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Give your faucet a unique name.</p>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Clicking the button below will create a new faucet contract. Once created, you'll need to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs sm:text-sm text-muted-foreground">
                  <li>Configure claim parameters</li>
                  <li>Fund the faucet with ETH</li>
                  <li>Manage whitelist settings</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full h-10 text-sm sm:text-base"
                onClick={handleCreate}
                disabled={isCreating || !isConnected || isSwitchingNetwork || chainId !== ARBITRUM_MAINNET || !network || !faucetName.trim()}
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