/**
 * Service for interacting with the backend API
 */
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
/**
 * Whitelists a user and claims tokens from a faucet using the backend service
 * This allows for gasless operations where the backend pays for the transactions
 */
export async function claimViaBackend(userAddress, faucetAddress) {
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
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to whitelist and claim tokens via backend");
        }
        return await response.json();
    }
    catch (error) {
        console.error("Error in claimViaBackend:", error);
        throw error;
    }
}
