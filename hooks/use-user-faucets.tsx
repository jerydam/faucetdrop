"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/lib/web3-provider"
import { useFactory } from "@/hooks/use-factory"
import { getFaucetContract, getTokenDetails, formatTokenAmount } from "@/lib/contract-utils"

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

export function useUserFaucets() {
  const { provider, address, isConnected } = useWeb3()
  const { getUserFaucets } = useFactory()
  const [faucets, setFaucets] = useState<Faucet[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

  // Trigger a refresh of the user's faucets
  const refreshUserFaucets = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // Load user's faucets
  useEffect(() => {
    const loadUserFaucets = async () => {
      if (!provider || !address || !isConnected) {
        setFaucets([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Get user's faucet addresses
        const userFaucetAddresses = await getUserFaucets(address)

        if (userFaucetAddresses.length === 0) {
          setFaucets([])
          setIsLoading(false)
          return
        }

        // Process each faucet to get details
        const processedFaucets = await Promise.all(
          userFaucetAddresses.map(async (faucetAddress: string) => {
            try {
              const faucetContract = getFaucetContract(faucetAddress, provider)

              // Get basic faucet info
              const [tokenAddress, claimAmountBN, startTimeBN, endTimeBN, isClaimActive, balanceBN] = await Promise.all(
                [
                  faucetContract.token(),
                  faucetContract.claimAmount(),
                  faucetContract.startTime(),
                  faucetContract.endTime(),
                  faucetContract.isClaimActive(),
                  faucetContract.getFaucetBalance(),
                ],
              )

              // Get token details
              const tokenDetails = await getTokenDetails(tokenAddress, provider)

              // Format token amounts
              const claimAmount = await formatTokenAmount(claimAmountBN, tokenAddress, provider)
              const balance = await formatTokenAmount(balanceBN, tokenAddress, provider)

              return {
                address: faucetAddress,
                tokenAddress,
                tokenName: tokenDetails.name,
                tokenSymbol: tokenDetails.symbol,
                claimAmount,
                balance,
                startTime: Number(startTimeBN),
                endTime: Number(endTimeBN),
                isActive: isClaimActive,
              }
            } catch (error) {
              console.error(`Error loading faucet ${faucetAddress}:`, error)
              return null
            }
          }),
        )

        // Filter out any null values from errors
        setFaucets(processedFaucets.filter(Boolean) as Faucet[])
      } catch (error) {
        console.error("Error loading user faucets:", error)
        setFaucets([])
      } finally {
        setIsLoading(false)
      }
    }

    loadUserFaucets()
  }, [provider, address, isConnected, getUserFaucets, refreshTrigger])

  return { faucets, isLoading, refreshUserFaucets }
}
