"use client"

import React, { createContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { useToast } from "@/hooks/use-toast"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  ensureCorrectNetwork: (requiredChainId: number) => Promise<boolean>
  connectedWalletName: string | null
}

export const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  ensureCorrectNetwork: async () => false,
  connectedWalletName: null,
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectedWalletName, setConnectedWalletName] = useState<string | null>(null)
  const { network, switchNetwork } = useNetwork()
  const { toast } = useToast()

  // Detect wallet name from provider
  const detectWalletName = (ethereum: any): string => {
    if (ethereum.isMetaMask) return "MetaMask"
    if (ethereum.isTrust) return "Trust Wallet"
    if (ethereum.isCoinbaseWallet) return "Coinbase Wallet"
    if (ethereum.isRabby) return "Rabby"
    if (ethereum.isTokenPocket) return "TokenPocket"
    if (ethereum.isImToken) return "imToken"
    if (ethereum.isMathWallet) return "MathWallet"
    if (ethereum.isBitKeep) return "BitKeep"
    if (ethereum.isOkxWallet) return "OKX Wallet"
    if (ethereum.isBinance) return "Binance Wallet"
    return "Unknown Wallet"
  }

  useEffect(() => {
    const initializeWallet = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum)
          setProvider(provider)

          // Check if already connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            await handleAccountsChanged(accounts)
          }

          // Set up event listeners
          window.ethereum.on("accountsChanged", handleAccountsChanged)
          window.ethereum.on("chainChanged", handleChainChanged)

          // Get initial chain ID
          const network = await provider.getNetwork()
          setChainId(Number(network.chainId))

          // Detect wallet name
          const walletName = detectWalletName(window.ethereum)
          setConnectedWalletName(walletName)

        } catch (error) {
          console.error("Error initializing wallet:", error)
        }
      }
    }

    initializeWallet()

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [])

  const handleAccountsChanged = async (accounts: any) => {
    if (accounts.length === 0) {
      // Disconnected
      setSigner(null)
      setAddress(null)
      setIsConnected(false)
      setConnectedWalletName(null)
      console.log("Wallet disconnected")
    } else {
      // Connected or changed account
      try {
        if (provider) {
          const signer = await provider.getSigner()
          setSigner(signer)
          const address = await signer.getAddress()
          setAddress(address)
          setIsConnected(true)
          console.log("Wallet connected:", address)
        }
      } catch (error) {
        console.error("Error getting signer:", error)
        setSigner(null)
        setAddress(null)
        setIsConnected(false)
      }
    }
  }

  const handleChainChanged = async (chainIdHex: string) => {
    try {
      const newChainId = Number.parseInt(chainIdHex, 16)
      console.log(`Chain changed to: ${newChainId}`)
      setChainId(newChainId)
      
      // Refresh provider and signer for new chain
      if (window.ethereum && isConnected) {
        const provider = new BrowserProvider(window.ethereum)
        setProvider(provider)
        
        try {
          const signer = await provider.getSigner()
          setSigner(signer)
        } catch (error) {
          console.error("Error getting signer after chain change:", error)
        }
      }
    } catch (error) {
      console.error("Error handling chain change:", error)
    }
  }

  const connect = async () => {
    if (isConnecting) {
      console.log("Connection already in progress, skipping")
      return
    }

    if (!window.ethereum) {
      toast({
        title: "No Wallet Found",
        description: "Please install a crypto wallet like MetaMask to connect",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)

    try {
      // Initialize provider if not already done
      if (!provider) {
        const newProvider = new BrowserProvider(window.ethereum)
        setProvider(newProvider)
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      })
      
      if (accounts.length > 0) {
        await handleAccountsChanged(accounts)
        
        // Get network info
        if (provider) {
          const network = await provider.getNetwork()
          setChainId(Number(network.chainId))
        }

        // Detect and set wallet name
        const walletName = detectWalletName(window.ethereum)
        setConnectedWalletName(walletName)

        toast({
          title: "Wallet Connected",
          description: `Successfully connected ${walletName}`,
        })
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      if (error.code === 4001) {
        // User rejected the request
        toast({
          title: "Connection Cancelled",
          description: "Wallet connection was cancelled by user",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Connection Failed",
          description: `Failed to connect wallet: ${error.message}`,
          variant: "destructive",
        })
      }
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setSigner(null)
    setAddress(null)
    setIsConnected(false)
    setConnectedWalletName(null)
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    })
    
    console.log("Wallet disconnected")
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    if (!isConnected) {
      try {
        await connect()
      } catch (error) {
        return false
      }
    }

    if (chainId !== requiredChainId) {
      console.log(`Network mismatch: current=${chainId}, required=${requiredChainId}`)
      try {
        await switchNetwork(requiredChainId)
        return true
      } catch (error) {
        console.error("Failed to switch network:", error)
        return false
      }
    }

    return true
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        chainId,
        isConnected,
        connect,
        disconnect,
        ensureCorrectNetwork,
        connectedWalletName,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = React.useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}