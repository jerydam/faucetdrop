"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
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
    updateFaucetName,
    deleteFaucet,
    addAdmin,
    removeAdmin,
    getFaucetTransactionHistory,
    detectFaucetType,
} from "@/lib/faucet"
import { formatUnits, parseUnits, type BrowserProvider, JsonRpcProvider, Contract } from "ethers"
import { Checkbox } from "@/components/ui/checkbox"
import { claimViaBackend, claimNoCodeViaBackend, claimCustomViaBackend } from "@/lib/backend-service"
import { useNetwork } from "@/hooks/use-network"
import LoadingPage from "@/components/loading"
import FaucetAdminView from "@/components/faucetView/FaucetAdminView"
import FaucetUserView from "@/components/faucetView/FaucetUserView"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

// --- Constants & Types ---
type FaucetType = 'dropcode' | 'droplist' | 'custom'

interface SocialMediaLink {
    platform: string;
    url: string;
    handle: string;
    action: string;
}

const DEFAULT_FAUCET_IMAGE = "/default.jpeg";
const FACTORY_OWNER_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"
const BACKEND_URL = "https://faucetdrop-backend.onrender.com";
const FIXED_TWEET_PREFIX = "I just dripped {amount} {token} from @FaucetDrops on {network}.";

// --- Helper Functions ---

const getDefaultFaucetDescription = (networkName: string, ownerAddress: string): string => {
    return `This is a faucet on ${networkName} by ${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`
}

const getNativeTokenSymbol = (networkName: string): string => {
    switch (networkName) {
        case "Celo": return "CELO"
        case "Lisk": return "ETH"
        case "Arbitrum": case "Base": case "Ethereum": return "ETH"
        case "Polygon": return "MATIC"
        case "Optimism": return "ETH"
        default: return "ETH"
    }
}

// --- Main Component ---
export default function FaucetDetails() {
    const { slug } = useParams<{ slug: string }>()
    const router = useRouter()
    const { address, chainId, isConnected, provider } = useWallet()
    const { networks } = useNetwork()
    
    // --- Resolution States ---
    const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
    const [resolvedChainId, setResolvedChainId] = useState<number | null>(null)
    const [selectedNetwork, setSelectedNetwork] = useState<any>(null)

    // --- Main State ---
    const [faucetDetails, setFaucetDetails] = useState<any>(null)
    const [faucetType, setFaucetType] = useState<FaucetType | null>(null)
    const [loading, setLoading] = useState(true)
    
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
    const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false)

    // --- Admin-Specific State ---
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
    const [newSocialLinks, setNewSocialLinks] = useState<SocialMediaLink[]>([])
    const [claimAmount, setClaimAmount] = useState("0")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")

    // --- Dialog States ---
    const [showFollowDialog, setShowFollowDialog] = useState(false)
    const [showVerificationDialog, setShowVerificationDialog] = useState(false)
    const [showClaimPopup, setShowClaimPopup] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)

    // --- Core Logic: Slug Resolution ---
    const resolveSlugData = useCallback(async (faucetSlug: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/faucets/by-slug/${faucetSlug}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Resolution error:", error);
            return null;
        }
    }, []);

    // --- Core Data Loader ---
    const loadFaucetDetails = useCallback(async (): Promise<void> => {
        if (!slug) return;
        setLoading(true);

        try {
            const resolution = await resolveSlugData(slug);
            if (!resolution || !resolution.success) {
                toast.error("Faucet not found or invalid slug");
                router.push("/");
                return;
            }

            const contractAddr = resolution.faucetAddress;
            const targetChainId = resolution.chainId;
            setResolvedAddress(contractAddr);
            setResolvedChainId(targetChainId);

            const targetNetwork = networks.find((n) => n.chainId === targetChainId);
            if (!targetNetwork) {
                toast.error("Network configuration missing");
                return;
            }
            setSelectedNetwork(targetNetwork);

            const detailsProvider = new JsonRpcProvider(targetNetwork.rpcUrl);
            const type = await detectFaucetType(detailsProvider, contractAddr);
            setFaucetType(type);

            const details = await getFaucetDetails(detailsProvider, contractAddr, type);
            if (!details || details.error) throw new Error("On-chain details missing");
            setFaucetDetails(details);

            // Token Info Resolution
            let resolvedSymbol = details.tokenSymbol;
            const isNative = details.token === "0x0000000000000000000000000000000000000000";
            if (isNative || !resolvedSymbol || resolvedSymbol === "TOKEN") {
                resolvedSymbol = getNativeTokenSymbol(targetNetwork.name);
            }
            setTokenSymbol(resolvedSymbol);
            setTokenDecimals(details.tokenDecimals || 18);
            setBackendMode(details.backendMode || false);

            // Load External Data (Tasks, Meta, Prefs)
            const [tasksRes, metaRes, prefRes] = await Promise.all([
                fetch(`${BACKEND_URL}/faucet-tasks/${contractAddr}`),
                fetch(`${BACKEND_URL}/faucet-metadata/${contractAddr}`),
                address ? fetch(`${BACKEND_URL}/admin-popup-preference?userAddress=${address}&faucetAddress=${contractAddr}`) : null
            ]);

            if (tasksRes.ok) {
                const taskData = await tasksRes.json();
                setDynamicTasks(taskData.tasks || []);
            }
            
            if (metaRes.ok) {
                const metaData = await metaRes.json();
                setFaucetMetadata({
                    description: metaData.description || getDefaultFaucetDescription(targetNetwork.name, details.owner),
                    imageUrl: metaData.imageUrl || DEFAULT_FAUCET_IMAGE
                });
            } else {
                setFaucetMetadata({ description: getDefaultFaucetDescription(targetNetwork.name, details.owner), imageUrl: DEFAULT_FAUCET_IMAGE });
            }

            setCustomXPostTemplate(`Drip created by {@handle} for {#hashtag}, Verify Drop 💧: {explorer}`);

            // User Permissions
            if (address) {
                const { FAUCET_ABI_DROPCODE, FAUCET_ABI_DROPLIST, FAUCET_ABI_CUSTOM } = await import("@/lib/abis");
                let abi = type === 'dropcode' ? FAUCET_ABI_DROPCODE : type === 'droplist' ? FAUCET_ABI_DROPLIST : FAUCET_ABI_CUSTOM;
                const contract = new Contract(contractAddr, abi, detailsProvider);
                
                const isAdmin = (address.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()) || await contract.isAdmin(address);
                setUserIsAdmin(isAdmin);
                setHasClaimed(details.hasClaimed || false);

                if (type === 'droplist') setUserIsWhitelisted(await contract.isWhitelisted(address));
                if (type === 'custom') {
                    const hasC = await contract.hasCustomClaimAmount(address);
                    setHasCustomAmount(hasC);
                    if (hasC) setUserCustomClaimAmount(await contract.getCustomClaimAmount(address));
                }

                if ((isAdmin || address.toLowerCase() === details.owner.toLowerCase()) && prefRes?.ok) {
                    const pref = await prefRes.json();
                    if (!pref.dontShowAgain) setShowAdminPopup(true);
                } else if (isAdmin || address.toLowerCase() === details.owner.toLowerCase()) {
                    setShowAdminPopup(true);
                }
            }

            const admins = await getAllAdmins(detailsProvider, contractAddr, type);
            const allAdmins = [...admins];
            if (details.owner && !allAdmins.some(a => a.toLowerCase() === details.owner.toLowerCase())) allAdmins.unshift(details.owner);
            if (!allAdmins.some(a => a.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase())) allAdmins.push(FACTORY_OWNER_ADDRESS);
            setAdminList(allAdmins);

            if (details.claimAmount) setClaimAmount(formatUnits(details.claimAmount, details.tokenDecimals || 18));
            if (details.startTime) setStartTime(new Date(Number(details.startTime) * 1000).toISOString().slice(0, 16));
            if (details.endTime) setEndTime(new Date(Number(details.endTime) * 1000).toISOString().slice(0, 16));

        } catch (error: any) {
            toast.error(error.message || "Error loading faucet details");
        } finally {
            setLoading(false);
        }
    }, [slug, networks, address, router, resolveSlugData]);

    useEffect(() => {
        loadFaucetDetails();
    }, [loadFaucetDetails]);

    // --- Action Logic ---

    const checkNetwork = useCallback((skipToast = false): boolean => {
        if (!chainId || !resolvedChainId) {
            if (!skipToast) toast.error("Connect wallet");
            return false;
        }
        if (chainId !== resolvedChainId) {
            if (!skipToast) toast.error(`Switch network to ${selectedNetwork?.name}`);
            return false;
        }
        return true;
    }, [chainId, resolvedChainId, selectedNetwork]);

    const handleVerifyAllTasks = async (): Promise<void> => {
        const allHandles = dynamicTasks.every(t => usernames[t.platform]?.trim().length > 0);
        if (!allHandles) {
            toast.error("Please fill in all social handles.");
            return;
        }
        setIsVerifying(true);
        setShowVerificationDialog(true);
        
        setTimeout(() => {
            if (!hasAttemptedVerification) {
                setIsVerifying(false);
                setShowVerificationDialog(false);
                setHasAttemptedVerification(true);
                toast.error("Verification Failed", { description: "Task completion not detected. Please ensure you performed the tasks." });
            } else {
                const verified: Record<string, boolean> = {};
                dynamicTasks.forEach(t => verified[t.platform] = true);
                setVerificationStates(verified);
                setIsVerifying(false);
                toast.success("Tasks verified!");
                setTimeout(() => {
                    setShowVerificationDialog(false);
                    setShowFollowDialog(false);
                }, 1500);
            }
        }, 3000);
    };

    const handleBackendClaim = async () => {
        if (!isConnected || !address || !resolvedAddress) return;
        if (!checkNetwork()) return;

        const isDropcodeInvalid = faucetType === 'dropcode' && backendMode && (!secretCode || secretCode.length !== 6);
        if (isDropcodeInvalid) { toast.error("Enter valid 6-character code"); return; }
        if (!dynamicTasks.every(t => verificationStates[t.platform])) { toast.error("Complete tasks first"); return; }

        try {
            setIsVerifying(true);
            let result;
            const bProvider = provider as any;
            if (faucetType === 'custom') result = await claimCustomViaBackend(address, resolvedAddress, bProvider);
            else if (faucetType === 'dropcode' && backendMode) result = await claimViaBackend(address, resolvedAddress, bProvider, secretCode);
            else result = await claimNoCodeViaBackend(address, resolvedAddress, bProvider);

            setTxHash(result.txHash);
            const amountStr = faucetType === 'custom' ? formatUnits(userCustomClaimAmount, tokenDecimals) : claimAmount;
            toast.success("Tokens dripped!", { description: `You received ${amountStr} ${tokenSymbol}.` });
            setShowClaimPopup(true);
            setSecretCode("");
            loadFaucetDetails();
        } catch (error: any) {
            toast.error("Claim failed", { description: error.message });
        } finally {
            setIsVerifying(false);
        }
    };

    const generateXPostContent = (amount: string): string => {
        let content = `${FIXED_TWEET_PREFIX} ${customXPostTemplate}`;
        content = content.replace(/\{amount\}/g, amount)
                        .replace(/\{token\}/g, tokenSymbol)
                        .replace(/\{network\}/g, selectedNetwork?.name || "the network")
                        .replace(/\{explorer\}/g, txHash ? `${selectedNetwork?.blockExplorerUrls}/tx/${txHash}` : "Explorer");
        return content;
    };

    const handleCloseAdminPopup = async () => {
        if (dontShowAdminPopupAgain && address && resolvedAddress) {
            await fetch(`${BACKEND_URL}/admin-popup-preference`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userAddress: address, faucetAddress: resolvedAddress, dontShowAgain: true }),
            });
        }
        setShowAdminPopup(false);
    };

    if (loading) return <LoadingPage />;
    if (!faucetDetails) return <div className="p-20 text-center"><p>Faucet not found</p><Button onClick={() => router.push("/")}>Home</Button></div>;

    const isOwner = address && faucetDetails.owner && address.toLowerCase() === faucetDetails.owner.toLowerCase();
    const canAccessAdmin = isOwner || userIsAdmin;

    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                    <Header pageTitle="Faucet Details" />

                    {canAccessAdmin ? (
                        <FaucetAdminView 
                            faucetAddress={resolvedAddress!}
                            faucetDetails={faucetDetails}
                            faucetType={faucetType}
                            tokenSymbol={tokenSymbol}
                            tokenDecimals={tokenDecimals}
                            selectedNetwork={selectedNetwork}
                            adminList={adminList}
                            isOwner={isOwner}
                            backendMode={backendMode}
                            canAccessAdminControls={true}
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
                            handleGoBack={() => router.back()}
                            router={router}
                            faucetMetadata={faucetMetadata}
                        />
                    ) : (
                        <FaucetUserView 
                            faucetAddress={resolvedAddress!}
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
                            allAccountsVerified={Object.keys(verificationStates).length === dynamicTasks.length && dynamicTasks.length > 0}
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
                            handleFollowAll={() => setShowFollowDialog(true)}
                            generateXPostContent={generateXPostContent}
                            txHash={txHash}
                            showFollowDialog={showFollowDialog}
                            setShowFollowDialog={setShowFollowDialog}
                            showVerificationDialog={showVerificationDialog}
                            setShowVerificationDialog={setShowVerificationDialog}
                            showClaimPopup={showClaimPopup}
                            setShowClaimPopup={setShowClaimPopup}
                            handleVerifyAllTasks={handleVerifyAllTasks}
                            handleGoBack={() => router.back()}
                        />
                    )}
                </div>
            </div>

            {/* Admin Popup */}
            <Dialog open={showAdminPopup} onOpenChange={setShowAdminPopup}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Admin Dashboard</DialogTitle>
                        <DialogDescription>Manage your {faucetType} faucet.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <ul className="list-disc pl-5 text-sm">
                            <li>Distribute tokens via {faucetType === 'dropcode' ? 'Codes' : 'Whitelist'}.</li>
                            <li>Monitor faucet balance and activity.</li>
                            <li>Customize social media tasks.</li>
                        </ul>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="popup-pref" checked={dontShowAdminPopupAgain} onCheckedChange={(c) => setDontShowAdminPopupAgain(!!c)} />
                            <Label htmlFor="popup-pref">Don't show this again</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCloseAdminPopup} className="w-full">Enter Dashboard</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}