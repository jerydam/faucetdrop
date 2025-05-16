// src/lib/faucetXProfileLinks.ts

// Hardcoded mapping of faucet addresses to X profile links
export const faucetXProfileLinks: Record<string, string> = {
    // Example faucet addresses (replace with actual addresses)
    "0x1234567890abcdef1234567890abcdef12345678": "https://x.com/Faucetdrops",
    "0xabcdef1234567890abcdef1234567890abcdef12": "https://x.com/jerydam00",
    // Add new faucet addresses and their X profile links here
  };
  
  // Function to get X profile link for a faucet address
  export function getFaucetXProfileLink(faucetAddress: string): string | undefined {
    return faucetXProfileLinks[faucetAddress.toLowerCase()];
  }