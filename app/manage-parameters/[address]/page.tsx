import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FaucetParametersForm } from "@/components/faucet-parameter-form"

export default function ManageParametersPage({ params }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Manage Faucet Parameters</h1>
        <div className="max-w-2xl mx-auto">
          <FaucetParametersForm faucetAddress={params.address} />
        </div>
      </main>
      <Footer />
    </div>
  )
}