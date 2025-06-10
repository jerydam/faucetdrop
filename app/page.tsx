"use client"

import { FaucetList } from "@/components/faucet-list"
import { NetworkSelector } from "@/components/network-selector"
import { WalletConnect } from "@/components/wallet-connect"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ethers, Contract } from "ethers"
import { useState, useEffect } from "react"
import { appendDivviReferralData, reportTransactionToDivvi } from "../lib/divvi-integration"

// Helper function to safely extract error information
const getErrorInfo = (error: unknown): { code?: string | number; message: string } => {
  if (error && typeof error === "object") {
    const errorObj = error as any
    return {
      code: errorObj.code,
      message: errorObj.message || "Unknown error occurred",
    }
  }
  return {
    message: typeof error === "string" ? error : "Unknown error occurred",
  }
}

// Define network configurations
const NETWORKS = {
  celo: {
    chainId: 42220, // Celo Mainnet
    contractAddress: "0x190266890eF80cb9479F41dC6616107632FAa980",
    name: "Celo",
  },
  lisk: {
    chainId: 1135, // Lisk Mainnet
    contractAddress: "0x0995C06E2fb2d059F3534608176858406f6bE95F",
    name: "Lisk",
  },
}

export default function Home() {
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState("")
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [userAddress, setUserAddress] = useState("")
  const [isAllowedAddress, setIsAllowedAddress] = useState(false)
  const [isDivviSubmitted, setIsDivviSubmitted] = useState(false)
  const [currentNetwork, setCurrentNetwork] = useState<"celo" | "lisk" | null>(null)

  // Define the array of allowed wallet addresses (case-insensitive)
  const allowedAddresses = [
    // "0x961B6b05ad723a7039De5e32586CF19b706870E5",
    // "0x08f4f4b874f6b55d768258c026d1f75a2c6e10a0",
    // "0xB3121eBb78F3CF34b03dfc285C0e2d9343dCF965",
    // "0xf07ea30f4821c60ffa4ce3d2d816b339207e7475",
    // "0xa4D30Cfd6b2Fec50D94AAe9F2311c961CC217d29",
    // "0xD03Cec8c65a5D9875740552b915F007D76e75497",
    // "0x81193c6ba3E69c4c47FFE2e4b3304985D1914d93",
    // "0xE7eDF84cEdE0a3B20E02A3b540312716EBe1A744",
    // "0x317419Db8EB30cEC60Ebf847581be2F02A688c53",
    // "0x739CC47B744c93c827B72bCCc07Fcb91628FFca2",
    // "0x0307daA1F0d3Ac9e1b78707d18E79B13BE6b7178",
    // "0x2A1ABea47881a380396Aa0D150DC6d01F4C8F9cb",
    // "0xF46F1B3Bea9cdd4102105EE9bAefc83db333354B",
    // "0xd59B83De618561c8FF4E98fC29a1b96ABcBFB18a",
    // "0x49B4593d5fbAA8262d22ECDD43826B55F85E0837",
    // "0x3207D4728c32391405C7122E59CCb115A4af31eA",
  ].map((addr) => addr.toLowerCase())

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
  ]

  // Check wallet connection and address on mount and when wallet changes
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (!window.ethereum) {
        setCheckInStatus("Please install MetaMask or a compatible Web3 wallet.")
        console.error("window.ethereum not found")
        return
      }

      try {
        console.log("Checking wallet connection...")
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        console.log("Connected accounts:", accounts)
        if (accounts.length > 0) {
          const signer = await provider.getSigner()
          const address = await signer.getAddress()
          const network = await provider.getNetwork()
          const chainId = Number(network.chainId)
          setUserAddress(address)
          setIsWalletConnected(true)
          setIsAllowedAddress(allowedAddresses.includes(address.toLowerCase()))
          setCurrentNetwork(
            chainId === NETWORKS.celo.chainId
              ? "celo"
              : chainId === NETWORKS.lisk.chainId
              ? "lisk"
              : null
          )
          console.log("Wallet connected:", {
            address,
            isAllowed: allowedAddresses.includes(address.toLowerCase()),
            chainId,
            network: chainId === NETWORKS.celo.chainId ? "Celo" : chainId === NETWORKS.lisk.chainId ? "Lisk" : "Unknown",
          })
        } else {
          setIsWalletConnected(false)
          setUserAddress("")
          setIsAllowedAddress(false)
          setCurrentNetwork(null)
          console.log("No accounts connected")
          connectWallet()
        }
      } catch (error) {
        const { message } = getErrorInfo(error)
        console.error("Error checking wallet connection:", message)
        setCheckInStatus("Failed to connect to wallet. Please try again.")
      }
    }

    checkWalletConnection()

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", checkWalletConnection)
      window.ethereum.on("chainChanged", checkWalletConnection)
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", checkWalletConnection)
        window.ethereum.removeListener("chainChanged", checkWalletConnection)
      }
    }
  }, [])

  // Auto-trigger check-in when wallet is connected, address is allowed, and Divvi submission is successful
  useEffect(() => {
    if (isWalletConnected && isAllowedAddress && isDivviSubmitted && !isCheckingIn && currentNetwork) {
      console.log("Conditions met, triggering auto check-in after Divvi submission...")
      handleCheckIn()
    }
  }, [isWalletConnected, isAllowedAddress, isDivviSubmitted, currentNetwork])

  const connectWallet = async () => {
    if (!window.ethereum) {
      setCheckInStatus("Please install MetaMask or a compatible Web3 wallet.")
      return
    }

    try {
      console.log("Requesting wallet connection...")
      setCheckInStatus("Please confirm the wallet connection in the popup.")
      await window.ethereum.request({ method: "eth_requestAccounts" })
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)
      setUserAddress(address)
      setIsWalletConnected(true)
      setIsAllowedAddress(allowedAddresses.includes(address.toLowerCase()))
      setCurrentNetwork(
        chainId === NETWORKS.celo.chainId
          ? "celo"
          : chainId === NETWORKS.lisk.chainId
          ? "lisk"
          : null
      )
      console.log("Wallet connected:", {
        address,
        isAllowed: allowedAddresses.includes(address.toLowerCase()),
        chainId,
        network: chainId === NETWORKS.celo.chainId ? "Celo" : chainId === NETWORKS.lisk.chainId ? "Lisk" : "Unknown",
      })
      setCheckInStatus("Wallet connected successfully!")
    } catch (error) {
      const { code, message } = getErrorInfo(error)
      console.error("Wallet connection failed:", { code, message, fullError: error })
      setCheckInStatus(
        code === 4001 ? "Wallet connection rejected by user." : "Failed to connect wallet. Please try again.",
      )
    }
  }

  const handleCheckIn = async () => {
    if (!window.ethereum) {
      setCheckInStatus("Please install MetaMask or a compatible Web3 wallet.")
      return
    }

    if (!isWalletConnected) {
      setCheckInStatus("Please connect your wallet.")
      await connectWallet()
      return
    }

    if (!isAllowedAddress) {
      setCheckInStatus("Your wallet address is not authorized to perform this action.")
      return
    }

    if (!currentNetwork) {
      setCheckInStatus("Please switch to either the Celo or Lisk network.")
      return
    }

    setIsCheckingIn(true)
    setCheckInStatus("")

    try {
      console.log("Starting check-in process...")
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      console.log("Signer:", signer)
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)
      console.log("Network chainId:", chainId)

      // Ensure the wallet is on the correct network (Celo or Lisk)
      const expectedChainId = NETWORKS[currentNetwork].chainId
      if (chainId !== expectedChainId) {
        console.log("Network mismatch, attempting to switch...")
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
          })
        } catch (switchError) {
          const { message } = getErrorInfo(switchError)
          console.error("Network switch failed:", message)
          setCheckInStatus(`Please switch to the ${NETWORKS[currentNetwork].name} network.`)
          setIsCheckingIn(false)
          return
        }
      }

      const contract = new Contract(NETWORKS[currentNetwork].contractAddress, contractABI, signer)
      console.log("Contract instance created:", NETWORKS[currentNetwork].contractAddress)

      let tx
      if (currentNetwork === "celo" || currentNetwork === "lisk") {
        console.log(`Appending Divvi referral data for ${NETWORKS[currentNetwork].name} transaction`)
        const data = contract.interface.encodeFunctionData("checkIn")
        const dataWithReferral = appendDivviReferralData(data)
        tx = await signer.sendTransaction({
          to: NETWORKS[currentNetwork].contractAddress,
          data: dataWithReferral,
        })
        console.log(`${NETWORKS[currentNetwork].name} transaction sent:`, tx.hash)
      } else {
        tx = await contract.checkIn()
        console.log("Transaction sent:", tx.hash)
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      console.log("Transaction confirmed:", receipt.transactionHash)
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })
      const balanceWei = await provider.getBalance(userAddress)
      const balanceEther = ethers.formatEther(balanceWei)

      setCheckInStatus(
        `Successfully added to Drop List on ${NETWORKS[currentNetwork].name}. ${timestamp}! Balance: ${Number.parseFloat(balanceEther).toFixed(4)} ${currentNetwork === "celo" ? "CELO" : "LSK"}`,
      )

      if (currentNetwork === "celo" || currentNetwork === "lisk") {
        const txHash = tx.hash
        console.log("Attempting to report transaction to Divvi:", {
          txHash,
          chainId,
          timestamp,
          userAddress,
          balance: `${balanceEther} ${currentNetwork === "celo" ? "CELO" : "LSK"}`,
        })
        try {
          await reportTransactionToDivvi(txHash, chainId)
          console.log("Divvi reporting successful")
          setIsDivviSubmitted(true)
        } catch (divviError) {
          const { message } = getErrorInfo(divviError)
          console.error("Divvi reporting failed, but check-in completed:", message)
          setCheckInStatus(
            `Checked in on ${NETWORKS[currentNetwork].name} at ${timestamp} with balance ${Number.parseFloat(balanceEther).toFixed(4)} ${currentNetwork === "celo" ? "CELO" : "LSK"}, but failed to report to Divvi. Please contact support.`,
          )
          console.log("Continuing with auto-trigger despite Divvi error")
        }
      } else {
        setIsDivviSubmitted(true)
      }

      setTimeout(() => setIsDivviSubmitted(false), 1000)
    } catch (error) {
      const { code, message } = getErrorInfo(error)
      console.error("Check-in failed:", { code, message, fullError: error })

      let statusMessage = "Check-in failed: Please try again."
      if (code === "INSUFFICIENT_FUNDS") {
        statusMessage = "Check-in failed: Insufficient funds in your wallet."
      } else if (code === 4001) {
        statusMessage = "Check-in failed: Transaction rejected by user."
      } else if (message) {
        statusMessage = `Check-in failed: ${message}`
      }

      setCheckInStatus(statusMessage)

      if (code !== 4001) {
        console.log("Non-user-rejection error, keeping auto-trigger active")
      } else {
        setIsDivviSubmitted(false)
      }
    } finally {
      setIsCheckingIn(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
          {/* Header Section */}
          <header className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
              {/* Logo and Title */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Image
                    src="/logo.png"
                    alt="FaucetDrops Logo"
                    width={28}
                    height={28}
                    className="sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-md"
                  />
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100">
                    FaucetDrops
                  </h1>
                </div>
                <div className="ml-auto sm:ml-0">
                  <NetworkSelector />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <Link href="/batch-claim" className="flex-1 xs:flex-none">
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden xs:inline">Batch Claim</span>
                      <span className="xs:hidden">Batch</span>
                    </Button>
                  </Link>
                  
                  <Link href="/create" className="flex-1 xs:flex-none">
                    <Button className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 transition-colors">
                      <Plus className="h-4 w-4" />
                      <span className="hidden xs:inline">Create Faucet</span>
                      <span className="xs:hidden">Create</span>
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="flex-1 xs:flex-none">
                    <WalletConnect />
                  </div>
                  
                  {isWalletConnected && isAllowedAddress && (
                    <Button
                      onClick={handleCheckIn}
                      disabled={isCheckingIn}
                      className="w-full xs:w-auto flex items-center justify-center gap-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isCheckingIn ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Dropping...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                          <span>Drop List</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Status Message */}
          {checkInStatus && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 break-words leading-relaxed">
                  {checkInStatus}
                </p>
              </div>
            </div>
          )}

          {/* User Info Card (for mobile) */}
          {isWalletConnected && (
            <div className="lg:hidden bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Wallet</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isAllowedAddress 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {isAllowedAddress ? 'Authorized' : 'Not Authorized'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono break-all">
                  {userAddress}
                </p>
                {currentNetwork && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Network</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full capitalize">
                      {currentNetwork}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
           <AnalyticsDashboard />
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <FaucetList />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}