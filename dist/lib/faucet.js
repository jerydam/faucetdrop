import { Contract } from "ethers";
import { FAUCET_ABI } from "./abis";
export async function getFaucetDetails(provider, faucetAddress) {
    try {
        const signer = await provider.getSigner();
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
        // Get basic faucet info
        const ownerAddress = await faucetContract.owner();
        const claimAmount = await faucetContract.claimAmount();
        const startTime = await faucetContract.startTime();
        const endTime = await faucetContract.endTime();
        const isClaimActive = await faucetContract.isClaimActive();
        const balance = await faucetContract.getFaucetBalance();
        // Get user-specific info
        const userAddress = await signer.getAddress();
        const hasClaimed = await faucetContract.hasClaimed(userAddress);
        return {
            faucetAddress,
            owner: ownerAddress,
            claimAmount,
            startTime,
            endTime,
            isClaimActive,
            balance,
            tokenSymbol: "ETH", // Native currency
            tokenDecimals: 18, // ETH decimals
            hasClaimed,
        };
    }
    catch (error) {
        console.error("Error getting faucet details:", error);
        throw error;
    }
}
export async function claimTokens(provider, faucetAddress) {
    try {
        const signer = await provider.getSigner();
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
        const tx = await faucetContract.claim();
        await tx.wait();
        return tx.hash;
    }
    catch (error) {
        console.error("Error claiming tokens:", error);
        throw error;
    }
}
export async function fundFaucet(provider, faucetAddress, amount) {
    try {
        const signer = await provider.getSigner();
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
        // Send native currency to the faucet
        const tx = await faucetContract.fund({ value: amount });
        await tx.wait();
        return tx.hash;
    }
    catch (error) {
        console.error("Error funding faucet:", error);
        throw error;
    }
}
export async function withdrawTokens(provider, faucetAddress, amount) {
    try {
        const signer = await provider.getSigner();
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
        const tx = await faucetContract.withdraw(amount);
        await tx.wait();
        return tx.hash;
    }
    catch (error) {
        console.error("Error withdrawing tokens:", error);
        throw error;
    }
}
export async function setClaimParameters(provider, faucetAddress, claimAmount, startTime, endTime) {
    try {
        const signer = await provider.getSigner();
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
        const tx = await faucetContract.setClaimParameters(claimAmount, startTime, endTime);
        await tx.wait();
        return tx.hash;
    }
    catch (error) {
        console.error("Error setting claim parameters:", error);
        throw error;
    }
}
export async function setWhitelist(provider, faucetAddress, addresses, status) {
    try {
        const signer = await provider.getSigner();
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
        // Use batch function if multiple addresses
        if (addresses.length > 1) {
            const tx = await faucetContract.setWhitelistBatch(addresses, status);
            await tx.wait();
            return tx.hash;
        }
        else if (addresses.length === 1) {
            const tx = await faucetContract.setWhitelist(addresses[0], status);
            await tx.wait();
            return tx.hash;
        }
        else {
            throw new Error("No addresses provided for whitelist");
        }
    }
    catch (error) {
        console.error("Error setting whitelist:", error);
        throw error;
    }
}
