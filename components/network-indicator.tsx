"use client"

import { useNetwork } from "@/hooks/use-network"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function NetworkIndicator() {
  const { network, isSupported, supportedNetworks, switchNetwork } = useNetwork()

  if (!network) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge variant={isSupported ? "outline" : "destructive"} className="cursor-pointer">
          {network}
          {!isSupported && " (Unsupported)"}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {supportedNetworks.map((net) => (
          <DropdownMenuItem key={net.id} onClick={() => switchNetwork(net.id)}>
            Switch to {net.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
