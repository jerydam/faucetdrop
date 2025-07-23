"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, Trophy, Medal, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { JsonRpcProvider, Contract, isAddress, formatUnits } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { getAllClaimsForAllNetworks } from "@/lib/faucet"

// Factory ABI for fetching factory claims
const FACTORY_ABI = [
  {
    "inputs": [],
    "name": "getAllTransactions",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "faucetAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "transactionType",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "initiator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isEther",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct TransactionLibrary.Transaction[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Function to get all claims from factories
async function getAllClaimsFromAllFactories(networks: any[]): Promise<{
  faucetAddress: string
  transactionType: string
  initiator: string
  amount: bigint
  isEther: boolean
  timestamp: number
  networkName: string
  chainId: number
}[]> {
  const allClaims: any[] = [];

  for (const network of networks) {
    try {
      console.log(`Fetching claims from factories on ${network.name}...`);
      
      const provider = new JsonRpcProvider(network.rpcUrl);
      const { transactions } = await getAllClaimsFromFactories(provider, network);
      
      const networkClaims = transactions.map(claim => ({
        ...claim,
        networkName: network.name,
        chainId: network.chainId
      }));
      
      allClaims.push(...networkClaims);
      console.log(`Added ${networkClaims.length} claims from ${network.name}`);
    } catch (error) {
      console.error(`Error fetching claims from ${network.name}:`, error);
    }
  }

  allClaims.sort((a, b) => b.timestamp - a.timestamp);
  return allClaims;
}

// Helper function to get claims from factories for a single network
async function getAllClaimsFromFactories(
  provider: JsonRpcProvider,
  network: any,
): Promise<{
  transactions: {
    faucetAddress: string
    transactionType: string
    initiator: string
    amount: bigint
    isEther: boolean
    timestamp: number
  }[]
  totalClaims: number
  claimsByFaucet: Record<string, number>
}> {
  try {
    let allClaims: any[] = [];

    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
        continue;
      }

      const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider);

      const code = await provider.getCode(factoryAddress);
      if (code === "0x") {
        console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`);
        continue;
      }

      try {
        console.log(`Fetching transactions from factory ${factoryAddress}...`);
        const allTransactions = await factoryContract.getAllTransactions();
        
        const claimTransactions = allTransactions.filter((tx: any) => 
          tx.transactionType.toLowerCase().includes('claim')
        );
        
        console.log(`Found ${claimTransactions.length} claim transactions from factory ${factoryAddress}`);
        allClaims.push(...claimTransactions);
      } catch (error) {
        console.warn(`Error fetching transactions from factory ${factoryAddress}:`, error);
      }
    }

    const mappedClaims = allClaims.map((tx: any) => ({
      faucetAddress: tx.faucetAddress as string,
      transactionType: tx.transactionType as string,
      initiator: tx.initiator as string,
      amount: BigInt(tx.amount),
      isEther: tx.isEther as boolean,
      timestamp: Number(tx.timestamp),
    }));

    const claimsByFaucet: Record<string, number> = {};
    mappedClaims.forEach(claim => {
      const faucetAddress = claim.faucetAddress.toLowerCase();
      claimsByFaucet[faucetAddress] = (claimsByFaucet[faucetAddress] || 0) + 1;
    });

    const result = {
      transactions: mappedClaims,
      totalClaims: mappedClaims.length,
      claimsByFaucet
    };

    console.log(`Total claims fetched from ${network.name} factories: ${result.totalClaims}`);
    return result;
  } catch (error: any) {
    console.error(`Error fetching claims from factories on ${network.name}:`, error);
    throw new Error(error.message || "Failed to fetch claims from factories");
  }
}

interface ClaimData {
  name: string
  value: number
  color: string
  faucetAddress: string
}

interface FaucetLeaderboard {
  rank: number
  faucetAddress: string
  claims: number
  network: string
  percentage: number
  totalAmount: string
}

export function UserClaimsChart() {
  const { networks } = useNetwork()
  const [data, setData] = useState<ClaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFaucet, setSelectedFaucet] = useState<string>("all")
  const [availableFaucets, setAvailableFaucets] = useState<string[]>([])
  const [totalClaims, setTotalClaims] = useState(0)
  const [uniqueUsers, setUniqueUsers] = useState(0)
  const [leaderboard, setLeaderboard] = useState<FaucetLeaderboard[]>([])

  // Define colors for the pie chart
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#a4de6c", "#d0ed57", "#83a6ed", "#8dd1e1", "#a4de6c", "#d0ed57"]

  const fetchData = async () => {
    setLoading(true)
    try {
      console.log("Fetching claims from both storage and factory sources...");
      
      // Fetch claims from storage (existing method)
      const storageClaims = await getAllClaimsForAllNetworks(networks);
      console.log("Fetched storage claims:", storageClaims.length);
      
      // Fetch claims from factories (new method)
      const factoryClaims = await getAllClaimsFromAllFactories(networks);
      console.log("Fetched factory claims:", factoryClaims.length);

      // Convert all claims to unified format
      const allClaimsUnified = [
        // Storage claims
        ...storageClaims.map(claim => ({
          claimer: claim.claimer,
          faucet: claim.faucet,
          amount: claim.amount,
          networkName: claim.networkName,
          chainId: typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId,
          tokenSymbol: claim.tokenSymbol,
          tokenDecimals: claim.tokenDecimals,
          isEther: claim.isEther,
          timestamp: claim.timestamp
        })),
        // Factory claims
        ...factoryClaims.map(claim => ({
          claimer: claim.initiator,
          faucet: claim.faucetAddress,
          amount: claim.amount,
          networkName: claim.networkName,
          chainId: claim.chainId,
          tokenSymbol: claim.isEther ? 'ETH' : 'TOKEN',
          tokenDecimals: claim.isEther ? 18 : 18,
          isEther: claim.isEther,
          timestamp: claim.timestamp
        }))
      ];

      console.log(`Total unified claims: ${allClaimsUnified.length}`);

      const claimsByFaucet: { [key: string]: { 
        claims: number, 
        network: string, 
        totalAmount: bigint,
        tokenSymbol: string,
        tokenDecimals: number 
      } } = {};
      const faucetSet = new Set<string>();
      const uniqueClaimers = new Set<string>();
      let totalClaimsCount = allClaimsUnified.length;

      // Process all unified claims
      for (const claim of allClaimsUnified) {
        // Add to unique claimers
        uniqueClaimers.add(claim.claimer.toLowerCase());
        
        // Group by faucet with network info
        const faucetKey = claim.faucet.toLowerCase();
        faucetSet.add(faucetKey);
        
        if (!claimsByFaucet[faucetKey]) {
          claimsByFaucet[faucetKey] = { 
            claims: 0, 
            network: claim.networkName,
            totalAmount: BigInt(0),
            tokenSymbol: claim.tokenSymbol,
            tokenDecimals: claim.tokenDecimals
          };
        }
        claimsByFaucet[faucetKey].claims += 1;
        claimsByFaucet[faucetKey].totalAmount += claim.amount;
      }

      setTotalClaims(totalClaimsCount);
      setUniqueUsers(uniqueClaimers.size);
      setAvailableFaucets(Array.from(faucetSet));

      // Create leaderboard data - show ALL faucets
      const leaderboardData: FaucetLeaderboard[] = Object.entries(claimsByFaucet)
        .sort(([, a], [, b]) => b.claims - a.claims)
        .map(([faucet, data], index) => ({
          rank: index + 1,
          faucetAddress: faucet,
          claims: data.claims,
          network: data.network,
          percentage: (data.claims / totalClaimsCount) * 100,
          totalAmount: `${Number(formatUnits(data.totalAmount, data.tokenDecimals)).toFixed(4)} ${data.tokenSymbol}`
        }));

      setLeaderboard(leaderboardData);

      // Convert to chart data format
      const chartData: ClaimData[] = [];

      if (selectedFaucet === "all") {
        // Show top 10 faucets by claims
        const sortedFaucets = Object.entries(claimsByFaucet)
          .sort(([, a], [, b]) => b.claims - a.claims)
          .slice(0, 10);

        sortedFaucets.forEach(([faucet, data], index) => {
          chartData.push({
            name: `Faucet ${index + 1}`, // Generic name instead of address
            value: data.claims,
            color: COLORS[index % COLORS.length],
            faucetAddress: faucet
          });
        });
      } else {
        // Show specific faucet
        const faucetData = claimsByFaucet[selectedFaucet.toLowerCase()];
        if (faucetData) {
          chartData.push({
            name: "Selected Faucet",
            value: faucetData.claims,
            color: COLORS[0],
            faucetAddress: selectedFaucet
          });
        }
      }

      console.log("Claims chart data:", chartData);
      console.log("Total claims:", totalClaimsCount);
      console.log("Unique users:", uniqueClaimers.size);
      console.log("Leaderboard:", leaderboardData);
      setData(chartData);
    } catch (error) {
      console.error("Error fetching claim data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (networks.length > 0) {
      fetchData();
    }
  }, [selectedFaucet, networks]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
    }
  }

  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'celo':
        return 'bg-green-100 text-green-800'
      case 'arbitrum':
        return 'bg-blue-100 text-blue-800'
      case 'base':
        return 'bg-blue-100 text-blue-800'
      case 'polygon':
        return 'bg-purple-100 text-purple-800'
      case 'ethereum':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Custom tooltip to show faucet address
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Address: {data.faucetAddress.slice(0, 6)}...{data.faucetAddress.slice(-4)}
          </p>
          <p className="text-sm">
            Claims: <span className="font-medium">{data.value.toLocaleString()}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalClaims.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Claims</p>
          </div>
          
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedFaucet} onValueChange={setSelectedFaucet}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select faucet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Faucets (Top 10)</SelectItem>
              {availableFaucets.map((faucet) => (
                <SelectItem key={faucet} value={faucet}>
                  {`${faucet.slice(0, 6)}...${faucet.slice(-4)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Claims Distribution</CardTitle>
            <CardDescription>
              {selectedFaucet === "all" ? "Top 10 faucets by claims" : "Selected faucet claims"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No claim data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle>Faucet Leaderboard</CardTitle>
            <CardDescription>
              All faucets across networks ({leaderboard.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Faucet</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead className="text-right">Claims</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((item) => (
                    <TableRow key={item.faucetAddress}>
                      <TableCell className="font-medium">
                        <div className="flex items-center justify-center">
                          {getRankIcon(item.rank)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.faucetAddress.slice(0, 6)}...{item.faucetAddress.slice(-4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getNetworkColor(item.network)}>
                          {item.network}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.claims.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {item.totalAmount}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.percentage.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}