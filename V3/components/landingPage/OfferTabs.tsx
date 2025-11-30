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

// const flipCardStyle = `
//   .flip-card {
//     perspective: 1000px;
//     height: 240px;
//   }
//   .flip-card-inner {
//     position: relative;
//     width: 100%;
//     height: 100%;
//     text-align: center;
//     transition: transform 0.6s;
//     transform-style: preserve-3d;
//   }
//   .flip-card:hover .flip-card-inner {
//     transform: rotateY(180deg);
//   }
//   .flip-card-front, .flip-card-back {
//     position: absolute;
//     width: 100%;
//     height: 100%;
//     -webkit-backface-visibility: hidden;
//     backface-visibility: hidden;
//     border-radius: 0.75rem;
//     padding: 1.25rem;
//     display: flex;
//     flex-direction: column;
//   }
//   .flip-card-front {
//     background-color: #2563EB;
//     }
//     .flip-card-back {
//         // background-color: #2563EB;
//     border: 2px solid #2563EB;
//     color: white;
//     transform: rotateY(180deg);
//     justify-content: center;
//     align-items: center;
//     text-align: center;
//   }
// `;

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
                                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* <style>{flipCardStyle}</style> */}
                                    {/* <div className="flip-card">
                                        <div className="flip-card-inner">
                                            <div className="flip-card-front flex items-center justify-center">
                                                <h3 className="font-bold gap-2 text-4xl">
                                                    Open Drop
                                                </h3>
                                            </div>
                                            <div className="flip-card-back">
                                                <p className="text-left leading-7 mt-2 text-xl">
                                                    Open-access distribution secured with a unique 6-character drop-code
                                                </p>
                                                <Button
                                                    onClick={() => { "/"; }}
                                                    className="flex items-center float-right gap-2 cursor-pointer mt-auto bg-[#F8FAFC] text-[#0052FF] hover:bg-[#0052FF] hover:text-[#F8FAFC]"
                                                >
                                                    Learn more <ExternalLink className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div> */}

                                    <div className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer" >
                                        <h3 className="text-xl font-semibold relative bottom-0">Open Drop</h3>
                                        <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                                            Open-access distribution secured with a unique 6-character drop-code
                                        </p>

                                        <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                                            Learn more <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* <div className="flip-card">
                                        <div className="flip-card-inner">
                                            <div className="flip-card-front flex items-center justify-center">
                                                <h3 className="font-bold gap-2 text-4xl">
                                                    Whitelist Drop
                                                </h3>
                                            </div>
                                            <div className="flip-card-back">
                                                <p className="text-left leading-7 mt-2 text-xl">
                                                    Reward specific wallets with precision. Only approved addresses can claim.
                                                </p>
                                                <Button
                                                    onClick={() => { "/"; }}
                                                    className="flex items-center float-right gap-2 cursor-pointer mt-auto bg-[#F8FAFC] text-[#0052FF] hover:bg-[#0052FF] hover:text-[#F8FAFC]"
                                                >
                                                    Learn more <ExternalLink className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div> */}

                                    <div className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer" >
                                        <h3 className="text-xl font-semibold relative bottom-0">Whitelist Drop</h3>
                                        <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                                            Reward specific wallets with precision. Only approved addresses can claim.
                                        </p>

                                        <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                                            Learn more <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* <div className="flip-card">
                                        <div className="flip-card-inner">
                                            <div className="flip-card-front flex items-center justify-center">
                                                <h3 className="font-bold gap-2 text-4xl">
                                                    Custom Drop
                                                </h3>

                                            </div>
                                            <div className="flip-card-back">
                                                <p className="text-left leading-7 mt-2 text-xl">
                                                    Advanced fully customizable distribution engine with complex logic
                                                </p>
                                                <Button
                                                    onClick={() => { "/"; }}
                                                    className="flex items-center float-right gap-2 cursor-pointer mt-auto bg-[#F8FAFC] text-[#0052FF] hover:bg-[#0052FF] hover:text-[#F8FAFC]"
                                                >
                                                    Learn more <ExternalLink className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div> */}

                                    <div className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer" >
                                        <h3 className="text-xl font-semibold relative bottom-0">Custom Drop</h3>
                                        <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                                            Advanced fully customizable distribution engine with complex logic
                                        </p>

                                        <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                                            Learn more <ExternalLink className="h-4 w-4" />
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
                                    <div className="flex items-center justify-center ring-1 ring-[#2563EB] rounded-lg">
                                        <Image
                                            src="/celo.svg"
                                            alt=""
                                            width={200}
                                            height={200}
                                            className="transition-all duration-300 ease-out group-hover:scale-110"
                                        />
                                    </div>
                                    <div className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer" >
                                        <h3 className="text-xl font-semibold relative bottom-0">Gamified Progress + Automated Rewards</h3>
                                        <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                                            Incentivize users who lend or borrow assets on Aave, Morpho, Euler, and more protocols.
                                        </p>

                                        <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                                            Learn more <ExternalLink className="h-4 w-4" />
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
                                    <div className="flex items-center justify-center ring-1 ring-[#2563EB] rounded-lg">
                                        <Image
                                            src="/celo.svg"
                                            alt=""
                                            width={200}
                                            height={200}
                                            className="transition-all duration-300 ease-out group-hover:scale-110"
                                        />
                                    </div>
                                    {/* <div className="text-left">
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
                                    </div> */}
                                    <div className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer" >
                                        <h3 className="text-xl font-semibold relative bottom-0">Engagements</h3>
                                        <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                                            Set up interactive, time-based, AI-Powered Web3 quizzes, tied directly to onchain rewards
                                        </p>

                                        <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                                            Learn more <ExternalLink className="h-4 w-4" />
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
                                    <div className="flex items-center justify-center ring-1 ring-[#2563EB] rounded-lg">
                                        <Image
                                            src="/celo.svg"
                                            alt=""
                                            width={200}
                                            height={200}
                                            className="transition-all duration-300 ease-out group-hover:scale-110"
                                        />
                                    </div>
                                    {/* <div className="text-left">
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
                                    </div> */}
                                    <div className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer" >
                                        <h3 className="text-xl font-semibold relative bottom-0">White Label Solutions</h3>
                                        <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                                            For Protocols and large ecosystems running massive Airdrops or global onboarding campaigns
                                        </p>

                                        <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                                            Learn more <ExternalLink className="h-4 w-4" />
                                        </Button>
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
