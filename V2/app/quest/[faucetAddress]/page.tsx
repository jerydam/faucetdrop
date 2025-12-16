"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import { useNetwork } from '@/hooks/use-network'; 

const Header = ({ pageTitle }: { pageTitle: string }) => <h1 className="text-3xl font-bold mb-6">{pageTitle}</h1>;

// IMPORTANT: Update this to match your deployment
const API_BASE_URL = "https://fauctdrop-backend.onrender.com";

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

export default function QuestDetailsPage() {
    const params = useParams();
    const router = useRouter();
    
    // --- FIXED: Robust Address Extraction ---
    const rawSlug = params.faucetAddress as string | undefined; 
    
    const faucetAddress = useMemo(() => {
        if (!rawSlug) {
            console.log("❌ No rawSlug provided");
            return undefined;
        }

        console.log("🔍 Attempting to extract address from:", rawSlug);

        // Method 1: Try to find 0x followed by 40 hex chars (case-insensitive)
        // This handles: "quest-title-0xABCD...1234" format
        const addressPattern = /(0x[a-fA-F0-9]{40})/i;
        const match = rawSlug.match(addressPattern);
        
        if (match && match[1]) {
            console.log("✅ Address extracted successfully:", match[1]);
            return match[1];
        }

        // Method 2: Check if the entire rawSlug IS an address (no slug prefix)
        if (/^0x[a-fA-F0-9]{40}$/i.test(rawSlug)) {
            console.log("✅ rawSlug is a pure address:", rawSlug);
            return rawSlug;
        }

        console.error("❌ Failed to extract valid address from:", rawSlug);
        return undefined;
    }, [rawSlug]);

    const { address: userWalletAddress } = useWallet(); 
    const { network } = useNetwork(); 
    
    const [questData, setQuestData] = useState<QuestData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- FIXED: Data Fetching with Better Error Handling ---
    useEffect(() => {
        // Wait for params to be available
        if (!rawSlug) {
            console.log("⏳ Waiting for route params...");
            return;
        }

        // If extraction failed, show error immediately
        if (!faucetAddress) {
            console.error("❌ Invalid URL: Could not extract faucet address");
            setError("Invalid quest URL format. The faucet address could not be found.");
            setIsLoading(false);
            return;
        }

        const fetchQuestData = async () => {
            console.log(`📡 Fetching quest data for address: ${faucetAddress}`);
            setIsLoading(true);
            setError(null);

            try {
                const apiUrl = `${API_BASE_URL}/api/quests/${faucetAddress}`;
                console.log(`🌐 API Request: GET ${apiUrl}`);
                
                const response = await fetch(apiUrl);
                
                console.log(`📥 Response Status: ${response.status} ${response.statusText}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Quest not found. It may not exist in the database yet.");
                    }
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log("📦 Response data:", data);
                            
                if (!data.success) {
                    throw new Error(data.message || "Failed to load quest details");
                }

                console.log("✅ Quest data loaded successfully");
                setQuestData(data.quest);

            } catch (err: any) {
                console.error("❌ Error fetching quest details:", err);
                setError(err.message || "Could not connect to backend. Check console for details.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestData();
    }, [faucetAddress, rawSlug]);

    // --- Debug Info in Console ---
    useEffect(() => {
        console.log("=== Quest Details Page Debug ===");
        console.log("rawSlug:", rawSlug);
        console.log("Extracted faucetAddress:", faucetAddress);
        console.log("API Base URL:", API_BASE_URL);
        console.log("================================");
    }, [rawSlug, faucetAddress]);

    const isCreator = userWalletAddress && questData && 
        questData.creatorAddress.toLowerCase() === userWalletAddress.toLowerCase();

    // --- Loading State ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Quest Details...</p>
                <p className="text-xs text-gray-400">Address: {faucetAddress}</p>
            </div>
        );
    }

    // --- Error State ---
    if (error || !questData) {
        return (
            <div className="max-w-4xl mx-auto p-6 mt-10">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-red-700">
                        <AlertTriangle className="h-10 w-10 mb-4" />
                        <h2 className="text-lg font-bold mb-2">Unable to Load Quest</h2>
                        <p className="mb-4 text-center">{error || "Quest data not found."}</p>
                        <div className="text-xs text-gray-600 mb-4 p-2 bg-white rounded border">
                            <p><strong>Debug Info:</strong></p>
                            <p>URL Slug: {rawSlug || "N/A"}</p>
                            <p>Extracted Address: {faucetAddress || "Failed to extract"}</p>
                            <p>API URL: {API_BASE_URL}/api/quests/{faucetAddress || "N/A"}</p>
                        </div>
                        <Button 
                            variant="outline" 
                            className="border-red-200 hover:bg-red-100 text-red-700" 
                            onClick={() => router.push('/quest')}
                        >
                            Return to Quest List
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --- Success State: Display Quest ---
    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
            <Header pageTitle={questData.title} />

            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Quest Image */}
                        <div className="w-full md:w-48 h-48 shrink-0 rounded-lg overflow-hidden border bg-muted">
                            {questData.imageUrl ? (
                                <img 
                                    src={questData.imageUrl} 
                                    alt={questData.title} 
                                    className="w-full h-full object-cover" 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    No Image
                                </div>
                            )}
                        </div>

                        {/* Quest Info */}
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold">{questData.title}</h1>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge 
                                            variant={questData.isActive ? "default" : "secondary"} 
                                            className={questData.isActive ? "bg-green-600" : ""}
                                        >
                                            {questData.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                        <Badge variant="outline">
                                            {network?.name || "Unknown Network"}
                                        </Badge>
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
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {questData.tasks.map((task) => (
                            <Card key={task.id} className="hover:border-primary/50 transition-colors">
                                <CardContent className="p-4 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="capitalize">
                                            {task.stage} Stage
                                        </Badge>
                                        <span className="font-bold text-green-600">{task.points} Pts</span>
                                    </div>
                                    <h3 className="font-semibold mb-1">{task.title}</h3>
                                    <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-2">
                                        {task.description}
                                    </p>
                                    
                                    <Button className="w-full mt-auto" variant="secondary" asChild>
                                        <a href={task.url} target="_blank" rel="noreferrer">
                                            {task.verificationType === 'manual_link' ? 'Perform & Submit' : 'Go to Task'}
                                            <ExternalLink className="h-3 w-3 ml-2"/>
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-6 text-center text-muted-foreground">
                    Activity feed coming soon.
                </TabsContent>
                
                <TabsContent value="leaderboard" className="mt-6 text-center text-muted-foreground">
                    Leaderboard coming soon.
                </TabsContent>
            </Tabs>
        </div>
    );
}