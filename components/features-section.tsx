import { PlusCircle, Coins, Download, Settings } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: <PlusCircle className="h-10 w-10 text-blue-700" />,
      title: "Create Faucets",
      description: "Deploy your own token faucet in seconds with just a few clicks. No coding required.",
    },
    {
      icon: <Coins className="h-10 w-10 text-blue-700" />,
      title: "Fund Tokens",
      description: "Add tokens to your faucet to make them available for others to claim.",
    },
    {
      icon: <Download className="h-10 w-10 text-blue-700" />,
      title: "Claim Tokens",
      description: "Easily claim tokens from any active faucet with a single transaction.",
    },
    {
      icon: <Settings className="h-10 w-10 text-blue-700" />,
      title: "Manage Settings",
      description: "Control claim amounts, time windows, and other parameters for your faucets.",
    },
  ]

  return (
    <section className="py-20 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 border rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
