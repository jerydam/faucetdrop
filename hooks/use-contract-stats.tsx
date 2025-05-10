"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "@/lib/web3-provider"
import { useFactory } from "@/hooks/use-factory"
import { getFaucetContract } from "@/lib/contract-utils"

type ContractStatsHook = {
  totalFaucets: number
  totalClaimed: number
  totalFunded: number
  isLoading: boolean
}

export function useContractStats(): ContractStatsHook {
  const { provider } = useWeb3()
  const { getAllFaucets } = useFactory()
  const [stats, setStats] = useState({
    totalFaucets: 0,
    totalClaimed: 0,
    totalFunded: 0,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Calculate global contract stats
  useEffect(() => {
    const calculateStats = async () => {
      if (!provider) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Get all faucet addresses
        const faucetAddresses = await getAllFaucets()
        const totalFaucets = faucetAddresses.length

        // Get the latest block number
        const latestBlock = await provider.getBlockNumber()
        // Look back 10000 blocks or to block 0, whichever is greater
        const fromBlock = Math.max(0, latestBlock - 10000)

        let totalClaimedCount = 0
        let totalFundedAmount = ethers.parseEther("0")

        // Process a subset of faucets for performance (up to 10)
        const faucetsToProcess = faucetAddresses.slice(0, 10)

        for (const faucetAddress of faucetsToProcess) {
          try {
            const faucetContract = getFaucetContract(faucetAddress, provider)

            // Get claimed events
            const claimedFilter = faucetContract.filters.Claimed()
            const claimedEvents = await faucetContract.queryFilter(claimedFilter, fromBlock)
            totalClaimedCount += claimedEvents.length

            // Get funded events
            const fundedFilter = faucetContract.filters.Funded()
            const fundedEvents = await faucetContract.queryFilter(fundedFilter, fromBlock)

            // Sum funded amounts
            for (const event of fundedEvents) {
              totalFundedAmount = totalFundedAmount + event.args!.amount
            }
          } catch (error) {
            console.error(`Error processing faucet ${faucetAddress}:`, error)
          }
        }

        // Estimate total claimed based on the sample
        const estimatedTotalClaimed =
          totalFaucets > 0 ? Math.round(totalClaimedCount * (totalFaucets / faucetsToProcess.length)) : 0

        // Convert total funded to ETH for display
        const totalFundedETH = Math.round(Number(ethers.formatEther(totalFundedAmount)))

        setStats({
          totalFaucets,
          totalClaimed: estimatedTotalClaimed,
          totalFunded: totalFundedETH,
        })
      } catch (error) {
        console.error("Error calculating contract stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    calculateStats()
  }, [provider, getAllFaucets])

  return { ...stats, isLoading }
}
