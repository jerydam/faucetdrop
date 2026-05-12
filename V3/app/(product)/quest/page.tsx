"use client";
import React from "react";
import TableOfContents from "./toc";
import { Faq } from "./components/Faq";
import Image from "next/image";

const sections = [
  { id: "hero", title: "Quests" },
  { id: "hqw", title: "How Quests Work" },
  { id: "stages", title: "Quest Stages" },
  { id: "types", title: "Types of Tasks" },
  { id: "distribution-model", title: "Distribution Model" },
  { id: "timing", title: "Campaign Timing" },
  { id: "creator-guide", title: "Creator Guide" },
  { id: "rules", title: "Rules" },
  { id: "faq", title: "Frequently Asked Questions" },
];

export default function QuestPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px] text-white mt-20">
        {/* MAIN CONTENT */}
        <main className="space-y-12">

          {/* Hero Section */}
          <section className="space-y-6" id="hero">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-6">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-linear-to-r from-blue-400 to-[#0052FF] bg-clip-text text-transparent">
                  Quests
                </h1>
                <p className="text-2xl text-gray-300">Get Rewarded for Web3 Engagement</p>
                <p className="text-lg text-gray-400">
                  Complete tasks, climb stages, and claim onchain rewards gaslessly. Thousands of community members earn daily through quests.
                </p>
                <div className="flex-1">
                  <div className="relative rounded-xl border border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-center text-gray-500">
                      <Image
                        src="/quest.png"
                        alt="Quest Platform"
                        width={1000}
                        height={1000}
                        className="w-full h-auto rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-lg text-gray-400">
                  Participate in structured quest campaigns created by Web3 projects. Each campaign walks you through progressive stages of tasks. Earn points, meet stage thresholds, and receive your rewards automatically through FaucetDrops faucets.
                </p>
                <button
                  onClick={() => window.open("https://app.faucetdrops.io/quest", "_blank", "noopener noreferrer")}
                  className="flex flex-wrap gap-4">
                  <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                    Browse Active Quests
                  </button>
                </button>
              </div>
            </div>
          </section>

          {/* How Quests Work */}
          <section className="space-y-6" id="hqw">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              How Quests Work
            </h2>
            <ol className="space-y-6">
              {[
                {
                  title: "Discover a Quest",
                  desc: "Browse live campaigns from Web3 projects. Each quest has a title, image, description, reward pool, and token specified by the creator.",
                },
                {
                  title: "Complete Tasks by Stage",
                  desc: "Work through Beginner → Intermediate → Advance → Legend → Ultimate stages. Each stage contains tasks worth set point values. Meeting the pass requirement (70% of stage points) unlocks the next stage.",
                },
                {
                  title: "Accumulate Points",
                  desc: "Every completed and verified task adds points to your total. Points determine your position in the reward distribution — the more you earn, the bigger your share.",
                },
                {
                  title: "Claim Your Rewards",
                  desc: "After the quest ends, a claim window opens (typically 7 days). Rewards are distributed onchain via FaucetDrops faucets.",
                },
              ].map((item, index) => (
                <li key={index} className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{item.title}</h3>
                    <p className="text-gray-300">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Quest Stages */}
          <section className="space-y-6" id="stages">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
                Quest Stages
              </h2>
            </div>
            <p className="text-gray-300">
              Quests are structured into up to five stages of increasing difficulty. Each stage requires you to hit 70% of its available points before advancing. When Strict Progression Mode is enabled, stages must be completed in order.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  emoji: "🌱",
                  title: "Beginner",
                  subtitle: "Entry-level tasks. Follow accounts, visit pages, join communities",
                },
                {
                  emoji: "⚡",
                  title: "Intermediate",
                  subtitle: "Deeper engagement. Content creation, referrals, daily check-ins",
                },
                {
                  emoji: "🔥",
                  title: "Advance",
                  subtitle: "Active participation. Trading tasks, creative submissions",
                },
                {
                  emoji: "💎",
                  title: "Legend",
                  subtitle: "High-effort tasks with significant point rewards",
                },
                {
                  emoji: "👑",
                  title: "Ultimate",
                  subtitle: "Top-tier challenges reserved for the most dedicated participants",
                },
              ].map((category, index) => (
                <div key={index} className="bg-gray-800/50 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-colors overflow-hidden group pb-6">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{category.emoji}</span>
                      <h3 className="text-xl font-semibold text-white">{category.title}</h3>
                    </div>
                    <p className="text-gray-300 mb-4">{category.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Types of Tasks */}
          <section className="space-y-6" id="types">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Types of Tasks
            </h2>
            <p className="text-gray-300">
              Quest creators configure tasks from a range of social, creative, and trading actions, each assigned a point value and a verification method.
            </p>
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Task Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-4">Social Tasks</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span className="text-gray-300">All social media tasks involved</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-4">Creative Tasks</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span className="text-gray-300">Creative content and custom project tasks</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-4">Trading Tasks</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span className="text-gray-300">Project-specific DeFi tasks and onchain trading activities</span>
                    </li>
                  </ul>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Verification Methods</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-4">Manual Link Submission</h4>
                  <p className="text-gray-300 mb-4">User submits a URL or proof link</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-4">Automated Verification</h4>
                  <p className="text-gray-300 mb-4">Verified instantly via our bot engine</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-4">Onchain Verification</h4>
                  <p className="text-gray-300 mb-4">Wallet-based proof checked directly on-chain</p>
                </div>
              </div>
              <p className="text-gray-300">Each task&apos;s verification method is set by the quest creator. Points are awarded after successful verification.</p>
            </div>
          </section>

          {/* Distribution Model */}
          <section className="space-y-6" id="distribution-model">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Distribution Model
            </h2>
            <p className="text-gray-300">
              Quest creators choose how rewards are allocated. The model is fixed at campaign creation and visible on the quest page before you start.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Equal</h3>
                <p className="text-gray-300 mb-4">All winners receive an equal share of the pool. The creator sets the number of winners.</p>
                <div className="bg-gray-900/50 p-4 rounded-lg font-mono text-sm">
                  <div className="text-blue-300">Each winner =</div>
                  <div className="ml-4">Total Pool ÷ Number of Winners</div>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Custom Tier</h3>
                <p className="text-gray-300 mb-4">Fixed reward amounts for top-ranked participants, set by the creator at campaign setup.</p>
              </div>
            </div>
            <p className="text-gray-300">⚠️ All reward pools include a 1% platform fee collected at deposit. Reward amounts shown on quest pages reflect post-fee distribution.</p>
          </section>

          {/* Campaign Timing */}
          <section className="space-y-6" id="timing">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Campaign Timing
            </h2>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-300 mb-6">Every quest has three key windows:</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-300 mb-2">Active Period</h5>
                  <p className="text-sm text-gray-300">
                    The window between the campaign start and end time. Tasks can only be completed during this period.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-300 mb-1">Claim Window</h5>
                    <p className="text-sm text-gray-300">After the campaign ends, winners have a set window to claim their rewards. The default is 168 hours (7 days). Check each quest&apos;s page for its specific claim window.</p>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-300 mb-1">Gasless Payout</h5>
                    <p className="text-sm text-gray-300">Verified winners claim tokens through a FaucetDrops faucet — no gas required.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── CREATOR GUIDE ── */}
          <section className="space-y-8" id="creator-guide">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Creator Guide
            </h2>
            <p className="text-gray-300">
              Everything a campaign creator needs to know before launching a quest — access tiers, funding obligations, and step-by-step lifecycle.
            </p>

            {/* Access Tiers */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Creator access tiers</h3>
              <div className="grid gap-6 md:grid-cols-2">

                {/* Subscriber */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Subscriber</h4>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                      $100 / 30 days
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "Unlimited live quest campaigns",
                      "All task types — social, on-chain, manual, and custom",
                      "Auto-verify engine for Twitter, Discord, and Telegram",
                      "On-chain reward contract deployed per quest",
                      "Full admin dashboard with submission review",
                      "Multi-stage quest progression system",
                      "Automatic reward distribution via smart contract",
                      "Quest listed publicly in the quest browser",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                        <span className="text-gray-300 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Demo */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Demo mode</h4>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40">
                      Free
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {[
                      { text: "5 participants maximum — for internal testing only", warn: true },
                      { text: "Auto-verify tasks only (social and instant reward)", warn: false },
                      { text: "Manual, on-chain, and custom task types are locked", warn: true },
                      { text: "No public listing — not visible in quest browser", warn: false },
                      { text: "No on-chain contract deployment", warn: false },
                      { text: "Great for testing the flow with your team before launch", warn: false },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className={`mt-0.5 shrink-0 ${item.warn ? "text-amber-400" : "text-gray-500"}`}>•</span>
                        <span className="text-gray-300 text-sm">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Funding Requirement */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Funding requirement</h3>

              {/* Critical notice */}
              <div className="rounded-xl border border-red-700/40 bg-red-900/20 p-5">
                <p className="text-red-300 font-medium mb-1">
                  Creators must fund the quest reward pool before the campaign ends.
                </p>
                <p className="text-gray-400 text-sm">
                  Unfunded quests cannot distribute rewards. Participants who complete tasks will not receive payouts if the pool has not been deposited in time.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Platform fee", value: "1%", sub: "Added on top of reward pool at deposit" },
                  { label: "Funding deadline", value: "Before end", sub: "Must complete before the campaign end time" },
                  { label: "Claim window", value: "7 days", sub: "Default window after the campaign ends" },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-400">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-3">
                {[
                  "Deposit the full reward pool plus the 1% platform fee into the quest contract before the end date.",
                  "Rewards are held in the deployed smart contract — FaucetDrops does not custody your funds.",
                  "Participants can see the funding status on the quest page in real time.",
                  "If the pool is not funded by the end time, the claim window still opens but no rewards will be distributed.",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-red-400 mt-0.5 shrink-0">•</span>
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator Lifecycle */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Creator lifecycle</h3>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <ol className="space-y-0">
                  {[
                    {
                      color: "bg-blue-900 text-blue-300",
                      title: "Subscribe or use demo",
                      desc: "Pay $100 USDT on any supported chain for 30 days of full access. Or create a demo quest to test the platform with up to 5 participants — no payment required.",
                    },
                    {
                      color: "bg-blue-900 text-blue-300",
                      title: "Complete your profile",
                      desc: "A username and at least one linked social handle (X, Discord, Telegram, or Farcaster) are required before you can subscribe. Set these up in your dashboard.",
                    },
                    {
                      color: "bg-blue-900 text-blue-300",
                      title: "Configure quest details",
                      desc: "Set title, reward token, distribution model (equal or custom tier), and winner count. The title must be unique across the platform. Save as draft to continue later.",
                    },
                    {
                      color: "bg-blue-900 text-blue-300",
                      title: "Add tasks across stages",
                      desc: "Build Beginner through Ultimate stages. Each stage requires 70% of its points to unlock the next. At least one custom task is required to publish. System tasks (daily check-in, referral, X share) are included automatically.",
                    },
                    {
                      color: "bg-amber-900/60 text-amber-300",
                      title: "Set campaign timing",
                      desc: "Define start and end date/time. A claim window (default 7 days) opens automatically after the campaign ends. Use the quick-pick presets for common durations.",
                    },
                    {
                      color: "bg-red-900/50 text-red-300",
                      title: "Fund the reward pool",
                      desc: "Deposit the reward pool amount plus the 1% platform fee into the quest contract. This must happen before the campaign end time — late funding means no rewards are distributed.",
                    },
                    {
                      color: "bg-green-900/50 text-green-300",
                      title: "Rewards distributed automatically",
                      desc: "After the claim window opens, verified winners claim gaslessly through FaucetDrops faucets. No manual payout action is required from the creator.",
                    },
                  ].map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step.color}`}>
                          {i + 1}
                        </div>
                        {i < 6 && <div className="w-px flex-1 bg-gray-700 my-1" style={{ minHeight: "20px" }} />}
                      </div>
                      <div className="pb-6">
                        <h4 className="font-medium text-white mb-1">{step.title}</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Must-Know Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">What creators must know</h3>

              <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 mb-2">
                <p className="text-amber-300 text-sm">
                  <span className="font-semibold">Profile setup is required before subscribing.</span> You need a username and at least one linked social handle before payment is accepted.
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-4">
                {[
                  {
                    heading: "Unique title required",
                    body: "A quest title must be unique across the platform and at least 3 characters long. The name check runs automatically while you type.",
                  },
                  {
                    heading: "Token and model are locked after publishing",
                    body: "The reward token and distribution model cannot be changed after a quest is published. Edit drafts freely before finalizing.",
                  },
                  {
                    heading: "Discord auto-verification setup",
                    body: "For Discord tasks with auto-verification, invite the FaucetDrops bot to your server and provide the Server ID on the task form. Use the in-form bot checker to confirm it is detected.",
                  },
                  {
                    heading: "Telegram auto-verification setup",
                    body: "The FaucetDrops bot must be added as an administrator of your group or channel. Use the in-form status checker to verify admin status before adding the task.",
                  },
                  {
                    heading: "Custom tasks",
                    body: "Custom tasks always require participants to submit a link and an image as proof of completion. No additional configuration is needed — verification is manual by default.",
                  },
                  {
                    heading: "System tasks are automatic",
                    body: "Daily check-in, referral, and X share tasks are injected into every quest automatically and cannot be removed. They appear in the Beginner stage.",
                  },
                  {
                    heading: "Subscriptions are non-refundable",
                    body: "The $100 USDT subscription payment is non-refundable. If a funded quest is cancelled after launch, contact FaucetDrops support for resolution.",
                  },
                  {
                    heading: "Supported chains",
                    body: "Subscriptions and reward contracts are supported on Celo, Base, Arbitrum, BNB Chain, and Lisk. Ensure your wallet is connected to a supported network before subscribing or deploying.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 border-t border-gray-700/50 pt-4 first:border-0 first:pt-0">
                    <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                    <div>
                      <p className="text-white text-sm font-medium mb-0.5">{item.heading}</p>
                      <p className="text-gray-400 text-sm leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          {/* ── END CREATOR GUIDE ── */}

          {/* Rules */}
          <section className="space-y-6" id="rules">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Rules & Eligibility
            </h2>
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Eligibility</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Must complete KYC verification if required by the campaign</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Must comply with all applicable regulations</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">General Rules</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">One account per participant (duplicate accounts will be disqualified)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">No automated, scripted, or bot-assisted participation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Fair play policy applies: manipulation of tasks or points is prohibited</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Rewards are subject to final verification before distribution</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="space-y-6">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Frequently Asked Questions
            </h2>
            <Faq />
          </section>

          {/* CTA Section */}
          <section className="bg-linear-to-r from-blue-900/30 to-[#0052FF]/30 rounded-2xl p-8 md:p-12 my-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Earning?</h2>
                <p className="text-gray-300 mb-8 text-lg">
                  Join thousands of Web3 enthusiasts completing quests and earning onchain rewards — <span className="font-semibold">gaslessly</span>
                </p>
              </div>
              <button
                onClick={() => window.open("https://app.faucetdrops.io/quest", "_blank", "noopener noreferrer")}
                className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                Explore Quests
              </button>
            </div>
          </section>
        </main>

        {/* SIDEBAR - Table of Contents */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <TableOfContents sections={sections} />
          </div>
        </aside>
      </div>
    </div>
  );
}