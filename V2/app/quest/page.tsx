"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Settings, ArrowRight, Coins, Loader2, 
    Calendar, Sparkles, Users, LayoutGrid, List 
} from 'lucide-react'; // Added LayoutGrid and List imports
import { useWallet } from '@/hooks/use-wallet';
import { Header } from "@/components/header"; 

const API_BASE_URL = "https://faucetdrop-backend.onrender.com";

interface QuestOverview {
    faucetAddress: string;
    slug: string; 
    title: string;
    description: string;
    isActive: boolean;
    isFunded: boolean;
    rewardPool: string;
    tokenSymbol?: string;
    creatorAddress: string;
    startDate: string;
    endDate: string;
    tasksCount: number;
    totalParticipants: number; 
    imageUrl?: string;
}

interface QuestsResponse {
    success: boolean;
    quests: QuestOverview[];
    count: number;
    message?: string;
}

const getQuestStatus = (quest: QuestOverview) => {
    const now = new Date();
    const startDate = new Date(quest.startDate);
    const endDate = new Date(quest.endDate);

    if (!quest.isFunded) return { label: "Pending Funding", color: "bg-yellow-100 text-yellow-800 border-yellow-200", interactable: false };
    if (now < startDate) return { label: "Upcoming", color: "bg-blue-100 text-blue-800 border-blue-200", interactable: false };
    if (now > endDate) return { label: "Ended", color: "bg-gray-100 text-gray-600 border-gray-200", interactable: false };
    
    return { label: "Active", color: "bg-green-100 text-green-800 border-green-200", interactable: true };
};

export default function QuestHomePage() {
    const router = useRouter();
    const { address } = useWallet();
    const [quests, setQuests] = useState<QuestOverview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // NEW: State for View Mode
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const fetchQuests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/quests?cache_bust=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const data: QuestsResponse = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to retrieve quests.');

            setQuests(data.quests || []);
        } catch (err: any) {
            console.error("Error fetching quests:", err);
            setError(err.message || "Could not connect to the Quest API.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuests();
    }, []);

    const filteredQuests = useMemo(() => {
        return quests.filter(quest => {
            if (!quest.faucetAddress || !quest.faucetAddress.startsWith("0x")) {
                return false;
            }
            return quest.isActive === true; 
        });
    }, [quests]);

    const handleNavigate = (slug: string) => {
        router.push(`/quest/${slug}`);
    };

    return (
        <>
        <Header pageTitle='Quest Hub' />
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight">Explore Quests</h2>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1 shadow-sm">
                            <Sparkles className="h-3 w-3" /> Beta Phase
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">Participate in active campaigns to earn crypto rewards.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* NEW: View Mode Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border dark:border-slate-700 hidden sm:flex">
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-8 px-2.5 shadow-none"
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-8 px-2.5 shadow-none"
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button 
                        variant="outline"
                        onClick={() => router.push(address ? `/dashboard/${address}` : '/')}
                        className="flex-1 md:flex-none"
                    >
                        My Dashboard
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                    <p>Loading Active Campaigns...</p>
                </div>
            ) : error ? (
                <Card className="p-6 border-red-200 bg-red-50 text-red-800 flex flex-col items-center text-center">
                    <p className="font-semibold text-lg mb-2">Unable to load quests</p>
                    <p className="text-sm mb-4">{error}</p>
                    <Button onClick={fetchQuests} variant="outline" className="border-red-300 hover:bg-red-100">
                        Retry
                    </Button>
                </Card>
            ) : filteredQuests.length === 0 ? (
                <Card className="py-20 text-center text-muted-foreground border-dashed">
                    <p className="text-lg">No active quests found.</p>
                    <Button variant="link" onClick={() => router.push('/quest/create-quest')}>
                        Be the first to create one!
                    </Button>
                </Card>
            ) : (
                /* NEW: Dynamic Grid Layout based on viewMode */
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {filteredQuests.map((quest) => {
                        const isOwner = address && quest.creatorAddress.toLowerCase() === address.toLowerCase();
                        const status = getQuestStatus(quest);
                        
                        return (
                            <Card key={quest.faucetAddress} className="group hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col bg-white dark:bg-slate-950">
                                {/* NEW: Dynamic Card Layout based on viewMode */}
                                <div className={`flex flex-1 ${viewMode === 'list' ? 'flex-col md:flex-row' : 'flex-col'}`}>
                                    
                                    {/* Image Section */}
                                    {quest.imageUrl && (
                                        <div className={`shrink-0 bg-slate-100 dark:bg-slate-900 border-b md:border-b-0 ${viewMode === 'list' ? 'md:border-r border-slate-200 dark:border-slate-800 w-full md:w-64 h-48 md:h-auto min-h-[12rem]' : 'w-full h-48'}`}>
                                             <img src={quest.imageUrl} alt={quest.title} className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    {/* Content Section */}
                                    <div className="flex-1 flex flex-col p-5 md:p-6">
                                        <div className={`flex mb-4 gap-4 ${viewMode === 'list' ? 'flex-col sm:flex-row sm:items-start justify-between' : 'flex-col'}`}>
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
                                                        {quest.title}
                                                    </h3>
                                                    <span className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full border ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <p className={`text-sm text-muted-foreground ${viewMode === 'grid' ? 'line-clamp-3' : 'line-clamp-2'}`}>
                                                    {quest.description}
                                                </p>
                                            </div>
                                            
                                            {/* Button Container */}
                                            <div className={`shrink-0 ${viewMode === 'grid' ? 'w-full mt-2' : 'w-full sm:w-auto'}`}>
                                                <Button 
                                                    size={viewMode === 'grid' ? 'default' : 'sm'} 
                                                    className={`w-full font-semibold ${
                                                        isOwner 
                                                            ? "bg-slate-900 text-white hover:bg-slate-800" 
                                                            : status.interactable 
                                                                ? "bg-primary text-white hover:bg-primary/90" 
                                                                : "bg-secondary text-secondary-foreground"
                                                    }`}
                                                    onClick={() => handleNavigate(quest.slug || quest.faucetAddress)}
                                                >
                                                    {isOwner ? (
                                                        <><Settings className="h-4 w-4 mr-2" /> Manage</>
                                                    ) : (
                                                        <>
                                                            {status.interactable ? "Join Quest" : "View Details"} 
                                                            <ArrowRight className="h-4 w-4 ml-2" />
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Footer Stats */}
                                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-6 gap-y-3 text-xs sm:text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-blue-50 text-blue-600 rounded">
                                                    <Coins className="h-4 w-4" />
                                                </div>
                                                <span>
                                                    Pool: <span className="font-bold text-foreground">
                                                        {quest.rewardPool} {quest.tokenSymbol || "Tokens"}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-purple-50 text-purple-600 rounded">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <span>
                                                    <span className="font-bold text-foreground">
                                                        {quest.totalParticipants ?? 0}
                                                    </span> Participants
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-orange-50 text-orange-600 rounded">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <span>Ends: {new Date(quest.endDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
        </>
    );
}