"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface Network {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  color: string;
  factoryAddress: string;
}

interface NetworkContextType {
  network: Network | null;
  networks: Network[];
  setNetwork: (network: Network) => void;
  switchNetwork: (chainId: number) => Promise<void>;
}

// Only include Arbitrum Sepolia
const networks: Network[] = [
  {
    name: "Arbitrum Mainnet",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
    color: "#28A0F0",
    factoryAddress: "0xd041701cC67944fEdc311d7f1825A52b93C4aBF1", // Replace with actual factory address
  },
];


const NetworkContext = createContext<NetworkContextType>({
  network: null,
  networks: networks,
  setNetwork: () => {},
  switchNetwork: async () => {},
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<Network | null>(networks[0]);

  const switchNetwork = async (chainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const targetNetwork = networks.find((n) => n.chainId === chainId);
    if (!targetNetwork) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setNetwork(targetNetwork);
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: targetNetwork.name,
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: [targetNetwork.rpcUrl],
                blockExplorerUrls: [targetNetwork.blockExplorer],
              },
            ],
          });
          setNetwork(targetNetwork);
        } catch (addError) {
          console.error("Error adding network:", addError);
        }
      } else {
        console.error("Error switching network:", error);
      }
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        network,
        networks,
        setNetwork,
        switchNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}