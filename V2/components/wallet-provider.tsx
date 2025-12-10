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
  isFarcaster: boolean // Added this
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
  isFarcaster: false,
  connect: async () => {},
  disconnect: () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  // We use internal state to unify Wagmi and Farcaster data
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [activeAddress, setActiveAddress] = useState<string | null>(null) // Unified address
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [isReady, setIsReady] = useState(false)
  
  const { toast } = useToast()
  
  // Wagmi hooks
  const { connectAsync } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  const { address: wagmiAddress, isConnected: wagmiConnected, isConnecting } = useAccount()
  const wagmiChainId = useChainId()

  useEffect(() => {
    const initializeWallet = async () => {
      // 1. Check strict Farcaster environment (Must be in Iframe AND have SDK)
      const inFrame = typeof window !== 'undefined' && window.self !== window.top;
      const hasSdk = !!sdk.wallet;
      
      if (inFrame && hasSdk) {
        try {
          // Initialize SDK
          await sdk.actions.ready(); 
          
          const farcasterProvider = sdk.wallet.getEthereumProvider();
          const ethersProvider = new BrowserProvider(farcasterProvider as any);
          
          // CRITICAL FIX: Explicitly request accounts from Farcaster to get the address
          // The SDK doesn't give address automatically unless requested
          const accounts = await ethersProvider.send("eth_requestAccounts", []);
          const ethersSigner = await ethersProvider.getSigner();
          
          if (accounts && accounts.length > 0) {
            console.log('[WalletProvider] Farcaster Connected:', accounts[0]);
            setProvider(ethersProvider);
            setSigner(ethersSigner);
            setActiveAddress(accounts[0]); // Set the address from Farcaster
            setIsFarcaster(true);
            setIsReady(true);
            return; // Stop here, do not load Wagmi logic
          }
        } catch (error) {
          console.error('[WalletProvider] Farcaster init error:', error);
        }
      }

      // 2. Standard Web Environment (Wagmi)
      // Only run this if we didn't successfully connect via Farcaster
      if (wagmiConnected && wagmiAddress && typeof window !== 'undefined' && window.ethereum) {
        try {
          const ethersProvider = new BrowserProvider(window.ethereum);
          const ethersSigner = await ethersProvider.getSigner();
          
          setProvider(ethersProvider);
          setSigner(ethersSigner);
          setActiveAddress(wagmiAddress); // Set address from Wagmi
          setIsFarcaster(false);
          setIsReady(true);
        } catch (error) {
          console.error("Error setting up Wagmi provider", error);
          resetState();
        }
      } else {
        // If Wagmi disconnects, clear state (unless we are in Farcaster mode)
        if (!isFarcaster) {
           resetState();
        }
      }
    }

    initializeWallet();
  }, [wagmiConnected, wagmiAddress, wagmiChainId]);

  const resetState = () => {
    setProvider(null);
    setSigner(null);
    setActiveAddress(null);
    setIsReady(false);
  }

  // Unified Connect Function
  const connect = async () => {
    if (isFarcaster) {
       // In Farcaster, we are auto-connected, but we can re-request permissions
       const provider = sdk.wallet.getEthereumProvider();
       await provider.request({ method: 'eth_requestAccounts' });
       return;
    }
    
    // Standard Wagmi connect
    try {
      await connectAsync();
    } catch (error: any) {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    }
  }

  const disconnect = () => {
    if (isFarcaster) {
        // Cannot strictly disconnect in Farcaster, just clear local state
        resetState();
        return;
    }
    wagmiDisconnect();
    resetState();
  }

  // Helper to ensure network
  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    const currentChainId = isFarcaster 
        ? (await provider?.getNetwork())?.chainId 
        : BigInt(wagmiChainId);

    if (!currentChainId) return false;

    if (currentChainId !== BigInt(requiredChainId)) {
        try {
            await switchChain(requiredChainId);
            return true;
        } catch (e) {
            return false;
        }
    }
    return true;
  }

  const switchChain = async (newChainId: number) => {
    if (isFarcaster && provider) {
        // Farcaster specific switch
        try {
            await provider.send('wallet_switchEthereumChain', [{ chainId: "0x" + newChainId.toString(16) }]);
        } catch (e: any) {
            // If chain not added, you might need wallet_addEthereumChain logic here
            throw e;
        }
    } else {
        await wagmiSwitchChain({ chainId: newChainId });
    }
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address: activeAddress, // Expose the unified address
        chainId: wagmiChainId, // Note: You might need to fetch this from provider for Farcaster
        isConnected: !!activeAddress && !!signer,
        isConnecting,
        isFarcaster,
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
  return useContext(WalletContext)
}