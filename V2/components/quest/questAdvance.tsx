"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation' // <--- 1. IMPORT ROUTER
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Clock, Trash2, Loader2, Rocket,
    Plus, Zap, Lock, Unlock, Trophy, Settings,
    LayoutList, GripVertical, Percent, ShieldAlert, CalendarClock, Users, AlertTriangle
} from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { BrowserProvider } from 'ethers'
import { createQuestReward, type Network } from "@/lib/faucet"
import { ZeroAddress } from 'ethers'
import { toast } from 'sonner'
const API_BASE_URL = "https://fauctdrop-backend.onrender.com"
const networks: Network[] = [
    {
        name: "Celo", symbol: "CELO", chainId: BigInt(42220), rpcUrl: "https://forno.celo.org", blockExplorer: "https://celoscan.io", color: "#35D07F", logoUrl: "/celo.png", iconUrl: "/celo.png",
        factoryAddresses: ["0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB", "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5"],
        factories: { quest: "0xdC9b027B6453560ce8C4390E0B609b343a8eBd62" }, tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438", nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 }, isTestnet: false,
    },
    {
        name: "Lisk", symbol: "LSK", chainId: BigInt(1135), rpcUrl: "https://rpc.api.lisk.com", blockExplorer: "https://blockscout.lisk.com", explorerUrl: "https://blockscout.lisk.com", color: "#0D4477", logoUrl: "/lsk.png", iconUrl: "/lsk.png",
        factoryAddresses: ["0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7"],
        factories: { quest: "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7" }, tokenAddress: ZeroAddress, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, isTestnet: false,
    },
    {
        name: "Arbitrum", symbol: "ARB", chainId: BigInt(42161), rpcUrl: "https://arb1.arbitrum.io/rpc", blockExplorer: "https://arbiscan.io", explorerUrl: "https://arbiscan.io", color: "#28A0F0", logoUrl: "/arb.jpeg", iconUrl: "/arb.jpeg",
        factoryAddresses: ["0x9D6f441b31FBa22700bb3217229eb89b13FB49de"],
        factories: { quest: "0x9D6f441b31FBa22700bb3217229eb89b13FB49de" }, tokenAddress: ZeroAddress, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, isTestnet: false,
    },
    {
        name: "Base", symbol: "BASE", chainId: BigInt(8453), rpcUrl: "https://base.publicnode.com", blockExplorer: "https://basescan.org", explorerUrl: "https://basescan.org", color: "#0052FF", logoUrl: "/base.png", iconUrl: "/base.png",
        factoryAddresses: ["0x587b840140321DD8002111282748acAdaa8fA206"],
        factories: { quest: "0x587b840140321DD8002111282748acAdaa8fA206" }, tokenAddress: ZeroAddress, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, isTestnet: false,
    }
]
// ==== CONSTANTS & TYPES ====Cannot find name 'useMemo'.
export type TaskStage = 'Beginner' | 'Intermediate' | 'Advance' | 'Legend' | 'Ultimate'
export const TASK_STAGES: TaskStage[] = ['Beginner', 'Intermediate', 'Advance', 'Legend', 'Ultimate']

const FIXED_PASS_RATIO = 0.7
const STAGE_TASK_REQUIREMENTS: Record<TaskStage, { min: number; max: number }> = {
    Beginner: { min: 2, max: 10 },
    Intermediate: { min: 3, max: 8 },
    Advance: { min: 2, max: 6 },
    Legend: { min: 2, max: 5 },
    Ultimate: { min: 1, max: 3 },
}

export type VerificationType = 'auto_social' | 'auto_tx' | 'manual_link' | 'manual_upload' | 'system_referral' | 'system_daily' | 'none' | 'system_x_share'

export type SocialPlatform = 'Twitter' | 'Facebook' | 'Tiktok' | 'Youtube' | 'Discord' | 'Thread' | 'Linkedin' | 'Farcaster' | 'Instagram' | 'Website'
const SOCIAL_PLATFORMS: SocialPlatform[] = ['Twitter', 'Facebook', 'Tiktok', 'Youtube', 'Discord', 'Thread', 'Linkedin', 'Farcaster', 'Instagram', 'Website']
const SOCIAL_ACTIONS = ['follow', 'retweet', 'like', 'join', 'subscribe', 'visit', 'comment', 'quote']

export interface QuestTask {
    id: string
    title: string
    description: string
    points: number | string
    required: boolean
    category: 'social' | 'trading' | 'swap' | 'referral' | 'content' | 'general'
    url: string
    action: string
    minTxCount?: number | string
    minDays?: number | string
    minDurationHours?: number | string
    verificationType: VerificationType
    targetPlatform?: string
    targetHandle?: string
    targetContractAddress?: string
    targetChainId?: string
    stage: TaskStage
    minAmount?: number | string
    minReferrals?: number | string
    isSystem?: boolean
    isRecurring?: boolean
    recurrenceInterval?: number
}

export interface StagePassRequirements {
    Beginner: number
    Intermediate: number
    Advance: number
    Legend: number
    Ultimate: number
}

// Suggested tasks

const SUGGESTED_TASKS_BY_STAGE: Record<TaskStage, Array<Partial<QuestTask>>> = {
  Beginner: [
    {
      title: "Visit Project Homepage",
      description: "Check out our official website to learn more about the project.",
      category: "social",
      action: "visit",
      targetPlatform: "Website",
      points: 30,
      verificationType: "none",
    },
    {
      title: "Follow us on X (Twitter)",
      description: "Follow our official X account for updates and announcements.",
      category: "social",
      action: "follow",
      targetPlatform: "Twitter",
      points: 50,
      verificationType: "auto_social",
    },
    {
      title: "Quote Quest on X",
      description: "Quote our quest tweet with {@handle} to earn points.",
      category: "social",
      action: "quote", // <--- New Action
      targetPlatform: "Twitter",
      points: 20,
      verificationType: "auto_social",
    },
    {
      title: "Join our Discord Server",
      description: "Become part of the community on Discord.",
      category: "social",
      action: "join",
      targetPlatform: "Discord",
      points: 50,
      verificationType: "auto_social",
    },
    {
      title: "Join Telegram Group",
      description: "Join our Telegram channel for real-time updates.",
      category: "social",
      action: "join",
      targetPlatform: "Telegram",
      points: 40,
      verificationType: "manual_upload",
      
    },
    {
      title: "Watch Intro Video",
      description: "Watch our short introduction video (2–3 minutes).",
      category: "content",
      action: "watch",
      points: 30,
      verificationType: "none",
    },
  ],

  Intermediate: [
    {
      title: "Follow us on Instagram",
      description: "Follow our Instagram for visuals and community highlights.",
      category: "social",
      action: "follow",
      targetPlatform: "Instagram",
      points: 40,
      verificationType: "manual_upload",
    },
    {
      title: "Subscribe to YouTube Channel",
      description: "Subscribe to our YouTube channel and turn on notifications.",
      category: "social",
      action: "subscribe",
      targetPlatform: "Youtube",
      points: 60,
      verificationType: "manual_upload",
    },
    {
      title: "Hold at least 0.01 ETH / native token",
      description: "Hold a small amount of the chain's native token in your wallet.",
      category: "trading",
      action: "hold_balance",
      points: 80,
      verificationType: "auto_tx",
      minAmount: "0.01",
      targetChainId: "any", // will use connected chain
    },
    {
      title: "Make 1 Swap on DEX",
      description: "Execute at least one swap on a decentralized exchange.",
      category: "swap",
      action: "swap",
      points: 120,
      verificationType: "auto_tx",
    },
    {
      title: "Bridge at least 0.005 ETH",
      description: "Use a bridge to move at least 0.005 ETH/native across chains.",
      category: "trading",
      action: "bridge",
      points: 150,
      verificationType: "auto_tx",
      minAmount: "0.005",
    },
  ],

  Advance: [
    {
      title: "Provide Liquidity ($50+ value)",
      description: "Add liquidity to any pool with at least $50 equivalent value.",
      category: "trading",
      action: "add_liquidity",
      points: 250,
      verificationType: "auto_tx",
      minAmount: "50", // in USD approximate
    },
    {
      title: "Stake Tokens in a Pool",
      description: "Stake any amount of tokens in an official staking contract.",
      category: "trading",
      action: "stake",
      points: 300,
      verificationType: "auto_tx",
    },
    {
      title: "Hold an NFT from our Collection",
      description: "Own at least 1 NFT from the official collection.",
      category: "trading",
      action: "hold_nft",
      points: 200,
      verificationType: "auto_tx",
      targetContractAddress: "0x...your-nft-collection...", // you can override later
    },
    {
      title: "Make 3+ On-chain Transactions",
      description: "Complete at least 3 transactions on the target chain.",
      category: "trading",
      action: "tx_count",
      points: 180,
      verificationType: "auto_tx",
      minTxCount: 3,
    },
  ],

  Legend: [
    {
      title: "Provide Liquidity for 7+ days",
      description: "Add liquidity and maintain position for at least 7 days.",
      category: "trading",
      action: "provide_liquidity_duration",
      points: 500,
      verificationType: "auto_tx",
      minDurationHours: 168, // 7 days
    },
    {
      title: "Cross-chain Bridge (2+ chains)",
      description: "Bridge assets between at least two different chains.",
      category: "trading",
      action: "bridge",
      points: 600,
      verificationType: "auto_tx",
    },
    {
      title: "Claim Staking Rewards",
      description: "Claim rewards from any staking pool or farm.",
      category: "trading",
      action: "claim_rewards",
      points: 450,
      verificationType: "auto_tx",
    },
    {
      title: "Interact with our Smart Contract",
      description: "Send at least one transaction to our main contract.",
      category: "trading",
      action: "interact_contract",
      points: 350,
      verificationType: "auto_tx",
      targetContractAddress: "0x...your-contract...", // override per quest
    },
  ],

  Ultimate: [
    {
      title: "High Volume Trader ($10,000+ traded)",
      description: "Execute swaps with a cumulative value of $10k or more.",
      category: "swap",
      action: "swap",
      points: 1500,
      verificationType: "auto_tx",
      minAmount: "10000", // cumulative USD value
    },
    {
      title: "Become an Ambassador",
      category: "general",
      action: "apply",
      points: 1000,
      verificationType: "manual_upload",
      description: "Upload proof of Ambassador role assignment.",
    },
    {
      title: "Wallet Age > 90 days + 50+ tx",
      description: "Have an aged wallet with significant on-chain history.",
      category: "trading",
      action: "wallet_age_and_tx",
      points: 1200,
      verificationType: "auto_tx",
      minDays: 90,
      minTxCount: 50,
    },
  ],
};
const generateSocialTaskTitle = (platform: string, action: string): string => {
  if (!platform || !action) return ""
  const actionMap: Record<string, string> = {
    'follow': 'Follow',
    'retweet': 'Retweet/Share',
    'like': 'Like',
    'quote': 'Quote',
    'join': 'Join',
    'subscribe': 'Subscribe to',
    'visit': 'Visit',
    'swap': 'Execute Swap on',
    'stake': 'Stake Tokens on',
    'deposit': 'Deposit Assets on',
    'lend': 'Lend/Borrow on',
  }
  const capitalizedAction = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1)
  if (['follow', 'like', 'retweet'].includes(action) && platform === 'Twitter') {
    return `${capitalizedAction} our post on X (Twitter)`
  }
  if (action === 'join' && platform === 'Discord') {
    return `Join our Official Discord Server`
  }
  if (action === 'subscribe' && platform === 'Youtube') {
    return `Subscribe to our YouTube Channel`
  }
  if (action === 'quote' && platform === 'Twitter') {
    return `Quote our Quest on X (Twitter)`
  }
  return `${capitalizedAction} our ${platform}`
}

interface Phase2Props {
    newQuest: any
    setNewQuest: React.Dispatch<React.SetStateAction<any>>
    stagePassRequirements: StagePassRequirements
    setStagePassRequirements: React.Dispatch<React.SetStateAction<StagePassRequirements>>
    stageTotals: Record<TaskStage, number>
    stageTaskCounts: Record<TaskStage, number>
    initialNewTaskForm: Partial<QuestTask>
    validateTask: () => boolean
    handleAddTask: (task: QuestTask) => Promise<void>
    handleUpdateTask: (task: QuestTask) => Promise<void>   // ← Accepts the updated task
    handleRemoveTask: (taskId: string) => Promise<void>
    handleStagePassRequirementChange: (stage: TaskStage, value: number) => void
    getStageColor: (stage: TaskStage) => string
    getCategoryColor: (category: string) => string
    getVerificationIcon: (type: VerificationType) => React.ReactNode
    handleUseSuggestedTask: (suggestedTask: Partial<QuestTask>) => void
    isFinalizing: boolean
    setError: React.Dispatch<React.SetStateAction<string | null>>
    handleFinalize: (finalAddress?: string) => Promise<void>
    saveDraftProgress: (quest: any) => Promise<void>
}

const BACKEND_WALLET_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"
// ==== SYSTEM TASKS DEFINITION ====
const SYSTEM_TASKS: QuestTask[] = [
    {
        id: 'sys_referral',
        title: 'Refer Friends',
        description: 'Share your unique referral link to earn points.',
        points: 10,
        required: false,
        category: 'referral',
        url: '',
        action: 'refer',
        verificationType: 'system_referral',
        stage: 'Beginner',
        isSystem: true,
        minReferrals: 1
    },
    {
        id: 'sys_daily',
        title: 'Daily Check-in',
        description: 'Return every 24 hours to claim free points.',
        points: 10,
        required: false,
        category: 'general',
        url: '',
        action: 'checkin',
        verificationType: 'system_daily',
        stage: 'Beginner',
        isSystem: true,
        isRecurring: true,
        recurrenceInterval: 24
    }
]

export default function Phase2TimingTasksFinalize({
    newQuest,
    setNewQuest,
    stagePassRequirements,
    setStagePassRequirements,
    stageTotals,
    stageTaskCounts,
    initialNewTaskForm,
    handleAddTask,
    handleUpdateTask,
    handleRemoveTask,
    handleUseSuggestedTask,
    isFinalizing,
    setError,
    handleFinalize
}: Phase2Props) {
   const { isConnected, chainId, address } = useWallet() // <--- Add address here
    const router = useRouter() // <--- 2. INITIALIZE ROUTER
    const [newTask, setNewTask] = useState<Partial<QuestTask>>(initialNewTaskForm)
    const [editingTask, setEditingTask] = useState<QuestTask | null>(null)
    const [isDeploying, setIsDeploying] = useState(false)

    useEffect(() => {
        if (newTask.category === 'trading' || newTask.category === 'swap') {
        setNewTask(prev => ({
            ...prev,
            verificationType: 'auto_tx',
            // Optional: pre-fill some defaults
            targetChainId: chainId?.toString() || "8453", // default to current connected chain (Base in your list)
        }));
        }
    }, [newTask.category, chainId]);

    useEffect(() => {
        setNewTask(initialNewTaskForm)
    }, [initialNewTaskForm]);

    // ✅ INJECT SYSTEM TASKS AUTOMATICALLY
    useEffect(() => {
        setNewQuest((prev: any) => {
            const existingIds = new Set(prev.tasks.map((t: QuestTask) => t.id));
            const tasksToAdd = SYSTEM_TASKS.filter(st => !existingIds.has(st.id));

            if (tasksToAdd.length > 0) {
                return {
                    ...prev,
                    tasks: [...prev.tasks, ...tasksToAdd]
                };
            }
            return prev;
        });
    }, [setNewQuest]);

    // ✅ AUTO-CALCULATE 70% REQUIREMENT
    useEffect(() => {
        setStagePassRequirements(prev => {
            const next = { ...prev }
            let hasChanged = false

            TASK_STAGES.forEach(stage => {
                const total = stageTotals[stage] || 0
                const required = total > 0 ? Math.floor(total * FIXED_PASS_RATIO) : 0

                if (next[stage] !== required) {
                    next[stage] = required
                    hasChanged = true
                }
            })

            return hasChanged ? next : prev
        })
    }, [stageTotals, setStagePassRequirements])

    const enforceRules = newQuest.enforceStageRules ?? false

   // ==== DEPLOYMENT LOGIC ====
       const timingErrors = useMemo(() => {
    const errors: string[] = [];
    const now = new Date();
    
    if (newQuest.startDate && newQuest.startTime) {
        const start = new Date(`${newQuest.startDate}T${newQuest.startTime}`);
        if (start < now) errors.push("Start time must be in the future.");
    }
    
    if (newQuest.endDate && newQuest.endTime) {
        const end = new Date(`${newQuest.endDate}T${newQuest.endTime}`);
        if (end <= now) errors.push("End time must be in the future.");
        
        if (newQuest.startDate && newQuest.startTime) {
            const start = new Date(`${newQuest.startDate}T${newQuest.startTime}`);
            if (end <= start) errors.push("End time must be after start time.");
        }
    } else {
        errors.push("End date and time are required.");
    }

    return errors;
}, [newQuest.startDate, newQuest.startTime, newQuest.endDate, newQuest.endTime]);

const hasUserTask = useMemo(() => {
    return newQuest.tasks.some((t: QuestTask) => !t.isSystem);
}, [newQuest.tasks]);

const canFinalize = useMemo(() => {
    return timingErrors.length === 0 && hasUserTask && !isDeploying && !isFinalizing;
}, [timingErrors, hasUserTask, isDeploying, isFinalizing]);

const handleDeployAndFinalize = async () => {
    const now = new Date();
    const startTime = new Date(`${newQuest.startDate}T${newQuest.startTime}`);
    const endTime = new Date(`${newQuest.endDate}T${newQuest.endTime}`);

    if (startTime < now) {
        toast.error("Start time must be in the future.");
        return;
    }
    if (endTime <= startTime) {
        toast.error("End time must be after start time.");
        return;
    }
    setIsDeploying(true);
    setError(null);
    
    try {
        if (!isConnected) throw new Error("Please connect your wallet first.");

        // 1. SILENT DRAFT SAVE (Safety Net)
        const draftPayload = {
            creatorAddress: address, 
            title: newQuest.title.trim(),
            description: newQuest.description,
            imageUrl: newQuest.imageUrl,
            rewardPool: newQuest.rewardPool,
            rewardTokenType: newQuest.rewardTokenType,
            tokenAddress: newQuest.tokenAddress,
            distributionConfig: newQuest.distributionConfig,
            faucetAddress: newQuest.faucetAddress,
            tasks: newQuest.tasks
        };

        const draftRes = await fetch(`${API_BASE_URL}/api/quests/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draftPayload)
        });

        // 👇 FIX 2: CAPTURE THE DRAFT ID
        // If we don't capture this, the backend won't know which draft to delete
        // if this was a fresh quest (where newQuest.faucetAddress was initially null)
        const draftJson = await draftRes.json();
        const activeDraftId = draftJson.faucetAddress || newQuest.faucetAddress;

        // 2. PREPARE & DEPLOY
        const currentNetwork = networks.find(n => Number(n.chainId) === Number(chainId));
        const targetFactory = currentNetwork?.factories?.quest;
        if (!targetFactory) throw new Error("Quest Factory not found.");

        const now = Math.floor(Date.now() / 1000);
        const hoursInt = parseInt(newQuest.claimWindowHours || "168", 10);
        const questEndTime = now + (hoursInt * 3600);

        const provider = new BrowserProvider((window as any).ethereum);
        
        const deployedAddress = await createQuestReward(
            provider,
            targetFactory, 
            newQuest.title.trim(),
            newQuest.tokenAddress,
            questEndTime,   
            hoursInt,   
            BACKEND_WALLET_ADDRESS 
        );


        // 3. STRICT FINALIZE
        const finalizePayload = {
            faucetAddress: deployedAddress, // The Real Address
            draftId: activeDraftId,         // <--- USE THE CAPTURED ID HERE
            creatorAddress: address,
            title: newQuest.title,
            description: newQuest.description,
            imageUrl: newQuest.imageUrl,
            startDate: newQuest.startDate,
            endDate: newQuest.endDate,
            claimWindowHours: hoursInt,
            tasks: newQuest.tasks,
            stagePassRequirements: stagePassRequirements,
            enforceStageRules: newQuest.enforceStageRules ?? false
        };

        const res = await fetch(`${API_BASE_URL}/api/quests/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalizePayload)
        });

        if (!res.ok) throw new Error("Finalization failed.");

        toast.success("Quest created successfully!");
        
        const slug = newQuest.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        router.push(`/quest/${slug}-${deployedAddress}`);

    } catch (e: any) {
        console.error("Error:", e);
        let msg = e.message || "Deployment failed";
        
        // Friendly Error Handling
        if (e.code === 4001 || e.message?.includes("rejected")) {
            msg = "Transaction cancelled. Your progress is saved as a draft.";
        }
        
        toast.error(msg);
        setIsDeploying(false); 
    } 
}

    // Logic extracted from StepThreeTasks
    const isSocialOrReferral = newTask.category === 'social' || newTask.category === 'referral'
    const isTrading = newTask.category === 'trading' || newTask.category === 'swap'
    const isSocialTemplate = newTask.category === 'social'
    const availableCategories = ['social', 'trading', 'swap', 'referral', 'content', 'general']
    const suggestedTasks = SUGGESTED_TASKS_BY_STAGE[newTask.stage || 'Beginner'] || []

   const handleUseSuggestedTaskInternal = (suggestion: Partial<QuestTask>) => {
    let updated = { ...suggestion };

    // Logic to prevent "dirty" URLs from previous task edits
    if (suggestion.action === 'quote' && suggestion.targetPlatform === 'Twitter') {
        // This is the link users will quote
        updated.url = "https://x.com/faucetdrops"; 
    }

    if (suggestion.category === 'trading' || suggestion.category === 'swap') {
        updated.verificationType = 'auto_tx';
        updated.targetChainId = chainId?.toString();
    }

    if (suggestion.targetPlatform === 'Twitter' || suggestion.targetPlatform === 'Discord') {
        updated.verificationType = 'auto_social';
    }

    setNewTask(prev => ({
        ...prev,
        ...updated, // This overwrites prev.url with the new cleaned URL
        stage: updated.stage || prev.stage || 'Beginner',
    }));
    };

    const isStageUnlocked = (targetStage: TaskStage): boolean => {
        if (!enforceRules) return true;
        if (editingTask && editingTask.stage === targetStage) return true;
        const targetIndex = TASK_STAGES.indexOf(targetStage);
        if (targetIndex === 0) return true;
        for (let i = 0; i < targetIndex; i++) {
            const prevStage = TASK_STAGES[i];
            const prevCount = stageTaskCounts[prevStage];
            const minRequired = STAGE_TASK_REQUIREMENTS[prevStage].min;
            if (prevCount < minRequired) return false;
        }
        return true;
    }

    const currentStage = newTask.stage || 'Beginner';
    const currentStageReq = STAGE_TASK_REQUIREMENTS[currentStage];
    const currentStageCount = stageTaskCounts[currentStage];
    const isAtMax = enforceRules && currentStageCount >= currentStageReq.max;

    return (
        <div className="space-y-10 max-w-7xl mx-auto py-8 px-4">
            
            {/* Step 3: Timing */}
            <Card className="border-border/50 shadow-sm bg-card">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" /> Campaign Timing
                    </CardTitle>
                    <CardDescription>
                        Define the start, end, and claim duration for your quest.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                Start Date & Time
                            </Label>
                            <div className="flex gap-2">
                                <Input type="date" className="bg-background/50" value={newQuest.startDate || ""} onChange={(e) => setNewQuest((prev: any) => ({ ...prev, startDate: e.target.value }))} />
                                <Input type="time" className="bg-background/50" value={newQuest.startTime || ""} onChange={(e) => setNewQuest((prev: any) => ({ ...prev, startTime: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                End Date & Time
                            </Label>
                            <div className="flex gap-2">
                                <Input type="date" className="bg-background/50" value={newQuest.endDate || ""} onChange={(e) => setNewQuest((prev: any) => ({ ...prev, endDate: e.target.value }))} />
                                <Input type="time" className="bg-background/50" value={newQuest.endTime || ""} onChange={(e) => setNewQuest((prev: any) => ({ ...prev, endTime: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    {timingErrors.length > 0 && (
    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-4">
        <AlertTriangle className="h-4 w-4" />
        <ul>{timingErrors.map((err, i) => <li key={i}>{err}</li>)}</ul>
    </div>
)}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Claim Window (hours after end)</Label>
                        <div className="flex items-center gap-4">
                            <Input
                                type="number"
                                min="1"
                                className="max-w-[200px] bg-background/50"
                                placeholder="168"
                                value={newQuest.claimWindowHours || ""}
                                onChange={(e) => setNewQuest((prev: any) => ({ ...prev, claimWindowHours: e.target.value }))}
                            />
                            <span className="text-xs text-muted-foreground">
                                Typically 168 hours (7 days)
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Step 3: Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Task Form (Takes 7 columns) */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="border-border/50 shadow-sm bg-card h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <LayoutList className="h-5 w-5 text-primary" />
                                {editingTask ? "Edit Task" : "Add New Task"}
                            </CardTitle>
                            <CardDescription>Configure task details and validation.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Rules Toggle */}
                            <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/40">
                                <Switch
                                    className="mt-1"
                                    checked={enforceRules}
                                    onCheckedChange={(checked) => setNewQuest((prev: any) => ({ ...prev, enforceStageRules: checked }))}
                                />
                                <div>
                                    <Label className="font-semibold text-sm">Strict Progression Mode</Label>
                                    <p className="text-xs text-muted-foreground">
                                        {enforceRules
                                            ? "Enforces minimum tasks per stage before unlocking the next."
                                            : "Free mode: Add tasks to any stage in any order."}
                                    </p>
                                </div>
                            </div>

                            {/* Dropdowns */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium uppercase text-muted-foreground">Target Stage</Label>
                                    <Select
                                        value={newTask.stage || "Beginner"}
                                        onValueChange={(v: TaskStage) => setNewTask(prev => ({ ...prev, stage: v }))}
                                        disabled={!!editingTask?.isSystem}
                                    >
                                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {TASK_STAGES.map(stage => {
                                                const unlocked = isStageUnlocked(stage)
                                                return (
                                                    <SelectItem key={stage} value={stage} disabled={enforceRules && !unlocked}>
                                                        <div className="flex items-center gap-2">
                                                            {enforceRules && !unlocked ? <Lock className="h-3 w-3 text-muted-foreground" /> : null}
                                                            <span>{stage}</span>
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium uppercase text-muted-foreground">Category</Label>
                                    <Select
                                        value={newTask.category}
                                        onValueChange={(v: any) => setNewTask(prev => ({ ...prev, category: v, minReferrals: undefined }))}
                                        disabled={!!editingTask?.isSystem}
                                    >
                                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {availableCategories.map(cat => <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Quick Add Suggestions */}
                            {suggestedTasks.length > 0 && !editingTask && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-yellow-500" /> Quick Add for {newTask.stage}
                                    </Label>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedTasks.map((suggestion, i) => (
                                            <Button
                                                key={i}
                                                variant="secondary"
                                                size="sm"
                                                className="text-xs h-7 bg-muted/50 hover:bg-muted"
                                                onClick={() => handleUseSuggestedTaskInternal(suggestion)}
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                {suggestion.title}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase text-muted-foreground">Task Details</Label>
                                {isSocialTemplate ? (
                                    <div className="p-3 border border-blue-500/20 rounded-lg bg-blue-500/10 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-blue-400">Platform</Label>
                                                <Select
                                                    value={newTask.targetPlatform}
                                                    onValueChange={(v: SocialPlatform) => setNewTask(prev => ({
                                                        ...prev, targetPlatform: v,
                                                        title: prev.action ? generateSocialTaskTitle(v, prev.action) : prev.title
                                                    }))}
                                                >
                                                    <SelectTrigger className="h-8 bg-background border-blue-500/30"><SelectValue placeholder="Select" /></SelectTrigger>
                                                    <SelectContent>{SOCIAL_PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-blue-400">Action</Label>
                                                <Select
                                                    value={newTask.action}
                                                    onValueChange={(v) => setNewTask(prev => ({
                                                        ...prev, action: v,
                                                        title: prev.targetPlatform ? generateSocialTaskTitle(prev.targetPlatform, v) : prev.title
                                                    }))}
                                                >
                                                    <SelectTrigger className="h-8 bg-background border-blue-500/30"><SelectValue placeholder="Select" /></SelectTrigger>
                                                    <SelectContent>{SOCIAL_ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <Input value={newTask.title || ""} disabled className="h-8 bg-background/50 border-blue-500/30 text-sm font-medium" />
                                    </div>
                                ) : (
                                    <Input
                                        className="bg-background"
                                        placeholder="Task Title (e.g., Join Telegram Group)"
                                        value={newTask.title || ""}
                                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                                        disabled={!!editingTask?.isSystem}
                                    />
                                )}
                            </div>

                            {/* Points & URL Row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium uppercase text-muted-foreground">Points</Label>
                                    <Input
                                        type="number"
                                        className="bg-background"
                                        value={newTask.points ?? ""}
                                        onChange={(e) => setNewTask(prev => ({ ...prev, points: e.target.value }))}
                                        disabled={!!editingTask?.isSystem}
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs font-medium uppercase text-muted-foreground">Action URL (Optional)</Label>
                                    <Input
                                        className="bg-background"
                                        placeholder="https://..."
                                        value={newTask.url ?? ""}
                                        onChange={(e) => setNewTask(prev => ({ ...prev, url: e.target.value }))}
                                        disabled={!!editingTask?.isSystem}
                                    />
                                </div>
                            </div>

                            {/* Verification Select */}
                           <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase text-muted-foreground flex justify-between">
                                    Verification Method
                                    {newTask.verificationType === 'none' && (
                                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[10px]">
                                            Auto-complete on Click
                                        </Badge>
                                    )}
                                </Label>
                                <Select 
                                    value={newTask.verificationType || "manual_link"} 
                                    onValueChange={(v: VerificationType) => setNewTask(prev => ({ ...prev, verificationType: v }))}
                                    disabled={!!editingTask?.isSystem}
                                >
                                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {/* Auto options */}
                                        <SelectItem value="auto_social" disabled={!isSocialOrReferral}>API Auto-Verify (X/Discord)</SelectItem>
                                        <SelectItem value="auto_tx" disabled={!isTrading && !isSocialOrReferral}>On-chain Auto-Verify</SelectItem>
                                        
                                        {/* Manual options */}
                                        <SelectItem value="manual_upload">Manual Review (Recommended for {newTask.targetPlatform})</SelectItem>
                                        <SelectItem value="manual_link">Link Submission Only</SelectItem>
                                        
                                        {/* The "Mark as done on click" option */}
                                        <SelectItem value="none">Auto-mark as Done (on click)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {['Instagram', 'Youtube', 'Telegram'].includes(newTask.targetPlatform || '') && newTask.verificationType === 'none' && (
                                    <p className="text-[10px] text-yellow-600 italic">
                                        Note: "Auto" for this platform only tracks the click. Manual Review is safer.
                                    </p>
                                )}
                            </div>

                            {/* Add Button */}
                            <div className="pt-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Switch 
                                        id="req" 
                                        checked={newTask.required} 
                                        onCheckedChange={(c) => setNewTask(prev => ({ ...prev, required: c }))} 
                                        disabled={!!editingTask?.isSystem}
                                    />
                                    <Label htmlFor="req" className="text-sm text-muted-foreground">Mandatory Task</Label>
                                </div>
                                <div className="flex gap-2">
                                    {editingTask && <Button variant="ghost" onClick={() => { setEditingTask(null); setNewTask(initialNewTaskForm); }}>Cancel</Button>}
                                    {editingTask?.isSystem ? (
                                        <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 px-3 py-2 rounded">
                                            <ShieldAlert className="h-4 w-4" /> System tasks cannot be edited.
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={async () => {
                                                const taskToSave = newTask as QuestTask;
                                                
                                                if (!taskToSave.title || !taskToSave.points || (enforceRules && !editingTask && isAtMax)) {
                                                    return; // validation failed
                                                }

                                                try {
                                                    if (editingTask) {
                                                        // Preserve the original ID (it was copied when editing started)
                                                        await handleUpdateTask(taskToSave);
                                                        toast.success("Task updated — progress auto-saved");
                                                    } else {
                                                        await handleAddTask(taskToSave);
                                                        toast.success("Task added — progress auto-saved");
                                                    }
                                                } catch (e) {
                                                    toast.error("Failed to save task");
                                                } finally {
                                                    setEditingTask(null);
                                                    setNewTask(initialNewTaskForm);
                                                }
                                            }}
                                            disabled={!newTask.title || !newTask.points || (enforceRules && !editingTask && isAtMax)}
                                        >
                                            {editingTask ? "Save Changes" : <><Plus className="mr-2 h-4 w-4" /> Add Task</>}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: Stage Tree & List */}
                <div className="lg:col-span-5 flex flex-col h-full gap-6">
                    <Card className="flex-1 border-border/50 shadow-sm bg-card flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" /> Stages</span>
                                <Badge variant="outline" className="font-normal">{newQuest.tasks.length} Tasks Total</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto pr-1 space-y-6">
                            {TASK_STAGES.map((stage, index) => {
                                const totalPoints = stageTotals[stage] || 0
                                const count = stageTaskCounts[stage] || 0
                                const reqPass = stagePassRequirements[stage]
                                const isLocked = enforceRules && count < STAGE_TASK_REQUIREMENTS[stage].min
                                const stageTasks = newQuest.tasks.filter((t: QuestTask) => t.stage === stage)

                                return (
                                    <div key={stage} className={`relative pl-4 ${index !== TASK_STAGES.length - 1 ? 'border-l-2 border-muted pb-6' : ''}`}>
                                        <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background ${isLocked ? 'border-muted' : 'border-primary'}`} />

                                        <div className={`mb-3 p-3 rounded-lg border ${isLocked ? 'bg-muted/30 border-muted' : 'bg-card dark:bg-slate-900 border-border shadow-sm'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className={`text-sm font-semibold ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                        {stage}
                                                    </h4>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                        {count} Tasks • {totalPoints} Pts
                                                    </p>
                                                </div>
                                                {isLocked ? <Lock className="h-4 w-4 text-muted-foreground/50" /> : <Unlock className="h-4 w-4 text-green-500" />}
                                            </div>

                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                                                <Label className="text-[10px] whitespace-nowrap text-muted-foreground flex items-center gap-1">
                                                    <Percent className="h-3 w-3" /> Pass Requirement (70%)
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono text-xs bg-muted/30">
                                                        {reqPass} Pts
                                                    </Badge>
                                                    <Lock className="h-3 w-3 text-muted-foreground/40" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            {stageTasks.map((t: QuestTask) => (
                                                <div key={t.id} className={`group flex items-center justify-between p-2 rounded border transition-all ${t.isSystem ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' : 'bg-muted/20 hover:bg-muted/40 border-transparent hover:border-border/50'}`}>
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {t.isSystem ? (
                                                            t.isRecurring ? <CalendarClock className="h-3 w-3 text-blue-500" /> : <Users className="h-3 w-3 text-blue-500" />
                                                        ) : (
                                                            <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                                                        )}
                                                        <span className={`text-xs truncate text-foreground/90 ${t.required ? 'font-medium' : ''}`}>
                                                            {t.title}
                                                        </span>
                                                        {t.required && <Badge variant="destructive" className="h-1.5 w-1.5 rounded-full p-0" />}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono text-muted-foreground">{t.points}</span>
                                                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                                            {t.isSystem ? (
                                                                <Lock className="h-3 w-3 text-muted-foreground" />
                                                            ) : (
                                                                <>
                                                                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { setEditingTask(t); setNewTask(t); }}>
                                                                        <Settings className="h-3 w-3 text-muted-foreground" />
                                                                    </Button>
                                                                    <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-5 w-5 hover:bg-red-500/10 text-destructive"
                                                                            onClick={async () => await handleRemoveTask(t.id)}  // ← Made async
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
                
            <div className="flex justify-center pt-8 border-t border-border/50">
                <Button 
                size="lg" 
                className="w-full sm:w-auto min-w-[200px]" 
                onClick={handleDeployAndFinalize} 
                disabled={!canFinalize}
            >
                {!hasUserTask ? "Add at least 1 custom task" : 
                timingErrors.length > 0 ? "Fix timing errors" : 
                isDeploying ? "Creating Quest..." : "Create & Finalize Quest"}
            </Button>
            </div>
        </div>
    )
}