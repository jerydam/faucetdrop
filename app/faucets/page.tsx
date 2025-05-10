import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FaucetsList } from "@/components/faucets-list"
import { FaucetFilters } from "@/components/faucet-filters"

export default function FaucetsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Explore Faucets</h1>
        <FaucetFilters />
        <FaucetsList />
      </main>
      <Footer />
    </div>
  )
}
