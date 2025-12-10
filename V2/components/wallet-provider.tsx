"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useDisconnect, useSwitchChain, useAccount, useChainId, useConnect, useConnections } from 'wagmi'
import { useToast } from "@/hooks/use-toast"
import sdk from "@farcaster/miniapp-sdk"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  isFarcaster: boolean
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
  const [isFarcaster, setIsFarcaster] = useState(false);
  
  const { toast } = useToast()
  
  // Wagmi Hooks
  const { connect: wagmiConnect, connectors } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  const { address, isConnected: wagmiConnected, isConnecting, connector: activeConnector } = useAccount()
  const chainId = useChainId()

  // 1. Detect Farcaster Environment & Auto-Connect
  useEffect(() => {
    const initFarcaster = async () => {
      // Check if running in a frame context
      if (typeof window !== 'undefined' && (window.parent !== window || sdk.wallet)) {
        try {
          await sdk.actions.ready();
          // If the SDK reports a wallet, we are in a MiniApp
          if (sdk.wallet) {
            setIsFarcaster(true);
            
            // Find the Farcaster connector from Wagmi config
            const farcasterConnector = connectors.find(c => c.id === 'farcaster' || c.name === 'Farcaster');
            
            // If we are not connected, or connected to a different connector, force Farcaster connection
            if (farcasterConnector && (!wagmiConnected || activeConnector?.id !== farcasterConnector.id)) {
                console.log("Detected Farcaster MiniApp: Auto-connecting via Wagmi...");
                wagmiConnect({ connector: farcasterConnector });
            }
          }
        } catch (e) {
          console.error("Farcaster init failed", e);
        }
      }
    };
    initFarcaster();
  }, [connectors, wagmiConnected, activeConnector, wagmiConnect]);

  // 2. Unify Provider Creation (Viem -> Ethers Adapter)
  // This logic now handles BOTH standard web (MetaMask) and Farcaster (MiniApp)
  // because Wagmi creates the underlying connection for both.
  useEffect(() => {
    const updateProviderAndSigner = async () => {
      if (wagmiConnected && address && typeof window !== 'undefined' && window.ethereum) {
        try {
            // Note: In Farcaster MiniApp, the connector injects the provider into window.ethereum (or similar polyfill)
            // wrapped by Wagmi. We create a BrowserProvider from the *active connection*.
            
            // For specifically capturing the provider Wagmi is using:
            // In pure Viem/Wagmi v2, you usually use useClient/useWalletClient.
            // But to keep your Ethers v6 logic:
            
            const ethereumProvider = await activeConnector?.getProvider();
            
            if (ethereumProvider) {
                const ethersProvider = new BrowserProvider(ethereumProvider as any);
                const ethersSigner = await ethersProvider.getSigner();
                
                setProvider(ethersProvider);
                setSigner(ethersSigner);
            }
        } catch (error) {
          console.error('Error setting up provider/signer:', error);
          setProvider(null);
          setSigner(null);
        }
      } else {
        setProvider(null);
        setSigner(null);
      }
    }

    updateProviderAndSigner();
  }, [wagmiConnected, address, chainId, activeConnector]);

  const isConnected = wagmiConnected && !!address && !!provider && !!signer;

  const connect = async () => {
    // If we are in Farcaster, the useEffect above handles it.
    // Otherwise, we open the Reown modal (handled by the UI button usually).
    // This function acts as a fallback or explicit trigger.
    if (isFarcaster) {
       const farcasterConnector = connectors.find(c => c.id === 'farcaster');
       if(farcasterConnector) wagmiConnect({ connector: farcasterConnector });
    }
  }

  const disconnect = () => {
    wagmiDisconnect()
    setProvider(null)
    setSigner(null)
  }

  const switchChain = async (newChainId: number) => {
    try {
      await wagmiSwitchChain({ chainId: newChainId })
      toast({ title: "Network switched", description: `Switched to chain ${newChainId}` })
    } catch (error: any) {
      toast({ title: "Switch failed", description: error.message, variant: "destructive" })
      throw error
    }
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    if (!isConnected) return false; // Let the UI handle connection prompting
    if (chainId !== requiredChainId) {
      try {
        await switchChain(requiredChainId)
        return true
      } catch {
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
        chainId: chainId || null,
        isConnected,
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