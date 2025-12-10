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
  isFarcaster: boolean // New flag for UI
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
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [activeAddress, setActiveAddress] = useState<string | null>(null)
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [isReady, setIsReady] = useState(false)
  
  const { toast } = useToast()
  
  // Wagmi hooks (for Desktop/Standard Web)
  const { connectAsync } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  const { address: wagmiAddress, isConnected: wagmiConnected, isConnecting } = useAccount()
  const wagmiChainId = useChainId()

  useEffect(() => {
    const initializeWallet = async () => {
      // 1. STRICT FARCASTER CHECK
      // We check if we are in an iframe AND if the SDK is present
      const inFrame = typeof window !== 'undefined' && window.self !== window.top;
      const hasSdk = !!sdk.wallet;

      if (inFrame && hasSdk) {
        try {
          // Initialize SDK
          await sdk.actions.ready();
          
          const farcasterProvider = sdk.wallet.getEthereumProvider();
          const ethersProvider = new BrowserProvider(farcasterProvider as any);
          
          // CRITICAL: Request accounts explicitly to get the address
          const accounts = await ethersProvider.send("eth_requestAccounts", []);
          const ethersSigner = await ethersProvider.getSigner();
          
          if (accounts && accounts.length > 0) {
            console.log('[WalletProvider] Farcaster Connected:', accounts[0]);
            setProvider(ethersProvider);
            setSigner(ethersSigner);
            setActiveAddress(accounts[0]);
            setIsFarcaster(true);
            setIsReady(true);
            return; // Stop here, ignore Wagmi
          }
        } catch (error) {
          console.error('[WalletProvider] Farcaster init error:', error);
        }
      }

      // 2. STANDARD WEB CHECK (Wagmi/AppKit)
      if (wagmiConnected && wagmiAddress && !isFarcaster) {
        try {
          if (window.ethereum) {
            const ethersProvider = new BrowserProvider(window.ethereum);
            const ethersSigner = await ethersProvider.getSigner();
            setProvider(ethersProvider);
            setSigner(ethersSigner);
            setActiveAddress(wagmiAddress);
            setIsReady(true);
          }
        } catch (error) {
          console.error("Error setting up Wagmi provider", error);
        }
      } else if (!isFarcaster) {
         // Reset only if not in Farcaster mode
         setProvider(null);
         setSigner(null);
         setActiveAddress(null);
      }
    }

    initializeWallet();
  }, [wagmiConnected, wagmiAddress, wagmiChainId]);

  // Unified Connect
  const connect = async () => {
    if (isFarcaster) {
       // Farcaster handles connection automatically
       return;
    }
    try {
      await connectAsync();
    } catch (error: any) {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    }
  }

  const disconnect = () => {
    if (isFarcaster) return; // Cannot disconnect in frame
    wagmiDisconnect();
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    // Basic logic stub - implement full network switching if needed
    if (!activeAddress) return false;
    // In Farcaster, we assume the user is on the right chain or we prompt switch
    if (isFarcaster && provider) {
         try {
             const net = await provider.getNetwork();
             if (net.chainId === BigInt(requiredChainId)) return true;
             await provider.send('wallet_switchEthereumChain', [{ chainId: "0x" + requiredChainId.toString(16) }]);
             return true;
         } catch(e) { return false; }
    }
    return wagmiChainId === requiredChainId;
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address: activeAddress,
        chainId: isFarcaster ? 42220 : wagmiChainId, // Default or fetch real chainId
        isConnected: !!activeAddress,
        isConnecting,
        isFarcaster, // <--- We use this in the UI
        connect,
        disconnect,
        ensureCorrectNetwork,
        switchChain: async (id) => { if(!isFarcaster) wagmiSwitchChain({ chainId: id }) },
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}