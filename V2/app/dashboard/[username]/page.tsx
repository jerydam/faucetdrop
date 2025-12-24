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
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { 
    Settings, Search, Copy, ExternalLink, 
    LayoutGrid, List as ListIcon, Wallet, Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { ProfileSettingsModal } from "@/components/profile-setting" 
import { MyCreationsModal } from "@/components/my-creations-modal" 
import { CreateNewModal } from "@/components/create-new-modal" 

// --- Christmas Bubble Animation Component ---
const ChristmasBackground = () => {
    const bubbles = useMemo(() => [...Array(15)].map((_, i) => ({
        id: i,
        size: Math.random() * 20 + 10,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 10,
        emoji: ['🔴', '🟢', '❄️', '✨', '🎁', '🔔'][i % 6]
    })), []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {bubbles.map((b) => (
                <motion.div
                    key={b.id}
                    initial={{ y: -50, x: `${b.left}%`, opacity: 0 }}
                    animate={{ 
                        y: "110vh", 
                        opacity: [0, 1, 1, 0],
                        x: [`${b.left}%`, `${b.left + (Math.sin(b.id) * 5)}%`, `${b.left}%`]
                    }}
                    transition={{ 
                        duration: b.duration, 
                        repeat: Infinity, 
                        ease: "linear",
                        delay: b.delay 
                    }}
                    className="absolute select-none"
                    style={{ fontSize: b.size }}
                >
                    {b.emoji}
                </motion.div>
            ))}
        </div>
    );
};

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
    const backendUrl = "https://fauctdrop-backend.onrender.com"; 
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { address: connectedAddress, isConnected } = useWallet();
    const { networks } = useNetwork();
    
    const targetUsername = params.username as string;

    const [faucets, setFaucets] = useState<FaucetData[]>([]);
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [questCount, setQuestCount] = useState<number>(0);
    const [quizCount, setQuizCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [networkFilter, setNetworkFilter] = useState("all");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const isOwner = useMemo(() => {
        if (!connectedAddress || !profile?.wallet_address) return false;
        return connectedAddress.toLowerCase() === profile.wallet_address.toLowerCase();
    }, [connectedAddress, profile]);

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
                    // 2. Fetch Faucets for that user
                    const faucetData = await getUserFaucets(userWallet);
                    setFaucets(faucetData);

                    // 3. Fetch Stats (Quests)
                    const questRes = await fetch(`${backendUrl}/api/quests`);
                    const qData = await questRes.json();
                    if (qData.success) {
                        const myQuests = qData.quests.filter((q: any) => 
                            q.creatorAddress.toLowerCase() === userWallet.toLowerCase()
                        );
                        setQuestCount(myQuests.length);
                    }
                }
            } else {
                toast({ title: "User not found", variant: "destructive" });
            }
        } catch (error) {
            console.error("Dashboard load error:", error);
        } finally {
            setLoading(false);
        }
    }, [targetUsername, toast, backendUrl]);

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
            <ChristmasBackground />
            
            <div className="container mx-auto px-4 py-8 relative z-10 max-w-7xl">
                <Header pageTitle={isOwner ? "My Dashboard" : `${profile.username}'s Space`} />

                {/* --- 1. USER IDENTITY SECTION --- */}
                <div className="mb-10">
                    <Card className="border-none bg-gradient-to-r from-primary/5 via-primary/10 to-background shadow-sm">
                        <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                            
                            {/* Christmas Cap "Under" Image Logic */}
                            <div className="relative">
                                {/* The Cap: z-0 (behind), peeking from top-right */}
                                <div className="absolute -top-6 -right-4 z-0 pointer-events-none rotate-[15deg] drop-shadow-md text-6xl">
                                    ❄️
                                </div>
                                
                                {/* Avatar: z-10 (on top) */}
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
                                            <a 
                                                href={getSocialUrl('twitter', profile.twitter_handle)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="no-underline"
                                            >
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:underline border-blue-100 gap-1.5 pl-2 pr-2.5 cursor-pointer transition-colors">
                                                    <XIcon className="h-3 w-3" />
                                                    {profile.twitter_handle.replace('@', '')}
                                                </Badge>
                                            </a>
                                        )}
                                        {profile?.telegram_handle && (
                                            <a 
                                                href={getSocialUrl('telegram', profile.telegram_handle)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="no-underline"
                                            >
                                                <Badge variant="secondary" className="bg-sky-50 text-sky-700 hover:bg-sky-100 hover:underline border-sky-100 gap-1.5 pl-2 pr-2.5 cursor-pointer transition-colors">
                                                    <TelegramIcon className="h-3 w-3" />
                                                    {profile.telegram_handle.replace('@', '')}
                                                </Badge>
                                            </a>
                                        )}
                                        {profile?.farcaster_handle && (
                                            <a 
                                                href={getSocialUrl('farcaster', profile.farcaster_handle)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="no-underline"
                                            >
                                                <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 hover:underline border-purple-100 gap-1.5 pl-2 pr-2.5 cursor-pointer transition-colors">
                                                    <FarcasterIcon className="h-3 w-3" />
                                                    {profile.farcaster_handle}
                                                </Badge>
                                            </a>
                                        )}
                                        {profile?.discord_handle && (
                                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 gap-1.5 pl-2 pr-2.5 cursor-default transition-colors">
                                                <DiscordIcon className="h-3 w-3" />
                                                {profile.discord_handle}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
                                    <Wallet className="h-4 w-4" />
                                    <span>{displayAddress}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(profile.wallet_address)}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>

                                {profile.bio ? (
                                    <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">{profile.bio}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No festive bio set yet.</p>
                                )}
                            </div>

                            {/* STATS SECTION */}
                            <div className="flex items-center gap-6 bg-background/50 p-4 rounded-xl border self-start md:self-center w-full md:w-auto justify-around md:justify-start">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{faucets.length}</div>
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">Faucets</div>
                                </div>
                                <div className="h-10 w-[1px] bg-border" />
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{questCount}</div> 
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

                {/* --- 2. ACTION BAR --- */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Active Deployments</h2>
                        <p className="text-muted-foreground mt-1">Token distributions on {targetUsername}&apos;s space.</p>
                    </div>
                    {isOwner && (
                        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                            <MyCreationsModal faucets={faucets} address={connectedAddress!} />
                            <CreateNewModal onSuccess={fetchData} />
                        </div>
                    )}
                </div>

                {/* --- 3. FILTERS --- */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search deployments..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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

                {/* --- 4. FAUCET LIST --- */}
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {filteredFaucets.map((faucet) => (
                        <FaucetCard 
                            key={faucet.faucetAddress} 
                            faucet={faucet} 
                            getNetworkName={getNetworkName}
                            getNetworkColor={getNetworkColor}
                            onManage={() => router.push(`/faucet/${faucet.faucetAddress}?networkId=${faucet.chainId}`)}
                            isOwner={isOwner}
                        />
                    ))}
                </div>
            </div>
        </main>
    )
}

function FaucetCard({ faucet, getNetworkName, getNetworkColor, onManage, isOwner }: any) {
    const networkName = getNetworkName(faucet.chainId)
    const networkColor = getNetworkColor(faucet.chainId)

    return (
        <Card className="hover:shadow-lg transition-all duration-200 flex flex-col group border-l-4" style={{ borderLeftColor: networkColor }}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    {/* Network Badge Restored */}
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