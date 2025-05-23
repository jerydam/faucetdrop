"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ZeroAddress } from "ethers"
import { useToast } from "@/hooks/use-toast"

export interface Network {
  name: string
  chainId: number
  rpcUrl: string
  blockExplorer: string
  explorerUrl?: string
  color: string
  factoryAddress: string
  tokenAddress: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

interface NetworkContextType {
  network: Network | null
  networks: Network[]
  setNetwork: (network: Network) => void
  switchNetwork: (chainId: number) => Promise<void>
  ensureCorrectNetwork: (chainId: number) => Promise<boolean>
}

const networks: Network[] = [
  {
    name: "Celo",
    chainId: 42220,
    rpcUrl: "https://forno.celo.org",
    blockExplorer: "https://celoscan.io",
    explorerUrl: "https://celoscan.io",
    color: "#35D07F",
    factoryAddress: "0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB",
    tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438", // Wrapped CELO
    nativeCurrency: {
      name: "Celo",
      symbol: "CELO",
      decimals: 18,
    },
  },
  {
    name: "Lisk",
    chainId: 1135,
    rpcUrl: "https://rpc.api.lisk.com",
    blockExplorer: "https://blockscout.lisk.com",
    explorerUrl: "https://blockscout.lisk.com",
    color: "#0D4477",
    factoryAddress: "0xc5f8c2A85520c0A3595C29e004b2f5D9e7CE3b0B",
    tokenAddress: ZeroAddress, // LISK (native)
    nativeCurrency: {
      name: "Lisk",
      symbol: "LISK",
      decimals: 18,
    },
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
    explorerUrl: "https://arbiscan.io",
    color: "#28A0F0",
    factoryAddress: "0x6087810cFc24310E85736Cbd500e4c1d5a45E196",
    tokenAddress: ZeroAddress, // ETH (native)
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
]

const NetworkContext = createContext<NetworkContextType>({
  network: null,
  networks: networks,
  setNetwork: () => {},
  switchNetwork: async () => {},
  ensureCorrectNetwork: async () => false,
})

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [network, setNetwork] = useState<Network | null>(networks[0])
  const [currentChainId, setCurrentChainId] = useState<number | null>(null)
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)

  useEffect(() => {
    const detectCurrentChain = async () => {
      if (typeof window === "undefined" || !window.ethereum) return

      try {
        const chainIdHex = await window.ethereum.request({ method: "eth_chainId" })
        const chainId = Number.parseInt(chainIdHex, 16)
        setCurrentChainId(chainId)

        const detectedNetwork = networks.find((n) => n.chainId === chainId)
        if (detectedNetwork) {
          setNetwork(detectedNetwork)
        }
      } catch (error) {
        console.error("Error detecting chain:", error)
      }
    }

    detectCurrentChain()

    if (window.ethereum) {
      const handleChainChanged = (chainIdHex: string) => {
        try {
          const chainId = Number.parseInt(chainIdHex, 16)
          console.log(`Chain changed to: ${chainId}`)
          setCurrentChainId(chainId)

          const detectedNetwork = networks.find((n) => n.chainId === chainId)
          if (detectedNetwork) {
            setNetwork(detectedNetwork)
          }
          // Reload the page on chain change
          window.location.reload()
        } catch (error) {
          console.error("Error handling chain change:", error)
        }
      }

      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener("chainChanged", handleChainChanged)
        }
      }
    }
  }, [])

  const switchNetwork = async (chainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "No Ethereum Provider",
        description: "Please install MetaMask or another wallet provider",
        variant: "destructive",
      })
      return
    }

    if (isSwitchingNetwork) {
      console.log("Network switch already in progress, skipping")
      return
    }

    const targetNetwork = networks.find((n) => n.chainId === chainId)
    if (!targetNetwork) {
      toast({
        title: "Network Not Supported",
        description: `Chain ID ${chainId} is not supported`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsSwitchingNetwork(true)
      console.log(`Attempting to switch to network ${targetNetwork.name} (${chainId})`)

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })

      console.log(`Successfully switched to ${targetNetwork.name}`)
      setNetwork(targetNetwork)
      setCurrentChainId(chainId)
      // Reload the page after successful network switch
      window.location.reload()
    } catch (error: any) {
      console.warn(`Error switching to ${targetNetwork.name}:`, error)

      if (error.code === 4902) {
        try {
          console.log(`Adding network ${targetNetwork.name} to wallet`)

          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: targetNetwork.name,
                nativeCurrency: targetNetwork.nativeCurrency,
                rpcUrls: [targetNetwork.rpcUrl],
                blockExplorerUrls: [targetNetwork.blockExplorer],
              },
            ],
          })

          console.log(`Successfully added network ${targetNetwork.name}`)

          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          })

          setNetwork(targetNetwork)
          setCurrentChainId(chainId)
          // Reload the page after adding and switching network
          window.location.reload()
        } catch (addError: any) {
          console.error(`Error adding network ${targetNetwork.name}:`, addError)
          toast({
            title: "Failed to Add Network",
            description: `Could not add ${targetNetwork.name} to your wallet: ${addError.message}`,
            variant: "destructive",
          })
        }
      } else {
        console.error(`Error switching to network ${targetNetwork.name}:`, error)
        toast({
          title: "Network Switch Failed",
          description: `Could not switch to ${targetNetwork.name}: ${error.message}`,
          variant: "destructive",
        })
      }
    } finally {
      setIsSwitchingNetwork(false)
    }
  }

  const ensureCorrectNetwork = async (chainId: number): Promise<boolean> => {
    if (currentChainId === chainId) {
      console.log(`Already on the correct network: ${chainId}`)
      return true
    }

    console.log(`Network mismatch: current=${currentChainId}, required=${chainId}`)
    return false
  }

  const handleSetNetwork = (newNetwork: Network) => {
    setNetwork(newNetwork)
    switchNetwork(newNetwork.chainId)
  }

  return (
    <NetworkContext.Provider
      value={{
        network,
        networks,
        setNetwork: handleSetNetwork,
        switchNetwork,
        ensureCorrectNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  return useContext(NetworkContext)
}