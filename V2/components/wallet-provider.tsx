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
  const [isReady, setIsReady] = useState(false)
  
  // Farcaster specific state
  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null)
  const [isFarcaster, setIsFarcaster] = useState(false)

  const { toast } = useToast()
  
  const { connectAsync } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  
  const { address: wagmiAddress, isConnected: wagmiConnected, isConnecting } = useAccount()
  const wagmiChainId = useChainId()

  // 1. Detect Farcaster Environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
       try {
         if (sdk.wallet) setIsFarcaster(true);
       } catch (e) {
         // Not in Farcaster
       }
    }
  }, []);
  
  // 2. Main Logic: Setup Provider based on Environment
  useEffect(() => {
    const updateProviderAndSigner = async () => {
      // Branch A: FARCASTER
      if (isFarcaster) {
        try {
          console.log('[WalletProvider] Detected Farcaster Environment');
          const farcasterProvider = sdk.wallet.getEthereumProvider();
          
          const ethersProvider = new BrowserProvider(farcasterProvider as any);
          const ethersSigner = await ethersProvider.getSigner();

          // CRITICAL: Manually fetch address for Farcaster
          const accounts = await ethersProvider.send("eth_requestAccounts", []);
          if (accounts && accounts.length > 0) {
              setFarcasterAddress(accounts[0]);
          }

          setProvider(ethersProvider);
          setSigner(ethersSigner);
          setIsReady(true);
          return; 
        } catch (error) {
          console.error('[WalletProvider] Farcaster connection error', error);
        }
      }

      // Branch B: STANDARD WEB (Wagmi)
      if (wagmiConnected && wagmiAddress && typeof window !== 'undefined' && window.ethereum) {
        try {
          console.log('[WalletProvider: Update] Setting up Standard Provider', wagmiAddress);
          const ethersProvider = new BrowserProvider(window.ethereum);
          const ethersSigner = await ethersProvider.getSigner();
          
          setProvider(ethersProvider);
          setSigner(ethersSigner);
          setIsReady(true);
        } catch (error) {
          console.error('Standard provider setup failed', error);
          setProvider(null);
          setSigner(null);
          setIsReady(false);
        }
      } else {
        // Only clear if NOT farcaster (prevents overwriting Farcaster state)
        if (!isFarcaster) {
            setProvider(null);
            setSigner(null);
            setIsReady(false);
        }
      }
    }

    updateProviderAndSigner();
  }, [wagmiConnected, wagmiAddress, wagmiChainId, isFarcaster]);

  // 3. Connect Function
  const connect = async () => {
    if (isFarcaster) {
        const provider = sdk.wallet.getEthereumProvider();
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if(accounts && Array.isArray(accounts)) {
             setFarcasterAddress(accounts[0]);
        }
        return;
    }
    
    try {
      await connectAsync();
    } catch (error: any) {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    }
  }

  // 4. Disconnect Function
  const disconnect = () => {
    if (isFarcaster) {
        return; // Farcaster mini-apps usually don't disconnect
    }
    
    try {
      console.log('Disconnecting wallet...')
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

  // 5. Switch Chain Function
  const switchChain = async (newChainId: number) => {
    // Farcaster Switching
    if (isFarcaster) {
        try {
            if (provider) {
                await provider.send("wallet_switchEthereumChain", [{ chainId: "0x" + newChainId.toString(16) }]);
                toast({ title: "Network switched", description: `Switched to chain ${newChainId}` });
            }
        } catch (e) {
            toast({ title: "Switch Failed", description: "Please switch networks manually in your Farcaster client.", variant: "destructive" });
        }
        return;
    }

    // Standard Wagmi Switching
    try {
      console.log('Switching to chain:', newChainId)
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

  // 6. Active State Resolution
  const activeAddress = isFarcaster ? farcasterAddress : wagmiAddress;
  // isConnected is TRUE if (Wagmi is connected) OR (Farcaster is ready + address exists)
  const isConnected = (isFarcaster && !!farcasterAddress && !!provider) || (wagmiConnected && !!wagmiAddress && !!provider && !!signer);
  const activeChainId = wagmiChainId; // Note: For exact Farcaster chain ID, we might need a separate state, but this usually works if RPC syncs

  // 7. Ensure Network Logic (Restored)
  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    console.log('Ensuring correct network:', { 
      current: activeChainId, 
      required: requiredChainId,
      isConnected 
    })
    
    if (!isConnected) {
      console.log('Wallet not connected, opening connection modal...')
      try {
        await connect()
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error('Failed to connect wallet:', error)
        return false
      }
    }

    // Note: We use the Wagmi chain ID for comparison. 
    // If inside Farcaster, this check might need to query the provider directly if Wagmi isn't syncing.
    if (activeChainId && activeChainId !== requiredChainId) {
      console.log(`Network mismatch: current=${activeChainId}, required=${requiredChainId}`)
      try {
        await switchChain(requiredChainId)
        await new Promise(resolve => setTimeout(resolve, 1500))
        return true
      } catch (error) {
        console.error('Failed to switch network:', error)
        return false
      }
    }

    console.log('✅ On correct network')
    return true
  }

  // Debugging Log (Restored)
  useEffect(() => {
    console.log('🔄 [WalletProvider: State] Connection update:', {
      isConnected,
      isFarcaster,
      wagmiConnected,
      address: activeAddress ? `${activeAddress.slice(0, 6)}...` : null,
      chainId: activeChainId,
      hasProvider: !!provider,
      hasSigner: !!signer,
    })
  }, [isConnected, isFarcaster, wagmiConnected, activeAddress, activeChainId, provider, signer])

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address: activeAddress || null,
        chainId: activeChainId || null,
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
  const context = useContext(WalletContext)
  return context
}