"use client"

import { useEffect, useState } from "react"
import { useContractStats } from "@/hooks/use-contract-stats"

export function StatsSection() {
  const { totalFaucets, totalClaimed, totalFunded, isLoading } = useContractStats()

  // Animation for counting up
  const [displayStats, setDisplayStats] = useState({
    faucets: 0,
    claimed: 0,
    funded: 0,
  })

  useEffect(() => {
    if (!isLoading) {
      const duration = 2000 // 2 seconds
      const steps = 20
      const interval = duration / steps

      let step = 0
      const timer = setInterval(() => {
        step++
        const progress = step / steps

        setDisplayStats({
          faucets: Math.floor(totalFaucets * progress),
          claimed: Math.floor(totalClaimed * progress),
          funded: Math.floor(totalFunded * progress),
        })

        if (step === steps) {
          clearInterval(timer)
          setDisplayStats({
            faucets: totalFaucets,
            claimed: totalClaimed,
            funded: totalFunded,
          })
        }
      }, interval)

      return () => clearInterval(timer)
    }
  }, [isLoading, totalFaucets, totalClaimed, totalFunded])

  return (
    <section className="py-20 bg-blue-700 text-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Real-Time Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-blue-800 rounded-lg text-center">
            <div className="text-4xl font-bold mb-2">{isLoading ? "..." : displayStats.faucets}</div>
            <div className="text-lg">Total Faucets Created</div>
          </div>
          <div className="p-6 bg-blue-800 rounded-lg text-center">
            <div className="text-4xl font-bold mb-2">{isLoading ? "..." : displayStats.claimed}</div>
            <div className="text-lg">Total Tokens Claimed</div>
          </div>
          <div className="p-6 bg-blue-800 rounded-lg text-center">
            <div className="text-4xl font-bold mb-2">{isLoading ? "..." : `${displayStats.funded} USDC`}</div>
            <div className="text-lg">Total Value Funded</div>
          </div>
        </div>
      </div>
    </section>
  )
}
