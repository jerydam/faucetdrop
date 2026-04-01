"use client";
import React from "react";
import TableOfContents from "./toc"; // Reusing your existing TOC
import { QuizFaq } from "./components/faq";
import Image from "next/image";

const sections = [
  { id: "hero", title: "Quizzes" },
  { id: "how-it-works", title: "How Quizzes Work" },
  { id: "scoring", title: "Scoring Mechanics" },
  { id: "reward-models", title: "Reward Distribution" },
  { id: "creation", title: "Creating a Quiz" },
  { id: "faq", title: "FAQ" },
];

export default function QuizDocsPage() {
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
                  Quiz
                </h1>
                <p className="text-2xl text-gray-300">Compete, Learn, and Earn onchain.</p>
                <p className="text-lg text-gray-400">
                  Join live competitive quizzes where your Web3 knowledge translates directly into rewards. Powered by high-speed WebSockets for an instant gaming experience.
                </p>
                <div className="relative aspect-video bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                  <Image
                    src="/quizshot.png" // Ensure you have this asset
                    alt="Quiz Platform Interface"
                    width={1000}
                    height={1000}
                    className="w-full h-auto rounded-xl"
                  />
                </div>
                <button
                  onClick={() => window.open("https://app.faucetdrops.io/quiz", "_blank")}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                  Explore Live Quizzes
                </button>
              </div>
            </div>
          </section>

          {/* How Quizzes Work */}
          <section className="space-y-6" id="how-it-works">
             <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              How Quiz Work
            </h2>
            <ol className="space-y-6">
              {[
                {
                  title: "Enter the Lobby",
                  desc: "Find a 'Waiting' quiz. Connect your wallet and set your username to join the participants list.",
                },
                {
                  title: "The 'Ready' Check",
                  desc: "Confirm you are ready. Once all participants are ready, the host can trigger the start sequence."
                },
                {
                  title: "Answer Real-Time",
                  desc: "Questions appear for all players simultaneously. You have a limited window (usually 30s) to choose the correct answer.",
                },
                {
                  title: "Live Leaderboard",
                  desc: "After every question, see your rank change in real-time. Points are awarded based on accuracy and speed."
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

          {/* Scoring Mechanics */}
          <section className="space-y-6" id="scoring">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Scoring Mechanics
            </h2>
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

          {/* Reward Models */}
          <section className="space-y-6" id="reward-models">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Reward Distribution
            </h2>
            <p className="text-gray-300">Quizzes support various payout strategies defined at creation:</p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: "Equal", desc: "The pool is divided exactly between the top X winners." },
                { title: "Quadratic", desc: "Rewards scale based on the square root of points earned." },
                { title: "Custom Tiers", desc: "Fixed amounts for specific ranks (e.g., 1st: 50%, 2nd: 30%)." }
              ].map((model, idx) => (
                <div key={idx} className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-2">{model.title}</h3>
                  <p className="text-sm text-gray-400">{model.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Create Section */}
          <section className="space-y-6" id="creation">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Creation Tools
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-6 bg-linear-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700">
                <span className="text-3xl mb-4 block">🤖</span>
                <h3 className="text-xl font-bold mb-2">AI Generation</h3>
                <p className="text-gray-400 text-sm">Input a topic and difficulty, and our AI will build a professional quiz with 4 options and verified answers automatically.</p>
              </div>
              <div className="p-6 bg-linear-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700">
                <span className="text-3xl mb-4 block">📄</span>
                <h3 className="text-xl font-bold mb-2">PDF-to-Quiz</h3>
                <p className="text-gray-400 text-sm">Upload a project whitepaper or document. The system extracts key facts to create a study-based competition.</p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="space-y-6">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Frequently Asked Questions
            </h2>
            <QuizFaq />
          </section>

          {/* Final CTA */}
          <section className="bg-linear-to-r from-blue-900/30 to-blue-900/30 rounded-2xl p-8 md:p-12 my-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Host Your Own Quiz</h2>
            <p className="text-gray-300 mb-8 text-lg max-w-2xl mx-auto">
              Engage your community with a live event. Create a quiz in minutes and distribute tokens to your top contributors.
            </p>
            <button
              onClick={() => window.open("https://app.faucetdrops.io/quiz/create", "_blank")}
              className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-transform hover:scale-105">
              Create a Quiz
            </button>
          </section>
        </main>

        {/* SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <TableOfContents sections={sections} />
          </div>
        </aside>
      </div>
    </div>
  );
}