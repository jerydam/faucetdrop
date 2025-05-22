"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getAllNetworksFaucets } from "@/lib/faucet-factory"
import { formatUnits } from "ethers"
import { ArrowRight, Clock, Coins, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

// Sample TokenBalance component (replace with actual implementation if available)
function TokenBalance({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  isNativeToken,
  networkChainId,
}: {
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  isNativeToken: boolean
  networkChainId: number
}) {
  const { provider, address } = useWallet()
  const [balance, setBalance] = useState<string>("0")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBalance = async () => {
      if (!provider || !address || !networkChainId) {
        setBalance("0")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        let balance: bigint
        if (isNativeToken) {
          balance = await provider.getBalance(address)
        } else {
          const { Contract, ZeroAddress } = await import("ethers")
          const { ERC20_ABI } = await import("@/lib/abis")
          if (tokenAddress === ZeroAddress) {
            balance = 0n
          } else {
            const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider)
            balance = await tokenContract.balanceOf(address)
          }
        }
        // Format balance to max 4 decimal places for responsiveness
        const formattedBalance = Number(formatUnits(balance, tokenDecimals)).toFixed(4)
        setBalance(formattedBalance)
      } catch (error) {
        console.error("Error fetching balance:", error)
        setBalance("0")
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
  }, [provider, address, tokenAddress, tokenDecimals, isNativeToken, networkChainId])

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-center">
          <span className="text-xs sm:text-sm font-medium">Your Balance:</span>
          <span className="text-xs sm:text-sm font-semibold truncate max-w-[150px] sm:max-w-[200px]">
            {loading ? "Loading..." : `${balance} ${tokenSymbol}`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

interface FaucetCardProps {
  faucet: any
  onNetworkSwitch: () => Promise<void>
}

function FaucetCard({ faucet, onNetworkSwitch }: FaucetCardProps) {
  const { chainId } = useWallet()
  const isOnCorrectNetwork = chainId === faucet.network?.chainId
  const [startCountdown, setStartCountdown] = useState<string>("")
  const [endCountdown, setEndCountdown] = useState<string>("")

  // Countdown logic
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const start = Number(faucet.startTime) * 1000
      const end = Number(faucet.endTime) * 1000

      // Start time countdown
      if (start === 0) {
        setStartCountdown("Inactive")
      } else if (start > now) {
        const diff = start - now
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setStartCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s until active`)
      } else {
        setStartCountdown("Already Active")
      }

      // End time countdown
      if (end > now && faucet.isClaimActive) {
        const diff = end - now
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setEndCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s until inactive`)
      } else if (end > 0 && end <= now) {
        setEndCountdown("Ended")
      } else {
        setEndCountdown("N/A")
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [faucet.startTime, faucet.endTime, faucet.isClaimActive])

  return (
    <Card className="relative w-full sm:max-w-md mx-auto">
      {/* Network Badge */}
      {faucet.network && (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
          <Badge style={{ backgroundColor: faucet.network.color }} className="text-white text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1">
            {faucet.network.name}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
        <CardTitle className="text-base sm:text-lg flex items-center justify-between pr-16 sm:pr-20">
          <span className="truncate">{faucet.name || faucet.tokenSymbol || "Token"} Faucet</span>
          {faucet.isClaimActive ? (
            <span className="text-[10px] sm:text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
              Active
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 sm:px-2 py-0.5 rounded-full">
              Inactive
            </span>
          )}
        </CardTitle>
        <CardDescription className="truncate text-[10px] sm:text-xs">{faucet.faucetAddress}</CardDescription>
      </CardHeader>

      {/* Token Balance - Only show if on the correct network */}
      <div className="px-3 sm:px-4 pb-1 sm:pb-2">
        {isOnCorrectNetwork ? (
          <TokenBalance
            tokenAddress={faucet.token}
            tokenSymbol={faucet.tokenSymbol || "tokens"}
            tokenDecimals={faucet.tokenDecimals || 18}
            isNativeToken={faucet.isEther}
            networkChainId={faucet.network?.chainId}
          />
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium">Balance:</span>
                <Button variant="outline" size="sm" onClick={onNetworkSwitch} className="text-xs sm:text-sm">
                  Switch Network
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CardContent className="pb-1 sm:pb-2 px-3 sm:px-4">
        <div className="space-y-1 sm:space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Balance:</span>
            <span className="text-xs sm:text-sm font-medium truncate">
              {faucet.balance ? Number(faucet.balance).toFixed(4) : "0"} {faucet.tokenSymbol || "tokens"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Claim Amount:</span>
            <span className="text-xs sm:text-sm font-medium truncate">
              {faucet.claimAmount ? formatUnits(faucet.claimAmount, faucet.tokenDecimals || 18) : "0"} {faucet.tokenSymbol || "tokens"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Type:</span>
            <span className="text-xs sm:text-sm font-medium">{faucet.isEther ? "Native Token" : "ERC20 Token"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm">{startCountdown}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm">{endCountdown}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-3 sm:px-4">
        <Link href={`/faucet/${faucet.faucetAddress}?networkId=${faucet.network?.chainId}`} className="w-full">
          <Button variant="outline" className="w-full h-8 sm:h-9 text-xs sm:text-sm">
            <Coins className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            View Details
            <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export function FaucetList() {
  const { provider, chainId, ensureCorrectNetwork } = useWallet()
  const { networks, setNetwork } = useNetwork()
  const { toast } = useToast()
  const [faucets, setFaucets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<Record<string, { loading: boolean; error: string | null }>>({})

  useEffect(() => {
    loadAllFaucets()
  }, [])

  const loadAllFaucets = async () => {
    setLoading(true)

    // Initialize network status
    const initialStatus: Record<string, { loading: boolean; error: string | null }> = {}
    networks.forEach((network) => {
      initialStatus[network.name] = { loading: true, error: null }
    })
    setNetworkStatus(initialStatus)

    try {
      console.log("Starting to load faucets from all networks...")

      // Don't pass the user provider to avoid network switching issues
      const allFaucets = await getAllNetworksFaucets(networks)

      console.log(`Loaded ${allFaucets.length} faucets from all networks`)
      setFaucets(allFaucets)

      // Update network status after loading
      const updatedStatus: Record<string, { loading: boolean; error: string | null }> = {}
      networks.forEach((network) => {
        const networkFaucets = allFaucets.filter((f) => f.network?.chainId === network.chainId)
        updatedStatus[network.name] = {
          loading: false,
          error: null, // Don't show error even if no faucets found
        }
        console.log(`Network ${network.name}: ${networkFaucets.length} faucets loaded`)
      })
      setNetworkStatus(updatedStatus)
    } catch (error) {
      console.error("Error loading faucets from all networks:", error)
      toast({
        title: "Failed to load some faucets",
        description: "Some networks may be unavailable. Check network status for details.",
        variant: "destructive",
      })

      // Update all networks as not loading with error
      const errorStatus: Record<string, { loading: boolean; error: string | null }> = {}
      networks.forEach((network) => {
        errorStatus[network.name] = {
          loading: false,
          error: "Failed to load faucets from this network",
        }
      })
      setNetworkStatus(errorStatus)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadAllFaucets()
    setIsRefreshing(false)
  }

  const handleNetworkSwitch = async (targetChainId: number) => {
    try {
      const network = networks.find((n) => n.chainId === targetChainId)
      if (network) {
        setNetwork(network)
        await ensureCorrectNetwork(targetChainId)
      }
    } catch (error) {
      console.error("Error switching network:", error)
      toast({
        title: "Network switch failed",
        description: "Failed to switch network. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center py-10 sm:py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base">Loading faucets from available networks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg sm:text-xl font-semibold">Available Faucets</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="text-xs sm:text-sm"
        >
          <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Network Status Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {networks.map((network) => (
          <Card key={network.chainId} className="overflow-hidden w-full sm:max-w-md mx-auto">
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base flex items-center gap-1 sm:gap-2">
                  <span className="h-2 w-2 sm:h-3 sm:w-3 rounded-full" style={{ backgroundColor: network.color }}></span>
                  {network.name}
                </CardTitle>
                {networkStatus[network.name]?.loading ? (
                  <span className="text-[10px] sm:text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                    Loading...
                  </span>
                ) : networkStatus[network.name]?.error ? (
                  <span className="text-[10px] sm:text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                    Issue
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                    Online
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-xs sm:text-sm px-3 sm:px-4">
              {networkStatus[network.name]?.loading ? (
                <p>Loading faucets...</p>
              ) : networkStatus[network.name]?.error ? (
                <p className="text-amber-600 dark:text-amber-400">{networkStatus[network.name]?.error}</p>
              ) : (
                <p>
                  {faucets.filter((f) => f.network?.chainId === network.chainId).length} faucets available
                  {chainId === network.chainId && (
                    <span className="ml-2 text-[10px] sm:text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {faucets.length === 0 ? (
        <Card className="w-full sm:max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
            <Coins className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-medium mb-2">No Faucets Found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              There are no faucets available on any network yet. Create your first faucet to get started.
            </p>
            <Link href="/create">
              <Button className="text-xs sm:text-sm">Create Faucet</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {faucets.map((faucet) => (
            <FaucetCard
              key={`${faucet.faucetAddress}-${faucet.network?.chainId}`}
              faucet={faucet}
              onNetworkSwitch={() => handleNetworkSwitch(faucet.network?.chainId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
