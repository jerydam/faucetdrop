"use client";
import { createContext, useContext, useState } from "react";
// Only include Arbitrum Sepolia
const networks = [
    {
        name: "Arbitrum Sepolia",
        chainId: 421614,
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        blockExplorer: "https://sepolia.arbiscan.io",
        color: "#28A0F0",
        factoryAddress: "0xDbD1CC7077AC8B8b85d7526995C64cd6F1B7Bd5B",
    },
];
const NetworkContext = createContext({
    network: null,
    networks: networks,
    setNetwork: () => { },
    switchNetwork: async () => { },
});
export function NetworkProvider({ children }) {
    const [network, setNetwork] = useState(networks[0]);
    const switchNetwork = async (chainId) => {
        if (typeof window === "undefined" || !window.ethereum)
            return;
        const targetNetwork = networks.find((n) => n.chainId === chainId);
        if (!targetNetwork)
            return;
        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: `0x${chainId.toString(16)}` }],
            });
            setNetwork(targetNetwork);
        }
        catch (error) {
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
                }
                catch (addError) {
                    console.error("Error adding network:", addError);
                }
            }
            else {
                console.error("Error switching network:", error);
            }
        }
    };
    return (<NetworkContext.Provider value={{
            network,
            networks,
            setNetwork,
            switchNetwork,
        }}>
      {children}
    </NetworkContext.Provider>);
}
export function useNetwork() {
    return useContext(NetworkContext);
}
