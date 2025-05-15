import http from "http";
import { URL } from "url";
import { ethers } from "ethers";
import dotenv from "dotenv";

// Initialize environment variables
dotenv.config();

// Environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY; 
const RPC_URL = process.env.RPC_URL;

const provider = new ethers.JsonRpcProvider(RPC_URL);

// ABI remains unchanged
const FAUCET_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "claimAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      }
    ],
    "name": "ClaimParametersUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Claimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "faucet",
        "type": "address"
      }
    ],
    "name": "FaucetCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "funder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "backendFee",
        "type": "uint256"
      }
    ],
    "name": "Funded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "status",
        "type": "bool"
      }
    ],
    "name": "WhitelistUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Withdrawn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BACKEND",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BACKEND_FEE_PERCENT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "users",
        "type": "address[]"
      }
    ],
    "name": "claimForBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "endTime",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "fund",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFaucetBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasClaimed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isClaimActive",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isWhitelisted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "users",
        "type": "address[]"
      }
    ],
    "name": "resetClaimed",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_claimAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_endTime",
        "type": "uint256"
      }
    ],
    "name": "setClaimParameters",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "status",
        "type": "bool"
      }
    ],
    "name": "setWhitelist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "users",
        "type": "address[]"
      },
      {
        "internalType": "bool",
        "name": "status",
        "type": "bool"
      }
    ],
    "name": "setWhitelistBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "startTime",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
];


// Define interfaces
interface ClaimRequestBody {
  userAddress: string;
  faucetAddress: string;
  shouldWhitelist?: boolean;
}

interface ResponseData {
  [key: string]: any;
}

// Helper function to parse JSON body from requests
const parseJSONBody = async (req: http.IncomingMessage): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const parsedBody = body ? JSON.parse(body) : {};
        resolve(parsedBody);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', (error: Error) => {
      reject(error);
    });
  });
};

// Helper function to handle API responses
const sendResponse = (res: http.ServerResponse, statusCode: number, data: ResponseData): void => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

// Create HTTP server
const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse the URL
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Health check endpoint
  if (pathname === '/health' && req.method === 'GET') {
    sendResponse(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  // Claim tokens endpoint
  if (pathname === '/claim' && req.method === 'POST') {
    try {
      const body = await parseJSONBody(req) as ClaimRequestBody;
      const { userAddress, faucetAddress, shouldWhitelist } = body;

      if (!ethers.isAddress(userAddress) || !ethers.isAddress(faucetAddress)) {
        console.error(`Invalid address - userAddress: ${userAddress}, faucetAddress: ${faucetAddress}`);
        sendResponse(res, 400, { error: "Invalid userAddress or faucetAddress" });
        return;
      }

      // Validate environment variables
      if (!PRIVATE_KEY || !RPC_URL) {
        console.error("Missing environment variables: PRIVATE_KEY or RPC_URL");
        sendResponse(res, 500, { error: "Server configuration error: Missing PRIVATE_KEY or RPC_URL" });
        return;
      }

      try {
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        const faucetContract = new ethers.Contract(faucetAddress, FAUCET_ABI, signer);

        // First handle whitelisting if requested - removed the early check for whitelisting
        if (shouldWhitelist) {
          try {
            console.log(`Whitelisting user: ${userAddress}`);
            const whitelistTx = await faucetContract.setWhitelist(userAddress, true);
            await whitelistTx.wait();
            console.log(`Whitelist successful, tx: ${whitelistTx.hash}`);
          } catch (whitelistError) {
            const error = whitelistError as { message: string };
            console.error(`Failed to whitelist user ${userAddress}: ${error.message}`);
            sendResponse(res, 500, { error: `Failed to whitelist user: ${error.message}` });
            return;
          }
        }

        // Now check if user is whitelisted - this check happens after the whitelisting attempt
        const isWhitelisted = await faucetContract.isWhitelisted(userAddress);
        if (!isWhitelisted) {
          console.error(`User ${userAddress} is not whitelisted for faucet ${faucetAddress}`);
          sendResponse(res, 403, { error: "User is not whitelisted" });
          return;
        }

        try {
          console.log(`Claiming tokens for user: ${userAddress}`);
          const claimTx = await faucetContract.claimForBatch([userAddress]);
          await claimTx.wait();
          console.log(`Claim successful, tx: ${claimTx.hash}`);
          sendResponse(res, 200, { success: true, txHash: claimTx.hash });
        } catch (claimError) {
          const error = claimError as { message: string };
          console.error(`Failed to claim tokens for ${userAddress}: ${error.message}`);
          sendResponse(res, 500, { error: `Failed to claim tokens: ${error.message}` });
        }
      } catch (error) {
        const err = error as { message: string };
        console.error(`Server error in /claim for user ${userAddress}: ${err.message}`);
        sendResponse(res, 500, { error: `Server error: ${err.message}` });
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
    return;
  }

  // Handle 404 for any other routes
  sendResponse(res, 404, { error: 'Not Found' });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for serverless environments
export default server;