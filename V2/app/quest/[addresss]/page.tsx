"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, Save, TrendingUp, Users, ArrowRight, ExternalLink, AlertTriangle } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import { useNetwork } from '@/hooks/use-network'; 

// Header Component (Inline for simplicity)
const Header = ({ pageTitle }: { pageTitle: string }) => <h1 className="text-3xl font-bold mb-6">{pageTitle}</h1>;

// Backend API URL
const API_BASE_URL = "http://127.0.0.1:8000";

// --- Types ---
interface QuestTask {
    id: string;
    title: string;
    description: string;
    points: number;
    category: string;
    verificationType: string;
    url: string;
    stage: string;
}

interface QuestData {
    faucetAddress: string;
    title: string;
    description: string;
    isActive: boolean;
    rewardPool: string;
    creatorAddress: string;
    startDate: string;
    endDate: string;
    imageUrl: string;
    tasks: QuestTask[];
    tasksCount: number;
    participantsCount: number;
}

interface LeaderboardEntry {
    rank: number;
    walletAddress: string;
    points: number;
    completedTasks: number;
}

interface Submission {
    submissionId: string;
    walletAddress: string;
    taskId: string;
    taskTitle: string;
    submittedData: string; 
    submissionType: string;
    status: 'pending' | 'approved' | 'rejected';
}

export default function QuestDetailsPage() {
    const params = useParams();
    const router = useRouter();
    
    // --- 1. Robust Address Extraction (Fixes 404/Loading issues) ---
    // Extract the raw parameter from the URL (e.g., "quest-title-0x1234...")
    const rawSlug = params.faucetAddress as string | undefined; 
    
    // Use Regex to find the 42-char ETH address safely, ignoring the slug title
    const faucetAddress = useMemo(() => {
    if (!rawSlug) {
        console.log("No rawSlug provided");
        return undefined;
    }

    // First try: exact 42-char hex at the end
    let match = rawSlug.match(/(0x[a-fA-F0-9]{40})$/i);
    if (match) return match[0];

    // Fallback: if no slug, maybe rawSlug IS the full address
    if (/^0x[a-fA-F0-9]{40}$/i.test(rawSlug)) {
        console.log("rawSlug is pure address, using it directly");
        return rawSlug;
    }

    console.error("Failed to extract address from:", rawSlug);
    return undefined;
}, [rawSlug]);


    const { address: userWalletAddress } = useWallet(); 
    const { network } = useNetwork(); 
    
    const [questData, setQuestData] = useState<QuestData | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- 2. Real Data Fetching (Replaces Mock) ---
    useEffect(() => {
        // If params aren't loaded yet, wait.
        if (!rawSlug) return;

        // If extraction failed, stop loading and show error
        if (!faucetAddress) {
            setError("Invalid URL format. Could not find a valid Faucet Address.");
            setIsLoading(false);
            return;
        }

        const fetchAllData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                console.log(`fetching quest data for: ${faucetAddress}`);
                
                // Call the REAL backend API
                const response = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}`);
                
                if (!response.ok) {
                    if (response.status === 404) throw new Error("Quest not found in database.");
                    throw new Error(`Server Error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();console.log("QuestDetailsPage rendered");
            console.log("rawSlug from params:", rawSlug);
            console.log("Extracted faucetAddress:", faucetAddress);
                            
                            if (!data.success) {
                    throw new Error(data.message || "Failed to load quest details");
                }

                setQuestData(data.quest);

                // Placeholder for other endpoints (Implement these in backend later)
                setLeaderboard([]); 
                setPendingSubmissions([]);

            } catch (err: any) {
                console.error("Error fetching quest details:", err);
                setError(err.message || "Could not connect to backend.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [faucetAddress, rawSlug]);

    if (!faucetAddress) {
    setError("Invalid quest URL: Could not extract faucet address.");
    setIsLoading(false);
    return;
}


    // --- Admin Action Handlers ---
    const isCreator = userWalletAddress && questData && questData.creatorAddress.toLowerCase() === userWalletAddress.toLowerCase();

    const handleApprove = (submissionId: string) => { console.log(`Approving ${submissionId}`); };
    const handleReject = (submissionId: string) => { console.log(`Rejecting ${submissionId}`); };

    // --- Render States ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Quest Details...</p>
            </div>
        );
    }

    if (error || !questData) {
        return (
            <div className="max-w-4xl mx-auto p-6 mt-10">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-red-700">
                        <AlertTriangle className="h-10 w-10 mb-4" />
                        <h2 className="text-lg font-bold mb-2">Unable to Load Quest</h2>
                        <p className="mb-4">{error || "Quest data not found."}</p>
                        <Button variant="outline" className="border-red-200 hover:bg-red-100 text-red-700" onClick={() => router.push('/faucet/dashboard')}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
            <Header pageTitle={questData.title} />

            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Quest Image */}
                        <div className="w-full md:w-48 h-48 shrink-0 rounded-lg overflow-hidden border bg-muted">
                            {questData.imageUrl ? (
                                <img src={questData.imageUrl} alt={questData.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                            )}
                        </div>

                        {/* Quest Info */}
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold">{questData.title}</h1>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant={questData.isActive ? "default" : "secondary"} className={questData.isActive ? "bg-green-600" : ""}>
                                            {questData.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                        <Badge variant="outline">{network?.name || "Unknown Network"}</Badge>
                                    </div>
                                </div>
                                {isCreator && (
                                    <Button variant="outline" size="sm">
                                        Edit Quest
                                    </Button>
                                )}
                            </div>

                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {questData.description}
                            </p>

                            <div className="flex flex-wrap gap-4 text-sm mt-4">
                                <div className="bg-muted/50 px-3 py-1.5 rounded-md">
                                    <span className="font-semibold text-primary">{questData.rewardPool}</span> Reward Pool
                                </div>
                                <div className="bg-muted/50 px-3 py-1.5 rounded-md">
                                    <span className="font-semibold">{questData.tasks.length}</span> Tasks
                                </div>
                                <div className="bg-muted/50 px-3 py-1.5 rounded-md">
                                    <span className="font-semibold">{questData.participantsCount}</span> Participants
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                    <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Tasks</TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Activity</TabsTrigger>
                    <TabsTrigger value="leaderboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Leaderboard</TabsTrigger>
                </TabsList>

                {/* --- TASKS TAB --- */}
                <TabsContent value="tasks" className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {questData.tasks.map((task) => (
                            <Card key={task.id} className="hover:border-primary/50 transition-colors">
                                <CardContent className="p-4 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="capitalize">{task.stage} Stage</Badge>
                                        <span className="font-bold text-green-600">{task.points} Pts</span>
                                    </div>
                                    <h3 className="font-semibold mb-1">{task.title}</h3>
                                    <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-2">{task.description}</p>
                                    
                                    <Button className="w-full mt-auto" variant="secondary" asChild>
                                        <a href={task.url} target="_blank" rel="noreferrer">
                                            {task.verificationType === 'manual_link' ? 'Perform & Submit' : 'Go to Task'} <ExternalLink className="h-3 w-3 ml-2"/>
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* --- OTHER TABS (Placeholders) --- */}
                <TabsContent value="activity" className="mt-6 text-center text-muted-foreground">Activity feed coming soon.</TabsContent>
                <TabsContent value="leaderboard" className="mt-6 text-center text-muted-foreground">Leaderboard coming soon.</TabsContent>
            </Tabs>
        </div>
    );
}