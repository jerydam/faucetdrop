/**
 * Service for interacting with the backend API
 */

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://faucetdrop.vercel.app/";

/**
 * Whitelists a user and claims tokens from a faucet using the backend service
 * This allows for gasless operations where the backend pays for the transactions
 */
export async function claimViaBackend(userAddress: string, faucetAddress: string): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_URL}/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userAddress,
        faucetAddress,
        whitelist: true, // Instruct backend to whitelist first
      }),
    });

    if (!response.ok) {
      const text = await response.text(); // Log raw response for debugging
      console.error(`Backend response (status ${response.status}): ${text}`);
      throw new Error(`Failed to whitelist and claim tokens via backend: ${response.status} ${text}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in claimViaBackend for user ${userAddress}:`, error);
    throw error;
  }
}