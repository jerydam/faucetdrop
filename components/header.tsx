"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Menu, X, Droplet } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { NetworkIndicator } from "@/components/network-indicator"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { address, connect, disconnect, isConnected, isConnecting } = useWallet()

  const truncateAddress = (address: string) => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <header className="border-b bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Droplet className="h-6 w-6 text-blue-700" />
              <span className="text-xl font-bold">FaucetFactory</span>
            </Link>

            <nav className="hidden md:flex space-x-6 ml-10">
              <Link href="/" className="text-sm font-medium hover:text-blue-700">
                Home
              </Link>
              <Link href="/faucets" className="text-sm font-medium hover:text-blue-700">
                Faucets
              </Link>
              <Link href="/dashboard" className="text-sm font-medium hover:text-blue-700">
                Dashboard
              </Link>
              <Link href="/profile" className="text-sm font-medium hover:text-blue-700">
                Profile
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <NetworkIndicator />

            {isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">{truncateAddress(address)}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={disconnect}>Disconnect</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={connect} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}

            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <nav className="flex flex-col space-y-4">
              <Link href="/" className="text-sm font-medium hover:text-blue-700" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
              <Link
                href="/faucets"
                className="text-sm font-medium hover:text-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Faucets
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:text-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="text-sm font-medium hover:text-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
