import { BrowserProvider, Contract, JsonRpcProvider, ZeroAddress, isAddress, getAddress } from "ethers";
import { FAUCET_ABI, ERC20_ABI, FACTORY_ABI, STORAGE_ABI } from "./abis";
import { appendDivviReferralData, reportTransactionToDivvi } from "./divvi-integration";

// Load backend address from .env
const BACKEND_ADDRESS = process.env.BACKEND_ADDRESS || "0x0307daA1F0d3Ac9e1b78707d18E79B13BE6b7178";

// Storage contract address
const STORAGE_CONTRACT_ADDRESS = "0x3fC5162779F545Bb4ea7980471b823577825dc8A";

if (!isAddress(BACKEND_ADDRESS)) {
  throw new Error(`Invalid BACKEND_ADDRESS in .env: ${BACKEND_ADDRESS}`);
}

const VALID_BACKEND_ADDRESS = getAddress(BACKEND_ADDRESS);


// Helper to check if the network is Celo
export function isCeloNetwork(chainId: number): boolean {
  return chainId === 42220; // Celo Mainnet
}

// Helper to check network match
export function checkNetwork(chainId: number, networkId: number): boolean {
  return chainId === networkId;
}

// Create a faucet
export async function createFaucet(
  provider: BrowserProvider,
  factoryAddress: string,
  name: string,
  tokenAddress: string,
  chainId: number,
  networkId: number
): Promise<string> {
  try {
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const factoryContract = new Contract(factoryAddress, FACTORY_ABI, signer);

    const data = factoryContract.interface.encodeFunctionData("createFaucet", [
      name,
      tokenAddress,
      VALID_BACKEND_ADDRESS,
    ]);
    const dataWithReferral = appendDivviReferralData(data);

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: factoryAddress,
      data: dataWithReferral,
      from: signerAddress,
    });
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const maxFeePerGas = feeData.maxFeePerGas || undefined;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined;
    const gasCost = gasEstimate * gasPrice;
    console.log("Create faucet params:", {
      factoryAddress,
      name,
      tokenAddress,
      backendAddress: VALID_BACKEND_ADDRESS,
      chainId,
      networkId,
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      gasPrice: gasPrice.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
      gasCost: gasCost.toString(),
    });

    const tx = await signer.sendTransaction({
      to: factoryAddress,
      data: dataWithReferral,
      gasLimit: gasEstimate * BigInt(12) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.hash);
    await reportTransactionToDivvi(tx.hash, chainId);

    const event = receipt.logs
      .map((log) => {
        try {
          return factoryContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "FaucetCreated");

    if (!event || !event.args.faucet) {
      throw new Error("Failed to retrieve faucet address from transaction");
    }

    // Log new faucet details
    const newFaucet = new Contract(event.args.faucet, FAUCET_ABI, provider);
    const backendFeePercent = await newFaucet.BACKEND_FEE_PERCENT?.();
    console.log("New faucet created:", {
      faucetAddress: event.args.faucet,
      backendAddress: VALID_BACKEND_ADDRESS,
      backendFeePercent: backendFeePercent?.toString(),
    });

    return event.args.faucet;
  } catch (error: any) {
    console.error("Error creating faucet:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to create faucet");
  }
}

// Get faucet details
export async function getFaucetDetails(provider: BrowserProvider | JsonRpcProvider, faucetAddress: string) {
  try {
    console.log(`Getting details for faucet ${faucetAddress}`);
    let contract;
    if ("getSigner" in provider && typeof provider.getSigner === "function") {
      try {
        contract = new Contract(faucetAddress, FAUCET_ABI, await provider.getSigner());
      } catch (error) {
        console.warn(`Error getting signer, falling back to provider for ${faucetAddress}:`, error);
        contract = new Contract(faucetAddress, FAUCET_ABI, provider);
      }
    } else {
      contract = new Contract(faucetAddress, FAUCET_ABI, provider);
    }

    let tokenAddress = ZeroAddress;
    let ownerAddress = ZeroAddress;
    let faucetName = "Unknown Faucet";
    let claimAmount = 0n;
    let startTime = 0n;
    let endTime = 0n;
    let isClaimActive = false;
    let balance = 0n;
    let isEther = true;
    let tokenSymbol = "CELO"; // Default for Celo
    let tokenDecimals = 18;

    try { tokenAddress = await contract.token(); } catch (error) { console.warn(`Error getting token address:`, error); }
    try { ownerAddress = await contract.owner(); } catch (error) { console.warn(`Error getting owner address:`, error); }
    try { faucetName = await contract.name(); } catch (error) { console.warn(`Error getting name:`, error); }
    try { claimAmount = await contract.claimAmount(); } catch (error) { console.warn(`Error getting claim amount:`, error); }
    try { startTime = await contract.startTime(); } catch (error) { console.warn(`Error getting start time:`, error); }
    try { endTime = await contract.endTime(); } catch (error) { console.warn(`Error getting end time:`, error); }
    try { isClaimActive = await contract.isClaimActive(); } catch (error) { console.warn(`Error getting claim active status:`, error); }
    try {
      const balanceResult = await contract.getFaucetBalance();
      balance = balanceResult[0];
      isEther = balanceResult[1];
      tokenSymbol = isEther
        ? (isCeloNetwork(provider.network?.chainId || 0) ? "CELO" : provider.network?.chainId === 1135 ? "LISK" : "ETH")
        : tokenSymbol;
    } catch (error) {
      console.warn(`Error getting balance:`, error);
      if (tokenAddress !== ZeroAddress) {
        try {
          const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
          balance = await tokenContract.balanceOf(faucetAddress);
          isEther = false;
        } catch (innerError) { console.warn(`Error getting token balance:`, innerError); }
      } else {
        try {
          balance = await provider.getBalance(faucetAddress);
          isEther = true;
        } catch (innerError) { console.warn(`Error getting native balance:`, innerError); }
      }
    }

    if (!isEther && tokenAddress !== ZeroAddress) {
      try {
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
        tokenSymbol = await tokenContract.symbol();
      } catch (error) { console.warn(`Error getting token symbol:`, error); }
      try {
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
        tokenDecimals = await tokenContract.decimals();
      } catch (error) { console.warn(`Error getting token decimals:`, error); }
    }

    let hasClaimed = false;
    if ("getSigner" in provider && typeof provider.getSigner === "function") {
      try {
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        hasClaimed = await contract.hasClaimed(userAddress);
      } catch (error) { console.warn(`Error checking claim status:`, error); }
    }

    console.log(`Successfully got details for faucet ${faucetAddress}`);
    return {
      faucetAddress,
      token: tokenAddress,
      owner: ownerAddress,
      name: faucetName,
      claimAmount,
      startTime,
      endTime,
      isClaimActive,
      balance,
      isEther,
      tokenSymbol,
      tokenDecimals,
      hasClaimed,
    };
  } catch (error) {
    console.error(`Error getting faucet details for ${faucetAddress}:`, error);
    return {
      faucetAddress,
      token: ZeroAddress,
      owner: ZeroAddress,
      name: "Error Loading Faucet",
      claimAmount: 0n,
      startTime: 0n,
      endTime: 0n,
      isClaimActive: false,
      balance: 0n,
      isEther: true,
      tokenSymbol: "CELO",
      tokenDecimals: 18,
      hasClaimed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Store claim in storage contract
export async function storeClaim(
  provider: BrowserProvider,
  claimer: string,
  faucetAddress: string,
  amount: bigint,
  txHash: string,
  chainId: number,
  networkId: number,
  networkName: string
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const storageContract = new Contract(STORAGE_CONTRACT_ADDRESS, STORAGE_ABI, signer);

    // Convert txHash to bytes32 (ensure it's a valid 32-byte hash)
    const formattedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    if (!/^0x[a-fA-F0-9]{64}$/.test(formattedTxHash)) {
      throw new Error(`Invalid transaction hash format: ${formattedTxHash}`);
    }

    if (!networkName) {
      throw new Error("Network name cannot be empty");
    }

    const data = storageContract.interface.encodeFunctionData("storeClaim", [
      claimer,
      faucetAddress,
      amount,
      formattedTxHash,
      networkName,
    ]);
    const dataWithReferral = appendDivviReferralData(data);

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: STORAGE_CONTRACT_ADDRESS,
      data: dataWithReferral,
      from: signerAddress,
    });
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas || undefined;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined;

    console.log("Store claim params:", {
      claimer,
      faucetAddress,
      amount: amount.toString(),
      txHash: formattedTxHash,
      networkName,
      chainId,
      networkId,
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    });

    const tx = await signer.sendTransaction({
      to: STORAGE_CONTRACT_ADDRESS,
      data: dataWithReferral,
      gasLimit: gasEstimate * BigInt(12) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    console.log("Store claim transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Store claim transaction confirmed:", receipt.hash);
    await reportTransactionToDivvi(tx.hash, chainId);

    return tx.hash;
  } catch (error: any) {
    console.error("Error storing claim:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to store claim");
  }
}

// Fund faucet
export async function fundFaucet(
  provider: BrowserProvider,
  faucetAddress: string,
  amount: bigint,
  isEther: boolean,
  chainId: number,
  networkId: number
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const balance = await provider.getBalance(signerAddress);
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
    const contractBalance = await provider.getBalance(faucetAddress);
    const backendAddress = await faucetContract.BACKEND?.();
    const backendFeePercent = await faucetContract.BACKEND_FEE_PERCENT?.();
    console.log("Funding params:", {
      faucetAddress,
      amount: amount.toString(),
      isEther,
      chainId,
      networkId,
      signerAddress,
      signerBalance: balance.toString(),
      contractBalance: contractBalance.toString(),
      backendAddress,
      backendFeePercent: backendFeePercent?.toString(),
    });

    const isCelo = isCeloNetwork(chainId);

    if (isEther && !isCelo) {
      console.log(`Funding faucet ${faucetAddress} with ${amount} native tokens on chain ${chainId}`);
      // Estimate gas for fund transaction
      const gasEstimate = await provider.estimateGas({
        to: faucetAddress,
        value: amount,
        data: "0x",
      });
      const gasPrice = await provider.getGasPrice();
      const gasCost = gasEstimate * gasPrice;
      console.log("Gas estimate:", {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        gasCost: gasCost.toString(),
      });

      const tx = await signer.sendTransaction({
        to: faucetAddress,
        value: amount,
        data: "0x",
        gasLimit: gasEstimate * BigInt(12) / BigInt(10), // 20% buffer
        gasPrice,
      });
      console.log("Transaction hash:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt.hash);
      await reportTransactionToDivvi(tx.hash, chainId);
      return tx.hash;
    }

    const tokenAddress = isEther && isCelo
      ? "0x471EcE3750Da237f93B8E339c536989b8978a438" // Wrapped CELO
      : await faucetContract.token();

    if (tokenAddress === ZeroAddress) {
      throw new Error("Token address is zero, cannot proceed with ERC-20 transfer");
    }

    const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
    console.log(`Approving ${amount} ${isEther && isCelo ? "CELO" : "tokens"} for faucet ${faucetAddress}`);

    const approveData = tokenContract.interface.encodeFunctionData("approve", [faucetAddress, amount]);
    const approveDataWithReferral = appendDivviReferralData(approveData);
    const approveGasEstimate = await provider.estimateGas({
      to: tokenAddress,
      data: approveDataWithReferral,
      from: signerAddress,
    });
    const approveTx = await signer.sendTransaction({
      to: tokenAddress,
      data: approveDataWithReferral,
      gasLimit: approveGasEstimate * BigInt(12) / BigInt(10),
    });
    await approveTx.wait();
    console.log("Approve transaction confirmed:", approveTx.hash);
    await reportTransactionToDivvi(approveTx.hash, chainId);

    console.log(`Funding faucet ${faucetAddress} with ${amount} ${isEther && isCelo ? "CELO" : "tokens"}`);
    const fundData = faucetContract.interface.encodeFunctionData("fund", [amount]);
    const fundDataWithReferral = appendDivviReferralData(fundData);
    const fundGasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: fundDataWithReferral,
      from: signerAddress,
    });
    const fundTx = await signer.sendTransaction({
      to: faucetAddress,
      data: fundDataWithReferral,
      gasLimit: fundGasEstimate * BigInt(12) / BigInt(10),
    });
    const receipt = await fundTx.wait();
    console.log("Fund transaction confirmed:", receipt.hash);
    await reportTransactionToDivvi(fundTx.hash, chainId);

    return fundTx.hash;
  } catch (error: any) {
    console.error("Error funding faucet:", error);
    if (error.code === "UNSUPPORTED_OPERATION" && error.operation === "getEnsAddress") {
      throw new Error("ENS is not supported on this network. Please ensure the token address is correct.");
    }
    if (error.reason === "Must send Ether") {
      throw new Error("Contract requires native tokens. Please ensure you are sending the correct amount in the transaction.");
    }
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to fund faucet");
  }
}

// Claim tokens
export async function claimTokens(provider: BrowserProvider, faucetAddress: string, chainId: number, networkId: number): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
    const userAddress = await signer.getAddress();

    const data = faucetContract.interface.encodeFunctionData("claim", [[userAddress]]);
    const dataWithReferral = appendDivviReferralData(data);
    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
    });

    const receipt = await tx.wait();
    await reportTransactionToDivvi(tx.hash, chainId);

    return tx.hash;
  } catch (error: any) {
    console.error("Error claiming tokens:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to claim tokens");
  }
}

// Withdraw tokens
export async function withdrawTokens(
  provider: BrowserProvider,
  faucetAddress: string,
  amount: bigint,
  chainId: number,
  networkId: number
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    const data = faucetContract.interface.encodeFunctionData("withdraw", [amount]);
    const dataWithReferral = appendDivviReferralData(data);
    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
    });

    const receipt = await tx.wait();
    await reportTransactionToDivvi(tx.hash, chainId);

    return tx.hash;
  } catch (error: any) {
    console.error("Error withdrawing tokens:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to withdraw tokens");
  }
}

// Set claim parameters
export async function setClaimParameters(
  provider: BrowserProvider,
  faucetAddress: string,
  claimAmount: bigint,
  startTime: number,
  endTime: number,
  chainId: number,
  networkId: number
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    const data = faucetContract.interface.encodeFunctionData("setClaimParameters", [claimAmount, startTime, endTime]);
    const dataWithReferral = appendDivviReferralData(data);
    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
    });

    const receipt = await tx.wait();
    await reportTransactionToDivvi(tx.hash, chainId);

    return tx.hash;
  } catch (error: any) {
    console.error("Error setting claim parameters:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to set claim parameters");
  }
}

// Set whitelist
export async function setWhitelist(
  provider: BrowserProvider,
  faucetAddress: string,
  addresses: string[],
  status: boolean,
  chainId: number,
  networkId: number
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const signer = await provider.getSigner();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    const method = addresses.length > 1 ? "setWhitelistBatch" : "setWhitelist";
    const args = addresses.length > 1 ? [addresses, status] : [addresses[0], status];
    const data = faucetContract.interface.encodeFunctionData(method, args);
    const dataWithReferral = appendDivviReferralData(data);
    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
    });

    const receipt = await tx.wait();
    await reportTransactionToDivvi(tx.hash, chainId);

    return tx.hash;
  } catch (error: any) {
    console.error("Error setting whitelist:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to set whitelist");
  }
}