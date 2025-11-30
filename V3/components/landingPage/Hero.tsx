import { Rocket } from 'lucide-react';
import Image from 'next/image';

// const Drops: React.FC = () => {
//   return (
//       <Image src="/dripin.png" alt="DripIn Icon" width={300} height={300} className="w-full h-full object-contain blended-img3" />

//   );
// };

const Drops: React.FC = () => {
  return (
    <div className="relative w-[500px] h-[500px]">
      {/* BASE IMAGE */}
      <Image
        src="/dripin.png"
        alt="DripIn Icon"
        width={1000}
        height={1000}
        className="object-contain blended-img3"
      />

      {/* CORNER GRADIENTS */}
      <div className="corner top-left"></div>
      <div className="corner top-right"></div>
      <div className="corner bottom-left"></div>
      <div className="corner bottom-right"></div>
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

      {/* New Pattern */}
      <div className="min-h-screen text-white flex items-center justify-center p-8">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-bold leading-16">
              Unify Your Onchain Growth, <br/>
              <span className='text-xl md:text-2xl'>Automate Your Rewards, Scale Engagement</span>
            </h1>

            <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
            FaucetDrops helps web3 Projects, DAOs, Protocols, and Communities automate token distribution, run interactive campaigns and onboard real users at scale - all in one powerful platfoarm.
            </p>

            <button className="group flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-full transition-all duration-200 mt-8">
              Launch App
              <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="">
            <Drops />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;