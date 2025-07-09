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
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"

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
  factoryAddresses: string[]
  defaultTokens: Token[]
}

interface FaucetConfig {
  faucetType: "open" | "droplist"
  requireDropCode: boolean
  startTime?: Date
  endTime?: Date
  maxClaims?: number
  adminWallets: string[]
  droplistWallets: string[]
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  42220: {
    chainId: 42220,
    name: "Celo",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    nativeTokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    factoryAddresses: [
      "0xE2d0E09D4201509d2BFeAc0EF9a166f1C308a28d",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
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
  44787: {
    chainId: 44787,
    name: "Celo Alfajores",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    nativeTokenAddress: "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9",
    factoryAddresses: [
      "0xE2d0E09D4201509d2BFeAc0EF9a166f1C308a28d",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
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
  137: {
    chainId: 137, // Corrected chainId for Polygon
    name: "Polygon",
    nativeCurrency: { name: "Matic", symbol: "MATIC", decimals: 18 },
    nativeTokenAddress: "0x0000000000000000000000000000000000001010",
    factoryAddresses: [
      "0xE2d0E09D4201509d2BFeAc0EF9a166f1C308a28d",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
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
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [useBackend, setUseBackend] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [availableTokens, setAvailableTokens] = useState<Token[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [faucetConfig, setFaucetConfig] = useState<FaucetConfig>({
    faucetType: "open",
    requireDropCode: true,
    startTime: undefined,
    endTime: undefined,
    maxClaims: undefined,
    adminWallets: [],
    droplistWallets: [],
  })
  const [csvFile, setCsvFile] = useState<File | null>(null)

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

  const validateWalletAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    try {
      const text = await file.text()
      const addresses = text.split("\n").map(line => line.trim()).filter(line => line)
      const validAddresses = addresses.filter(validateWalletAddress)
      const invalidAddresses = addresses.filter(addr => !validateWalletAddress(addr))

      if (invalidAddresses.length > 0) {
        setError(`Invalid wallet addresses found: ${invalidAddresses.join(", ")}`)
      } else {
        setFaucetConfig(prev => ({ ...prev, droplistWallets: validAddresses }))
        setError(null)
      }
    } catch (error) {
      setError("Failed to process CSV file")
    }
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
    if (faucetConfig.faucetType === "droplist" && faucetConfig.droplistWallets.length === 0) {
      setError("Please add at least one wallet address for the drop-list")
      return
    }
    if (faucetConfig.startTime && faucetConfig.endTime && faucetConfig.startTime >= faucetConfig.endTime) {
      setError("End time must be after start time")
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
        faucetConfig,
      })

      const faucetAddress = await createFaucet(
        provider,
        factoryAddress,
        name,
        tokenAddress,
        BigInt(chainId),
        BigInt(network.chainId),
        useBackend,
       
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

  const handleNext = () => {
    if (step === 1 && !faucetConfig.faucetType) {
      setError("Please select a faucet type")
      return
    }
    if (step === 3 && faucetConfig.startTime && faucetConfig.endTime && faucetConfig.startTime >= faucetConfig.endTime) {
      setError("End time must be after start time")
      return
    }
    if (step === 4 && faucetConfig.faucetType === "droplist" && faucetConfig.droplistWallets.length === 0) {
      setError("Please add at least one wallet address for the drop-list")
      return
    }
    setError(null)
    setStep(prev => Math.min(prev + 1, 6))
  }

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1))
  }

  const isDisabled = isCreating || !network || (chainId !== null && network && BigInt(chainId) !== BigInt(network.chainId)) || !selectedToken || !getCurrentChainConfig()

  const selectedTokenInfo = getSelectedTokenInfo()
  const chainConfig = getCurrentChainConfig()

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Faucet Name</Label>
              <Input
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
              <Label>Who Can Claim from this Faucet?</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="open"
                    name="faucetType"
                    value="open"
                    checked={faucetConfig.faucetType === "open"}
                    onChange={() => setFaucetConfig(prev => ({ ...prev, faucetType: "open" }))}
                  />
                  <Label htmlFor="open">Anyone with a Drop Code <span className="text-sm text-gray-500">(Suitable for open community drops, airdrops)</span></Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="droplist"
                    name="faucetType"
                    value="droplist"
                    checked={faucetConfig.faucetType === "droplist"}
                    onChange={() => setFaucetConfig(prev => ({ ...prev, faucetType: "droplist" }))}
                  />
                  <Label htmlFor="droplist">Only wallets I select (Drop-list) <span className="text-sm text-gray-500">(Suitable for private airdrops, contests)</span></Label>
                </div>
              </div>
            </div>
          </div>
        )
      case 2:
        if (faucetConfig.faucetType === "droplist") return null
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Require Drop Code?</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={faucetConfig.requireDropCode}
                  onCheckedChange={(checked) => setFaucetConfig(prev => ({ ...prev, requireDropCode: checked }))}
                />
                <span>{faucetConfig.requireDropCode ? "Yes (Recommended)" : "No (Not recommended - Open to all)"}</span>
              </div>
              {!faucetConfig.requireDropCode && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>Disabling Drop Code makes the faucet accessible to anyone, which may lead to abuse.</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Set Start & End Time for Claiming?</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={!!faucetConfig.startTime || !!faucetConfig.endTime}
                  onCheckedChange={(checked) => setFaucetConfig(prev => ({
                    ...prev,
                    startTime: checked ? new Date() : undefined,
                    endTime: checked ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
                  }))}
                />
                <span>{faucetConfig.startTime ? "Yes" : "No (Faucet stays live until paused/deleted)"}</span>
              </div>
              {(faucetConfig.startTime || faucetConfig.endTime) && (
                <div className="space-y-2">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="datetime-local"
                      value={faucetConfig.startTime ? format(faucetConfig.startTime, "yyyy-MM-dd'T'HH:mm") : ""}
                      onChange={(e) => setFaucetConfig(prev => ({ ...prev, startTime: new Date(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="datetime-local"
                      value={faucetConfig.endTime ? format(faucetConfig.endTime, "yyyy-MM-dd'T'HH:mm") : ""}
                      onChange={(e) => setFaucetConfig(prev => ({ ...prev, endTime: new Date(e.target.value) }))}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Set Max Number of Claims?</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={faucetConfig.maxClaims !== undefined}
                  onCheckedChange={(checked) => setFaucetConfig(prev => ({
                    ...prev,
                    maxClaims: checked ? 100 : undefined,
                  }))}
                />
                <span>{faucetConfig.maxClaims !== undefined ? "Yes" : "No (Unlimited claims)"}</span>
              </div>
              {faucetConfig.maxClaims !== undefined && (
                <Input
                  type="number"
                  min="1"
                  value={faucetConfig.maxClaims}
                  onChange={(e) => setFaucetConfig(prev => ({ ...prev, maxClaims: parseInt(e.target.value) }))}
                  placeholder="Enter max claims"
                />
              )}
              {faucetConfig.maxClaims === undefined && faucetConfig.faucetType === "open" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>Unlimited claims for an open faucet may lead to rapid fund depletion.</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )
      case 4:
        if (faucetConfig.faucetType !== "droplist") return null
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Add Wallets for Drop-list</Label>
              <Textarea
                placeholder="Enter wallet addresses (one per line)"
                value={faucetConfig.droplistWallets.join("\n")}
                onChange={(e) => {
                  const addresses = e.target.value.split("\n").map(addr => addr.trim()).filter(addr => addr)
                  setFaucetConfig(prev => ({ ...prev, droplistWallets: addresses }))
                }}
              />
              <div className="flex items-center space-x-2">
                <Label>Upload CSV</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                />
              </div>
              {faucetConfig.droplistWallets.length > 0 && (
                <p className="text-sm text-gray-500">{faucetConfig.droplistWallets.length} valid wallet(s) added</p>
              )}
            </div>
          </div>
        )
      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Add Admin Wallets (Optional)</Label>
              <Textarea
                placeholder="Enter admin wallet addresses (one per line)"
                value={faucetConfig.adminWallets.join("\n")}
                onChange={(e) => {
                  const addresses = e.target.value.split("\n").map(addr => addr.trim()).filter(addr => addr)
                  setFaucetConfig(prev => ({ ...prev, adminWallets: addresses }))
                }}
              />
              {faucetConfig.adminWallets.length > 0 && (
                <p className="text-sm text-gray-500">{faucetConfig.adminWallets.length} admin wallet(s) added</p>
              )}
            </div>
          </div>
        )
      case 6:
        return (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Faucet Configuration Summary</AlertTitle>
              <AlertDescription>
                <p>You are creating a {faucetConfig.faucetType === "open" ? "Open" : "Drop-list"} faucet with the following settings:</p>
                <ul className="list-disc pl-5 mt-2">
                  <li><strong>Name:</strong> {name}</li>
                  <li><strong>Token:</strong> {selectedTokenInfo?.name} ({selectedTokenInfo?.symbol})</li>
                  <li><strong>Network:</strong> {chainConfig?.name} (Chain ID: {chainConfig?.chainId})</li>
                  {faucetConfig.faucetType === "open" && (
                    <li><strong>Drop Code:</strong> {faucetConfig.requireDropCode ? "Required" : "Not required"}</li>
                  )}
                  {faucetConfig.faucetType === "droplist" && (
                    <li><strong>Drop-list Wallets:</strong> {faucetConfig.droplistWallets.length}</li>
                  )}
                  <li><strong>Start Time:</strong> {faucetConfig.startTime ? format(faucetConfig.startTime, "PPpp") : "Not set"}</li>
                  <li><strong>End Time:</strong> {faucetConfig.endTime ? format(faucetConfig.endTime, "PPpp") : "Not set"}</li>
                  <li><strong>Max Claims:</strong> {faucetConfig.maxClaims ?? "Unlimited"}</li>
                  <li><strong>Admin Wallets:</strong> {faucetConfig.adminWallets.length || "None"}</li>
                  <li><strong>Backend Management:</strong> {useBackend ? "Enabled" : "Disabled"}</li>
                  <li><strong>Factory Contract:</strong> {getLatestFactoryAddress()?.slice(0, 6)}...{getLatestFactoryAddress()?.slice(-4)}</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Header pageTitle="Create Faucet Wizard" />
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create New Faucet</CardTitle>
              <CardDescription>
                Step {step} of 6: Create a new token faucet on {chainConfig?.name || network?.name || "the current network"}
                {chainConfig && ` (Chain ID: ${chainConfig.chainId})`}
              </CardDescription>
              <Progress value={(step / 6) * 100} className="mt-4" />
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {renderStep()}
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
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>
              {step < 6 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={isDisabled}
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
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}