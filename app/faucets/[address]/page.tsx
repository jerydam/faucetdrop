import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FaucetDetails } from "@/components/faucet-details"
import { FaucetActions } from "@/components/faucet-actions"
import { FaucetStats } from "@/components/faucet-stats"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FaucetDetailsPage({
  params,
}: {
  params: { address: string }
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Faucet Details</h1>
        <FaucetDetails address={params.address} />

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <div className="p-4 border rounded-lg mt-4">
              <h2 className="text-xl font-semibold mb-4">Faucet Overview</h2>
              {/* Faucet overview content */}
            </div>
          </TabsContent>
          <TabsContent value="actions">
            <FaucetActions address={params.address} />
          </TabsContent>
          <TabsContent value="stats">
            <FaucetStats address={params.address} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}
