"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import { useNetwork } from "@/hooks/use-network";
export const WalletContext = createContext({
    provider: null,
    signer: null,
    address: null,
    chainId: null,
    isConnected: false,
    connect: async () => { },
    disconnect: () => { },
    isSwitchingNetwork: false,
});
const ARBITRUM_SEPOLIA = 421614;
export function WalletProvider({ children }) {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [address, setAddress] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
    const { network, switchNetwork } = useNetwork();
    const handleAccountsChanged = async (signers) => {
        if (signers.length === 0) {
            setSigner(null);
            setAddress(null);
            setIsConnected(false);
        }
        else {
            try {
                const signer = signers[0];
                setSigner(signer);
                const address = await signer.getAddress();
                setAddress(address);
                setIsConnected(true);
            }
            catch (error) {
                console.error("Error getting signer address:", error);
            }
        }
    };
    useEffect(() => {
        if (typeof window !== "undefined" && window.ethereum) {
            const provider = new BrowserProvider(window.ethereum);
            setProvider(provider);
            const handleChainChanged = (chainIdHex) => {
                const newChainId = Number.parseInt(chainIdHex, 16);
                setChainId(newChainId);
                setIsSwitchingNetwork(false); // Reset after network change
            };
            provider
                .listAccounts()
                .then((accounts) => {
                if (accounts.length > 0) {
                    handleAccountsChanged(accounts);
                }
            })
                .catch(console.error);
            window.ethereum.on("accountsChanged", handleAccountsChanged);
            window.ethereum.on("chainChanged", handleChainChanged);
            provider
                .getNetwork()
                .then((network) => {
                setChainId(Number(network.chainId));
            })
                .catch(console.error);
            return () => {
                window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
                window.ethereum?.removeListener("chainChanged", handleChainChanged);
            };
        }
        else {
            console.warn("No Ethereum provider found. Please install MetaMask or another wallet.");
        }
    }, []);
    useEffect(() => {
        if (chainId && chainId !== ARBITRUM_SEPOLIA && !isSwitchingNetwork) {
            setIsSwitchingNetwork(true);
            switchNetwork(ARBITRUM_SEPOLIA).catch((error) => {
                console.error("Error switching network:", error);
                setIsSwitchingNetwork(false);
            });
        }
    }, [chainId, switchNetwork]);
    const connect = async () => {
        if (!provider || isSwitchingNetwork)
            return;
        try {
            const accounts = await provider.send("eth_requestAccounts", []);
            await handleAccountsChanged(accounts);
            if (chainId !== ARBITRUM_SEPOLIA) {
                await switchNetwork(ARBITRUM_SEPOLIA);
            }
        }
        catch (error) {
            console.error("Error connecting wallet:", error);
        }
    };
    const disconnect = () => {
        setSigner(null);
        setAddress(null);
        setIsConnected(false);
    };
    return (<WalletContext.Provider value={{
            provider,
            signer,
            address,
            chainId,
            isConnected,
            connect,
            disconnect,
            isSwitchingNetwork,
        }}>
      {children}
    </WalletContext.Provider>);
}
export function useWallet() {
    return useContext(WalletContext);
}
