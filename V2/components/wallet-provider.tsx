"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner, type Eip1193Provider } from "ethers"
import sdk from "@farcaster/miniapp-sdk"
import { useToast } from "@/hooks/use-toast"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
  isFarcaster: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: (chainId: number) => Promise<void>
}

const WalletContext = createContext<WalletContextType>({} as WalletContextType)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isFarcaster, setIsFarcaster] = useState(false)
  const { toast } = useToast()

  // 1. Initialize Provider
  useEffect(() => {
    const init = async () => {
      let rawProvider: Eip1193Provider | null = null;
      let isFrame = false;

      // A. Check Farcaster
      if (typeof window !== 'undefined' && sdk.wallet) {
        try {
            rawProvider = sdk.wallet.getEthereumProvider() as Eip1193Provider;
            isFrame = true;
            setIsFarcaster(true);
            console.log("✅ Farcaster Wallet Detected");
        } catch (e) {
            console.warn("Farcaster detected but provider failed", e);
        }
      }

      // B. Fallback to Standard Web (window.ethereum)
      if (!rawProvider && typeof window !== 'undefined' && (window as any).ethereum) {
        rawProvider = (window as any).ethereum;
        console.log("🌐 Standard Web3 Browser Detected");
      }

      if (!rawProvider) return;

      // Wrap in Ethers
      const ethersProvider = new BrowserProvider(rawProvider);
      setProvider(ethersProvider);

      // Auto-connect if allowed (Farcaster is always allowed)
      try {
        const accounts = await ethersProvider.send("eth_accounts", []);
        if (accounts.length > 0) {
          handleAccountsChanged(accounts, ethersProvider);
        } else if (isFrame) {
            // Force request for Farcaster if not auto-populated
            connectInternal(ethersProvider);
        }
        
        // Listen for chain changes
        const network = await ethersProvider.getNetwork();
        setChainId(Number(network.chainId));
        
        if ((rawProvider as any).on) {
            (rawProvider as any).on('accountsChanged', (accs: string[]) => handleAccountsChanged(accs, ethersProvider));
            (rawProvider as any).on('chainChanged', (cid: string) => setChainId(Number(cid)));
        }

      } catch (err) {
        console.error("Wallet initialization error:", err);
      }
    };

    init();
  }, []);

  const handleAccountsChanged = async (accounts: string[], currentProvider: BrowserProvider) => {
    if (accounts.length > 0) {
      setAddress(accounts[0]);
      const newSigner = await currentProvider.getSigner();
      setSigner(newSigner);
    } else {
      setAddress(null);
      setSigner(null);
    }
  };

  const connectInternal = async (currentProvider: BrowserProvider) => {
    try {
      const accounts = await currentProvider.send("eth_requestAccounts", []);
      handleAccountsChanged(accounts, currentProvider);
    } catch (error: any) {
      console.error("Connection rejected", error);
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    }
  };

  const connect = async () => {
    if (provider) {
      await connectInternal(provider);
    } else {
      toast({ title: "No Wallet Found", description: "Please install a wallet or open in Farcaster.", variant: "destructive" });
    }
  };

  const disconnect = () => {
    // Purely local state cleanup since injected wallets don't "disconnect"
    setAddress(null);
    setSigner(null);
    toast({ title: "Disconnected" });
  };

  const switchChain = async (targetChainId: number) => {
    if (!provider) return;
    const hexChainId = "0x" + targetChainId.toString(16);
    
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: hexChainId }]);
    } catch (error: any) {
      // Error 4902: Chain not added
      if (error.code === 4902) {
         toast({ title: "Chain Missing", description: "Please add this network to your wallet manually." });
      } else {
         console.error(error);
         toast({ title: "Switch Failed", description: error.message });
      }
    }
  };

  return (
    <WalletContext.Provider value={{ 
        provider, signer, address, chainId, 
        isConnected: !!address, isFarcaster, 
        connect, disconnect, switchChain 
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)