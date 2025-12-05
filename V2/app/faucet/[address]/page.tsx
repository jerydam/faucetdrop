"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Header } from "@/components/header"
import {
  getFaucetDetails,
  isWhitelisted,
  getAllAdmins,
  // Imported lib functions kept here for consistency
  setWhitelistBatch,
  setCustomClaimAmountsBatch,
  resetAllClaims,
  fundFaucet,
  withdrawTokens,
  setClaimParameters,
  saveToStorage,
  getFromStorage,
  updateFaucetName,
  deleteFaucet,
  addAdmin,
  removeAdmin,
  getFaucetTransactionHistory,
} from "@/lib/faucet"
import { formatUnits, parseUnits, type BrowserProvider, JsonRpcProvider } from "ethers"
import { Clock, Coins, Download, Share2, Upload, Users, Key, RotateCcw, Edit, Trash2, FileUp, Menu, History, Copy, ExternalLink, Check, AlertCircle, User, ArrowLeft, Link } from "lucide-react"
import { claimViaBackend, claimNoCodeViaBackend, claimCustomViaBackend, retrieveSecretCode } from "@/lib/backend-service"
import { useNetwork } from "@/hooks/use-network"
import LoadingPage from "@/components/loading"
import FaucetAdminView from "@/components/faucetView/FaucetAdminView" // NEW
import FaucetUserView from "@/components/faucetView/FaucetUserView"   // NEW
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

// Faucet type definitions
type FaucetType = 'dropcode' | 'droplist' | 'custom'

interface SocialMediaLink {
  platform: string;
  url: string;
  handle: string;
  action: string;
}

// Default faucet metadata constants
const DEFAULT_FAUCET_IMAGE = "/default.jpeg";
const FACTORY_OWNER_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"

// --- Helper Functions (Replicated from original code) ---

const getDefaultFaucetDescription = (networkName: string, ownerAddress: string): string => {
  return `This is a faucet on ${networkName} by ${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`
}

const getNativeTokenSymbol = (networkName: string): string => {
  switch (networkName) {
    case "Celo": return "CELO"
    case "Lisk": return "LISK"
    case "Arbitrum": case "Base": case "Ethereum": return "ETH"
    case "Polygon": return "MATIC"
    case "Optimism": return "ETH"
    default: return "ETH"
  }
}

const checkIsAdmin = async (provider: any, faucetAddress: string, userAddress: string, type: FaucetType): Promise<boolean> => {
  if (userAddress.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()) {
    return true
  }
  try {
    const { Contract } = await import("ethers")
    let abi: any[]
    if (type === 'dropcode') { const { FAUCET_ABI_DROPCODE } = await import("@/lib/abis"); abi = FAUCET_ABI_DROPCODE } 
    else if (type === 'droplist') { const { FAUCET_ABI_DROPLIST } = await import("@/lib/abis"); abi = FAUCET_ABI_DROPLIST } 
    else if (type === 'custom') { const { FAUCET_ABI_CUSTOM } = await import("@/lib/abis"); abi = FAUCET_ABI_CUSTOM } 
    else { return false }
    const contract = new Contract(faucetAddress, abi, provider)
    const isContractAdmin = await contract.isAdmin(userAddress)
    return isContractAdmin
  } catch (error) {
    console.warn("Error checking admin status:", error)
    return false
  }
}

const detectFaucetType = async (provider: any, address: string): Promise<FaucetType> => {
  try {
    const { Contract } = await import("ethers")
    const basicABI = [{ "inputs": [], "name": "faucetType", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }]
    const contract = new Contract(address, basicABI, provider)
    const contractType = (await contract.faucetType()).toLowerCase()
    return (contractType === 'dropcode' || contractType === 'droplist' || contractType === 'custom') ? contractType : 'dropcode'
  } catch (error) {
    console.error("Error getting faucet type from contract, defaulting:", error)
    return 'dropcode' 
  }
}

const getUserCustomClaimAmount = async (provider: any, userAddress: string, faucetAddress: string, tokenDecimals: number): Promise<{ amount: bigint, hasCustom: boolean }> => {
  try {
    const { FAUCET_ABI_CUSTOM } = await import("@/lib/abis")
    const { Contract } = await import("ethers")
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI_CUSTOM, provider)
    
    // Simulate check
    const isOwnerOrAdmin = await checkIsAdmin(provider, faucetAddress, userAddress, 'custom');
    if (isOwnerOrAdmin) {
      // Simulate an admin/owner having a default allocation if custom is not set
      // In a production system, this would be a true contract call
      return { amount: BigInt(0), hasCustom: false } 
    }
    
    const hasCustom = await faucetContract.hasCustomClaimAmount(userAddress)
    if (hasCustom) {
      const customAmount = await faucetContract.getCustomClaimAmount(userAddress)
      return { amount: customAmount, hasCustom: true }
    }
    return { amount: BigInt(0), hasCustom: false }
  } catch {
    return { amount: BigInt(0), hasCustom: false }
  }
}

const loadSocialMediaLinks = async (faucetAddress: string): Promise<SocialMediaLink[]> => {
  // Simulate API call result
  if (faucetAddress === "0x1234567890123456789012345678901234567890") {
    return []
  }
  return [
    { platform: '𝕏', url: 'https://x.com/FaucetDrops', handle: '@FaucetDrops', action: 'follow' },
    { platform: 'telegram', url: 'https://t.me/faucetdrop', handle: 'faucetdropchannel', action: 'join' },
  ]
}

const loadCustomXPostTemplate = async (faucetAddress: string): Promise<string> => {
  // Simulate fetching a template
  return `I just dripped {amount} {token} from @FaucetDrops on {network}. Verify Drop 💧: {explorer}`
}

const saveAdminPopupPreference = async (userAddr: string, faucetAddr: string, dontShow: boolean): Promise<boolean> => {
    // Simulate saving preference to backend
    return true
}

const getAdminPopupPreference = async (userAddr: string, faucetAddr: string): Promise<boolean> => {
    // Simulate checking preference from backend
    return false
}

// --- Main Component ---
export default function FaucetDetails() {
  const { address: faucetAddress } = useParams<{ address: string }>()
  const searchParams = useSearchParams()
  const networkId = searchParams.get("networkId")
  const { toast } = useToast()
  const router = useRouter() // <--- Initialized here, at the top level of the client component
  const { address, chainId, isConnected, provider } = useWallet()
  const { networks, setNetwork } = useNetwork()
  
  // --- Main State ---
  const [faucetDetails, setFaucetDetails] = useState<any>(null)
  const [faucetType, setFaucetType] = useState<FaucetType | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null)
  
  // --- User-Specific State ---
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [hasClaimed, setHasClaimed] = useState(false)
  const [userIsWhitelisted, setUserIsWhitelisted] = useState(false)
  const [userCustomClaimAmount, setUserCustomClaimAmount] = useState<bigint>(BigInt(0))
  const [hasCustomAmount, setHasCustomAmount] = useState(false)
  const [secretCode, setSecretCode] = useState("")
  const [usernames, setUsernames] = useState<Record<string, string>>({})
  const [verificationStates, setVerificationStates] = useState<Record<string, boolean>>({})
  const [isVerifying, setIsVerifying] = useState(false)
  const [showFollowDialog, setShowFollowDialog] = useState(false)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [showClaimPopup, setShowClaimPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  
  // --- Admin-Specific State (Passed down) ---
  const [adminList, setAdminList] = useState<string[]>([])
  const [backendMode, setBackendMode] = useState(true)
  const [tokenSymbol, setTokenSymbol] = useState("ETH")
  const [tokenDecimals, setTokenDecimals] = useState(18)
  const [faucetMetadata, setFaucetMetadata] = useState<{description?: string, imageUrl?: string}>({})
  const [customXPostTemplate, setCustomXPostTemplate] = useState("")
  const [dynamicTasks, setDynamicTasks] = useState<SocialMediaLink[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAdminPopup, setShowAdminPopup] = useState(false)
  const [dontShowAdminPopupAgain, setDontShowAdminPopupAgain] = useState(false)
  const [startCountdown, setStartCountdown] = useState<string | null>(null)
  const [endCountdown, setEndCountdown] = useState<string>("")
  const [newSocialLinks, setNewSocialLinks] = useState<SocialMediaLink[]>([])


  // --- Derived State (Cached for efficiency) ---
  const isOwner = address && faucetDetails?.owner && address.toLowerCase() === faucetDetails.owner.toLowerCase()
  const isBackendAddress = address && address.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()
  const canAccessAdminControls = isOwner || userIsAdmin || isBackendAddress
  
  const allAccountsVerified = dynamicTasks.length === 0 ? true : dynamicTasks.every(task => verificationStates[task.platform])
  const isSecretCodeValid = secretCode.length === 6 && /^[A-Z0-9]{6}$/.test(secretCode)

  // --- Network Helper (Shared) ---
  const checkNetwork = useCallback((skipToast = false): boolean => {
    if (!chainId) {
      if (!skipToast) toast({ title: "Network not detected", description: "Please ensure your wallet is connected.", variant: "destructive" });
      return false
    }
    if (networkId && Number(networkId) !== chainId) {
      const targetNetwork = networks.find((n) => n.chainId === Number(networkId))
      if (targetNetwork) {
        if (!skipToast) toast({ title: "Wrong Network", description: "Switch to the network to perform operation", variant: "destructive", action: (<Button onClick={() => setNetwork(targetNetwork)} variant="outline">Switch to {targetNetwork.name}</Button>), });
        return false
      }
    }
    return true
  }, [chainId, networkId, networks, setNetwork, toast])
  
  // --- Navigation Handler (Fix for useRouter) ---
  const handleGoBack = useCallback((): void => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }, [router])


  // --- Core Data Loader (Kept in Parent) ---
  const loadFaucetDetails = useCallback(async (): Promise<void> => {
    if (!faucetAddress || !networkId) { setLoading(false); return }
    try {
      setLoading(true)
      const targetNetworkId = Number(networkId)
      const targetNetwork = networks.find((n) => n.chainId === targetNetworkId)
      if (!targetNetwork) { router.push("/"); return }
      
      setSelectedNetwork(targetNetwork)
      const detailsProvider = new JsonRpcProvider(targetNetwork.rpcUrl)
      
      const detectedType = await detectFaucetType(detailsProvider, faucetAddress)
      setFaucetType(detectedType)
      
      const details = await getFaucetDetails(detailsProvider, faucetAddress, detectedType)
      if (!details || details.error) { throw new Error(details?.error || "Failed to fetch faucet details") }
      setFaucetDetails(details)
      setTokenSymbol(details.tokenSymbol || getNativeTokenSymbol(targetNetwork.name))
      setTokenDecimals(details.tokenDecimals || 18)
      setBackendMode(details.backendMode || false)
      setDynamicTasks(await loadSocialMediaLinks(faucetAddress))
      setCustomXPostTemplate(await loadCustomXPostTemplate(faucetAddress))
      
      // Load Metadata
      setFaucetMetadata({ 
          description: getDefaultFaucetDescription(targetNetwork.name, details.owner),
          imageUrl: DEFAULT_FAUCET_IMAGE
      })

      if (address) {
        setHasClaimed(details.hasClaimed || false)
        if (detectedType === 'droplist') {
          const whitelisted = await isWhitelisted(detailsProvider, faucetAddress, address, detectedType)
          setUserIsWhitelisted(whitelisted)
        }
        if (detectedType === 'custom') {
          const customClaimInfo = await getUserCustomClaimAmount(detailsProvider, address, faucetAddress, details.tokenDecimals || 18)
          setUserCustomClaimAmount(customClaimInfo.amount)
          setHasCustomAmount(customClaimInfo.hasCustom)
        }
        const adminStatus = await checkIsAdmin(detailsProvider, faucetAddress, address, detectedType)
        setUserIsAdmin(adminStatus)
        
        if (adminStatus || isOwner) {
            const dontShow = await getAdminPopupPreference(address, faucetAddress)
            if (!dontShow) setShowAdminPopup(true)
        }
      }
      
      const admins = await getAllAdmins(detailsProvider, faucetAddress, detectedType)
      const allAdmins = [...admins]
      if (details.owner && !allAdmins.some(a => a.toLowerCase() === details.owner.toLowerCase())) { allAdmins.unshift(details.owner) }
      if (!allAdmins.some(a => a.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase())) { allAdmins.push(FACTORY_OWNER_ADDRESS) }
      setAdminList(allAdmins)

    } catch (error: any) {
      toast({ title: "Failed to load faucet details", description: error.message || "Unknown error occurred", variant: "destructive", })
    } finally {
      setLoading(false)
    }
  }, [faucetAddress, networkId, networks, router, toast, address, isOwner])

  // --- Effects (Kept in Parent) ---
  useEffect(() => {
    if (faucetAddress && networkId) loadFaucetDetails()
  }, [faucetAddress, networkId, loadFaucetDetails])

  // --- Shared Handlers for User View ---
  const handleFollowAll = (): void => {
    if (dynamicTasks.length === 0) {
      toast({ title: "No Tasks", description: "This faucet does not require social media verification.", variant: "default" })
      return
    }
    setShowFollowDialog(true)
  }

  const handleVerifyAllTasks = async (): Promise<void> => {
    const allUsernamesProvided = dynamicTasks.every(task => usernames[task.platform] && usernames[task.platform].trim().length > 0)
    if (!allUsernamesProvided) {
      toast({ title: "Missing Information", description: "Please enter usernames for all required tasks.", variant: "destructive", })
      return
    }

    setIsVerifying(true)
    setShowVerificationDialog(true)

    // Simulate verification process (3 seconds delay)
    setTimeout(() => {
      const newVerificationStates: Record<string, boolean> = {}
      dynamicTasks.forEach(task => { newVerificationStates[task.platform] = true })
      setVerificationStates(newVerificationStates)
      setIsVerifying(false)
      toast({ title: "All Tasks Verified", description: "All required tasks have been verified successfully!", })
      setTimeout(() => {
        setShowVerificationDialog(false)
        setShowFollowDialog(false)
      }, 2000)
    }, 3000)
  }
  
  const generateXPostContent = (amount: string): string => {
    let content = customXPostTemplate
    content = content.replace(/\{amount\}/g, amount)
    content = content.replace(/\{token\}/g, tokenSymbol)
    content = content.replace(/\{network\}/g, selectedNetwork?.name || "the network")
    content = content.replace(/\{faucet\}/g, faucetDetails?.name || "this faucet")
    content = content.replace(/\{explorer\}/g, txHash ? `${selectedNetwork?.blockExplorerUrls || "https://explorer.unknown"}/tx/${txHash}` : "Transaction not available")
    return content
  }

  async function handleBackendClaim(): Promise<void> {
    if (!isConnected || !address || !faucetDetails) { toast({ title: "Wallet not connected", description: "Please connect your wallet.", variant: "destructive", }); return; }
    if (!checkNetwork()) return;

    // Validation
    if (faucetType === 'dropcode' && backendMode && !isSecretCodeValid) { toast({ title: "Invalid Drop code", description: "Please enter a valid 6-character alphanumeric Drop code", variant: "destructive", }); return; }
    if (faucetType === 'droplist' && !userIsWhitelisted) { toast({ title: "Not Drop-listed", description: "You are not Drop-listed to claim.", variant: "destructive", }); return; }
    if (faucetType === 'custom' && !hasCustomAmount) { toast({ title: "No Custom Allocation", description: "You don't have a custom amount allocated.", variant: "destructive", }); return; }
    if (!allAccountsVerified) { toast({ title: "Verification Required", description: "Please complete and verify all required tasks before claiming", variant: "destructive", }); return; }

    try {
      setIsVerifying(true);
      let result;
      
      const providerForClaim = provider as BrowserProvider;
      
      if (faucetType === 'custom') {
        result = await claimCustomViaBackend(address, faucetAddress, providerForClaim)
      } else if (faucetType === 'dropcode' && backendMode) {
        result = await claimViaBackend(address, faucetAddress, providerForClaim, secretCode)
      } else {
        result = await claimNoCodeViaBackend(address, faucetAddress, providerForClaim);
      }

      setTxHash(result.txHash);

      const claimedAmount = faucetType === 'custom' && hasCustomAmount
        ? formatUnits(userCustomClaimAmount, tokenDecimals)
        : faucetDetails.claimAmount
        ? formatUnits(faucetDetails.claimAmount, tokenDecimals)
        : "tokens";

      toast({ title: "Tokens dripped successfully", description: `You have dripped ${claimedAmount} ${tokenSymbol}.`, });
      setShowClaimPopup(true);
      setSecretCode("");
      await loadFaucetDetails();
      
    } catch (error: any) {
      console.error("Error dropping tokens:", error);
      toast({ title: "Failed to drop tokens", description: error.message || "Unknown error occurred", variant: "destructive", });
    } finally {
      setIsVerifying(false);
    }
  }

  // --- Admin Dialog Handler (Kept in Parent) ---
  const handleCloseAdminPopup = async (): Promise<void> => {
    if (dontShowAdminPopupAgain && faucetAddress && address) {
      const saved = await saveAdminPopupPreference(address, faucetAddress, true)
      if (saved) {
        toast({ title: "Preference Saved", description: "Your popup preference has been saved." })
      }
    }
    setShowAdminPopup(false)
    setDontShowAdminPopupAgain(false)
  }

  if (loading) {
    return <LoadingPage />
  }

  if (!faucetDetails) {
    return (
        <Card className="w-full mx-auto max-w-xl">
          <CardContent className="py-10 text-center">
            <p className="text-sm sm:text-base">Faucet not found or error loading details</p>
            <Button className="mt-4" onClick={() => router.push("/")}>Return to Home</Button>
          </CardContent>
        </Card>
    )
  }

  // --- MAIN RENDER LOGIC ---
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:gap-8 max-w-3xl sm:max-w-4xl mx-auto">
          <Header pageTitle="Faucet Details" />

          {/* Render Admin or User View */}
          {canAccessAdminControls ? (
            <FaucetAdminView 
                faucetAddress={faucetAddress}
                faucetDetails={faucetDetails}
                faucetType={faucetType}
                tokenSymbol={tokenSymbol}
                tokenDecimals={tokenDecimals}
                selectedNetwork={selectedNetwork}
                adminList={adminList}
                isOwner={isOwner}
                backendMode={backendMode}
                canAccessAdminControls={canAccessAdminControls}
                loadFaucetDetails={loadFaucetDetails}
                checkNetwork={checkNetwork}
                dynamicTasks={dynamicTasks}
                newSocialLinks={newSocialLinks}
                setNewSocialLinks={setNewSocialLinks}
                customXPostTemplate={customXPostTemplate}
                setCustomXPostTemplate={setCustomXPostTemplate}
                setTransactions={setTransactions}
                transactions={transactions}
                address={address}
                chainId={chainId}
                provider={provider}
                // Pass navigation handler
                handleGoBack={handleGoBack}
                router={router}
            />
          ) : (
            <FaucetUserView 
              faucetAddress={faucetAddress}
              faucetDetails={faucetDetails}
              faucetType={faucetType}
              tokenSymbol={tokenSymbol}
              tokenDecimals={tokenDecimals}
              selectedNetwork={selectedNetwork}
              address={address}
              isConnected={isConnected}
              hasClaimed={hasClaimed}
              userIsWhitelisted={userIsWhitelisted}
              hasCustomAmount={hasCustomAmount}
              userCustomClaimAmount={userCustomClaimAmount}
              dynamicTasks={dynamicTasks}
              allAccountsVerified={allAccountsVerified}
              secretCode={secretCode}
              setSecretCode={setSecretCode}
              usernames={usernames}
              setUsernames={setUsernames}
              verificationStates={verificationStates}
              setVerificationStates={setVerificationStates}
              isVerifying={isVerifying}
              faucetMetadata={faucetMetadata}
              customXPostTemplate={customXPostTemplate}
              handleBackendClaim={handleBackendClaim}
              handleFollowAll={handleFollowAll}
              generateXPostContent={generateXPostContent}
              txHash={txHash}
              // Dialog state for user
              showFollowDialog={showFollowDialog}
              setShowFollowDialog={setShowFollowDialog}
              showVerificationDialog={showVerificationDialog}
              setShowVerificationDialog={setShowVerificationDialog}
              showClaimPopup={showClaimPopup}
              setShowClaimPopup={setShowClaimPopup}
              handleVerifyAllTasks={handleVerifyAllTasks}
              // Pass navigation handler
              handleGoBack={handleGoBack}
            />
          )}
        </div>
      </div>
      
      {/* Admin Dialog - Kept in parent so it can access the main state/handlers */}
      <Dialog open={showAdminPopup} onOpenChange={setShowAdminPopup}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Admin Controls Guide</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Learn how to manage your {faucetType || 'unknown'} faucet as an admin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Simplified Admin popup content UI */}
             <p className="text-xs text-muted-foreground">This dialog appears because you are the owner or an admin. Use the Admin Controls tab below to manage the faucet.</p>
            <div className="flex items-center space-x-2">
              <Checkbox id="dont-show-again" checked={dontShowAdminPopupAgain} onCheckedChange={(checked) => setDontShowAdminPopupAgain(checked === true)} />
              <Label htmlFor="dont-show-again" className="text-xs sm:text-sm">Don't show this again for this faucet</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseAdminPopup} className="text-xs sm:text-sm w-full">Got It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}