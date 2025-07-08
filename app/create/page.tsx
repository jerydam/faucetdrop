"use client"

import { Alert } from "@/components/ui/alert"
import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network"
import { useToast } from "@/hooks/use-toast"
import { createFaucet } from "@/lib/faucet"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2, Info } from "lucide-react"
import { Header } from "@/components/header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Token {
  address: string
  name: string
  symbol: string
  decimals: number
  isNative?: boolean
}

interface ChainConfig {
  chainId: number
  name: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  nativeTokenAddress: string
  factoryAddresses: string[] // Changed to array
  defaultTokens: Token[]
}

// Chain configurations
const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  42220: {
    chainId: 42220,
    name: "Celo",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    nativeTokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    factoryAddresses: [
      "0xE2d0E09D4201509d2BFeAc0EF9a166f1C308a28d",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de" // Example: Add new factory address
    ],
    defaultTokens: [
      {
        address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
        name: "Celo Dollar",
        symbol: "cUSD",
        decimals: 18,
      },
      {
        address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
        name: "Celo Euro",
        symbol: "cEUR",
        decimals: 18,
      },
       {
        address: "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3",
        name: "Glo Dollar",
        symbol: "USDGLO",
        decimals: 18,
      },
      {
        address: "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a",
        name: "Good dollar",
        symbol: "G$",
        decimals: 18,
      },
    ],
  },
   // Celo Alfajores Testnet
  44787: {
    chainId: 44787,
    name: "Celo Alfajores",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    nativeTokenAddress: "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9", // CELO token address on testnet
     factoryAddresses: [
      "0xE2d0E09D4201509d2BFeAc0EF9a166f1C308a28d",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de" // Example: Add new factory address
    ],
    defaultTokens: [
      {
        address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
        name: "Celo Dollar",
        symbol: "cUSD",
        decimals: 18,
      },
    ],
  },
  // Polygon
  137: {
    chainId: 8,
    name: "Base Mainnet",
    nativeCurrency: { name: "Base", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: "0x0000000000000000000000000000000000001010", // Polygon native token address
     factoryAddresses: [
      "0xE2d0E09D4201509d2BFeAc0EF9a166f1C308a28d",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de" // Example: Add new factory address
    ],
    defaultTokens: [
      {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
}

export default function CreateFaucet() {
  const { provider, address, isConnected, connect, chainId } = useWallet()
  const { network, getLatestFactoryAddress } = useNetwork()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [useBackend, setUseBackend] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [availableTokens, setAvailableTokens] = useState<Token[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)

  const getCurrentChainConfig = (): ChainConfig | null => {
    if (!network?.chainId) return null
    return CHAIN_CONFIGS[Number(network.chainId)] || null
  }

  const fetchAvailableTokens = async (): Promise<Token[]> => {
    const chainConfig = getCurrentChainConfig()
    if (!chainConfig) return []

    const tokens: Token[] = []
    tokens.push({
      address: chainConfig.nativeTokenAddress,
      name: chainConfig.nativeCurrency.name,
      symbol: chainConfig.nativeCurrency.symbol,
      decimals: chainConfig.nativeCurrency.decimals,
      isNative: true,
    })
    tokens.push(...chainConfig.defaultTokens)
    return tokens
  }

  useEffect(() => {
    const chainConfig = getCurrentChainConfig()
    if (network && chainId !== null && BigInt(chainId) !== BigInt(network.chainId)) {
      setError(`Please switch to the ${network.name} network to create a faucet`)
    } else if (network && !chainConfig) {
      setError(`Chain ${network.name} (ID: ${network.chainId}) is not supported yet`)
    } else {
      setError(null)
    }
  }, [network, chainId])

  useEffect(() => {
    const loadTokens = async () => {
      if (!network) return
      const chainConfig = getCurrentChainConfig()
      if (!chainConfig) {
        setError(`Chain ${network.name} (ID: ${network.chainId}) is not supported yet`)
        return
      }
      setIsLoadingTokens(true)
      try {
        const tokens = await fetchAvailableTokens()
        setAvailableTokens(tokens)
        if (tokens.length > 0 && !selectedToken) {
          setSelectedToken(tokens[0].address)
        }
      } catch (error) {
        console.error("Failed to load tokens:", error)
        setError("Failed to load available tokens")
      } finally {
        setIsLoadingTokens(false)
      }
    }
    loadTokens()
  }, [network, selectedToken])

  const getSelectedTokenInfo = (): Token | null => {
    return availableTokens.find(token => token.address === selectedToken) || null
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter a faucet name")
      return
    }
    if (!selectedToken) {
      setError("Please select a token")
      return
    }
    if (chainId === null) {
      setError("Wallet chain ID is not available. Please ensure your wallet is connected.")
      return
    }

    setError(null)

    if (!isConnected) {
      try {
        await connect()
      } catch (error) {
        console.error("Failed to connect wallet:", error)
        setError("Failed to connect wallet. Please try again.")
        return
      }
    }

    if (!provider || !network || chainId === null) {
      setError("Wallet not connected or network not selected")
      return
    }

    setIsCreating(true)

    try {
      const chainConfig = getCurrentChainConfig()
      if (!chainConfig) {
        throw new Error(`Chain ${network?.name} is not supported`)
      }

      const factoryAddress = getLatestFactoryAddress()
      if (!factoryAddress) {
        throw new Error("No factory address available for this network")
      }

      const tokenAddress = selectedToken

      console.log("Creating faucet with params:", {
        factoryAddress,
        name,
        tokenAddress,
        chainId: chainId.toString(),
        networkId: network.chainId.toString(),
        useBackend,
        chainConfig: chainConfig.name,
      })

      const faucetAddress = await createFaucet(
        provider,
        factoryAddress,
        name,
        tokenAddress,
        BigInt(chainId),
        BigInt(network.chainId),
        useBackend
      )

      if (!faucetAddress) {
        throw new Error("Failed to get created faucet address")
      }

      const selectedTokenInfo = getSelectedTokenInfo()
      toast({
        title: "Faucet Created",
        description: `Your ${selectedTokenInfo?.symbol || "token"} faucet has been created at ${faucetAddress}`,
      })

      window.location.href = `/faucet/${faucetAddress}?networkId=${network.chainId}`
    } catch (error: any) {
      console.error("Error creating faucet:", error)
      let errorMessage = error.message || "Failed to create faucet"

      if (errorMessage.includes("Switch to the network")) {
        toast({
          title: "Network Mismatch",
          description: `Please switch to the ${network?.name} network to create a faucet`,
          variant: "destructive",
          action: (
            <Button
              onClick={() =>
                network &&
                window.ethereum.request({
                  method: "wallet_switchEthereumChain",
                  params: [{ chainId: `0x${network.chainId.toString(16)}` }],
                })
              }
            >
              Switch to {network?.name}
            </Button>
          ),
        })
      } else {
        toast({
          title: "Failed to create faucet",
          description: errorMessage,
          variant: "destructive",
        })
      }
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const isDisabled = isCreating || !network || (chainId !== null && network && BigInt(chainId) !== BigInt(network.chainId)) || !selectedToken || !getCurrentChainConfig()

  const selectedTokenInfo = getSelectedTokenInfo()
  const chainConfig = getCurrentChainConfig()

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Header pageTitle="Create Faucet" />
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create New Faucet</CardTitle>
              <CardDescription>
                Create a new token faucet on {chainConfig?.name || network?.name || "the current network"}
                {chainConfig && ` (Chain ID: ${chainConfig.chainId})`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Faucet Name</Label>
                <Input
                  id="name"
                  placeholder="Enter a name for your faucet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-select">Select Token</Label>
                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger id="token-select">
                    <SelectValue placeholder={isLoadingTokens ? "Loading tokens..." : "Select a token"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{token.symbol}</span>
                          <span className="text-gray-500">({token.name})</span>
                          {token.isNative && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Native</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTokenInfo && (
                  <p className="text-sm text-gray-500">
                    Selected: {selectedTokenInfo.name} ({selectedTokenInfo.symbol})
                    {selectedTokenInfo.isNative ? " - Native Token" : ""}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-backend">Use Backend Management</Label>
                  <Switch
                    id="use-backend"
                    checked={useBackend}
                    onCheckedChange={setUseBackend}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  {useBackend
                    ? "Backend management enabled for automatic claim processing, user whitelist validation, and secret codes."
                    : "Manual management enabled. Admins will control claims directly."}
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Faucet Configuration</AlertTitle>
                <AlertDescription>
                  <p>The faucet will be configured with:</p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>{useBackend ? "Backend-managed" : "Manual"} claim processing</li>
                    <li>Admin-controlled operations</li>
                    <li>Token distribution based on set parameters</li>
                    <li>Using factory contract: {getLatestFactoryAddress()?.slice(0, 6)}...{getLatestFactoryAddress()?.slice(-4)}</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {selectedTokenInfo && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Token Configuration</AlertTitle>
                  <AlertDescription>
                    <p>The following token will be used:</p>
                    <ul className="list-disc pl-5 mt-2">
                      <li>
                        <strong>Token:</strong> {selectedTokenInfo.name} ({selectedTokenInfo.symbol})
                      </li>
                      <li>
                        <strong>Address:</strong> {selectedTokenInfo.isNative ?
                          `${selectedTokenInfo.address.slice(0, 6)}...${selectedTokenInfo.address.slice(-4)} (Native)` :
                          `${selectedTokenInfo.address.slice(0, 6)}...${selectedTokenInfo.address.slice(-4)}`
                        }
                      </li>
                      <li>
                        <strong>Decimals:</strong> {selectedTokenInfo.decimals}
                      </li>
                      <li>
                        <strong>Backend:</strong> {useBackend ? "Enabled" : "Disabled"}
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleCreate}
                disabled={isDisabled}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : !isConnected ? (
                  "Connect & Create Faucet"
                ) : (
                  "Create Faucet"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}