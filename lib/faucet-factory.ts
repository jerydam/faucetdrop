import { type BrowserProvider, Contract } from "ethers";
import { getFaucetDetails } from "./faucet";
import { FACTORY_ABI } from "./abis";
import { Network } from "@/hooks/use-network";
import { getFaucetXProfileLink } from "./faucetLink";

// Interface for faucet details with xProfileLink
interface FaucetDetails {
  faucetAddress: string;
  token: string;
  owner: string;
  balance: bigint;
  claimAmount: bigint;
  startTime: bigint;
  endTime: bigint;
  isClaimActive: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  hasClaimed: boolean;
  isWhitelisted: boolean;
  xProfileLink?: string;
}

export async function createFaucet(provider: BrowserProvider, network: Network, xProfileLink: string) {
  try {
    if (!network?.factoryAddress) {
      throw new Error("Factory address not found for the network");
    }

    if (!xProfileLink.startsWith("https://x.com/")) {
      throw new Error("Invalid X profile link. Must start with https://x.com/");
    }

    const signer = await provider.getSigner();
    const factoryContract = new Contract(network.factoryAddress, FACTORY_ABI, signer);

    // Call createFaucet function
    const tx = await factoryContract.createFaucet();
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

    const faucetAddress = faucetCreatedEvent.args.faucet as string;

    // Log the faucet address and X profile link for manual addition
    console.log(`New faucet created: ${faucetAddress}`);
    console.log(`X Profile Link: ${xProfileLink}`);
    console.log(`Please add to faucetXProfileLinks.ts: "${faucetAddress.toLowerCase()}": "${xProfileLink}"`);

    return faucetAddress;
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

    // Fetch details for each faucet and include xProfileLink
    const faucetDetails = await Promise.all(
      faucetAddresses.map(async (faucetAddress) => {
        try {
          const details = await getFaucetDetails(provider, faucetAddress);
          const xProfileLink = getFaucetXProfileLink(faucetAddress); // Retrieve xProfileLink
          return {
            ...details,
            faucetAddress,
            xProfileLink,
          } as FaucetDetails;
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