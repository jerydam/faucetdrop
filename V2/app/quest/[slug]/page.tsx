"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { QuestEditPanel } from "@/components/quest/questedit";
import { QUEST_ABI } from "@/lib/abis";
import { claimNoCodeViaBackend } from "@/lib/backend-service";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Trophy,
  Shield,
  Save,
  Edit2,
  X,
  Upload,
  Lock,
  ImageIcon,
  UserCircle,
  AlertTriangle,
  Coins,
  Sparkles,
  Gift,
  ZoomIn,
  Wallet,
  Copy,
  CalendarClock,
  Users,
  Twitter,
  Play,
  Link,
  Zap,
  MessageCircle,
  Send,
  UserPlus,
  LogIn,
  ArrowLeftRight,
  Rocket,
  MessageSquareText,
  Check,
  ShieldCheck,
  ArrowLeft,
  Settings2,
  Settings,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";
import { Contract, BrowserProvider, parseEther } from "ethers";
import { Header } from "@/components/header";
import { FAUCET_ABI_CUSTOM } from "@/lib/abis";

const API_BASE_URL = "https://faucetdrop-backend.onrender.com"; // <-- REPLACE WITH ACTUAL BACKEND URL

// ============= TYPES =============
export type VerificationType =
  | "auto_social"
  | "auto_tx"
  | "manual_link"
  | "manual_upload"
  | "manual_link_image" // <--- ADD THIS LINE
  | "system_referral"
  | "system_daily"
  | "system_x_share"
  | "none"
  | "onchain";

interface QuestTask {
  id: string;
  title: string;
  description: string;
  targetHandle?: string;
  points: number;
  category: string;
  targetContractAddress?: string;
  verificationType: VerificationType;
  url: string;
  stage: string;
  required: boolean;
  action: string;
  isSystem?: boolean;
  targetPlatform?: string;
  minAmount?: string | number;
  minTxCount?: string | number;
  minDays?: string | number;
  targetChainId?: string;
  startDate?: string;
  endDate?: string;
}

// ── UPDATED: StageMeta matches what backend now returns ──
interface StageMeta {
  stageTotal: number;        // total pts available in this stage (sum of all tasks)
  unlockThreshold: number;   // 70% of stageTotal — what user needs to advance
  userEarned: number;        // pts user has earned IN this stage
  isUnlocked: boolean;       // userEarned >= unlockThreshold → show badge, freeze bar
  isCurrent: boolean;        // this is the user's active stage right now
  stageIndex: number;
  isLastStage: boolean;
}

// ── UPDATED: UserProgress now includes new backend fields ──
interface UserProgress {
  totalPoints: number;
  stagePoints: Record<string, number>;
  completedTasks: string[];
  currentStage: string;
  submissions?: any[];

  // NEW fields from updated backend
  activeStages: string[];                      // only stages that have tasks, e.g. ["Beginner","Intermediate","Ultimate"]
  stageTotals: Record<string, number>;         // total pts available per stage
  stagesMeta: Record<string, StageMeta>;       // full per-stage breakdown
  currentStageEarned: number;
  currentStageTotal: number;
  currentStageThreshold: number;              // 70% of currentStageTotal
}

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  username: string | null;
  avatarUrl?: string | null;
  points: number;
  completedTasks: number;
}

interface UserProfile {
  wallet_address: string;
  username: string | null;
  avatar_url?: string;
  twitter_handle?: string;
}

interface ParticipantData {
  referral_id: string;
  referral_count: number;
  last_checkin_at: string | null;
  points: number;
}

// ============= COMPONENT =============
export default function QuestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const { address: userWalletAddress, provider: walletProvider } = useWallet();

  const rawSlug = (params.addresss || params.faucetAddress) as string | undefined;

  const refreshAllStats = async () => {
    if (!faucetAddress || !userWalletAddress) return;
    try {
      const progRes = await fetch(
        `${API_BASE_URL}/api/quests/${faucetAddress}/progress/${userWalletAddress}?t=${Date.now()}`,
        { cache: "no-store" }
      );
      const progJson = await progRes.json();
      if (progJson.success) {
        setUserProgress(progJson.progress);
        setParticipantData(prev => prev ? { ...prev, points: progJson.progress.totalPoints } : prev);
      }

      const lbRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard`);
      const lbJson = await lbRes.json();
      if (lbJson.success) setLeaderboard(lbJson.leaderboard);
    } catch (e) {
      console.error("refreshAllStats failed", e);
    }
  };

  // ============= STATE =============
  const [questData, setQuestData] = useState<any | null>(null);
  const [faucetAddress, setFaucetAddress] = useState<string | undefined>(undefined);
  const [isRefreshingUser, setIsRefreshingUser] = useState(false);

  const refreshParticipantData = async () => {
    setIsRefreshingUser(true);
    try {
      // Re-fetch the user's progress
      await loadUserProgress();
      
      // Optionally re-fetch the leaderboard if you have a standalone function for it
      // await fetchLeaderboard(); 
      
      toast.success("Progress & Leaderboard updated!");
    } catch (error) {
      toast.error("Failed to refresh data.");
    } finally {
      setIsRefreshingUser(false);
    }
  };
  // ── UPDATED default state includes new fields ──
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalPoints: 0,
    stagePoints: {},
    completedTasks: [],
    currentStage: "Beginner",
    submissions: [],
    activeStages: [],
    stageTotals: {},
    stagesMeta: {},
    currentStageEarned: 0,
    currentStageTotal: 0,
    currentStageThreshold: 0,
  });

  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hasOpenedLink, setHasOpenedLink] = useState<Record<string, boolean>>({});
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [processingSubmission, setProcessingSubmission] = useState<{ id: string, action: string } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [hasUsername, setHasUsername] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<QuestTask | null>(null);
  const [submissionData, setSubmissionData] = useState({
    proofUrl: "",
    notes: "",
    file: null as File | null,
  });
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState<string>("");

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    rewardPool: "",
    imageUrl: "",
    isActive: true,
  });

  const isCreator =
    userWalletAddress &&
    questData &&
    questData.creatorAddress.toLowerCase() === userWalletAddress.toLowerCase();

  // ── UPDATED: use activeStages from backend instead of hardcoded list ──
  // Fall back to the full list only when progress hasn't loaded yet
  const ALL_STAGES = ["Beginner", "Intermediate", "Advance", "Legend", "Ultimate"];
  const activeStages = userProgress.activeStages?.length > 0
    ? userProgress.activeStages
    : ALL_STAGES;

  useEffect(() => {
    const slug = params.slug as string;
    if (!slug) return;

    const loadQuestBySlug = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/quests/by-slug/${slug}?t=${Date.now()}`, { cache: "no-store" });
        const json = await response.json();

        if (json.success && json.quest) {
          setQuestData(json.quest);
          setFaucetAddress(json.quest.faucetAddress);
          setEditForm({
            title: json.quest.title,
            description: json.quest.description,
            rewardPool: json.quest.rewardPool,
            imageUrl: json.quest.imageUrl || "",
            isActive: json.quest.isActive,
          });
        } else {
          toast.error("Quest not found");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to load quest details");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestBySlug();
  }, [params.slug]);

  useEffect(() => {
    if (!faucetAddress) return;
    const loadLiveStats = async () => {
      try {
        const lbRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard`);
        const lbJson = await lbRes.json();
        if (lbJson.success) setLeaderboard(lbJson.leaderboard);
      } catch (e) {
        console.error("Leaderboard fetch failed", e);
      }
    };
    loadLiveStats();
  }, [faucetAddress]);

  useEffect(() => {
    if (!faucetAddress || !userWalletAddress || !hasUsername) return;
    const fetchUserSpecifics = async () => {
      try {
        const progRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/progress/${userWalletAddress}`);
        const progJson = await progRes.json();
        if (progJson.success) setUserProgress(progJson.progress);

        if (isCreator) {
          const pendingRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions/pending`);
          const pendingJson = await pendingRes.json();
        }
      } catch (e) {
        console.error("Progress fetch failed", e);
      }
    };
    fetchUserSpecifics();
  }, [faucetAddress, userWalletAddress, hasUsername, isCreator]);

  const tokenSymbol = questData?.tokenSymbol || "Tokens";

  const rewardPoolAmount = parseFloat(questData?.rewardPool || "0");
  const platformFeePercentage = 0.05;
  const requiredFee = rewardPoolAmount * platformFeePercentage;
  const totalRequired = rewardPoolAmount + requiredFee;

  const isValidFundingAmount = useMemo(() => {
    const input = parseFloat(fundAmount || "0");
    return Math.abs(input - totalRequired) < 0.0001;
  }, [fundAmount, totalRequired]);

  const claimStatus = useMemo(() => {
    if (!questData || !questData.endDate) return { isActive: false, message: "Not started" };
    const endDate = new Date(questData.endDate);
    const claimWindowEnd = new Date(endDate.getTime() + (questData.claimWindowHours || 168) * 60 * 60 * 1000);
    const now = new Date();
    if (now < endDate) return { isActive: false, message: "Quest active" };
    if (now > claimWindowEnd) return { isActive: false, message: "Claim ended" };
    return { isActive: true, message: "Claim Live" };
  }, [questData]);

  const allParticipants = leaderboard.filter(
    (entry) => entry.walletAddress.toLowerCase() !== questData?.creatorAddress.toLowerCase()
  );

  const totalPoints = participantData?.points || 0;

  const loadUserProgress = async () => {
    if (!faucetAddress || !userWalletAddress) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/quests/${faucetAddress}/progress/${userWalletAddress}?t=${Date.now()}`,
        { cache: "no-store", credentials: "include" }
      );
      const json = await res.json();
      if (json.success) {
        setUserProgress(json.progress);
      }
    } catch (e) {
      console.error("Reload failed", e);
    }
  };
const [isRefreshingAdmin, setIsRefreshingAdmin] = useState(false);

  const refreshAdminData = async () => {
    if (!faucetAddress) return;
    setIsRefreshingAdmin(true);
    try {
      // 1. Refresh Pending Submissions
      const pendingRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions/pending?t=${Date.now()}`, { cache: "no-store" });
      const pendingJson = await pendingRes.json();
      
      if (pendingJson.success) {
        const rawSubmissions = pendingJson.submissions;
        const enrichedSubmissions = await Promise.all(
          rawSubmissions.map(async (sub: any) => {
            const relatedTask = questData?.tasks?.find((t: any) => t.id === sub.taskId);
            const taskPoints = relatedTask ? relatedTask.points : 0;
            try {
              const profileRes = await fetch(`${API_BASE_URL}/api/profile/${sub.walletAddress}?t=${Date.now()}`, { cache: "no-store" });
              const profileJson = await profileRes.json();
              return {
                ...sub,
                taskPoints,
                username: profileJson.success && profileJson.profile ? profileJson.profile.username : "Unknown User",
                avatarUrl: profileJson.success && profileJson.profile ? profileJson.profile.avatar_url : null,
              };
            } catch {
              return { ...sub, taskPoints, username: "Unknown User", avatarUrl: null };
            }
          })
        );
        setPendingSubmissions(enrichedSubmissions);
      }

      // 2. Refresh Leaderboard (Updates Total Participants stat)
      const lbRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard?t=${Date.now()}`, { cache: "no-store" });
      const lbJson = await lbRes.json();
      if (lbJson.success) setLeaderboard(lbJson.leaderboard);

      toast.success("Dashboard refreshed!");
    } catch (error) {
      toast.error("Failed to refresh data.");
    } finally {
      setIsRefreshingAdmin(false);
    }
  };
  // ============= HANDLERS =============
  const handleXShareAction = (task: QuestTask) => {
    // If the admin set a specific handle in the task, use it, otherwise default to @FaucetDrops
    const targetHandle = task.targetHandle ? `@${task.targetHandle.replace('@', '')}` : "@FaucetDrops";
    
    // Fallback safely just in case they don't have a referral ID
    const refParam = participantData?.referral_id ? `?ref=${participantData.referral_id}` : "";
    const referralLink = `${window.location.origin}${window.location.pathname}${refParam}`;
    
    const message = `I am participating in a quest on ${targetHandle}. Join me and earn rewards here: ${referralLink}`;
    const xIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(message)}`;
    
    window.open(xIntentUrl, "_blank");
  };

  const handleJoin = async () => {
    if (!userWalletAddress || !faucetAddress) return;
    setIsJoining(true);
    try {
      const payload = { walletAddress: userWalletAddress, referralCode: refCode || null };
      const res = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        if (json.participant) {
          setParticipantData(json.participant);
        } else if (json.referralId) {
          setParticipantData((prev) =>
            prev
              ? { ...prev, referral_id: json.referralId }
              : { referral_id: json.referralId, referral_count: 0, last_checkin_at: null, points: 0 }
          );
        }
        toast.success("Successfully joined the Quest!");
        if (refCode) toast.success("Referral Bonus applied if code was valid.");
        await loadUserProgress();
      } else {
        toast.error(json.message || "Join failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Join failed");
    } finally {
      setIsJoining(false);
    }
  };

  const handleDailyCheckin = async () => {
    if (!userWalletAddress || !faucetAddress || isCreator) return;
    setIsCheckingIn(true);
    try {
      const payload = { walletAddress: userWalletAddress };
      const res = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Check-in successful! +10 points awarded.");
        if (json.participant) {
          setParticipantData(json.participant);
        } else {
          setParticipantData((prev) =>
            prev ? { ...prev, last_checkin_at: new Date().toISOString(), points: (prev.points || 0) + 10 } : null
          );
        }
        await loadUserProgress();
      } else {
        toast.error(json.message || "Cannot check in yet");
      }
    } catch (e: any) {
      toast.error("Check-in failed");
    } finally {
      setIsCheckingIn(false);
    }
  };
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const getCheckinStatus = () => {
    if (!participantData?.last_checkin_at) return { canCheckin: true, message: "Check in now for +10 points!" };
    const last = new Date(participantData.last_checkin_at);
    const next = new Date(last.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    if (now >= next) return { canCheckin: true, message: "Available now!" };
    const remainingMs = next.getTime() - now.getTime();
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return { canCheckin: false, message: `Next check-in in ${hours}h ${minutes}m` };
  };

  useEffect(() => {
    if (!hasUsername || !userWalletAddress || !faucetAddress || participantData) return;
    handleJoin();
  }, [hasUsername, userWalletAddress, faucetAddress]);

  useEffect(() => {
    if (!userWalletAddress) { setIsProfileLoading(false); return; }
    const checkProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/profile/${userWalletAddress}`);
        const data = await res.json();
        if (data.success && data.profile) {
          setUserProfile(data.profile);
          setHasUsername(!!data.profile.username);
        } else {
          setUserProfile(null);
          setHasUsername(false);
        }
      } catch (error) {
        console.error("Profile check failed", error);
      } finally {
        setIsProfileLoading(false);
      }
    };
    checkProfile();
  }, [userWalletAddress]);

  useEffect(() => {
    if (!faucetAddress) return;
    const loadGlobalData = async () => {
      setIsLoading(true);
      try {
        const questRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}?t=${Date.now()}`, { cache: "no-store" });
        const questJson = await questRes.json();
        if (questJson.success) setQuestData(questJson.quest);

        const lbRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard`);
        const lbJson = await lbRes.json();
        if (lbJson.success) setLeaderboard(lbJson.leaderboard);
      } catch (error) {
        console.error("Leaderboard fetch failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGlobalData();
  }, [faucetAddress]);

  const questTiming = useMemo(() => {
    if (!questData || !questData.startDate || !questData.endDate) {
      return { isLive: false, notStartedYet: true, isEnded: false };
    }
    const now = new Date();
    const start = new Date(questData.startDate);
    const end = new Date(questData.endDate);
    return {
      isLive: now >= start && now <= end && questData.isActive,
      notStartedYet: now < start,
      isEnded: now > end,
      isPaused: !questData.isActive,
    };
  }, [questData]);

  const displayLeaderboard = useMemo(() => {
    let list = [...leaderboard];
    if (userWalletAddress && participantData && !isCreator) {
      const myWalletLower = userWalletAddress.toLowerCase();
      const myLatestEntry = {
        rank: 0,
        walletAddress: userWalletAddress,
        username: userProfile?.username || "You",
        avatarUrl: userProfile?.avatar_url || null,
        points: participantData.points || 0,
        completedTasks: userProgress?.completedTasks?.length || 0,
      };
      const myIndex = list.findIndex(e => e.walletAddress.toLowerCase() === myWalletLower);
      if (myIndex !== -1) {
        list[myIndex] = { ...list[myIndex], ...myLatestEntry, rank: list[myIndex].rank || 0 };
      } else {
        list.push(myLatestEntry);
      }
    }
    return list
      .filter(entry => {
        const entryWallet = entry.walletAddress.toLowerCase();
        const creatorWallet = questData?.creatorAddress?.toLowerCase();
        return entryWallet !== creatorWallet;
      })
      .sort((a, b) => b.points - a.points)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [leaderboard, participantData, userProgress, userWalletAddress, userProfile, questData, isCreator]);

  useEffect(() => {
    if (!faucetAddress || !userWalletAddress || !hasUsername) return;
    const fetchUserSpecifics2 = async () => {
      try {
        const progRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/progress/${userWalletAddress}`);
        const progJson = await progRes.json();
        if (progJson.success) setUserProgress(progJson.progress);
        if (isCreator) {
          const pendingRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions/pending`);
          const pendingJson = await pendingRes.json();
          if (pendingJson.success) {
            const rawSubmissions = pendingJson.submissions;
            const enrichedSubmissions = await Promise.all(
              rawSubmissions.map(async (sub: any) => {
                const relatedTask = questData?.tasks?.find((t: any) => t.id === sub.taskId);
                const taskPoints = relatedTask ? relatedTask.points : 0;
                try {
                  const profileRes = await fetch(`${API_BASE_URL}/api/profile/${sub.walletAddress}`);
                  const profileJson = await profileRes.json();
                  return {
                    ...sub,
                    taskPoints,
                    username: profileJson.success && profileJson.profile ? profileJson.profile.username : "Unknown User",
                    avatarUrl: profileJson.success && profileJson.profile ? profileJson.profile.avatar_url : null,
                  };
                } catch {
                  return { ...sub, taskPoints, username: "Unknown User", avatarUrl: null };
                }
              })
            );
            setPendingSubmissions(enrichedSubmissions);
          }
        }
      } catch (error) {
        console.error("Failed to load user specific data", error);
      }
    };
    fetchUserSpecifics2();
  }, [faucetAddress, userWalletAddress, isCreator, hasUsername, questData]);

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const result = await response.json();
      if (result.success) {
        setQuestData((prev: any) => ({ ...prev, ...editForm }));
        setIsEditing(false);
        toast.success("Quest details updated.");
      }
    } catch (error) {
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("File size exceeds 2MB limit."); e.target.value = ""; return; }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width > 2048 || img.height > 2048) {
        toast.error("Image dimensions exceed 2048x2048px limit.");
        e.target.value = "";
        setSubmissionData((prev) => ({ ...prev, file: null }));
      } else {
        setSubmissionData((prev) => ({ ...prev, file }));
      }
    };
  };

  const handleSubmitTask = async () => {
    if (!selectedTask || !userWalletAddress) return;
    setSubmittingTaskId(selectedTask.id);

    const cancelSubmission = async (submissionId: string) => {
      try {
        await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions/${submissionId}`, { method: "DELETE" });
      } catch {}
      await loadUserProgress();
    };

    try {
      const formData = new FormData();
      formData.append("walletAddress", userWalletAddress);
      formData.append("taskId", selectedTask.id);
      
      // 🚨 FIX 2: Smart Fallback for Unsupported Auto-Verify Platforms
      // If it's auto_social but NOT Twitter/Discord/Telegram, force it to behave like manual_link_image
      let actualSubmissionType = selectedTask.verificationType;
      const isUnsupportedAuto = actualSubmissionType === "auto_social" && !['Twitter', 'Discord', 'Telegram'].includes(selectedTask.targetPlatform || '');
      
      if (isUnsupportedAuto) {
        actualSubmissionType = "manual_link_image";
      }
      
      formData.append("submissionType", actualSubmissionType);

      // Safely grab the link if the task requires one
      let finalProofUrl = "";
      const requiresLinkInput = 
        ['manual_link', 'manual_link_image', 'system_x_share', 'auto_tx'].includes(actualSubmissionType) ||
        (selectedTask.category === 'trading' && !['onchain', 'none', 'manual_upload'].includes(actualSubmissionType)) ||
        (actualSubmissionType === 'auto_social' && ['quote', 'comment'].includes(selectedTask.action));

      if (requiresLinkInput) {
        finalProofUrl = submissionData.proofUrl.trim();
      }

      formData.append("submittedData", finalProofUrl);
      formData.append("notes", submissionData.notes.trim());

      // 🚨 FIX 1: ACTUALLY APPEND THE IMAGE FILE TO THE REQUEST!
      if (submissionData.file) {
        formData.append("file", submissionData.file);
      }

      const response = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions`, { 
        method: "POST", 
        body: formData 
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Failed to submit task");

      const submissionId = result.submissionId;

      if (selectedTask.verificationType === "auto_social" && selectedTask.targetPlatform === "Telegram") {
        const verifyRes = await fetch(`${API_BASE_URL}/api/bot/verify-telegram`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, faucetAddress, walletAddress: userWalletAddress, taskUrl: selectedTask.url, taskAction: selectedTask.action }),
        });
        const verifyJson = await verifyRes.json();
        if (verifyJson.verified) {
          toast.success("✅ Telegram membership verified! Points awarded.");
          await refreshAllStats();
          setShowSubmitModal(false);
          setSubmissionData({ proofUrl: "", notes: "", file: null });
        } else {
          await cancelSubmission(submissionId);
          if (verifyJson.reason === "telegram_not_linked") {
            toast.error("⚠️ Connect your Telegram in Profile Settings first.", { action: { label: "Open Profile", onClick: () => router.push(`/dashboard/${userWalletAddress}`) } });
          } else if (verifyJson.reason === "not_member") {
            toast.error("❌ You are not a member of this channel yet. Join first then try again.");
          } else if (verifyJson.reason === "bot_not_admin") {
            toast.error("❌ Bot verification unavailable for this channel. Contact the quest creator.");
          } else {
            toast.error("❌ " + (verifyJson.message || "Verification failed. Please try again."));
          }
        }
      } else if (selectedTask.verificationType === "auto_social" && selectedTask.targetPlatform === "Discord") {
        const verifyRes = await fetch(`${API_BASE_URL}/api/bot/verify-discord`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, faucetAddress, walletAddress: userWalletAddress, taskId: selectedTask.id, taskUrl: selectedTask.url, taskAction: selectedTask.action }),
        });
        const verifyJson = await verifyRes.json();
        if (verifyJson.verified) {
          toast.success(verifyJson.message || "✅ Discord task verified! Points awarded.");
          await refreshAllStats();
          setShowSubmitModal(false);
          setSubmissionData({ proofUrl: "", notes: "", file: null });
        } else {
          await cancelSubmission(submissionId);
          if (verifyJson.reason === "discord_not_linked") {
            toast.error("⚠️ Connect your Discord in Profile Settings first.", { action: { label: "Open Profile", onClick: () => router.push(`/dashboard/${userWalletAddress}`) } });
          } else if (verifyJson.reason === "missing_role") {
            toast.error(verifyJson.message || "❌ You do not have the required role yet.");
          } else if (verifyJson.reason === "not_member") {
            toast.error("❌ You have not joined this Discord server yet.");
          } else if (verifyJson.reason === "bot_not_in_server") {
            toast.error("❌ The FaucetDrops Bot is not in this server. Contact the creator.");
          } else {
            toast.error("❌ " + (verifyJson.message || "Verification failed. Please try again."));
          }
        }
      } else if (selectedTask.verificationType === "system_x_share") {
        const verifyRes = await fetch(`${API_BASE_URL}/api/tasks/verify-x-share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, walletAddress: userWalletAddress, taskId: selectedTask.id, proofUrl: finalProofUrl, requiredTag: "@FaucetDrops" }),
        });
        const verifyJson = await verifyRes.json();
        if (verifyJson.verified) {
          toast.success(verifyJson.message || "✅ Share verified! Points added.");
          await refreshAllStats();
          setShowSubmitModal(false);
          setSubmissionData({ proofUrl: "", notes: "", file: null });
        } else {
          await cancelSubmission(submissionId);
          toast.error("❌ " + (verifyJson.message || "Verification failed. Ensure you included @FaucetDrops and try again."));
        }
      } else if (selectedTask.verificationType === "auto_social" && selectedTask.targetPlatform === "Twitter") {
        let endpoint = "";
        let payload: any = { walletAddress: userWalletAddress, taskId: selectedTask.id, submissionId };
        if (selectedTask.action === "quote") {
          endpoint = "/api/tasks/verify-x-quote";
          payload.proofUrl = finalProofUrl;
        } else {
          endpoint = "/api/tasks/verify-x";
          payload.submittedHandle = userProfile?.twitter_handle || userProfile?.username || "";
        }
        const verifyRes = await fetch(`${API_BASE_URL}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const verifyJson = await verifyRes.json();
        if (verifyJson.verified) {
          toast.success(verifyJson.message || "✅ Task verified! Points added.");
          await refreshAllStats();
          setShowSubmitModal(false);
          setSubmissionData({ proofUrl: "", notes: "", file: null });
        } else {
          await cancelSubmission(submissionId);
          toast.error("❌ " + (verifyJson.message || "Verification failed. Please complete the action and try again."));
        }
      } else if (selectedTask.verificationType === "auto_social") {
        const verifyRes = await fetch(`${API_BASE_URL}/api/bot/verify-social`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, faucetAddress, walletAddress: userWalletAddress, handle: userProfile?.twitter_handle || userProfile?.username || "", proofUrl: finalProofUrl, taskType: selectedTask.action }),
        });
        const verifyJson = await verifyRes.json();
        if (verifyJson.verified) {
          toast.success("✅ Task verified! Points added.");
          await refreshAllStats();
          setShowSubmitModal(false);
          setSubmissionData({ proofUrl: "", notes: "", file: null });
        } else {
          await cancelSubmission(submissionId);
          toast.error("❌ " + (verifyJson.message || "Verification failed. Complete the action then try again."));
        }
      } else if (selectedTask.verificationType === "none") {
        toast.success("✅ Task completed! Points added.");
        await refreshAllStats();
        setShowSubmitModal(false);
        setSubmissionData({ proofUrl: "", notes: "", file: null });
      } else if (selectedTask.verificationType === "onchain") {
        toast.success("✅ Wallet verified on-chain! Points added.");
        await refreshAllStats();
        setShowSubmitModal(false);
        setSubmissionData({ proofUrl: "", notes: "", file: null });
      } else {
        toast.info("📋 Task submitted for manual review.");
        await refreshAllStats();
        setShowSubmitModal(false);
        setSubmissionData({ proofUrl: "", notes: "", file: null });
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred. Please try again.");
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const handleReviewSubmission = async (submissionId: string, status: "approved" | "rejected") => {
    // FIX: Track both ID and Action
    setProcessingSubmission({ id: submissionId, action: status });
    try {
      const response = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (result.success) {
        setPendingSubmissions((prev) => prev.filter((s) => s.submissionId !== submissionId));
        toast.success(`Submission ${status}`);
        await loadUserProgress(); // Refresh global points
      } else {
        toast.error(result.message || "Action failed.");
      }
    } catch (error) {
      toast.error("Network error. Action failed.");
    } finally {
      setProcessingSubmission(null);
    }
  };

  const handleFundQuest = async () => {
    if (!walletProvider || !faucetAddress) { toast.error("Wallet not connected."); return; }
    setIsFunding(true);
    try {
      const provider = walletProvider as BrowserProvider;
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const baseAmountWei = parseEther(rewardPoolAmount.toString());
      const totalAmountWei = baseAmountWei + (baseAmountWei * 7n) / 100n;
      const tokenAddress = questData.tokenAddress;
      const ERC20_ABI = [
        "function approve(address s, uint256 a) public returns (bool)",
        "function balanceOf(address a) public view returns (uint256)",
        "function allowance(address o, address s) public view returns (uint256)",
      ];
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
      const balance = await tokenContract.balanceOf(userAddress);
      if (balance < totalAmountWei) throw new Error("Insufficient token balance for prize + fees.");
      const currentAllowance = await tokenContract.allowance(userAddress, faucetAddress);
      if (currentAllowance < totalAmountWei) {
        toast.info("Approving tokens...");
        const appTx = await tokenContract.approve(faucetAddress, totalAmountWei);
        await appTx.wait();
      }
      const questContract = new Contract(faucetAddress, QUEST_ABI, signer);
      const tx = await questContract.fund(baseAmountWei);
      toast.info("Funding transaction sent...");
      await tx.wait();
      await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/set-funded`, { method: 'POST' });
      toast.success("Quest funded and activated!");
      setQuestData((prev: any) => ({ ...prev, isFunded: true }));
      setShowFundModal(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.reason || error.message || "Funding failed");
    } finally {
      setIsFunding(false);
    }
  };

  const handleClaimReward = async () => {
    if (!walletProvider || !userWalletAddress || !faucetAddress) return;
    setIsClaiming(true);
    try {
      const provider = walletProvider as BrowserProvider;
      const result = await claimNoCodeViaBackend(userWalletAddress, faucetAddress, provider);
      if (result.success) {
        toast.success("Reward distributed successfully!");
        await loadUserProgress();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Claim process failed");
    } finally {
      setIsClaiming(false);
    }
  };

  const questStatusGuard = useMemo(() => {
    const now = new Date();
    const start = questData?.startDate ? new Date(questData.startDate) : null;
    if (!questData?.isFunded) return { blocked: true, title: "Quest Unfunded", desc: "The creator has not funded the reward pool yet." };
    if (start && now < start) return { blocked: true, title: "Coming Soon", desc: `This quest starts on ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}.` };
    return { blocked: false };
  }, [questData]);

  // ── UPDATED getTaskStatus: uses activeStages + stagesMeta from backend ──
  const getTaskStatus = (task: QuestTask) => {
    if (!participantData) return "locked";

    const currentTaskId = task.id || (task as any)._id;
    if (!currentTaskId) return "available";

    if (userProgress.completedTasks.includes(currentTaskId)) return "completed";

    const pending = userProgress.submissions?.find((s: any) => {
      const submissionTaskId = s.taskId || s.task_id;
      return String(submissionTaskId) === String(currentTaskId) &&
             ["pending", "auto_verifying"].includes(s.status);
    });
    if (pending) return "pending";

    // ── NEW LOGIC: use activeStages from backend ──
    // If this task's stage is not in activeStages, it doesn't exist for this quest
    const taskStage = task.stage;
    const questActiveStages = userProgress.activeStages || [];

    if (questActiveStages.length > 0 && !questActiveStages.includes(taskStage)) {
      return "locked"; // stage has no tasks in this quest
    }

    // Use stagesMeta if available (new backend), otherwise fall back to old index logic
    if (userProgress.stagesMeta && Object.keys(userProgress.stagesMeta).length > 0) {
      const taskStageMeta = userProgress.stagesMeta[taskStage];
      if (!taskStageMeta) return "locked";

      // Task is accessible if its stage is current or already unlocked
      if (taskStageMeta.isCurrent || taskStageMeta.isUnlocked) return "available";

      // Future stage: only accessible if the previous active stage is unlocked
      const stageIdx = questActiveStages.indexOf(taskStage);
      if (stageIdx <= 0) return "available"; // first active stage always accessible
      const prevStage = questActiveStages[stageIdx - 1];
      const prevMeta = userProgress.stagesMeta[prevStage];
      if (prevMeta?.isUnlocked) return "available"; // can see next stage's tasks

      return "locked";
    }

    // ── FALLBACK: old index-based logic (before backend update) ──
    const taskStageIndex = ALL_STAGES.indexOf(task.stage);
    const userStageIndex = ALL_STAGES.indexOf(userProgress.currentStage);
    if (taskStageIndex > userStageIndex) return "locked";
    return "available";
  };

  // ============= RENDER STATES =============
  if (isLoading || isProfileLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header pageTitle="Loading..." />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading Quest...</p>
        </div>
      </div>
    );
  }

  if (!userWalletAddress) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header pageTitle={questData?.title || "Quest Details"} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 relative overflow-hidden text-center">
            <CardHeader className="pb-2 pt-8">
              <div className="mx-auto bg-slate-100 dark:bg-slate-900 p-4 rounded-full mb-4 w-fit ring-1 ring-slate-200 dark:ring-slate-800">
                <Rocket className="h-10 w-10 text-slate-600 dark:text-slate-400" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Ready to Start?</CardTitle>
              <CardDescription className="text-base mt-2 mx-auto leading-relaxed">Sign in or create an account to view this Quest and participate.</CardDescription>
            </CardHeader>
            <CardFooter className="pt-4 flex justify-center pb-8">
              <p className="text-sm text-muted-foreground">Click the "Get Started" button in the header.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasUsername) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header pageTitle={questData?.title || "Profile Setup"} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-orange-100 dark:border-orange-900/50 bg-white dark:bg-slate-950 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />
            <CardHeader className="text-center pb-2 pt-8">
              <div className="mx-auto bg-orange-50 dark:bg-orange-900/20 p-4 rounded-full mb-4 w-fit ring-1 ring-orange-100 dark:ring-orange-800">
                <UserCircle className="h-10 w-10 text-orange-600 dark:text-orange-500" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Profile Setup Required</CardTitle>
              <CardDescription className="text-base mt-2 max-w-xs mx-auto leading-relaxed">To participate in Quests and earn rewards, you must set a unique <strong>Username</strong>.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <Button size="lg" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12" onClick={() => { const routeParam = userProfile?.username || userWalletAddress; if (routeParam) router.push(`/dashboard/${routeParam}`); }}>
                Update Profile Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!questData) return (<div className="flex flex-col min-h-screen"><Header pageTitle="Not Found" /><div className="p-10 text-center">Quest not found.</div></div>);

  // ============= PROGRESS BAR CALCULATION (UPDATED) =============
  const currentStage = userProgress.currentStage || "Beginner";
  const currentStageMeta = userProgress.stagesMeta?.[currentStage];

  // Use new backend fields if available, fall back to old logic
  const hasNewBackendData = currentStageMeta !== undefined;

  const pointsEarnedInCurrentStage = hasNewBackendData
    ? currentStageMeta.userEarned
    : (userProgress.stagePoints?.[currentStage] ?? 0);

  const unlockThreshold = hasNewBackendData
    ? currentStageMeta.unlockThreshold   // 70% of stage total
    : (questData?.stagePassRequirements?.[currentStage] ?? 0);

  const stageTotal = hasNewBackendData
    ? currentStageMeta.stageTotal        // 100% of stage tasks
    : unlockThreshold;

  const isCurrentStageUnlocked = hasNewBackendData
    ? currentStageMeta.isUnlocked
    : (unlockThreshold > 0 ? pointsEarnedInCurrentStage >= unlockThreshold : true);

  const isLastActiveStage = hasNewBackendData
    ? currentStageMeta.isLastStage
    : false;

  const pointsRemaining = Math.max(0, unlockThreshold - pointsEarnedInCurrentStage);

  // Progress bar: counts toward 70% threshold. Freezes at 100% once unlocked.
  const progressPercent = isCurrentStageUnlocked
    ? 100
    : unlockThreshold > 0
      ? Math.min(Math.round((pointsEarnedInCurrentStage / unlockThreshold) * 100), 99)
      : 100;

  const filteredLeaderboard = leaderboard.filter(
    (entry) => entry.walletAddress.toLowerCase() !== questData.creatorAddress.toLowerCase() && entry.points > 0
  );

  // ── Determine which stages to render in the Tasks tab ──
  // Only render stages that have tasks AND exist in activeStages (if available)
  const stagesToRender = hasNewBackendData
    ? userProgress.activeStages   // only stages with tasks, from backend
    : ALL_STAGES;                 // fallback: all stages (filter by task count happens below)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header pageTitle={questData.title} />

      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-8 pb-20 relative">
        {/* ============= HERO SECTION ============= */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl min-h-[300px]">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
            {editForm.imageUrl || questData.imageUrl ? (
              <img src={editForm.imageUrl || questData.imageUrl} alt="Background" className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
            ) : null}
          </div>

          <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start h-full">
            <div className="w-full md:w-64 h-64 shrink-0 rounded-lg overflow-hidden border-2 border-slate-700/50 shadow-xl bg-slate-950 flex items-center justify-center group relative">
              {isEditing ? (
                <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center p-4">
                  <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                  <Input className="bg-black/50 border-slate-600 text-white h-8 text-xs w-full" value={editForm.imageUrl} placeholder="Image URL..." onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} />
                </div>
              ) : (
                <img src={questData.imageUrl} alt="Quest Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              )}
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-full">
                  <div className="flex flex-col gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-4 w-full">
                        <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="text-3xl font-bold bg-white/10 border-white/20 text-white h-auto py-2" />
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10">
                          <Label className="text-white whitespace-nowrap">Active</Label>
                          <Switch checked={editForm.isActive} onCheckedChange={(c) => setEditForm({ ...editForm, isActive: c })} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{questData.title}</h1>
                        <Badge variant="secondary" className="bg-purple-100 text-blue-800 border-purple-200 flex items-center gap-1 shadow-sm h-6 px-3"><Sparkles className="h-3 w-3" /> Beta Phase</Badge>
                        <Badge variant={questData.isActive ? "default" : "destructive"} className="h-6 px-3">{questData.isActive ? "Live" : "Paused"}</Badge>
                        {questData.isFunded && <Badge className="bg-green-500 hover:bg-green-600 h-6 px-3">Funded</Badge>}
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="bg-white/10 border-white/20 text-slate-200 min-h-[100px]" />
                  ) : (
                    <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">{questData.description}</p>
                  )}
                </div>
                {isCreator && (
                  <div className="hidden md:block pl-4 space-y-2">
                    {isEditing ? (
                      <div className="flex gap-2 flex-col">
                        <Button size="sm" className="bg-green-600 hover:bg-green-500 w-full" onClick={handleSaveDetails} disabled={isSaving}>
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="w-full text-black bg-white/80 hover:bg-white">
                          <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button variant="secondary" size="sm" className="w-full" onClick={() => setIsEditing(true)}><Edit2 className="w-4 h-4 mr-2" /> Edit</Button>
                        {!questData.isFunded && (
                          <Button size="sm" onClick={() => { setFundAmount(""); setShowFundModal(true); }} className="w-full bg-green-600 hover:bg-green-700 text-white">
                            <Coins className="mr-2 h-4 w-4" /> Fund Quest
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4 items-end">
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-5 py-3 flex items-center gap-4 min-w-[160px]">
                    <div className="p-2 bg-yellow-500/20 rounded-full text-yellow-400"><Trophy className="h-6 w-6" /></div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Reward Pool</div>
                      {isEditing ? (
                        <Input value={editForm.rewardPool} onChange={(e) => setEditForm({ ...editForm, rewardPool: e.target.value })} className="h-6 bg-transparent border-b border-white/30 rounded-none text-white font-bold p-0 focus-visible:ring-0 focus-visible:border-white" />
                      ) : (
                        <div className="text-xl font-bold text-white">{questData.rewardPool} {tokenSymbol}</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-5 py-3 flex items-center gap-4 min-w-[160px]">
                    <div className="p-2 bg-green-500/20 rounded-full text-green-400"><Users className="h-6 w-6" /></div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Participants</div>
                      <div className="text-xl font-bold text-white">{questData.totalParticipants || 0}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="lg" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-auto py-3 px-6" onClick={() => { const link = window.location.href.split("?")[0]; navigator.clipboard.writeText(link); toast.success("Quest link copied to clipboard!"); }}>
                    <Copy className="mr-2 h-5 w-5" /> Copy Quest Link
                  </Button>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-5 py-3 flex items-center gap-4 min-w-[160px]">
                    <div className="p-2 bg-blue-500/20 rounded-full text-blue-400"><Shield className="h-6 w-6" /></div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Your Stage</div>
                      <div className="text-xl font-bold text-white">{participantData ? userProgress.currentStage : "Not Joined"}</div>
                    </div>
                  </div>
                </div>
                {!participantData && (
                  <Button size="lg" onClick={handleJoin} disabled={isJoining} className="min-w-[200px]">
                    {isJoining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {isJoining ? "Joining..." : "Join Quest to Participate"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============= PROGRESS BAR (UPDATED) ============= */}
        {!isCreator && participantData && (
          <Card className="border-none bg-slate-50 dark:bg-slate-900/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    Your Progress
                    <Badge variant="outline" className="text-primary border-primary bg-primary/5">{currentStage}</Badge>
                    {/* ── NEW: show "Stage Unlocked" badge when 70% threshold is met ── */}
                    {isCurrentStageUnlocked && !isLastActiveStage && (
                      <Badge className="bg-green-500 text-white border-0 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Stage Unlocked!
                      </Badge>
                    )}
                    {isCurrentStageUnlocked && isLastActiveStage && (
                      <Badge className="bg-yellow-500 text-black border-0 flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Quest Complete!
                      </Badge>
                    )}
                  </h3>

                  {/* ── NEW: context-aware status text ── */}
                  <p className="text-sm text-muted-foreground mt-1">
                    {isCurrentStageUnlocked && !isLastActiveStage ? (
                      // Unlocked — bar is frozen, user is now on next stage
                      <span className="text-green-600 font-medium">
                        ✓ You unlocked {activeStages[activeStages.indexOf(currentStage) + 1]}! Start completing tasks there to continue.
                      </span>
                    ) : isCurrentStageUnlocked && isLastActiveStage ? (
                      <span className="text-yellow-600 font-medium">
                        🏆 You have completed all stages of this quest!
                      </span>
                    ) : unlockThreshold === 0 ? (
                      <span className="text-green-600 font-medium">✓ No requirement — next stage available!</span>
                    ) : (
                      <>
                        Earn <strong>{pointsRemaining}</strong> more points in <strong>{currentStage}</strong> to unlock {
                          activeStages[activeStages.indexOf(currentStage) + 1]
                            ? <strong>{activeStages[activeStages.indexOf(currentStage) + 1]}</strong>
                            : "the next stage"
                        }.{" "}
                        <span className="text-muted-foreground">
                          ({pointsEarnedInCurrentStage} / {unlockThreshold} pts — 70% of {stageTotal} total)
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-primary">{totalPoints}</div>
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Points</div>
                </div>
              </div>

              {/* ── Progress bar: frozen at 100% once unlocked ── */}
              <Progress
                value={progressPercent}
                className={`h-4 rounded-full ${isCurrentStageUnlocked ? "opacity-60" : ""}`}
              />

              {/* ── Threshold label below bar ── */}
              {hasNewBackendData && !isCurrentStageUnlocked && (
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{pointsEarnedInCurrentStage} pts earned</span>
                  <span>{unlockThreshold} pts to unlock next stage (70% of {stageTotal})</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============= TABS ============= */}
        <div className="relative">
          {!participantData && <div className="absolute inset-0 z-40 pointer-events-auto cursor-not-allowed" />}

          <Tabs defaultValue="tasks" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b mb-8 gap-4 pb-2 sm:pb-0">
              {/* ── TABS NAVIGATION ── */}
              <TabsList className="bg-transparent h-auto p-0 gap-6 sm:gap-8 w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary pb-3 px-1 text-base font-medium whitespace-nowrap">
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary pb-3 px-1 text-base font-medium whitespace-nowrap">
                  Leaderboard
                </TabsTrigger>
                {isCreator && (
                  <TabsTrigger value="admin" className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:text-yellow-600 pb-3 px-1 text-base font-medium flex items-center gap-2 whitespace-nowrap">
                    <Shield className="h-4 w-4" /> Admin
                    {pendingSubmissions.length > 0 && (
                      <Badge className="bg-yellow-500 text-black h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                        {pendingSubmissions.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>

              {!isCreator && (
                <div className="flex shrink-0 w-full sm:w-auto animate-in fade-in duration-300 sm:pb-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsRefreshingUser(true);
                      window.location.reload(); // <--- Forces a full page reload
                    }}
                    disabled={isRefreshingUser}
                    className="w-full sm:w-auto shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <RefreshCcw className={`mr-2 h-3.5 w-3.5 text-primary ${isRefreshingUser ? "animate-spin" : ""}`} />
                    {isRefreshingUser ? "Reloading..." : "Refresh Page"}
                  </Button>
                </div>
              )}
            </div>

            {/* ── TASKS TAB ── */}
            <TabsContent value="tasks" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {stagesToRender.map((stage) => {
                // Only render stages that have tasks
                const stageTasks = questData.tasks.filter((t: any) => t.stage === stage) || [];
                if (stageTasks.length === 0) return null;

                // ── UPDATED: use stagesMeta for lock state ──
                const stageMeta = userProgress.stagesMeta?.[stage];
                let isLockedStage: boolean;

                if (stageMeta) {
                  // New logic: stage is locked if it's not current AND not unlocked AND
                  // the previous active stage hasn't been unlocked yet
                  const stageIdxInActive = userProgress.activeStages.indexOf(stage);
                  if (stageIdxInActive <= 0 || stageMeta.isCurrent || stageMeta.isUnlocked) {
                    isLockedStage = false;
                  } else {
                    const prevStage = userProgress.activeStages[stageIdxInActive - 1];
                    const prevMeta = userProgress.stagesMeta[prevStage];
                    isLockedStage = !(prevMeta?.isUnlocked ?? false);
                  }
                } else {
                  // Fallback: old index-based logic
                  const stageIdx = ALL_STAGES.indexOf(stage);
                  const userStageIdx = ALL_STAGES.indexOf(userProgress.currentStage);
                  isLockedStage = stageIdx > userStageIdx;
                }

                // ── Per-stage progress info (shown in stage header) ──
                const stageProgressLabel = stageMeta
                  ? stageMeta.isUnlocked
                    ? `✓ Unlocked (${stageMeta.userEarned}/${stageMeta.unlockThreshold} pts)`
                    : stageMeta.isCurrent
                      ? `${stageMeta.userEarned}/${stageMeta.unlockThreshold} pts to unlock`
                      : "Locked"
                  : null;

                return (
                  <div key={stage} className={`space-y-4 ${isLockedStage || !participantData ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className={`px-4 py-1 text-sm font-bold uppercase tracking-wide ${
                          isLockedStage || !participantData
                            ? "border-slate-300 text-slate-400"
                            : stageMeta?.isUnlocked
                              ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/20"
                              : "border-primary/50 text-primary bg-primary/5"
                        }`}
                      >
                        {stage}
                      </Badge>

                      {/* ── NEW: per-stage unlock badge ── */}
                      {stageMeta?.isUnlocked && (
                        <Badge className="bg-green-500 text-white border-0 text-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Unlocked
                        </Badge>
                      )}

                      {/* ── NEW: per-stage progress label ── */}
                      {stageProgressLabel && !stageMeta?.isUnlocked && stageMeta?.isCurrent && (
                        <span className="text-xs text-muted-foreground">{stageProgressLabel}</span>
                      )}

                      <div className="h-px bg-border flex-1" />
                      {(isLockedStage || !participantData) && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {stageTasks.map((task: any) => {
                        if (task.id === "sys_daily") {
                          const checkinStatus = getCheckinStatus();
                          return (
                            <Card key={task.id} className={`group relative overflow-hidden transition-all duration-300 h-full flex flex-col ${!participantData ? "opacity-50" : ""}`}>
                              <CardContent className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><CalendarClock className="h-5 w-5" /></div>
                                  <Badge variant="secondary">+10 PTS</Badge>
                                </div>
                                <h3 className="font-bold text-lg mb-2">{task.title}</h3>
                                <p className="text-sm text-muted-foreground flex-1">{task.description}</p>
                                <div className="mt-4 pt-4 border-t">
                                  {participantData && !isCreator ? (
                                    checkinStatus.canCheckin ? (
                                      <Button onClick={handleDailyCheckin} disabled={isCheckingIn || !checkinStatus.canCheckin || !questTiming.isLive} className="w-full">
                                        {isCheckingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {questTiming.notStartedYet ? "Check-in Locked" : "Check In Now +10 pts"}
                                      </Button>
                                    ) : (
                                      <div className="text-center space-y-2">
                                        <p className="text-sm font-medium text-green-600">✓ Checked in today!</p>
                                        <p className="text-xs text-muted-foreground">{checkinStatus.message}</p>
                                      </div>
                                    )
                                  ) : (
                                    <div className="text-center text-muted-foreground">{isCreator ? "Creators cannot check in" : "Join quest to check in"}</div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }

                        if (task.id === "sys_referral") {
                          if (!participantData) return null;
                          const refCount = participantData.referral_count || 0;
                          const referralLink = `${window.location.origin}${window.location.pathname}?ref=${participantData.referral_id}`;
                          return (
                            <Card key={task.id} className="group relative overflow-hidden transition-all duration-300 h-full flex flex-col">
                              <CardContent className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
                                  <Badge variant="secondary">+10 PTS each</Badge>
                                </div>
                                <h3 className="font-bold text-lg mb-2">{task.title}</h3>
                                <p className="text-sm text-muted-foreground flex-1">{task.description}</p>
                                <div className="mt-4 space-y-4">
                                  <div>
                                    <Label className="text-xs">Your Referral Link</Label>
                                    <div className="flex gap-2 mt-1">
                                      <Input value={referralLink} readOnly className="font-mono text-xs" />
                                      <Button size="sm" onClick={() => { navigator.clipboard.writeText(referralLink); toast.success("Referral link copied to clipboard"); }}><Copy className="h-4 w-4" /></Button>
                                    </div>
                                  </div>
                                  <p className="text-sm font-medium">You have <span className="text-primary font-bold">{refCount}</span> successful referrals (+<span className="text-primary font-bold">{refCount * 10}</span> points)</p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }

                        const status = getTaskStatus(task);
                        const isLocked = status === "locked";

                        return (
                          <Card key={task.id} className={`group relative overflow-hidden transition-all duration-300 h-full flex flex-col ${isLocked || !participantData ? "opacity-50" : "hover:shadow-lg hover:-translate-y-1 bg-white dark:bg-slate-950"} ${status === "completed" ? "border-green-500/30 bg-green-50/20" : ""} ${status === "pending" ? "border-orange-500/30 bg-orange-50/20" : ""}`}>
                            <CardContent className="p-5 flex flex-col h-full">
                              <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg ${isLocked || !participantData ? "bg-slate-200 dark:bg-slate-800" : "bg-primary/10 text-primary"}`}>
                                  {isLocked || !participantData ? <Lock className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                                </div>
                                <Badge variant={status === "completed" ? "default" : "secondary"} className={status === "completed" ? "bg-green-600" : ""}>{task.points} PTS</Badge>
                              </div>
                              <div className="mb-6 flex-1">
                                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{task.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-3">{task.description}</p>
                              </div>
                              <div className="mt-auto pt-4 border-t flex items-center justify-between">
                                <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                                  {task.verificationType === "auto_social" && <Sparkles className="h-3 w-3 text-blue-500" />}
                                  {task.verificationType === "auto_tx" && <Shield className="h-3 w-3 text-green-500" />}
                                  {task.verificationType === "onchain" && <Zap className="h-3 w-3 text-purple-500" />}
                                  {task.verificationType === "manual_link" && <ExternalLink className="h-3 w-3" />}
                                  {task.verificationType.replace("manual_", "").replace("auto_", "")}
                                </div>
                                {status === "completed" ? (
                                  <Button size="sm" disabled className="bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-default hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <CheckCircle2 className="h-4 w-4 mr-1" /> Done
                                  </Button>
                                ) : status === "pending" ? (
                                  <div className="flex items-center text-orange-600 text-sm font-bold"><Clock className="h-4 w-4 mr-1" /> Reviewing</div>
                                ) : isLocked || !participantData ? (
                                  <span className="text-sm text-muted-foreground">{!participantData ? "Join Required" : "Locked"}</span>
                                ) : (
                                  !isCreator ? (
                                    <Button size="sm" onClick={() => { setSelectedTask(task); setShowSubmitModal(true); }} disabled={!participantData || !questTiming.isLive || status !== "available"} className="bg-slate-900 text-white hover:bg-primary dark:bg-slate-100 dark:text-black">
                                      {questTiming.notStartedYet ? "Starts Soon" : "Open Task"}
                                    </Button>
                                  ) : (
                                    <span className="text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Preview Mode</span>
                                  )
                                )}
                              </div>
                            </CardContent>
                            {(!isLocked && status === "available" && participantData) && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* ── LEADERBOARD TAB ── */}
            <TabsContent value="leaderboard">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    Top Contributors
                    {claimStatus.isActive && <Badge className="bg-green-600 animate-pulse"><Gift className="h-3 w-3 mr-1" /> Claim Active</Badge>}
                  </CardTitle>
                  <CardDescription>Ranked by total points earned in this quest</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[80px]">Rank</TableHead>
                        <TableHead>Participant</TableHead>
                        <TableHead className="text-right">Tasks Done</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        {claimStatus.isActive && <TableHead className="text-right">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeaderboard.length === 0 ? (
                        <TableRow><TableCell colSpan={claimStatus.isActive ? 5 : 4} className="text-center py-10 text-muted-foreground">No participants yet. Be the first to join!</TableCell></TableRow>
                      ) : (
                        displayLeaderboard.map((entry) => (
                          <TableRow key={entry.walletAddress} className={entry.walletAddress === userWalletAddress ? "bg-primary/5 hover:bg-primary/10" : ""}>
                            <TableCell className="font-medium text-lg">
                              {entry.rank === 1 && "🥇"}{entry.rank === 2 && "🥈"}{entry.rank === 3 && "🥉"}{entry.rank > 3 && <span className="text-muted-foreground">#{entry.rank}</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
                                  <AvatarImage src={entry.avatarUrl || undefined} alt={entry.username || ""} className="object-cover" />
                                  <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                    {entry.username ? entry.username.substring(0, 2).toUpperCase() : entry.walletAddress.slice(0, 4)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm flex items-center gap-2">
                                    {entry.username || entry.walletAddress.slice(0, 6) + "..." + entry.walletAddress.slice(-4)}
                                    {entry.walletAddress === userWalletAddress && <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-primary text-primary">You</Badge>}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground font-mono">{entry.completedTasks}</TableCell>
                            <TableCell className="text-right font-bold text-primary text-lg">{entry.points}</TableCell>
                            {claimStatus.isActive && (
                              <TableCell className="text-right">
                                {entry.walletAddress.toLowerCase() === userWalletAddress?.toLowerCase() && (
                                  entry.rank <= (questData.distributionConfig?.totalWinners || 100) ? (
                                    <Button size="sm" onClick={handleClaimReward} disabled={isClaiming} className="bg-green-600 hover:bg-green-700 text-white">
                                      {isClaiming ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim Reward"}
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Not Eligible</span>
                                  )
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
            </TabsContent>
            
             
              {/* ── ADMIN TAB ── */}
            {isCreator && (
              <TabsContent value="admin" className="space-y-6">
                {/* ── ADMIN HEADER & TOGGLE ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quest Management</h2>
                    <p className="text-muted-foreground text-sm">Review submissions and manage your quest parameters.</p>
                  </div>
                  
                  <div className="flex w-full sm:w-auto items-center gap-2">
                    {!isAdminEditing && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={refreshAdminData} 
                        disabled={isRefreshingAdmin}
                        className="shrink-0 shadow-sm"
                        title="Refresh Submissions"
                      >
                        <RefreshCcw className={`h-4 w-4 text-slate-600 dark:text-slate-400 ${isRefreshingAdmin ? "animate-spin" : ""}`} />
                      </Button>
                    )}
                    
                    <Button 
                      variant={isAdminEditing ? "outline" : "default"} 
                      onClick={() => setIsAdminEditing(!isAdminEditing)}
                      className="w-full sm:w-auto shadow-sm"
                    >
                      {isAdminEditing ? (
                        <><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</>
                      ) : (
                        <><Settings className="mr-2 h-4 w-4" /> Edit Quest & Tasks</>
                      )}
                    </Button>
                  </div>
                </div>

                {!isAdminEditing ? (
                  <>
                    {/* ── QUICK STATS ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-bold text-orange-500">{pendingSubmissions.length}</div></CardContent>
                      </Card>
                      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Participants</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-bold">{allParticipants.length}</div></CardContent>
                      </Card>
                      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</CardTitle></CardHeader>
                        <CardContent className="flex items-center gap-2">
                          <Badge variant={questData.isActive ? "default" : "destructive"}>{questData.isActive ? "Active" : "Paused"}</Badge>
                          {questData.isFunded && <Badge className="bg-emerald-500 text-white border-0">Funded</Badge>}
                        </CardContent>
                      </Card>
                    </div>

                    {/* ── SUBMISSION REVIEW QUEUE ── */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
                      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-orange-500" /> Review Queue
                          </CardTitle>
                          <Badge variant="outline" className="font-mono">{pendingSubmissions.length} Tasks Left</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 bg-white dark:bg-slate-950">
                        {pendingSubmissions.length === 0 ? (
                          <div className="text-center py-20 flex flex-col items-center">
                            <div className="h-20 w-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                              <CheckCircle2 className="h-10 w-10 text-green-500" />
                            </div>
                            <h3 className="text-lg font-medium">Inbox Zero!</h3>
                            <p className="text-muted-foreground text-sm max-w-xs">There are currently no submissions waiting for your approval.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {pendingSubmissions.map((sub: any) => {
                              
                              const isImage = sub.submittedData?.match(/\.(jpeg|jpg|gif|png)$/i) || sub.submittedData?.includes("supabase");
                              
                              let userLink = "";
                              let userNotes = sub.notes || "";

                              if (sub.notes && sub.notes.includes("User Proof Link:")) {
                                const parts = sub.notes.split("User Notes:");
                                userLink = parts[0].replace("User Proof Link:", "").trim();
                                if (parts.length > 1) {
                                  userNotes = parts[1].trim();
                                } else {
                                  userNotes = "";
                                }
                              }

                              const isProcessing = processingSubmission === sub.submissionId;
                              const displayLink = isImage ? userLink : sub.submittedData;

                              return (
                                <Card key={sub.submissionId} className="flex flex-col border-slate-200 dark:border-slate-800 overflow-hidden hover:border-orange-200 transition-colors">
                                  {/* Header */}
                                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between border-b dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-800 shadow-sm">
                                        <AvatarImage src={sub.avatarUrl} />
                                        <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                                          {sub.username?.substring(0, 2).toUpperCase() || "??"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-bold leading-none">{sub.username}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono mt-1">{sub.taskTitle}</p>
                                      </div>
                                    </div>
                                    <Badge className="bg-blue-500 text-white border-0 font-bold">{sub.taskPoints} pts</Badge>
                                  </div>

                                  {/* Content Body: Proof Data */}
                                  <div className="p-4 space-y-4 flex-1">
                                    
                                    {/* Image Preview & URL */}
                                    {isImage && (
                                      <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex justify-between items-center">
                                          <span>Submitted Image</span>
                                          <a href={sub.submittedData} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 normal-case tracking-normal">
                                            <ExternalLink size={12} /> View Raw URL
                                          </a>
                                        </Label>
                                        <div className="relative group cursor-zoom-in" onClick={() => setPreviewImage(sub.submittedData)}>
                                          <img 
                                            src={sub.submittedData} 
                                            alt="Proof" 
                                            className="w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner"
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                            <span className="text-white text-xs font-medium flex items-center gap-2">
                                              <ZoomIn size={16} /> Click to enlarge
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Text / Link / TxHash Data */}
                                    {displayLink && displayLink !== "No proof attached" && (
                                      <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                          {displayLink.startsWith("0x") ? "Submitted TxHash" : "Submitted Link / Response"}
                                        </Label>
                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md border border-slate-100 dark:border-slate-800 text-sm overflow-hidden">
                                          {displayLink.startsWith("http") ? (
                                            <div className="flex items-center justify-between gap-2">
                                              <a href={displayLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-2 break-all font-mono">
                                                {displayLink} <ExternalLink size={14} className="shrink-0" />
                                              </a>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 text-slate-400 hover:text-primary" onClick={() => { navigator.clipboard.writeText(displayLink); toast.success("Link copied!"); }}>
                                                <Copy size={14} />
                                              </Button>
                                            </div>
                                          ) : displayLink.startsWith("0x") ? (
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="font-mono text-primary break-all">{displayLink}</span>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 text-slate-400 hover:text-primary" onClick={() => { navigator.clipboard.writeText(displayLink); toast.success("TxHash copied!"); }}>
                                                <Copy size={14} />
                                              </Button>
                                            </div>
                                          ) : (
                                            <p className="whitespace-pre-wrap leading-relaxed">{displayLink}</p>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Participant Notes */}
                                    {userNotes && (
                                      <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Notes</Label>
                                        <div className="flex gap-2 p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-md border border-orange-100 dark:border-orange-900/30">
                                          <MessageSquareText size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                          <p className="text-xs italic text-orange-900 dark:text-orange-200">"{userNotes}"</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t dark:border-slate-800 flex gap-3">
                                    <Button 
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10" 
                                      onClick={() => handleReviewSubmission(sub.submissionId, "approved")}
                                      disabled={processingSubmission?.id === sub.submissionId}
                                    >
                                      {processingSubmission?.id === sub.submissionId && processingSubmission?.action === "approved" 
                                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                        : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                      Approve
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 font-bold h-10" 
                                      onClick={() => handleReviewSubmission(sub.submissionId, "rejected")}
                                      disabled={processingSubmission?.id === sub.submissionId}
                                    >
                                      {processingSubmission?.id === sub.submissionId && processingSubmission?.action === "rejected" 
                                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                        : <X className="mr-2 h-4 w-4" />}
                                      Reject
                                    </Button>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  /* ── EDITOR PANEL ── */
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <QuestEditPanel 
                      questData={questData} 
                      faucetAddress={faucetAddress!} 
                      creatorAddress={userWalletAddress!} 
                      onQuestUpdated={(updated) => setQuestData((p: any) => ({ ...p, ...updated }))} 
                    />
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* ============= IMAGE PREVIEW MODAL ============= */}
        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
              <Button className="absolute -top-12 right-0 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 h-10 w-10 p-0" onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}><X className="h-6 w-6" /></Button>
              <img src={previewImage} alt="Full Proof Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
        )}

       {/* ============= SUBMISSION MODAL ============= */}
        {showSubmitModal && selectedTask && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overflow-y-auto">
            <Card className="w-full max-w-lg shadow-2xl border-0 dark:bg-slate-900 animate-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
              <CardHeader className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 pb-5 relative flex-shrink-0">
                <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-8 w-8 rounded-full" onClick={() => setShowSubmitModal(false)}><X className="h-5 w-5" /></Button>
                <CardTitle className="text-xl pr-10">{selectedTask.title}</CardTitle>
                <CardDescription className="text-base font-medium mt-1">{selectedTask.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6 space-y-6 overflow-y-auto flex-1">
                {/* Task Instructions */}
                

                {/* 1. ACTION BUTTON (Step 1) - Shows for URLs or X Share tasks */}
                {(() => {
                  const isXShareTask = selectedTask.verificationType === 'system_x_share' || selectedTask.action === 'share_quest';
                  const showStep1 = (selectedTask.url || isXShareTask) && !['onchain', 'none'].includes(selectedTask.verificationType);
                  
                  if (!showStep1) return null;

                  return (
                    <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                      <div>
                        <h4 className="font-semibold text-base">Step 1: Perform Action</h4>
                        <p className="text-xs text-muted-foreground">
                          {isXShareTask 
                            ? "Click below to generate your pre-filled tweet and share it." 
                            : "Click below to visit the target page and complete the task."}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full max-w-xs gap-2 font-bold uppercase tracking-wider" 
                        variant={isXShareTask ? "default" : "outline"} 
                        onClick={() => {
                          if (isXShareTask) {
                            handleXShareAction(selectedTask);
                          } else {
                            window.open(selectedTask.url, "_blank");
                          }
                        }}
                      >
                        {isXShareTask ? "Post on X" : `${selectedTask.action.replace('_', ' ')} NOW`} 
                        <ExternalLink className="h-4 w-4 opacity-50" />
                      </Button>
                    </div>
                  );
                })()}

                {/* 2. DYNAMIC INPUT: Links & TxHashes (Step 2) */}
                {(
                  ['manual_link', 'manual_link_image', 'system_x_share', 'auto_tx'].includes(selectedTask.verificationType) || 
                  (selectedTask.category === 'trading' && !['onchain', 'none', 'manual_upload'].includes(selectedTask.verificationType)) ||
                  (selectedTask.verificationType === 'auto_social' && ['quote', 'comment'].includes(selectedTask.action))
                ) && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2">
                      {selectedTask.url && <Badge variant="outline" className="bg-background">Step 2</Badge>}
                      <Label className="font-semibold text-sm">
                        {selectedTask.category === 'trading' || selectedTask.verificationType === 'auto_tx' 
                          ? "Submit Transaction Hash (Required)" 
                          : "Submit Proof URL (Required)"}
                      </Label>
                    </div>
                    <Input 
                      placeholder={selectedTask.category === 'trading' || selectedTask.verificationType === 'auto_tx' ? "0x..." : "https://..."} 
                      value={submissionData.proofUrl} 
                      onChange={(e) => setSubmissionData(prev => ({ ...prev, proofUrl: e.target.value }))} 
                      className="h-11 font-mono text-sm focus-visible:ring-primary" 
                    />
                  </div>
                )}  

                {/* 3. DYNAMIC INPUT: Image Uploads */}
                {(
                  ['manual_upload', 'manual_link_image'].includes(selectedTask.verificationType) || 
                  (selectedTask.verificationType === 'auto_social' && !['Twitter', 'Discord', 'Telegram'].includes(selectedTask.targetPlatform || ''))
                ) && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2">
                      {selectedTask.url && <Badge variant="outline" className="bg-background">Step {selectedTask.verificationType === 'manual_link_image' ? '3' : '2'}</Badge>}
                      <Label className="font-semibold text-sm">Upload Proof Image (Required)</Label>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center relative bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" onChange={handleFileSelect} />
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm font-semibold">Click or drag screenshot here</p>
                      {submissionData.file && <Badge className="mt-2 bg-green-500">{submissionData.file.name}</Badge>}
                    </div>
                  </div>
                )}

                {/* 4. DYNAMIC INPUT: On-Chain Engine (Timebound & Hold) */}
                {selectedTask.verificationType === "onchain" && (
                  <div className="space-y-6">
                    {selectedTask.action === 'timebound_interaction' && (
                      <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-4 animate-in slide-in-from-top-2">
                        <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm text-2xl">
                          <ExternalLink className="h-6 w-6 text-slate-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-base">Step 1: Interact on Platform</h4>
                          <p className="text-sm text-muted-foreground mt-1">Visit the link below and interact with the required smart contract.</p>
                        </div>
                        
                        {(selectedTask.startDate || selectedTask.endDate) && (
                          <div className="flex flex-col gap-1.5 w-full bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 text-left">
                            <span className="font-semibold flex items-center gap-1.5 text-foreground">
                              <CalendarClock className="h-4 w-4 text-primary"/> Valid Time Window (Local Time)
                            </span>
                            {selectedTask.startDate && (
                              <span className="flex items-center gap-2 mt-1">
                                <span className="w-10 text-muted-foreground">Starts:</span> 
                                <strong className="font-medium">{new Date(selectedTask.startDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                              </span>
                            )}
                            {selectedTask.endDate && (
                              <span className="flex items-center gap-2">
                                <span className="w-10 text-muted-foreground">Ends:</span> 
                                <strong className="font-medium">{new Date(selectedTask.endDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        <Button size="sm" className="w-full max-w-xs gap-2 font-bold uppercase tracking-wider" variant="outline" onClick={() => window.open(selectedTask.url, "_blank")}>
                          Visit dApp <ExternalLink className="h-4 w-4 opacity-50" />
                        </Button>
                      </div>
                    )}

                    <div className="text-center space-y-4 p-5">
                      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shadow-sm">
                        <Zap className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">
                          {selectedTask.action === 'timebound_interaction' ? 'Step 2: Verify On-Chain' : 'Wallet Check Required'}
                        </h4>
                        <p className="text-muted-foreground text-sm mt-1">We will scan your connected wallet on the blockchain to verify this task.</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* 5. Optional Notes (for manual review tasks) */}
                {['manual_link', 'manual_upload', 'manual_link_image'].includes(selectedTask.verificationType) && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">Notes (Optional)</Label>
                    <Textarea 
                      placeholder="Add any extra details or context for the admin..." 
                      value={submissionData.notes} 
                      onChange={(e) => setSubmissionData({ ...submissionData, notes: e.target.value })} 
                      className="resize-none dark:bg-slate-950 min-h-[80px] text-sm" 
                    />
                  </div>
                )}
              </CardContent>

              <CardFooter className="justify-between border-t p-5 dark:border-slate-800 flex-shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
                <Button variant="outline" onClick={() => setShowSubmitModal(false)}>Cancel</Button>

                {/* Intelligent Disable Logic */}
                <Button 
                  onClick={handleSubmitTask} 
                  disabled={(() => {
                    if (submittingTaskId === selectedTask.id) return true;
                    const vType = selectedTask.verificationType;
                    
                    if (vType === "manual_link" || vType === "system_x_share" || vType === "auto_tx" || (selectedTask.category === 'trading' && vType !== 'onchain' && vType !== 'manual_upload')) {
                      return !submissionData.proofUrl.trim();
                    }
                    if (vType === "manual_upload") {
                      return !submissionData.file;
                    }
                    if (vType === "manual_link_image") {
                      return !submissionData.proofUrl.trim() || !submissionData.file;
                    }
                    if (vType === "auto_social" && ['quote', 'comment'].includes(selectedTask.action)) {
                      return !submissionData.proofUrl.trim();
                    }
                    return false;
                  })()} 
                  className="bg-primary hover:bg-primary/90 min-w-[160px]"
                >
                  {submittingTaskId === selectedTask.id ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                  ) : (
                    ['auto_social', 'system_x_share', 'onchain', 'auto_tx'].includes(selectedTask.verificationType) 
                      ? "Verify Task" 
                      : "Submit for Review"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* ============= FUNDING MODAL ============= */}
        {showFundModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl">
              <CardHeader>
                <CardTitle>Fund Reward Pool</CardTitle>
                <CardDescription>Deposit tokens to activate this quest.<br />Includes <strong>5% Platform Fee</strong>.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between"><span>Reward Pool Goal:</span><span className="font-bold">{rewardPoolAmount}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Platform Fee (5%):</span><span>+ {requiredFee.toFixed(4)}</span></div>
                  <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold text-primary"><span>Total Required:</span><span>{totalRequired.toFixed(4)}</span></div>
                </div>
                <div className="space-y-2">
                  <Label>Enter Deposit Amount (Total)</Label>
                  <Input type="number" placeholder="0.00" value={totalRequired.toFixed(4)} onChange={(e) => setFundAmount(e.target.value)} className={isValidFundingAmount ? "border-green-500" : "border-red-500"} />
                  {!isValidFundingAmount && fundAmount && <p className="text-xs text-red-500">Amount must be exactly {totalRequired.toFixed(4)}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowFundModal(false)} disabled={isFunding}>Cancel</Button>
                <Button onClick={handleFundQuest} disabled={!isValidFundingAmount || isFunding} className="bg-green-600 hover:bg-green-700 text-white">
                  {isFunding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {isFunding ? "Processing..." : "Confirm & Deposit"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}