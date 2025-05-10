"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/lib/web3-provider"
import { useFactory } from "@/hooks/use-factory"
import { getFaucetContract, getTokenDetails, formatTokenAmount } from "@/lib/contract-utils"

type Claim = {
  faucetAddress: string
  tokenName: string
  tokenSymbol: string
  amount: string
  timestamp: number
  transactionHash: string
}

export function useClaimHistory() {
  const { provider, address, isConnected } = useWeb3()
  const { getAllFaucets } = useFactory()
  const [claims, setClaims] = useState<Claim[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

  // Trigger a refresh of the claim history
  const refreshClaimHistory = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // Load user's claim history
  useEffect(() => {
    const loadClaimHistory = async () => {
      if (!provider || !address || !isConnected) {
        setClaims([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Get all faucet addresses
        const faucetAddresses = await getAllFaucets()

        if (faucetAddresses.length === 0) {
          setClaims([])
          setIsLoading(false)
          return
        }

        // Get the latest block number
        const latestBlock = await provider.getBlockNumber()
        // Look back 10000 blocks or to block 0, whichever is greater
        const fromBlock = Math.max(0, latestBlock - 10000)

        // Collect all claim events for the user from all faucets
        const allClaims: Claim[] = []

        for (const faucetAddress of faucetAddresses) {
          try {
            const faucetContract = getFaucetContract(faucetAddress, provider)

            // Create filter for Claimed events for this user
            const claimedFilter = faucetContract.filters.Claimed(address)

            // Query events
            const claimedEvents = await faucetContract.queryFilter(claimedFilter, fromBlock)

            if (claimedEvents.length > 0) {
              // Get token address for this faucet
              const tokenAddress = await faucetContract.token()

              // Get token details
              const tokenDetails = await getTokenDetails(tokenAddress, provider)

              // Process claimed events
              for (const event of claimedEvents) {
                const block = await event.getBlock()
                const amount = await formatTokenAmount(event.args!.amount, tokenAddress, provider)

                allClaims.push({
                  faucetAddress,
                  tokenName: tokenDetails.name,
                  tokenSymbol: tokenDetails.symbol,
                  amount,
                  timestamp: block.timestamp,
                  transactionHash: event.transactionHash,
                })
              }
            }
          } catch (error) {
            console.error(`Error processing faucet ${faucetAddress}:`, error)
          }
        }

        // Sort claims by timestamp (newest first)
        allClaims.sort((a, b) => b.timestamp - a.timestamp)

        setClaims(allClaims)
      } catch (error) {
        console.error("Error loading claim history:", error)
        setClaims([])
      } finally {
        setIsLoading(false)
      }
    }

    loadClaimHistory()
  }, [provider, address, isConnected, getAllFaucets, refreshTrigger])

  return { claims, isLoading, refreshClaimHistory }
}
