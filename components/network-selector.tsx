"use client";

import { useNetwork } from "@/hooks/use-network";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SUPPORTED_NETWORKS = [
  {
    chainId: 42161,
    name: "Arbitrum Mainnet",
    color: "#28A0F0",
    blockExplorer: "https://arbiscan.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
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