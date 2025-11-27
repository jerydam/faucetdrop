import Image from "next/image";

export default function Networks() {
  return (
    <div className="mx-auto max-w-full px-0 w-[1280px] py-20 max-md:py-10">
      <div className="flex flex-col items-center justify-center gap-10 px-4 text-center">
        <h2 className="text-xl font-bold text-white">The future of Web3 user acquisition is automated, verifiabl and fun. We&apos;re building it!</h2>

        <div className="relative mx-8 flex w-full gap-9 overflow-hidden">
          {/* Marquee Wrapper */}
          <div className="overflow-hidden w-full">
            <div className="marquee flex items-center gap-20 whitespace-nowrap animate-marquee">

              {/* GROUP 1 */}
              <div className="marquee-group flex items-center gap-20">
                <Image
                  src="/celo.svg"
                  alt="Celo"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="https://cdn.brandfetch.io/id6XsSOVVS/theme/light/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1757929761243"
                  alt="Base"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="https://cdn.brandfetch.io/idvFc3YhUM/theme/dark/idUG8_mdYw.svg?c=1bxid64Mup7aczewSAYMX&t=1762340760217"
                  alt="Arbitrum"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="https://cdn.brandfetch.io/idoEN8XbCt/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1726530739920"
                  alt="Lisk"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />

                <Image
                  src="/celo.svg"
                  alt="Celo"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="https://cdn.brandfetch.io/id6XsSOVVS/theme/light/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1757929761243"
                  alt="Base"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="https://cdn.brandfetch.io/idvFc3YhUM/theme/dark/idUG8_mdYw.svg?c=1bxid64Mup7aczewSAYMX&t=1762340760217"
                  alt="Arbitrum"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="https://cdn.brandfetch.io/idoEN8XbCt/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1726530739920"
                  alt="Lisk"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />

                <Image
                  src="/celo.svg"
                  alt="Celo"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="https://cdn.brandfetch.io/id6XsSOVVS/theme/light/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1757929761243"
                  alt="Base"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="https://cdn.brandfetch.io/idvFc3YhUM/theme/dark/idUG8_mdYw.svg?c=1bxid64Mup7aczewSAYMX&t=1762340760217"
                  alt="Arbitrum"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="https://cdn.brandfetch.io/idoEN8XbCt/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1726530739920"
                  alt="Lisk"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tailwind animation */}
      <style>
        {`
          .animate-marquee {
            animation: marquee 40s linear infinite;
          }

          @keyframes marquee {
            from { transform: translateX(0%); }
            to { transform: translateX(-50%); }
          }
        `}
      </style>
    </div>
  );
}
