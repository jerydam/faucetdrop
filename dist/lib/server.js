import * as dotenv from "dotenv";
import express from "express";
import { ethers } from "ethers";
import { FAUCET_ABI } from "./abis"; // Removed .ts extension
dotenv.config();
// Initialize Express app
const app = express();
app.use(express.json());
// Validate environment variables
if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not defined in environment variables");
}
if (!process.env.RPC_URL) {
    throw new Error("RPC_URL is not defined in environment variables");
}
// Initialize ethers provider (e.g., Sepolia testnet)
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
// /claim endpoint
const claimHandler = async (req, res) => {
    const { userAddress, faucetAddress, whitelist } = req.body;
    // Validate inputs
    if (!ethers.isAddress(userAddress) || !ethers.isAddress(faucetAddress)) {
        res.status(400).json({ error: "Invalid userAddress or faucetAddress" });
        return;
    }
    try {
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const faucetContract = new ethers.Contract(faucetAddress, FAUCET_ABI, signer);
        // Step 1: Whitelist the user if requested
        if (whitelist) {
            try {
                const whitelistTx = await faucetContract.setWhitelist(userAddress, true);
                await whitelistTx.wait();
            }
            catch (whitelistError) {
                const error = whitelistError;
                res.status(500).json({ error: `Failed to whitelist user: ${error.message}` });
                return;
            }
        }
        // Step 2: Check if user is whitelisted (optional, based on contract logic)
        const isWhitelisted = await faucetContract.isWhitelisted(userAddress);
        if (!isWhitelisted) {
            res.status(403).json({ error: "User is not whitelisted" });
            return;
        }
        // Step 3: Claim tokens for the user
        try {
            // Use claimForBatch to credit tokens to userAddress
            const claimTx = await faucetContract.claimForBatch([userAddress]);
            await claimTx.wait();
            res.json({ success: true, txHash: claimTx.hash });
        }
        catch (claimError) {
            const error = claimError;
            res.status(500).json({ error: `Failed to claim tokens: ${error.message}` });
        }
    }
    catch (error) {
        const appError = error;
        console.error("Error in /claim endpoint:", appError);
        res.status(500).json({ error: `Server error: ${appError.message}` });
    }
};
app.post("/claim", claimHandler);
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
