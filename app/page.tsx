"use client";

import { FaucetList } from "@/components/faucet-list";
import { NetworkSelector } from "@/components/network-selector";
import { WalletConnect } from "@/components/wallet-connect";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ethers, Contract } from "ethers";
import { useState } from "react";
import { appendDivviReferralData, reportTransactionToDivvi, isCeloNetwork } from "../lib/divvi-integration";

export default function Home() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState("");

  const contractAddress = "0xb7785eFfD86F90260378d8b7b5a8b4CC6cbe8435";
  const contractABI = [
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: "address", name: "user", type: "address" },
        { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
      ],
      name: "CheckedIn",
      type: "event",
    },
    {
      inputs: [],
      name: "checkIn",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  const handleCheckIn = async () => {
    if (!window.ethereum) {
      setCheckInStatus("Please install MetaMask");
      return;
    }

    setIsCheckingIn(true);
    setCheckInStatus("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const contract = new Contract(contractAddress, contractABI, signer);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const isCelo = isCeloNetwork(chainId);

      let tx;
      if (isCelo) {
        console.log("Appending Divvi referral data for Celo transaction");
        const data = contract.interface.encodeFunctionData("checkIn");
        const dataWithReferral = appendDivviReferralData(data);
        tx = await signer.sendTransaction({
          to: contractAddress,
          data: dataWithReferral,
        });
      } else {
        tx = await contract.checkIn();
      }

      const receipt = await tx.wait();
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });
      const balanceWei = await provider.getBalance(userAddress);
      const balanceEther = ethers.formatEther(balanceWei);

      setCheckInStatus(
        `Successfully checked in at ${timestamp}! Balance: ${parseFloat(balanceEther).toFixed(4)} CELO`
      );

      if (isCelo) {
        const txHash: `0x${string}` = tx.hash;
        console.log("Attempting to report transaction to Divvi:", {
          txHash,
          chainId,
          timestamp,
          userAddress,
          balance: `${balanceEther} CELO`,
        });
        try {
          await reportTransactionToDivvi(txHash, chainId);
          console.log("Divvi reporting successful");
        } catch (divviError) {
          console.error("Divvi reporting failed, but check-in completed:", divviError);
          setCheckInStatus(
            `Checked in at ${timestamp} with balance ${parseFloat(balanceEther).toFixed(4)} CELO, but failed to report to Divvi. Please contact support.`
          );
        }
      }
    } catch (error: any) {
      console.error("Check-in failed:", error);
      setCheckInStatus(`Check-in failed: ${error.message || "Please try again."}`);
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:gap-8">
          {/* Header: Adjusted for better mobile stacking and spacing */}
          <header className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={32} // Reduced size for mobile
                  height={32}
                  className="inline-block mr-2 sm:w-10 sm:h-10" // Scales up on larger screens
                />
                FaucetDrops
              </h1>
              <div className="ml-auto sm:ml-0">
                <NetworkSelector />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Link href="/batch-claim" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2 text-sm sm:text-base">
                  <Users className="h-4 w-4" />
                  Batch Claim
                </Button>
              </Link>
              <Link href="/create" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto flex items-center gap-2 text-sm sm:text-base">
                  <Plus className="h-4 w-4" />
                  Create Faucet
                </Button>
              </Link>
              <WalletConnect />
              <Button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="w-full sm:w-auto flex items-center gap-2 text-sm sm:text-base"
              >
                {isCheckingIn ? "Testing..." : "Test"}
              </Button>
            </div>
          </header>
          {/* Check-In Status: Added max-width and word-break for better mobile display */}
          {checkInStatus && (
            <div className="text-center text-xs sm:text-sm text-gray-600 max-w-full break-words px-2">
              {checkInStatus}
            </div>
          )}
          <FaucetList />
        </div>
      </div>
    </main>
  );
}