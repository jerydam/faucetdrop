import { Wallet, PlusCircle, Download } from "lucide-react"

export function HowItWorksSection() {
  const steps = [
    {
      icon: <Wallet className="h-10 w-10 text-white" />,
      title: "Connect Wallet",
      description: "Connect your Ethereum wallet to get started with creating or claiming from faucets.",
    },
    {
      icon: <PlusCircle className="h-10 w-10 text-white" />,
      title: "Create or Find Faucet",
      description: "Create your own faucet or browse existing ones to fund or claim tokens from.",
    },
    {
      icon: <Download className="h-10 w-10 text-white" />,
      title: "Fund or Claim Tokens",
      description: "Fund your faucet with tokens or claim tokens from active faucets.",
    },
  ]

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="flex flex-col md:flex-row justify-between items-start space-y-8 md:space-y-0 md:space-x-8">
          {steps.map((step, index) => (
            <div key={index} className="flex-1 flex flex-col items-center text-center">
              <div className="mb-6 bg-blue-700 p-4 rounded-full">{step.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{step.description}</p>

              {index < steps.length - 1 && (
                <div className="hidden md:block absolute transform translate-x-full">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M5 12H19M19 12L12 5M19 12L12 19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
