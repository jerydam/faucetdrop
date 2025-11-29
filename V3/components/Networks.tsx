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
                {/* <Image
                  src="https://cdn.brandfetch.io/idoEN8XbCt/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1726530739920"
                  alt="Lisk"
                  width={67}
                  height={68}
                  className="h-[30px] bg-white px-2 opacity-30 transition-opacity duration-300 hover:opacity-100"
                /> */}
                <svg className="u-icon" viewBox="0 0 59 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M36.8045 9.48242H33.3477V20.8141H36.8045V9.48242Z"></path>
    <path d="M45.3828 14.5916C44.8817 14.3599 44.2508 14.1333 43.4917 13.9166C43.0908 13.7866 42.754 13.6699 42.4813 13.5683C42.2086 13.4666 41.9933 13.3466 41.8372 13.2083C41.6795 13.0699 41.6006 12.8999 41.6006 12.6966C41.6006 12.5083 41.6861 12.3399 41.8586 12.1949C42.0311 12.0499 42.2743 11.9766 42.5897 11.9766C42.9331 11.9766 43.2026 12.0849 43.3948 12.3033C43.541 12.4683 43.6495 12.6683 43.7168 12.8999H47.1145C47.0373 12.2116 46.8139 11.5983 46.4458 11.0599C46.0663 10.5083 45.5438 10.0749 44.8768 9.76326C44.2114 9.45159 43.4342 9.29492 42.5454 9.29492C41.6007 9.29492 40.7939 9.43659 40.1285 9.71992C39.4631 10.0033 38.9604 10.3999 38.6235 10.9083C38.2867 11.4166 38.1191 11.9916 38.1191 12.6299C38.1191 13.3283 38.2949 13.9016 38.6449 14.3516C38.9965 14.8016 39.4187 15.1516 39.9133 15.3983C40.4078 15.6449 41.0272 15.8916 41.7715 16.1399C42.1872 16.2849 42.5339 16.4166 42.8132 16.5316C43.0925 16.6483 43.3143 16.7866 43.4786 16.9466C43.6429 17.1066 43.725 17.2883 43.725 17.4916C43.725 17.7099 43.6314 17.8949 43.4457 18.0466C43.2601 18.1999 42.9808 18.2749 42.6078 18.2749C42.2348 18.2749 41.9013 18.1633 41.6516 17.9366C41.4774 17.7799 41.3509 17.5833 41.2704 17.3449H37.876C37.9516 18.0199 38.1668 18.6249 38.525 19.1566C38.9111 19.7316 39.4516 20.1816 40.1466 20.5083C40.8416 20.8349 41.6614 20.9983 42.6062 20.9983C43.6084 20.9983 44.4578 20.8449 45.1528 20.5399C45.8478 20.2349 46.367 19.8166 46.7104 19.2866C47.0538 18.7566 47.2263 18.1349 47.2263 17.4233C47.2263 16.7116 47.0439 16.0833 46.6791 15.6249C46.3144 15.1666 45.8807 14.8216 45.3795 14.5899L45.3828 14.5916Z"></path>
    <path d="M26.7987 5.72461L23.3418 9.48294V20.8129H32.2945V17.3429H26.7987V5.72461Z"></path>
    <path d="M55.0233 15.1046L58.6445 9.48294L54.7801 9.48128L51.7554 14.1946V5.72461L48.2969 9.48294V20.8129H51.7554V16.0046L55.0627 20.8129H58.9303L55.0233 15.1046Z"></path>
    <path d="M9.07874 0L7.01514 3.44167L13.7679 14.66L8.1143 20.8133H12.8987L18.1612 15.095L9.07874 0Z"></path>
    <path d="M6.86115 17.342L4.3983 14.6587L8.54358 7.76703L6.47505 4.33203L0 15.0937L5.26252 20.812H7.00738L10.2063 17.342H6.86115Z"></path>
</svg>

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
                {/* <Image
                  src="https://cdn.brandfetch.io/idoEN8XbCt/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1726530739920"
                  alt="Lisk"
                  width={67}
                  height={68}
                  className="h-[30px] bg-white px-2 opacity-30 transition-opacity duration-300 hover:opacity-100"
                /> */}
                <svg className="u-icon" viewBox="0 0 59 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M36.8045 9.48242H33.3477V20.8141H36.8045V9.48242Z"></path>
    <path d="M45.3828 14.5916C44.8817 14.3599 44.2508 14.1333 43.4917 13.9166C43.0908 13.7866 42.754 13.6699 42.4813 13.5683C42.2086 13.4666 41.9933 13.3466 41.8372 13.2083C41.6795 13.0699 41.6006 12.8999 41.6006 12.6966C41.6006 12.5083 41.6861 12.3399 41.8586 12.1949C42.0311 12.0499 42.2743 11.9766 42.5897 11.9766C42.9331 11.9766 43.2026 12.0849 43.3948 12.3033C43.541 12.4683 43.6495 12.6683 43.7168 12.8999H47.1145C47.0373 12.2116 46.8139 11.5983 46.4458 11.0599C46.0663 10.5083 45.5438 10.0749 44.8768 9.76326C44.2114 9.45159 43.4342 9.29492 42.5454 9.29492C41.6007 9.29492 40.7939 9.43659 40.1285 9.71992C39.4631 10.0033 38.9604 10.3999 38.6235 10.9083C38.2867 11.4166 38.1191 11.9916 38.1191 12.6299C38.1191 13.3283 38.2949 13.9016 38.6449 14.3516C38.9965 14.8016 39.4187 15.1516 39.9133 15.3983C40.4078 15.6449 41.0272 15.8916 41.7715 16.1399C42.1872 16.2849 42.5339 16.4166 42.8132 16.5316C43.0925 16.6483 43.3143 16.7866 43.4786 16.9466C43.6429 17.1066 43.725 17.2883 43.725 17.4916C43.725 17.7099 43.6314 17.8949 43.4457 18.0466C43.2601 18.1999 42.9808 18.2749 42.6078 18.2749C42.2348 18.2749 41.9013 18.1633 41.6516 17.9366C41.4774 17.7799 41.3509 17.5833 41.2704 17.3449H37.876C37.9516 18.0199 38.1668 18.6249 38.525 19.1566C38.9111 19.7316 39.4516 20.1816 40.1466 20.5083C40.8416 20.8349 41.6614 20.9983 42.6062 20.9983C43.6084 20.9983 44.4578 20.8449 45.1528 20.5399C45.8478 20.2349 46.367 19.8166 46.7104 19.2866C47.0538 18.7566 47.2263 18.1349 47.2263 17.4233C47.2263 16.7116 47.0439 16.0833 46.6791 15.6249C46.3144 15.1666 45.8807 14.8216 45.3795 14.5899L45.3828 14.5916Z"></path>
    <path d="M26.7987 5.72461L23.3418 9.48294V20.8129H32.2945V17.3429H26.7987V5.72461Z"></path>
    <path d="M55.0233 15.1046L58.6445 9.48294L54.7801 9.48128L51.7554 14.1946V5.72461L48.2969 9.48294V20.8129H51.7554V16.0046L55.0627 20.8129H58.9303L55.0233 15.1046Z"></path>
</svg>

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
                {/* <Image
                  src="https://cdn.brandfetch.io/idoEN8XbCt/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1726530739920"
                  alt="Lisk"
                  width={67}
                  height={68}
                  className="h-[30px] bg-white px-2 opacity-30 transition-opacity duration-300 hover:opacity-100"
                /> */}

<svg className="u-icon" viewBox="0 0 59 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M36.8045 9.48242H33.3477V20.8141H36.8045V9.48242Z"></path>
    <path d="M45.3828 14.5916C44.8817 14.3599 44.2508 14.1333 43.4917 13.9166C43.0908 13.7866 42.754 13.6699 42.4813 13.5683C42.2086 13.4666 41.9933 13.3466 41.8372 13.2083C41.6795 13.0699 41.6006 12.8999 41.6006 12.6966C41.6006 12.5083 41.6861 12.3399 41.8586 12.1949C42.0311 12.0499 42.2743 11.9766 42.5897 11.9766C42.9331 11.9766 43.2026 12.0849 43.3948 12.3033C43.541 12.4683 43.6495 12.6683 43.7168 12.8999H47.1145C47.0373 12.2116 46.8139 11.5983 46.4458 11.0599C46.0663 10.5083 45.5438 10.0749 44.8768 9.76326C44.2114 9.45159 43.4342 9.29492 42.5454 9.29492C41.6007 9.29492 40.7939 9.43659 40.1285 9.71992C39.4631 10.0033 38.9604 10.3999 38.6235 10.9083C38.2867 11.4166 38.1191 11.9916 38.1191 12.6299C38.1191 13.3283 38.2949 13.9016 38.6449 14.3516C38.9965 14.8016 39.4187 15.1516 39.9133 15.3983C40.4078 15.6449 41.0272 15.8916 41.7715 16.1399C42.1872 16.2849 42.5339 16.4166 42.8132 16.5316C43.0925 16.6483 43.3143 16.7866 43.4786 16.9466C43.6429 17.1066 43.725 17.2883 43.725 17.4916C43.725 17.7099 43.6314 17.8949 43.4457 18.0466C43.2601 18.1999 42.9808 18.2749 42.6078 18.2749C42.2348 18.2749 41.9013 18.1633 41.6516 17.9366C41.4774 17.7799 41.3509 17.5833 41.2704 17.3449H37.876C37.9516 18.0199 38.1668 18.6249 38.525 19.1566C38.9111 19.7316 39.4516 20.1816 40.1466 20.5083C40.8416 20.8349 41.6614 20.9983 42.6062 20.9983C43.6084 20.9983 44.4578 20.8449 45.1528 20.5399C45.8478 20.2349 46.367 19.8166 46.7104 19.2866C47.0538 18.7566 47.2263 18.1349 47.2263 17.4233C47.2263 16.7116 47.0439 16.0833 46.6791 15.6249C46.3144 15.1666 45.8807 14.8216 45.3795 14.5899L45.3828 14.5916Z"></path>
    <path d="M26.7987 5.72461L23.3418 9.48294V20.8129H32.2945V17.3429H26.7987V5.72461Z"></path>
    <path d="M55.0233 15.1046L58.6445 9.48294L54.7801 9.48128L51.7554 14.1946V5.72461L48.2969 9.48294V20.8129H51.7554V16.0046L55.0627 20.8129H58.9303L55.0233 15.1046Z"></path>
    <path d="M9.07874 0L7.01514 3.44167L13.7679 14.66L8.1143 20.8133H12.8987L18.1612 15.095L9.07874 0Z"></path>
    <path d="M6.86115 17.342L4.3983 14.6587L8.54358 7.76703L6.47505 4.33203L0 15.0937L5.26252 20.812H7.00738L10.2063 17.342H6.86115Z"></path>
</svg>
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
