"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useDisconnect, useSwitchChain, useAccount, useChainId, useConnect } from 'wagmi'
import { useToast } from "@/hooks/use-toast"
import sdk from "@farcaster/miniapp-sdk"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  ensureCorrectNetwork: (requiredChainId: number) => Promise<boolean>
  switchChain: (newChainId: number) => Promise<void>
}

export const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [farcasterChainId, setFarcasterChainId] = useState<number | null>(null)

  const { toast } = useToast()
  
  // Wagmi hooks
  const { connectAsync } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  const { address, isConnected: wagmiConnected, isConnecting } = useAccount()
  const wagmiChainId = useChainId()

  // 1. Detect Farcaster Environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
       try {
         // Check if the Farcaster wallet provider exists
         if (sdk.wallet) {
            setIsFarcaster(true);
            sdk.actions.ready();
         }
       } catch (e) {
         // Not in Farcaster
       }
    }
  }, []);

  // 2. Sync Provider, Signer & Chain ID
  useEffect(() => {
    const updateProviderAndSigner = async () => {
      // --- FARCASTER LOGIC ---
      if (isFarcaster) {
        try {
          console.log('[WalletProvider] Initializing Farcaster Provider');
          const farcasterProvider = sdk.wallet.getEthereumProvider();
          // @ts-ignore - types mismatch workaround
          const ethersProvider = new BrowserProvider(farcasterProvider);
          const ethersSigner = await ethersProvider.getSigner();

          // Manually fetch chain ID since Wagmi hooks won't work here
          const network = await ethersProvider.getNetwork();
          setFarcasterChainId(Number(network.chainId));

          setProvider(ethersProvider);
          setSigner(ethersSigner);
          setIsReady(true);
          return; 
        } catch (error) {
          console.error('[WalletProvider] Farcaster connection error', error);
        }
      }

      // --- STANDARD WEB LOGIC ---
      if (wagmiConnected && address && typeof window !== 'undefined' && window.ethereum) {
        try {
          const ethersProvider = new BrowserProvider(window.ethereum);
          const ethersSigner = await ethersProvider.getSigner();
          
          setProvider(ethersProvider);
          setSigner(ethersSigner);
          setIsReady(true);
        } catch (error) {
          console.error("Error setting up provider:", error);
          setProvider(null);
          setSigner(null);
          setIsReady(false);
        }
      } else {
        setProvider(null);
        setSigner(null);
        setIsReady(false);
      }
    }

    updateProviderAndSigner();
  }, [wagmiConnected, address, wagmiChainId, isFarcaster]);

  // Determine active Chain ID and Connection State
  const activeChainId = isFarcaster ? farcasterChainId : wagmiChainId;
  const isConnected = isFarcaster ? true : (wagmiConnected && !!address && !!provider && !!signer);

  // Consolidated Connect Function
  const connect = async () => {
    if (isFarcaster) {
        try {
            const provider = sdk.wallet.getEthereumProvider();
            await provider.request({ method: 'eth_requestAccounts' });
        } catch (e) {
            console.error("Farcaster request accounts failed", e);
        }
        return;
    }
    
    // Standard Wagmi connect
    try {
      await connectAsync(); 
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  const disconnect = () => {
    try {
      wagmiDisconnect()
      setProvider(null)
      setSigner(null)
      setIsReady(false)
      
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected",
      })
    } catch (error) {
      console.error("Error disconnecting:", error)
    }
  }

  const switchChain = async (newChainId: number) => {
    if (isFarcaster && provider) {
        try {
            // Farcaster specific switch
            await provider.send("wallet_switchEthereumChain", [{ chainId: "0x" + newChainId.toString(16) }]);
            setFarcasterChainId(newChainId);
            toast({ title: "Network switched", description: `Switched to chain ${newChainId}` });
            return;
        } catch (error) {
            console.error("Farcaster switch failed", error);
            // Fallthrough to try standard method or handle error
        }
    }

    try {
      await wagmiSwitchChain({ chainId: newChainId })
      toast({
        title: "Network switched",
        description: `Switched to chain ${newChainId}`,
      })
    } catch (error: any) {
      console.error("Failed to switch network:", error)
      toast({
        title: "Network switch failed",
        description: error.message || "Failed to switch network",
        variant: "destructive",
      })
      throw error
    }
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    if (!isConnected) {
      try {
        await connect()
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        return false
      }
    }

    if (activeChainId !== requiredChainId) {
      try {
        await switchChain(requiredChainId)
        await new Promise(resolve => setTimeout(resolve, 1500))
        return true
      } catch (error) {
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
        address: address || null,
        chainId: activeChainId || null,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        ensureCorrectNetwork,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  return context
}