"use client";

import { FaucetList } from "@/components/faucet-list";
import { NetworkSelector } from "@/components/network-selector";
import { WalletConnect } from "@/components/wallet-connect";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ethers, Contract } from "ethers";
import { useState, useEffect } from "react";
import { appendDivviReferralData, reportTransactionToDivvi, isCeloNetwork } from "../lib/divvi-integration";

// Helper function to safely extract error information
const getErrorInfo = (error: unknown): { code?: string | number; message: string } => {
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    return {
      code: errorObj.code,
      message: errorObj.message || 'Unknown error occurred'
    };
  }
  return {
    message: typeof error === 'string' ? error : 'Unknown error occurred'
  };
};

export default function Home() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [isAllowedAddress, setIsAllowedAddress] = useState(false);
  const [isDivviSubmitted, setIsDivviSubmitted] = useState(false);

  // Define the array of allowed wallet addresses (case-insensitive)
  const allowedAddresses = [
    "0x961B6b05ad723a7039De5e32586CF19b706870E5",
    "0xa4D30Cfd6b2Fec50D94AAe9F2311c961CC217d29",
    "0xD03Cec8c65a5D9875740552b915F007D76e75497",
    "0x81193c6ba3E69c4c47FFE2e4b3304985D1914d93",
    "0xE7eDF84cEdE0a3B20E02A3b540312716EBe1A744",
    "0x317419Db8EB30cEC60Ebf847581be2F02A688c53",
    "0x739CC47B744c93c827B72bCCc07Fcb91628FFca2",
    "0x0307daA1F0d3Ac9e1b78707d18E79B13BE6b7178",
    "0x2A1ABea47881a380396Aa0D150DC6d01F4C8F9cb",
    "0xF46F1B3Bea9cdd4102105EE9bAefc83db333354B",
    "0xd59B83De618561c8FF4E98fC29a1b96ABcBFB18a",
    "0x49B4593d5fbAA8262d22ECDD43826B55F85E0837",
    "0x3207D4728c32391405C7122E59CCb115A4af31eA",
  ].map((addr) => addr.toLowerCase());

  const contractAddress = "0xDD74823C1D3eA2aC423A9c4eb77f710472bdC700";
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

  // Check wallet connection and address on mount and when wallet changes
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (!window.ethereum) {
        setCheckInStatus("Please install MetaMask or a compatible Web3 wallet.");
        console.error("window.ethereum not found");
        return;
      }

      try {
        console.log("Checking wallet connection...");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        console.log("Connected accounts:", accounts);
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setUserAddress(address);
          setIsWalletConnected(true);
          setIsAllowedAddress(allowedAddresses.includes(address.toLowerCase()));
          console.log("Wallet connected:", { address, isAllowed: allowedAddresses.includes(address.toLowerCase()) });
        } else {
          setIsWalletConnected(false);
          setUserAddress("");
          setIsAllowedAddress(false);
          console.log("No accounts connected");
          // Automatically attempt to connect wallet if not connected
          connectWallet();
        }
      } catch (error) {
        const { message } = getErrorInfo(error);
        console.error("Error checking wallet connection:", message);
        setCheckInStatus("Failed to connect to wallet. Please try again.");
      }
    };

    checkWalletConnection();

    // Listen for account or network changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", checkWalletConnection);
      window.ethereum.on("chainChanged", () => {
        console.log("Network changed");
        checkWalletConnection();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", checkWalletConnection);
        window.ethereum.removeListener("chainChanged", checkWalletConnection);
      }
    };
  }, []);

  // Auto-trigger check-in when wallet is connected, address is allowed, and Divvi submission is successful
  useEffect(() => {
    if (isWalletConnected && isAllowedAddress && isDivviSubmitted && !isCheckingIn) {
      console.log("Conditions met, triggering auto check-in after Divvi submission...");
      handleCheckIn();
    }
  }, [isWalletConnected, isAllowedAddress, isDivviSubmitted]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setCheckInStatus("Please install MetaMask or a compatible Web3 wallet.");
      return;
    }

    try {
      console.log("Requesting wallet connection...");
      setCheckInStatus("Please confirm the wallet connection in the popup.");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setUserAddress(address);
      setIsWalletConnected(true);
      setIsAllowedAddress(allowedAddresses.includes(address.toLowerCase()));
      console.log("Wallet connected:", { address, isAllowed: allowedAddresses.includes(address.toLowerCase()) });
      setCheckInStatus("Wallet connected successfully!");
    } catch (error) {
      const { code, message } = getErrorInfo(error);
      console.error("Wallet connection failed:", { code, message, fullError: error });
      setCheckInStatus(
        code === 4001
          ? "Wallet connection rejected by user."
          : "Failed to connect wallet. Please try again."
      );
    }
  };

  const handleCheckIn = async () => {
    if (!window.ethereum) {
      setCheckInStatus("Please install MetaMask or a compatible Web3 wallet.");
      return;
    }

    if (!isWalletConnected) {
      setCheckInStatus("Please connect your wallet.");
      await connectWallet(); // Prompt wallet connection
      return;
    }

    if (!isAllowedAddress) {
      setCheckInStatus("Your wallet address is not authorized to perform this action.");
      return;
    }

    setIsCheckingIn(true);
    setCheckInStatus("");

    try {
      console.log("Starting check-in process...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      console.log("Signer:", signer);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      console.log("Network chainId:", chainId);
      const isCelo = isCeloNetwork(chainId);

      // Ensure the wallet is on the correct network (e.g., Celo)
      const expectedChainId = isCelo ? 42220 : 1; // Adjust as needed
      if (chainId !== expectedChainId) {
        console.log("Network mismatch, attempting to switch...");
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
          });
        } catch (switchError) {
          const { message } = getErrorInfo(switchError);
          console.error("Network switch failed:", message);
          setCheckInStatus(`Please switch to the ${isCelo ? "Celo" : "Ethereum"} network.`);
          setIsCheckingIn(false);
          return;
        }
      }

      const contract = new Contract(contractAddress, contractABI, signer);
      console.log("Contract instance created:", contractAddress);

      let tx;
      if (isCelo) {
        console.log("Appending Divvi referral data for Celo transaction");
        const data = contract.interface.encodeFunctionData("checkIn");
        const dataWithReferral = appendDivviReferralData(data);
        tx = await signer.sendTransaction({
          to: contractAddress,
          data: dataWithReferral,
        });
        console.log("Celo transaction sent:", tx.hash);
      } else {
        tx = await contract.checkIn();
        console.log("Transaction sent:", tx.hash);
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt.transactionHash);
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });
      const balanceWei = await provider.getBalance(userAddress);
      const balanceEther = ethers.formatEther(balanceWei);

      setCheckInStatus(
        `Successfully added to Drop List. ${timestamp}! Balance: ${parseFloat(balanceEther).toFixed(4)} CELO`
      );

      if (isCelo) {
        const txHash = tx.hash;
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
          setIsDivviSubmitted(true); // Set Divvi submission success
        } catch (divviError) {
          const { message } = getErrorInfo(divviError);
          console.error("Divvi reporting failed, but check-in completed:", message);
          setCheckInStatus(
            `Checked in at ${timestamp} with balance ${parseFloat(balanceEther).toFixed(4)} CELO, but failed to report to Divvi. Please contact support.`
          );
          // Don't reset isDivviSubmitted here - let the auto-trigger continue working
          console.log("Continuing with auto-trigger despite Divvi error");
        }
      } else {
        setIsDivviSubmitted(true); // For non-Celo, assume success to allow auto-trigger
      }

      // Reset Divvi submission state after successful check-in to allow future auto-triggers
      setTimeout(() => setIsDivviSubmitted(false), 1000);
    } catch (error) {
      const { code, message } = getErrorInfo(error);
      console.error("Check-in failed:", { code, message, fullError: error });
      
      let statusMessage = "Check-in failed: Please try again.";
      if (code === "INSUFFICIENT_FUNDS") {
        statusMessage = "Check-in failed: Insufficient funds in your wallet.";
      } else if (code === 4001) {
        statusMessage = "Check-in failed: Transaction rejected by user.";
      } else if (message) {
        statusMessage = `Check-in failed: ${message}`;
      }
      
      setCheckInStatus(statusMessage);
      
      // Keep auto-trigger working - only reset isDivviSubmitted if it's a user rejection
      if (code !== 4001) {
        console.log("Non-user-rejection error, keeping auto-trigger active");
        // Don't reset isDivviSubmitted to keep auto-trigger working
      } else {
        setIsDivviSubmitted(false); // Reset only on user rejection
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:gap-8">
          <header className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={32}
                  height={32}
                  className="inline-block mr-2 sm:w-10 sm:h-10"
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
              {isWalletConnected && isAllowedAddress && (
                <Button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                  className="w-full sm:w-auto flex items-center gap-2 text-sm sm:text-base"
                >
                  {isCheckingIn ? "Dropping..." : "Drop List"}
                </Button>
              )}
            </div>
          </header>
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