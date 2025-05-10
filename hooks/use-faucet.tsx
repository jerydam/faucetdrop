"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/lib/web3-provider"
import {
  getFaucetContract,
  getTokenContract,
  formatTokenAmount,
  parseTokenAmount,
  getTokenDetails,
  checkTokenAllowance,
  approveToken,
} from "@/lib/contract-utils"
import { useWallet } from "@/hooks/use-wallet"
import { useToast } from "@/hooks/use-toast"

export function useFaucet(faucetAddress: string) {
  const { provider, signer, address } = useWeb3()
  const { isNetworkSupported, ensureSupportedNetwork } = useWallet()
  const { toast } = useToast()

  const [faucet, setFaucet] = useState<any>(null)
  const [tokenDetails, setTokenDetails] = useState<{ name: string; symbol: string; decimals: number }>({
    name: "Unknown Token",
    symbol: "???",
    decimals: 18,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [hasClaimed, setHasClaimed] = useState<boolean>(false)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

  // Trigger a refresh of the faucet data
  const refreshFaucet = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // Load faucet data
  useEffect(() => {
    const loadFaucetData = async () => {
      if (!provider || !faucetAddress || !isNetworkSupported) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const faucetContract = getFaucetContract(faucetAddress, provider)

        // Get basic faucet info
        const [tokenAddress, ownerAddress, claimAmountBN, startTimeBN, endTimeBN, isClaimActive, balanceBN] =
          await Promise.all([
            faucetContract.token(),
            faucetContract.owner(),
            faucetContract.claimAmount(),
            faucetContract.startTime(),
            faucetContract.endTime(),
            faucetContract.isClaimActive(),
            faucetContract.getFaucetBalance(),
          ])

        // Get token details
        const details = await getTokenDetails(tokenAddress, provider)
        setTokenDetails(details)

        // Format token amounts
        const claimAmount = await formatTokenAmount(claimAmountBN, tokenAddress, provider)
        const balance = await formatTokenAmount(balanceBN, tokenAddress, provider)

        // Check if current user has claimed
        let userHasClaimed = false
        if (address) {
          userHasClaimed = await faucetContract.hasClaimed(address)
        }
        setHasClaimed(userHasClaimed)

        // Set faucet data
        setFaucet({
          address: faucetAddress,
          tokenAddress,
          tokenName: details.name,
          tokenSymbol: details.symbol,
          owner: ownerAddress,
          claimAmount,
          claimAmountRaw: claimAmountBN,
          startTime: Number(startTimeBN),
          endTime: Number(endTimeBN),
          isActive: isClaimActive,
          balance,
          balanceRaw: balanceBN,
        })
      } catch (error) {
        console.error("Error loading faucet data:", error)
        setFaucet(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadFaucetData()
  }, [provider, faucetAddress, address, isNetworkSupported, refreshTrigger])

  // Claim tokens from the faucet
  const claim = useCallback(async () => {
    if (!signer || !faucetAddress || !isNetworkSupported) {
      const networkOk = await ensureSupportedNetwork()
      if (!networkOk) {
        throw new Error("Please switch to a supported network")
      }
      throw new Error("Wallet not connected")
    }

    try {
      const faucetContract = getFaucetContract(faucetAddress, signer)

      // Check if claim is active
      const isActive = await faucetContract.isClaimActive()
      if (!isActive) {
        throw new Error("Claiming is not active for this faucet")
      }

      // Check if user has already claimed
      const userAddress = await signer.getAddress()
      const userHasClaimed = await faucetContract.hasClaimed(userAddress)
      if (userHasClaimed) {
        throw new Error("You have already claimed tokens from this faucet")
      }

      // Get faucet balance and claim amount to check if there are enough tokens
      const balance = await faucetContract.getFaucetBalance()
      const claimAmount = await faucetContract.claimAmount()

      if (balance < claimAmount) {
        throw new Error("Faucet doesn't have enough tokens to fulfill your claim")
      }

      // Show toast for pending transaction
      toast({
        title: "Claiming Tokens",
        description: "Please confirm the transaction in your wallet...",
      })

      // Execute claim with explicit gas limit to avoid estimation issues
      const gasEstimate = await faucetContract.claim.estimateGas()
      const gasLimit = Math.floor(gasEstimate.toString() * 1.2) // Add 20% buffer

      const tx = await faucetContract.claim({
        gasLimit: gasLimit,
      })

      // Show toast for transaction submitted
      toast({
        title: "Transaction Submitted",
        description: "Your claim is being processed...",
      })

      // Wait for transaction confirmation
      await tx.wait()

      // Show success toast
      toast({
        title: "Tokens Claimed",
        description: `You have successfully claimed ${faucet?.claimAmount} ${tokenDetails.symbol}`,
      })

      // Update local state
      setHasClaimed(true)
      refreshFaucet()
    } catch (error) {
      console.error("Error claiming tokens:", error)

      // Extract the revert reason if available
      let errorMessage = "An error occurred while claiming tokens"

      if (error.reason) {
        errorMessage = error.reason
      } else if (error.message) {
        // Clean up common error messages
        if (error.message.includes("user rejected transaction")) {
          errorMessage = "Transaction was rejected in your wallet"
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas"
        } else if (error.message.includes("execution reverted")) {
          // Try to extract the revert reason
          const revertMatch = error.message.match(/execution reverted: (.*?)(?:,|$)/)
          if (revertMatch && revertMatch[1]) {
            errorMessage = revertMatch[1]
          } else {
            errorMessage = "Transaction reverted by the contract"
          }
        } else {
          errorMessage = error.message
        }
      }

      // Show error toast
      toast({
        title: "Error Claiming Tokens",
        description: errorMessage,
        variant: "destructive",
      })

      throw error
    }
  }, [signer, faucetAddress, isNetworkSupported, ensureSupportedNetwork, faucet, tokenDetails, toast, refreshFaucet])

  // Fund the faucet with tokens
  const fund = useCallback(
    async (amount: number) => {
      if (!signer || !faucetAddress || !faucet?.tokenAddress || !isNetworkSupported) {
        const networkOk = await ensureSupportedNetwork()
        if (!networkOk) {
          throw new Error("Please switch to a supported network")
        }
        throw new Error("Wallet not connected or faucet not loaded")
      }

      try {
        const userAddress = await signer.getAddress()
        const tokenAddress = faucet.tokenAddress
        const faucetContract = getFaucetContract(faucetAddress, signer)
        const tokenContract = getTokenContract(tokenAddress, signer)

        // Parse amount to token units
        const amountBN = await parseTokenAmount(amount.toString(), tokenAddress, provider!)

        // Check token balance
        const balance = await tokenContract.balanceOf(userAddress)
        if (balance < amountBN) {
          throw new Error(
            `Insufficient token balance. You have ${await formatTokenAmount(balance, tokenAddress, provider!)} ${tokenDetails.symbol}`,
          )
        }

        // Check and handle token approval if needed
        const hasAllowance = await checkTokenAllowance(tokenAddress, userAddress, faucetAddress, amountBN, provider!)
        if (!hasAllowance) {
          // Show toast for approval
          toast({
            title: "Token Approval Required",
            description: "Please approve the token transfer in your wallet...",
          })

          // Request approval
          const approveTx = await approveToken(tokenAddress, faucetAddress, amountBN, signer)

          // Show toast for approval submitted
          toast({
            title: "Approval Submitted",
            description: "Waiting for approval confirmation...",
          })

          // Wait for approval confirmation
          await approveTx.wait()

          // Show success toast for approval
          toast({
            title: "Approval Confirmed",
            description: "Now proceeding with funding...",
          })
        }

        // Show toast for pending transaction
        toast({
          title: "Funding Faucet",
          description: "Please confirm the transaction in your wallet...",
        })

        // Execute funding
        const tx = await faucetContract.fund(amountBN)

        // Show toast for transaction submitted
        toast({
          title: "Transaction Submitted",
          description: "Your funding is being processed...",
        })

        // Wait for transaction confirmation
        await tx.wait()

        // Show success toast
        toast({
          title: "Faucet Funded",
          description: `You have successfully funded the faucet with ${amount} ${tokenDetails.symbol}`,
        })

        // Update local state
        refreshFaucet()
      } catch (error: any) {
        console.error("Error funding faucet:", error)

        // Show error toast
        toast({
          title: "Error Funding Faucet",
          description: error.message || "An error occurred while funding the faucet",
          variant: "destructive",
        })

        throw error
      }
    },
    [
      signer,
      faucetAddress,
      faucet,
      provider,
      isNetworkSupported,
      ensureSupportedNetwork,
      tokenDetails,
      toast,
      refreshFaucet,
    ],
  )

  // Withdraw tokens from the faucet (owner only)
  const withdraw = useCallback(
    async (amount: number) => {
      if (!signer || !faucetAddress || !faucet || !isNetworkSupported) {
        const networkOk = await ensureSupportedNetwork()
        if (!networkOk) {
          throw new Error("Please switch to a supported network")
        }
        throw new Error("Wallet not connected or faucet not loaded")
      }

      try {
        const userAddress = await signer.getAddress()

        // Check if user is the owner
        if (faucet.owner.toLowerCase() !== userAddress.toLowerCase()) {
          throw new Error("Only the faucet owner can withdraw tokens")
        }

        // Parse amount to token units
        const amountBN = await parseTokenAmount(amount.toString(), faucet.tokenAddress, provider!)

        // Check if amount is valid
        if (amountBN > faucet.balanceRaw) {
          throw new Error(`Insufficient faucet balance. The faucet has ${faucet.balance} ${tokenDetails.symbol}`)
        }

        const faucetContract = getFaucetContract(faucetAddress, signer)

        // Show toast for pending transaction
        toast({
          title: "Withdrawing Tokens",
          description: "Please confirm the transaction in your wallet...",
        })

        // Execute withdrawal
        const tx = await faucetContract.withdraw(amountBN)

        // Show toast for transaction submitted
        toast({
          title: "Transaction Submitted",
          description: "Your withdrawal is being processed...",
        })

        // Wait for transaction confirmation
        await tx.wait()

        // Show success toast
        toast({
          title: "Tokens Withdrawn",
          description: `You have successfully withdrawn ${amount} ${tokenDetails.symbol}`,
        })

        // Update local state
        refreshFaucet()
      } catch (error: any) {
        console.error("Error withdrawing tokens:", error)

        // Show error toast
        toast({
          title: "Error Withdrawing Tokens",
          description: error.message || "An error occurred while withdrawing tokens",
          variant: "destructive",
        })

        throw error
      }
    },
    [
      signer,
      faucetAddress,
      faucet,
      provider,
      isNetworkSupported,
      ensureSupportedNetwork,
      tokenDetails,
      toast,
      refreshFaucet,
    ],
  )

  // Update claim parameters (owner only)
  const setClaimParameters = useCallback(
    async (claimAmount: number, startTime: number, endTime: number) => {
      if (!signer || !faucetAddress || !faucet || !isNetworkSupported) {
        const networkOk = await ensureSupportedNetwork()
        if (!networkOk) {
          throw new Error("Please switch to a supported network")
        }
        throw new Error("Wallet not connected or faucet not loaded")
      }

      try {
        const userAddress = await signer.getAddress()

        // Check if user is the owner
        if (faucet.owner.toLowerCase() !== userAddress.toLowerCase()) {
          throw new Error("Only the faucet owner can update claim parameters")
        }

        // Validate parameters
        if (startTime >= endTime) {
          throw new Error("End time must be after start time")
        }

        if (claimAmount <= 0) {
          throw new Error("Claim amount must be greater than zero")
        }

        // Parse claim amount to token units
        const claimAmountBN = await parseTokenAmount(claimAmount.toString(), faucet.tokenAddress, provider!)

        const faucetContract = getFaucetContract(faucetAddress, signer)

        // Show toast for pending transaction
        toast({
          title: "Updating Claim Parameters",
          description: "Please confirm the transaction in your wallet...",
        })

        // Execute update
        const tx = await faucetContract.setClaimParameters(claimAmountBN, startTime, endTime)

        // Show toast for transaction submitted
        toast({
          title: "Transaction Submitted",
          description: "Your update is being processed...",
        })

        // Wait for transaction confirmation
        await tx.wait()

        // Show success toast
        toast({
          title: "Parameters Updated",
          description: "Claim parameters have been successfully updated",
        })

        // Update local state
        refreshFaucet()
      } catch (error: any) {
        console.error("Error updating claim parameters:", error)

        // Show error toast
        toast({
          title: "Error Updating Parameters",
          description: error.message || "An error occurred while updating claim parameters",
          variant: "destructive",
        })

        throw error
      }
    },
    [signer, faucetAddress, faucet, provider, isNetworkSupported, ensureSupportedNetwork, toast, refreshFaucet],
  )

  return {
    faucet,
    tokenDetails,
    isLoading,
    hasClaimed,
    claim,
    fund,
    withdraw,
    setClaimParameters,
    refreshFaucet,
  }
}
