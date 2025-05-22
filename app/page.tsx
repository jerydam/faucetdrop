"use client"

import { FaucetList } from "@/components/faucet-list"
import { NetworkSelector } from "@/components/network-selector"
import { WalletConnect } from "@/components/wallet-connect"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Token Faucet</h1>
              <NetworkSelector />
            </div>
            <div className="flex items-center gap-4">
              <Link href="/batch-claim">
                <Button variant="outline" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Batch Claim
                </Button>
              </Link>
              <Link href="/create">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Faucet
                </Button>
              </Link>
              <WalletConnect />
            </div>
          </header>

          <FaucetList />
        </div>
      </div>
    </main>
  )
}
