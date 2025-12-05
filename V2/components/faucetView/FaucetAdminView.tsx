import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"
import { Upload, Coins, Users, FileUp, RotateCcw, History, Edit, Trash2, Key, Copy, Menu, Clock, ExternalLink, Download, Eye } from "lucide-react";
import { formatUnits, parseUnits, type BrowserProvider } from 'ethers';
import { useToast } from "@/hooks/use-toast";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomClaimUploader } from "@/components/customClaim"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import FaucetUserView from './FaucetUserView'; // Import the User View for simulation

// Importing necessary lib functions for admin actions
import {
    setWhitelistBatch,
    setCustomClaimAmountsBatch,
    resetAllClaims,
    fundFaucet,
    withdrawTokens,
    setClaimParameters,
    addAdmin,
    removeAdmin,
    getFaucetTransactionHistory,
    updateFaucetName,
    deleteFaucet,
} from "@/lib/faucet"
import { retrieveSecretCode } from '@/lib/backend-service';

// Assuming types are imported or defined elsewhere
type FaucetType = 'dropcode' | 'droplist' | 'custom'
const FACTORY_OWNER_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"

interface SocialMediaLink {
    platform: string;
    url: string;
    handle: string;
    action: string;
}

interface FaucetAdminViewProps {
    faucetAddress: string;
    faucetDetails: any;
    faucetType: FaucetType | null;
    tokenSymbol: string;
    tokenDecimals: number;
    selectedNetwork: any;
    adminList: string[];
    isOwner: boolean;
    backendMode: boolean;
    canAccessAdminControls: boolean;
    loadFaucetDetails: () => Promise<void>;
    checkNetwork: (skipToast?: boolean) => boolean;
    dynamicTasks: SocialMediaLink[];
    newSocialLinks: SocialMediaLink[];
    setNewSocialLinks: React.Dispatch<React.SetStateAction<SocialMediaLink[]>>;
    customXPostTemplate: string;
    setCustomXPostTemplate: React.Dispatch<React.SetStateAction<string>>;
    setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
    transactions: any[];
    address: string | null;
    chainId: number | null;
    provider: any; // BrowserProvider or JsonRpcProvider
    handleGoBack: () => void; // <-- ADDED: Router fix
    router: any; // Next Router instance (passed as prop)
}

// Helper functions (could be moved to a separate utils file)
const getActionText = (platform: string): string => {
    switch(platform.toLowerCase()) {
        case 'telegram': return 'Join'
        case 'discord': return 'Join'
        case '𝕏': case 'x': return 'Follow'
        default: return 'Follow'
    }
}
const getPlatformIcon = (platform: string): string => {
    switch(platform.toLowerCase()) {
        case 'telegram': return '📱'
        case 'discord': return '💬'
        case '𝕏': case 'x': return '𝕏'
        default: return '🔗'
    }
}
const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const FaucetAdminView: React.FC<FaucetAdminViewProps> = ({
    faucetAddress,
    faucetDetails,
    faucetType,
    tokenSymbol,
    tokenDecimals,
    selectedNetwork,
    adminList,
    isOwner,
    backendMode,
    loadFaucetDetails,
    checkNetwork,
    dynamicTasks,
    newSocialLinks,
    setNewSocialLinks,
    customXPostTemplate,
    setCustomXPostTemplate,
    transactions,
    setTransactions,
    address,
    chainId,
    provider,
    handleGoBack,
    router,
}) => {
    const { toast } = useToast();

    // --- NEW PREVIEW STATE ---
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    
    // --- Local Admin State ---
    const [activeTab, setActiveTab] = useState("fund");
    const [fundAmount, setFundAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [claimAmount, setClaimAmount] = useState(faucetDetails?.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0");
    const [isFunding, setIsFunding] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [isUpdatingParameters, setIsUpdatingParameters] = useState(false);
    const [isUpdatingWhitelist, setIsUpdatingWhitelist] = useState(false);
    const [isResettingClaims, setIsResettingClaims] = useState(false);
    const [startTime, setStartTime] = useState(faucetDetails?.startTime ? new Date(Number(faucetDetails.startTime) * 1000).toISOString().slice(0, 16) : "");
    const [endTime, setEndTime] = useState(faucetDetails?.endTime ? new Date(Number(faucetDetails.endTime) * 1000).toISOString().slice(0, 16) : "");
    const [startTimeError, setStartTimeError] = useState('');
    const [whitelistAddresses, setWhitelistAddresses] = useState("");
    const [isWhitelistEnabled, setIsWhitelistEnabled] = useState(true);
    const [showFundPopup, setShowFundPopup] = useState(false);
    const [adjustedFundAmount, setAdjustedFundAmount] = useState("");
    const [showEditNameDialog, setShowEditNameDialog] = useState(false);
    const [newFaucetName, setNewFaucetName] = useState(faucetDetails?.name || "");
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeletingFaucet, setIsDeletingFaucet] = useState(false);
    const [newAdminAddress, setNewAdminAddress] = useState("");
    const [isAddingAdmin, setIsAddingAdmin] = useState(true);
    const [isManagingAdmin, setIsManagingAdmin] = useState(false);
    const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
    const [isRetrievingSecret, setIsRetrievingSecret] = useState(false);
    const [showCurrentSecretDialog, setShowCurrentSecretDialog] = useState(false);
    const [currentSecretCode, setCurrentSecretCode] = useState("");
    const [showNewCodeDialog, setShowNewCodeDialog] = useState(false);
    const [newlyGeneratedCode, setNewlyGeneratedCode] = useState("");
    const [isGeneratingNewCode, setIsGeneratingNewCode] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // --- Derived State Helpers ---
    const shouldShowWhitelistTab = faucetType === 'droplist';
    const shouldShowCustomTab = faucetType === 'custom';
    const shouldShowSecretCodeButton = faucetType === 'dropcode' && backendMode;
    const isOwnerOrAdmin = isOwner || adminList.some(a => a.toLowerCase() === address?.toLowerCase())

    const calculateFee = (amount: string) => {
        try {
            const parsedAmount = parseUnits(amount, tokenDecimals);
            const fee = (parsedAmount * BigInt(3)) / BigInt(100);
            const netAmount = parsedAmount - fee;
            const recommendedInput = (parsedAmount * BigInt(100)) / BigInt(97);
            const recommendedInputStr = Number(formatUnits(recommendedInput, tokenDecimals)).toFixed(3);
            return { fee: formatUnits(fee, tokenDecimals), netAmount: formatUnits(netAmount, tokenDecimals), recommendedInput: recommendedInputStr };
        } catch {
            return { fee: "0", netAmount: "0", recommendedInput: "0" };
        }
    }
    const { fee, netAmount, recommendedInput } = calculateFee(fundAmount);

    const validateStartTime = (value: string): boolean => {
      if (!value) { setStartTimeError(''); return false; }
      const now = new Date();
      const selectedTime = new Date(value);
      if (selectedTime <= now) { setStartTimeError('Start time must be ahead of current time '); return false; } 
      else { setStartTimeError(''); return true; }
    };
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setStartTime(value);
      validateStartTime(value);
    };

    const loadTransactionHistory = useCallback(async () => {
        if (!selectedNetwork || !provider) return;
        try {
            const txs = await getFaucetTransactionHistory(provider as BrowserProvider, faucetAddress, selectedNetwork, faucetType || undefined);
            const sortedTxs = txs.sort((a, b) => b.timestamp - a.timestamp);
            setTransactions(sortedTxs);
        } catch (error: any) {
            console.error("Error loading Activity Log:", error);
            toast({ title: "Failed to load Activity Log", description: error.message || "Unknown error occurred", variant: "destructive", });
        }
    }, [provider, faucetAddress, selectedNetwork, faucetType, setTransactions, toast]);

    useEffect(() => {
        if (activeTab === 'history' && selectedNetwork) {
            loadTransactionHistory();
        }
    }, [activeTab, selectedNetwork, loadTransactionHistory]);

    // Update form fields when faucetDetails changes
    useEffect(() => {
        if (faucetDetails) {
            if (faucetType !== 'custom' && faucetDetails.claimAmount) {
                setClaimAmount(formatUnits(faucetDetails.claimAmount, tokenDecimals))
            }
            if (faucetDetails.startTime) {
                setStartTime(new Date(Number(faucetDetails.startTime) * 1000).toISOString().slice(0, 16))
            }
            if (faucetDetails.endTime) {
                setEndTime(new Date(Number(faucetDetails.endTime) * 1000).toISOString().slice(0, 16))
            }
        }
    }, [faucetDetails, faucetType, tokenDecimals]);
    
    // --- Admin Handlers (Refactored to Admin View) ---

    const handleUpdateFaucetName = async (): Promise<void> => {
        if (!address || !provider || !newFaucetName.trim() || !chainId || !checkNetwork()) return;
        try {
            setIsUpdatingName(true);
            await updateFaucetName(provider as BrowserProvider, faucetAddress, newFaucetName, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);
            toast({ title: "Faucet name updated", description: `Faucet name has been updated to ${newFaucetName}`, });
            setNewFaucetName("");
            setShowEditNameDialog(false);
            await loadFaucetDetails();
        } catch (error: any) {
            console.error("Error updating faucet name:", error);
            toast({ title: "Failed to update faucet name", description: error.message || "Unknown error occurred", variant: "destructive", });
        } finally {
            setIsUpdatingName(false);
        }
    }

    const handleDeleteFaucet = async (): Promise<void> => {
        if (!address || !provider || !chainId || !checkNetwork()) return;
        try {
            setIsDeletingFaucet(true);
            await deleteFaucet(provider as BrowserProvider, faucetAddress, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);
            toast({ title: "Faucet deleted", description: "Faucet has been successfully deleted", });
            setShowDeleteDialog(false);
            router.push("/"); // Use the router prop from parent
        } catch (error: any) {
            console.error("Error deleting faucet:", error);
            toast({ title: "Failed to delete faucet", description: error.message || "Unknown error occurred", variant: "destructive", });
        } finally {
            setIsDeletingFaucet(false);
        }
    }

    const handleFund = async (): Promise<void> => {
        if (!checkNetwork()) return;
        setAdjustedFundAmount(fundAmount);
        setShowFundPopup(true);
    }

    const confirmFund = async (): Promise<void> => {
        if (!address || !provider || !adjustedFundAmount || !chainId) return;
        try {
            setIsFunding(true);
            const amount = parseUnits(adjustedFundAmount, tokenDecimals);
            await fundFaucet(provider as BrowserProvider, faucetAddress, amount, faucetDetails.isEther, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);
            toast({ title: "Faucet funded successfully", description: `You added ${formatUnits(amount, tokenDecimals)} ${tokenSymbol} to the faucet (minus 3% platform fee)`, });
            setFundAmount("");
            setShowFundPopup(false);
            await loadFaucetDetails();
            await loadTransactionHistory();
        } catch (error: any) {
            console.error("Error funding faucet:", error);
            toast({ title: "Failed to fund faucet", description: error.message || "Unknown error occurred", variant: "destructive", });
        } finally {
            setIsFunding(false);
        }
    }

    const handleWithdraw = async (): Promise<void> => {
        if (!address || !provider || !withdrawAmount || !chainId || !checkNetwork()) return;
        try {
            setIsWithdrawing(true);
            const amount = parseUnits(withdrawAmount, tokenDecimals);
            await withdrawTokens(provider as BrowserProvider, faucetAddress, amount, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);
            toast({ title: "Tokens withdrawn successfully", description: `You withdrew ${withdrawAmount} ${tokenSymbol}.`, });
            setWithdrawAmount("");
            await loadFaucetDetails();
            await loadTransactionHistory();
        } catch (error: any) {
            console.error("Error withdrawing tokens:", error);
            toast({ title: "Failed to withdraw tokens", description: error.message || "Unknown error occurred", variant: "destructive", });
        } finally {
            setIsWithdrawing(false);
        }
    }

    const handleUpdateClaimParameters = async (): Promise<void> => {
        if (!address || !provider || !chainId || !checkNetwork()) return;
        if (faucetType !== 'custom' && !claimAmount) { toast({ title: "Invalid Input", description: "Please fill in the drop amount", variant: "destructive", }); return }
        if (!startTime || !endTime) { toast({ title: "Invalid Input", description: "Please fill in the start and end times", variant: "destructive", }); return }
        if (startTimeError) { toast({ title: "Invalid Start Time", description: startTimeError, variant: "destructive", }); return }

        try {
            setIsUpdatingParameters(true);
            const claimAmountBN = faucetType === 'custom' ? BigInt(0) : parseUnits(claimAmount, tokenDecimals);
            const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
            const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);
            
            const tasksToSend = newSocialLinks.filter(link => link.url.trim() && link.handle.trim());
            console.log(`Simulating saving ${tasksToSend.length} tasks and X template.`);

            // Simulation of blockchain tx
            await setClaimParameters(provider as BrowserProvider, faucetAddress, claimAmountBN, startTimestamp, endTimestamp, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);

            toast({ title: "Drop parameters updated", description: `Parameters updated successfully. ${tasksToSend.length} social media tasks saved.`, });
            setNewSocialLinks([]);
            await loadFaucetDetails();
            await loadTransactionHistory();
        } catch (error: any) {
            console.error("Error updating drop parameters:", error);
            toast({ title: "Failed to update drop parameters", description: error.message || "Unknown error occurred", variant: "destructive", });
        } finally {
            setIsUpdatingParameters(false);
        }
    }

    const handleUpdateWhitelist = async (): Promise<void> => {
        if (!address || !provider || !whitelistAddresses.trim() || !chainId || !checkNetwork()) return;
        try {
            setIsUpdatingWhitelist(true);
            const addresses = whitelistAddresses.split(/[\n,]/).map((addr) => addr.trim()).filter((addr) => addr.length > 0);
            if (addresses.length === 0) return;
            await setWhitelistBatch(provider as BrowserProvider, faucetAddress, addresses, isWhitelistEnabled, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);
            toast({ title: "Drop-list updated", description: `${addresses.length} addresses have been ${isWhitelistEnabled ? "added to" : "removed from"} the Drop-list`, });
            setWhitelistAddresses("");
            await loadFaucetDetails();
            await loadTransactionHistory();
        } catch (error: any) {
            console.error("Error updating Drop-list:", error);
            toast({ title: "Failed to update Drop-list", description: error.message || "Unknown error occurred", variant: "destructive", });
        } finally {
            setIsUpdatingWhitelist(false);
        }
    }

    const handleResetAllClaims = async (): Promise<void> => {
        if (!address || !provider || !chainId || !checkNetwork()) return;
        try {
            setIsResettingClaims(true);
            await resetAllClaims(provider as BrowserProvider, faucetAddress, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);
            toast({ title: "All claims reset", description: "All users can now claim again", });
            await loadFaucetDetails();
            await loadTransactionHistory();
        } catch (error: any) {
            console.error("Error resetting all claims:", error);
            toast({ title: "Failed to reset all claims", description: error.message || "Unknown error occurred", variant: "destructive", });
        } finally {
            setIsResettingClaims(false);
        }
    }

    const checkAdminStatus = (inputAddress: string): void => {
        if (!inputAddress.trim()) { setIsAddingAdmin(true); return; }
        const isAdmin = adminList.some((admin) => admin.toLowerCase() === inputAddress.toLowerCase());
        setIsAddingAdmin(!isAdmin);
    }
    
    const handleManageAdmin = async (): Promise<void> => {
        if (!address || !provider || !newAdminAddress.trim() || !chainId || !checkNetwork()) return;
        if (newAdminAddress.toLowerCase() === faucetDetails?.owner.toLowerCase() || newAdminAddress.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()) {
            toast({ title: "Cannot modify special addresses", description: "Owner and backend addresses are protected.", variant: "destructive", });
            return;
        }

        try {
            setIsManagingAdmin(true);
            if (isAddingAdmin) {
                await addAdmin(provider as BrowserProvider, faucetAddress, newAdminAddress, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);
                toast({ title: "Admin added", description: `Address ${newAdminAddress} has been added as an admin`, });
            } else {
                await removeAdmin(provider as BrowserProvider, faucetAddress, newAdminAddress, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);
                toast({ title: "Admin removed", description: `Address ${newAdminAddress} has been removed as an admin`, });
            }
            setNewAdminAddress("");
            setShowAddAdminDialog(false);
            await loadFaucetDetails();
        } catch (error: any) {
            console.error("Error managing admin:", error);
            toast({ title: `Failed to ${isAddingAdmin ? "add" : "remove"} admin`, description: error.message || "Unknown error occurred", variant: "destructive", });
        } finally {
            setIsManagingAdmin(false);
        }
    }
    
    const handleRetrieveSecretCode = async (): Promise<void> => {
        if (faucetType !== 'dropcode' || !faucetAddress) return;
        try {
            setIsRetrievingSecret(true);
            const code = await retrieveSecretCode(faucetAddress);
            if (!code || code.trim() === '') throw new Error('Retrieved code is empty or invalid');
            setCurrentSecretCode(code);
            setShowCurrentSecretDialog(true);
            toast({ title: "Valid Drop Code Retrieved! 🎉", description: "Fresh valid code retrieved and cached", });
        } catch (error: any) {
            let errorMessage = error.message || "Failed to retrieve the drop code";
            toast({ title: "Failed to retrieve Drop code", description: errorMessage, variant: "destructive", });
        } finally {
            setIsRetrievingSecret(false);
        }
    }
    
    const handleGenerateNewDropCode = async (): Promise<void> => {
        if (faucetType !== 'dropcode' || !faucetAddress || !address || !chainId) return;
        if (!isOwnerOrAdmin) { toast({ title: "Unauthorized", description: "Only owner/admin can generate new codes", variant: "destructive" }); return }
        try {
            setIsGeneratingNewCode(true)
            const response = await fetch("https://fauctdrop-backend.onrender.com/generate-new-drop-code", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ faucetAddress, userAddress: address, chainId: Number(chainId) }),
            })
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Failed to generate new drop code") }
            const result = await response.json()
            const newCode = result.secretCode
            setNewlyGeneratedCode(newCode)
            setShowNewCodeDialog(true)
            toast({ title: "New Drop Code Generated! 🎉", description: "A fresh drop code is now active" })
        } catch (error: any) {
            console.error('❌ Failed to generate new drop code:', error)
            toast({ title: "Failed to generate Drop code", description: error.message || "Unknown error occurred", variant: "destructive", })
        } finally {
            setIsGeneratingNewCode(false)
        }
    }
    
    const handleCopySecretCode = async (code: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(code)
            toast({ title: "Code Copied", description: "Drop code has been copied to your clipboard.", })
            setShowNewCodeDialog(false)
            setShowCurrentSecretDialog(false)
        } catch (error) {
            toast({ title: "Copy Failed", description: "Failed to copy the code. Please try again.", variant: "destructive", })
        }
    }

    const addNewSocialLink = (): void => {
        setNewSocialLinks([...newSocialLinks, { platform: '𝕏', url: '', handle: '', action: 'follow' }]);
    }
    const removeNewSocialLink = (index: number): void => {
        setNewSocialLinks(newSocialLinks.filter((_, i) => i !== index));
    }
    const updateNewSocialLink = (index: number, field: keyof SocialMediaLink, value: string): void => {
        const updated = [...newSocialLinks];
        updated[index] = { ...updated[index], [field]: value };
        setNewSocialLinks(updated);
    }

    const totalPages = Math.ceil(transactions.length / 10);
    const startIndex = (currentPage - 1) * 10;
    const currentTransactions = transactions.slice(startIndex, startIndex + 10);
    const handlePageChange = (page: number): void => { if (page >= 1 && page <= totalPages) setCurrentPage(page); }

    const getTokenName = (isEther: boolean): string => {
        if (!isEther) return tokenSymbol;
        return selectedNetwork?.name ? selectedNetwork.nativeCurrency.symbol : "ETH";
    }

    // --- Preview Logic ---
    const handlePreview = () => {
        setShowPreviewDialog(true);
    };

    // Construct simulated faucet details for the preview
    const simulatedFaucetDetails = {
        ...faucetDetails,
        name: newFaucetName || faucetDetails.name,
        claimAmount: faucetType === 'custom' ? BigInt(0) : parseUnits(claimAmount || '0', tokenDecimals),
        // Simplification: Time/Active status is based on loaded details for preview consistency
    };

    // Determine the active tasks for the preview (just the loaded ones for now)
    const previewDynamicTasks = dynamicTasks.length > 0 ? dynamicTasks : [];


    return (
        <Card className="w-full mx-auto">
            <CardHeader className="px-4 sm:px-6">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg sm:text-xl">Admin Controls 👑</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Manage your {faucetType || 'unknown'} faucet settings - Mode: **{backendMode ? "Automatic" : "Manual"}**
                        </CardDescription>
                    </div>
                    <Button onClick={handlePreview} variant="secondary" size="sm" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" /> View Setup Preview
                    </Button>
                </div>
                {isOwner && (
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setShowEditNameDialog(true)} className="text-xs">
                            <Edit className="h-3 w-3 mr-1" /> Edit Name
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-xs">
                            <Trash2 className="h-3 w-3 mr-1" /> Delete Faucet
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
                <Tabs defaultValue="fund" value={activeTab} onValueChange={setActiveTab}>
                    {/* Simplified TabsList for smaller screen by using Menu/Dropdown is handled in the original code, keeping desktop TabsList here */}
                    <TabsList className={`hidden sm:grid gap-2 w-full ${
                        shouldShowWhitelistTab && shouldShowCustomTab ? 'grid-cols-6' : 
                        shouldShowWhitelistTab || shouldShowCustomTab ? 'grid-cols-5' : 
                        'grid-cols-4'
                    }`}>
                        <TabsTrigger value="fund" className="text-xs sm:text-sm"><Upload className="h-4 w-4 mr-2" />Fund</TabsTrigger>
                        <TabsTrigger value="parameters" className="text-xs sm:text-sm"><Coins className="h-4 w-4 mr-2" />Parameters</TabsTrigger>
                        {shouldShowWhitelistTab && <TabsTrigger value="whitelist" className="text-xs sm:text-sm"><Users className="h-4 w-4 mr-2" />Drop-list</TabsTrigger>}
                        {shouldShowCustomTab && <TabsTrigger value="custom" className="text-xs sm:text-sm"><FileUp className="h-4 w-4 mr-2" />Custom</TabsTrigger>}
                        <TabsTrigger value="admin-power" className="text-xs sm:text-sm"><RotateCcw className="h-4 w-4 mr-2" />Admin Power</TabsTrigger>
                        <TabsTrigger value="history" className="text-xs sm:text-sm"><History className="h-4 w-4 mr-2" />Activity Log</TabsTrigger>
                    </TabsList>

                    {/* --- Fund Tab --- */}
                    <TabsContent value="fund" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fund-amount" className="text-xs sm:text-sm">Fund Amount</Label>
                                <div className="flex gap-2">
                                    <Input id="fund-amount" placeholder="0.0" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} className="text-xs sm:text-sm" />
                                    <Button onClick={handleFund} disabled={isFunding || !fundAmount} className="text-xs sm:text-sm">
                                        {isFunding ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Funding...</span> : <><Upload className="h-4 w-4 mr-1" /> Fund</>}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Add {tokenSymbol} to the faucet (3% platform fee applies)</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="withdraw-amount" className="text-xs sm:text-sm">Withdraw Amount</Label>
                                <div className="flex gap-2">
                                    <Input id="withdraw-amount" placeholder="0.0" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="text-xs sm:text-sm" />
                                    <Button onClick={handleWithdraw} disabled={isWithdrawing || !withdrawAmount} variant="outline" className="text-xs sm:text-sm">
                                        {isWithdrawing ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Withdrawing...</span> : <><Download className="h-4 w-4 mr-1" /> Withdraw</>}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Withdraw {tokenSymbol} from the faucet</p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- Parameters Tab --- */}
                    <TabsContent value="parameters" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            {faucetType !== 'custom' && (
                                <div className="space-y-2">
                                    <Label htmlFor="claim-amount" className="text-xs sm:text-sm">Drip Amount</Label>
                                    <Input id="claim-amount" placeholder="0.0" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} className="text-xs sm:text-sm" />
                                    <p className="text-xs text-muted-foreground">Amount of {tokenSymbol} users can drip</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start-time" className="text-xs sm:text-sm">Start Time</Label>
                                    <Input id="start-time" type="datetime-local" value={startTime} min={getCurrentDateTime()} onChange={handleStartTimeChange} className={`text-xs sm:text-sm ${startTimeError ? 'border-red-500' : ''}`} />
                                    {startTimeError && (<p className="text-red-600 text-xs mt-1">{startTimeError}</p>)}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end-time" className="text-xs sm:text-sm">End Time</Label>
                                    <Input id="end-time" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="text-xs sm:text-sm" />
                                </div>
                            </div>
                            
                            {/* Social Media Tasks Section */}
                            <div className="space-y-4 border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <div><Label className="text-xs sm:text-sm font-medium">Social Media Tasks (Optional)</Label><p className="text-xs text-muted-foreground mt-1">Add social media tasks for verification</p></div>
                                    <Button type="button" variant="outline" size="sm" onClick={addNewSocialLink} className="text-xs"><ExternalLink className="h-3 w-3 mr-1" />Add Task</Button>
                                </div>
                                {dynamicTasks.length > 0 && (
                                    <div className="space-y-2"><Label className="text-xs font-medium">Current Tasks ({dynamicTasks.length})</Label>
                                        <div className="space-y-1">{dynamicTasks.map((task, index) => (<div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                                                <span>{getPlatformIcon(task.platform)} {getActionText(task.platform)} {task.handle}</span><Badge variant="outline" className="text-xs">{task.platform}</Badge>
                                            </div>))}
                                        </div>
                                    </div>
                                )}
                                {newSocialLinks.length > 0 && (
                                    <div className="space-y-3">
                                         <Label className="text-xs font-medium">New Tasks</Label>
                                         {/* Simplified New Tasks Input Area */}
                                         {newSocialLinks.map((link, index) => (
                                            <div key={index} className="border rounded-lg p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                     <Label className="text-xs font-medium">Task {index + 1}</Label>
                                                     <Button type="button" variant="ghost" size="sm" onClick={() => removeNewSocialLink(index)} className="text-xs text-red-600"><Trash2 className="h-3 w-3" /></Button>
                                                </div>
                                                <Select value={link.platform} onValueChange={(value) => updateNewSocialLink(index, 'platform', value)}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="𝕏">Twitter/𝕏</SelectItem></SelectContent></Select>
                                                <Input placeholder="URL" value={link.url} onChange={(e) => updateNewSocialLink(index, 'url', e.target.value)} className="text-xs" />
                                                <Input placeholder="@handle" value={link.handle} onChange={(e) => updateNewSocialLink(index, 'handle', e.target.value)} className="text-xs" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Custom X Post Template Section (Simplified) */}
                            <div className="space-y-4 border-t pt-4">
                                <div><Label className="text-xs sm:text-sm font-medium">Custom Share on 𝕏 Post</Label>
                                <p className="text-xs text-muted-foreground mt-1">Customize what users share. Use {"{amount}"}, {"{token}"}, {"{network}"}, {"{explorer}"}</p></div>
                                <Textarea placeholder="..." value={customXPostTemplate} onChange={(e) => setCustomXPostTemplate(e.target.value)} rows={4} className="text-xs font-mono" />
                            </div>

                            <Button onClick={handleUpdateClaimParameters} className="text-xs sm:text-sm w-full" disabled={isUpdatingParameters}>
                                {isUpdatingParameters ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Updating...</span> : "Update Parameters"}
                            </Button>

                            {shouldShowSecretCodeButton && (
                                <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                                    <Button onClick={handleRetrieveSecretCode} variant="outline" className="text-xs sm:text-sm w-full" disabled={isRetrievingSecret}>
                                        {isRetrievingSecret ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Retrieving...</span> : <><Key className="h-4 w-4 mr-1" /> Get Current Code</>}
                                    </Button>
                                    <Button onClick={handleGenerateNewDropCode} variant="outline" className="text-xs sm:text-sm w-full" disabled={isGeneratingNewCode}>
                                        {isGeneratingNewCode ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Generating...</span> : <><RotateCcw className="h-4 w-4 mr-1" /> Generate New Code</>}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* --- Drop-list Tab (Conditional) --- */}
                    {shouldShowWhitelistTab && (
                        <TabsContent value="whitelist" className="space-y-4 mt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs sm:text-sm">{isWhitelistEnabled ? "Add to Drop-list" : "Remove from Drop-list"}</Label>
                                        <Switch checked={isWhitelistEnabled} onCheckedChange={setIsWhitelistEnabled} />
                                    </div>
                                    <Label htmlFor="whitelist-addresses" className="text-xs sm:text-sm">Addresses (one per line or comma-separated)</Label>
                                    <Textarea id="whitelist-addresses" value={whitelistAddresses} onChange={(e) => setWhitelistAddresses(e.target.value)} rows={5} className="text-xs sm:text-sm" />
                                </div>
                                <Button onClick={handleUpdateWhitelist} className="text-xs sm:text-sm w-full" disabled={isUpdatingWhitelist}>
                                    {isUpdatingWhitelist ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Updating...</span> : "Update Drop-list"}
                                </Button>
                            </div>
                        </TabsContent>
                    )}

                    {/* --- Custom Tab (Conditional) --- */}
                    {shouldShowCustomTab && (
                        <TabsContent value="custom" className="space-y-4 mt-4">
                            <CustomClaimUploader
                                tokenSymbol={tokenSymbol}
                                tokenDecimals={tokenDecimals}
                                onDataParsed={async (addresses, amounts) => {
                                    if (!address || !provider || !chainId || !checkNetwork()) return;
                                    try {
                                        console.log(`Simulating setting custom amounts for ${addresses.length} addresses`);
                                        await setCustomClaimAmountsBatch(provider as BrowserProvider, faucetAddress, addresses, amounts, BigInt(chainId), BigInt(Number(selectedNetwork.chainId)), faucetType || undefined);
                                        toast({ title: "Custom claim amounts set", description: `Successfully set custom amounts for ${addresses.length} addresses`, });
                                        await loadFaucetDetails();
                                        await loadTransactionHistory();
                                    } catch (error: any) {
                                        toast({ title: "Failed to set custom claim amounts", description: error.message || "Unknown error occurred", variant: "destructive", });
                                    }
                                }}
                                onCancel={() => {}}
                            />
                        </TabsContent>
                    )}

                    {/* --- Admin Power Tab --- */}
                    <TabsContent value="admin-power" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">All Admins</Label>
                            <div className="space-y-2">
                                {/* Only display admins that are NOT the FACTORY_OWNER_ADDRESS */}
                                {adminList.filter(admin => admin.toLowerCase() !== FACTORY_OWNER_ADDRESS.toLowerCase()).map((admin) => (
                                    <div key={admin} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <span className="font-mono break-all text-xs sm:text-sm">{admin}</span>
                                        <div className="flex gap-2">
                                            {admin.toLowerCase() === faucetDetails?.owner.toLowerCase() && (<Badge variant="secondary" className="text-xs">Owner</Badge>)}
                                            {admin.toLowerCase() !== faucetDetails?.owner.toLowerCase() && (<Badge variant="outline" className="text-xs">Admin</Badge>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {isOwner && (
                            <div className="space-y-2 pt-4">
                                <Label htmlFor="new-admin" className="text-xs sm:text-sm">{isAddingAdmin ? "Add Admin" : "Remove Admin"}</Label>
                                <div className="flex gap-2">
                                    <Input id="new-admin" placeholder="0x..." value={newAdminAddress} onChange={(e) => { setNewAdminAddress(e.target.value); checkAdminStatus(e.target.value); }} className="text-xs sm:text-sm font-mono" />
                                    <Button onClick={() => setShowAddAdminDialog(true)} disabled={isManagingAdmin || !newAdminAddress.trim()} className="text-xs sm:text-sm">
                                        {isManagingAdmin ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>{isAddingAdmin ? "Adding..." : "Removing..."}</span> : (isAddingAdmin ? "Add Admin" : "Remove Admin")}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Note: Owner cannot be modified through this interface.</p>
                            </div>
                        )}
                        <div className="space-y-2 pt-4">
                            <Label className="text-xs sm:text-sm">Reset All Claims</Label>
                            <p className="text-xs text-muted-foreground">Allow all users to claim again</p>
                            <Button onClick={handleResetAllClaims} variant="destructive" className="text-xs sm:text-sm" disabled={isResettingClaims}>
                                {isResettingClaims ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Resetting...</span> : <><RotateCcw className="h-4 w-4 mr-1" /> Reset All Claims</>}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* --- Activity Log Tab --- */}
                    <TabsContent value="history" className="space-y-4 mt-4">
                        <Label className="text-xs sm:text-sm">Activity Log</Label>
                        {transactions.length > 0 ? (
                            <>
                                <Table>
                                    <TableHeader><TableRow><TableHead className="text-xs sm:text-sm">Type</TableHead><TableHead className="text-xs sm:text-sm">Initiator</TableHead><TableHead className="text-xs sm:text-sm">Amount</TableHead><TableHead className="text-xs sm:text-sm">Token</TableHead><TableHead className="text-xs sm:text-sm">Date</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {currentTransactions.map((tx, index) => (<TableRow key={`${tx.timestamp}-${index}`}><TableCell className="text-xs sm:text-sm capitalize">{tx.transactionType}</TableCell><TableCell className="text-xs sm:text-sm font-mono truncate max-w-[150px]">{tx.initiator.slice(0, 6)}...{tx.initiator.slice(-4)}</TableCell><TableCell className="text-xs sm:text-sm">{formatUnits(tx.amount, tokenDecimals)}</TableCell><TableCell className="text-xs sm:text-sm">{getTokenName(tx.isEther)}</TableCell><TableCell className="text-xs sm:text-sm">{new Date(tx.timestamp * 1000).toLocaleString()}</TableCell></TableRow>))}
                                    </TableBody>
                                </Table>
                                {/* ... Pagination UI removed for brevity ... */}
                            </>
                        ) : (<p className="text-xs sm:text-sm text-muted-foreground">No transactions found</p>)}
                    </TabsContent>
                </Tabs>
            </CardContent>
            
            {/* --- Dialogs --- */}

            {/* PREVIEW DIALOG: Shows a simulated FaucetUserView */}
            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-xl max-h-[95vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">User View Preview (Simulated)</DialogTitle>
                        <DialogDescription className="text-sm">
                            This shows the user interface based on the **currently saved parameters** and social tasks. Claim status is simulated.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <FaucetUserView 
                            faucetAddress={faucetAddress}
                            faucetDetails={simulatedFaucetDetails}
                            faucetType={faucetType}
                            tokenSymbol={tokenSymbol}
                            tokenDecimals={tokenDecimals}
                            selectedNetwork={selectedNetwork}
                            address={null} // Simulate unconnected user
                            isConnected={false}
                            hasClaimed={false} // Simulate first-time claim
                            userIsWhitelisted={true} // Simulate user passes whitelist check (if applicable)
                            hasCustomAmount={true} // Simulate user has allocation (if applicable)
                            userCustomClaimAmount={parseUnits('100', tokenDecimals)} // Dummy amount for custom preview
                            dynamicTasks={previewDynamicTasks} // Show the currently set tasks
                            allAccountsVerified={false} // Force showing tasks verification area
                            secretCode={""}
                            setSecretCode={() => {}}
                            usernames={{}}
                            setUsernames={() => {}}
                            verificationStates={{}}
                            setVerificationStates={() => {}}
                            isVerifying={false}
                            faucetMetadata={faucetDetails?.faucetMetadata || {}} // Use loaded metadata
                            customXPostTemplate={customXPostTemplate}
                            // Dummy handlers to prevent errors/actions during preview
                            handleBackendClaim={() => Promise.resolve()} 
                            handleFollowAll={() => toast({ title: "Preview Mode", description: "Tasks are disabled in preview.", variant: "default" })}
                            generateXPostContent={(a) => `Preview: ${a} ${tokenSymbol}`}
                            txHash={null}
                            showFollowDialog={false} 
                            setShowFollowDialog={() => {}}
                            showVerificationDialog={false}
                            setShowVerificationDialog={() => {}}
                            showClaimPopup={false}
                            setShowClaimPopup={() => {}}
                            handleVerifyAllTasks={() => Promise.resolve()}
                            handleGoBack={() => setShowPreviewDialog(false)} // Close on back
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowPreviewDialog(false)}>Close Preview</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Fund Confirmation Dialog */}
            <Dialog open={showFundPopup} onOpenChange={setShowFundPopup}>
                <DialogContent className="w-11/12 max-w-md">
                    <DialogHeader><DialogTitle className="text-lg sm:text-xl">Confirm Funding</DialogTitle><DialogDescription className="text-xs sm:text-sm">Review the funding details before proceeding.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label htmlFor="adjusted-fund-amount" className="text-xs sm:text-sm">Amount to Fund</Label>
                        <Input id="adjusted-fund-amount" value={adjustedFundAmount} onChange={(e) => setAdjustedFundAmount(e.target.value)} className="text-xs sm:text-sm" /></div>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>Platform fee (3%): {fee} {tokenSymbol}</p><p>Net amount to faucet: {netAmount} {tokenSymbol}</p>
                            <p className="text-blue-600">Tip: To fund exactly {fundAmount} {tokenSymbol}, enter {recommendedInput} {tokenSymbol}</p>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowFundPopup(false)} className="text-xs sm:text-sm">Cancel</Button>
                        <Button onClick={confirmFund} className="text-xs sm:text-sm" disabled={isFunding}>
                            {isFunding ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Confirming...</span> : "Confirm Fund"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Name Dialog */}
            <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
                 <DialogContent className="w-11/12 max-w-md">
                    <DialogHeader><DialogTitle className="text-lg sm:text-xl">Edit Faucet Name</DialogTitle><DialogDescription className="text-xs sm:text-sm">Enter a new name for your faucet.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-4"><div className="space-y-2">
                    <Label htmlFor="new-faucet-name" className="text-xs sm:text-sm">New Faucet Name</Label>
                    <Input id="new-faucet-name" value={newFaucetName} onChange={(e) => setNewFaucetName(e.target.value)} placeholder="Enter new faucet name" className="text-xs sm:text-sm" />
                    </div></div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowEditNameDialog(false)} className="text-xs sm:text-sm">Cancel</Button>
                        <Button onClick={handleUpdateFaucetName} className="text-xs sm:text-sm" disabled={isUpdatingName || !newFaucetName.trim()}>
                            {isUpdatingName ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Updating...</span> : "Update Name"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Faucet Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="w-11/12 max-w-md">
                    <DialogHeader><DialogTitle className="text-lg sm:text-xl">Delete Faucet</DialogTitle><DialogDescription className="text-xs sm:text-sm">Are you sure you want to delete this faucet? This action cannot be undone.</DialogDescription></DialogHeader>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="text-xs sm:text-sm">Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteFaucet} className="text-xs sm:text-sm" disabled={isDeletingFaucet}>
                            {isDeletingFaucet ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Deleting...</span> : "Delete Faucet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add/Remove Admin Dialog */}
            <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
                <DialogContent className="w-11/12 max-w-md">
                    <DialogHeader><DialogTitle className="text-lg sm:text-xl">{isAddingAdmin ? "Add Admin" : "Remove Admin"}</DialogTitle><DialogDescription className="text-xs sm:text-sm">{isAddingAdmin ? "Enter the address to grant admin privileges." : "Enter the address to revoke admin privileges."}</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-4"><div className="space-y-2">
                        <Label htmlFor="admin-address" className="text-xs sm:text-sm">Admin Address</Label>
                        <Input id="admin-address" value={newAdminAddress} onChange={(e) => { setNewAdminAddress(e.target.value); checkAdminStatus(e.target.value); }} placeholder="0x..." className="text-xs sm:text-sm font-mono" />
                    </div></div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowAddAdminDialog(false)} className="text-xs sm:text-sm">Cancel</Button>
                        <Button onClick={handleManageAdmin} className="text-xs sm:text-sm" disabled={isManagingAdmin || !newAdminAddress.trim()}>
                            {isManagingAdmin ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>{isAddingAdmin ? "Adding..." : "Removing..."}</span> : (isAddingAdmin ? "Add Admin" : "Remove Admin")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Current Drop Code Dialog (Retrieved) */}
            <Dialog open={showCurrentSecretDialog} onOpenChange={setShowCurrentSecretDialog}>
                <DialogContent className="w-11/12 max-w-md">
                    <DialogHeader><DialogTitle className="text-lg sm:text-xl">Current Drop Code</DialogTitle><DialogDescription className="text-xs sm:text-sm">This is the current drop code for your faucet.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-4"><div className="text-center">
                        <div className="text-xl sm:text-2xl font-mono font-bold bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">{currentSecretCode}</div>
                    </div></div>
                    <DialogFooter>
                        <Button onClick={() => handleCopySecretCode(currentSecretCode)} className="text-xs sm:text-sm w-full"><Copy className="h-4 w-4 mr-1" /> Copy Code</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Drop Code Generated Dialog */}
            <Dialog open={showNewCodeDialog} onOpenChange={setShowNewCodeDialog}>
                <DialogContent className="w-11/12 max-w-md">
                    <DialogHeader><DialogTitle className="text-lg sm:text-xl">New Drop Code Generated</DialogTitle><DialogDescription className="text-xs sm:text-sm">Your new drop code has been generated and stored. The previous code is no longer valid.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-4"><div className="text-center">
                        <div className="text-xl sm:text-2xl font-mono font-bold bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">{newlyGeneratedCode}</div>
                    </div></div>
                    <DialogFooter>
                        <Button onClick={() => handleCopySecretCode(newlyGeneratedCode)} className="text-xs sm:text-sm w-full"><Copy className="h-4 w-4 mr-1" /> Copy New Code</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </Card>
    );
};

export default FaucetAdminView;