"use client";
import React, { useState } from "react";
import TableOfContents from "./toc";
import { QuizFaq } from "./components/faq";
import Image from "next/image";

// ─── Section configs ──────────────────────────────────────────────────────────

const quizSections = [
  { id: "quiz-hero",          title: "Quizzes" },
  { id: "quiz-how-it-works",  title: "How Quizzes Work" },
  { id: "quiz-scoring",       title: "Scoring Mechanics" },
  { id: "quiz-reward-models", title: "Reward Distribution" },
  { id: "quiz-creation",      title: "Creation & Tools" },
  { id: "quiz-faq",           title: "FAQ" },
];

const challengeSections = [
  { id: "ch-hero",       title: "1v1 Challenge" },
  { id: "ch-flow",       title: "How Challenges Work" },
  { id: "ch-drops",      title: "DROPS & Stakes" },
  { id: "ch-badge",      title: "Rematch Badge" },
  { id: "ch-tiers",      title: "Player Tiers & APY" },
  { id: "ch-redeem",     title: "Redeem & Stake" },
  { id: "ch-scoring",    title: "Scoring" },
  { id: "ch-faq",        title: "FAQ" },
];

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
      {children}
    </h2>
  );
}

function StepList({ items }: { items: { title: string; desc: string }[] }) {
  return (
    <ol className="space-y-6">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold text-sm">
            {i + 1}
          </div>
          <div>
            <h3 className="font-semibold text-white">{item.title}</h3>
            <p className="text-gray-300 text-sm mt-0.5">{item.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function InfoCard({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700">
      <span className="text-3xl mb-4 block">{emoji}</span>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  );
}

function Badge({
  label,
  color = "blue",
}: {
  label: string;
  color?: "blue" | "amber" | "emerald" | "violet" | "rose";
}) {
  const map: Record<string, string> = {
    blue:    "bg-blue-900/40 text-blue-300 border-blue-700",
    amber:   "bg-amber-900/40 text-amber-300 border-amber-700",
    emerald: "bg-emerald-900/40 text-emerald-300 border-emerald-700",
    violet:  "bg-violet-900/40 text-violet-300 border-violet-700",
    rose:    "bg-rose-900/40 text-rose-300 border-rose-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${map[color]}`}>
      {label}
    </span>
  );
}

// ─── Challenge FAQ ────────────────────────────────────────────────────────────

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function ChallengeFaq() {
  const items = [
    {
      q: "How do I create a 1v1 Challenge?",
      a: "Go to the Challenge section and click 'Create Challenge'. Pick a topic, set your stake amount (minimum 10 DROPS), choose public or private, and confirm on-chain. Your opponent can join via code or public lobby.",
    },
    {
      q: "What are DROPS and where do I get them?",
      a: "DROPS are the native point token for ZClash. Every new player receives 100 DROPS on registration. You can also buy DROPS with GoodDollar ($G) at a rate of 100 DROPS per $1 worth of $G. Winning games earns DROPS into your Reward Pouch.",
    },
    {
      q: "What is the difference between Game DROPS and Reward DROPS?",
      a: "Game DROPS (from welcome bonus or purchases) can only be used to play games. Reward DROPS (earned by winning games) can be redeemed for $G or staked to earn APY.",
    },
    {
      q: "What is the Rematch Badge?",
      a: "After completing 10 games you earn the Rematch Badge. This removes the 10 DROPS stake cap, lets you negotiate any amount freely, and allows you to rematch the same opponent.",
    },
    {
      q: "What happens if my opponent disconnects?",
      a: "Your opponent gets a 60-second reconnect window. If they don't return, you automatically win by forfeit and receive the full stake payout.",
    },
    {
      q: "How does the redeem split work?",
      a: "When you redeem Reward DROPS: 75% of the value goes to you in $G, 25% is auto-staked for 30 days at your tier APY. A 10% service fee on the 75% is covered by the pool — not deducted from your share.",
    },
    {
      q: "When I claim my stake, what do I get back?",
      a: "You receive two things: the APY earnings in $G (paid by the pool), and your staked capital returned as DROPS (minted back to your wallet). The DROPS go into your Game Pouch for future games.",
    },
    {
      q: "Can I have multiple stakes running at once?",
      a: "Yes. Every redeem creates a new independent stake entry. You can have many concurrent stakes, each with its own 30-day maturity and APY rate snapshot.",
    },
  ];

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue="faq-0">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`faq-${i}`}>
          <AccordionTrigger className="text-base text-left">{item.q}</AccordionTrigger>
          <AccordionContent className="text-gray-300 text-sm leading-relaxed">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// ─── Challenge tab content ────────────────────────────────────────────────────

function ChallengeContent() {
  return (
    <div className="space-y-16">

      {/* Hero */}
      <section id="ch-hero" className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            1v1 Challenge
          </h1>
          <p className="text-2xl text-gray-300">Stake. Play. Earn. On every question.</p>
          <p className="text-lg text-gray-400">
            Go head-to-head against another player in a live 3-round quiz. Both players stake DROPS before the game — the winner takes all, settled entirely on-chain with no trusted third party.
          </p>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Rounds",        value: "3" },
            { label: "Min Stake",     value: "10 DROPS" },
            { label: "Winner Gets",   value: "2× Stake" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => window.open("https://app.faucetdrops.io/challenge", "_blank")}
          className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
        >
          Start a Challenge
        </button>
      </section>

      {/* How it works */}
      <section id="ch-flow" className="space-y-6">
        <SectionHeading>How Challenges Work</SectionHeading>

        <div className="space-y-3">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Creator side</p>
          <StepList items={[
            {
              title: "Create & anchor on-chain",
              desc: "Set a topic, stake amount (min 10 DROPS), and visibility (public or private invite). Your wallet calls QuizHub.createQuiz() — the quiz is now anchored on-chain.",
            },
            {
              title: "Pre-lobby negotiation",
              desc: "Challengers can submit stake offers. You see all offers and can counter any of them. Once you accept, the agreed stake is locked — no more changes.",
            },
            {
              title: "Burn your stake",
              desc: "Call DropsToken.redeem(amount, quizCode) to burn your DROPS. The backend verifies and confirms your burn on-chain. Your opponent does the same.",
            },
            {
              title: "Mark ready & play",
              desc: "Once both players are verified and ready, the game starts automatically. Three rounds — Easy, Medium, Hard — each with a time limit per question.",
            },
          ]} />
        </div>

        <div className="space-y-3 mt-8">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">After the game</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-5">
              <p className="font-semibold text-emerald-300 mb-2">🏆 Winner</p>
              <p className="text-sm text-gray-300">
                Backend calls <code className="text-xs bg-gray-800 px-1 rounded">QuizHub.setWinner()</code> then mints <strong>2× stake</strong> in DROPS to the winner's Reward Pouch.
              </p>
            </div>
            <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-5">
              <p className="font-semibold text-blue-300 mb-2">🤝 Tie</p>
              <p className="text-sm text-gray-300">
                Backend calls <code className="text-xs bg-gray-800 px-1 rounded">QuizHub.declareTie()</code> then mints each player's original stake back to their Reward Pouch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DROPS & Stakes */}
      <section id="ch-drops" className="space-y-6">
        <SectionHeading>DROPS & Stakes</SectionHeading>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
          <p className="text-gray-300">
            DROPS is the native ZClash token. It cannot be transferred — only minted (<code className="text-xs bg-gray-900 px-1 rounded">claim</code>) and burned (<code className="text-xs bg-gray-900 px-1 rounded">redeem</code>). This means all movement is traceable and manipulation-resistant.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-gray-900/60 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎮</span>
                <span className="font-semibold text-white">Game DROPS</span>
                <Badge label="Play only" color="blue" />
              </div>
              <p className="text-sm text-gray-400">
                Received as welcome bonus (100 on signup) or purchased with $G. Can only be used to stake in games. Cannot be redeemed or staked for APY.
              </p>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <span className="font-semibold text-white">Reward DROPS</span>
                <Badge label="Redeemable" color="emerald" />
              </div>
              <p className="text-sm text-gray-400">
                Earned only by winning or tying games. Can be redeemed for $G or staked for APY. Requires completing 10 games to unlock redeem.
              </p>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-200">
              <strong>Buy DROPS:</strong> Send GoodDollar ($G) to the service address. Rate is <strong>100 DROPS = $1 worth of $G</strong> at the live $G price. Backend mints the equivalent to your Game DROPS balance.
            </p>
          </div>
        </div>
      </section>

      {/* Rematch Badge */}
      <section id="ch-badge" className="space-y-6">
        <SectionHeading>Rematch Badge</SectionHeading>

        <div className="relative bg-gradient-to-br from-amber-900/20 to-gray-900 border border-amber-700/40 rounded-2xl p-6 overflow-hidden">
          <div className="absolute top-4 right-4 text-4xl opacity-20">🏅</div>
          <h3 className="text-lg font-bold text-amber-300 mb-3">Unlocked after 10 games</h3>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { before: "Max 10 DROPS per game",     after: "Any stake amount",             icon: "🔓" },
              { before: "No rematches allowed",       after: "Rematch same opponent",         icon: "🔄" },
              { before: "Fixed stake only",           after: "Negotiate freely in pre-lobby", icon: "💬" },
              { before: "Reward DROPS locked",        after: "Redeem Reward DROPS for $G",    icon: "💸" },
            ].map((row, i) => (
              <div key={i} className="flex gap-3 bg-gray-900/50 rounded-lg p-3">
                <span className="text-xl shrink-0">{row.icon}</span>
                <div className="text-sm">
                  <p className="text-gray-500 line-through">{row.before}</p>
                  <p className="text-white font-medium">{row.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section id="ch-tiers" className="space-y-6">
        <SectionHeading>Player Tiers & Stake APY</SectionHeading>
        <p className="text-gray-300">
          Your tier is based on total games played and determines the flat APY you earn on staked Reward DROPS over 30 days.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Tier</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Games Played</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Stake APY (30-day flat)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Droplet",  emoji: "💧", range: "0 – 50",   apy: "15%",  color: "text-blue-300" },
                { name: "Drizzle",  emoji: "🌧️",  range: "51 – 150", apy: "20%",  color: "text-cyan-300" },
                { name: "Downpour", emoji: "⛈️",  range: "151 – 300",apy: "25%",  color: "text-violet-300" },
                { name: "Torrent",  emoji: "🌊", range: "301 – 500",apy: "30%",  color: "text-indigo-300" },
                { name: "Flood",    emoji: "🌀", range: "501+",     apy: "35%",  color: "text-amber-300" },
              ].map((tier) => (
                <tr key={tier.name} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${tier.color}`}>{tier.emoji} {tier.name}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{tier.range}</td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${tier.color}`}>{tier.apy}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-400">
          APY is snapshotted at the moment of each redeem, so if you tier up mid-cycle, your new stakes earn the higher rate.
        </div>
      </section>

      {/* Redeem & Stake */}
      <section id="ch-redeem" className="space-y-6">
        <SectionHeading>Redeem & Stake</SectionHeading>

        <div className="space-y-6">
          {/* Redeem flow */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-white text-lg">Redeeming Reward DROPS → $G</h3>
            <p className="text-sm text-gray-400">
              Requires the Rematch Badge (10 games). DROPS are burned on-chain; $G is paid from the pool.
            </p>

            <div className="space-y-2">
              {[
                {
                  label: "75% → You (in $G)",
                  desc: "Full 75% of the DROPS value paid to your wallet in GoodDollar at the live $G/USD price.",
                  color: "border-emerald-600",
                  badge: <Badge label="You receive" color="emerald" />,
                },
                {
                  label: "10% service fee",
                  desc: "10% of the 75% leg is deducted from the pool — not from your share. The pool covers it.",
                  color: "border-gray-600",
                  badge: <Badge label="From pool" color="blue" />,
                },
                {
                  label: "25% → Auto-staked",
                  desc: "25% minted as DROPS to the pool contract and locked as your capital stake for 30 days.",
                  color: "border-violet-600",
                  badge: <Badge label="Staked" color="violet" />,
                },
              ].map((row) => (
                <div key={row.label} className={`flex gap-4 border-l-2 ${row.color} pl-4 py-2`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">{row.label}</span>
                      {row.badge}
                    </div>
                    <p className="text-xs text-gray-400">{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-900/60 rounded-lg p-3 text-xs text-gray-400 font-mono">
              Example: Redeem 100 DROPS ($1 at current price)
              <br />→ You get: $0.75 in $G &nbsp;|&nbsp; Pool fee: $0.075 &nbsp;|&nbsp; Staked: $0.25
            </div>
          </div>

          {/* Claim flow */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-white text-lg">Claiming a Matured Stake (after 30 days)</h3>
            <p className="text-sm text-gray-400">
              Two things happen when you claim — both settled on-chain in one sequence:
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-violet-900/20 border border-violet-700/40 rounded-lg p-4">
                <p className="font-semibold text-violet-300 text-sm mb-1">APY earnings → $G</p>
                <p className="text-xs text-gray-400">
                  The pool pays your flat APY earnings in GoodDollar directly to your wallet. E.g. 15% of $0.25 = $0.0375 in $G.
                </p>
              </div>
              <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4">
                <p className="font-semibold text-blue-300 text-sm mb-1">Capital → DROPS (minted back)</p>
                <p className="text-xs text-gray-400">
                  The pool burns its staked DROPS, then backend mints the same amount back to your wallet as Game DROPS — your capital is returned.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring */}
      <section id="ch-scoring" className="space-y-6">
        <SectionHeading>Scoring</SectionHeading>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-4">
          <p className="text-gray-300">
            Each round has a time limit — longer for harder questions. You earn points for correct answers, boosted by how quickly you answered.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { round: "Easy",   time: "7s",  label: "Round 1" },
              { round: "Medium", time: "10s", label: "Round 2" },
              { round: "Hard",   time: "13s", label: "Round 3" },
            ].map((r) => (
              <div key={r.round} className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">{r.label}</div>
                <div className="font-bold text-white">{r.round}</div>
                <div className="text-blue-300 text-sm mt-1">{r.time} limit</div>
              </div>
            ))}
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
            <p className="text-sm text-blue-200">
              <strong>Formula:</strong> 500 base points + up to 500 speed bonus
              <br />
              <span className="font-mono text-xs">= 500 + (500 × time_remaining / time_limit)</span>
            </p>
          </div>
          <p className="text-xs text-gray-500">Wrong answers score 0. The player with the highest total across all rounds wins.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="ch-faq" className="space-y-6">
        <SectionHeading>Frequently Asked Questions</SectionHeading>
        <ChallengeFaq />
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-violet-900/30 to-blue-900/30 rounded-2xl p-8 md:p-12 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to challenge someone?</h2>
        <p className="text-gray-300 mb-8 text-lg max-w-2xl mx-auto">
          Stake DROPS, prove your knowledge, and earn on every game — all on-chain.
        </p>
        <button
          onClick={() => window.open("https://app.faucetdrops.io/challenge/create", "_blank")}
          className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-transform hover:scale-105"
        >
          Create a Challenge
        </button>
      </section>
    </div>
  );
}

// ─── Quiz tab content (original, unchanged) ───────────────────────────────────

function QuizContent() {
  return (
    <div className="space-y-12">
      <section className="space-y-6" id="quiz-hero">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-blue-400 to-[#0052FF] bg-clip-text text-transparent">
              Quiz
            </h1>
            <p className="text-2xl text-gray-300">Compete, Learn, and Earn onchain.</p>
            <p className="text-lg text-gray-400">
              Join live competitive quizzes where your Web3 knowledge translates directly into rewards. Powered by high-speed WebSockets for an instant gaming experience.
            </p>
            <div className="relative rounded-xl border border-gray-700 overflow-hidden">
              <Image
                src="/quizshot.png"
                alt="Quiz Platform Interface"
                width={1000}
                height={1000}
                className="w-full h-auto rounded-xl"
              />
            </div>
            <button
              onClick={() => window.open("https://app.faucetdrops.io/quiz", "_blank")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Explore Live Quizzes
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-6" id="quiz-how-it-works">
        <SectionHeading>How Quizzes Work</SectionHeading>
        <StepList items={[
          { title: "Enter the Lobby",    desc: "Find a 'Waiting' quiz. Connect your wallet and set your username to join the participants list." },
          { title: "The 'Ready' Check",  desc: "Confirm you are ready. Once all participants are ready, the host can trigger the start sequence." },
          { title: "Answer Real-Time",   desc: "Questions appear for all players simultaneously. You have a limited window (usually 30s) to choose the correct answer." },
          { title: "Live Leaderboard",   desc: "After every question, see your rank change in real-time. Points are awarded based on accuracy and speed." },
        ]} />
      </section>

      <section className="space-y-6" id="quiz-scoring">
        <SectionHeading>Scoring Mechanics</SectionHeading>
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-4">
          <p className="text-gray-300">To top the leaderboard, you need more than just the right answer—you need to be fast.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <h4 className="text-blue-300 font-semibold mb-2">Base Points</h4>
              <p className="text-sm text-gray-400">Correct answers grant a fixed 1,000 points.</p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <h4 className="text-blue-300 font-semibold mb-2">Speed Bonus</h4>
              <p className="text-sm text-gray-400">Up to 1,000 additional points based on remaining time.</p>
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
            <p className="text-sm text-blue-200"><strong>Formula:</strong> 1000 + (1000 × (Time Remaining / Total Time))</p>
          </div>
        </div>
      </section>

      <section className="space-y-6" id="quiz-reward-models">
        <SectionHeading>Reward Distribution</SectionHeading>
        <p className="text-gray-300">Quizzes support various payout strategies defined at creation:</p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "Equal",        desc: "The pool is divided exactly between the top X winners." },
            { title: "Quadratic",    desc: "Rewards scale based on the square root of points earned." },
            { title: "Custom Tiers", desc: "Fixed amounts for specific ranks (e.g., 1st: 50%, 2nd: 30%)." },
          ].map((model) => (
            <div key={model.title} className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-2">{model.title}</h3>
              <p className="text-sm text-gray-400">{model.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6" id="quiz-creation">
        <SectionHeading>Creation & Interactive Tools</SectionHeading>
        <div className="grid gap-6 md:grid-cols-2">
          <InfoCard emoji="🤖" title="AI Generation"    desc="Input a topic and difficulty, and our AI will build a professional quiz with 4 options and verified answers automatically." />
          <InfoCard emoji="📄" title="PDF-to-Quiz"      desc="Upload a project whitepaper or document. The system extracts key facts to create a study-based competition." />
          <InfoCard emoji="✍️" title="Manual Creation"  desc="Craft custom questions, define exact answers, and tweak time limits to tailor the quiz perfectly to your community." />
          <InfoCard emoji="💬" title="Live Lobby Chat"  desc="Keep participants engaged while they wait. Real-time chat allows hosts and players to interact before the countdown begins." />
        </div>
      </section>

      <section id="quiz-faq" className="space-y-6">
        <SectionHeading>Frequently Asked Questions</SectionHeading>
        <QuizFaq />
      </section>

      <section className="bg-gradient-to-r from-blue-900/30 to-blue-900/30 rounded-2xl p-8 md:p-12 my-12 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Host Your Own Quiz</h2>
        <p className="text-gray-300 mb-8 text-lg max-w-2xl mx-auto">
          Engage your community with a live event. Create a quiz in minutes and distribute tokens to your top contributors.
        </p>
        <button
          onClick={() => window.open("https://app.faucetdrops.io/quiz/create", "_blank")}
          className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-transform hover:scale-105"
        >
          Create a Quiz
        </button>
      </section>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

type Tab = "quiz" | "challenge";

export default function QuizDocsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("quiz");

  const sections = activeTab === "quiz" ? quizSections : challengeSections;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mt-20 space-y-8">

        {/* ── Tab bar ── */}
        <div className="flex gap-1 p-1 bg-gray-800/60 border border-gray-700 rounded-xl w-fit">
          {(["quiz", "challenge"] as Tab[]).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
                  active
                    ? tab === "quiz"
                      ? "bg-blue-600 text-white shadow"
                      : "bg-violet-600 text-white shadow"
                    : "text-gray-400 hover:text-white",
                ].join(" ")}
              >
                {tab === "quiz" ? "📋 Quiz" : "⚔️ 1v1 Challenge"}
              </button>
            );
          })}
        </div>

        {/* ── Content + sidebar ── */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px] text-white">
          <main>
            {activeTab === "quiz" ? <QuizContent /> : <ChallengeContent />}
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents sections={sections} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}