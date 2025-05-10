import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { UserProfile } from "@/components/user-profile"
import { UserFaucetManagement } from "@/components/user-faucet-management"
import { UserSettings } from "@/components/user-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>

        <Tabs defaultValue="info" className="mt-8">
          <TabsList>
            <TabsTrigger value="info">User Info</TabsTrigger>
            <TabsTrigger value="faucets">Faucet Management</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="info">
            <UserProfile />
          </TabsContent>
          <TabsContent value="faucets">
            <UserFaucetManagement />
          </TabsContent>
          <TabsContent value="settings">
            <UserSettings />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}
