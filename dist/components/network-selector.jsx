"use client";
import { useNetwork } from "@/hooks/use-network";
import { Button } from "@/components/ui/button";
// Simplified network selector that just displays the current network
export function NetworkSelector() {
    const { network } = useNetwork();
    return (<Button variant="outline" className="flex items-center gap-2" disabled>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: network?.color || "#28A0F0" }}/>
      {network?.name || "Arbitrum Sepolia"}
    </Button>);
}
