"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { ethers } from "ethers"
import { SUPPORTED_NETWORKS } from "@/lib/constants"

type Web3ContextType = {
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  address: string
  chainId: number
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: (chainId: number) => Promise<void>
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  address: "",
  chainId: 0,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => {},
})

interface EthereumWindow extends Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>
    on: (event: string, callback: (...args: any[]) => void) => void
    removeListener: (event: string, callback: (...args: any[]) => void) => void
  }
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [address, setAddress] = useState<string>("")
  const [chainId, setChainId] = useState<number>(0)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  // Initialize provider from window.ethereum if available
  useEffect(() => {
    const initProvider = async () => {
      if (typeof window !== "undefined" && (window as EthereumWindow).ethereum) {
        try {
          // Create ethers provider
          const ethersProvider = new ethers.BrowserProvider((window as EthereumWindow).ethereum!)
          setProvider(ethersProvider)

          // Get network
          const network = await ethersProvider.getNetwork()
          setChainId(Number(network.chainId))

          // Check if already connected
          const accounts = await ethersProvider.listAccounts()
          if (accounts.length > 0) {
            const ethSigner = await ethersProvider.getSigner()
            setAddress(await ethSigner.getAddress())
            setSigner(ethSigner)
            setIsConnected(true)
          }
        } catch (error) {
          console.error("Error initializing web3:", error)
        }
      }
    }

    initProvider()
  }, [])

  // Setup event listeners
  useEffect(() => {
    if (typeof window !== "undefined" && (window as EthereumWindow).ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setAddress("")
          setSigner(null)
          setIsConnected(false)
        } else if (accounts[0] !== address.toLowerCase()) {
          // Account changed
          if (provider) {
            const ethSigner = await provider.getSigner()
            setAddress(await ethSigner.getAddress())
            setSigner(ethSigner)
            setIsConnected(true)
          }
        }
      }

      const handleChainChanged = (chainIdHex: string) => {
        // Chain changed, reload the page as recommended by MetaMask
        window.location.reload()
      }
      ;(window as EthereumWindow).ethereum!.on("accountsChanged", handleAccountsChanged)
      ;(window as EthereumWindow).ethereum!.on("chainChanged", handleChainChanged)

      return () => {
        ;(window as EthereumWindow).ethereum!.removeListener("accountsChanged", handleAccountsChanged)
        ;(window as EthereumWindow).ethereum!.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [provider, address])

  // Connect wallet
  const connect = async () => {
    if (typeof window !== "undefined" && (window as EthereumWindow).ethereum) {
      setIsConnecting(true)
      try {
        // Request accounts
        await (window as EthereumWindow).ethereum!.request({ method: "eth_requestAccounts" })

        // Create provider and signer
        const ethersProvider = new ethers.BrowserProvider((window as EthereumWindow).ethereum!)
        setProvider(ethersProvider)

        // Get network
        const network = await ethersProvider.getNetwork()
        setChainId(Number(network.chainId))

        // Get signer and address
        const ethSigner = await ethersProvider.getSigner()
        setAddress(await ethSigner.getAddress())
        setSigner(ethSigner)
        setIsConnected(true)
      } catch (error) {
        console.error("Error connecting wallet:", error)
      } finally {
        setIsConnecting(false)
      }
    } else {
      window.open("https://metamask.io/download/", "_blank")
    }
  }

  // Disconnect wallet (for UI purposes only, doesn't actually disconnect MetaMask)
  const disconnect = () => {
    setAddress("")
    setSigner(null)
    setIsConnected(false)
  }

  // Switch network
  const switchNetwork = async (chainId: number) => {
    if (!(window as EthereumWindow).ethereum) return

    const network = SUPPORTED_NETWORKS.find((n) => n.id === chainId)
    if (!network) return

    try {
      await (window as EthereumWindow).ethereum!.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await (window as EthereumWindow).ethereum!.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
              },
            ],
          })
        } catch (addError) {
          console.error("Error adding network:", addError)
        }
      } else {
        console.error("Error switching network:", error)
      }
    }
  }

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        address,
        chainId,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        switchNetwork,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  return useContext(Web3Context)
}
