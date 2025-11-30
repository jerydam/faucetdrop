import Image from "next/image";

export default function Networks() {
  return (
    <div className="mx-auto max-w-full px-0 w-[1280px] py-20 max-md:py-10">
      <div className="flex flex-col items-center justify-center gap-10 px-4 text-center">
        <h2 className="text-xl font-bold text-white">The future of Web3 user acquisition is automated, verifiable and fun. We&apos;re building it!</h2>

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
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100 red"
                />
                <Image
                  src="/base.svg"
                  alt="Base"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="/arbitrum.svg"
                  alt="Arbitrum"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="/lisk.svg"
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
                  src="/base.svg"
                  alt="Base"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="/arbitrum.svg"
                  alt="Arbitrum"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="/lisk.svg"
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
                  src="/base.svg"
                  alt="Base"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="/arbitrum.svg"
                  alt="Arbitrum"
                  width={67}
                  height={68}
                  className="h-[64px] opacity-30 transition-opacity duration-300 hover:opacity-100"
                />
                <Image
                  src="/lisk.svg"
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
