import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CreateFaucetForm } from "@/components/create-faucet-form"

export default function CreateFaucetPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Create a New Faucet</h1>
        <div className="max-w-2xl mx-auto">
          <CreateFaucetForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
