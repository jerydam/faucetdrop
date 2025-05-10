"use client"

import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useRouter } from "next/navigation"

export function HeroSection() {
  const { connect, isConnected } = useWallet()
  const router = useRouter()

  const handleCreateFaucet = () => {
    router.push("/create-faucet")
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1
              className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]"
              style={{ animationDelay: "0ms" }}
            >
              Decentralized Token Faucets for Everyone
            </h1>
            <p
              className="text-lg mb-8 text-gray-600 dark:text-gray-300 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]"
              style={{ animationDelay: "100ms" }}
            >
              Create, fund, and claim tokens from decentralized faucets. A simple and transparent way to distribute
              tokens on the blockchain.
            </p>
            <div className="opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]" style={{ animationDelay: "200ms" }}>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                {isConnected ? (
                  <>
                    <Button onClick={handleCreateFaucet} size="lg" className="bg-blue-700 hover:bg-blue-800">
                      Create a Faucet
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <a href="/faucets">Explore Faucets</a>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={connect} size="lg" className="bg-blue-700 hover:bg-blue-800">
                      Connect Wallet
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <a href="/faucets">Explore Faucets</a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="md:w-1/2">
            <div
              className="relative opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards] scale-95 transform transition-transform duration-500"
              style={{ animationDelay: "300ms" }}
            >
              <div className="w-full h-[400px] bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center overflow-hidden">
                <TokenFlowAnimation />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TokenFlowAnimation() {
  return (
    <div className="relative w-full h-full">
      <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2">
        <div className="w-16 h-32 bg-blue-700 rounded-t-lg relative">
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-blue-900 rounded-t-lg"></div>
        </div>
      </div>

      {/* Water/token drops */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="absolute top-[45%] left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500"
          style={{
            animation: `dropFall 2s infinite ${i * 0.2}s`,
            opacity: 0.8 - i * 0.05,
          }}
        ></div>
      ))}

      {/* Pool of tokens */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-64 h-16 bg-blue-500 rounded-full opacity-70"></div>

      {/* Token symbols floating up */}
      {["ETH", "DAI", "USDC", "LINK", "UNI"].map((symbol, i) => (
        <div
          key={i}
          className="absolute bottom-8 text-blue-700 font-bold"
          style={{
            left: `${20 + i * 15}%`,
            animation: `tokenFloat 3s infinite ${i * 0.5}s`,
          }}
        >
          {symbol}
        </div>
      ))}
    </div>
  )
}
