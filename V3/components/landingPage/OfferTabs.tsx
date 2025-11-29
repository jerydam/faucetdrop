"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BicepsFlexed,
    Brain,
    ChessKnight,
    CircleCheckBig,
    CircleDollarSign,
    ExternalLink,
    ShieldCheck,
    Speech,
    Tags,
} from "lucide-react";
import Image from "next/image";

export default function OfferTabs() {
    return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-4xl flex flex-col gap-10">
                {/* Tabs */}
                <Tabs defaultValue="faucets" className="w-full">
                    {/* Top Tab Bar */}
                    <TabsList className="w-full flex justify-center bg-transparent p-0">
                        <div className="flex w-full md:w-fit bg-[#020817]/50 border border-white/5 rounded-full p-1 backdrop-blur-sm">
                            <TabsTrigger
                                value="faucets"
                                className="rounded-full px-10 py-2.5 text-sm text-gray-300 data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
                            >
                                Faucets
                            </TabsTrigger>

                            <TabsTrigger
                                value="quests"
                                className="rounded-full px-10 py-2.5 text-sm text-gray-300 data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
                            >
                                Quests
                            </TabsTrigger>

                            <TabsTrigger
                                value="quizzes"
                                className="rounded-full px-10 py-2.5 text-sm text-gray-300 data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
                            >
                                Quizzes
                            </TabsTrigger>
                            <TabsTrigger
                                value="enterprice"
                                className="rounded-full px-10 py-2.5 text-sm text-gray-300 data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
                            >
                                Enterprice
                            </TabsTrigger>
                        </div>
                    </TabsList>

                    {/* TAB CONTENT */}
                    <TabsContent value="faucets" className="text-white mt-5">
                        <div className="text-center text-sm opacity-60">
                            <Card className="bg-transparent text-white border-0">
                                <CardHeader>
                                    <CardTitle className="flex gap-12 items-center justify-center">
                                        <span className="flex items-center justify-center gap-1 text-xl">
                                            <Brain className="h-5 w-5 text-[#2563EB]" />
                                            Smarter
                                        </span>
                                        <span className="flex items-center justify-center gap-1 text-xl">
                                            <BicepsFlexed className="h-5 w-5 text-[#2563EB]" />
                                            Flexibility
                                        </span>
                                        <span className="flex items-center justify-center gap-1 text-xl">
                                            <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
                                            Onchain Distribution
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-3 gap-10">
                                    <div className="space-y-2 border-2 border-[#2563EB] p-5 rounded-xl">
                                        <h3 className="font-bold gap-2 text-base">
                                            Open Drop
                                        </h3>
                                        <p className="text-left leading-6">
                                            Open-access distribution secured with a unique 6-character drop-code
                                        </p>
                                        <Button
                                            onClick={() => { "/"; }}
                                            className="flex items-center float-right gap-2 cursor-pointer mt-5 bg-[#F8FAFC] text-[#0052FF] hover:bg-[#0052FF] hover:text-[#F8FAFC]"
                                        >
                                            Learn more <ExternalLink className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2 border-2 border-[#2563EB] p-5 rounded-xl">
                                        <h3 className="font-bold gap-2 text-base">
                                            Whitelist Drop
                                        </h3>
                                        <p className="text-left leading-6">
                                            Reward Specific wallets with pricision. Only approved addresses can claim.
                                        </p>
                                        <Button
                                            onClick={() => { "/"; }}
                                            className="flex items-center float-right gap-2 cursor-pointer mt-5 bg-[#F8FAFC] text-[#0052FF] hover:bg-[#0052FF] hover:text-[#F8FAFC]"
                                        >
                                            Learn more <ExternalLink className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2 border-2 border-[#2563EB] p-5 rounded-xl">
                                        <h3 className="font-bold gap-2 text-base">
                                            Custom Drop
                                        </h3>
                                        <p className="text-left leading-6">
                                            Advanced fully customizable distribution engine with complex logic
                                        </p>
                                        <Button
                                            onClick={() => { "/"; }}
                                            className="flex items-center float-right gap-2 cursor-pointer mt-5 bg-[#F8FAFC] text-[#0052FF] hover:bg-[#0052FF] hover:text-[#F8FAFC]"
                                        >
                                            Learn more <ExternalLink className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="quests" className="text-gray-300 mt-5">
                        <div className="text-center text-sm opacity-60">
                            <Card className="bg-transparent text-white border-0">
                                <CardHeader>
                                    <CardTitle className="flex gap-12 items-center justify-center">
                                        <span className="flex items-center justify-center gap-1 text-xl">
                                            <CircleDollarSign className="h-5 w-5 text-[#2563EB]" />
                                            Gamified Progress + Automated Rewards
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-10">
                                    <div className="flex items-center justify-center">
                                        <Image
                                            src="/celo.svg"
                                            alt=""
                                            width={200}
                                            height={200}
                                            className=""
                                        />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex flex-col gap-5">
                                            <div className="space-y-2">
                                                <p className="bold flex flex-row items-center gap-2 text-base">
                                                    <CircleCheckBig className="h-auto w-10 text-[#0052FF] bg-[#F8FAFC] rounded-full p-1 font-extrabold stroke-3" />
                                                    Create task-based quests with points and automatically distribute rewards upon completion
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => { "/"; }}
                                            className="flex items-center gap-2 cursor-pointer mt-5 bg-[#F8FAFC] text-[#0052FF] hover:bg-[#0052FF] hover:text-[#F8FAFC]"
                                        >
                                            Learn more <ExternalLink className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="quizzes" className="text-gray-300 mt-5">
                        <div className="text-center text-sm opacity-60">
                            <Card className="bg-transparent text-white border-0">
                                <CardHeader>
                                    <CardTitle className="flex gap-12 items-center justify-center">
                                        <span className="flex items-center justify-center gap-1 text-xl">
                                            <ChessKnight className="h-5 w-5 text-[#2563EB]" />
                                            Fun
                                        </span>
                                        <span className="flex items-center justify-center gap-1 text-xl">
                                            <Speech className="h-5 w-5 text-[#2563EB]" />
                                            Interactive
                                        </span>
                                        <span className="flex items-center justify-center gap-1 text-xl">
                                            <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
                                            AI-Powered Web3 Quiz Engine
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-10">
                                    <div className="flex items-center justify-center">
                                        <Image
                                            src="/celo.svg"
                                            alt=""
                                            width={200}
                                            height={200}
                                            className=""
                                        />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex flex-col gap-5">
                                            <div className="space-y-2">
                                                <p className="bold flex flex-row items-center gap-2 text-base">
                                                    <CircleCheckBig className="h-auto w-10 text-[#0052FF] bg-[#F8FAFC] rounded-full p-1 font-extrabold stroke-3" />
                                                    Set up interactive, time-based, AI-Powered Web3 quizzes, tied directly to onchain rewards
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => { "/"; }}
                                            className="flex items-center gap-2 cursor-pointer mt-5 bg-[#F8FAFC] text-[#0052FF] hover:bg-[#0052FF] hover:text-[#F8FAFC]"
                                        >
                                            Learn more <ExternalLink className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="enterprice" className="text-gray-300 mt-5">
                        <div className="text-center text-sm opacity-60">
                            <Card className="bg-transparent text-white border-0">
                                <CardHeader>
                                    <CardTitle className="flex gap-12 items-center justify-center">
                                        <span className="flex items-center justify-center gap-1 text-xl">
                                            <Tags className="h-5 w-5 text-[#2563EB]" />
                                            White Label Solutions
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-10">
                                    <div className="flex items-center justify-center">
                                        <Image
                                            src="/celo.svg"
                                            alt=""
                                            width={200}
                                            height={200}
                                            className=""
                                        />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-left">
                                            <div className="flex flex-col gap-5">
                                                <div className="space-y-2">
                                                    <p className="bold flex flex-row items-center gap-2 text-base">
                                                        <CircleCheckBig className="h-auto w-10 text-[#0052FF] bg-[#F8FAFC] rounded-full p-1 font-extrabold stroke-3" />
                                                        For Protocols and large ecosystems running massive Airdrops or global onboarding campaigns
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => { "/"; }}
                                                className="flex items-center gap-2 cursor-pointer mt-5 bg-[#F8FAFC] text-[#0052FF] hover:bg-[#0052FF] hover:text-[#F8FAFC]"
                                            >
                                                Learn more <ExternalLink className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
