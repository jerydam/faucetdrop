import { Rocket } from 'lucide-react';
import React from 'react';

const Drops: React.FC = () => {
  return (
    <div className="bg-linear-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-3xl p-8 border border-gray-700/50 shadow-2xl max-w-md w-full">
      <h2 className="text-white text-xl font-semibold mb-6">Find The Best Rates</h2>
      
    
    </div>
  );
};

// Main Hero Component
const HeroSection: React.FC = () => {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Decorative Elements */}
      <div className="absolute top-10 right-20 w-32 h-32 bg-lime-400/10 rounded-full blur-3xl"></div>
      <div className="absolute top-40 right-60 w-20 h-20 bg-emerald-400/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-lime-400/5 rounded-full blur-3xl"></div>

      {/* Curved Line Decoration */}
      <svg className="absolute bottom-0 right-0 w-2/3 h-2/3 opacity-30" viewBox="0 0 400 400">
        <path
          d="M 400 400 Q 300 200 400 0"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          fill="none"
        />
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="0" />
            <stop offset="50%" stopColor="#a3e635" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-16 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          {/* Left Content */}
          <div className="flex-1 max-w-2xl">
            <h1 className="text-2xl lg:text-4xl font-bold text-white mb-5 leading-none">
              Unify Your Onchain Growth, Automate Your Rewards, Scale Engagement

            </h1>
            <p className="text-[#94A3B8] text-md mb-8">
            FaucetDrops helps web3 Projects, DAOs, Protocols, and Communities automate token distribution, run interactive campaigns and onboard real users at scale - all in one powerful platfoarm.
            </p>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#020817]/50 hover:bg-[#020817] border border-gray-700/50 rounded-2xl transition-colors group">
              <span className="text-white font-medium">Launch App</span>
              <Rocket className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Right Content - Exchange Card */}
          <div className="shrink-0">
            <Drops />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;