// "use client"
// import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Switch } from "@/components/ui/switch"
// import { Plus, Trash2, Save, Clock, Users, PieChart, Calendar, Settings, Loader2, ListPlus, Zap, Upload, Link, Wallet, Coins, Share2, Trophy, Check, AlertTriangle, ArrowRight, ArrowLeft, Eye, Image as ImageIcon, Lock, Unlock } from "lucide-react"
// import { useWallet } from "@/hooks/use-wallet"
// import { Header } from "@/components/header"
// import { Contract, BrowserProvider, ZeroAddress } from 'ethers'
// const isAddress = (addr: string) => addr.startsWith('0x') && addr.length === 42
// import { checkFaucetNameExists, createCustomFaucet, Network } from "@/lib/faucet"
// import { toast } from 'sonner'
// import { useRouter } from 'next/navigation'

// const FAUCET_TYPE_CUSTOM = 'custom' as const

// export const networks: Network[] = [
//   {
//     name: "Celo",
//     symbol: "CELO",
//     chainId: BigInt(42220),
//     rpcUrl: "https://forno.celo.org",
//     blockExplorer: "https://celoscan.io",
//     color: "#35D07F",
//     logoUrl: "/celo.png",
//     iconUrl: "/celo.png",
//     factoryAddresses: ["0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB", "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5"],
//     factories: { custom: "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5" },
//     tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
//     nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
//     isTestnet: false,
//   },
//   {
//     name: "Lisk",
//     symbol: "LSK",
//     chainId: BigInt(1135),
//     rpcUrl: "https://rpc.api.lisk.com",
//     blockExplorer: "https://blockscout.lisk.com",
//     explorerUrl: "https://blockscout.lisk.com",
//     color: "#0D4477",
//     logoUrl: "/lsk.png",
//     iconUrl: "/lsk.png",
//     factoryAddresses: ["0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7"],
//     factories: { custom: "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7" },
//     tokenAddress: ZeroAddress,
//     nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
//     isTestnet: false,
//   },
//   {
//     name: "Arbitrum",
//     symbol: "ARB",
//     chainId: BigInt(42161),
//     rpcUrl: "https://arb1.arbitrum.io/rpc",
//     blockExplorer: "https://arbiscan.io",
//     explorerUrl: "https://arbiscan.io",
//     color: "#28A0F0",
//     logoUrl: "/arb.jpeg",
//     iconUrl: "/arb.jpeg",
//     factoryAddresses: ["0x9D6f441b31FBa22700bb3217229eb89b13FB49de"],
//     factories: { custom: "0x9D6f441b31FBa22700bb3217229eb89b13FB49de" },
//     tokenAddress: ZeroAddress,
//     nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
//     isTestnet: false,
//   },
//   {
//     name: "Base",
//     symbol: "BASE",
//     chainId: BigInt(8453),
//     rpcUrl: "https://base.publicnode.com",
//     blockExplorer: "https://basescan.org",
//     explorerUrl: "https://basescan.org",
//     color: "#0052FF",
//     logoUrl: "/base.png",
//     iconUrl: "/base.png",
//     factoryAddresses: ["0x587b840140321DD8002111282748acAdaa8fA206"],
//     factories: { custom: "0x587b840140321DD8002111282748acAdaa8fA206" },
//     tokenAddress: ZeroAddress,
//     nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
//     isTestnet: false,
//   }
// ]

// const getNetworkByChainId = (chainId: number | null): Network | null => {
//   if (!chainId) return null
//   const bigIntChainId = BigInt(chainId)
//   return networks.find(n => n.chainId === bigIntChainId) || null
// }

// const getFactoryAddress = (factoryType: 'custom', targetNetwork: Network | null): string | null => {
//   if (!targetNetwork) return null
//   return targetNetwork.factories[factoryType] || null
// }

// interface TierConfig {
//   rankStart: number
//   rankEnd: number
//   amountPerUser: number
// }

// interface DistributionConfig {
//   model: 'equal' | 'custom_tiers'
//   totalWinners: number
//   tiers: TierConfig[]
// }

// export type TaskStage = 'Beginner' | 'Intermediate' | 'Advance' | 'Legend' | 'Ultimate'
// export const TASK_STAGES: TaskStage[] = ['Beginner', 'Intermediate', 'Advance', 'Legend', 'Ultimate']

// const MAX_PASS_POINT_RATIO = 0.7

// const STAGE_TASK_REQUIREMENTS: Record<TaskStage, { min: number; max: number }> = {
//   Beginner: { min: 5, max: 10 },
//   Intermediate: { min: 3, max: 8 },
//   Advance: { min: 2, max: 6 },
//   Legend: { min: 2, max: 5 },
//   Ultimate: { min: 1, max: 3 },
// }

// type VerificationType = 'auto_social' | 'auto_tx' | 'auto_holding' | 'manual_link' | 'manual_upload' | 'manual_both' | 'none'

// export type SocialPlatform = 'Twitter' | 'Facebook' | 'Tiktok' | 'Youtube' | 'Discord' | 'Thread' | 'Linkedin' | 'Farcaster' | 'Instagram' | 'Website'
// export type QuestCategory =  'trading' | 'swap' | 'referral' | 'content' | 'general' | 'holding' | 'social';
// const SOCIAL_PLATFORMS: SocialPlatform[] = ['Twitter', 'Facebook', 'Tiktok', 'Youtube', 'Discord', 'Thread', 'Linkedin', 'Farcaster', 'Instagram', 'Website']

// const SOCIAL_ACTIONS = ['follow', 'retweet', 'like', 'join', 'subscribe', 'visit']
// const TRADING_ACTIONS = ['swap', 'stake', 'deposit', 'lend']

// interface QuestTask {
//   id: string
//   title: string
//   description: string
//   points: number | string
//   required: boolean
//   category: QuestCategory
//   url: string
//   action: string
//   verificationType: VerificationType
//   targetPlatform?: string
//   targetHandle?: string
//   targetContractAddress?: string
//   targetChainId?: string
//   stage: TaskStage
//   minReferrals?: number | string
//   assetType?: 'erc20' | 'erc721'
//   holdingContractAddress?: string
//   minHoldingAmount?: number | string
//   submissionPlaceholder?: string
// }

// interface StagePassRequirements {
//   Beginner: number
//   Intermediate: number
//   Advance: number
//   Legend: number
//   Ultimate: number
// }

// interface Quest {
//   id: string
//   creatorAddress: string
//   title: string
//   description: string
//   isActive: boolean
//   isFunded: boolean
//   rewardPool: string
//   startDate: string
//   startTime: string
//   endDate: string
//   endTime: string
//   tasks: QuestTask[]
//   faucetAddress?: string
//   rewardTokenType: 'native' | 'erc20'
//   tokenAddress: string
//   stagePassRequirements: StagePassRequirements
//   imageUrl: string
//   distributionConfig: DistributionConfig
// }

// interface TokenConfiguration {
//   address: string
//   name: string
//   symbol: string
//   decimals: number
//   isNative?: boolean
//   logoUrl?: string
//   description?: string
// }
// const zeroAddress = ZeroAddress
// const ALL_TOKENS_BY_CHAIN: Record<number, TokenConfiguration[]> = {
//   42220: [
//     { address: "0x471EcE3750Da237f93B8E339c536989b8978a438", name: "Celo", symbol: "CELO", decimals: 18, isNative: true, logoUrl: "/celo.jpeg", description: "Native Celo token for governance and staking" },
//     { address: "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71", name: "Celo Nigerian Naira", symbol: "cNGN", decimals: 18, logoUrl: "/cngn.png", description: "Naira-pegged stablecoin on Celo" },
//     { address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA", name: "Celo Colombian Peso", symbol: "cCOP", decimals: 18, logoUrl: "/ccop.png", description: "colombian peso-pegged stablecoin on Celo" },
//     { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", name: "Celo Dollar", symbol: "cUSD", decimals: 18, logoUrl: "/cusd.png", description: "USD-pegged stablecoin on Celo" },
//     { address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", name: "Tether", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Tether USD stablecoin" },
//     { address: "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C", name: "Celo Brazilian Real", symbol: "cREAL", decimals: 18, logoUrl: "/creal.jpg", description: "Brazilian Real-pegged stablecoin on Celo" },
//     { address: "0x32A9FE697a32135BFd313a6Ac28792DaE4D9979d", name: "Celo Kenyan Shilling", symbol: "cKES", decimals: 18, logoUrl: "/ckes.jpg", description: "Kenyan Shilling-pegged stablecoin on Celo" },
//     { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "USD Coin stablecoin" },
//     { address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73", name: "Celo Euro", symbol: "cEUR", decimals: 18, logoUrl: "/ceur.png", description: "Euro-pegged stablecoin on Celo" },
//     { address: "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3", name: "Glo Dollar", symbol: "USDGLO", decimals: 18, logoUrl: "/glo.jpg", description: "Philanthropic dollar that funds global poverty relief" },
//     { address: "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a", name: "GoodDollar", symbol: "G$", decimals: 18, logoUrl: "/gd.jpg", description: "Universal basic income token" },
//   ],
//   1135: [
//     { address: zeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum for transaction fees" },
//     { address: "0xac485391EB2d7D88253a7F1eF18C37f4242D1A24", name: "Lisk", symbol: "LSK", decimals: 18, logoUrl: "/lsk.png", description: "Lisk native token" },
//     { address: "0x05D032ac25d322df992303dCa074EE7392C117b9", name: "Tether USD", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Tether USD stablecoin" },
//     { address: "0xF242275d3a6527d877f2c927a82D9b057609cc71", name: "Bridged USDC", symbol: "USDC.e", decimals: 6, logoUrl: "/usdc.jpg", description: "Bridged USD Coin from Ethereum" },
//   ],
//   42161: [
//     { address: zeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum for transaction fees" },
//     { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "Native USD Coin on Arbitrum" },
//     { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", name: "Tether USD", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Tether USD stablecoin" },
//     { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", name: "Arbitrum", symbol: "ARB", decimals: 18, logoUrl: "/arb.jpeg", description: "Arbitrum governance token" },
//   ],
//   8453: [
//     { address: zeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum for transaction fees" },
//     { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "Native USD Coin on Base" },
//     { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", name: "Bridged Tether USD", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Bridged Tether USD from Ethereum" },
//     { address: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", name: "Degen", symbol: "DEGEN", decimals: 18, logoUrl: "/degen.png", description: "Degen community token" },
//   ],
// }



// const getTodayDateString = () => new Date().toISOString().split('T')[0]
// const getFutureDateString = (days: number) => {
//   const futureDate = new Date()
//   futureDate.setDate(futureDate.getDate() + days)
//   return futureDate.toISOString().split('T')[0]
// }

// const initialStagePassRequirements: StagePassRequirements = {
//   Beginner: 0,
//   Intermediate: 0,
//   Advance: 0,
//   Legend: 0,
//   Ultimate: 0,
// }

// const initialNewQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'> = {
//   title: "",
//   description: "",
//   isActive: true,
//   isFunded: false,
//   rewardPool: "",
//   startDate: getTodayDateString(),
//   startTime: "12:00",
//   endDate: getFutureDateString(7),
//   endTime: "23:59",
//   tasks: [],
//   faucetAddress: undefined,
//   rewardTokenType: 'native',
//   tokenAddress: ZeroAddress,
//   imageUrl: "https://placehold.co/1280x1280/3b82f6/ffffff?text=Quest+Logo",
//   distributionConfig: { model: 'equal', totalWinners: 100, tiers: [] }
// }

// const initialNewTaskForm: Partial<QuestTask> = {
//   title: "",
//   description: "",
//   points: "",
//   required: true,
//   category: "social",
//   url: "",
//   action: "follow",
//   verificationType: "manual_link",
//   targetPlatform: "Twitter",
//   stage: 'Beginner',
//   minReferrals: "",
//   submissionPlaceholder: ""
// }

// const API_BASE_URL = "https://fauctdrop-backend.onrender.com"

// const SUGGESTED_TASKS_BY_STAGE: Record<TaskStage, Array<Partial<QuestTask>>> = {
//   Beginner: [
//     { title: "Visit our Website", category: "social", action: "visit", targetPlatform: "Website", points: 30, verificationType: "manual_link" },
//     { title: "Follow us on Twitter", category: "social", action: "follow", targetPlatform: "Twitter", points: 50, verificationType: "manual_link" },
//     { title: "Join our Discord Server", category: "social", action: "join", targetPlatform: "Discord", points: 50, verificationType: "manual_link" },
//     { title: "Like our Facebook Page", category: "social", action: "like", targetPlatform: "Facebook", points: 40, verificationType: "manual_link" },
//     { title: "Subscribe to YouTube Channel", category: "social", action: "subscribe", targetPlatform: "Youtube", points: 60, verificationType: "manual_link" },
//     { title: "Follow on Instagram", category: "social", action: "follow", targetPlatform: "Instagram", points: 40, verificationType: "manual_link" },
//   ],
//   Intermediate: [
//     { title: "Refer 3 Friends", category: "referral", minReferrals: 3, points: 150, verificationType: "manual_link" },
//     { title: "Share Campaign Poster", category: "content", action: "upload", points: 100, verificationType: "manual_upload", description: "Upload proof of sharing campaign poster" },
//     { title: "Create Tutorial Video", category: "content", action: "upload", points: 200, verificationType: "manual_upload", description: "Create and share a tutorial video" },
//     { title: "Write Blog Post", category: "content", action: "upload", points: 150, verificationType: "manual_upload", description: "Write a blog post about the project" },
//   ],
//   Advance: [
//     { title: "Execute Swap on Uniswap", category: "swap", action: "swap", points: 200, verificationType: "auto_tx" },
//     { title: "Stake Tokens", category: "trading", action: "stake", points: 250, verificationType: "auto_tx" },
//     { title: "Provide Liquidity", category: "trading", action: "deposit", points: 300, verificationType: "auto_tx" },
//   ],
//   Legend: [
//     { title: "Refer 10 Active Users", category: "referral", minReferrals: 10, points: 500, verificationType: "manual_link" },
//     { title: "Execute Advanced Trading", category: "trading", action: "lend", points: 400, verificationType: "auto_tx" },
//   ],
//   Ultimate: [
//     { title: "Become Ambassador", category: "general", points: 1000, verificationType: "manual_link", description: "Complete all requirements and apply for ambassador role" },
//   ],
// }

// const generateSocialTaskTitle = (platform: string, action: string): string => {
//   if (!platform || !action) return ""
//   const actionMap: Record<string, string> = {
//     'follow': 'Follow',
//     'retweet': 'Retweet/Share',
//     'like': 'Like',
//     'join': 'Join',
//     'subscribe': 'Subscribe to',
//     'visit': 'Visit',
//     'swap': 'Execute Swap on',
//     'stake': 'Stake Tokens on',
//     'deposit': 'Deposit Assets on',
//     'lend': 'Lend/Borrow on',
//   }
//   const capitalizedAction = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1)
//   if (['follow', 'like', 'retweet'].includes(action) && platform === 'Twitter') {
//     return `${capitalizedAction} our post on X (Twitter)`
//   }
//   if (action === 'join' && platform === 'Discord') {
//     return `Join our Official Discord Server`
//   }
//   if (action === 'subscribe' && platform === 'Youtube') {
//     return `Subscribe to our YouTube Channel`
//   }
//   return `${capitalizedAction} our ${platform}`
// }

// const getDefaultSocialPlaceholder = (platform?: string, action?: string): string => {
//   if (!platform || !action) return "Enter your username"
//   const actionText = {
//     follow: "your profile username",
//     like: "your profile username",
//     retweet: "your profile username",
//     join: "your username",
//     subscribe: "your channel name",
//     visit: "confirmation link"
//   }[action] || "your username"
//   return `Enter ${actionText}`
// }

// interface ImageUploadFieldProps {
//   imageUrl: string
//   onImageUrlChange: (url: string) => void
//   onFileUpload: (file: File) => Promise<void>
//   isUploading: boolean
//   uploadError: string | null
//   requiredResolution?: { width: number; height: number }
// }

// const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
//   imageUrl,
//   onImageUrlChange,
//   onFileUpload,
//   isUploading,
//   uploadError,
//   requiredResolution
// }) => {
//   const fileInputRef = React.useRef<HTMLInputElement>(null)
//   const [previewUrl, setPreviewUrl] = useState(imageUrl)
//   const [resolutionError, setResolutionError] = useState<string | null>(null)
//   const maxWidth = requiredResolution?.width || 1280
//   const maxHeight = requiredResolution?.height || 1280

//   useEffect(() => {
//     setPreviewUrl(imageUrl)
//   }, [imageUrl])

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0]
//     if (!file) return
//     setResolutionError(null)

//     const reader = new FileReader()
//     reader.onload = (e) => {
//       const img = new Image()
//       img.onload = () => {
//         if (img.width > maxWidth || img.height > maxHeight) {
//           setResolutionError(`Image is too large. Max allowed: ${maxWidth}x${maxHeight}. Found: ${img.width}x${img.height}.`)
//           setPreviewUrl(null)
//           if (fileInputRef.current) fileInputRef.current.value = ""
//           return
//         }
//         setPreviewUrl(e.target?.result as string)
//         onFileUpload(file)
//       }
//       img.src = e.target?.result as string
//     }
//     reader.readAsDataURL(file)
//   }

//   const handleRemoveImage = () => {
//     onImageUrlChange("")
//     setPreviewUrl(null)
//     setResolutionError(null)
//     if (fileInputRef.current) fileInputRef.current.value = ""
//   }

//   const displayImageUrl = imageUrl || previewUrl

//   return (
//     <div className="space-y-2">
//       <Label htmlFor="fileUpload">Quest Image/Logo (Max 5MB, Max {maxWidth}x{maxHeight})</Label>
//       <div className="flex items-center space-x-3">
//         <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !!resolutionError} className="flex-grow">
//           {isUploading ? (
//             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//           ) : (
//             <Upload className="h-4 w-4 mr-2" />
//           )}
//           {isUploading ? "Uploading..." : imageUrl ? "Change Image" : "Upload Image"}
//         </Button>
//         {imageUrl && (
//           <Button type="button" variant="destructive" size="icon" onClick={handleRemoveImage} disabled={isUploading}>
//             <Trash2 className="h-4 w-4" />
//           </Button>
//         )}
//         <Input id="fileUpload" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileChange} disabled={isUploading} />
//       </div>
//       {(displayImageUrl || uploadError || resolutionError) && (
//         <div className="flex items-start space-x-3 mt-2 border p-3 rounded-lg bg-white dark:bg-gray-800">
//           <div className="h-16 w-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border">
//             {displayImageUrl ? (
//               <img src={displayImageUrl} alt="Preview" className="h-full w-full object-contain" />
//             ) : (
//               <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No Img</div>
//             )}
//           </div>
//           <div className="flex-grow">
//             {(uploadError || resolutionError) && (
//               <p className="text-xs text-red-500 pt-1">
//                 <AlertTriangle className="h-3 w-3 inline mr-1" />
//                 {resolutionError || uploadError}
//               </p>
//             )}
//             {(!uploadError && !resolutionError && imageUrl) && (
//               <p className="text-xs text-green-500 pt-1">
//                 <Check className="h-3 w-3 inline mr-1" />
//                 Image uploaded successfully.
//               </p>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// interface StepOneProps {
//   newQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>
//   setNewQuest: React.Dispatch<React.SetStateAction<Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>>>
//   nameError: string | null
//   isCheckingName: boolean
//   isUploadingImage: boolean
//   uploadImageError: string | null
//   handleImageUpload: (file: File) => Promise<void>
//   handleTitleChange: (value: string) => void
//   handleTitleBlur: () => void
// }

// const StepOneDetails: React.FC<StepOneProps> = ({
//   newQuest,
//   setNewQuest,
//   nameError,
//   isCheckingName,
//   isUploadingImage,
//   uploadImageError,
//   handleImageUpload,
//   handleTitleChange,
//   handleTitleBlur
// }) => (
//   <Card>
//     <CardHeader>
//       <CardTitle className="text-lg flex items-center gap-2">
//         <Settings className="h-5 w-5" />
//         Step 1: Basic Quest Details
//       </CardTitle>
//       <CardDescription>Define the campaign's core identity. The Title is also used as the Faucet name.</CardDescription>
//     </CardHeader>
//     <CardContent className="space-y-4">
//       <div className="space-y-2">
//         <Label htmlFor="title">Quest Title (also Faucet Name)</Label>
//         <div className="relative">
//           <Input
//             id="title"
//             value={newQuest.title}
//             onChange={(e) => handleTitleChange(e.target.value)}
//             onBlur={handleTitleBlur}
//             placeholder="The FaucetDrop Launch Campaign"
//             className={
//               nameError ? "border-red-500 pr-10" :
//               (!isCheckingName && newQuest.title.trim().length >= 3 && !nameError) ? "border-green-500 pr-10" :
//               "pr-10"
//             }
//             disabled={isCheckingName}
//           />
//           {isCheckingName && (
//             <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />
//           )}
//           {!isCheckingName && newQuest.title.trim().length >= 3 && (
//             nameError ? (
//               <AlertTriangle className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
//             ) : (
//               <Check className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
//             )
//           )}
//         </div>
//         {newQuest.title.trim().length > 0 && newQuest.title.trim().length < 3 && (
//           <p className="text-xs text-red-500">Quest name must be at least 3 characters long.</p>
//         )}
//         {nameError && newQuest.title.trim().length >= 3 && (
//           <p className="text-xs text-red-500">{nameError}</p>
//         )}
//         {isCheckingName && newQuest.title.trim().length >= 3 && (
//           <p className="text-xs text-blue-500">Checking name availability...</p>
//         )}
//       </div>
//       <ImageUploadField
//         imageUrl={newQuest.imageUrl}
//         onImageUrlChange={(url) => setNewQuest({ ...newQuest, imageUrl: url })}
//         onFileUpload={handleImageUpload}
//         isUploading={isUploadingImage}
//         uploadError={uploadImageError}
//         requiredResolution={{ width: 1280, height: 1280 }}
//       />
//       <div className="space-y-2">
//         <Label htmlFor="description">Quest Description</Label>
//         <Textarea
//           id="description"
//           value={newQuest.description}
//           onChange={(e) => setNewQuest({ ...newQuest, description: e.target.value })}
//           placeholder="A campaign to reward early community members."
//           rows={3}
//         />
//       </div>
//     </CardContent>
//   </Card>
// )

// interface StepTwoProps {
//   newQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>
//   setNewQuest: React.Dispatch<React.SetStateAction<Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>>>
//   chainId: number | null
//   network: Network | null
//   selectedToken: TokenConfiguration | null
//   setSelectedToken: React.Dispatch<React.SetStateAction<TokenConfiguration | null>>
//   error: string | null
//   setError: React.Dispatch<React.SetStateAction<string | null>>
// }

// const StepTwoRewards: React.FC<StepTwoProps> = ({
//   newQuest,
//   setNewQuest,
//   chainId,
//   network,
//   selectedToken,
//   setSelectedToken,
//   setError
// }) => {
//   const [isCustomToken, setIsCustomToken] = useState(false)
//   const [customTokenAddress, setCustomTokenAddress] = useState('')
//   const availableTokens = chainId ? ALL_TOKENS_BY_CHAIN[chainId] || [] : []

//   const calculateTotalFromTiers = () => {
//     return newQuest.distributionConfig.tiers.reduce((acc, tier) => {
//       const count = (tier.rankEnd - tier.rankStart) + 1
//       return acc + (count * tier.amountPerUser)
//     }, 0)
//   }

//   const calculateRewardPoolFromDistribution = () => {
//     if (newQuest.distributionConfig.model === 'equal') {
//       const amountPerWinner = parseFloat(newQuest.rewardPool) / newQuest.distributionConfig.totalWinners || 0
//       return parseFloat(newQuest.rewardPool)
//     } else {
//       return calculateTotalFromTiers()
//     }
//   }

//   const getAmountPerWinner = () => {
//     if (newQuest.distributionConfig.model === 'equal') {
//       return newQuest.rewardPool ? (parseFloat(newQuest.rewardPool) / newQuest.distributionConfig.totalWinners).toFixed(4) : '0'
//     }
//     return null
//   }

//   const handleTierChange = (index: number, field: keyof TierConfig, value: number) => {
//     const updatedTiers = [...newQuest.distributionConfig.tiers]
//     updatedTiers[index] = { ...updatedTiers[index], [field]: value }
//     setNewQuest(prev => ({
//       ...prev,
//       distributionConfig: { ...prev.distributionConfig, tiers: updatedTiers }
//     }))
//   }

//   const addTier = () => {
//     const lastTier = newQuest.distributionConfig.tiers[newQuest.distributionConfig.tiers.length - 1]
//     const start = lastTier ? lastTier.rankEnd + 1 : 1
//     setNewQuest(prev => ({
//       ...prev,
//       distributionConfig: {
//         ...prev.distributionConfig,
//         tiers: [...prev.distributionConfig.tiers, { rankStart: start, rankEnd: start, amountPerUser: 0 }]
//       }
//     }))
//   }

//   const removeTier = (index: number) => {
//     const updatedTiers = newQuest.distributionConfig.tiers.filter((_, i) => i !== index)
//     setNewQuest(prev => ({
//       ...prev,
//       distributionConfig: { ...prev.distributionConfig, tiers: updatedTiers }
//     }))
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="text-lg flex items-center gap-2">
//           <Coins className="h-5 w-5" />
//           Step 2: Rewards & Timing
//         </CardTitle>
//         <CardDescription>Configure the token, distribution logic, and campaign duration.</CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-6">
//         <div className="space-y-2">
//           <Label>Reward Token ({network?.name || 'Unknown Chain'})</Label>
//           <Select
//             value={isCustomToken ? "custom" : (selectedToken ? selectedToken.address : undefined)}
//             onValueChange={(value) => {
//               if (value === "custom") {
//                 setIsCustomToken(true)
//                 setSelectedToken(null)
//               } else {
//                 const token = availableTokens.find(t => t.address === value)
//                 if (token) {
//                   setSelectedToken(token)
//                   setIsCustomToken(false)
//                   setCustomTokenAddress('')
//                   setNewQuest(prev => ({
//                     ...prev,
//                     rewardTokenType: token.isNative ? 'native' : 'erc20',
//                     tokenAddress: token.address
//                   }))
//                 }
//               }
//             }}
//             disabled={availableTokens.length === 0}
//           >
//             <SelectTrigger>
//               <SelectValue>
//                 {isCustomToken ? "Custom Token" : selectedToken ? `${selectedToken.name} (${selectedToken.symbol})` : "Select reward token"}
//               </SelectValue>
//             </SelectTrigger>
//             <SelectContent>
//               {availableTokens.map((token) => (
//                 <SelectItem key={token.address} value={token.address}>{token.name} ({token.symbol})</SelectItem>
//               ))}
//               <SelectItem value="custom">+ Custom Token</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>
//         {isCustomToken && (
//           <div className="space-y-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
//             <Label className="text-xs">Token Contract Address</Label>
//             <div className="flex gap-2">
//               <Input value={customTokenAddress} onChange={(e) => setCustomTokenAddress(e.target.value)} placeholder="0x..." />
//               <Button variant="outline" size="sm" onClick={() => {
//                 if (customTokenAddress && isAddress(customTokenAddress)) {
//                   const fullCustom: TokenConfiguration = {
//                     address: customTokenAddress,
//                     name: 'Custom',
//                     symbol: 'TOK',
//                     decimals: 18,
//                     isNative: false
//                   }
//                   setSelectedToken(fullCustom)
//                   setIsCustomToken(false)
//                   setCustomTokenAddress('')
//                   setNewQuest(prev => ({
//                     ...prev,
//                     rewardTokenType: 'erc20',
//                     tokenAddress: fullCustom.address
//                   }))
//                 }
//               }}>Set</Button>
//             </div>
//           </div>
//         )}
//         <div className="border-t pt-4 space-y-4">
//           <div className="flex items-center gap-2 mb-2">
//             <PieChart className="h-4 w-4 text-blue-500" />
//             <h3 className="font-semibold text-sm">Distribution Model</h3>
//           </div>
//           <div className="grid grid-cols-2 gap-4">
//             <div className="space-y-2">
//               <Label>Number of Winners</Label>
//               <Input
//                 type="number"
//                 min="1"
//                 value={newQuest.distributionConfig.totalWinners}
//                 onChange={(e) => setNewQuest(prev => ({
//                   ...prev,
//                   distributionConfig: { ...prev.distributionConfig, totalWinners: parseFloat(e.target.value) || 1 }
//                 }))}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label>Distribution Type</Label>
//               <Select
//                 value={newQuest.distributionConfig.model}
//                 onValueChange={(val: 'equal' | 'custom_tiers') => setNewQuest(prev => ({
//                   ...prev,
//                   distributionConfig: { ...prev.distributionConfig, model: val }
//                 }))}
//               >
//                 <SelectTrigger><SelectValue /></SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="equal">Equal Sharing</SelectItem>
//                   <SelectItem value="custom_tiers">Custom Tiered</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//           </div>
//           {newQuest.distributionConfig.model === 'equal' ? (
//             <div className="space-y-4">
//               <div className="space-y-2">
//                 <Label htmlFor="amountPerWinner">Amount Per Winner</Label>
//                 <Input
//                   id="amountPerWinner"
//                   type="number"
//                   step="any"
//                   value={newQuest.rewardPool ? (parseFloat(newQuest.rewardPool) / newQuest.distributionConfig.totalWinners).toFixed(4) : ''}
//                   onChange={(e) => {
//                     const amountPerWinner = parseFloat(e.target.value) || 0
//                     const totalRewardPool = (amountPerWinner * newQuest.distributionConfig.totalWinners).toFixed(4)
//                     setNewQuest({ ...newQuest, rewardPool: totalRewardPool })
//                   }}
//                   placeholder="e.g. 10"
//                 />
//                 <p className="text-xs text-muted-foreground">This amount will be distributed to each winner equally.</p>
//               </div>
//               <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
//                 <h4 className="font-semibold text-sm">Distribution Summary</h4>
//                 <div className="grid grid-cols-3 gap-2 text-sm">
//                   <div>
//                     <p className="text-muted-foreground">Winners</p>
//                     <p className="font-bold text-lg">{newQuest.distributionConfig.totalWinners}</p>
//                   </div>
//                   <div>
//                     <p className="text-muted-foreground">Per Winner</p>
//                     <p className="font-bold text-lg">{getAmountPerWinner()}</p>
//                   </div>
//                   <div>
//                     <p className="text-muted-foreground">Total Pool</p>
//                     <p className="font-bold text-lg text-green-600">{newQuest.rewardPool || '0'}</p>
//                   </div>
//                 </div>
//                 <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
//                   ℹ️ Fee (5%) will be added during funding. You'll need to deposit: <strong>{newQuest.rewardPool ? (parseFloat(newQuest.rewardPool) * 1.05).toFixed(4) : '0'} {selectedToken?.symbol}</strong>
//                 </p>
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
//               <div className="flex justify-between items-center">
//                 <Label>Custom Tiers</Label>
//                 <Button size="sm" variant="outline" onClick={addTier}><Plus className="h-3 w-3 mr-1"/> Add Tier</Button>
//               </div>
//               {newQuest.distributionConfig.tiers.map((tier, idx) => (
//                 <div key={idx} className="flex gap-2 items-end">
//                   <div className="space-y-1 flex-1">
//                     <Label className="text-xs">Rank From</Label>
//                     <Input type="number" value={tier.rankStart} onChange={(e) => handleTierChange(idx, 'rankStart', parseFloat(e.target.value))} />
//                   </div>
//                   <div className="space-y-1 flex-1">
//                     <Label className="text-xs">Rank To</Label>
//                     <Input type="number" value={tier.rankEnd} onChange={(e) => handleTierChange(idx, 'rankEnd', parseFloat(e.target.value))} />
//                   </div>
//                   <div className="space-y-1 flex-1">
//                     <Label className="text-xs">Amount ({selectedToken?.symbol})</Label>
//                     <Input type="number" value={tier.amountPerUser} onChange={(e) => handleTierChange(idx, 'amountPerUser', parseFloat(e.target.value))} />
//                   </div>
//                   <Button size="icon" variant="ghost" className="text-red-500 mb-0.5" onClick={() => removeTier(idx)}><Trash2 className="h-4 w-4"/></Button>
//                 </div>
//               ))}
//               <div className="pt-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
//                 <div className="text-right text-sm space-y-1">
//                   <div className="flex justify-between">
//                     <span>Total Pool:</span>
//                     <strong className="text-green-600">{calculateTotalFromTiers()} {selectedToken?.symbol}</strong>
//                   </div>
//                   <p className="text-xs text-blue-700 dark:text-blue-300">
//                     ℹ️ Fee (5%) will be added during funding. You'll need to deposit: <strong>{(calculateTotalFromTiers() * 1.05).toFixed(4)} {selectedToken?.symbol}</strong>
//                   </p>
//                 </div>
//                 {(() => {
//                   const total = calculateTotalFromTiers().toString()
//                   if (newQuest.rewardPool !== total && newQuest.distributionConfig.model === 'custom_tiers') {
//                     setTimeout(() => setNewQuest(prev => ({ ...prev, rewardPool: total })), 0)
//                   }
//                   return null
//                 })()}
//               </div>
//             </div>
//           )}
//         </div>
//         <div className="border-t pt-4 space-y-4">
//           <div className="flex items-center gap-2 mb-2">
//             <Clock className="h-4 w-4 text-orange-500" />
//             <h3 className="font-semibold text-sm">Campaign Duration</h3>
//           </div>
//           <div className="grid grid-cols-2 gap-4">
//             <div className="space-y-2">
//               <Label className="flex items-center gap-2"><Calendar className="h-3 w-3"/> Start Date & Time</Label>
//               <div className="flex gap-2">
//                 <Input type="date" value={newQuest.startDate} onChange={(e) => setNewQuest({ ...newQuest, startDate: e.target.value })} />
//                 <Input type="time" value={newQuest.startTime} onChange={(e) => setNewQuest({ ...newQuest, startTime: e.target.value })} />
//               </div>
//             </div>
//             <div className="space-y-2">
//               <Label className="flex items-center gap-2"><Calendar className="h-3 w-3"/> End Date & Time</Label>
//               <div className="flex gap-2">
//                 <Input type="date" value={newQuest.endDate} onChange={(e) => setNewQuest({ ...newQuest, endDate: e.target.value })} />
//                 <Input type="time" value={newQuest.endTime} onChange={(e) => setNewQuest({ ...newQuest, endTime: e.target.value })} />
//               </div>
//             </div>
//           </div>
//           <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs text-yellow-800 dark:text-yellow-200">
//             <strong>Note:</strong> Quest will remain inactive for participants until the reward pool is funded on the Smart Contract.
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   )
// }

// interface StepThreeProps {
//   newQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>
//   setNewQuest: React.Dispatch<React.SetStateAction<Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>>>
//   initialNewTaskForm: Partial<QuestTask>
//   error: string | null
//   setError: React.Dispatch<React.SetStateAction<string | null>>
//   stagePassRequirements: StagePassRequirements
//   setStagePassRequirements: React.Dispatch<React.SetStateAction<StagePassRequirements>>
//   stageTotals: Record<TaskStage, number>
//   stageTaskCounts: Record<TaskStage, number>
//   validateTask: () => boolean
//   handleAddTask: () => void
//   handleEditTask: (task: QuestTask) => void
//   handleUpdateTask: () => void
//   handleRemoveTask: (taskId: string) => void
//   handleStagePassRequirementChange: (stage: TaskStage, value: number) => void
//   editingTask: QuestTask | null
//   setEditingTask: React.Dispatch<React.SetStateAction<QuestTask | null>>
//   newTask: Partial<QuestTask>
//   setNewTask: React.Dispatch<React.SetStateAction<Partial<QuestTask>>>
//   checkStagePassPointsValidity: () => boolean
//   getStageColor: (stage: TaskStage) => string
//   getCategoryColor: (category: string) => string
//   getVerificationIcon: (type: VerificationType) => React.ReactNode
//   handleUseSuggestedTask: (suggestedTask: Partial<QuestTask>) => void
// }



// const StepThreeTasks: React.FC<StepThreeProps> = ({
//   newQuest,
//   setNewQuest,
//   initialNewTaskForm,
//   error,
//   setError,
//   stagePassRequirements,
//   setStagePassRequirements,
//   stageTotals,
//   stageTaskCounts,
//   validateTask,
//   handleAddTask,
//   handleEditTask,
//   handleUpdateTask,
//   handleRemoveTask,
//   editingTask,
//   setEditingTask,
//   newTask,
//   setNewTask,
//   checkStagePassPointsValidity,
//   getStageColor,
//   getCategoryColor,
//   getVerificationIcon,
//   handleUseSuggestedTask
// }) => {
//   const [holdingTokenSymbol, setHoldingTokenSymbol] = useState<string | null>(null)
//   const [isValidatingContract, setIsValidatingContract] = useState(false)
//   const [expandedStage, setExpandedStage] = useState<TaskStage | null>(null)

//   useEffect(() => {
//     if (newTask.category === 'holding') {
//       setNewTask(prev => ({
//         ...prev,
//         verificationType: 'auto_holding',
//         submissionPlaceholder: "No submission required – verified automatically on-chain"
//       }))
//     }
//   }, [newTask.category])

//   useEffect(() => {
//     if (newTask.category === 'social') {
//       setNewTask(prev => ({
//         ...prev,
//         submissionPlaceholder: getDefaultSocialPlaceholder(prev.targetPlatform, prev.action)
//       }))
//     }
//   }, [newTask.category, newTask.targetPlatform, newTask.action])

//   const checkContractDetails = async (address: string, type: 'erc20' | 'erc721') => {
//     if (!isAddress(address)) {
//       setHoldingTokenSymbol(null)
//       return
//     }
//     setIsValidatingContract(true)
//     try {
//       const provider = new BrowserProvider(window.ethereum)
//       const contract = new Contract(address, [
//         "function symbol() view returns (string)",
//         "function name() view returns (string)"
//       ], provider)
//       const symbol = await contract.symbol()
//       setHoldingTokenSymbol(symbol)
//       setError(null)
//     } catch (e) {
//       console.error(e)
//       setHoldingTokenSymbol(null)
//       toast.warning("Could not fetch token details. Ensure this is a valid contract.")
//     } finally {
//       setIsValidatingContract(false)
//     }
//   }

//   const isSocialCategory = newTask.category === 'social'
//   const isHoldingCategory = newTask.category === 'holding'
//   const isReferralCategory = newTask.category === 'referral'
//   const currentStageCount = stageTaskCounts[newTask.stage || 'Beginner']
//   const currentStageMax = STAGE_TASK_REQUIREMENTS[newTask.stage || 'Beginner'].max
//   const isStageAtMax = currentStageCount >= currentStageMax

//   const tasksPerStage = useMemo(() => {
//     return TASK_STAGES.reduce((acc, stage) => {
//       acc[stage] = newQuest.tasks.filter(t => t.stage === stage)
//       return acc
//     }, {} as Record<TaskStage, QuestTask[]>)
//   }, [newQuest.tasks])

//   return (
//     <div className="space-y-6">
//       {/* Error Alert */}
//       {error && (
//         <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
//           <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
//           <div>
//             <p className="text-red-800 dark:text-red-200 text-sm font-medium">Error</p>
//             <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
//           </div>
//         </div>
//       )}

//       {/* Two Column Layout */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
//         {/* Left: Task Form - 2 columns */}
//         <div className="lg:col-span-2">
//           <Card className="sticky top-6">
//             <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
//               <CardTitle className="text-xl flex items-center gap-2">
//                 <Plus className="h-5 w-5 text-blue-600" />
//                 {editingTask ? "✏️ Edit Task" : "➕ Add New Task"}
//               </CardTitle>
//               <CardDescription>
//                 {editingTask ? "Update task details" : "Create a task for your quest"}
//               </CardDescription>
//             </CardHeader>

//             <CardContent className="space-y-4 pt-6">
              
//               {/* Step 1: Select Category */}
//               <div className="space-y-2">
//                 <Label className="text-base font-semibold flex items-center gap-2">
//                   <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
//                   What type of task?
//                 </Label>
//                 <Select value={newTask.category || 'social'} onValueChange={(val: any) => setNewTask({ ...newTask, category: val })}>
//                   <SelectTrigger className="h-10">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="social">🤖 Social (Follow, Like, Join)</SelectItem>
//                     <SelectItem value="referral">👥 Referral (Invite Friends)</SelectItem>
//                     <SelectItem value="content">📝 Content (Upload, Create)</SelectItem>
//                     <SelectItem value="swap">💱 Swap (DEX Trading)</SelectItem>
//                     <SelectItem value="trading">📊 Trading (Stake, Lend)</SelectItem>
//                     <SelectItem value="holding">🏦 Holding (NFT/Token Balance)</SelectItem>
//                     <SelectItem value="general">⚙️ General (Other)</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               {/* Social Platform & Action */}
//               {isSocialCategory && (
//                 <div className="space-y-3 p-4 border-2 border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-900/30">
//                   <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
//                     <Zap className="h-4 w-4" /> Social Configuration
//                   </h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     <div className="space-y-2">
//                       <Label className="text-sm">Platform</Label>
//                       <Select value={newTask.targetPlatform || 'Twitter'} onValueChange={(val: any) => {
//                         setNewTask(prev => ({
//                           ...prev,
//                           targetPlatform: val,
//                           title: generateSocialTaskTitle(val, prev.action || 'follow'),
//                           submissionPlaceholder: getDefaultSocialPlaceholder(val, prev.action)
//                         }))
//                       }}>
//                         <SelectTrigger className="h-9 text-sm">
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {SOCIAL_PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
//                         </SelectContent>
//                       </Select>
//                     </div>
//                     <div className="space-y-2">
//                       <Label className="text-sm">Action</Label>
//                       <Select value={newTask.action || 'follow'} onValueChange={(val: any) => {
//                         setNewTask(prev => ({
//                           ...prev,
//                           action: val,
//                           title: generateSocialTaskTitle(prev.targetPlatform || 'Twitter', val),
//                           submissionPlaceholder: getDefaultSocialPlaceholder(prev.targetPlatform, val)
//                         }))
//                       }}>
//                         <SelectTrigger className="h-9 text-sm">
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {SOCIAL_ACTIONS.map(a => <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>)}
//                         </SelectContent>
//                       </Select>
//                     </div>
//                   </div>
//                   <div className="space-y-2">
//                     <Label className="text-sm">Post/Page URL</Label>
//                     <Input
//                       value={newTask.url || ''}
//                       onChange={(e) => setNewTask({...newTask, url: e.target.value})}
//                       placeholder="https://twitter.com/yourhandle/status/..."
//                       className="h-9"
//                     />
//                   </div>
//                 </div>
//               )}

//               {/* Holding Task */}
//               {isHoldingCategory && (
//                 <div className="space-y-3 p-4 border-2 border-cyan-300 rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
//                   <h4 className="font-semibold text-cyan-900 dark:text-cyan-100 flex items-center gap-2">
//                     <Wallet className="h-4 w-4" /> Asset Holding Configuration
//                   </h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     <div className="space-y-2">
//                       <Label className="text-sm">Asset Type</Label>
//                       <Select value={newTask.assetType || 'erc20'} onValueChange={(v: any) => setNewTask(prev => ({ ...prev, assetType: v }))}>
//                         <SelectTrigger className="h-9 text-sm">
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="erc20">ERC-20 Token</SelectItem>
//                           <SelectItem value="erc721">ERC-721 NFT</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>
//                     <div className="space-y-2">
//                       <Label className="text-sm">Minimum Amount</Label>
//                       <Input
//                         type="number"
//                         step="any"
//                         value={newTask.minHoldingAmount || ''}
//                         onChange={e => setNewTask(prev => ({ ...prev, minHoldingAmount: e.target.value }))}
//                         placeholder="e.g. 100"
//                         className="h-9"
//                       />
//                     </div>
//                   </div>
//                   <div className="space-y-2">
//                     <Label className="text-sm">Contract Address</Label>
//                     <div className="relative">
//                       <Input
//                         value={newTask.holdingContractAddress || ''}
//                         onChange={e => {
//                           setNewTask(prev => ({ ...prev, holdingContractAddress: e.target.value }))
//                           if (isAddress(e.target.value)) {
//                             checkContractDetails(e.target.value, newTask.assetType || 'erc20')
//                           }
//                         }}
//                         placeholder="0x..."
//                         className={`h-9 pr-10 ${holdingTokenSymbol ? 'border-green-500' : ''}`}
//                       />
//                       {isValidatingContract && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin" />}
//                     </div>
//                     {holdingTokenSymbol && (
//                       <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
//                         <Check className="h-3 w-3" /> Verified: {holdingTokenSymbol}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* Referral Task */}
//               {isReferralCategory && (
//                 <div className="space-y-2 p-4 border-2 border-orange-300 rounded-lg bg-orange-50 dark:bg-orange-900/30">
//                   <Label className="text-sm font-semibold text-orange-900 dark:text-orange-100">Minimum Referrals Required</Label>
//                   <Input
//                     type="number"
//                     value={newTask.minReferrals || ''}
//                     onChange={e => setNewTask({...newTask, minReferrals: e.target.value ? parseFloat(e.target.value) : ''})}
//                     placeholder="e.g. 5"
//                     className="h-9"
//                   />
//                 </div>
//               )}

//               {/* Step 2: Task Details */}
//               <div className="space-y-2">
//                 <Label className="text-base font-semibold flex items-center gap-2">
//                   <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
//                   Task Details
//                 </Label>
//                 {!isSocialCategory && (
//                   <>
//                     <Label className="text-sm text-muted-foreground">Title</Label>
//                     <Input
//                       value={newTask.title || ''}
//                       onChange={(e) => setNewTask({...newTask, title: e.target.value})}
//                       placeholder="e.g., Join our Discord server"
//                       className="h-9"
//                     />
//                   </>
//                 )}
//                 {isSocialCategory && (
//                   <div className="p-3 bg-white dark:bg-gray-800 rounded border">
//                     <p className="text-xs text-muted-foreground mb-2">Auto-generated title:</p>
//                     <p className="font-semibold text-sm">{newTask.title || '(Select platform & action above)'}</p>
//                   </div>
//                 )}
                
//                 {/* Description Field - Available for all categories */}
//                 <div className="space-y-2 mt-4">
//                   <Label className="text-sm text-muted-foreground">Description (Optional)</Label>
//                   <Textarea
//                     value={newTask.description || ''}
//                     onChange={(e) => setNewTask({...newTask, description: e.target.value})}
//                     placeholder="Provide detailed instructions on how to complete this task. This helps participants understand what they need to do."
//                     rows={3}
//                     className="text-sm"
//                   />
//                   <p className="text-xs text-muted-foreground">
//                     {newTask.description?.length || 0}/500 characters
//                   </p>
//                 </div>
//               </div>

//               {/* Step 3: Verification Method */}
//               <div className="space-y-2">
//                 <Label className="text-base font-semibold flex items-center gap-2">
//                   <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
//                   How to Verify?
//                 </Label>
//                 <Select value={newTask.verificationType || 'manual_link'} onValueChange={(val: any) => setNewTask({...newTask, verificationType: val})}>
//                   <SelectTrigger className="h-10">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {isSocialCategory && <SelectItem value="auto_social">🤖 Auto (Check Username Match)</SelectItem>}
//                     <SelectItem value="manual_link">🔗 Manual Link</SelectItem>
//                     <SelectItem value="manual_upload">📸 Manual Upload</SelectItem>
//                     <SelectItem value="manual_both">🔗 + 📸 Both Methods</SelectItem>
//                     <SelectItem value="none">⏭️ No Verification</SelectItem>
//                   </SelectContent>
//                 </Select>
//                 {newTask.verificationType === 'auto_social' && (
//                   <p className="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 p-2 rounded">
//                     ✅ System will verify submitted username matches their {newTask.targetPlatform} profile
//                   </p>
//                 )}
//               </div>

//               {/* Submission Instructions */}
//               {['manual_link', 'manual_upload', 'manual_both'].includes(newTask.verificationType || '') && (
//                 <div className="space-y-2">
//                   <Label className="text-sm font-semibold">📝 What should users submit?</Label>
//                   <Textarea
//                     value={newTask.submissionPlaceholder || ''}
//                     onChange={(e) => setNewTask({...newTask, submissionPlaceholder: e.target.value})}
//                     placeholder="e.g., Paste the link to your completed task or upload a screenshot"
//                     rows={2}
//                     className="text-sm"
//                   />
//                 </div>
//               )}

//               {/* Step 4: Points & Stage */}
//               <div className="space-y-2">
//                 <Label className="text-base font-semibold flex items-center gap-2">
//                   <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
//                   Points & Difficulty
//                 </Label>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="space-y-2">
//                     <Label className="text-sm text-muted-foreground">Points</Label>
//                     <Input
//                       type="number"
//                       step="any"
//                       value={newTask.points}
//                       onChange={(e) => setNewTask({...newTask, points: e.target.value ? parseFloat(e.target.value) : ''})}
//                       placeholder="100"
//                       className="h-9"
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label className="text-sm text-muted-foreground">Stage</Label>
//                     <Select value={newTask.stage || 'Beginner'} onValueChange={(val: any) => setNewTask({...newTask, stage: val})}>
//                       <SelectTrigger className="h-9 text-sm">
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {TASK_STAGES.map(s => (
//                           <SelectItem key={s} value={s}>
//                             {s} {stageTaskCounts[s] > 0 && `(${stageTaskCounts[s]})`}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 </div>
//               </div>

//               {/* Required Checkbox */}
//               <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
//                 <Switch checked={newTask.required || false} onCheckedChange={(val) => setNewTask({...newTask, required: val})} />
//                 <Label className="text-sm">Mark as required task</Label>
//               </div>

//               {/* Submit Buttons */}
//               <div className="flex gap-2 pt-4">
//                 <Button
//                   onClick={editingTask ? handleUpdateTask : handleAddTask}
//                   className="flex-1 h-10"
//                   disabled={!newTask.title || !newTask.url || !newTask.points}
//                 >
//                   <Plus className="h-4 w-4 mr-2" />
//                   {editingTask ? 'Update' : 'Add'} Task
//                 </Button>
//                 {editingTask && (
//                   <Button
//                     variant="outline"
//                     onClick={() => {
//                       setNewTask(initialNewTaskForm)
//                       setEditingTask(null)
//                     }}
//                     className="h-10"
//                   >
//                     Cancel
//                   </Button>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Right: Tasks List & Stage Pass - 1 column */}
//         <div className="lg:col-span-1 space-y-6">
          
//           {/* Tasks by Stage */}
//           <Card>
//             <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
//               <CardTitle className="flex items-center gap-2">
//                 <Trophy className="h-5 w-5" />
//                 Tasks ({newQuest.tasks.length})
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-3 pt-6">
//               {newQuest.tasks.length === 0 ? (
//                 <div className="text-center py-8 text-muted-foreground">
//                   <Zap className="h-12 w-12 mx-auto mb-2 opacity-20" />
//                   <p className="text-sm">No tasks yet</p>
//                   <p className="text-xs text-muted-foreground">Add your first task using the form →</p>
//                 </div>
//               ) : (
//                 TASK_STAGES.map(stage => {
//                   const stageTasks = tasksPerStage[stage]
//                   if (stageTasks.length === 0) return null
                  
//                   return (
//                     <div key={stage} className="border rounded-lg overflow-hidden">
//                       <button
//                         onClick={() => setExpandedStage(expandedStage === stage ? null : stage)}
//                         className="w-full px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-colors flex items-center justify-between"
//                       >
//                         <div className="flex items-center gap-2">
//                           <Badge className={getStageColor(stage)} variant="default">{stage}</Badge>
//                           <span className="text-xs text-muted-foreground">{stageTasks.length} tasks</span>
//                         </div>
//                         <span className="text-xs font-semibold">{stageTotals[stage]} pts</span>
//                       </button>
                      
//                       {expandedStage === stage && (
//                         <div className="p-3 space-y-2">
//                           {stageTasks.map(task => (
//                             <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs space-y-2">
//                               <div className="flex items-start justify-between gap-2">
//                                 <div className="flex-1">
//                                   <p className="font-semibold line-clamp-2">{task.title}</p>
//                                   {task.description && (
//                                     <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{task.description}</p>
//                                   )}
//                                   <p className="text-muted-foreground text-xs mt-2">{task.points} pts • {task.category}</p>
//                                   {task.verificationType && (
//                                     <p className="text-muted-foreground text-xs">📋 {task.verificationType}</p>
//                                   )}
//                                   {task.submissionPlaceholder && (
//                                     <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">📝 {task.submissionPlaceholder.slice(0, 50)}...</p>
//                                   )}
//                                 </div>
//                               </div>
//                               <div className="flex gap-1 justify-end pt-2 border-t border-gray-200 dark:border-gray-800">
//                                 <Button
//                                   size="icon"
//                                   variant="ghost"
//                                   className="h-6 w-6"
//                                   onClick={() => {
//                                     handleEditTask(task)
//                                     window.scrollTo({top: 0, behavior: 'smooth'})
//                                   }}
//                                 >
//                                   <Settings className="h-3 w-3" />
//                                 </Button>
//                                 <Button
//                                   size="icon"
//                                   variant="ghost"
//                                   className="h-6 w-6 text-red-500 hover:text-red-700"
//                                   onClick={() => handleRemoveTask(task.id)}
//                                 >
//                                   <Trash2 className="h-3 w-3" />
//                                 </Button>
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       )}
//                     </div>
//                   )
//                 })
//               )}
//             </CardContent>
//           </Card>

//           {/* Stage Pass Requirements */}
//           <Card>
//             <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
//               <CardTitle className="flex items-center gap-2 text-sm">
//                 <Lock className="h-5 w-5" />
//                 Stage Pass Settings
//               </CardTitle>
//               <CardDescription className="text-xs">Min points to unlock next stage</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-2 pt-4">
//               {TASK_STAGES.map(stage => {
//                 const total = stageTotals[stage]
//                 const pass = stagePassRequirements[stage]
//                 const maxPass = Math.floor(total * MAX_PASS_POINT_RATIO)
//                 const isInvalid = total > 0 && (pass > maxPass || pass <= 0)

//                 return (
//                   <div key={stage} className={`p-3 rounded-lg border ${total > 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
//                     <div className="flex items-center justify-between gap-2">
//                       <div className="flex-1 min-w-0">
//                         <p className="text-xs font-semibold">{stage}</p>
//                         <p className="text-xs text-muted-foreground">{total} total pts {total > 0 && `(max: ${maxPass})`}</p>
//                       </div>
//                       <Input
//                         type="number"
//                         value={pass || 0}
//                         onChange={(e) => handleStagePassRequirementChange(stage, parseFloat(e.target.value) || 0)}
//                         min={total > 0 ? 1 : 0}
//                         max={maxPass}
//                         disabled={total === 0}
//                         className={`w-16 h-8 text-xs text-right ${isInvalid ? 'border-red-500' : ''}`}
//                       />
//                     </div>
//                     {isInvalid && <p className="text-xs text-red-600 dark:text-red-400 mt-1">Invalid: 1-{maxPass}</p>}
//                   </div>
//                 )
//               })}
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   )
// }

// interface StepFourProps {
//   newQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>
//   stageTotals: Record<TaskStage, number>
//   stagePassRequirements: StagePassRequirements
//   selectedToken: TokenConfiguration | null
//   network: Network | null
//   isConnected: boolean
//   isSaving: boolean
//   isSaveDisabled: boolean
//   handleCreateQuest: () => Promise<void>
//   getStageColor: (stage: TaskStage) => string
// }

// const StepFourPreview: React.FC<StepFourProps> = ({
//   newQuest,
//   stageTotals,
//   stagePassRequirements,
//   selectedToken,
//   network,
//   isConnected,
//   isSaving,
//   isSaveDisabled,
//   handleCreateQuest,
//   getStageColor
// }) => {
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="text-lg flex items-center gap-2">
//           <Eye className="h-5 w-5" />
//           Step 4: Preview & Launch
//         </CardTitle>
//         <CardDescription>Review your quest details and deploy the Faucet smart contract to launch the campaign.</CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-6">
//         <div className="border p-4 rounded-lg space-y-3">
//           <h3 className="text-xl font-bold">{newQuest.title}</h3>
//           <div className="flex space-x-4">
//             {newQuest.imageUrl && (
//               <img src={newQuest.imageUrl} alt="Quest Logo" className="h-16 w-16 object-cover rounded-md" />
//             )}
//             <p className="text-muted-foreground">{newQuest.description}</p>
//           </div>
//           <div className="grid grid-cols-2 gap-4 pt-3">
//             <div>
//               <p className="text-sm font-medium">Reward Token</p>
//               <p className="text-lg font-bold flex items-center gap-2">
//                 <Coins className="h-5 w-5 text-yellow-600" />
//                 {selectedToken ? `${selectedToken.name} (${selectedToken.symbol})` : 'TBD / Custom'}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm font-medium">Distribution</p>
//               <p className="font-semibold capitalize">{newQuest.distributionConfig.model.replace('_', ' ')}</p>
//               <p className="text-xs text-muted-foreground">{newQuest.distributionConfig.totalWinners} Winners</p>
//             </div>
//             <div>
//               <p className="text-sm font-medium">Timing</p>
//               <p className="text-xs font-semibold">{newQuest.startDate} {newQuest.startTime}</p>
//               <p className="text-xs text-muted-foreground">to {newQuest.endDate} {newQuest.endTime}</p>
//             </div>
//             <div>
//               <p className="text-sm font-medium">Status</p>
//               <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending Funding</Badge>
//             </div>
//             <div>
//               <p className="text-sm font-medium">Reward Pool</p>
//               <p className="text-lg font-bold">{newQuest.rewardPool || 'Not Specified'}</p>
//             </div>
//             <div>
//               <p className="text-sm font-medium">Network</p>
//               <p className="font-semibold">{network?.name || 'Unknown'}</p>
//             </div>
//           </div>
//         </div>
//         <div className="space-y-3">
//           <h4 className="text-lg font-semibold border-b pb-2">Stages & Tasks</h4>
//           {TASK_STAGES.map(stage => {
//             const tasksInStage = newQuest.tasks.filter(t => t.stage === stage)
//             const totalPoints = stageTotals[stage]
//             const requiredPass = stagePassRequirements[stage]
//             if (tasksInStage.length === 0) return null
//             return (
//               <div key={stage} className="p-3 border rounded-lg">
//                 <h5 className="font-bold text-md flex items-center justify-between">
//                   <Badge className={getStageColor(stage)}>{stage} Stage</Badge>
//                   <span className="text-sm font-semibold">Pass: {requiredPass} / Total: {totalPoints} Pts</span>
//                 </h5>
//                 <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
//                   {tasksInStage.map(task => (
//                     <li key={task.id}>
//                       <span className="font-medium">{task.title}</span> ({task.points} Pts) {task.required && <span className="text-red-500 font-bold ml-1">(Required)</span>}
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             )
//           })}
//         </div>
//         <Button onClick={handleCreateQuest} disabled={isSaveDisabled} className="w-full mt-6 text-lg py-6">
//           {isConnected ? (
//             isSaving ? (
//               <Loader2 className="h-5 w-5 mr-2 animate-spin" />
//             ) : (
//               <Zap className="h-5 w-5 mr-2" />
//             )
//           ) : (
//             <Wallet className="h-5 w-5 mr-2" />
//           )}
//           {isConnected ? `Launch Quest & Deploy Faucet` : "Connect Wallet to Deploy"}
//         </Button>
//       </CardContent>
//     </Card>
//   )
// }

// export default function QuestCreator() {
//   const router = useRouter()
//   const { address, isConnected, chainId, isConnecting: isWalletConnecting, provider: walletProvider } = useWallet()
//   const network = useMemo(() => getNetworkByChainId(chainId), [chainId])

//   const [step, setStep] = useState(1)
//   const maxSteps = 4

//   const [newQuest, setNewQuest] = useState<Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>>(initialNewQuest)
//   const [newTask, setNewTask] = useState<Partial<QuestTask>>(initialNewTaskForm)
//   const [editingTask, setEditingTask] = useState<QuestTask | null>(null)
//   const [isSaving, setIsSaving] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [nameError, setNameError] = useState<string | null>(null)
//   const [isCheckingName, setIsCheckingName] = useState(false)
//   const [stagePassRequirements, setStagePassRequirements] = useState<StagePassRequirements>(initialStagePassRequirements)
//   const [selectedToken, setSelectedToken] = useState<TokenConfiguration | null>(null)
//   const [isUploadingImage, setIsUploadingImage] = useState(false)
//   const [uploadImageError, setUploadImageError] = useState<string | null>(null)

//   const availableTokens = chainId ? ALL_TOKENS_BY_CHAIN[chainId] || [] : []

//   useEffect(() => {
//     if (chainId && availableTokens.length > 0 && !selectedToken) {
//       const initialToken = availableTokens.find(t => t.isNative) || availableTokens[0]
//       setSelectedToken(initialToken || null)
//       setNewQuest(prev => ({
//         ...prev,
//         rewardTokenType: initialToken?.isNative ? 'native' : 'erc20',
//         tokenAddress: initialToken?.address || ZeroAddress,
//       }))
//     } else if (!chainId) {
//       setSelectedToken(null)
//       setNewQuest(initialNewQuest)
//     }
//   }, [chainId, selectedToken, availableTokens])

//   const FAUCET_FACTORY_ADDRESS = getFactoryAddress(FAUCET_TYPE_CUSTOM, network)
//   const isFactoryAvailableOnChain = !!FAUCET_FACTORY_ADDRESS && !!network

//   const stageTotals = useMemo(() => {
//     const newTotals: Record<TaskStage, number> = { Beginner: 0, Intermediate: 0, Advance: 0, Legend: 0, Ultimate: 0 }
//     newQuest.tasks.forEach(task => {
//       const val = parseFloat(String(task.points)) || 0
//       newTotals[task.stage] = parseFloat((newTotals[task.stage] + val).toFixed(2))
//     })
//     return newTotals
//   }, [newQuest.tasks])

//   const stageTaskCounts = useMemo(() => {
//     const counts: Record<TaskStage, number> = { Beginner: 0, Intermediate: 0, Advance: 0, Legend: 0, Ultimate: 0 }
//     newQuest.tasks.forEach(task => {
//       counts[task.stage]++
//     })
//     return counts
//   }, [newQuest.tasks])

//   const nameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)

//   const checkNameAvailabilityAPI = useCallback(async (nameToValidate: string) => {
//     if (!nameToValidate.trim()) {
//       setNameError(null)
//       return
//     }
//     setIsCheckingName(true)
//     setNameError(null)
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/check-name?name=${encodeURIComponent(nameToValidate)}`)
//       const data = await response.json()
//       if (!response.ok) {
//         setNameError("Error checking name availability.")
//         return
//       }
//       if (data.exists === true) {
//         setNameError(`The name "${nameToValidate}" is already taken.`)
//       } else if (data.valid === false) {
//         setNameError(data.message || `The name "${nameToValidate}" is invalid.`)
//       } else {
//         setNameError(null)
//       }
//     } catch (e: any) {
//       setNameError("Could not verify name availability. Service may be down.")
//     } finally {
//       setIsCheckingName(false)
//     }
//   }, [])

//   const handleTitleChange = useCallback((value: string) => {
//     setNewQuest(prev => ({ ...prev, title: value }))
//     if (nameCheckTimeoutRef.current) {
//       clearTimeout(nameCheckTimeoutRef.current)
//     }
//     if (value.trim().length >= 3 && isConnected && network) {
//       nameCheckTimeoutRef.current = setTimeout(() => {
//         checkNameAvailabilityAPI(value.trim())
//       }, 2000)
//     } else if (value.trim().length < 3) {
//       setNameError(null)
//     }
//   }, [isConnected, network, checkNameAvailabilityAPI])

//   const handleTitleBlur = useCallback(() => {
//     const title = newQuest.title.trim()
//     if (nameCheckTimeoutRef.current) {
//       clearTimeout(nameCheckTimeoutRef.current)
//     }
//   }, [newQuest.title, isConnected, network, checkNameAvailabilityAPI])

//   useEffect(() => {
//     return () => {
//       if (nameCheckTimeoutRef.current) clearTimeout(nameCheckTimeoutRef.current)
//     }
//   }, [])

//   const validateTask = useCallback((): boolean => {
//   const isDuplicate = newQuest.tasks.some(t => {
//     if (editingTask && t.id === editingTask.id) return false
//     return (
//       (newTask.title && t.title.toLowerCase() === newTask.title.trim().toLowerCase()) ||
//       (newTask.description && t.description?.toLowerCase() === newTask.description?.trim().toLowerCase()) ||
//       (newTask.url && 
//        t.url.toLowerCase() === newTask.url.trim().toLowerCase() && 
//        t.action === newTask.action)
//     )
//   })
//   if (isDuplicate) {
//     setError("A task already exists with the same Title, Description, or URL with the same action. Quest tasks must be unique.")
//     return false
//   }
//   if (!newTask.title || !newTask.url || newTask.points === undefined || newTask.points === "" || Number(newTask.points) <= 0 || !newTask.stage) {
//     setError("Please fill in all required task fields: Title, URL, Points (must be > 0), and Stage.")
//     return false
//   }
//   if (newTask.category && 
//     newTask.category !== 'social' && 
//     newTask.category !== 'referral' && 
//     !newTask.description) {
//   setError("Please provide a detailed description for non-template tasks.")
//   return false
// }
//   if (newTask.category === 'referral' && (newTask.minReferrals === undefined || newTask.minReferrals === "" || Number(newTask.minReferrals) <= 0)) {
//     setError("For 'referral' tasks, please specify a minimum required number of referrals (greater than 0).")
//     return false
//   }
//   if (newTask.category === 'holding') {
//     if (!newTask.holdingContractAddress || !isAddress(newTask.holdingContractAddress)) {
//       setError("Valid contract address required for holding task.")
//       return false
//     }
//     const minAmt = parseFloat(String(newTask.minHoldingAmount || '0'))
//     if (isNaN(minAmt) || minAmt <= 0) {
//       setError("Minimum holding amount must be greater than 0.")
//       return false
//     }
//   }
//   if (!editingTask) {
//     const currentStageCount = stageTaskCounts[newTask.stage as TaskStage]
//     const maxAllowed = STAGE_TASK_REQUIREMENTS[newTask.stage as TaskStage].max
//     if (currentStageCount >= maxAllowed) {
//       setError(`Cannot add more tasks to ${newTask.stage} stage. Maximum ${maxAllowed} tasks allowed.`)
//       return false
//     }
//   }
//   setError(null)
//   return true
// }, [newQuest.tasks, editingTask, newTask, stageTaskCounts])
//   const checkStagePassPointsValidity = useCallback((): boolean => {
//     for (const stage of TASK_STAGES) {
//       const totalPoints = stageTotals[stage]
//       const requiredPass = stagePassRequirements[stage]
//       if (totalPoints > 0) {
//         const maxAllowed = Math.floor(totalPoints * MAX_PASS_POINT_RATIO)
//         if (requiredPass > maxAllowed || requiredPass <= 0) {
//           return false
//         }
//       }
//     }
//     return true
//   }, [stageTotals, stagePassRequirements])

//   const validateStagePassPoints = useCallback((): boolean => {
//     let isValid = true
//     for (const stage of TASK_STAGES) {
//       const totalPoints = stageTotals[stage]
//       const requiredPass = stagePassRequirements[stage]
//       if (totalPoints > 0) {
//         const maxAllowed = Math.floor(totalPoints * MAX_PASS_POINT_RATIO)
//         if (requiredPass > maxAllowed || requiredPass <= 0) {
//           const errorMessage = `Stage "${stage}" Pass Points (${requiredPass}) must be > 0 and cannot exceed 70% of its total points (${totalPoints}). Expected max point: ${maxAllowed}.`
//           setError(errorMessage)
//           isValid = false
//           break
//         }
//       }
//     }
//     if (isValid) setError(null)
//     return isValid
//   }, [stageTotals, stagePassRequirements, setError])

//   const validateStageTaskRequirements = useCallback((): boolean => {
//     let isValid = true
//     for (const stage of TASK_STAGES) {
//       const taskCount = stageTaskCounts[stage]
//       const requirement = STAGE_TASK_REQUIREMENTS[stage]
//       if (taskCount > 0 && taskCount < requirement.min) {
//         setError(`Stage "${stage}" requires at least ${requirement.min} tasks. Currently has ${taskCount}.`)
//         isValid = false
//         break
//       }
//     }
//     if (isValid) setError(null)
//     return isValid
//   }, [stageTaskCounts, setError])

//   const isStageSelectable = useCallback((targetStage: TaskStage): boolean => {
//     const targetIndex = TASK_STAGES.indexOf(targetStage)
//     if (targetIndex === 0 || (editingTask && editingTask.stage === targetStage)) {
//       return true
//     }
//     for (let i = 0; i < targetIndex; i++) {
//       const prevStage = TASK_STAGES[i]
//       const prevStageTaskCount = stageTaskCounts[prevStage]
//       const prevStageRequirement = STAGE_TASK_REQUIREMENTS[prevStage]
//       if (prevStageTaskCount < prevStageRequirement.min) {
//         return false
//       }
//     }
//     return true
//   }, [stageTaskCounts, editingTask])

//   const handleUseSuggestedTask = (suggestedTask: Partial<QuestTask>) => {
//     setNewTask({
//       ...initialNewTaskForm,
//       ...suggestedTask,
//       stage: newTask.stage || 'Beginner',
//       id: undefined,
//     })
//   }

//   const handleAddTask = () => {
//     if (!validateTask()) return
//     const task: QuestTask = {
//       ...initialNewTaskForm,
//       id: Date.now().toString(),
//       title: newTask.title!,
//       description: newTask.category === 'social' ? (newTask.description || generateSocialTaskTitle(newTask.targetPlatform || 'Website', newTask.action || 'visit')) : newTask.description!,
//       points: parseFloat(String(newTask.points)),
//       required: newTask.required!,
//       category: newTask.category!,
//       url: newTask.url!,
//       action: newTask.action!,
//       verificationType: newTask.verificationType!,
//       targetPlatform: newTask.targetPlatform,
//       targetHandle: newTask.targetHandle,
//       targetContractAddress: newTask.targetContractAddress,
//       targetChainId: newTask.targetChainId,
//       stage: newTask.stage!,
//       minReferrals: newTask.minReferrals ? Number(newTask.minReferrals) : undefined,
//       assetType: newTask.assetType,
//       holdingContractAddress: newTask.holdingContractAddress,
//       minHoldingAmount: newTask.minHoldingAmount ? Number(newTask.minHoldingAmount) : undefined,
//       submissionPlaceholder: newTask.submissionPlaceholder
//     }
//     setNewQuest(prev => ({ ...prev, tasks: [...prev.tasks, task] }))
//     setNewTask(initialNewTaskForm)
//   }

//   const handleUpdateTask = () => {
//     if (!editingTask) return
//     if (!validateTask()) return
//     const updatedTask: QuestTask = {
//       ...editingTask,
//       ...newTask,
//       id: editingTask.id,
//       points: newTask.points!,
//       stage: newTask.stage!,
//       description: newTask.category === 'social' ? (newTask.description || generateSocialTaskTitle(newTask.targetPlatform || 'Website', newTask.action || 'visit')) : newTask.description!,
//       minReferrals: newTask.category === 'referral' ? newTask.minReferrals : undefined,
//       assetType: newTask.assetType,
//       holdingContractAddress: newTask.holdingContractAddress,
//       minHoldingAmount: newTask.minHoldingAmount,
//       submissionPlaceholder: newTask.submissionPlaceholder
//     }
//     setNewQuest(prev => ({
//       ...prev,
//       tasks: prev.tasks.map(t => t.id === editingTask.id ? updatedTask : t)
//     }))
//     setEditingTask(null)
//     setNewTask(initialNewTaskForm)
//   }

//   const handleEditTask = (task: QuestTask) => {
//     setEditingTask(task)
//     setNewTask({
//       ...task,
//       minReferrals: task.category === 'referral' ? task.minReferrals : undefined,
//     })
//   }

//   const handleRemoveTask = (taskId: string) => {
//     setNewQuest(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }))
//     if (editingTask && editingTask.id === taskId) {
//       setEditingTask(null)
//       setNewTask(initialNewTaskForm)
//     }
//   }

//   const handleStagePassRequirementChange = (stage: TaskStage, value: number) => {
//     setStagePassRequirements(prev => ({ ...prev, [stage]: value }))
//   }

//   const getStageColor = (stage: TaskStage) => {
//     switch (stage) {
//       case 'Beginner': return 'bg-green-500 hover:bg-green-600'
//       case 'Intermediate': return 'bg-blue-500 hover:bg-blue-600'
//       case 'Advance': return 'bg-purple-500 hover:bg-purple-600'
//       case 'Legend': return 'bg-yellow-500 hover:bg-yellow-600'
//       case 'Ultimate': return 'bg-red-500 hover:bg-red-600'
//       default: return 'bg-gray-500 hover:bg-gray-600'
//     }
//   }

//   const getCategoryColor = (category: string) => {
//     switch (category) {
//       case 'social': return 'bg-blue-100 text-blue-800'
//       case 'trading': return 'bg-green-100 text-green-800'
//       case 'swap': return 'bg-purple-100 text-purple-800'
//       case 'referral': return 'bg-orange-100 text-orange-800'
//       case 'content': return 'bg-pink-100 text-pink-800'
//       case 'holding': return 'bg-cyan-100 text-cyan-800'
//       default: return 'bg-gray-100 text-gray-800'
//     }
//   }

//   const getVerificationIcon = (type: VerificationType) => {
//     switch (type) {
//       case 'auto_social': return <Zap className="h-4 w-4 text-blue-500" />
//       case 'auto_tx': return <Wallet className="h-4 w-4 text-green-500" />
//       case 'auto_holding': return <Wallet className="h-4 w-4 text-cyan-500" />
//       case 'manual_link': return <Link className="h-4 w-4 text-yellow-500" />
//       case 'manual_upload': return <Upload className="h-4 w-4 text-red-500" />
//       default: return <Settings className="h-4 w-4 text-gray-500" />
//     }
//   }

//   const handleImageUpload = useCallback(async (file: File) => {
//     setIsUploadingImage(true)
//     setUploadImageError(null)
//     const formData = new FormData()
//     formData.append("file", file)
//     try {
//       const response = await fetch(`${API_BASE_URL}/upload-image`, {
//         method: 'POST',
//         body: formData,
//       })
//       if (!response.ok) {
//         const errorData = await response.json()
//         throw new Error(errorData.detail || 'Failed to upload image.')
//       }
//       const data = await response.json()
//       setNewQuest(prev => ({ ...prev, imageUrl: data.imageUrl }))
//       setUploadImageError(null)
//     } catch (e: any) {
//       console.error('Image upload failed:', e)
//       setUploadImageError(e.message || "Failed to upload image. Check console for details.")
//       setNewQuest(prev => ({ ...prev, imageUrl: initialNewQuest.imageUrl }))
//     } finally {
//       setIsUploadingImage(false)
//     }
//   }, [])

//   const handleCreateCustomFaucet = async (questName: string, token: string) => {
//     if (!address || !isConnected || !FAUCET_FACTORY_ADDRESS || !walletProvider) {
//       setError("Wallet or provider is not ready for deployment.")
//       return null
//     }
//     try {
//       const newFaucetAddress = await createCustomFaucet(
//         walletProvider as BrowserProvider,
//         FAUCET_FACTORY_ADDRESS,
//         questName,
//         token
//       )
//       if (newFaucetAddress) {
//         return newFaucetAddress
//       }
//       throw new Error("Deployment successful, but address retrieval failed.")
//     } catch (error: any) {
//       console.error('Error deploying custom faucet:', error)
//       setError(`Deployment failed: ${error.message || 'Unknown transaction error'}`)
//       return null
//     }
//   }

//   const handleCreateQuest = async () => {
//     if (!selectedToken) {
//       setError("Please select a valid reward token (Step 2).")
//       setStep(2)
//       return
//     }
//     if (!address || !isConnected) {
//       setError("You must connect your wallet to deploy the smart contract and create the quest.")
//       return
//     }
//     if (newQuest.tasks.length === 0) {
//       setError("Please add at least one task to the quest (Step 3).")
//       setStep(3)
//       return
//     }
//     if (!isFactoryAvailableOnChain) {
//       setError(`Cannot deploy: No Custom Faucet Factory configured for ${network?.name || 'this network'}.`)
//       return
//     }
//     if (isCheckingName || nameError || newQuest.title.trim().length < 3) {
//       setError(nameError || "Title must be valid and checked (Step 1).")
//       setStep(1)
//       return
//     }
//     if (!validateStagePassPoints()) {
//       setStep(3)
//       return
//     }
//     if (!validateStageTaskRequirements()) {
//       setStep(3)
//       return
//     }
//     if (isUploadingImage || uploadImageError) {
//       setError(uploadImageError || "Please wait for image upload to complete or fix upload error.")
//       setStep(1)
//       return
//     }
//     if (!newQuest.rewardPool || parseFloat(newQuest.rewardPool) <= 0) {
//       setError("Reward pool amount must be greater than 0.")
//       setStep(2)
//       return
//     }
//     setError(null)
//     setIsSaving(true)

//     const tokenToDeploy = selectedToken.address
//     const faucetAddress = await handleCreateCustomFaucet(newQuest.title, tokenToDeploy)
//     if (!faucetAddress) {
//       setIsSaving(false)
//       return
//     }

//     const questData: Quest = {
//       id: Date.now().toString(),
//       creatorAddress: address,
//       ...newQuest,
//       faucetAddress: faucetAddress,
//       tokenAddress: tokenToDeploy,
//       rewardTokenType: selectedToken.isNative ? 'native' : 'erc20',
//       stagePassRequirements: stagePassRequirements,
//       imageUrl: newQuest.imageUrl,
//       startDate: `${newQuest.startDate}T${newQuest.startTime}:00Z`,
//       endDate: `${newQuest.endDate}T${newQuest.endTime}:00Z`,
//       isActive: true,
//       isFunded: false
//     }

//     try {
//       const response = await fetch(`${API_BASE_URL}/api/quests`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         },
//         body: JSON.stringify(questData)
//       })

//       const responseText = await response.text()
//       if (!response.ok) {
//         let errorData
//         try {
//           errorData = JSON.parse(responseText)
//         } catch {
//           errorData = { detail: responseText }
//         }
//         throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
//       }

//       const responseData = JSON.parse(responseText)

//       toast(`Quest created on ${network?.name}!\n\nFaucet Address: ${faucetAddress}\n\nTasks Saved: ${questData.tasks.length}\n\nRemember to fund the Faucet!`)

//       if (responseData.id) {
//         router.push(`/quests/${responseData.id}`)
//       } else {
//         router.push('/my-quests')
//       }

//       setNewQuest(initialNewQuest)
//       setNewTask(initialNewTaskForm)
//       setStagePassRequirements(initialStagePassRequirements)
//       setSelectedToken(null)
//       setStep(1)
//     } catch (e: any) {
//       console.error('Quest save failed:', e)
//       setError(`Backend Error: ${e.message}. Faucet deployed at ${faucetAddress}.`)
//     } finally {
//       setIsSaving(false)
//     }
//   }

//   const handleNext = () => {
//     let isStepValid = true
//     if (step === 1) {
//       if (!newQuest.title.trim() || newQuest.title.trim().length < 3) {
//         setError("Step 1: Quest Title must be at least 3 characters long.")
//         isStepValid = false
//       } else if (isCheckingName || nameError) {
//         setError(nameError || "Step 1: Please wait for name check to complete or resolve the error.")
//         isStepValid = false
//       } else if (!newQuest.imageUrl) {
//         setError("Step 1: Please upload a Quest Image.")
//         isStepValid = false
//       } else if (isUploadingImage || uploadImageError) {
//         setError(uploadImageError || "Step 1: Please wait for image upload to complete or fix upload error.")
//         isStepValid = false
//       }
//     }
//     if (step === 2) {
//       if (!selectedToken) {
//         setError("Step 2: Please select a reward token.")
//         isStepValid = false
//       }
//       if (!newQuest.rewardPool || parseFloat(newQuest.rewardPool) <= 0) {
//         setError("Step 2: Reward pool amount must be greater than 0.")
//         isStepValid = false
//       }
//     }
//     if (step === 3) {
//       if (newQuest.tasks.length === 0) {
//         setError("Step 3: Please add at least one task to the quest.")
//         isStepValid = false
//       } else if (!validateStagePassPoints()) {
//         isStepValid = false
//       } else if (!validateStageTaskRequirements()) {
//         isStepValid = false
//       }
//     }
//     if (isStepValid) {
//       setError(null)
//       setStep(prev => Math.min(prev + 1, maxSteps))
//     }
//   }

//   const handleBack = () => {
//     setStep(prev => Math.max(prev - 1, 1))
//     setError(null)
//   }

//   const isSaveDisabled = isSaving || newQuest.tasks.length === 0 || !isFactoryAvailableOnChain || !isConnected || !selectedToken || !checkStagePassPointsValidity() || !!nameError || isCheckingName || newQuest.title.trim().length < 3 || isUploadingImage || !newQuest.imageUrl || !newQuest.rewardPool || parseFloat(newQuest.rewardPool) <= 0

//   if (isWalletConnecting) {
//     return (
//       <>
//         <Header pageTitle="Quest creator page" />
//         <Card className="max-w-md mx-auto mt-8">
//           <CardContent className="flex items-center justify-center py-8">
//             <Loader2 className="h-8 w-8 animate-spin mr-2" />
//             <span>Connecting wallet and loading network data...</span>
//           </CardContent>
//         </Card>
//       </>
//     )
//   }

//   if (!isConnected) {
//     return (
//       <>
//         <Header pageTitle="Quest creator page" />
//         <div className="max-w-6xl mx-auto p-6 space-y-6">
//           <h1 className="text-2xl font-bold mb-4">Create New Quest Campaign</h1>
//           <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
//             <strong className="font-bold">Info:</strong>
//             <span className="block sm:inline ml-2">Please connect your wallet to create a quest campaign.</span>
//           </div>
//         </div>
//       </>
//     )
//   }

//   return (
//     <>
//       <Header pageTitle="Quest creator page" />
//       <div className="max-w-6xl mx-auto p-6 space-y-6">
//         <h1 className="text-2xl font-bold mb-4">Create New Quest Campaign</h1>
//         {isConnected && error && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
//             <strong className="font-bold">Error!</strong>
//             <span className="block sm:inline ml-2">{error}</span>
//           </div>
//         )}
//         {isConnected && !isFactoryAvailableOnChain && (
//           <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
//             <strong className="font-bold">Warning:</strong>
//             <span className="block sm:inline ml-2">
//               The current network **({network?.name || 'Unknown'})** is not configured for Quest Deployment. Please switch to Celo, Lisk, Arbitrum, or Base. The Launch button is disabled.
//             </span>
//           </div>
//         )}
//         <div className="flex justify-between items-center max-w-xl mx-auto border-b pb-4 mb-4">
//           {[1, 2, 3, 4].map(s => (
//             <div key={s} className="flex flex-col items-center">
//               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
//                 s === step ? 'bg-primary text-primary-foreground scale-110' :
//                 s < step ? 'bg-green-500 text-white' :
//                 'bg-gray-200 text-gray-500'
//               }`}>
//                 {s < step ? <Check className="h-5 w-5" /> : s}
//               </div>
//               <span className={`text-xs mt-1 ${s === step ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
//                 {s === 1 ? 'Details' : s === 2 ? 'Rewards' : s === 3 ? 'Tasks' : 'Launch'}
//               </span>
//             </div>
//           ))}
//         </div>
//         <div className="min-h-[400px]">
//           {step === 1 && (
//             <StepOneDetails
//               newQuest={newQuest}
//               setNewQuest={setNewQuest}
//               nameError={nameError}
//               isCheckingName={isCheckingName}
//               isUploadingImage={isUploadingImage}
//               uploadImageError={uploadImageError}
//               handleImageUpload={handleImageUpload}
//               handleTitleChange={handleTitleChange}
//               handleTitleBlur={handleTitleBlur}
//             />
//           )}
//           {step === 2 && (
//             <StepTwoRewards
//               newQuest={newQuest}
//               setNewQuest={setNewQuest}
//               chainId={chainId}
//               network={network}
//               selectedToken={selectedToken}
//               setSelectedToken={setSelectedToken}
//               error={error}
//               setError={setError}
//             />
//           )}
//           {step === 3 && (
//             <StepThreeTasks
//               newQuest={newQuest}
//               setNewQuest={setNewQuest}
//               initialNewTaskForm={initialNewTaskForm}
//               error={error}
//               setError={setError}
//               stagePassRequirements={stagePassRequirements}
//               setStagePassRequirements={setStagePassRequirements}
//               stageTotals={stageTotals}
//               stageTaskCounts={stageTaskCounts}
//               validateTask={validateTask}
//               handleAddTask={handleAddTask}
//               handleEditTask={handleEditTask}
//               handleUpdateTask={handleUpdateTask}
//               handleRemoveTask={handleRemoveTask}
//               handleStagePassRequirementChange={handleStagePassRequirementChange}
//               isStageSelectable={isStageSelectable}
//               editingTask={editingTask}
//               setEditingTask={setEditingTask}
//               newTask={newTask}
//               setNewTask={setNewTask}
//               checkStagePassPointsValidity={checkStagePassPointsValidity}
//               getStageColor={getStageColor}
//               getCategoryColor={getCategoryColor}
//               getVerificationIcon={getVerificationIcon}
//               handleUseSuggestedTask={handleUseSuggestedTask}
//             />
//           )}
//           {step === 4 && (
//             <StepFourPreview
//               newQuest={newQuest}
//               stageTotals={stageTotals}
//               stagePassRequirements={stagePassRequirements}
//               selectedToken={selectedToken}
//               network={network}
//               isConnected={isConnected}
//               isSaving={isSaving}
//               isSaveDisabled={isSaveDisabled}
//               handleCreateQuest={handleCreateQuest}
//               getStageColor={getStageColor}
//             />
//           )}
//         </div>
//         <div className="flex justify-between pt-4 max-w-xl mx-auto">
//           <Button onClick={handleBack} disabled={step === 1} variant="outline">
//             <ArrowLeft className="h-4 w-4 mr-2" /> Back
//           </Button>
//           {step < maxSteps && (
//             <Button onClick={handleNext}>
//               Next Step <ArrowRight className="h-4 w-4 ml-2" />
//             </Button>
//           )}
//         </div>
//       </div>
//     </>
//   )
// }
"use client";
import React from 'react';
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">
      <div className="max-w-2xl w-full text-center space-y-8">
        
        {/* Logo with Theme Adaptation */}
        <div className="flex justify-center relative">
          {/* Light Mode Logo */}
          <Image
            src="/lightlogo.png"
            alt="FaucetDrops Logo"
            width={200}
            height={80}
            className="h-12 w-auto sm:h-16 lg:h-20 rounded-md object-contain dark:hidden"
            priority
          />
          
          {/* Dark Mode Logo */}
          <Image
            src="/darklogo.png"
            alt="FaucetDrops Logo"
            width={200}
            height={80}
            className="h-12 w-auto sm:h-16 lg:h-20 rounded-md object-contain hidden dark:block"
            priority
          />
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Coming Soon
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            We&apos;re working on something amazing!
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            This page is under construction. Please check back later for updates.
          </p>
        </div>

        {/* Status Badge */}
        <div className="pt-4">
          <div className="inline-flex items-center px-6 py-3 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 dark:bg-gray-300/75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-600 dark:bg-gray-200"></span>
            </span>
            Under Development
          </div>
        </div>

        {/* Social Media Links */}
        <div className="pt-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            In the meantime, you can follow us on social media or contact our team
          </p>
          <div className="flex justify-center space-x-6 pt-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-300 hover:scale-110"
                aria-label={social.label}
                title={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Footer Link */}
        <div className="pt-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            In the meantime, you can check out our
            <Link 
              href="/" 
              className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline font-medium transition-colors duration-300 ml-1"
            >
              homepage
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}