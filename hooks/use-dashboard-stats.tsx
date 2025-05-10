"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "@/lib/web3-provider"
import { useFactory } from "@/hooks/use-factory"
import { useUserFaucets } from "@/hooks/use-user-faucets"
import { getFaucetContract } from "@/lib/contract-utils"

type DashboardStats = {
  totalFaucets: number
  activeFaucets: number
  totalClaimed: string
  claimCount: number
  totalFunded: string
  currentBalance: string
}

export function useDashboardStats() {
  const { provider, address, isConnected } = useWeb3()
  const { getUserFaucets } = useFactory()
  const { faucets } = useUserFaucets()
  const [stats, setStats] = useState<DashboardStats>({
    totalFaucets: 0,
    activeFaucets: 0,
    totalClaimed: "0",
    claimCount: 0,
    totalFunded: "0",
    currentBalance: "0",
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Calculate dashboard stats
  useEffect(() => {
    const calculateStats = async () => {
      if (!provider || !address || !isConnected) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Basic stats from faucets list
        const totalFaucets = faucets.length
        const activeFaucets = faucets.filter((f) => f.isActive).length

        // Calculate total balance across all faucets
        let totalBalance = ethers.parseEther("0")

        for (const faucet of faucets) {
          totalBalance = totalBalance + ethers.parseEther(faucet.balance)
        }

        // Get user's faucet addresses
        const userFaucetAddresses = await getUserFaucets(address)

        // Calculate claim stats
        let totalClaimedAmount = ethers.parseEther("0")
        let claimCount = 0
        let totalFundedAmount = ethers.parseEther("0")

        // Get the latest block number
        const latestBlock = await provider.getBlockNumber()
        // Look back 10000 blocks or to block 0, whichever is greater
        const fromBlock = Math.max(0, latestBlock - 10000)

        for (const faucetAddress of userFaucetAddresses) {
          try {
            const faucetContract = getFaucetContract(faucetAddress, provider)
            const tokenAddress = await faucetContract.token()

            // Get claimed events
            const claimedFilter = faucetContract.filters.Claimed()
            const claimedEvents = await faucetContract.queryFilter(claimedFilter, fromBlock)

            // Count claims and sum amounts
            claimCount += claimedEvents.length

            for (const event of claimedEvents) {
              totalClaimedAmount = totalClaimedAmount + event.args!.amount
            }

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

        // Format amounts (simplified for display)
        const formattedTotalClaimed = ethers.formatEther(totalClaimedAmount)
        const formattedTotalFunded = ethers.formatEther(totalFundedAmount)
        const formattedCurrentBalance = ethers.formatEther(totalBalance)

        setStats({
          totalFaucets,
          activeFaucets,
          totalClaimed: formattedTotalClaimed,
          claimCount,
          totalFunded: formattedTotalFunded,
          currentBalance: formattedCurrentBalance,
        })
      } catch (error) {
        console.error("Error calculating dashboard stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    calculateStats()
  }, [provider, address, isConnected, getUserFaucets, faucets])

  return { stats, isLoading }
}
