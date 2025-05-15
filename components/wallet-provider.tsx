"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { BrowserProvider, type JsonRpcSigner } from "ethers";
import { useNetwork } from "@/hooks/use-network";

// Type for EIP-1193 compatible provider
interface EIP1193Provider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider & any;
    backpack?: EIP1193Provider & any;
  }
}

interface WalletContextType {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  connect: (walletType?: string) => Promise<void>;
  disconnect: () => void;
  isSwitchingNetwork: boolean;
}

export const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  isSwitchingNetwork: false,
});

const ARBITRUM_SEPOLIA = 421614;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const { network, switchNetwork } = useNetwork();

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      try {
        if (provider) {
          const signer = await provider.getSigner();
          setSigner(signer);
          setAddress(accounts[0]);
          setIsConnected(true);
          localStorage.setItem("walletConnected", "true");
        }
      } catch (error) {
        console.error("Error getting signer address:", error);
      }
    }
  };

  const initializeProvider = async (walletProvider: EIP1193Provider) => {
    const provider = new BrowserProvider(walletProvider);
    setProvider(provider);

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = Number.parseInt(chainIdHex, 16);
      setChainId(newChainId);
      setIsSwitchingNetwork(false);
    };

    try {
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        await handleAccountsChanged(accounts.map((acc) => acc.address));
      }

      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));

      walletProvider.on("accountsChanged", handleAccountsChanged);
      walletProvider.on("chainChanged", handleChainChanged);

      return () => {
        walletProvider.removeListener("accountsChanged", handleAccountsChanged);
        walletProvider.removeListener("chainChanged", handleChainChanged);
      };
    } catch (error) {
      console.error("Error initializing provider:", error);
    }
  };

  useEffect(() => {
    const connected = localStorage.getItem("walletConnected") === "true";
    if (connected && (window.ethereum || window.backpack)) {
      const walletProvider = window.ethereum || window.backpack;
      initializeProvider(walletProvider);
    } else if (!window.ethereum && !window.backpack) {
      console.warn("No Ethereum provider found. Please install MetaMask, Backpack, or another wallet.");
    }
  }, []);

  useEffect(() => {
    if (chainId && chainId !== ARBITRUM_SEPOLIA && !isSwitchingNetwork && network) {
      setIsSwitchingNetwork(true);
      switchNetwork(ARBITRUM_SEPOLIA).catch((error) => {
        console.error("Error switching network:", error);
        setIsSwitchingNetwork(false);
      });
    }
  }, [chainId, network, switchNetwork]);

  const connect = async (walletType: string = "metamask") => {
    if (!provider && (walletType === "metamask" || walletType === "backpack")) {
      const walletProvider = walletType === "metamask" ? window.ethereum : window.backpack;
      if (!walletProvider) {
        console.warn(`${walletType} not found. Please install ${walletType}.`);
        return;
      }
      await initializeProvider(walletProvider);
    }

    if (provider && !isSwitchingNetwork) {
      try {
        const accounts = await provider.send("eth_requestAccounts", []);
        await handleAccountsChanged(accounts);
        if (chainId !== ARBITRUM_SEPOLIA) {
          await switchNetwork(ARBITRUM_SEPOLIA);
        }
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    }
  };

  const disconnect = () => {
    setSigner(null);
    setAddress(null);
    setIsConnected(false);
    localStorage.removeItem("walletConnected");
  };

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
        isSwitchingNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}