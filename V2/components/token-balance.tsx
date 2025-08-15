"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { Card, CardContent } from "@/components/ui/card"
import { formatUnits, Contract, ZeroAddress, JsonRpcProvider } from "ethers"
import { ERC20_ABI } from "@/lib/abis"
import { Skeleton } from "@/components/ui/skeleton"
import { useNetwork } from "@/hooks/use-network"

interface TokenBalanceProps {
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  isNativeToken?: boolean
  networkChainId?: number
}

export function TokenBalance({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  isNativeToken = false,
  networkChainId,
}: TokenBalanceProps) {
  const { address, chainId } = useWallet()
  const { networks } = useNetwork()
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if we're on the correct network
  const isCorrectNetwork = !networkChainId || chainId === networkChainId

  useEffect(() => {
    if (address) {
      fetchBalance()
    } else {
      setLoading(false)
      setError("Connect wallet")
    }
  }, [address, tokenAddress, isNativeToken, networkChainId])

  const fetchBalance = async () => {
    if (!address) return

    try {
      setLoading(true)
      setError(null)

      // Find the network configuration for this chain ID
      const network = networks.find((n) => n.chainId === networkChainId)

      if (!network) {
        setError("Network not configured")
        setLoading(false)
        return
      }

      // Create a dedicated provider for this network
      const provider = new JsonRpcProvider(network.rpcUrl)

      let balanceValue

      if (isNativeToken || tokenAddress === ZeroAddress) {
        // Fetch native token balance
        balanceValue = await provider.getBalance(address)
      } else {
        // Fetch ERC20 token balance
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider)
        balanceValue = await tokenContract.balanceOf(address)
      }

      setBalance(formatUnits(balanceValue, tokenDecimals))
    } catch (error) {
      console.error("Error fetching token balance:", error)
      setBalance("Error")
      setError("Failed to fetch")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Balance:</span>
          {loading ? (
            <Skeleton className="h-6 w-24" />
          ) : error ? (
            <span className="text-sm text-red-500">{error}</span>
          ) : (
            <span className="font-bold">
              {balance || "0"} {tokenSymbol}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
