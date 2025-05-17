"use client";

import { FaucetList } from "@/components/faucet-list";
import { NetworkSelector } from "@/components/network-selector";
import { WalletConnect } from "@/components/wallet-connect";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold"> aucet Drop</h1>
              <NetworkSelector />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link href="/batch-claim">
                <Button variant="outline" className="w-full sm:w-auto h-10 text-sm sm:text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Batch Claim
                </Button>
              </Link>
              <Link href="/create">
                <Button className="w-full sm:w-auto h-10 text-sm sm:text-base flex items-center gap-2">
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
  );
}