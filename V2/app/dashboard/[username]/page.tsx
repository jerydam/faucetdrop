"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network" 
import { getUserFaucets } from "@/lib/faucet"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
    Settings, Search, Copy, Wallet, Loader2,
    ScrollText, PencilRuler, Rocket, Trash2 // Added Trash2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { ProfileSettingsModal } from "@/components/profile-setting" 
import { MyCreationsModal } from "@/components/my-creations-modal" 
import { CreateNewModal } from "@/components/create-new-modal" 

// --- Custom Icons ---
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)
const TelegramIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" /></svg>
)
const FarcasterIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 1000 1000" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg"><path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" /><path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" /><path d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z" /></svg>
)
const DiscordIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" /></svg>
)

// --- Types ---
interface FaucetData {
    faucetAddress: string;
    name: string;
    chainId: number;
    faucetType: string;
    createdAt?: string;
}

interface QuestData {
    _id?: string;
    id?: string;
    title: string;
    description: string;
    imageUrl: string;
    faucetAddress?: string;
    creatorAddress?: string;
    status?: 'draft' | 'published';
    createdAt?: string;
    participantCount?: number;
    // ... any other fields
}

interface UserProfileData {
    wallet_address: string;
    username: string;
    email?: string;
    bio?: string;
    avatar_url?: string;
    twitter_handle?: string;
    discord_handle?: string;
    telegram_handle?: string;
    farcaster_handle?: string;
}

export default function DashboardPage() {
    const backendUrl = "http://127.0.0.1:8000"; 
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { address: connectedAddress, isConnected } = useWallet();
    const { networks } = useNetwork();
    
    const targetUsername = params.username as string;
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Data State
    const [faucets, setFaucets] = useState<FaucetData[]>([]);
    const [publishedQuests, setPublishedQuests] = useState<QuestData[]>([]);
    const [draftQuests, setDraftQuests] = useState<QuestData[]>([]);
    
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [quizCount, setQuizCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    
    // Filters & UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [networkFilter, setNetworkFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("faucets");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const isOwner = useMemo(() => {
        if (!connectedAddress || !profile?.wallet_address) return false;
        return connectedAddress.toLowerCase() === profile.wallet_address.toLowerCase();
    }, [connectedAddress, profile]);

    // --- FUNCTION: Delete Draft ---
    const handleDeleteDraft = async (draftId: string) => {
        if (!confirm("Are you sure you want to delete this draft?")) return;
        
        try {
            const res = await fetch(`${backendUrl}/api/quests/draft/${draftId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            
            if (data.success) {
                toast({ title: "Draft deleted successfully" });
                // Update State to remove item immediately
                setDraftQuests(prev => prev.filter(q => q.faucetAddress !== draftId));
            } else {
                toast({ title: "Failed to delete draft", variant: "destructive" });
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error deleting draft", variant: "destructive" });
        }
    }

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Profile by Username
            const profRes = await fetch(`${backendUrl}/api/profile/user/${targetUsername}`);
            const profData = await profRes.json();
            
            if (profData.success && profData.profile) {
                const userProfile = profData.profile;
                setProfile(userProfile);
                const userWallet = userProfile.wallet_address;
                
                if (userWallet) {
                    // Fetch Faucets
                    const faucetData = await getUserFaucets(userWallet);
                    setFaucets(faucetData);

                    // Fetch Quests
                    const questRes = await fetch(`${backendUrl}/api/quests`);
                    const qData = await questRes.json();
                    
                    if (qData.success) {
                        // Filter Published Quests
                        const myQuests = qData.quests.filter((q: any) => 
                            q.creatorAddress.toLowerCase() === userWallet.toLowerCase()
                        );
                        setPublishedQuests(myQuests);
                    }

                    // Fetch Drafts (Only if viewing own profile)
                    if (isConnected && connectedAddress && userWallet.toLowerCase() === connectedAddress.toLowerCase()) {
                        try {
                            const draftRes = await fetch(`${backendUrl}/api/quests/drafts/${userWallet}`);
                            if (draftRes.ok) {
                                const dData = await draftRes.json();
                                if (dData.success) {
                                    // MAP snake_case DB fields to camelCase for the UI
                                    const formattedDrafts = dData.drafts.map((d: any) => ({
                                        ...d,
                                        faucetAddress: d.faucet_address, 
                                        creatorAddress: d.creator_address,
                                        imageUrl: d.image_url,
                                        title: d.title,
                                        description: d.description
                                    }));
                                    setDraftQuests(formattedDrafts);
                                }
                            }
                        } catch (err) {
                            console.log("No drafts found", err);
                        }
                    }
                }
            } else {
                const isViewingOwnNewProfile = 
                isConnected && 
                connectedAddress && 
                targetUsername.toLowerCase() === connectedAddress.toLowerCase();

                if (isViewingOwnNewProfile) {
                    setProfile({
                        wallet_address: connectedAddress,
                        username: "New User", 
                        bio: "You haven't set up your profile yet. Click settings to get started!",
                        avatar_url: "" 
                    });
                    
                    const faucetData = await getUserFaucets(connectedAddress);
                    setFaucets(faucetData);
                } else {
                    toast({ title: "User not found", variant: "destructive" });
                    setProfile(null);
                }
            }
        } catch (error) {
            console.error("Dashboard load error:", error);
        } finally {
            setLoading(false);
        }
    }, [targetUsername, connectedAddress, isConnected, backendUrl]);

    useEffect(() => {
        if (targetUsername) fetchData();
    }, [targetUsername, fetchData]);

    // Helpers
    const getNetworkName = (id: number) => networks.find(n => n.chainId === id)?.name || `Chain ${id}`;
    const getNetworkColor = (id: number) => networks.find(n => n.chainId === id)?.color || "#64748b";
    
    const getSocialUrl = (platform: string, handle: string) => {
        const cleanHandle = handle.replace('@', '').trim();
        switch (platform) {
            case 'twitter': return `https://x.com/${cleanHandle}`;
            case 'telegram': return `https://t.me/${cleanHandle}`;
            case 'farcaster': return `https://farcaster.xyz/${cleanHandle}`;
            default: return '#';
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
    };

    const filteredFaucets = useMemo(() => {
        return faucets.filter(f => {
            const matchesSearch = f.name?.toLowerCase().includes(searchQuery.toLowerCase()) || f.faucetAddress.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesNetwork = networkFilter === "all" || f.chainId.toString() === networkFilter;
            return matchesSearch && matchesNetwork;
        });
    }, [faucets, searchQuery, networkFilter]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    if (!profile) return <div className="p-20 text-center">User not found.</div>;

    const displayAddress = profile.wallet_address ? `${profile.wallet_address.slice(0,6)}...${profile.wallet_address.slice(-4)}` : "";

    return (
        <main className="min-h-screen bg-background pb-20 relative overflow-x-hidden">
            <div className="container mx-auto px-4 py-8 relative z-10 max-w-7xl">
                <Header pageTitle={isOwner ? "My Dashboard" : `${profile.username}'s Space`} />

                {/* --- 1. USER IDENTITY SECTION --- */}
                <div className="mb-10">
                    <Card className="border-none bg-gradient-to-r from-primary/5 via-primary/10 to-background shadow-sm">
                        <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="relative">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-lg relative z-10">
                                    <AvatarImage src={profile.avatar_url} className="object-cover" />
                                    <AvatarFallback className="bg-primary text-white text-2xl">
                                        {profile.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                {isOwner && (
                                    <div className="absolute -bottom-2 -right-2 z-20 bg-background rounded-full shadow-md">
                                        <ProfileSettingsModal />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                        {profile.username}
                                    </h1>
                                    <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                                        {profile?.twitter_handle && (
                                            <a href={getSocialUrl('twitter', profile.twitter_handle)} target="_blank" rel="noopener noreferrer" className="no-underline">
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 gap-1.5 pl-2 pr-2.5 cursor-pointer">
                                                    <XIcon className="h-3 w-3" /> {profile.twitter_handle.replace('@', '')}
                                                </Badge>
                                            </a>
                                        )}
                                        {/* Add other socials here as needed */}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
                                    <Wallet className="h-4 w-4" />
                                    <span>{displayAddress}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(profile.wallet_address)}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>

                                <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
                                    {profile.bio || "No bio set yet."}
                                </p>
                            </div>

                            {/* STATS SECTION */}
                            <div className="flex items-center gap-6 bg-background/50 p-4 rounded-xl border self-start md:self-center w-full md:w-auto justify-around md:justify-start">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{faucets.length}</div>
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">Faucets</div>
                                </div>
                                <div className="h-10 w-[1px] bg-border" />
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{publishedQuests.length}</div> 
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">Quests</div>
                                </div>
                                <div className="h-10 w-[1px] bg-border" />
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{quizCount}</div> 
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">Quizzes</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- 2. ACTION BAR & TABS --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('faucets')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'faucets' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Faucets ({faucets.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('quests')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'quests' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Quests ({publishedQuests.length + (isOwner ? draftQuests.length : 0)})
                        </button>
                    </div>

                    {isOwner && (
                        <div className="flex flex-wrap gap-3">
                            <MyCreationsModal faucets={faucets} address={connectedAddress!} />
                            <CreateNewModal onSuccess={fetchData} />
                        </div>
                    )}
                </div>

                {/* --- 3. MAIN CONTENT --- */}
                
                {/* TAB: FAUCETS */}
                {activeTab === 'faucets' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search faucets..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <Select value={networkFilter} onValueChange={setNetworkFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="All Networks" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Networks</SelectItem>
                                    {networks.map(n => <SelectItem key={n.chainId} value={n.chainId.toString()}>{n.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                            {filteredFaucets.length > 0 ? filteredFaucets.map((faucet) => (
                                <FaucetCard 
                                    key={faucet.faucetAddress} 
                                    faucet={faucet} 
                                    getNetworkName={getNetworkName}
                                    getNetworkColor={getNetworkColor}
                                    onManage={() => router.push(`/faucet/${faucet.faucetAddress}?networkId=${faucet.chainId}`)}
                                    isOwner={isOwner}
                                />
                            )) : (
                                <div className="col-span-full text-center py-10 text-muted-foreground">No faucets found matching your filters.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: QUESTS */}
                {activeTab === 'quests' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        
                        {/* Section: Active Quests */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-blue-500" /> Published Quests
                            </h3>
                            {publishedQuests.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {publishedQuests.map((quest) => (
                                        <QuestCard 
                                            key={quest._id || quest.id} 
                                            quest={quest} 
                                            type="published"
                                            onClick={() => router.push(`/quest/${quest._id || quest.id}`)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 border rounded-lg bg-muted/20 text-muted-foreground">
                                    No published quests yet.
                                </div>
                            )}
                        </div>

                        {/* Section: Drafts (Only for Owner) */}
                        {isOwner && (
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <PencilRuler className="h-5 w-5 text-orange-500" /> Drafts
                                    </h3>
                                    <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50">{draftQuests.length}</Badge>
                                </div>
                                
                                {draftQuests.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {draftQuests.map((quest) => (
                                            <QuestCard 
                                                key={quest._id || quest.id} 
                                                quest={quest} 
                                                type="draft"
                                                onClick={() => router.push(`/quest/create-quest?draftId=${quest.faucetAddress}`)}
                                                onDelete={handleDeleteDraft}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                                        No drafts in progress.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    )
}

// --- SUB-COMPONENTS ---

function FaucetCard({ faucet, getNetworkName, getNetworkColor, onManage, isOwner }: any) {
    const networkName = getNetworkName(faucet.chainId)
    const networkColor = getNetworkColor(faucet.chainId)

    return (
        <Card className="hover:shadow-lg transition-all duration-200 flex flex-col group border-l-4" style={{ borderLeftColor: networkColor }}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <Badge variant="outline" className="mb-2 bg-background" style={{ borderColor: networkColor, color: networkColor }}>
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: networkColor }}></span>
                        {networkName}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-xs">
                        {faucet.faucetType}
                    </Badge>
                </div>
                <CardTitle className="truncate text-lg">{faucet.name}</CardTitle>
                <CardDescription className="font-mono text-xs flex items-center gap-2 mt-1">
                    {faucet.faucetAddress.slice(0, 6)}...{faucet.faucetAddress.slice(-4)}
                </CardDescription>
            </CardHeader>
            <div className="p-4 pt-0 mt-auto">
                <Button onClick={onManage} className="w-full">
                    <Settings className="h-4 w-4 mr-2" /> {isOwner ? "Manage" : "View"} Distribution
                </Button>
            </div>
        </Card>
    )
}

interface QuestCardProps {
    quest: QuestData;
    type: 'published' | 'draft';
    onClick: () => void;
    onDelete?: (id: string) => void;
}

function QuestCard({ quest, type, onClick, onDelete }: QuestCardProps) {
    return (
        <Card className={`hover:shadow-md transition-all group ${type === 'draft' ? 'border-dashed border-orange-200 bg-orange-50/10' : ''}`}>
            <div className="relative h-32 w-full bg-muted overflow-hidden rounded-t-lg cursor-pointer" onClick={onClick}>
                <img src={quest.imageUrl || "https://placehold.co/600x400?text=Quest"} alt={quest.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                
                {/* Delete Button for Drafts */}
                {type === 'draft' && onDelete && (
                    <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            if (quest.faucetAddress) {
                                onDelete(quest.faucetAddress);
                            }
                        }}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                )}
                
                <div className="absolute top-2 left-2">
                    {type === 'draft' ? (
                        <Badge className="bg-orange-500 text-white">Draft</Badge>
                    ) : (
                        <Badge className="bg-green-500 text-white">Active</Badge>
                    )}
                </div>
            </div>
            <CardContent className="p-4">
                <h4 className="font-bold truncate text-base mb-1">{quest.title || "Untitled Draft"}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-3">
                    {quest.description || "No description provided."}
                </p>
                
                <Button variant={type === 'draft' ? "outline" : "default"} size="sm" className="w-full" onClick={onClick}>
                    {type === 'draft' ? (
                        <><PencilRuler className="h-3 w-3 mr-2" /> Continue Editing</>
                    ) : (
                        <><ScrollText className="h-3 w-3 mr-2" /> View Quest</>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}