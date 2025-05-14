"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from "@/hooks/use-network"; // Import useNetwork
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllFaucets } from "@/lib/faucet-factory";
import { formatUnits } from "ethers";
import { ArrowRight, Coins } from "lucide-react";
import Link from "next/link";

interface FaucetCardProps {
  faucet: any;
}

function FaucetCard({ faucet }: FaucetCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{faucet.tokenSymbol || "Token"} Faucet</span>
          {faucet.isClaimActive ? (
            <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
              Active
            </span>
          ) : (
            <span className="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
              Inactive
            </span>
          )}
        </CardTitle>
        <CardDescription className="truncate text-xs">{faucet.faucetAddress}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Balance:</span>
            <span className="font-medium">
              {faucet.balance ? formatUnits(faucet.balance, faucet.tokenDecimals || 18) : "0"}{" "}
              {faucet.tokenSymbol || "tokens"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Claim Amount:</span>
            <span className="font-medium">
              {faucet.claimAmount ? formatUnits(faucet.claimAmount, faucet.tokenDecimals || 18) : "0"}{" "}
              {faucet.tokenSymbol || "tokens"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/faucet/${faucet.faucetAddress}`} className="w-full">
          <Button variant="outline" className="w-full">
            <Coins className="mr-2 h-4 w-4" />
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export function FaucetList() {
  const { provider } = useWallet();
  const { toast } = useToast();
  const { network } = useNetwork(); // Use useNetwork to get network
  const [faucets, setFaucets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (provider && network) {
      loadFaucets();
    }
  }, [provider, network]);

  const loadFaucets = async () => {
    if (!provider || !network) return;

    try {
      setLoading(true);
      const faucetDetails = await getAllFaucets(provider, network); // Pass network
      setFaucets(faucetDetails);
    } catch (error) {
      console.error("Error loading faucets:", error);
      toast({
        title: "Failed to load faucets",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading faucets...</p>
        </div>
      </div>
    );
  }

  if (faucets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Coins className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No Faucets Found</h3>
          <p className="text-muted-foreground mb-6">
            There are no faucets available yet. Create your first faucet to get started.
          </p>
          <Link href="/create">
            <Button>Create Faucet</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {faucets.map((faucet) => (
        <FaucetCard key={faucet.faucetAddress} faucet={faucet} />
      ))}
    </div>
  );
}