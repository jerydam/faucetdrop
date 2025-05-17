import { type BrowserProvider, Contract } from "ethers";
import { getFaucetDetails } from "./faucet";
import { FACTORY_ABI } from "./abis";
import { Network } from "@/hooks/use-network";

export async function createFaucet(provider: BrowserProvider, network: Network, name: string) {
  try {
    if (!network?.factoryAddress) {
      throw new Error("Factory address not found for the network");
    }

    const signer = await provider.getSigner();
    const factoryContract = new Contract(network.factoryAddress, FACTORY_ABI, signer);

    // Call createFaucet function with name
    const tx = await factoryContract.createFaucet(name);
    const receipt = await tx.wait();

    // Extract the new faucet address from the FaucetCreated event
    const faucetCreatedEvent = receipt.logs
      .map((log: any) => {
        try {
          return factoryContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsedLog: any) => parsedLog?.name === "FaucetCreated");

    if (!faucetCreatedEvent || !faucetCreatedEvent.args.faucet) {
      throw new Error("Failed to retrieve faucet address from transaction");
    }

    return faucetCreatedEvent.args.faucet as string;
  } catch (error) {
    console.error("Error creating faucet:", error);
    throw error;
  }
}

export async function getAllFaucets(provider: BrowserProvider, network: Network) {
  try {
    if (!network?.factoryAddress) {
      throw new Error("Factory address not found for the network");
    }

    const signer = await provider.getSigner();
    const factoryContract = new Contract(network.factoryAddress, FACTORY_ABI, signer);

    // Get list of faucet addresses
    const faucetAddresses: string[] = await factoryContract.getAllFaucets();

    // Fetch details for each faucet
    const faucetDetails = await Promise.all(
      faucetAddresses.map(async (faucetAddress) => {
        try {
          const details = await getFaucetDetails(provider, faucetAddress);
          return details;
        } catch (error) {
          console.error(`Error fetching details for faucet ${faucetAddress}:`, error);
          return null;
        }
      })
    );

    // Filter out null results (failed fetches)
    return faucetDetails.filter((details): details is NonNullable<typeof details> => details !== null);
  } catch (error) {
    console.error("Error getting all faucets:", error);
    throw error;
  }
}