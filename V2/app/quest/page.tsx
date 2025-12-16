// src/pages/QuestHomePage.tsx
 "use client";
// import React, { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Plus, Settings, Users, ArrowRight, Coins, Loader2 } from 'lucide-react';
// // Assume Header is a component defined elsewhere
// const Header = ({ pageTitle }: { pageTitle: string }) => <h1 className="text-3xl font-bold">{pageTitle}</h1>;

// // Backend API URL
// const API_BASE_URL = "https://fauctdrop-backend.onrender.com";
// interface QuestOverview {
//     faucetAddress: string;
//     title: string;
//     description: string;
//     isActive: boolean;
//     rewardPool: string;
//     creatorAddress: string;
//     startDate: string;
//     endDate: string;
//     tasksCount: number;
//     participantsCount: number;
// }
// interface QuestsResponse {
//     success: boolean;
//     quests: QuestOverview[];
//     count: number;
//     message?: string;
// }

// function createSlug(title: string): string {
//     return title
//         .toLowerCase()
//         .replace(/[^a-z0-9\s-]/g, '')
//         .trim()
//         .replace(/\s+/g, '-');
// }

// export default function QuestHomePage() {
//     const router = useRouter();
//     const [quests, setQuests] = useState<QuestOverview[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     // --- Data Fetching (LIVE API CALL) ---
//     const fetchQuests = async () => {
//         setIsLoading(true);
//         setError(null);
//         try {
//             const response = await fetch(`${API_BASE_URL}/api/quests`);
            
//             if (!response.ok) {
//                 throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
//             }
            
//             const data: QuestsResponse = await response.json();
            
//             if (!data.success) {
//                 throw new Error(data.message || 'Failed to retrieve quests from backend with no specific error message.');
//             }

//             const fetchedQuests: QuestOverview[] = data.quests || []; 
//             setQuests(fetchedQuests);
            
//         } catch (err: any) {
//             console.error("Error fetching quests:", err);
//             setError(err.message || "Could not connect to the Quest Management API at " + API_BASE_URL);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchQuests();
//     }, []);

//     const handleViewQuest = (faucetAddress: string, title: string) => {
//     const slug = createSlug(title);  // e.g., "new-community-campaign"
//     const fullPath = `/quest/${slug}-${faucetAddress}`;
//     router.push(fullPath);
// };

//     return (
//         <div className="max-w-6xl mx-auto p-6 space-y-6">
//             <Header pageTitle='Quest Management Hub' />

//             <div className="flex justify-between items-center">
//                 <h2 className="text-2xl font-bold">Active Quests ({quests.length})</h2>
//                 <Button onClick={() => router.push('/quest/create-quest')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
//                     <Plus className="h-4 w-4 mr-2" />
//                     Create New Quest
//                 </Button>
//             </div>

//             {isLoading ? (
//                 <Card className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading Quests...</Card>
//             ) : error ? (
//                 <Card className="p-4 border border-red-500 bg-red-50 text-red-700">
//                     <p className="font-semibold">Error Loading Quests:</p>
//                     <p className="text-sm">{error}</p>
//                     <Button 
//                         onClick={fetchQuests} 
//                         size="sm" 
//                         variant="ghost" 
//                         className="mt-2 text-red-700 hover:bg-red-100"
//                     >
//                         Retry Fetch
//                     </Button>
//                 </Card>
//             ) : quests.length === 0 ? (
//                 <Card className="p-8 text-center text-muted-foreground">No quests found. Start by creating one!</Card>
//             ) : (
//                 <div className="space-y-4">
//                     {quests.map((quest) => (
//                         <Card key={quest.faucetAddress} className="hover:shadow-lg transition-shadow">
//                             <CardHeader className="flex flex-row items-center justify-between">
//                                 <div className='space-y-1'>
//                                     <CardTitle className="text-xl">{quest.title}</CardTitle>
//                                     <CardDescription>{quest.description}</CardDescription>
//                                 </div>
//                                 <div className="flex space-x-2">
//                                     <div className={`px-3 py-1 text-xs font-medium rounded-full ${quest.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
//                                         {quest.isActive ? 'Active' : 'Inactive'}
//                                     </div>
//                                     <Button size="sm" onClick={() => handleViewQuest(quest.faucetAddress, quest.title)}>
//                                         Manage / View <ArrowRight className='h-4 w-4 ml-2' />
//                                     </Button>
//                                 </div>
//                             </CardHeader>
//                             <CardContent className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
//                                 <div className="flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Tasks: {quest.tasksCount}</div>
//                                 <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Participants: {quest.participantsCount}</div>
//                                 <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-primary" /> Reward Pool: {quest.rewardPool}</div>
//                             </CardContent>
//                         </Card>
//                     ))}
//                 </div>
//             )}
//         </div>
//     );
// }
import Image from 'next/image';
import Link from 'next/link';
import { siX, siTelegram, siGmail } from 'simple-icons/icons'

interface IconProps {
  path: string;
  title?: string;
}

interface SimpleIconProps {
  icon: IconProps;
  size?: number | string;
  className?: string;
}

export const SimpleIcon: React.FC<SimpleIconProps> = ({
  icon,
  size = 24,
  className = 'text-white'
}) => {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={icon.path} />
    </svg>
  );
};

export default function ComingSoon() {
  const socialLinks = [
    { icon: <SimpleIcon icon={siX} size={20} />, href: 'https://x.com/faucetdrops', label: 'Twitter' },
    { icon: <SimpleIcon icon={siTelegram} size={20} />, href: 'https://t.me/faucetdropschat', label: 'Telegram' },
    { icon: <SimpleIcon icon={siGmail} size={20} />, href: 'mailto:drops.faucet@gmail.com', label: 'Email' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        
        {/* Updated: Added flex and justify-center to center the logo */}
        <div className="flex justify-center relative">
          {/* 1. Light Mode Logo: Visible by default, hidden in dark mode */}
          <Image
            src="/lightlogo.png"
            alt="FaucetDrops Logo"
            width={200}
            height={80}
            className="h-12 w-auto sm:h-16 lg:h-20 rounded-md object-contain dark:hidden"
          />
          
          {/* 2. Dark Mode Logo: Hidden by default, visible in dark mode */}
          <Image
            src="/darklogo.png"
            alt="FaucetDrops Logo"
            width={200}
            height={80}
            className="h-12 w-auto sm:h-16 lg:h-20 rounded-md object-contain hidden dark:block"
          />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white">Coming Soon</h1>
          <p className="text-xl text-muted-foreground">
            We&apos;re working on something amazing!
          </p>
          <p className="text-muted-foreground">
            This page is under construction. Please check back later for updates.
          </p>
        </div>

        <div className="pt-4">
          <div className="inline-flex items-center px-6 py-3 rounded-md bg-white/10 text-white font-medium">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            Under Development
          </div>
        </div>

        {/* Social Media Links */}
        <div className="pt-8">
          <p className="text-sm text-muted-foreground">
            In the meantime, you can follow us on social media or contact out team
          </p>
          <div className="flex justify-center space-x-6 pt-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-full hover:bg-gray-800`}
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="pt-8">
          <p className="text-sm text-muted-foreground">
            In the meantime, you can check out our
            <Link href="/" className="text-white hover:underline"> homepage</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}