"use client"
import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  Plus, 
  Trash2, 
  Save, 
  Settings, 
  Loader2,
  ListPlus,
  Zap,
  Upload,
  Link,
  Wallet,
  Coins
} from "lucide-react"
import { Header } from '@/components/header'
import { useWallet } from "@/hooks/use-wallet" 
import { useNetwork, networks } from "@/hooks/use-network" 
import { ethers } from 'ethers'; 

// Define Zero Address (must be outside the component)
const zeroAddress = ethers.ZeroAddress; 

// --- TYPE & CONSTANT DEFINITIONS (Integrated Directly) ---

interface TokenConfiguration {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isNative?: boolean;
  logoUrl?: string; // Added logoUrl
}

// Define Supported Chain IDs and Tokens
// NOTE: 42220=Celo, 1135=Lisk, 42161=Arbitrum, 8453=Base
const ALL_TOKENS_BY_CHAIN: Record<number, TokenConfiguration[]> = {
  // Celo Mainnet (42220)
  42220: [
    { // Native Token
      address: "0x471EcE3750Da237f93B8E339c536989b8978a438", 
      name: "Celo",
      symbol: "CELO",
      decimals: 18,
      isNative: true,
      logoUrl: "/celo.png", 
    },
    {
      address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      name: "Celo Dollar",
      symbol: "cUSD",
      decimals: 18,
      logoUrl: "/cusd.png",
    },
    {
      address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
      name: "Celo Euro",
      symbol: "cEUR",
      decimals: 18,
      logoUrl: "/ceur.png",
    },
    {
      address: "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3",
      name: "Glo Dollar",
      symbol: "USDGLO",
      decimals: 18,
      logoUrl: "/glo.jpg",
    },
    {
      address: "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a",
      name: "Good dollar",
      symbol: "G$",
      decimals: 18,
      logoUrl: "/gd.jpg",
    },
  ],
  // Arbitrum (42161)
  42161: [
    { // Native Token
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
      logoUrl: "/ether.jpeg",
    },
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Placeholder for ARB USDC
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      logoUrl: "/usdc.jpg",
    },
  ],
  // Lisk Mainnet (1135)
  1135: [
    { // Native Token
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
      logoUrl: "/ether.jpeg",
    },
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Placeholder for Lisk USDC
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      logoUrl: "/usdc.jpg",
    },
  ],
  // Base Mainnet (8453)
  8453: [
    { // Native Token
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
      logoUrl: "/ether.jpeg",
    },
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      logoUrl: "/usdc.jpg",
    },
  ],
};

// --- FACTORY & FAUCET ABI CONTENT (PLACEHOLDERS) ---
const FACTORY_ABI_CUSTOM: any[] = [
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [{ "internalType": "string", "name": "_name", "type": "string" }, { "internalType": "address", "name": "_token", "type": "address" }, { "internalType": "address", "name": "_backend", "type": "address" }], "name": "createCustomFaucet", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "nonpayable", "type": "function" },
    { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "faucet", "type": "address" }, { "indexed": false, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" }, { "indexed": false, "internalType": "address", "name": "token", "type": "address" }, { "indexed": false, "internalType": "address", "name": "backend", "type": "address" }], "name": "FaucetCreated", "type": "event" }
];
const FAUCET_ABI_CUSTOM: any[] = [
    { "inputs": [{ "internalType": "address[]", "name": "users", "type": "address[]" }, { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "name": "setCustomClaimAmountsBatch", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

// --- CONSTANTS ---
const PLATFORM_BACKEND_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"; // Trusted backend address (Platform Owner)
const API_BASE_URL = "http://127.0.0.1:8000"

// --- Data Structures (omitted for brevity, assume consistency) ---
type VerificationType = 'auto_social' | 'auto_tx' | 'manual_link' | 'manual_upload' | 'none';

interface QuestTask {
  id: string
  title: string
  description: string
  points: number
  required: boolean
  category: 'social' | 'trading' | 'swap' | 'referral' | 'general'
  url: string 
  action: string 
  verificationType: VerificationType 
  targetPlatform?: string 
  targetHandle?: string 
  targetContractAddress?: string 
  targetChainId?: string 
}

interface Quest {
  id: string
  creatorAddress: string
  title: string
  description: string
  isActive: boolean
  rewardPool: string 
  startDate: string
  endDate: string
  tasks: QuestTask[]
  
  faucetAddress?: string; 
  rewardTokenType: 'native' | 'erc20'; 
  tokenAddress: string; 
}

const initialNewQuest: Omit<Quest, 'id' | 'creatorAddress'> = {
  title: "New Community Campaign",
  description: "Join our ecosystem and earn rewards.",
  isActive: true,
  rewardPool: "TBD",
  startDate: new Date().toISOString().split('T')[0], 
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
  tasks: [],
  faucetAddress: undefined,
  rewardTokenType: 'native',
  tokenAddress: ethers.ZeroAddress, 
}

const initialNewTaskForm: Partial<QuestTask> = {
  title: "",
  description: "",
  points: 100,
  required: true,
  category: "social",
  url: "",
  action: "follow",
  verificationType: "manual_link",
  targetPlatform: "Twitter"
}


// --- FACTORY ADDRESS LOOKUP (Uses the imported 'networks' array) ---
const getCustomFactoryAddress = (currentChainId: number | null) => {
    if (!currentChainId) return null;
    
    // Assumes 'networks' array is correctly exported from use-network.tsx
    const currentNetworkConfig = networks.find(n => n.chainId === currentChainId);
    return currentNetworkConfig?.factories.custom || null;
};
// ------------------------------------------------------------------

export default function QuestCreator() {
  const { address, isConnected, chainId } = useWallet(); 
  const { network, isConnecting: isNetworkConnecting } = useNetwork(); 
  
  const [newQuest, setNewQuest] = useState<Omit<Quest, 'id' | 'creatorAddress'>>(initialNewQuest)
  const [newTask, setNewTask] = useState<Partial<QuestTask>>(initialNewTaskForm)
  const [editingTask, setEditingTask] = useState<QuestTask | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null);

  // --- NEW TOKEN STATE & LOGIC ---
  const [selectedToken, setSelectedToken] = useState<TokenConfiguration | null>(null);
  const [isCustomToken, setIsCustomToken] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState('');

  // Derive available tokens from the current chainId using the integrated data
  const availableTokens = chainId ? ALL_TOKENS_BY_CHAIN[chainId] || [] : [];
  
  // Set initial token when network or chainId changes
  useEffect(() => {
    if (chainId && availableTokens.length > 0) {
      const currentTokenAddress = newQuest.tokenAddress;
      let initialToken = availableTokens.find(t => t.address.toLowerCase() === currentTokenAddress.toLowerCase());
      
      if (!initialToken) {
          initialToken = availableTokens.find(t => t.isNative) || availableTokens[0];
      }

      setSelectedToken(initialToken);
      setNewQuest(prev => ({
        ...prev,
        rewardTokenType: initialToken!.isNative ? 'native' : 'erc20',
        tokenAddress: initialToken!.address,
      }));
      setIsCustomToken(false);
      setCustomTokenAddress('');
    } else if (!chainId) {
      setSelectedToken(null);
      setNewQuest(initialNewQuest); 
      setIsCustomToken(false);
      setCustomTokenAddress('');
    }
  }, [chainId]); // Re-run only when chainId changes

  // Factory lookup 
  const FAUCET_FACTORY_ADDRESS = getCustomFactoryAddress(chainId);
  const isFactoryAvailable = !!FAUCET_FACTORY_ADDRESS && isConnected; 

  // --- Utility Handlers (omitted for brevity) ---
  const handleAddTask = () => {
    if (!newTask.title || !newTask.description || !newTask.url) return

    const task: QuestTask = {
      ...initialNewTaskForm,
      id: Date.now().toString(),
      title: newTask.title!,
      description: newTask.description!,
      points: newTask.points!,
      required: newTask.required!,
      category: newTask.category!,
      url: newTask.url!,
      action: newTask.action!,
      verificationType: newTask.verificationType!,
      targetPlatform: newTask.targetPlatform,
      targetHandle: (newTask as any).handle, 
      targetContractAddress: newTask.targetContractAddress,
      targetChainId: newTask.targetChainId,
    }

    setNewQuest(prev => ({ ...prev, tasks: [...prev.tasks, task] }))
    setNewTask(initialNewTaskForm)
  }

  const handleEditTask = (task: QuestTask) => {
    setEditingTask(task)
    setNewTask(task) 
  }

  const handleUpdateTask = () => {
    if (!editingTask || !newTask.title || !newTask.description) return

    const updatedTask: QuestTask = {
      ...editingTask,
      ...newTask,
      id: editingTask.id, 
    }

    setNewQuest(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === editingTask.id ? updatedTask : t)
    }))
    setEditingTask(null)
    setNewTask(initialNewTaskForm)
  }

  const handleRemoveTask = (taskId: string) => {
    setNewQuest(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId)
    }))
  }

  const getVerificationIcon = (type: VerificationType) => {
    switch (type) {
      case 'auto_social': return <Zap className="h-4 w-4 text-blue-500" />;
      case 'auto_tx': return <Wallet className="h-4 w-4 text-green-500" />;
      case 'manual_link': return <Link className="h-4 w-4 text-yellow-500" />;
      case 'manual_upload': return <Upload className="h-4 w-4 text-red-500" />;
      default: return <Settings className="h-4 w-4 text-gray-500" />;
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social': return 'bg-blue-100 text-blue-800';
      case 'trading': return 'bg-green-100 text-green-800';
      case 'swap': return 'bg-purple-100 text-purple-800';
      case 'referral': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }


  // --- Web3 Logic: Faucet Deployment ---

  const handleCreateCustomFaucet = async (questName: string, token: string) => {
    if (!address || !isConnected) {
        setError("You must connect your wallet to deploy the smart contract.");
        return null;
    }
    
    try {
        if (!window.ethereum) {
             throw new Error("Ethereum provider (like Metamask) is not detected.");
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const factoryContract = new ethers.Contract(
            FAUCET_FACTORY_ADDRESS!,
            FACTORY_ABI_CUSTOM,
            signer
        );
        
        console.log(`Deploying Faucet for Quest: ${questName} on Factory: ${FAUCET_FACTORY_ADDRESS}`);
        
        const tx = await factoryContract.createCustomFaucet(
            questName, 
            token, 
            PLATFORM_BACKEND_ADDRESS
        );

        const receipt = await tx.wait();
        let newFaucetAddress: string | null = null;
        for (const log of receipt.logs) {
            try {
                const event = factoryContract.interface.parseLog(log as any);
                if (event && event.name === 'FaucetCreated') {
                    newFaucetAddress = event.args.faucet;
                    break;
                }
            } catch (e) { /* Ignore logs */ }
        }
        
        if (newFaucetAddress) {
            console.log('✅ Faucet deployed at:', newFaucetAddress);
            return newFaucetAddress;
        }

        throw new Error("Faucet deployment successful, but failed to find FaucetCreated event.");

    } catch (error) {
        console.error('Error deploying custom faucet:', error);
        setError(`Deployment failed. Check your wallet for signature requests and ensure you have enough ${network?.nativeCurrency.symbol || 'native currency'} for gas. Details: ${(error as any).message || 'Unknown error'}`);
        return null;
    }
  };

  // --- Main Save/Launch Handler (No change to core logic) ---

  const handleCreateQuest = async () => {
    if (!selectedToken) {
        setError("Please select a valid reward token.");
        return;
    }

    if (!address || !isConnected) {
        setError("You must connect your wallet to deploy the smart contract and create the quest.");
        return;
    }
    if (newQuest.tasks.length === 0) {
        setError("Please add at least one task to the quest.");
        return;
    }
    if (!isFactoryAvailable) {
        setError(`Cannot deploy: No Custom Faucet Factory configured for ${network?.name || 'this network'} (Chain ID: ${chainId}). Please switch networks.`);
        return;
    }
    
    setError(null);
    setIsSaving(true);
    
    const tokenToDeploy = selectedToken.address;

    const faucetAddress = await handleCreateCustomFaucet(
        newQuest.title, 
        tokenToDeploy 
    );

    if (!faucetAddress) {
        setIsSaving(false);
        return;
    }

    const questData: Quest = {
        id: Date.now().toString(), 
        creatorAddress: address!,
        ...newQuest,
        faucetAddress: faucetAddress, 
        tokenAddress: tokenToDeploy, 
        rewardTokenType: selectedToken.isNative ? 'native' : 'erc20',
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/quests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questData)
        })

        if (response.ok) {
            alert(`Quest created on ${network?.name} and Faucet deployed successfully at ${faucetAddress}! Remember to fund the Faucet.`);
            setNewQuest(initialNewQuest); 
            setNewTask(initialNewTaskForm);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save quest data to backend.');
        }
    } catch (e: any) {
        console.error('Quest save failed:', e);
        setError(`Backend Error saving quest details: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  }


  // --- Render Logic ---
  
  if (isNetworkConnecting) {
     return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading network configuration...</span>
        </CardContent>
      </Card>
    )
  }

  if (!isFactoryAvailable && isConnected) {
    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <Header pageTitle='Create New Quest Campaign' />
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Warning!</strong>
                <span className="block sm:inline ml-2">
                    No Custom Faucet Factory found for **{network?.name || 'this network'}** (Chain ID: {chainId}). Quest deployment requires switching to a supported chain (e.g., Celo, Base, Arbitrum).
                </span>
            </div>
            <Card className="max-w-md mx-auto">
                <CardContent className="py-6 text-center">
                    <p className="text-sm text-red-500">Please switch your wallet network to a supported chain to enable quest deployment.</p>
                </CardContent>
            </Card>
        </div>
    )
  }
  
  const isSaveDisabled = isSaving 
    || newQuest.tasks.length === 0 
    || !isFactoryAvailable 
    || !isConnected 
    || !selectedToken; 

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Header pageTitle='Create New Quest Campaign' />

      {/* ERROR DISPLAY */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quest Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" /> Quest Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="title">Quest Title (also Faucet Name)</Label>
              <Input
                id="title"
                value={newQuest.title}
                onChange={(e) => setNewQuest({...newQuest, title: e.target.value})}
                placeholder="The FaucetDrop Launch Campaign"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Quest Description</Label>
              <Textarea
                id="description"
                value={newQuest.description}
                onChange={(e) => setNewQuest({...newQuest, description: e.target.value})}
                placeholder="A campaign to reward early community members."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rewardPool">Reward Pool Description</Label>
              <Input
                id="rewardPool"
                value={newQuest.rewardPool}
                onChange={(e) => setNewQuest({...newQuest, rewardPool: e.target.value})}
                placeholder="5000 $FD tokens + 10 NFT spots"
              />
            </div>

            {/* --- REWARD & FAUCET CONFIG --- */}
            <div className="border p-4 rounded-lg space-y-3">
                <h3 className="text-md font-semibold flex items-center gap-2">
                    <Coins className="h-4 w-4" /> Reward System Configuration
                </h3>
                <div className="text-xs text-muted-foreground">
                    This faucet will be deployed on **{network?.name || 'the connected chain'}**.
                </div>

                {/* REWARD TOKEN SELECTOR */}
                <div className="space-y-2">
                    <Label htmlFor="rewardToken">Reward Token ({network?.name || 'Unknown Chain'})</Label>
                    <Select
                        value={isCustomToken ? "custom" : (selectedToken ? selectedToken.address : undefined)}
                        onValueChange={(value) => {
                            if (value === "custom") {
                                setIsCustomToken(true);
                                setSelectedToken(null);
                            } else {
                                const token = availableTokens.find(t => t.address === value);
                                if (token) {
                                    setSelectedToken(token);
                                    setIsCustomToken(false);
                                    setCustomTokenAddress('');
                                    setNewQuest(prev => ({
                                        ...prev, 
                                        rewardTokenType: token.isNative ? 'native' : 'erc20',
                                        tokenAddress: token.address,
                                    }));
                                }
                            }
                        }}
                        disabled={availableTokens.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue>
                                {isCustomToken ? (
                                    "Custom Token"
                                ) : selectedToken ? (
                                    <span className="flex items-center gap-2">
                                        {selectedToken.logoUrl && (
                                            <img 
                                                src={selectedToken.logoUrl} 
                                                alt={`${selectedToken.symbol} logo`} 
                                                className="h-4 w-4 rounded-full"
                                            />
                                        )}
                                        {selectedToken.name} ({selectedToken.symbol})
                                    </span>
                                ) : (
                                    availableTokens.length > 0 ? "Select reward token" : "No tokens available on this chain"
                                )}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {availableTokens.map((token) => (
                                <SelectItem key={token.address} value={token.address}>
                                    <div className="flex items-center gap-2">
                                        {token.logoUrl && (
                                            <img 
                                                src={token.logoUrl} 
                                                alt={`${token.symbol} logo`} 
                                                className="h-4 w-4 rounded-full"
                                            />
                                        )}
                                        {token.name} ({token.symbol}) {token.isNative && <Badge variant="secondary" className="text-xs">Native</Badge>}
                                    </div>
                                </SelectItem>
                            ))}
                            <SelectItem value="custom">+ Custom Token</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* CUSTOM TOKEN INPUTS */}
                {isCustomToken && (
                    <div className="space-y-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                        <h4 className="text-sm font-medium">Custom Token Address</h4>
                        <div className="space-y-2">
                            <Label className="text-xs">Token Contract Address</Label>
                            <Input
                                value={customTokenAddress}
                                onChange={(e) => setCustomTokenAddress(e.target.value)}
                                placeholder="0x..."
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (customTokenAddress && ethers.isAddress(customTokenAddress)) {
                                    const fullCustom: TokenConfiguration = {
                                        address: customTokenAddress,
                                        name: 'Custom Token',
                                        symbol: 'CUST',
                                        decimals: 18,
                                        isNative: false,
                                    };
                                    setSelectedToken(fullCustom);
                                    setIsCustomToken(false);
                                    setNewQuest(prev => ({
                                        ...prev,
                                        rewardTokenType: 'erc20',
                                        tokenAddress: fullCustom.address,
                                    }));
                                } else {
                                    setError("Please enter a valid token contract address.");
                                }
                            }}
                            disabled={!customTokenAddress || !ethers.isAddress(customTokenAddress)}
                            className="w-full"
                        >
                            Set Custom Token
                        </Button>
                    </div>
                )}

                <div className="space-y-2 pt-2">
                    <Label>Faucet Deployment Status</Label>
                    <Badge variant={newQuest.faucetAddress ? 'default' : 'secondary'} className="w-full justify-center">
                        {newQuest.faucetAddress 
                            ? `Deployed: ${newQuest.faucetAddress.slice(0, 6)}...${newQuest.faucetAddress.slice(-4)}`
                            : "Faucet will be deployed upon Quest launch."
                        }
                    </Badge>
                </div>
            </div>
            {/* --- END REWARD CONFIG --- */}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={newQuest.startDate} onChange={(e) => setNewQuest({...newQuest, startDate: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={newQuest.endDate} onChange={(e) => setNewQuest({...newQuest, endDate: e.target.value})} />
              </div>
            </div>
            
            <Button
                onClick={handleCreateQuest}
                disabled={isSaveDisabled}
                className="w-full mt-6"
            >
                {isConnected ? (
                  isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                {isConnected ? `Save & Deploy Faucet` : "Connect Wallet to Deploy"}
            </Button>
          </CardContent>
        </Card>

        {/* Add/Edit Task Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListPlus className="h-5 w-5" />
              {editingTask ? "Edit Task" : "Define New Task"}
            </CardTitle>
            <CardDescription>
                Define the action required and the verification method.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task Title</Label>
              <Input
                id="taskTitle"
                value={newTask.title || ""}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                placeholder="Follow us on Twitter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskDescription">Description / Guide</Label>
              <Textarea
                id="taskDescription"
                value={newTask.description || ""}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                placeholder="Read our thread on tokenomics and summarize (280 chars)."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="url">Action URL / Guide Link</Label>
                <Input
                  id="url"
                  value={newTask.url || ""}
                  onChange={(e) => setNewTask({...newTask, url: e.target.value})}
                  placeholder="https://x.com/faucetdrops/status/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  value={newTask.points || 100}
                  onChange={(e) => setNewTask({...newTask, points: parseInt(e.target.value)})}
                  min="1"
                />
              </div>
            </div>
            
            {/* Task Categorization and Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTask.category || "social"}
                  onValueChange={(value: any) => setNewTask({...newTask, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="trading">Trading</SelectItem>
                    <SelectItem value="swap">Swap</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verificationType">Verification Method</Label>
                <Select
                  value={newTask.verificationType || "manual_link"}
                  onValueChange={(value: any) => setNewTask({...newTask, verificationType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_social">🤖 Auto (Social Follow/Join)</SelectItem>
                    <SelectItem value="auto_tx">💰 Auto (Tx Hash/Dapp)</SelectItem>
                    <SelectItem value="manual_link">🔗 Manual (Link Submission)</SelectItem>
                    <SelectItem value="manual_upload">🖼️ Manual (Image Upload)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Verification Fields */}
            {newTask.verificationType === 'auto_social' && (
                <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="space-y-2">
                        <Label>Platform</Label>
                        <Input 
                            value={newTask.targetPlatform || ""} 
                            onChange={(e) => setNewTask({...newTask, targetPlatform: e.target.value})} 
                            placeholder="Twitter, Discord, Telegram"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Handle/Username</Label>
                        <Input 
                            value={newTask.targetHandle || ""} 
                            onChange={(e) => setNewTask({...newTask, targetHandle: e.target.value})} 
                            placeholder="@YourHandle"
                        />
                    </div>
                </div>
            )}

            {newTask.verificationType === 'auto_tx' && (
                <div className="grid grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="space-y-2">
                        <Label>Chain ID</Label>
                        <Input 
                            value={newTask.targetChainId || ""} 
                            onChange={(e) => setNewTask({...newTask, targetChainId: e.target.value})} 
                            placeholder="1 (ETH), 137 (Polygon)"
                        />
                    </div>
                    <div className="space-y-2 col-span-2">
                        <Label>Target Contract Address</Label>
                        <Input 
                            value={newTask.targetContractAddress || ""} 
                            onChange={(e) => setNewTask({...newTask, targetContractAddress: e.target.value})} 
                            placeholder="0x..."
                        />
                    </div>
                    <div className="space-y-2 col-span-3">
                        <Label>Action (For Internal Reference)</Label>
                        <Input 
                            value={newTask.action || "swap"} 
                            onChange={(e) => setNewTask({...newTask, action: e.target.value})} 
                            placeholder="swap, stake, deposit"
                        />
                    </div>
                </div>
            )}


            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newTask.required || false}
                  onCheckedChange={(checked) => setNewTask({...newTask, required: checked})}
                />
                <Label>Required Task</Label>
              </div>

              <Button
                onClick={editingTask ? handleUpdateTask : handleAddTask}
                disabled={!newTask.title || !newTask.description || !newTask.url}
              >
                <Plus className="h-4 w-4 mr-2" />
                {editingTask ? "Update Task" : "Add Task to Quest"}
              </Button>
            </div>

            {editingTask && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTask(null)
                  setNewTask(initialNewTaskForm)
                }}
                className="w-full"
              >
                Cancel Edit
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Quest Tasks ({newQuest.tasks.length})</CardTitle>
          <CardDescription>
            List of tasks included in this quest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {newQuest.tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks created yet. Add a task using the panel above.
            </div>
          ) : (
            <div className="space-y-3">
              {newQuest.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getVerificationIcon(task.verificationType)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{task.title}</h3>
                        <Badge className={getCategoryColor(task.category)} variant="secondary">
                          {task.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            {task.verificationType.replace('_', ' ')}
                        </Badge>
                        {task.required && (
                          <Badge variant="default" className="text-xs bg-red-500 hover:bg-red-600">REQUIRED</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          +{task.points} points
                        </span>
                        {(task.targetHandle || task.targetContractAddress) && (
                            <span className="text-xs text-muted-foreground">
                                Target: {task.targetHandle || `${task.targetContractAddress?.slice(0, 6)}...`}
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTask(task)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTask(task.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}