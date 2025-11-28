// src/pages/QuestHomePage.tsx (or components/QuestHomePage.tsx)

"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from '@/components/header';
import { Plus, Settings, TrendingUp, Users, ArrowRight, Badge, Coins, Loader2 } from 'lucide-react';

// Backend API URL
const API_BASE_URL = "http://127.0.0.1:8000";

// Simplified Quest Interface (matches what the backend will return)
interface QuestOverview {
    faucetAddress: string;
    title: string;
    description: string;
    isActive: boolean;
    rewardPool: string;
    creatorAddress: string;
    startDate: string;
    endDate: string;
    tasksCount: number;
    participantsCount: number; // Placeholder for activity data
}

export default function QuestHomePage() {
    const router = useRouter();
    const [quests, setQuests] = useState<QuestOverview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching ---
    const fetchQuests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // NOTE: You need a GET /api/quests endpoint on your FastAPI backend 
            // to fetch quests. I assume it returns List[QuestOverview].
            const response = await fetch(`${API_BASE_URL}/api/quests`);
            if (!response.ok) {
                throw new Error('Failed to fetch quests from backend.');
            }
            const data = await response.json();
            // Mock data structure if backend isn't ready
            const fetchedQuests: QuestOverview[] = data.quests || []; 

            // Mocked Data (Remove when backend is fully implemented)
            if (fetchedQuests.length === 0) {
                 fetchedQuests.push({
                    faucetAddress: "0xMockQuestFaucet1234567890",
                    title: "Launch Community Campaign",
                    description: "Complete key steps to secure your whitelist spot.",
                    isActive: true,
                    rewardPool: "10,000 CELO",
                    creatorAddress: "0xUserA...",
                    startDate: "2025-11-20",
                    endDate: "2025-12-30",
                    tasksCount: 7,
                    participantsCount: 1542,
                });
            }

            setQuests(fetchedQuests);
        } catch (err: any) {
            setError(err.message);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuests();
    }, []);

    // --- Render Logic ---

    const handleViewQuest = (faucetAddress: string) => {
        // Navigate to the details page for management/user activity
        router.push(`/quests/${faucetAddress}`);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <Header pageTitle='Quest Management Hub' />

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Active Quests ({quests.length})</h2>
                <Button onClick={() => router.push('/quest/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Quest
                </Button>
            </div>

            {isLoading ? (
                <Card className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading Quests...</Card>
            ) : error ? (
                <Card className="p-4 border-red-500 bg-red-50 text-red-700">Error: {error}</Card>
            ) : quests.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">No quests found. Start by creating one!</Card>
            ) : (
                <div className="space-y-4">
                    {quests.map((quest) => (
                        <Card key={quest.faucetAddress} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className='space-y-1'>
                                    <CardTitle className="text-xl">{quest.title}</CardTitle>
                                    <CardDescription>{quest.description}</CardDescription>
                                </div>
                                <div className="flex space-x-2">
                                    <Badge variant={quest.isActive ? 'default' : 'secondary'} className="uppercase">
                                        {quest.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                    <Button size="sm" onClick={() => handleViewQuest(quest.faucetAddress)}>
                                        Manage / View <ArrowRight className='h-4 w-4 ml-2' />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Tasks: {quest.tasksCount}</div>
                                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Participants: {quest.participantsCount}</div>
                                <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-primary" /> Reward Pool: {quest.rewardPool}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}