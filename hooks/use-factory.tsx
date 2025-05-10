"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/lib/web3-provider"
import { getFactoryContract } from "@/lib/contract-utils"
import { useWallet } from "@/hooks/use-wallet"
import { useToast } from "@/hooks/use-toast"

export function useFactory() {
  const { provider, signer, address } = useWeb3()
  const { isNetworkSupported, ensureSupportedNetwork } = useWallet()
  const { toast } = useToast()
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [factoryAddress, setFactoryAddress] = useState<string>("0x0e3cf319d5E5D30c8E905dBCA0c033b441812A11")

  // Check if current user is the factory owner
  useEffect(() => {
    const checkOwnership = async () => {
      if (!provider || !address || !isNetworkSupported) {
        setIsOwner(false)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const factoryContract = getFactoryContract(provider)
        setFactoryAddress(factoryContract.target as string)

        const owner = await factoryContract.owner()
        setIsOwner(owner.toLowerCase() === address.toLowerCase())
      } catch (error) {
        console.error("Error checking factory ownership:", error)
        setIsOwner(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkOwnership()
  }, [provider, address, isNetworkSupported])

  // Fix the createFaucet function to only accept tokenAddress
  const createFaucet = useCallback(
    async (tokenAddress: string): Promise<string> => {
      if (!signer || !isNetworkSupported) {
        const networkOk = await ensureSupportedNetwork()
        if (!networkOk) {
          throw new Error("Please switch to a supported network")
        }
        throw new Error("Wallet not connected")
      }

      try {
        const factoryContract = getFactoryContract(signer)

        // Show toast for pending transaction
        toast({
          title: "Creating Faucet",
          description: "Please confirm the transaction in your wallet...",
        })

        // Create faucet with only the token address parameter
        const tx = await factoryContract.createFaucet(tokenAddress)

        // Show toast for transaction submitted
        toast({
          title: "Transaction Submitted",
          description: "Your faucet is being created...",
        })

        // Wait for transaction confirmation
        const receipt = await tx.wait()

        // Find the FaucetCreated event in the logs
        const factoryInterface = factoryContract.interface
        const faucetCreatedEvent = receipt.logs
          .map((log: any) => {
            try {
              return factoryInterface.parseLog({ topics: log.topics as string[], data: log.data })
            } catch (e) {
              return null
            }
          })
          .find((event: any) => event && event.name === "FaucetCreated")

        if (!faucetCreatedEvent) {
          throw new Error("Failed to find FaucetCreated event in transaction logs")
        }

        const faucetAddress = faucetCreatedEvent.args.faucet

        // Show success toast
        toast({
          title: "Faucet Created",
          description: `Your new faucet has been created at ${faucetAddress}`,
        })

        return faucetAddress
      } catch (error: any) {
        console.error("Error creating faucet:", error)

        // Show error toast
        toast({
          title: "Error Creating Faucet",
          description: error.message || "An error occurred while creating the faucet",
          variant: "destructive",
        })

        throw error
      }
    },
    [signer, isNetworkSupported, ensureSupportedNetwork, toast],
  )

  // Get all faucets
  const getAllFaucets = useCallback(async (): Promise<string[]> => {
    if (!provider || !isNetworkSupported) {
      return []
    }

    try {
      const factoryContract = getFactoryContract(provider)
      return await factoryContract.getAllFaucets()
    } catch (error) {
      console.error("Error getting all faucets:", error)
      return []
    }
  }, [provider, isNetworkSupported])

  // Get user faucets
  const getUserFaucets = useCallback(
    async (userAddress: string = address): Promise<string[]> => {
      if (!provider || !userAddress || !isNetworkSupported) {
        return []
      }

      try {
        const factoryContract = getFactoryContract(provider)
        return await factoryContract.getUserFaucets(userAddress)
      } catch (error) {
        console.error("Error getting user faucets:", error)
        return []
      }
    },
    [provider, address, isNetworkSupported],
  )

  // Get all faucet details
  const getAllFaucetDetails = useCallback(async () => {
    if (!provider || !isNetworkSupported) {
      return []
    }

    try {
      const factoryContract = getFactoryContract(provider)
      const details = await factoryContract.getAllFaucetDetails()

      // Transform the result to a more usable format
      return details.map((detail: any) => ({
        faucetAddress: detail.faucetAddress,
        tokenAddress: detail.token,
        owner: detail.owner,
        claimAmount: detail.claimAmount,
        startTime: Number(detail.startTime),
        endTime: Number(detail.endTime),
        isActive: detail.isClaimActive,
        balance: detail.balance,
      }))
    } catch (error) {
      console.error("Error getting all faucet details:", error)
      return []
    }
  }, [provider, isNetworkSupported])

  // Transfer factory ownership
  const transferOwnership = useCallback(
    async (newOwner: string): Promise<void> => {
      if (!signer || !isOwner || !isNetworkSupported) {
        const networkOk = await ensureSupportedNetwork()
        if (!networkOk) {
          throw new Error("Please switch to a supported network")
        }
        throw new Error("Not authorized or wallet not connected")
      }

      try {
        const factoryContract = getFactoryContract(signer)

        // Show toast for pending transaction
        toast({
          title: "Transferring Ownership",
          description: "Please confirm the transaction in your wallet...",
        })

        const tx = await factoryContract.transferOwnership(newOwner)

        // Show toast for transaction submitted
        toast({
          title: "Transaction Submitted",
          description: "Ownership transfer is being processed...",
        })

        // Wait for transaction confirmation
        await tx.wait()

        // Show success toast
        toast({
          title: "Ownership Transferred",
          description: `Factory ownership has been transferred to ${newOwner}`,
        })

        // Update local state
        setIsOwner(false)
      } catch (error: any) {
        console.error("Error transferring ownership:", error)

        // Show error toast
        toast({
          title: "Error Transferring Ownership",
          description: error.message || "An error occurred while transferring ownership",
          variant: "destructive",
        })

        throw error
      }
    },
    [signer, isOwner, isNetworkSupported, ensureSupportedNetwork, toast],
  )

  return {
    isOwner,
    isLoading,
    factoryAddress,
    createFaucet,
    getAllFaucets,
    getUserFaucets,
    getAllFaucetDetails,
    transferOwnership,
  }
}
