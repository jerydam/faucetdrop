import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { DashboardOverview } from "@/components/dashboard-overview"
import { UserFaucets } from "@/components/user-faucets"
import { ClaimHistory } from "@/components/claim-history"
import { AdminActions } from "@/components/admin-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <DashboardOverview />

        <Tabs defaultValue="my-faucets" className="mt-8">
          <TabsList>
            <TabsTrigger value="my-faucets">My Faucets</TabsTrigger>
            <TabsTrigger value="claim-history">Claim History</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="my-faucets">
            <UserFaucets />
          </TabsContent>
          <TabsContent value="claim-history">
            <ClaimHistory />
          </TabsContent>
          <TabsContent value="admin">
            <AdminActions />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}
