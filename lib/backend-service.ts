// In backend-service.ts
import { BrowserProvider } from 'ethers';

const API_URL = "https://fauctdrop-backend-1.onrender.com"

export async function claimViaBackend(userAddress: string, faucetAddress: string, provider?: BrowserProvider): Promise<{ success: boolean, txHash: string, whitelistTx?: string }> {
  try {
    // Check if running in a browser environment
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error("Wallet not detected. Please install MetaMask or another Ethereum wallet in a supported browser.");
    }

    // Validate provider
    if (!provider) {
      throw new Error("Provider not initialized. Please ensure your wallet is connected.");
    }

    // Get chainId from provider
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    // Validate chainId
    const validChainIds = [1135, 42220, 42161]; // Lisk, Celo, Arbitrum
    if (!validChainIds.includes(chainId)) {
      throw new Error(`Unsupported chainId: ${chainId}. Please switch to Lisk, Celo, or Arbitrum.`);
    }

    console.log("Sending claim request:", {
      userAddress,
      faucetAddress,
      chainId,
      types: {
        userAddress: typeof userAddress,
        faucetAddress: typeof faucetAddress,
        chainId: typeof chainId,
      },
    });

    const response = await fetch(`${API_URL}/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userAddress,
        faucetAddress,
        shouldWhitelist: true,
        chainId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend error response:", JSON.stringify(errorData, null, 2));
      throw new Error(errorData.detail || `Failed to claim tokens via backend (status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error claiming via backend:", error);
    throw error;
  }
}