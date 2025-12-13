"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { 
    Settings, 
    Plus, 
    Loader2, 
    Search, 
    Copy, 
    ExternalLink, 
    LayoutGrid, 
    List as ListIcon,
    Wallet
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// --- Custom Components ---
import { ProfileSettingsModal } from "@/components/profile-setting" 
import { MyCreationsModal } from "@/components/my-creations-modal" 
import { CreateNewModal } from "@/components/create-new-modal" // Ensure this path is correct

// --- Types ---
interface FaucetData {
    faucetAddress: string
    name: string
    chainId: number
    faucetType: string
    createdAt?: string
}

interface UserProfileData {
    username: string
    email?: string
    bio?: string
    avatar_url?: string
    twitter_handle?: string
    discord_handle?: string
    telegram_handle?: string
    farcaster_handle?: string
}

interface QuestData {
    faucetAddress: string
    creatorAddress: string
    title: string
}

interface QuizData {
    id: string
    creatorAddress: string
    title: string
}

export default function DashboardPage() {
    const { address, isConnected } = useWallet()
    const { networks } = useNetwork()
    const router = useRouter()
    const { toast } = useToast()
    
    // State
    const [faucets, setFaucets] = useState<FaucetData[]>([])
    const [questCount, setQuestCount] = useState<number>(0) 
    const [quizCount, setQuizCount] = useState<number>(0)
    const [profile, setProfile] = useState<UserProfileData | null>(null)
    
    const [loadingFaucets, setLoadingFaucets] = useState(true)
    const [loadingProfile, setLoadingProfile] = useState(true)
    
    const [searchQuery, setSearchQuery] = useState("")
    const [networkFilter, setNetworkFilter] = useState("all")
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // --- Data Fetching ---
    useEffect(() => {
        if (!isConnected || !address) {
            setLoadingFaucets(false)
            setLoadingProfile(false)
            return
        }

        const backendUrl = "https://fauctdrop-backend.onrender.com"; 

        // 1. Fetch Faucets
        const fetchFaucets = async () => {
            setLoadingFaucets(true)
            try {
                const data = await getUserFaucets(address)
                setFaucets(data)
            } catch (error) {
                console.error("Failed to load faucets", error)
                toast({ title: "Error", description: "Could not load your faucets.", variant: "destructive" })
            } finally {
                setLoadingFaucets(false)
            }
        }

        // 2. Fetch User Profile
        const fetchProfile = async () => {
            setLoadingProfile(true)
            try {
                const response = await fetch(`${backendUrl}/api/profile/${address}?t=${Date.now()}`)
                const data = await response.json()
                
                if (data.success && data.profile) {
                    setProfile(data.profile)
                }
            } catch (error) {
                console.error("Failed to fetch profile", error)
            } finally {
                setLoadingProfile(false)
            }
        }

        // 3. Fetch Stats (Quests & Quizzes)
        const fetchStats = async () => {
            try {
                // Fetch Quests
                const questRes = await fetch(`${backendUrl}/api/quests`)
                const questData = await questRes.json()
                if (questData.success && Array.isArray(questData.quests)) {
                    const myQuests = questData.quests.filter((q: QuestData) => 
                        q.creatorAddress.toLowerCase() === address.toLowerCase()
                    )
                    setQuestCount(myQuests.length)
                }

                // Fetch Quizzes
                try {
                    const quizRes = await fetch(`${backendUrl}/api/quizzes`)
                    if (quizRes.ok) {
                        const quizData = await quizRes.json()
                        if (quizData.success && Array.isArray(quizData.quizzes)) {
                            const myQuizzes = quizData.quizzes.filter((q: QuizData) => 
                                q.creatorAddress.toLowerCase() === address.toLowerCase()
                            )
                            setQuizCount(myQuizzes.length)
                        }
                    }
                } catch (e) {
                    // console.log("Quiz endpoint unavailable")
                }

            } catch (error) {
                console.error("Failed to fetch stats", error)
            }
        }

        fetchFaucets()
        fetchProfile()
        fetchStats()
    }, [address, isConnected, toast])

    // --- Helpers ---
    const getNetworkName = (chainId: number) => networks.find(n => n.chainId === chainId)?.name || `Chain ${chainId}`
    const getNetworkColor = (chainId: number) => networks.find(n => n.chainId === chainId)?.color || "#64748b"

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast({ title: "Copied", description: `${label} copied to clipboard` })
    }

    const handleManage = (faucet: FaucetData) => {
        router.push(`/faucet/${faucet.faucetAddress}?networkId=${faucet.chainId}`)
    }

    // --- Filtering Logic ---
    const filteredFaucets = useMemo(() => {
        return faucets.filter(faucet => {
            const matchesSearch = 
                faucet.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                faucet.faucetAddress.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesNetwork = networkFilter === "all" || faucet.chainId.toString() === networkFilter
            return matchesSearch && matchesNetwork
        })
    }, [faucets, searchQuery, networkFilter])

    // --- Empty State ---
    if (!isConnected) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                 <Card className="w-full max-w-md text-center border-dashed">
                    <CardHeader>
                        <div className="mx-auto bg-muted p-4 rounded-full mb-4">
                            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle>Connect Wallet</CardTitle>
                        <CardDescription>Please connect your wallet to view your dashboard.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    const displayName = profile?.username || "Anonymous User"
    const displayAddress = address ? `${address.slice(0,6)}...${address.slice(-4)}` : ""

    return (
        <main className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
                <Header pageTitle="Dashboard" />

                {/* --- 1. USER IDENTITY SECTION --- */}
                <div className="mb-10">
                    <Card className="border-none bg-gradient-to-r from-primary/5 via-primary/10 to-background shadow-sm">
                        <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                            
                            <div className="relative group">
                                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg">
                                    <AvatarImage src={profile?.avatar_url} className="object-cover" />
                                    <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                                        {displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2">
                                    <div className="bg-background rounded-full shadow-md">
                                        <ProfileSettingsModal /> 
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                                    {loadingProfile ? (
                                        <Skeleton className="h-8 w-48" />
                                    ) : (
                                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                            {displayName}
                                        </h1>
                                    )}
                                    
                                    <div className="flex gap-2 flex-wrap">
                                        {profile?.twitter_handle && (
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100">
                                                𝕏 {profile.twitter_handle}
                                            </Badge>
                                        )}
                                        {profile?.telegram_handle && (
                                            <Badge variant="secondary" className="bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-100">
                                                ✈️ {profile.telegram_handle}
                                            </Badge>
                                        )}
                                        {profile?.farcaster_handle && (
                                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100">
                                                🟣 {profile.farcaster_handle}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
                                    <Wallet className="h-4 w-4" />
                                    <span>{displayAddress}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 hover:bg-muted" 
                                        onClick={() => copyToClipboard(address || "", "Address")}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>

                                {profile?.bio ? (
                                    <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
                                        {profile.bio}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No bio yet.</p>
                                )}
                            </div>

                            {/* Stats */}
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Your Deployments</h2>
                        <p className="text-muted-foreground mt-1">Manage your active faucets and claim distributions.</p>
                    </div>
                    
                    {/* Updated Action Buttons Section */}
                    <div className="flex flex-wrap gap-3 w-full md:w-auto mt-4 md:mt-0">
                        {/* Library Button */}
                        <MyCreationsModal faucets={faucets} address={address} />
                        
                        {/* Create New Button (Using the Modal) */}
                        <CreateNewModal />
                    </div>
                </div>

                {/* --- 3. FILTERS --- */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search deployments..." 
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={networkFilter} onValueChange={setNetworkFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="All Networks" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Networks</SelectItem>
                            {networks.map(n => (
                                <SelectItem key={n.chainId} value={n.chainId.toString()}>
                                    {n.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="hidden sm:flex bg-muted rounded-md p-1">
                        <Button 
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('list')}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* --- 4. FAUCET LIST --- */}
                {loadingFaucets ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading your faucets...</p>
                    </div>
                ) : filteredFaucets.length === 0 ? (
                    <Card className="border-dashed py-12">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="bg-muted p-4 rounded-full">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg">No deployments found</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    {searchQuery ? "Try adjusting your search or filters." : "Get started by creating your first project."}
                                </p>
                            </div>
                            {!searchQuery && (
                                <CreateNewModal />
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                        {filteredFaucets.map((faucet) => (
                            <FaucetCard 
                                key={faucet.faucetAddress} 
                                faucet={faucet} 
                                viewMode={viewMode}
                                getNetworkName={getNetworkName}
                                getNetworkColor={getNetworkColor}
                                onManage={() => handleManage(faucet)}
                                onCopy={() => copyToClipboard(faucet.faucetAddress, "Address")}
                            />
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}

function FaucetCard({ 
    faucet, 
    viewMode, 
    getNetworkName, 
    getNetworkColor, 
    onManage, 
    onCopy 
}: { 
    faucet: FaucetData, 
    viewMode: 'grid' | 'list',
    getNetworkName: (id: number) => string,
    getNetworkColor: (id: number) => string,
    onManage: () => void,
    onCopy: () => void
}) {
    const networkName = getNetworkName(faucet.chainId)
    const networkColor = getNetworkColor(faucet.chainId)
    const dateCreated = faucet.createdAt ? new Date(faucet.createdAt).toLocaleDateString() : "N/A"

    if (viewMode === 'list') {
        return (
            <Card className="hover:shadow-md transition-shadow group">
                <div className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-bold text-primary">{faucet.name.charAt(0).toUpperCase()}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                            <h3 className="font-semibold truncate">{faucet.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono truncate max-w-[100px]">{faucet.faucetAddress}</span>
                                <button onClick={(e) => { e.stopPropagation(); onCopy(); }} className="hover:text-foreground">
                                    <Copy className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-background" style={{ borderColor: networkColor, color: networkColor }}>
                                <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: networkColor }}></span>
                                {networkName}
                            </Badge>
                        </div>

                        <div>
                            <Badge variant="secondary" className="capitalize">{faucet.faucetType}</Badge>
                        </div>

                        <div className="text-xs text-muted-foreground hidden md:block">
                            Created: {dateCreated}
                        </div>
                    </div>

                    <Button onClick={onManage} size="sm" className="shrink-0">
                        <Settings className="h-4 w-4 mr-2" /> Manage
                    </Button>
                </div>
            </Card>
        )
    }

    return (
        <Card className="hover:shadow-lg transition-all duration-200 group flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <Badge variant="outline" className="mb-2 w-fit bg-background" style={{ borderColor: networkColor, color: networkColor }}>
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: networkColor }}></span>
                        {networkName}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-xs">
                        {faucet.faucetType === 'dropcode' ? 'Drop Code' : faucet.faucetType === 'droplist' ? 'Drop List' : 'Custom'}
                    </Badge>
                </div>
                <CardTitle className="truncate text-lg">{faucet.name || "Untitled Faucet"}</CardTitle>
                <CardDescription className="font-mono text-xs flex items-center gap-2 mt-1">
                    {faucet.faucetAddress.slice(0, 6)}...{faucet.faucetAddress.slice(-4)}
                    <button onClick={(e) => { e.stopPropagation(); onCopy(); }} className="hover:text-foreground p-1 rounded hover:bg-muted transition-colors">
                        <Copy className="h-3 w-3" />
                    </button>
                    <a 
                        href="#" 
                        className="hover:text-foreground p-1 rounded hover:bg-muted transition-colors ml-auto"
                        onClick={(e) => e.preventDefault()}
                    >
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                    <div className="bg-muted/50 p-2 rounded">
                        <span className="block font-semibold text-foreground">Created</span>
                        {dateCreated}
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                        <span className="block font-semibold text-foreground">Chain ID</span>
                        {faucet.chainId}
                    </div>
                </div>
            </CardContent>
            <div className="p-4 pt-0 mt-auto">
                <Button onClick={onManage} className="w-full group-hover:bg-primary/90">
                    <Settings className="h-4 w-4 mr-2" /> Manage Faucet
                </Button>
            </div>
        </Card>
    )
}