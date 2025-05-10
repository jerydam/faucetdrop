"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/lib/web3-provider"
import { useFactory } from "@/hooks/use-factory"
import { getTokenDetails, formatTokenAmount } from "@/lib/contract-utils"

type Faucet = {
  address: string
  tokenAddress: string
  tokenName: string
  tokenSymbol: string
  claimAmount: string
  balance: string
  startTime: number
  endTime: number
  isActive: boolean
}

export function useFaucets() {
  const { provider, isConnected } = useWeb3()
  const { getAllFaucetDetails } = useFactory()
  const [faucets, setFaucets] = useState<Faucet[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

  // Trigger a refresh of the faucets list
  const refreshFaucets = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // Load all faucets
  useEffect(() => {
    const loadFaucets = async () => {
      if (!provider) {
        setFaucets([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Get all faucet details from factory
        const faucetDetails = await getAllFaucetDetails()

        // Process each faucet to get token details and format amounts
        const processedFaucets = await Promise.all(
          faucetDetails.map(async (detail: any) => {
            // Get token details
            const tokenDetails = await getTokenDetails(detail.tokenAddress, provider)

            // Format token amounts
            const claimAmount = await formatTokenAmount(detail.claimAmount, detail.tokenAddress, provider)
            const balance = await formatTokenAmount(detail.balance, detail.tokenAddress, provider)

            return {
              address: detail.faucetAddress,
              tokenAddress: detail.tokenAddress,
              tokenName: tokenDetails.name,
              tokenSymbol: tokenDetails.symbol,
              claimAmount,
              balance,
              startTime: detail.startTime,
              endTime: detail.endTime,
              isActive: detail.isActive,
            }
          }),
        )

        setFaucets(processedFaucets)
      } catch (error) {
        console.error("Error loading faucets:", error)
        setFaucets([])
      } finally {
        setIsLoading(false)
      }
    }

    loadFaucets()
  }, [provider, getAllFaucetDetails, refreshTrigger])

  return { faucets, isLoading, refreshFaucets }
}
