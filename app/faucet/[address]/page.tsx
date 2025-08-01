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
  removeAdmin,
  getFaucetTransactionHistory,
} from "@/lib/faucet"
import { formatUnits, parseUnits, type BrowserProvider } from "ethers"
import { Clock, Coins, Download, Share2, Upload, Users, Key, RotateCcw, Edit, Trash2, FileUp, Menu, History, Copy, ExternalLink, Check, AlertCircle, User } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

// Required X/Twitter accounts that users must follow
const REQUIRED_FOLLOWS = [
  {
    id: "faucetdrops_x",
    name: "FaucetDrops on 𝕏",
    url: "https://x.com/FaucetDrops",
    handle: "@FaucetDrops",
    platform: "x",
    icon: "𝕏"
  },
  {
    id: "faucetdrops_telegram",
    name: "FaucetDrops Telegram chat", 
    url: "https://t.me/faucetdropschat",
    handle: "@faucetdropschat",
    platform: "telegram",
    icon: "📱"
  },
]

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
  const [isFunding, setIsFunding] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isUpdatingParameters, setIsUpdatingParameters] = useState(false)
  const [isUpdatingWhitelist, setIsUpdatingWhitelist] = useState(false)
  const [isUploadingCustomClaims, setIsUploadingCustomClaims] = useState(false)
  const [isResettingClaims, setIsResettingClaims] = useState(false)
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [isDeletingFaucet, setIsDeletingFaucet] = useState(false)
  const [isManagingAdmin, setIsManagingAdmin] = useState(false)
  const [isRetrievingSecret, setIsRetrievingSecret] = useState(false)
  const [fundAmount, setFundAmount] = useState("")
  const [adjustedFundAmount, setAdjustedFundAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [claimAmount, setClaimAmount] = useState("0")
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState(true)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [whitelistAddresses, setWhitelistAddresses] = useState("")
  const [tokenSymbol, setTokenSymbol] = useState("CELO")
  const [tokenDecimals, setTokenDecimals] = useState(18)
  const [hasClaimed, setHasClaimed] = useState(false)
  
  // Verification system states
  const [usernames, setUsernames] = useState<Record<string, string>>({})
  const [verificationStates, setVerificationStates] = useState<Record<string, boolean>>({})
  const [isVerifying, setIsVerifying] = useState(false)
  const [currentVerification, setCurrentVerification] = useState<string | null>(null)
  
  const [showClaimPopup, setShowClaimPopup] = useState(false)
  const [showFundPopup, setShowFundPopup] = useState(false)
  const [showEditNameDialog, setShowEditNameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false)
  const [showFollowDialog, setShowFollowDialog] = useState(false)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [newFaucetName, setNewFaucetName] = useState("")
  const [newAdminAddress, setNewAdminAddress] = useState("")
  const [isAddingAdmin, setIsAddingAdmin] = useState(true)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [startCountdown, setStartCountdown] = useState<string | null>(null)
  const [endCountdown, setEndCountdown] = useState<string>("")
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null)
  const [secretCode, setSecretCode] = useState("")
  const [generatedSecretCode, setGeneratedSecretCode] = useState("")
  const [showSecretCodeDialog, setShowSecretCodeDialog] = useState(false)
  const [showCurrentSecretDialog, setShowCurrentSecretDialog] = useState(false)
  const [userIsWhitelisted, setUserIsWhitelisted] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [backendMode, setBackendMode] = useState(true)
  const [customClaimFile, setCustomClaimFile] = useState<File | null>(null)
  const [adminList, setAdminList] = useState<string[]>([])
  const [factoryOwner, setFactoryOwner] = useState<string | null>(null)
  const [showAdminPopup, setShowAdminPopup] = useState(false)
  const [dontShowAdminPopupAgain, setDontShowAdminPopupAgain] = useState(false)
  const [activeTab, setActiveTab] = useState("fund")
  const [transactions, setTransactions] = useState<
    { faucetAddress: string; transactionType: string; initiator: string; amount: bigint; isEther: boolean; timestamp: number }[]
  >([])
  const [currentPage, setCurrentPage] = useState(1)
  const transactionsPerPage = 10

  const isOwner = address && faucetDetails?.owner && address.toLowerCase() === faucetDetails.owner.toLowerCase()
  const canAccessAdminControls = isOwner || userIsAdmin
  const isSecretCodeValid = secretCode.length === 6 && /^[A-Z0-9]{6}$/.test(secretCode)
  
  // Check if all required accounts are verified
  const allAccountsVerified = REQUIRED_FOLLOWS.every(account => verificationStates[account.id])

  // Check if all usernames are provided (for button state)
  const allUsernamesProvided = REQUIRED_FOLLOWS.every(account => 
    usernames[account.id] && usernames[account.id].trim().length > 0
  )

  const canClaim = backendMode
    ? faucetDetails?.isClaimActive && !hasClaimed && isSecretCodeValid && allAccountsVerified
    : faucetDetails?.isClaimActive && !hasClaimed && userIsWhitelisted && allAccountsVerified

  const FACTORY_OWNER_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785";

  // Helper function to determine the action text based on platform
  const getActionText = (platform: string) => {
    if (platform === 'telegram') return 'Join'
    if (platform === 'x') return 'Follow'
    return 'Follow' // default
  }

  // Helper function to determine the action past tense
  const getActionPastTense = (platform: string) => {
    if (platform === 'telegram') return 'Joined'
    if (platform === 'x') return 'Followed'
    return 'Followed' // default
  }

  const popupContent = (amount: string, txHash: string | null) =>
    `I just received a drop of ${amount} ${tokenSymbol} from @FaucetDrops on ${selectedNetwork?.name || "the network"}. Verify Drop 💧: ${
      txHash
        ? `${selectedNetwork?.blockExplorerUrls || "https://explorer.unknown"}/tx/0x${txHash.slice(2)}`
        : "Transaction not available"
    }`

  const calculateFee = (amount: string) => {
    try {
      const parsedAmount = parseUnits(amount, tokenDecimals)
      const fee = (parsedAmount * BigInt(3)) / BigInt(100)
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

  const handleFollowAccount = (accountId: string, accountUrl: string) => {
    window.open(accountUrl, "_blank")
    // Remove the followStates update since we're showing inputs constantly
  }

  // New simplified verification handler
  const handleVerifyAllTasks = async () => {
    // Check if all usernames are provided
    const missingUsernames = REQUIRED_FOLLOWS.filter(account => 
      !usernames[account.id] || usernames[account.id].trim().length === 0
    )
    
    if (missingUsernames.length > 0) {
      toast({
        title: "Missing Information",
        description: "Please enter usernames for all required tasks.",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)
    setShowVerificationDialog(true)

    // Simulate verification process (3 seconds delay)
    setTimeout(() => {
      // Mark all tasks as verified
      const newVerificationStates = {}
      REQUIRED_FOLLOWS.forEach(account => {
        newVerificationStates[account.id] = true
      })
      setVerificationStates(newVerificationStates)
      
      setIsVerifying(false)
      
      toast({
        title: "All Tasks Verified",
        description: "All required tasks have been verified successfully!",
      })
      
      setTimeout(() => {
        setShowVerificationDialog(false)
        setShowFollowDialog(false)
      }, 2000)
    }, 3000)
  }

  const handleFollowAll = () => {
    setShowFollowDialog(true)
  }

  const handleShareOnX = () => {
    const claimedAmount = faucetDetails ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0"
    const shareText = encodeURIComponent(popupContent(claimedAmount, txHash))
    const shareUrl = `https://x.com/intent/tweet?text=${shareText}`
    window.open(shareUrl, "_blank")
    setShowClaimPopup(false)
  }

  const handleCopySecretCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast({
        title: "Code Copied",
        description: "Drop code has been copied to your clipboard.",
      })
      setShowSecretCodeDialog(false)
      setShowCurrentSecretDialog(false)
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy the code. Please try again.",
        variant: "destructive",
      })
    }
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
        description: "Only the faucet Admin can retrieve the Drop code",
        variant: "destructive",
      })
      return
    }
    try {
      setIsRetrievingSecret(true)
      const code = await retrieveSecretCode(faucetAddress)
      setSecretCode(code)
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
    } finally {
      setIsRetrievingSecret(false)
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
      setIsUpdatingName(true)
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
    } finally {
      setIsUpdatingName(false)
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
      setIsDeletingFaucet(true)
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
    } finally {
      setIsDeletingFaucet(false)
    }
  }

 const handleManageAdmin = async () => {
if (!isConnected || !provider || !newAdminAddress.trim() || !chainId) {
  toast({
    title: "Invalid Input",
    description: "Please connect your wallet, ensure a network is selected, and enter a valid address",
    variant: "destructive",
  })
  return
}
if (!checkNetwork()) return

// Check if trying to add/remove the owner
if (newAdminAddress.toLowerCase() === faucetDetails?.owner.toLowerCase()) {
  toast({
    title: "Cannot modify owner",
    description: "The faucet owner cannot be added or removed as an admin",
    variant: "destructive",
  })
  return
}

// Check if trying to add/remove the factory owner
if (newAdminAddress.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()) {
  toast({
    title: "Cannot modify factory owner",
    description: "The factory owner cannot be added or removed as an admin",
    variant: "destructive",
  })
  return
}

try {
  setIsManagingAdmin(true)
  if (isAddingAdmin) {
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
    // Update admin list by adding the new admin
    setAdminList((prev) => [...prev, newAdminAddress])
  } else {
    await removeAdmin(
      provider as BrowserProvider,
      faucetAddress,
      newAdminAddress,
      BigInt(chainId),
      BigInt(Number(networkId)),
    )
    toast({
      title: "Admin removed",
      description: `Address ${newAdminAddress} has been removed as an admin`,
    })
    // Update admin list by removing the admin
    setAdminList((prev) => prev.filter((admin) => admin.toLowerCase() !== newAdminAddress.toLowerCase()))
  }
  setNewAdminAddress("")
  setShowAddAdminDialog(false)
  await loadFaucetDetails()
} catch (error: any) {
  console.error("Error managing admin:", error)
  toast({
    title: `Failed to ${isAddingAdmin ? "add" : "remove"} admin`,
    description: error.message || "Unknown error occurred",
    variant: "destructive",
  })
} finally {
  setIsManagingAdmin(false)
}
}

  const checkAdminStatus = (inputAddress: string) => {
if (!inputAddress.trim()) {
  setIsAddingAdmin(true)
  return
}
// Check against the admin list (which now includes owner but excludes factory owner)
const isAdmin = adminList.some((admin) => admin.toLowerCase() === inputAddress.toLowerCase())
setIsAddingAdmin(!isAdmin)
}

  const loadTransactionHistory = async () => {
    if (!isConnected || !provider || !chainId || !selectedNetwork) {
      return
    }
    if (!canAccessAdminControls) {
      return
    }
    try {
      const txs = await getFaucetTransactionHistory(
        provider as BrowserProvider,
        faucetAddress,
        selectedNetwork,
      )
      const sortedTxs = txs.sort((a, b) => b.timestamp - a.timestamp)
      setTransactions(sortedTxs)
    } catch (error: any) {
      console.error("Error loading Activity Log:", error)
      toast({
        title: "Failed to load Activity Log",
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

  useEffect(() => {
    if (canAccessAdminControls && provider && faucetAddress && selectedNetwork) {
      loadTransactionHistory()
    }
  }, [canAccessAdminControls, provider, faucetAddress, selectedNetwork])

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
  const [factoryOwnerAddr, ...otherAdmins] = admins
  setFactoryOwner(factoryOwnerAddr)
  
  // Create admin list that includes owner but excludes factory owner
  const allAdminsIncludingOwner = [details.owner, ...otherAdmins].filter(
    (admin, index, self) => 
      // Remove duplicates and filter out factory owner
      self.indexOf(admin) === index && 
      admin.toLowerCase() !== FACTORY_OWNER_ADDRESS.toLowerCase()
  )
  
  setAdminList(allAdminsIncludingOwner)
  console.log("Admin list set to:", allAdminsIncludingOwner, "Factory owner:", factoryOwnerAddr)
  
  if (address) {
    const isUserAdmin = otherAdmins.some((admin: string) => admin.toLowerCase() === address.toLowerCase())
    setUserIsAdmin(isUserAdmin)
    console.log("User admin status set to:", isUserAdmin, "based on admins:", otherAdmins)
    // Show admin popup if user is admin or owner
    if (isUserAdmin || (address.toLowerCase() === details.owner.toLowerCase())) {
      setShowAdminPopup(true)
    }
  } else {
    setUserIsAdmin(false)
    console.log("No address connected, user admin status set to false")
  }
  
  // ... rest of your existing loadFaucetDetails code
  if (details.claimAmount) {
    setClaimAmount(formatUnits(details.claimAmount, tokenDecimals))
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
            <Button
              onClick={() => setNetwork(targetNetwork)}
              variant="outline"
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
            >
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
    if (!allAccountsVerified) {
      toast({
        title: "Verification Required",
        description: "Please complete and verify all required tasks before claiming",
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
      
      toast({
        title: "Tokens dropped successfully",
        description: `You have dropped ${
          faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : ""
        } ${tokenSymbol} on ${networkName}`,
      })
      setShowClaimPopup(true)
      setSecretCode("")
      await loadFaucetDetails()
      await loadTransactionHistory()
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
      setIsFunding(true)
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
        description: `You have added ${formatUnits(amount, tokenDecimals)} ${tokenSymbol} to the faucet (after 3% platform fee)`,
      })
      setFundAmount("")
      setAdjustedFundAmount("")
      setShowFundPopup(false)
      await loadFaucetDetails()
      await loadTransactionHistory()
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
    } finally {
      setIsFunding(false)
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
      setIsWithdrawing(true)
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
      await loadTransactionHistory()
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
    } finally {
      setIsWithdrawing(false)
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
      setIsUpdatingParameters(true)
      const claimAmountBN = parseUnits(claimAmount, tokenDecimals)
      const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000)
      
      let secretCodeFromBackend = ""
      
      if (backendMode) {
        const response = await fetch("https://fauctdrop-backend.onrender.com/set-claim-parameters", {
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
        secretCodeFromBackend = result.secretCode
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

      if (backendMode && secretCodeFromBackend) {
        saveToStorage(`secretCode_${faucetAddress}`, secretCodeFromBackend)
        setGeneratedSecretCode(secretCodeFromBackend)
        setShowSecretCodeDialog(true)
      }

      toast({
        title: "Drop parameters updated",
        description: `Parameters updated successfully. ${backendMode ? "Drop code generated and stored." : ""}`,
      })
      
      await loadFaucetDetails()
      await loadTransactionHistory()
      
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
    } finally {
      setIsUpdatingParameters(false)
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
      setIsUpdatingWhitelist(true)
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
      await loadTransactionHistory()
    } catch (error: any) {
      console.error("Error updating Drop-list:", error)
      toast({
        title: "Failed to update Drop-list",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingWhitelist(false)
    }
  }

  const handleCustomClaimFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Check file type
    const fileType = file.type
    const fileName = file.name.toLowerCase()
    
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.pdf') && !fileName.endsWith('.txt')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV, PDF, or TXT file",
        variant: "destructive",
      })
      return
    }
    
    setCustomClaimFile(file)
  }

  const parseAddressesAndAmounts = (text: string) => {
    const users: string[] = []
    const amounts: bigint[] = []
    const errors: string[] = []
    
    // First try to parse as CSV
    if (text.includes(',') || text.includes('\t')) {
      try {
        // Use Papa Parse for better CSV handling
        const lines = text.split('\n').filter(line => line.trim())
        let hasHeaders = false
        
        // Check if first line looks like headers
        const firstLine = lines[0]?.toLowerCase()
        if (firstLine && (firstLine.includes('address') || firstLine.includes('amount') || firstLine.includes('wallet'))) {
          hasHeaders = true
        }
        
        const dataLines = hasHeaders ? lines.slice(1) : lines
        
        dataLines.forEach((line, index) => {
          const lineNumber = hasHeaders ? index + 2 : index + 1
          const parts = line.split(/[,\t]/).map(s => s.trim().replace(/"/g, ''))
          
          if (parts.length >= 2) {
            const [addressPart, amountPart] = parts
            
            // Validate address format
            if (!addressPart.startsWith('0x') || addressPart.length !== 42) {
              errors.push(`Line ${lineNumber}: Invalid address format "${addressPart}"`)
              return
            }
            
            // Parse amount
            try {
              const amount = parseFloat(amountPart)
              if (isNaN(amount) || amount <= 0) {
                errors.push(`Line ${lineNumber}: Invalid amount "${amountPart}"`)
                return
              }
              
              users.push(addressPart)
              amounts.push(parseUnits(amount.toString(), tokenDecimals))
            } catch (error) {
              errors.push(`Line ${lineNumber}: Could not parse amount "${amountPart}"`)
            }
          } else {
            errors.push(`Line ${lineNumber}: Invalid format - expected address,amount`)
          }
        })
      } catch (error) {
        errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      // Try to parse as plain text with various formats
      const lines = text.split('\n').filter(line => line.trim())
      
      lines.forEach((line, index) => {
        const lineNumber = index + 1
        line = line.trim()
        
        // Skip empty lines and potential headers
        if (!line || line.toLowerCase().includes('address') || line.toLowerCase().includes('wallet')) {
          return
        }
        
        // Try different separators: comma, tab, space, pipe
        const separators = [',', '\t', '|', ' ']
        let parts: string[] = []
        
        for (const sep of separators) {
          const testParts = line.split(sep).map(s => s.trim()).filter(s => s)
          if (testParts.length >= 2) {
            parts = testParts
            break
          }
        }
        
        if (parts.length >= 2) {
          const addressPart = parts[0].replace(/"/g, '')
          const amountPart = parts[1].replace(/"/g, '')
          
          // Validate address
          if (!addressPart.startsWith('0x') || addressPart.length !== 42) {
            errors.push(`Line ${lineNumber}: Invalid address format "${addressPart}"`)
            return
          }
          
          // Parse amount
          try {
            const amount = parseFloat(amountPart)
            if (isNaN(amount) || amount <= 0) {
              errors.push(`Line ${lineNumber}: Invalid amount "${amountPart}"`)
              return
            }
            
            users.push(addressPart)
            amounts.push(parseUnits(amount.toString(), tokenDecimals))
          } catch (error) {
            errors.push(`Line ${lineNumber}: Could not parse amount "${amountPart}"`)
          }
        } else {
          // Try to extract addresses and amounts using regex
          const addressRegex = /0x[a-fA-F0-9]{40}/g
          const amountRegex = /\d+\.?\d*/g
          
          const addressMatches = line.match(addressRegex)
          const amountMatches = line.match(amountRegex)
          
          if (addressMatches && amountMatches && addressMatches.length > 0 && amountMatches.length > 0) {
            try {
              const amount = parseFloat(amountMatches[0])
              if (!isNaN(amount) && amount > 0) {
                users.push(addressMatches[0])
                amounts.push(parseUnits(amount.toString(), tokenDecimals))
              } else {
                errors.push(`Line ${lineNumber}: Invalid amount "${amountMatches[0]}"`)
              }
            } catch (error) {
              errors.push(`Line ${lineNumber}: Could not parse extracted amount`)
            }
          } else {
            errors.push(`Line ${lineNumber}: Could not extract address and amount from "${line}"`)
          }
        }
      })
    }
    
    return { users, amounts, errors }
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
      setIsUploadingCustomClaims(true)
      let text = ""
      
      const fileName = customClaimFile.name.toLowerCase()
      
      if (fileName.endsWith('.pdf')) {
        // Handle PDF files
        try {
          const arrayBuffer = await customClaimFile.arrayBuffer()
          const pdfData = new Uint8Array(arrayBuffer)
          
          // Simple PDF text extraction (basic approach)
          // Note: This is a simplified approach. For production, consider using a proper PDF parsing library
          const textDecoder = new TextDecoder()
          const pdfString = textDecoder.decode(pdfData)
          
          // Extract text between 'stream' and 'endstream' markers (simplified)
          const streamRegex = /stream[\s\S]*?endstream/g
          const matches = pdfString.match(streamRegex)
          
          if (matches) {
            text = matches.join(' ')
            // Clean up PDF artifacts
            text = text.replace(/stream|endstream/g, '')
            text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
            text = text.replace(/\s+/g, ' ') // Normalize whitespace
          } else {
            throw new Error("Could not extract text from PDF. Please try converting to CSV or TXT format.")
          }
        } catch (error) {
          toast({
            title: "PDF Processing Error", 
            description: "Could not read PDF file. Please convert to CSV or TXT format.",
            variant: "destructive",
          })
          return
        }
      } else {
        // Handle CSV/TXT files
        text = await customClaimFile.text()
      }
      
      const { users, amounts, errors } = parseAddressesAndAmounts(text)
      
      if (errors.length > 0) {
        console.warn("Parsing errors:", errors)
        toast({
          title: "Parsing Warnings",
          description: `${errors.length} lines had issues. Check console for details. Proceeding with ${users.length} valid entries.`,
          variant: "destructive",
        })
      }
      
      if (users.length === 0) {
        throw new Error("No valid entries found in file. Expected format: address,amount per line.")
      }
      
      // Show confirmation with preview
      const previewText = users.slice(0, 3).map((user, i) => 
        `${user}: ${formatUnits(amounts[i], tokenDecimals)} ${tokenSymbol}`
      ).join('\n') + (users.length > 3 ? `\n... and ${users.length - 3} more` : '')
      
      const confirmed = window.confirm(
        `Found ${users.length} valid entries${errors.length > 0 ? ` (${errors.length} errors)` : ''}:\n\n${previewText}\n\nProceed with setting custom amounts?`
      )
      
      if (!confirmed) {
        return
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
        description: `Successfully set custom amounts for ${users.length} addresses${errors.length > 0 ? ` (${errors.length} entries had errors)` : ''}`,
      })
      
      setCustomClaimFile(null)
      await loadFaucetDetails()
      await loadTransactionHistory()
    } catch (error: any) {
      console.error("Error setting custom claim amounts:", error)
      toast({
        title: "Failed to set custom claim amounts",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUploadingCustomClaims(false)
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
      setIsResettingClaims(true)
      
      // Get network info to determine transaction type
      const network = await provider.getNetwork()
      const feeData = await provider.getFeeData()
      
      // Check if network supports EIP-1559
      const supportsEIP1559 = feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null
      
      console.log('Network EIP-1559 support:', {
        chainId: network.chainId.toString(),
        supportsEIP1559,
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        gasPrice: feeData.gasPrice?.toString()
      })
      
      await resetAllClaims(provider as BrowserProvider, faucetAddress, BigInt(chainId), BigInt(Number(networkId)))
      toast({
        title: "All claims reset",
        description: "All users can now claim again",
      })
      await loadFaucetDetails()
      await loadTransactionHistory()
    } catch (error: any) {
      console.error("Error resetting all claims:", error)
      let errorMessage = error.message || "Unknown error occurred"
      
      // Handle EIP-1559 specific errors
      if (errorMessage.includes("EIP-1559") || errorMessage.includes("maxFeePerGas")) {
        errorMessage = "Network doesn't support EIP-1559 transactions. This has been automatically handled in the retry."
      }
      
      toast({
        title: "Failed to reset all claims",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsResettingClaims(false)
    }
  }

  const handleCloseAdminPopup = () => {
    if (dontShowAdminPopupAgain && faucetAddress) {
      localStorage.setItem(`dontShowAdminPopup_${faucetAddress}`, "true")
    }
    setShowAdminPopup(false)
    setDontShowAdminPopupAgain(false)
  }

  const totalPages = Math.ceil(transactions.length / transactionsPerPage)
  const startIndex = (currentPage - 1) * transactionsPerPage
  const endIndex = startIndex + transactionsPerPage
  const currentTransactions = transactions.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const getTokenName = (isEther: boolean) => {
    if (!isEther) {
      return tokenSymbol
    }
    switch (selectedNetwork?.name) {
      case "Celo":
        return "CELO"
      case "Lisk":
        return "LISK"
      case "Arbitrum":
        return "ETH"
      default:
        return "ETH"
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
                            className="hover:bg-accent hover:text-accent-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteDialog(true)}
                            title="Delete Faucet"
                            className="hover:bg-accent hover:text-accent-foreground"
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
                      <span className="text-xs sm:text-sm text-muted-foreground">Faucet Balance</span>
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
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={handleFollowAll}
                    disabled={allAccountsVerified}
                    variant={allAccountsVerified ? "secondary" : "default"}
                  >
                    {allAccountsVerified ? (
                      <>
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        All Tasks Verified ✓
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Complete Tasks to Unlock Drops
                      </>
                    )}
                  </Button>
                  <Button
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                    variant="outline"
                    onClick={handleBackendClaim}
                    disabled={isClaiming || !address || !canClaim}
                  >
                    {isClaiming
                      ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Dropping...</span>
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
                            <Button variant="outline" className="w-full flex justify-between items-center text-xs hover:bg-accent hover:text-accent-foreground">
                              {activeTab === "fund" && "Fund"}
                              {activeTab === "parameters" && "Parameters"}
                              {activeTab === "whitelist" && "Drop-list"}
                              {activeTab === "custom" && "Custom"}
                              {activeTab === "admin-power" && "Admin Power"}
                              {activeTab === "history" && "Activity Log"}
                              <Menu className="h-4 w-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-full">
                            <DropdownMenuItem onClick={() => setActiveTab("fund")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                              <Upload className="h-3 w-3 mr-2" /> Fund
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveTab("parameters")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                              <Coins className="h-3 w-3 mr-2" /> Parameters
                            </DropdownMenuItem>
                            {!backendMode && (
                              <DropdownMenuItem onClick={() => setActiveTab("whitelist")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                                <Users className="h-3 w-3 mr-2" /> Drop-list
                              </DropdownMenuItem>
                            )}
                            {!backendMode && (
                              <DropdownMenuItem onClick={() => setActiveTab("custom")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                                <FileUp className="h-3 w-3 mr-2" /> Custom
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setActiveTab("admin-power")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                              <RotateCcw className="h-3 w-3 mr-2" /> Admin Power
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveTab("history")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                              <History className="h-3 w-3 mr-2" /> Activity Log
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <TabsList className="hidden sm:grid grid-cols-6 gap-2 w-full">
                        <TabsTrigger value="fund" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                          <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Fund
                        </TabsTrigger>
                        <TabsTrigger value="parameters" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                          <Coins className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Parameters
                        </TabsTrigger>
                        {!backendMode && (
                          <TabsTrigger value="whitelist" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Drop-list
                          </TabsTrigger>
                        )}
                        {!backendMode && (
                          <TabsTrigger value="custom" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                            <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Custom
                          </TabsTrigger>
                        )}
                        <TabsTrigger value="admin-power" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Admin Power
                        </TabsTrigger>
                        <TabsTrigger value="history" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                          <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Activity Log
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
                              <Button
                                onClick={handleFund}
                                disabled={isFunding || !fundAmount}
                                className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                {isFunding ? (
                                  <span className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Funding...
                                  </span>
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    Fund
                                  </>
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Add {tokenSymbol} to the faucet (3% platform fee applies)
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
                                disabled={isWithdrawing || !withdrawAmount}
                                variant="outline"
                                className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                {isWithdrawing ? (
                                  <span className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Withdrawing...
                                  </span>
                                ) : (
                                  <>
                                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    Withdraw
                                  </>
                                )}
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
                                Start Time (<span className="text-red-600">Ensure your start time is ahead of the current time</span>)
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
                              className="text-xs sm:text-sm flex-1 hover:bg-accent hover:text-accent-foreground"
                              disabled={isUpdatingParameters || !claimAmount || !startTime || !endTime}
                            >
                              {isUpdatingParameters ? (
                                <span className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                  Updating...
                                </span>
                              ) : (
                                "Update Parameters"
                              )}
                            </Button>
                            {backendMode && (
                              <Button
                                onClick={handleRetrieveSecretCode}
                                variant="outline"
                                className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                                disabled={isRetrievingSecret}
                              >
                                {isRetrievingSecret ? (
                                  <span className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Retrieving...
                                  </span>
                                ) : (
                                  <>
                                    <Key className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    Get Current Code
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                      {!backendMode && (
                      <TabsContent value="whitelist" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs sm:text-sm">
                                {isWhitelistEnabled ? "Add to Drop-list" : "Remove from Drop-list"}
                              </Label>
                              <Switch
                                checked={isWhitelistEnabled}
                                onCheckedChange={setIsWhitelistEnabled}
                              />
                            </div>
                            <Label htmlFor="whitelist-addresses" className="text-xs sm:text-sm">
                              Addresses (one per line or comma-separated)
                            </Label>
                            <Textarea
                              id="whitelist-addresses"
                              value={whitelistAddresses}
                              onChange={(e) => setWhitelistAddresses(e.target.value)}
                              rows={5}
                              className="text-xs sm:text-sm"
                            />
                          </div>
                          <Button
                            onClick={handleUpdateWhitelist}
                            className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                            disabled={isUpdatingWhitelist}
                          >
                            {isUpdatingWhitelist ? (
                              <span className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                Updating...
                              </span>
                            ) : (
                              "Update Drop-list"
                            )}
                          </Button>
                        </div>
                      </TabsContent>
                    )}
                      {!backendMode && (
                        <TabsContent value="custom" className="space-y-4 mt-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="custom-claim-file" className="text-xs sm:text-sm">
                                Upload Custom Claim Amounts (CSV/TXT/PDF)
                              </Label>
                              <Input
                                id="custom-claim-file"
                                type="file"
                                accept=".csv,.txt,.pdf"
                                onChange={handleCustomClaimFile}
                                className="text-xs sm:text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                Upload a CSV, TXT, or PDF file with addresses and amounts. Supports formats: address,amount or address amount (one per line)
                              </p>
                            </div>
                            <Button
                              onClick={handleUploadCustomClaims}
                              disabled={isUploadingCustomClaims || !customClaimFile}
                              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              {isUploadingCustomClaims ? (
                                <span className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                  Uploading...
                                </span>
                              ) : (
                                <>
                                  <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  Upload Custom Claims
                                </>
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      )}
                      <TabsContent value="admin-power" className="space-y-4 mt-4">
<div className="space-y-4">
  <div className="space-y-2">
    <Label className="text-xs sm:text-sm">All Admins </Label>
    {adminList.length > 0 ? (
      <div className="space-y-2">
        {adminList.map((admin) => (
          <div key={admin} className="flex items-center justify-between p-2 rounded-lg">
            <span className="font-mono break-all text-xs sm:text-sm">{admin}</span>
            {admin.toLowerCase() === faucetDetails?.owner.toLowerCase() && (
              <Badge variant="secondary" className="text-xs">Owner</Badge>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs sm:text-sm text-muted-foreground">No admins found</p>
    )}
  </div>
  {isOwner && (
    <div className="space-y-2">
      <Label htmlFor="new-admin" className="text-xs sm:text-sm">
        {isAddingAdmin ? "Add Admin" : "Remove Admin"}
      </Label>
      <div className="flex gap-2">
        <Input
          id="new-admin"
          placeholder="0x..."
          value={newAdminAddress}
          onChange={(e) => {
            setNewAdminAddress(e.target.value)
            checkAdminStatus(e.target.value)
          }}
          className="text-xs sm:text-sm font-mono"
        />
        <Button
          onClick={() => setShowAddAdminDialog(true)}
          disabled={isManagingAdmin || !newAdminAddress.trim()}
          className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
        >
          {isManagingAdmin ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              {isAddingAdmin ? "Adding..." : "Removing..."}
            </span>
          ) : (
            isAddingAdmin ? "Add Admin" : "Remove Admin"
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Owner and factory owner cannot be modified through this interface.
      </p>
    </div>
  )}
  <div className="space-y-2">
    <Label className="text-xs sm:text-sm">Reset All Claims</Label>
    <p className="text-xs text-muted-foreground">
      Allow all users to claim again
    </p>
    <Button
      onClick={handleResetAllClaims}
      variant="destructive"
      className="text-xs sm:text-sm hover:bg-destructive/90 hover:text-destructive-foreground"
      disabled={isResettingClaims}
    >
      {isResettingClaims ? (
        <span className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          Resetting...
        </span>
      ) : (
        <>
          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Reset All Claims
        </>
      )}
    </Button>
  </div>
</div>
</TabsContent>
                      <TabsContent value="history" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <Label className="text-xs sm:text-sm">Activity Log</Label>
                          {transactions.length > 0 ? (
                            <>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs sm:text-sm">Type</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Initiator</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Token</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {currentTransactions.map((tx, index) => (
                                    <TableRow key={`${tx.timestamp}-${index}`}>
                                      <TableCell className="text-xs sm:text-sm capitalize">{tx.transactionType}</TableCell>
                                      <TableCell className="text-xs sm:text-sm font-mono truncate max-w-[100px] sm:max-w-[150px]">
                                        {tx.initiator}
                                      </TableCell>
                                      <TableCell className="text-xs sm:text-sm">
                                        {formatUnits(tx.amount, tokenDecimals)}
                                      </TableCell>
                                      <TableCell className="text-xs sm:text-sm">
                                        {getTokenName(tx.isEther)}
                                      </TableCell>
                                      <TableCell className="text-xs sm:text-sm">
                                        {new Date(tx.timestamp * 1000).toLocaleString()}
                                      </TableCell>
                                      </TableRow>
                                  ))}
                                    </TableBody>
                                  </Table>
                                  {totalPages > 1 && (
                                    <Pagination>
                                      <PaginationContent>
                                        <PaginationItem>
                                          <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              handlePageChange(currentPage - 1)
                                            }}
                                            className={`text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground ${
                                              currentPage === 1 ? "pointer-events-none opacity-50" : ""
                                            }`}
                                          />
                                        </PaginationItem>
                                        {[...Array(totalPages)].map((_, i) => (
                                          <PaginationItem key={i + 1}>
                                            <PaginationLink
                                              href="#"
                                              onClick={(e) => {
                                                e.preventDefault()
                                                handlePageChange(i + 1)
                                              }}
                                              isActive={currentPage === i + 1}
                                              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                                            >
                                              {i + 1}
                                            </PaginationLink>
                                          </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                          <PaginationNext
                                            href="#"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              handlePageChange(currentPage + 1)
                                            }}
                                            className={`text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground ${
                                              currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                                            }`}
                                          />
                                        </PaginationItem>
                                      </PaginationContent>
                                    </Pagination>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground">No transactions found</p>
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
                    <Button
                      className="mt-4 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => router.push("/")}
                    >
                      Return to Home
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          {/* Task Verification Dialog - Simplified Version */}
          <Dialog open={showFollowDialog} onOpenChange={setShowFollowDialog}>
            <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Complete Required Tasks</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Complete these tasks and provide your usernames to unlock token claims.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {REQUIRED_FOLLOWS.map((account) => (
                  <div key={account.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{account.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.handle}</p>
                          <a 
                            href={account.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Visit {account.platform === 'x' ? 'X (Twitter)' : 'Telegram'}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {verificationStates[account.id] ? (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {!verificationStates[account.id] && (
                      <div className="space-y-2">
                        <Label htmlFor={`username-${account.id}`} className="text-xs">
                          Enter your {account.platform === 'x' ? 'X (Twitter)' : 'Telegram'} username:
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`username-${account.id}`}
                            placeholder={account.platform === 'x' ? 'username (without @)' : 'username (without @)'}
                            value={usernames[account.id] || ''}
                            onChange={(e) => setUsernames(prev => ({
                              ...prev,
                              [account.id]: e.target.value
                            }))}
                            className="text-xs pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Visit the link above to {getActionText(account.platform).toLowerCase()} the account, then enter your username here.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
             
              <DialogFooter>
                <Button
                  onClick={handleVerifyAllTasks}
                  className="text-xs sm:text-sm w-full hover:bg-accent hover:text-accent-foreground"
                  disabled={!allUsernamesProvided || allAccountsVerified}
                >
                  {allAccountsVerified 
                    ? "All Tasks Verified - Ready to Claim!" 
                    : allUsernamesProvided
                    ? "Verify All Tasks"
                    : "VERIFY"
                  }
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Verification Progress Dialog */}
          <Dialog open={showVerificationDialog} onOpenChange={() => {}}>
            <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Verifying Tasks</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {isVerifying ? "Please wait while we verify all your tasks..." : "All tasks verified successfully!"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                {isVerifying ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Verifying your usernames...</p>
                    <p className="text-xs text-center text-muted-foreground">
                      Checking all required accounts
                    </p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full h-12 w-12 bg-green-500 flex items-center justify-center">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-sm text-green-600 font-medium">All Tasks Verified!</p>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Rest of the existing dialogs */}
          <Dialog open={showClaimPopup} onOpenChange={setShowClaimPopup}>
            <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Drop Successful!</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  You have successfully received a drop of{" "}
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
                  className="flex items-center gap-2 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
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
                  <p>Platform fee (3%): {fee} {tokenSymbol}</p>
                  <p>Net amount to faucet: {netAmount} {tokenSymbol}</p>
                  <p className="text-blue-600">
                    Tip: To fund exactly {fundAmount} {tokenSymbol}, enter {recommendedInput} {tokenSymbol}
                  </p>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFundPopup(false)}
                  className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmFund}
                  className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                  disabled={isFunding}
                >
                  {isFunding ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Confirming...
                    </span>
                  ) : (
                    "Confirm Fund"
                  )}
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
                <Button
                  onClick={() => handleCopySecretCode(generatedSecretCode)}
                  className="text-xs sm:text-sm w-full hover:bg-accent hover:text-accent-foreground"
                >
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Copy Code
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
                    {secretCode}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Share this code with users to allow them to drop tokens from your faucet.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => handleCopySecretCode(secretCode)}
                  className="text-xs sm:text-sm w-full hover:bg-accent hover:text-accent-foreground"
                >
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Copy Code
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
                  <Label htmlFor="new-faucet-name" className="text-xs sm:text-sm">
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
                <Button
                  variant="outline"
                  onClick={() => setShowEditNameDialog(false)}
                  className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateFaucetName}
                  className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                  disabled={isUpdatingName || !newFaucetName.trim()}
                >
                  {isUpdatingName ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Updating...
                    </span>
                  ) : (
                    "Update Name"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Delete Faucet</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Are you sure you want to delete this faucet? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteFaucet}
                  className="text-xs sm:text-sm hover:bg-destructive/90 hover:text-destructive-foreground"
                  disabled={isDeletingFaucet}
                >
                  {isDeletingFaucet ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Deleting...
                    </span>
                  ) : (
                    "Delete Faucet"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
            <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">{isAddingAdmin ? "Add Admin" : "Remove Admin"}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {isAddingAdmin
                    ? "Enter the address to grant admin privileges."
                    : "Enter the address to revoke admin privileges."}
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
                    onChange={(e) => {
                      setNewAdminAddress(e.target.value)
                      checkAdminStatus(e.target.value)
                    }}
                    placeholder="0x..."
                    className="text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddAdminDialog(false)}
                  className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManageAdmin}
                  className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                  disabled={isManagingAdmin || !newAdminAddress.trim()}
                >
                  {isManagingAdmin ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      {isAddingAdmin ? "Adding..." : "Removing..."}
                    </span>
                  ) : (
                    isAddingAdmin ? "Add Admin" : "Remove Admin"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAdminPopup} onOpenChange={setShowAdminPopup}>
            <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Admin Controls Guide</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Learn how to manage your faucet as an admin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h3 className="text-sm sm:text-base font-semibold">Admin Privileges</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    As an admin, you can perform the following actions on this faucet:
                  </p>
                  <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground">
                    <li><strong>Fund:</strong> Add tokens to the faucet to enable claims.</li>
                    <li><strong>Withdraw:</strong> Retrieve tokens from the faucet.</li>
                    <li><strong>Parameters:</strong> Set claim amount, start/end times, and retrieve drop codes (for Auto mode).</li>
                    {backendMode ? null : (
                      <>
                        <li><strong>Drop-list:</strong> Add or remove addresses for restricted claims in Manual mode.</li>
                        <li><strong>Custom:</strong> Upload a CSV to set specific claim amounts for addresses in Manual mode.</li>
                      </>
                    )}
                    <li><strong>Admin Power:</strong> Add or remove other admins and reset all claims to allow users to claim again.</li>
                    <li><strong>Activity Log:</strong> View the faucet's transaction history.</li>
                    {isOwner && (
                      <>
                        <li><strong>Edit Name:</strong> Change the faucet's display name.</li>
                        <li><strong>Delete Faucet:</strong> Permanently remove the faucet (irreversible).</li>
                      </>
                    )}
                  </ul>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Use the tabs in the Admin Controls section to access these features. Ensure your wallet is connected to the correct network ({selectedNetwork?.name || "Unknown Network"}) to perform these actions.
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dont-show-again"
                    checked={dontShowAdminPopupAgain}
                    onCheckedChange={(checked) => setDontShowAdminPopupAgain(checked === true)}
                  />
                  <Label htmlFor="dont-show-again" className="text-xs sm:text-sm">
                    Don't show this again for this faucet
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCloseAdminPopup}
                  className="text-xs sm:text-sm w-full hover:bg-accent hover:text-accent-foreground"
                >
                  Got It
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      )
    }
