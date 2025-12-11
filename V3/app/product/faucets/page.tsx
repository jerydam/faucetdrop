import React from 'react'

export default function page() {
  return (
    <div>
        Page 1: Open Drop
Theme: Speed, Accessibility, and Event Engagement.

[Hero Section]
Open Drop: Instant Engagement via Drop-Code
Distribute tokens securely in seconds using a unique 6-character access code.

Perfect for live events, AMAs, and fast community onboarding. Eliminate the hassle of collecting wallet addresses manually while maintaining security.


[Key Features]
Simple Access Control: Users only need a simple 6-character code to claim. No complex whitelisting required.

Sybil-Resistant: Powered by Self Protocol, our ZK-powered identity verification ensures only real humans claim—even in an open drop.

Social Gating: Optional: Require Twitter follows or Telegram joins before the code is revealed.

Cross-Chain Ready: Deploy on Celo, Lisk, Arbitrum, Base, and more.

[How It Works]
Set Your Budget: Deposit the total amount of tokens or ETH/stablecoins.

Generate Code: The system creates a unique 6-character Drop-Code.

Share Live: Announce the code during your conference, stream, or hackathon.

Instant Claims: Attendees enter the code and claim gaslessly.

[USE CASES]
Live Conferences: &quot;Enter code &apos;HELLO&apos; to claim your attendance badge/token.&apos;

Twitter Spaces/AMAs: Reward listeners who stay until the end to hear the code.

Flash Campaigns: Time-sensitive marketing drives.


Page 2: Whitelist Drop
Theme: Exclusivity, Security, and Loyalty.

[Hero Section]
Whitelist Drop: Precision Rewards for Your Community
Reward specific wallets with absolute precision. Only approved addresses can claim.

Ensure your tokens go exactly where they are intended. Ideal for DAO payouts, early adopter rewards, and token-gated communities.

[Button: Create Whitelist Drop] [Button: Manage Lists]

[Key Features]
Closed Security: If a wallet isn&apos;t on your list, they cannot claim.

Bulk Uploads: Easily upload CSVs of wallet addresses to authorize hundreds of users in one click.

Gasless Claiming: Whitelisted users claim their allocated tokens without paying gas fees.

Claim Tracking: Monitor exactly who has claimed their allocation and who hasn&apos;t.

[How It Works]
Define the List: Upload your list of eligible wallet addresses (e.g., DAO members, NFT holders).

Set Allocation: Determine the fixed amount each whitelisted address receives.

Activate: The drop goes live.

Secure Claim: Users connect their fir wallets; the contract verifies their eligibility and releases funds.

[USE CASES]
DAO Distributions: Monthly rewards for active governance members.

Mainnet Incentives: Distribute tokens securely to approved developers and users.




Page 3: Custom Drop
Theme: Flexibility, Logic, and Complex Distribution.

[Hero Section]
Custom Drop: Advanced Distribution Architecture
Fully customizable engine for complex payout logic and variable amounts.

Break free from &quot;one-size-fits-all.&quot; Assign unique token amounts to specific users based on contribution, tier, or rank in a single transaction.

[Button: Configure Custom Drop]

[Key Features]
Variable Payouts: Unlike standard drops, User A can receive 100 tokens while User B receives 500 tokens within the same campaign.

Developer-Friendly: Utilizing a Factory + Instance pattern for scalable smart contract deployment.

Batch Updates: Optimize gas by updating custom amounts and beneficiaries in batches.

Full Admin Control: Reset claims, modify amounts, or withdraw unclaimed funds post-campaign.

[How It Works]
Map Your Logic: Define your distribution hierarchy (e.g., 1st Place: $500, 2nd Place: $250, Participants: $50).

Configure Contract: Input specific wallet-to-amount mappings.

Fund & Lock: Deposit the total required assets (ETH, ERC20, or Stablecoins).

Granular Distribution: Users claim their specific, pre-assigned amounts securely.

[USE CASES]
Hackathon Prizes: Automate tiered prize payouts (1st, 2nd, 3rd place).

Payroll & Grants: Distribute varying salary or grant amounts to contributors.

Gamified Rewards: Distribute tokens based on points earned or leaderboard position.
    </div>
  )
}
