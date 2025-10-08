// File: components/wallet-connect.tsx (WalletConnectButton)
"use client"

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export function WalletConnectButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()

  const handleClick = async () => {
    await open()
  }

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <Button 
      onClick={handleClick}
      size="sm"
      className="w-full sm:w-auto flex items-center justify-center gap-2"
    >
      <Wallet className="h-4 w-4 flex-shrink-0" />
      <span className="hidden xs:inline">
        {isConnected && address ? formatAddress(address) : "Connect Wallet"}
      </span>
      <span className="xs:hidden">
        {isConnected ? formatAddress(address!) : "Connect"}
      </span>
    </Button>
  )
}