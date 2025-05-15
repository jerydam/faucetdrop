"use client";

import { useNetwork } from "@/hooks/use-network";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define supported networks
const SUPPORTED_NETWORKS = [
  {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    color: "#28A0F0",
    blockExplorer: "https://sepolia.arbiscan.io",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  },
  {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    color: "#627EEA",
    blockExplorer: "https://sepolia.etherscan.io",
    rpcUrl: "https://rpc.sepolia.org",
  },
];

export function NetworkSelector() {
  const { network, switchNetwork } = useNetwork();

  const handleNetworkSwitch = async (chainId: number) => {
    try {
      await switchNetwork(chainId);
    } catch (error) {
      console.error("Error switching network:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 text-sm sm:text-base flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: network?.color || "#28A0F0" }}
          />
          {network?.name || "Select Network"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_NETWORKS.map((net) => (
          <DropdownMenuItem
            key={net.chainId}
            onClick={() => handleNetworkSwitch(net.chainId)}
            className="text-sm flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: net.color }} />
            {net.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}