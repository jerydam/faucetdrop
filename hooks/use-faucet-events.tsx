"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/lib/web3-provider"
import { getFaucetContract, formatTokenAmount } from "@/lib/contract-utils"

type ClaimEvent = {
  user: string
  amount: string
  timestamp: number
  transactionHash: string
}

type FundEvent = {
  funder: string
  amount: string
  timestamp: number
  transactionHash: string
}

type WithdrawEvent = {
  owner: string
  amount: string
  timestamp: number
  transactionHash: string
}

type ParameterUpdateEvent = {
  claimAmount: string
  startTime: number
  endTime: number
  timestamp: number
  transactionHash: string
}

type FaucetEvents = {
  claimed: ClaimEvent[]
  funded: FundEvent[]
  withdrawn: WithdrawEvent[]
  parameterUpdates: ParameterUpdateEvent[]
}

export function useFaucetEvents(faucetAddress: string) {
  const { provider } = useWeb3()
  const [events, setEvents] = useState<FaucetEvents>({
    claimed: [],
    funded: [],
    withdrawn: [],
    parameterUpdates: [],
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

  // Trigger a refresh of the events
  const refreshEvents = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // Load faucet events
  useEffect(() => {
    const loadEvents = async () => {
      if (!provider || !faucetAddress) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const faucetContract = getFaucetContract(faucetAddress, provider)
        const tokenAddress = await faucetContract.token()

        // Get the latest block number
        const latestBlock = await provider.getBlockNumber()
        // Look back 10000 blocks or to block 0, whichever is greater
        const fromBlock = Math.max(0, latestBlock - 10000)

        // Create filter for each event type
        const claimedFilter = faucetContract.filters.Claimed()
        const fundedFilter = faucetContract.filters.Funded()
        const withdrawnFilter = faucetContract.filters.Withdrawn()
        const parameterUpdatedFilter = faucetContract.filters.ClaimParametersUpdated()

        // Query events
        const [claimedEvents, fundedEvents, withdrawnEvents, parameterUpdatedEvents] = await Promise.all([
          faucetContract.queryFilter(claimedFilter, fromBlock),
          faucetContract.queryFilter(fundedFilter, fromBlock),
          faucetContract.queryFilter(withdrawnFilter, fromBlock),
          faucetContract.queryFilter(parameterUpdatedFilter, fromBlock),
        ])

        // Process claimed events
        const processedClaimedEvents = await Promise.all(
          claimedEvents.map(async (event) => {
            const block = await event.getBlock()
            const amount = await formatTokenAmount(event.args!.amount, tokenAddress, provider)

            return {
              user: event.args!.user,
              amount,
              timestamp: block.timestamp,
              transactionHash: event.transactionHash,
            }
          }),
        )

        // Process funded events
        const processedFundedEvents = await Promise.all(
          fundedEvents.map(async (event) => {
            const block = await event.getBlock()
            const amount = await formatTokenAmount(event.args!.amount, tokenAddress, provider)

            return {
              funder: event.args!.funder,
              amount,
              timestamp: block.timestamp,
              transactionHash: event.transactionHash,
            }
          }),
        )

        // Process withdrawn events
        const processedWithdrawnEvents = await Promise.all(
          withdrawnEvents.map(async (event) => {
            const block = await event.getBlock()
            const amount = await formatTokenAmount(event.args!.amount, tokenAddress, provider)

            return {
              owner: event.args!.owner,
              amount,
              timestamp: block.timestamp,
              transactionHash: event.transactionHash,
            }
          }),
        )

        // Process parameter update events
        const processedParameterUpdateEvents = await Promise.all(
          parameterUpdatedEvents.map(async (event) => {
            const block = await event.getBlock()
            const claimAmount = await formatTokenAmount(event.args!.claimAmount, tokenAddress, provider)

            return {
              claimAmount,
              startTime: Number(event.args!.startTime),
              endTime: Number(event.args!.endTime),
              timestamp: block.timestamp,
              transactionHash: event.transactionHash,
            }
          }),
        )

        // Sort events by timestamp (newest first)
        processedClaimedEvents.sort((a, b) => b.timestamp - a.timestamp)
        processedFundedEvents.sort((a, b) => b.timestamp - a.timestamp)
        processedWithdrawnEvents.sort((a, b) => b.timestamp - a.timestamp)
        processedParameterUpdateEvents.sort((a, b) => b.timestamp - a.timestamp)

        setEvents({
          claimed: processedClaimedEvents,
          funded: processedFundedEvents,
          withdrawn: processedWithdrawnEvents,
          parameterUpdates: processedParameterUpdateEvents,
        })
      } catch (error) {
        console.error("Error loading faucet events:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()
  }, [provider, faucetAddress, refreshTrigger])

  return { events, isLoading, refreshEvents }
}
