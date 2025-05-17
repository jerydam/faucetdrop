import { type BrowserProvider, Contract } from "ethers";
import { FAUCET_ABI } from "./abis";

export async function getFaucetDetails(provider: BrowserProvider, faucetAddress: string) {
  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    // Get basic faucet info
    const [ownerAddress, claimAmount, startTime, endTime, isClaimActive, balance, userAddress] = await Promise.all([
      faucetContract.owner(),
      faucetContract.claimAmount(),
      faucetContract.startTime(),
      faucetContract.endTime(),
      faucetContract.isClaimActive(),
      faucetContract.getFaucetBalance(),
      signer.getAddress(),
    ]);

    // Get user-specific info
    const hasClaimed = await faucetContract.hasClaimed(userAddress);

    // Conditionally fetch name
    let name: string | undefined;
    try {
      name = await faucetContract.name();
    } catch (error) {
      console.warn(`Faucet at ${faucetAddress} does not support name():`, error);
      name = undefined; // Or set a default like "Unnamed Faucet"
    }

    return {
      faucetAddress,
      name,
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
  } catch (error) {
    console.error("Error getting faucet details:", error);
    throw error;
  }
}

export async function claimTokens(provider: BrowserProvider, faucetAddress: string) {
  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    const tx = await faucetContract.claim();
    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error("Error claiming tokens:", error);
    throw error;
  }
}

export async function fundFaucet(provider: BrowserProvider, faucetAddress: string, amount: bigint) {
  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    // Send native currency to the faucet
    const tx = await faucetContract.fund({ value: amount });
    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error("Error funding faucet:", error);
    throw error;
  }
}

export async function withdrawTokens(provider: BrowserProvider, faucetAddress: string, amount: bigint) {
  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    const tx = await faucetContract.withdraw(amount);
    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error("Error withdrawing tokens:", error);
    throw error;
  }
}

export async function setClaimParameters(
  provider: BrowserProvider,
  faucetAddress: string,
  claimAmount: bigint,
  startTime: number,
  endTime: number,
) {
  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    const tx = await faucetContract.setClaimParameters(claimAmount, startTime, endTime);
    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error("Error setting claim parameters:", error);
    throw error;
  }
}

export async function setWhitelist(
  provider: BrowserProvider,
  faucetAddress: string,
  addresses: string[],
  status: boolean,
) {
  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    // Use batch function if multiple addresses
    if (addresses.length > 1) {
      const tx = await faucetContract.setWhitelistBatch(addresses, status);
      await tx.wait();
      return tx.hash;
    } else if (addresses.length === 1) {
      const tx = await faucetContract.setWhitelist(addresses[0], status);
      await tx.wait();
      return tx.hash;
    } else {
      throw new Error("No addresses provided for whitelist");
    }
  } catch (error) {
    console.error("Error setting whitelist:", error);
    throw error;
  }
}