"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ChevronRight, Zap, Shield, Trophy, Coins, Wifi, HelpCircle, ExternalLink, MessageCircle, Bot, Network, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ── Chain config ──────────────────────────────────────────────────────────────
// TODO: fill in the three placeholder addresses below.

interface ChainMeta {
  id: number;
  label: string;
  icon: string;
  quizHub: string;
  dropsToken: string;
  explorer: string;
  wallet: string;
  gas: string;
}

const CHAINS: ChainMeta[] = [
  {
    id: 42220,
    label: "Celo",
    icon: "/celo.png",
    quizHub: "0xd73170170E002b45eA4AA51e7E93302D61c30173",
    dropsToken: "0x9825670865B896738CF8E6c98d093aD5b40F0A11", // ← TODO: Celo DROPS token address
    explorer: "https://celoscan.io/address/",
    wallet: "MiniPay",
    gas: "CELO (or cUSD via fee abstraction)",
  },
  {
    id: 677,
    label: "Botchain",
    icon: "/botc.png",
    quizHub: "0xE7F217A8447087600C1CBFb63192586edFa619fe",    // ← TODO: Botchain QuizHub address
    dropsToken: "0xBAd791F200f1F8Fb639d83125FcF732F5f6eCD03", // ← TODO: Botchain DROPS token address
    explorer: "https://scan.botchain.ai/address/",
    wallet: "any EVM wallet",
    gas: "BOTC",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

interface FAQSection {
  icon: React.ReactNode;
  title: string;
  color: string;
  items: FAQItem[];
}

// ── Bot tier table styles ─────────────────────────────────────────────────────

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
  marginTop: "8px",
};
const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  fontSize: "10px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--primary, #2563eb)",
  borderBottom: "1px solid var(--border)",
};
const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  color: "var(--muted-foreground)",
  borderBottom: "1px solid var(--border, rgba(255,255,255,0.06))",
};

// ── Data ──────────────────────────────────────────────────────────────────────

const FAQ_SECTIONS: FAQSection[] = [
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Getting Started",
    color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    items: [
      {
        q: "What is PrimeIQ?",
        a: "PrimeIQ is a quiz dueling platform built by FaucetDrops. You can challenge another human player 1v1, or take on one of five AI bot opponents in single-player mode — staking DROPS tokens and competing for on-chain rewards. PrimeIQ runs on two networks: Celo Mainnet and Botchain.",
      },
      {
        q: "Which networks does PrimeIQ support?",
        a: "Celo Mainnet (chain 42220) and Botchain (chain 677). Both networks run the full game — 1v1 duels, single-player bot mode, staking, and payouts. Each network has its own deployed QuizHub and DROPS token contracts.",
      },
      {
        q: "What wallet do I need?",
        a: "On Celo, PrimeIQ runs inside MiniPay (Opera Mini's built-in wallet) — your wallet connects automatically when you open the app, no setup required. On Botchain, connect any EVM-compatible wallet and add the Botchain network. Make sure you hold DROPS on whichever chain you're playing on (new players receive a 100 DROPS welcome bonus).",
      },
      {
        q: "What are DROPS?",
        a: "DROPS is PrimeIQ's native platform token. You use DROPS to stake in games, and winnings are minted directly to your wallet. DROPS is deployed separately on each supported network, so your Celo balance and your Botchain balance are tracked independently. You can purchase DROPS by exchanging $GoodDollar (G$) through the Buy DROPS flow, or earn them through platform rewards.",
      },
      {
        q: "How do I create a multiplayer challenge?",
        a: 'Tap "Create Challenge", pick a topic (e.g. "African History"), choose your DROPS stake amount, set visibility (Public or Private), and launch. An AI generates questions across Easy, Medium, and Hard rounds. You\'ll call createQuiz() on-chain to lock in the challenge. The minimum stake is 10 DROPS.',
      },
      {
        q: "How do I join a multiplayer challenge?",
        a: "Browse the public hub or paste a code shared by a friend. Once you join, approve the redeem() transaction in your wallet (which burns your DROPS stake), then click Ready when both players are confirmed. You need to be connected to the same network the challenge was created on.",
      },
    ],
  },
  {
    icon: <Network className="h-4 w-4" />,
    title: "Networks & Chains",
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
    items: [
      {
        q: "Can I duel someone who's on a different network?",
        a: "No. A challenge lives on the network it was created on, and both players must be connected to that same network to stake and play. If you open a challenge code while on the wrong chain, switch networks before joining.",
      },
      {
        q: "Do my DROPS carry over between Celo and Botchain?",
        a: "No — balances are per-network. DROPS you earn on Celo stay on Celo, and DROPS you earn on Botchain stay on Botchain. There is no bridge between them. Your welcome bonus is also granted per-network.",
      },
      {
        q: "Is the leaderboard shared across networks?",
        a: "Rankings are per-network — the leaderboard shows wins and duels for the chain you're viewing. Your overall profile totals combine both. Use the chain switcher on the Rankings page to compare.",
      },
      {
        q: "Do my badges carry across networks?",
        a: "Badge progress is tracked from your total games played, so playing on either network counts toward unlocking the Rematch Badge and the Redeem Badge.",
      },
      {
        q: "Is single-player bot mode available on both networks?",
        a: "Yes — all five bot tiers run on both Celo and Botchain, with bot wallets funded on each network.",
      },
      {
        q: "How do I switch networks?",
        a: "On Botchain, switch chains in your wallet and the app will follow. On Celo via MiniPay, the app is fixed to Celo Mainnet — MiniPay does not support switching to Botchain.",
      },
    ],
  },
  {
    icon: <Bot className="h-4 w-4" />,
    title: "Single-Player Mode",
    color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    items: [
      {
        q: "What is single-player mode?",
        a: "Single-player mode lets you compete against an AI-powered bot opponent instead of a human. Choose a difficulty tier, stake your DROPS, and play — no waiting for an opponent. All payouts are settled on-chain just like multiplayer, on whichever network you're connected to.",
      },
      {
        q: "What are the difficulty tiers?",
        a: (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Bot</th>
                <th style={thStyle}>Stake</th>
                <th style={thStyle}>Questions</th>
                <th style={thStyle}>Bot Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1 — Easiest", "Droplet 💧", "10 DROPS", "15", "~25%"],
                ["2", "Drizzle 🌦", "20 DROPS", "18", "~42%"],
                ["3", "Downpour 🌧", "30 DROPS", "21", "~58%"],
                ["4", "Torrent ⛈", "40 DROPS", "24", "~72%"],
                ["5 — Hardest", "Flood 🌊", "50 DROPS", "30", "~87%"],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ ...tdStyle, borderBottom: i === 4 ? "none" : tdStyle.borderBottom }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ),
      },
      {
        q: "How does the bot play?",
        a: "Each bot tier has a set base accuracy (chance of picking the correct answer) and answer speed. Higher tiers answer faster and more accurately, earning more speed-bonus points. A small mid-game nudge (±8%) adjusts bot accuracy slightly based on the score gap, keeping games from snowballing.",
      },
      {
        q: "What happens to my stake in single-player mode?",
        a: "When you create a single-player game, you call createQuiz() on-chain and redeem() to burn your DROPS stake. The resolver then calls registerQuiz(), and the bot wallet calls redeem() on-chain to burn its own DROPS stake for real. After the game, the resolver mints the payout directly to the winner's wallet.",
      },
      {
        q: "What are the single-player payouts?",
        a: "If you win, 2× your stake is minted to your wallet. If it's a tie, your full stake is refunded. If the bot wins, 2× the stake goes to the bot's platform wallet — no payout to you.",
      },
      {
        q: "Which pouch do solo winnings go to?",
        a: "Wins against Droplet and Drizzle (tiers 1–2) credit your Game Pouch. Wins against Downpour, Torrent, and Flood (tiers 3–5) credit your Reward Pouch instead — the harder tiers pay into the balance you can redeem for $GoodDollar. Tie refunds always return to the Game Pouch.",
      },
      {
        q: "Can I choose my own topic in single-player mode?",
        a: "Yes — single-player mode uses the same AI question generation as multiplayer. Enter any topic you like and the AI will generate questions scaled to the question count for that difficulty tier.",
      },
    ],
  },
  {
    icon: <Coins className="h-4 w-4" />,
    title: "DROPS & Staking",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    items: [
      {
        q: "How do I get DROPS?",
        a: "New players receive 100 DROPS as a one-time welcome bonus on each supported network. You can also buy DROPS by exchanging $GoodDollar (G$) through the Buy DROPS flow in the app. DROPS can also be earned through platform rewards and game wins.",
      },
      {
        q: "What is the DROPS burn/mint model?",
        a: "When you stake in a game, your DROPS are burned via the redeem() function on the DROPS token contract. When you win (or receive a tie refund), the equivalent DROPS are minted to your wallet via mintTo(). This keeps the token supply balanced around active gameplay on each network.",
      },
      {
        q: "What are game_drops vs reward_drops?",
        a: "game_drops (Game Pouch) is the balance used for staking in duels — 1v1 wins, ties, and solo wins against tiers 1–2 credit this pouch. reward_drops (Reward Pouch) can be redeemed for $GoodDollar (G$) via the DropsRedeemPool contract, and is credited by platform rewards and solo wins against tiers 3–5. Both pouches are tracked per network.",
      },
      {
        q: "What's the minimum stake?",
        a: "10 DROPS. Until you've earned the Rematch Badge, your stake is fixed at exactly 10 DROPS — the badge is what unlocks custom stake amounts.",
      },
      {
        q: "When do I receive my DROPS after winning?",
        a: "In multiplayer mode, a Claim Reward button appears on the results screen after the resolver calls setWinner(). Tap it to trigger the on-chain claim and receive your DROPS. In single-player mode, the payout is minted directly after the game ends — no separate claim needed.",
      },
      {
        q: "What happens in a tie?",
        a: "In multiplayer, the resolver calls declareTie() and both players' stakes are minted back to their wallets via the pending claims system. In single-player, a tie refunds your full stake directly.",
      },
      {
        q: "Can I redeem DROPS for real value?",
        a: "Yes — reward_drops can be staked in the DropsRedeemPool contract to earn $GoodDollar (G$) with an APY bonus. The redeem flow burns your reward_drops and opens a stake that matures over a set period. You need the Redeem Badge to access redeem-pool actions.",
      },
    ],
  },
  {
    icon: <Trophy className="h-4 w-4" />,
    title: "Badges & Progression",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    items: [
      {
        q: "What is the Rematch Badge?",
        a: "You earn the Rematch Badge after 10 total games — solo or 1v1, on either network. It unlocks rematches, custom stake amounts above the 10 DROPS minimum, and stake negotiation in the pre-lobby.",
      },
      {
        q: "What is the Redeem Badge?",
        a: "You earn the Redeem Badge after 10 qualifying games. A qualifying game is a 1v1 duel or a solo game against difficulty 3 or higher (Downpour, Torrent, Flood). Easy-tier solo games don't count. The badge unlocks all redeem-pool actions.",
      },
      {
        q: "Why can't I set my own stake amount yet?",
        a: "Until you have the Rematch Badge, every challenge you create is fixed at the 10 DROPS minimum. This keeps new accounts from opening high-stake games before they've played. Your progress toward the badge is shown on your profile.",
      },
      {
        q: "What are the player tiers?",
        a: "Tiers are cosmetic rankings based on total wins: Droplet (0–100), Drizzle (101–200), Downpour (201–300), Torrent (301–400), and Flood (401+). Higher tiers also earn a better APY rate when staking reward_drops in the redeem pool.",
      },
    ],
  },
  {
    icon: <Trophy className="h-4 w-4" />,
    title: "Gameplay",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    items: [
      {
        q: "How are questions generated?",
        a: "Questions are generated by AI (Gemini 2.5 Flash, with Groq as fallback) based on the topic you provide. Each game has 3 rounds — Easy, Medium, and Hard — with questions spread across them. The total question count depends on the mode: multiplayer uses 15 by default; single-player ranges from 15 (Droplet) to 30 (Flood).",
      },
      {
        q: "How is scoring calculated?",
        a: "Correct answers earn 500 base points plus up to 500 speed bonus points. Answering instantly earns the full 1000; answering at the last second earns 500. Wrong or unanswered questions score 0. Bots at higher tiers earn more speed bonus per correct answer.",
      },
      {
        q: "What are the time limits per round?",
        a: "Easy: 7 seconds per question. Medium: 10 seconds. Hard: 13 seconds.",
      },
      {
        q: "Can I rematch after a multiplayer duel?",
        a: "Yes — after a multiplayer game ends, tap Request Rematch. Your opponent has 30 seconds to accept. If they do, a new challenge is created with the same topic and stake. Both players need the Rematch Badge (10 games each) before rematching is available.",
      },
      {
        q: "Is there a pre-lobby stake negotiation in multiplayer?",
        a: "Yes — when entering a multiplayer pre-lobby, you can accept the creator's stake or propose a different DROPS amount. The creator can counter, and you can counter back. Once both sides agree and the stake is locked, no changes can be made. Negotiation is only available once both players hold the Rematch Badge.",
      },
    ],
  },
  {
    icon: <Shield className="h-4 w-4" />,
    title: "Security & Smart Contracts",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    items: [
      {
        q: "Are my staked DROPS safe?",
        a: "Stakes are committed via the DROPS token contract and resolved by the QuizHub contract on the network you're playing on. The resolver wallet can only call designated resolution functions (setWinner, declareTie, confirmBurn, mintTo) — it cannot arbitrarily withdraw or redirect funds.",
      },
      {
        q: "Who resolves game outcomes on-chain?",
        a: "A resolver wallet operated by PrimeIQ calls the resolution functions after game logic confirms a result. In multiplayer, setWinner() or declareTie() is called. In single-player, the resolver handles registerQuiz(), confirmBurn() for both sides, and then mints the payout. Each network has its own resolver.",
      },
      {
        q: "What if my opponent disconnects mid-multiplayer game?",
        a: "There is a 60-second grace period for reconnection, with a visible countdown. If the opponent doesn't return in time, you win by forfeit and the resolver settles the game on-chain normally.",
      },
      {
        q: "What if a challenge expires before my opponent joins?",
        a: "A challenge that never gets registered on-chain goes stale after 2 hours of inactivity and is cancelled automatically, with any staked DROPS refunded. Once a challenge is registered on-chain, both players have a 2-hour burn window to stake — after that, any participant can cancel it and staked DROPS are refunded.",
      },
      {
        q: "Are the bot wallets real wallets?",
        a: "Yes — each bot tier has a dedicated wallet address on each supported network with real DROPS. When a game starts, the bot calls redeem() on-chain to burn its stake just like a human player. When the bot wins, the payout is minted to its wallet on-chain. Bot private keys are held securely as server-side environment secrets and are never exposed to clients.",
      },
    ],
  },
  {
    icon: <Wifi className="h-4 w-4" />,
    title: "Technical Issues",
    color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    items: [
      {
        q: "My stake transaction failed — what do I do?",
        a: 'If your redeem() transaction was signed but the game didn\'t register it, use the "Already staked? Sync my stake" option on the lobby screen. This reads your burn event directly from the chain and syncs it without a new transaction.',
      },
      {
        q: "I staked but the game won't start.",
        a: "Both players must stake AND click Ready before a multiplayer game starts. If your status shows \"Stake verified\", just click Ready. If it still shows \"Awaiting stake\", try the Sync button to re-check the chain.",
      },
      {
        q: "The single-player game isn't starting after I staked.",
        a: "After your createQuiz() and redeem() transactions confirm, the backend needs to call registerQuiz() and complete the bot's stake. This typically takes a few seconds. If the game still hasn't started after 30 seconds, refresh the page and check your challenge history.",
      },
      {
        q: "I'm on the wrong network.",
        a: "If a challenge won't load or your DROPS balance shows zero unexpectedly, check which network you're connected to. Challenges and balances are per-network — a Celo challenge won't open while your wallet is on Botchain, and vice versa.",
      },
      {
        q: "My balance is different from what the leaderboard shows.",
        a: "Leaderboard stats and profile stats both read per-network totals, so make sure you're comparing the same chain. If the numbers still disagree after a refresh, contact support with your wallet address.",
      },
      {
        q: "The app shows 'Permission denied' when trying to transact.",
        a: "On Celo, this usually means MiniPay hasn't authorised the transaction yet — close and reopen the app inside MiniPay (not a regular browser), then try again. On Botchain, check your wallet has the network added and enough gas. Either way, make sure your DROPS balance covers the stake.",
      },
      {
        q: "The lobby isn't updating or I can't see my opponent.",
        a: "Tap the refresh icon (↻) in the lobby to manually pull the latest state. If that doesn't help, close and reopen the challenge link.",
      },
      {
        q: "My claim button isn't working after a win.",
        a: "Claim transactions require the resolver to have already called setWinner() or declareTie() on-chain. If the button appears but the transaction fails, wait a few seconds for the resolver confirmation to propagate and try again. Contact support if the issue persists more than a minute.",
      },
    ],
  },
];

// ── FAQ Accordion Item ────────────────────────────────────────────────────────

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "rounded-2xl border transition-all duration-200 overflow-hidden",
            open === i
              ? "border-primary/30 bg-primary/5"
              : "border-border bg-card hover:border-primary/20",
          )}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left"
          >
            <span className="text-sm font-bold text-foreground leading-snug flex-1">{item.q}</span>
            <span className="shrink-0 mt-0.5 text-muted-foreground">
              {open === i
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
              }
            </span>
          </button>
          {open === i && (
            <div className="px-4 pb-4">
              {typeof item.a === "string"
                ? <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                : <div className="text-sm text-muted-foreground leading-relaxed">{item.a}</div>
              }
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Contracts card with chain switcher ────────────────────────────────────────

function ContractRow({ label, address, explorer }: { label: string; address: string; explorer: string }) {
  const missing = !address.startsWith("0x") || address.length < 10;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="font-mono text-xs text-foreground break-all">
          {missing ? "Coming soon" : address}
        </p>
      </div>
      {!missing && (
        <a
          href={`${explorer}${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary hover:opacity-70 transition-opacity pt-5"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function ContractsCard() {
  const [activeId, setActiveId] = useState<number>(CHAINS[0].id);
  const chain = CHAINS.find(c => c.id === activeId)!;

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border space-y-3">
        <h3 className="font-black text-foreground text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-500" /> Smart Contracts
        </h3>
        <div className="flex gap-2">
          {CHAINS.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-colors",
                activeId === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground",
              )}
            >
              <img src={c.icon} alt="" className="w-3.5 h-3.5 rounded-sm" />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <ContractRow label="QuizHub Contract" address={chain.quizHub} explorer={chain.explorer} />
        <ContractRow label="DROPS Token" address={chain.dropsToken} explorer={chain.explorer} />

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Chain ID</p>
            <p className="font-mono text-xs text-foreground">{chain.id}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Gas Token</p>
            <p className="font-mono text-xs text-foreground">{chain.gas}</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          All stakes, wins, ties, and refunds on {chain.label} flow through this contract. The
          resolver can only call{" "}
          <code className="bg-muted px-1 rounded text-[10px]">registerQuiz</code>,{" "}
          <code className="bg-muted px-1 rounded text-[10px]">confirmBurn</code>,{" "}
          <code className="bg-muted px-1 rounded text-[10px]">setWinner</code>,{" "}
          <code className="bg-muted px-1 rounded text-[10px]">declareTie</code>, and{" "}
          <code className="bg-muted px-1 rounded text-[10px]">mintTo</code> — it cannot withdraw
          funds directly. Access {chain.label} with {chain.wallet}.
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card hover:bg-muted transition-colors active:scale-95 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <HelpCircle className="h-5 w-5 text-primary shrink-0" />
          <h1 className="font-black text-foreground text-base">Support & FAQ</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-3 pt-2">
          <div className="text-5xl">🧠</div>
          <div>
            <h2 className="text-2xl font-black text-foreground">How can we help?</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
              Everything you need to know about PrimeIQ — DROPS staking, single-player bots,
              multiplayer duels, and troubleshooting.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {CHAINS.map(c => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card text-[11px] font-bold text-muted-foreground"
              >
                <img src={c.icon} alt="" className="w-3 h-3 rounded-sm" />
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* Mode overview cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="text-2xl">⚔️</div>
            <p className="font-black text-foreground text-sm">Multiplayer</p>
            <p className="text-xs text-muted-foreground">1v1 human duels · stake DROPS · claim on-chain</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="text-2xl">🤖</div>
            <p className="font-black text-foreground text-sm">Single-Player</p>
            <p className="text-xs text-muted-foreground">5 bot tiers · instant start · auto payout</p>
          </div>
        </div>
            {/* Play CTA */}
        <button
          onClick={() => router.push("/challenge")}
          className="w-full rounded-3xl border-2 border-primary/20 bg-primary/5 p-5 flex items-center gap-4 text-left hover:bg-primary/10 transition-all active:scale-[0.99]"
        >
          <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Swords className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-foreground text-sm">Start a duel</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stake DROPS, race AI-generated questions, win on-chain.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>

        {/* FAQ Sections */}
        {FAQ_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn("flex items-center justify-center w-7 h-7 rounded-xl border text-xs font-black", section.color)}>
                {section.icon}
              </span>
              <h3 className="font-black text-foreground text-base">{section.title}</h3>
            </div>
            <FAQAccordion items={section.items} />
          </section>
        ))}

        {/* Contract info */}
        <ContractsCard />

        {/* Contact */}
        <div className="rounded-3xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-4">
          <div className="text-3xl">💬</div>
          <div>
            <h3 className="font-black text-foreground">Still need help?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Reach us directly — we typically respond within a few hours.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href="https://t.me/faucetdropschat"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all active:scale-[0.99]"
            >
              <MessageCircle className="h-4 w-4" /> Telegram Support
            </a>
            <a
              href="mailto:drops.faucet@gmail.com"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-border bg-card text-foreground font-black text-sm hover:bg-muted transition-all active:scale-[0.99]"
            >
              ✉️ Email Us
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}