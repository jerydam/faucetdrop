"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Header } from "@/components/header"
import {
  getFaucetDetails,
  isWhitelisted,
  getAllAdmins,
  setWhitelistBatch,
  setCustomClaimAmountsBatch,
  resetAllClaims,
  fundFaucet,
  withdrawTokens,
  setClaimParameters,
  retrieveSecretCode,
  saveToStorage,
  getFromStorage,
  updateFaucetName,
  deleteFaucet,
  addAdmin,
  storeClaim,
} from "@/lib/faucet"
import { formatUnits, parseUnits, type BrowserProvider } from "ethers"
import { Clock, Coins, Download, Share2, Upload, Users, Key, RotateCcw, Edit, Trash2, FileUp, Menu } from "lucide-react"
import { claimViaBackend, claimNoCodeViaBackend } from "@/lib/backend-service"
import { useNetwork } from "@/hooks/use-network"
import { TokenBalance } from "@/components/token-balance"
import { Badge } from "@/components/ui/badge"
import { JsonRpcProvider } from "ethers"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function FaucetDetails() {
  const { address: faucetAddress } = useParams<{ address: string }>()
  const searchParams = useSearchParams()
  const networkId = searchParams.get("networkId")
  const { toast } = useToast()
  const router = useRouter()
  const { address, chainId, isConnected, provider } = useWallet()
  const { networks, setNetwork } = useNetwork()
  const [faucetDetails, setFaucetDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [fundAmount, setFundAmount] = useState("")
  const [adjustedFundAmount, setAdjustedFundAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [claimAmount, setClaimAmount] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [whitelistAddresses, setWhitelistAddresses] = useState("")
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState(false)
  const [tokenSymbol, setTokenSymbol] = useState("CELO")
  const [tokenDecimals, setTokenDecimals] = useState(18)
  const [hasClaimed, setHasClaimed] = useState(false)
  const [hasFollowed, setHasFollowed] = useState(false)
  const [showClaimPopup, setShowClaimPopup] = useState(false)
  const [showFundPopup, setShowFundPopup] = useState(false)
  const [showEditNameDialog, setShowEditNameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false)
  const [newFaucetName, setNewFaucetName] = useState("")
  const [newAdminAddress, setNewAdminAddress] = useState("")
  const [txHash, setTxHash] = useState<string | null>(null)
  const [startCountdown, setStartCountdown] = useState<string | null>(null)
  const [endCountdown, setEndCountdown] = useState<string>("")
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null)
  const [secretCode, setSecretCode] = useState("")
  const [generatedSecretCode, setGeneratedSecretCode] = useState("")
  const [showSecretCodeDialog, setShowSecretCodeDialog] = useState(false)
  const [currentSecretCode, setCurrentSecretCode] = useState("")
  const [showCurrentSecretDialog, setShowCurrentSecretDialog] = useState(false)
  const [userIsWhitelisted, setUserIsWhitelisted] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [backendMode, setBackendMode] = useState(true)
  const [customClaimFile, setCustomClaimFile] = useState<File | null>(null)
  const [adminList, setAdminList] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("fund") // Track active tab for dropdown

  const isOwner = address && faucetDetails?.owner && address.toLowerCase() === faucetDetails.owner.toLowerCase()
  const canAccessAdminControls = isOwner || userIsAdmin
  const isSecretCodeValid = secretCode.length === 6 && /^[A-Z0-9]{6}$/.test(secretCode)

  const canClaim = backendMode
    ? faucetDetails?.isClaimActive && !hasClaimed && isSecretCodeValid
    : faucetDetails?.isClaimActive && !hasClaimed && userIsWhitelisted

  const xProfileLink = "https://x.com/FaucetDrops"

  const popupContent = (amount: string, txHash: string | null) =>
    `I just received a drop of ${amount} ${tokenSymbol} from @FaucetDrops on ${selectedNetwork?.name || "the network"}. Verify Drop 💧: ${
      txHash
        ? `${selectedNetwork?.blockExplorer || "https://explorer.unknown"}/tx/0x${txHash.slice(2)}`
        : "Transaction not available"
    }`

  const calculateFee = (amount: string) => {
    try {
      const parsedAmount = parseUnits(amount, tokenDecimals)
      const fee = (parsedAmount * BigInt(5)) / BigInt(100)
      const netAmount = parsedAmount - fee
      const recommendedInput = (parsedAmount * BigInt(100)) / BigInt(95)
      const recommendedInputStr = Number(formatUnits(recommendedInput, tokenDecimals)).toFixed(3)
      return {
        fee: formatUnits(fee, tokenDecimals),
        netAmount: formatUnits(netAmount, tokenDecimals),
        recommendedInput: recommendedInputStr,
      }
    } catch {
      return { fee: "0", netAmount: "0", recommendedInput: "0" }
    }
  }

  const { fee, netAmount, recommendedInput } = calculateFee(fundAmount)

  const handleFollow = () => {
    window.open(xProfileLink, "_blank")
    setHasFollowed(true)
  }

  const handleShareOnX = () => {
    const claimedAmount = faucetDetails ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0"
    const shareText = encodeURIComponent(popupContent(claimedAmount, txHash))
    const shareUrl = `https://x.com/intent/tweet?text=${shareText}`
    window.open(shareUrl, "_blank")
    setShowClaimPopup(false)
  }

  const handleRetrieveSecretCode = async () => {
    if (!faucetAddress) {
      toast({
        title: "Error",
        description: "No faucet address available",
        variant: "destructive",
      })
      return
    }
    if (!isOwner) {
      toast({
        title: "Unauthorized",
        description: "Only the faucet owner can retrieve the Drop code",
        variant: "destructive",
      })
      return
    }
    try {
      const code = await retrieveSecretCode(faucetAddress)
      setCurrentSecretCode(code)
      setShowCurrentSecretDialog(true)
      const wasCached = getFromStorage(`secretCode_${faucetAddress}`) === code
      toast({
        title: "Drop code Retrieved",
        description: wasCached ? "Code retrieved successfully, don't forget it again" : "",
      })
    } catch (error: any) {
      toast({
        title: "Failed to retrieve Drop code",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleUpdateFaucetName = async () => {
    if (!isConnected || !provider || !newFaucetName.trim() || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid name",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      await updateFaucetName(
        provider as BrowserProvider,
        faucetAddress,
        newFaucetName,
        BigInt(chainId),
        BigInt(Number(networkId)),
      )
      toast({
        title: "Faucet name updated",
        description: `Faucet name has been updated to ${newFaucetName}`,
      })
      setNewFaucetName("")
      setShowEditNameDialog(false)
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error updating faucet name:", error)
      toast({
        title: "Failed to update faucet name",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleDeleteFaucet = async () => {
    if (!isConnected || !provider || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet and ensure a network is selected",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      await deleteFaucet(provider as BrowserProvider, faucetAddress, BigInt(chainId), BigInt(Number(networkId)))
      toast({
        title: "Faucet deleted",
        description: "Faucet has been successfully deleted",
      })
      setShowDeleteDialog(false)
      router.push("/")
    } catch (error: any) {
      console.error("Error deleting faucet:", error)
      toast({
        title: "Failed to delete faucet",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleAddAdmin = async () => {
    if (!isConnected || !provider || !newAdminAddress.trim() || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid address",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      await addAdmin(
        provider as BrowserProvider,
        faucetAddress,
        newAdminAddress,
        BigInt(chainId),
        BigInt(Number(networkId)),
      )
      toast({
        title: "Admin added",
        description: `Address ${newAdminAddress} has been added as an admin`,
      })
      setNewAdminAddress("")
      setShowAddAdminDialog(false)
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error adding admin:", error)
      toast({
        title: "Failed to add admin",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (!faucetDetails) return
    const updateCountdown = () => {
      const now = Date.now()
      const start = Number(faucetDetails.startTime) * 1000
      const end = Number(faucetDetails.endTime) * 1000
      if (start > now) {
        const diff = start - now
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setStartCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s until active`)
      } else {
        setStartCountdown("Already Active")
      }
      if (end > now && faucetDetails.isClaimActive) {
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
  }, [faucetDetails])

  useEffect(() => {
    if (provider && faucetAddress && networkId) {
      loadFaucetDetails()
    }
  }, [provider, faucetAddress, networkId, address])

  const loadFaucetDetails = async () => {
    if (!faucetAddress || !networkId) {
      toast({
        title: "Invalid Parameters",
        description: "Faucet address or network ID is missing",
        variant: "destructive",
      })
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const targetNetwork = networks.find((n) => n.chainId === Number(networkId))
      if (!targetNetwork) {
        toast({
          title: "Network Not Found",
          description: `Network ID ${networkId} is not supported`,
          variant: "destructive",
        })
        setLoading(false)
        router.push("/")
        return
      }
      setSelectedNetwork(targetNetwork)
      const detailsProvider = new JsonRpcProvider(targetNetwork.rpcUrl)
      const details = await getFaucetDetails(detailsProvider, faucetAddress)
      console.log("Faucet details:", details)
      setFaucetDetails(details)

      const admins = await getAllAdmins(detailsProvider, faucetAddress)
      setAdminList(admins)
      console.log("Admin list set to:", admins)

      if (address) {
        const isUserAdmin = admins.some((admin: string) => admin.toLowerCase() === address.toLowerCase())
        setUserIsAdmin(isUserAdmin)
        console.log("User admin status set to:", isUserAdmin, "based on admins:", admins)
      } else {
        setUserIsAdmin(false)
        console.log("No address connected, user admin status set to false")
      }

      if (details.claimAmount) {
        setClaimAmount(formatUnits(details.claimAmount, details.tokenDecimals))
      }
      if (details.startTime) {
        const date = new Date(Number(details.startTime) * 1000)
        setStartTime(date.toISOString().slice(0, 16))
      }
      if (details.endTime) {
        const date = new Date(Number(details.endTime) * 1000)
        setEndTime(date.toISOString().slice(0, 16))
      }
      setTokenSymbol(details.tokenSymbol || "CELO")
      setTokenDecimals(details.tokenDecimals || 18)
      setHasClaimed(details.hasClaimed || false)
      setBackendMode(details.backendMode)
      if (address && !details.backendMode) {
        const whitelisted = await isWhitelisted(detailsProvider, faucetAddress, address)
        setUserIsWhitelisted(whitelisted)
        console.log("User Drop-list status set to:", whitelisted)
      }
    } catch (error) {
      console.error("Error loading faucet details:", error)
      toast({
        title: "Failed to load faucet details",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkNetwork = () => {
    if (!chainId) {
      toast({
        title: "Network not detected",
        description: "Please ensure your wallet is connected to a supported network",
        variant: "destructive",
      })
      return false
    }
    if (networkId && Number(networkId) !== chainId) {
      const targetNetwork = networks.find((n) => n.chainId === Number(networkId))
      if (targetNetwork) {
        toast({
          title: "Wrong Network",
          description: "Switch to the network to perform operation",
          variant: "destructive",
          action: (
            <Button onClick={() => setNetwork(targetNetwork)} variant="outline">
              Switch to {targetNetwork.name}
            </Button>
          ),
        })
        return false
      }
    }
    return true
  }

  async function handleBackendClaim() {
    if (!isConnected || !address || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to drop tokens",
        variant: "destructive",
      })
      return
    }
    if (!chainId || !networkId) {
      toast({
        title: "Network not detected",
        description: "Please ensure your wallet is connected to a supported network",
        variant: "destructive",
      })
      return
    }
    if (backendMode && !isSecretCodeValid) {
      toast({
        title: "Invalid Drop code",
        description: "Please enter a valid 6-character alphanumeric Drop code",
        variant: "destructive",
      })
      return
    }
    if (!backendMode && !userIsWhitelisted) {
      toast({
        title: "Not Drop-listed",
        description: "You are not Drop-listed to claim from this faucet",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      setIsClaiming(true)
      if (!window.ethereum) {
        throw new Error("Wallet not detected. Please install MetaMask or another Ethereum wallet.")
      }
      await window.ethereum.request({ method: "eth_requestAccounts" })
      console.log("Sending drop request", { backendMode, secretCode: backendMode ? secretCode : "N/A" })
      const result = backendMode
        ? await claimViaBackend(address, faucetAddress, provider as BrowserProvider, secretCode)
        : await claimNoCodeViaBackend(address, faucetAddress, provider as BrowserProvider)
      const formattedTxHash = result.txHash.startsWith("0x") ? result.txHash : (`0x${result.txHash}` as `0x${string}`)
      setTxHash(formattedTxHash)
      const networkName = selectedNetwork?.name || "Unknown Network"
      const claimAmountBN = faucetDetails?.claimAmount || BigInt(0)
      await storeClaim(
        provider as BrowserProvider,
        address,
        faucetAddress,
        claimAmountBN,
        formattedTxHash,
        BigInt(chainId),
        BigInt(Number(networkId)),
        networkName,
      )
      toast({
        title: "Tokens dropped successfully",
        description: `You have dropped ${
          faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : ""
        } ${tokenSymbol} and recorded the drop on-chain on ${networkName}`,
      })
      setShowClaimPopup(true)
      setSecretCode("")
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error dropping tokens:", error)
      let errorMessage = error.message || "Unknown error occurred"
      if (errorMessage.includes("Unauthorized: Invalid Drop code")) {
        errorMessage = "Invalid Drop code. Please check and try again."
      }
      toast({
        title: "Failed to drop tokens",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsClaiming(false)
    }
  }

  const handleFund = async () => {
    if (!isConnected || !provider || !fundAmount || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid amount",
        variant: "destructive",
      })
      return
    }
    setAdjustedFundAmount(fundAmount)
    setShowFundPopup(true)
  }

  const confirmFund = async () => {
    if (!isConnected || !provider || !adjustedFundAmount || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid amount",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      const amount = parseUnits(adjustedFundAmount, tokenDecimals)
      await fundFaucet(
        provider as BrowserProvider,
        faucetAddress,
        amount,
        faucetDetails.isEther,
        BigInt(chainId),
        BigInt(Number(networkId)),
      )
      toast({
        title: "Faucet funded successfully",
        description: `You have added ${formatUnits(amount, tokenDecimals)} ${tokenSymbol} to the faucet (after 5% platform fee)`,
      })
      setFundAmount("")
      setAdjustedFundAmount("")
      setShowFundPopup(false)
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error funding faucet:", error)
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork()
      } else {
        toast({
          title: "Failed to fund faucet",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        })
      }
    }
  }

  const handleWithdraw = async () => {
    if (!isConnected || !provider || !withdrawAmount || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid amount",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      const amount = parseUnits(withdrawAmount, tokenDecimals)
      await withdrawTokens(
        provider as BrowserProvider,
        faucetAddress,
        amount,
        BigInt(chainId),
        BigInt(Number(networkId)),
      )
      toast({
        title: "Tokens withdrawn successfully",
        description: `You have withdrawn ${withdrawAmount} ${tokenSymbol} from the faucet`,
      })
      setWithdrawAmount("")
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error withdrawing tokens:", error)
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork()
      } else {
        toast({
          title: "Failed to withdraw tokens",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        })
      }
    }
  }

  const handleUpdateClaimParameters = async () => {
    if (!isConnected || !provider || !chainId) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet and ensure a network is selected",
        variant: "destructive",
      })
      return
    }
    if (!claimAmount || !startTime || !endTime) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all drop parameters",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      const claimAmountBN = parseUnits(claimAmount, tokenDecimals)
      const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000)
      if (backendMode) {
        const response = await fetch("https://fauctdrop-backend-1.onrender.com/set-claim-parameters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            faucetAddress,
            claimAmount: claimAmountBN.toString(),
            startTime: startTimestamp,
            endTime: endTimestamp,
            chainId: Number(chainId),
          }),
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || "Failed to set drop parameters")
        }
        const result = await response.json()
        const secretCodeFromBackend = result.secretCode
        saveToStorage(`secretCode_${faucetAddress}`, secretCodeFromBackend)
        setGeneratedSecretCode(secretCodeFromBackend)
        setShowSecretCodeDialog(true)
      }
      await setClaimParameters(
        provider as BrowserProvider,
        faucetAddress,
        claimAmountBN,
        startTimestamp,
        endTimestamp,
        BigInt(chainId),
        BigInt(Number(networkId)),
      )
      toast({
        title: "Drop parameters updated",
        description: `Parameters updated successfully. ${backendMode ? "Drop code generated and stored." : ""}`,
      })
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error updating drop parameters:", error)
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork()
      } else {
        toast({
          title: "Failed to update drop parameters",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        })
      }
    }
  }

  const handleUpdateWhitelist = async () => {
    if (!isConnected || !provider || !whitelistAddresses.trim() || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter valid addresses",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      const addresses = whitelistAddresses
        .split(/[\n,]/)
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0)
      if (addresses.length === 0) return
      await setWhitelistBatch(
        provider as BrowserProvider,
        faucetAddress,
        addresses,
        isWhitelistEnabled,
        BigInt(chainId),
        BigInt(Number(networkId)),
      )
      toast({
        title: "Drop-list updated",
        description: `${addresses.length} addresses have been ${isWhitelistEnabled ? "added to" : "removed from"} the Drop-list`,
      })
      setWhitelistAddresses("")
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error updating Drop-list:", error)
      toast({
        title: "Failed to update Drop-list",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleCustomClaimFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setCustomClaimFile(file)
  }

  const handleUploadCustomClaims = async () => {
    if (!customClaimFile || !isConnected || !provider || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please select a file and ensure your wallet is connected",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      const text = await customClaimFile.text()
      const lines = text.split("\n").filter((line) => line.trim())
      const users: string[] = []
      const amounts: bigint[] = []
      for (const line of lines) {
        const [address, amount] = line.split(",").map((s) => s.trim())
        if (address && amount) {
          users.push(address)
          amounts.push(parseUnits(amount, tokenDecimals))
        }
      }
      if (users.length === 0) {
        throw new Error("No valid entries found in file")
      }
      await setCustomClaimAmountsBatch(
        provider as BrowserProvider,
        faucetAddress,
        users,
        amounts,
        BigInt(chainId),
        BigInt(Number(networkId)),
      )
      toast({
        title: "Custom claim amounts set",
        description: `Set custom amounts for ${users.length} addresses`,
      })
      setCustomClaimFile(null)
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error setting custom claim amounts:", error)
      toast({
        title: "Failed to set custom claim amounts",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleResetAllClaims = async () => {
    if (!isConnected || !provider || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet and ensure a network is selected",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      await resetAllClaims(provider as BrowserProvider, faucetAddress, BigInt(chainId), BigInt(Number(networkId)))
      toast({
        title: "All claims reset",
        description: "All users can now claim again",
      })
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error resetting all claims:", error)
      toast({
        title: "Failed to reset all claims",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base">Loading faucet details...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:gap-8 max-w-3xl sm:max-w-4xl mx-auto">
          <Header pageTitle="Faucet Details" />
          {faucetDetails ? (
            <>
              <Card className="w-full mx-auto">
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-lg sm:text-xl">{faucetDetails.name || tokenSymbol} Faucet</CardTitle>
                      {canAccessAdminControls && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowEditNameDialog(true)}
                            title="Edit Faucet Name"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteDialog(true)}
                            title="Delete Faucet"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedNetwork ? (
                        <Badge
                          style={{ backgroundColor: selectedNetwork.color }}
                          className="text-white text-xs font-medium px-2 py-1"
                        >
                          {selectedNetwork.name}
                        </Badge>
                      ) : (
                        <Badge className="text-white text-xs font-medium px-2 py-1 bg-gray-500">Unknown Network</Badge>
                      )}
                      <Badge variant={backendMode ? "default" : "secondary"}>{backendMode ? "Auto" : "Manual"}</Badge>
                      {faucetDetails.isClaimActive ? (
                        <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Faucet Address:</span>
                        <span className="text-xs font-mono break-all">{faucetAddress}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Token Address:</span>
                        <span className="text-xs font-mono break-all">{faucetDetails.token}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Owner:</span>
                        <span className="text-xs font-mono break-all">{faucetDetails.owner}</span>
                      </div>
                      {!backendMode && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                          <span className="font-medium">Drop-list Status:</span>
                          <span className={`text-xs ${userIsWhitelisted ? "text-green-600" : "text-red-600"}`}>
                            {userIsWhitelisted ? "Drop-listed" : "Not Drop-listed"}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                {faucetDetails && (
                  <div className="px-4 sm:px-6 pb-2">
                    <TokenBalance
                      tokenAddress={faucetDetails.token}
                      tokenSymbol={tokenSymbol}
                      tokenDecimals={tokenDecimals}
                      isNativeToken={faucetDetails.isEther}
                      networkChainId={selectedNetwork?.chainId}
                    />
                  </div>
                )}
                <CardContent className="space-y-4 px-4 sm:px-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="flex flex-col p-3 sm:p-4 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Balance</span>
                      <span className="text-lg sm:text-2xl font-bold truncate">
                        {faucetDetails.balance ? formatUnits(faucetDetails.balance, tokenDecimals) : "0"} {tokenSymbol}
                      </span>
                    </div>
                    <div className="flex flex-col p-3 sm:p-4 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Drop Amount</span>
                      <span className="text-lg sm:text-2xl font-bold truncate">
                        {faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0"} {tokenSymbol}
                      </span>
                    </div>
                    <div className="flex flex-col p-3 sm:p-4 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Status</span>
                      <span className="text-base sm:text-lg font-medium">
                        {hasClaimed ? "Already dropped" : "Available to drop"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">{startCountdown}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">{endCountdown}</span>
                    </div>
                  </div>
                  {backendMode && (
                    <div className="space-y-2">
                      <Label htmlFor="secret-code" className="text-xs sm:text-sm">
                        Drop Code
                      </Label>
                      <Input
                        id="secret-code"
                        placeholder="Enter 6-character code (e.g., ABC123)"
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                        className="text-xs sm:text-sm"
                        maxLength={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-character alphanumeric code to drop tokens
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2 px-4 sm:px-6">
                  <Button
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={handleFollow}
                    disabled={hasFollowed}
                  >
                    {hasFollowed ? "Followed on 𝕏" : "Follow on 𝕏 to drop"}
                  </Button>
                  <Button
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                    variant="outline"
                    onClick={handleBackendClaim}
                    disabled={isClaiming || !address || !canClaim}
                  >
                    {isClaiming
                      ? "Claiming..."
                      : hasClaimed
                      ? "Already dropped"
                      : `Drop ${faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : ""} ${tokenSymbol}`}
                  </Button>
                </CardFooter>
              </Card>
              {canAccessAdminControls && (
                <Card className="w-full mx-auto">
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl">Admin Controls</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Manage your faucet settings - Mode: {backendMode ? "Automatic" : "Manual"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <Tabs defaultValue="fund" value={activeTab} onValueChange={setActiveTab}>
                      <div className="sm:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full flex justify-between items-center text-xs">
                              {activeTab === "fund" && "Fund"}
                              {activeTab === "parameters" && "Parameters"}
                              {activeTab === "whitelist" && "Drop-list"}
                              {activeTab === "custom" && "Custom"}
                              {activeTab === "admin-power" && "Admin Power"}
                              <Menu className="h-4 w-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-full">
                            <DropdownMenuItem onClick={() => setActiveTab("fund")} className="text-xs">
                              <Upload className="h-3 w-3 mr-2" /> Fund
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveTab("parameters")} className="text-xs">
                              <Coins className="h-3 w-3 mr-2" /> Parameters
                            </DropdownMenuItem>
                            {!backendMode && (
                              <DropdownMenuItem onClick={() => setActiveTab("whitelist")} className="text-xs">
                                <Users className="h-3 w-3 mr-2" /> Drop-list
                              </DropdownMenuItem>
                            )}
                            {!backendMode && (
                              <DropdownMenuItem onClick={() => setActiveTab("custom")} className="text-xs">
                                <FileUp className="h-3 w-3 mr-2" /> Custom
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setActiveTab("admin-power")} className="text-xs">
                              <RotateCcw className="h-3 w-3 mr-2" /> Admin Power
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <TabsList className="hidden sm:grid grid-cols-5 gap-2 w-full">
                        <TabsTrigger value="fund" className="text-xs sm:text-sm">
                          <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Fund
                        </TabsTrigger>
                        <TabsTrigger value="parameters" className="text-xs sm:text-sm">
                          <Coins className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Parameters
                        </TabsTrigger>
                        {!backendMode && (
                          <TabsTrigger value="whitelist" className="text-xs sm:text-sm">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Drop-list
                          </TabsTrigger>
                        )}
                        {!backendMode && (
                          <TabsTrigger value="custom" className="text-xs sm:text-sm">
                            <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Custom
                          </TabsTrigger>
                        )}
                        <TabsTrigger value="admin-power" className="text-xs sm:text-sm">
                          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Admin Power
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="fund" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fund-amount" className="text-xs sm:text-sm">
                              Fund Amount
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="fund-amount"
                                placeholder="0.0"
                                value={fundAmount}
                                onChange={(e) => setFundAmount(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Button onClick={handleFund} disabled={!fundAmount} className="text-xs sm:text-sm">
                                <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Fund
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Add {tokenSymbol} to the faucet (5% platform fee applies)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="withdraw-amount" className="text-xs sm:text-sm">
                              Withdraw Amount
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="withdraw-amount"
                                placeholder="0.0"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Button
                                onClick={handleWithdraw}
                                disabled={!withdrawAmount}
                                variant="outline"
                                className="text-xs sm:text-sm"
                              >
                                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Withdraw
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Withdraw {tokenSymbol} from the faucet</p>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="parameters" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="claim-amount" className="text-xs sm:text-sm">
                              Drop Amount
                            </Label>
                            <Input
                              id="claim-amount"
                              placeholder="0.0"
                              value={claimAmount}
                              onChange={(e) => setClaimAmount(e.target.value)}
                              className="text-xs sm:text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Amount of {tokenSymbol} users can drop</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="start-time" className="text-xs sm:text-sm">
                                Start Time
                              </Label>
                              <Input
                                id="start-time"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="end-time" className="text-xs sm:text-sm">
                                End Time
                              </Label>
                              <Input
                                id="end-time"
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={handleUpdateClaimParameters}
                              className="text-xs sm:text-sm flex-1"
                              disabled={!claimAmount || !startTime || !endTime}
                            >
                              Update Parameters {backendMode && "& Generate Drop Code"}
                            </Button>
                            {backendMode && (
                              <Button
                                onClick={handleRetrieveSecretCode}
                                variant="outline"
                                className="text-xs sm:text-sm"
                              >
                                <Key className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Get Current Code
                              </Button>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                      {!backendMode && (
                        <TabsContent value="whitelist" className="space-y-4 mt-4">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="whitelist-mode"
                                checked={isWhitelistEnabled}
                                onCheckedChange={setIsWhitelistEnabled}
                              />
                              <Label htmlFor="whitelist-mode" className="text-xs sm:text-sm">
                                {isWhitelistEnabled ? "Add to Drop-list" : "Remove from Drop-list"}
                              </Label>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="whitelist-addresses" className="text-xs sm:text-sm">
                                Addresses (one per line or comma-separated)
                              </Label>
                                <Textarea
                                  id="whitelist-addresses"
                                  placeholder="0x..."
                                  value={whitelistAddresses}
                                  onChange={(e) => setWhitelistAddresses(e.target.value)}
                                  rows={5}
                                  className="text-xs sm:text-sm"
                                />
                              </div>
                              <Button onClick={handleUpdateWhitelist} className="text-xs sm:text-sm">
                                Update Drop-list
                              </Button>
                            </div>
                          </TabsContent>
                        )}
                        {!backendMode && (
                          <TabsContent value="custom" className="space-y-4 mt-4">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="custom-claim-file" className="text-xs sm:text-sm">
                                  Upload Custom Claim Amounts
                                </Label>
                                <Input
                                  id="custom-claim-file"
                                  type="file"
                                  accept=".csv,.txt"
                                  onChange={handleCustomClaimFile}
                                  className="text-xs sm:text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Upload a CSV file with format: address,amount (one per line)
                                </p>
                              </div>
                              <Button
                                onClick={handleUploadCustomClaims}
                                disabled={!customClaimFile}
                                className="text-xs sm:text-sm"
                              >
                                <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Upload Custom Claims
                              </Button>
                            </div>
                          </TabsContent>
                        )}
                        <TabsContent value="admin-power" className="space-y-4 mt-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm">Current Admins</Label>
                              {adminList.length > 0 ? (
                                <ul className="list-disc pl-5 text-xs sm:text-sm">
                                  {adminList.map((admin) => (
                                    <li key={admin} className="font-mono break-all">{admin}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground">No admins found</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm">Reset All Claims</Label>
                              <p className="text-xs text-muted-foreground">
                                Allow all users to claim again
                              </p>
                              <Button onClick={handleResetAllClaims} variant="destructive" className="text-xs sm:text-sm">
                                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Reset All Claims
                              </Button>
                            </div>
                            {isOwner && (
                              <div className="space-y-2">
                                <Label htmlFor="new-admin" className="text-xs sm:text-sm">
                                  Add Admin
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="new-admin"
                                    placeholder="0x..."
                                    value={newAdminAddress}
                                    onChange={(e) => setNewAdminAddress(e.target.value)}
                                    className="text-xs sm:text-sm"
                                  />
                                  <Button
                                    onClick={() => setShowAddAdminDialog(true)}
                                    disabled={!newAdminAddress}
                                    className="text-xs sm:text-sm"
                                  >
                                    Add Admin
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="w-full mx-auto">
                <CardContent className="py-6 sm:py-10 text-center">
                  <p className="text-sm sm:text-base">Faucet not found or error loading details</p>
                  <Button className="mt-4 text-xs sm:text-sm" onClick={() => router.push("/")}>
                    Return to Home
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <Dialog open={showClaimPopup} onOpenChange={setShowClaimPopup}>
          <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Drop Successful!</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                You have successfully dropped{" "}
                {faucetDetails?.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0"} {tokenSymbol}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col space-y-4 py-4">
              <p className="text-xs sm:text-sm">Share your drop on X to help spread the word about FaucetDrops!</p>
            </div>
            <DialogFooter className="sm:justify-start flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="default"
                onClick={handleShareOnX}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                Share on 𝕏
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showFundPopup} onOpenChange={setShowFundPopup}>
          <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Confirm Funding</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Review the funding details before proceeding.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="adjusted-fund-amount" className="text-xs sm:text-sm">
                  Amount to Fund
                </Label>
                <Input
                  id="adjusted-fund-amount"
                  value={adjustedFundAmount}
                  onChange={(e) => setAdjustedFundAmount(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Platform fee (5%): {fee} {tokenSymbol}</p>
                <p>Net amount to faucet: {netAmount} {tokenSymbol}</p>
                <p className="text-blue-600">
                  Tip: To fund exactly {fundAmount} {tokenSymbol}, enter {recommendedInput} {tokenSymbol}
                </p>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowFundPopup(false)} className="text-xs sm:text-sm">
                Cancel
              </Button>
              <Button onClick={confirmFund} className="text-xs sm:text-sm">
                Confirm Fund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showSecretCodeDialog} onOpenChange={setShowSecretCodeDialog}>
          <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Drop Code Generated</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Your Drop code has been generated and stored. Share this code with users to allow them to drop tokens.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-mono font-bold bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  {generatedSecretCode}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                This code is required for users to drop tokens. Keep it safe and share it only with intended users.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowSecretCodeDialog(false)} className="text-xs sm:text-sm w-full">
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showCurrentSecretDialog} onOpenChange={setShowCurrentSecretDialog}>
          <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Current Drop Code</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                This is the current drop code for your faucet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-mono font-bold bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  {currentSecretCode}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Share this code with users to allow them to drop tokens from your faucet.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowCurrentSecretDialog(false)} className="text-xs sm:text-sm w-full">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
          <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Edit Faucet Name</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">Enter a new name for your faucet.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-faucet" className="text-xs sm:text-sm">
                  New Faucet Name
                </Label>
                <Input
                  id="new-faucet-name"
                  value={newFaucetName}
                  onChange={(e) => setNewFaucetName(e.target.value)}
                  placeholder="Enter new faucet name"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowEditNameDialog(false)} className="text-xs sm:text-sm">
                Cancel
              </Button>
              <Button onClick={handleUpdateFaucetName} disabled={!newFaucetName.trim()} className="text-xs sm:text-sm">
                Update Name
              </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl text-red-600">Delete Faucet</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Are you sure you want to delete this faucet? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-xs text-muted-foreground">
                Deleting the faucet will permanently remove it and all associated data. Make sure to withdraw any
                remaining tokens first.
              </p>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="text-xs sm:text-sm">
                Cancel
              </Button>
              <Button onClick={handleDeleteFaucet} variant="destructive" className="text-xs sm:text-sm">
                Delete Faucet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
          <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Add Admin</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Add a new admin to help manage this faucet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="admin-address" className="text-xs sm:text-sm">
                  Admin Address
                </Label>
                <Input
                  id="admin-address"
                  value={newAdminAddress}
                  onChange={(e) => setNewAdminAddress(e.target.value)}
                  placeholder="0x..."
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowAddAdminDialog(false)} className="text-xs sm:text-sm">
                Cancel
              </Button>
              <Button onClick={handleAddAdmin} disabled={!newAdminAddress.trim()} className="text-xs sm:text-sm">
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
     
    </main>
  )
}