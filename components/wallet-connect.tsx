"use client";

import { useState, useContext } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Copy, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from "@/hooks/use-network";

const ARBITRUM_SEPOLIA = 421614;

export function WalletConnect() {
  const { address, isConnected, connect, disconnect, chainId, isSwitchingNetwork } = useWallet();
  const { toast } = useToast();
  const { network } = useNetwork();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (isSwitchingNetwork) {
      toast({
        title: "Network switch in progress",
        description: "Please wait until the network switch is complete.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      await connect();
      if (chainId !== ARBITRUM_SEPOLIA) {
        toast({
          title: "Wrong network",
          description: "Please switch to Arbitrum Sepolia.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: "Address copied",
        description: "Address copied to clipboard",
      });
    }
  };

  const handleViewOnExplorer = () => {
    if (address && network?.blockExplorer) {
      window.open(`${network.blockExplorer}/address/${address}`, "_blank");
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <Button onClick={handleConnect} disabled={isConnecting || isSwitchingNetwork}>
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Wallet className="mr-2 h-4 w-4" />
          {address ? truncateAddress(address) : "Connected"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewOnExplorer}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}