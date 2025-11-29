import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CircleDollarSign, ExternalLink } from "lucide-react";

export default function GamifiedCard() {
  return (
    <Card
      className="
        
      "
    >
      {/* HEADER */}
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <CircleDollarSign className="h-5 w-5 text-white opacity-80 group-hover:opacity-100 transition" />
          Gamified Progress + Automated Rewards
        </CardTitle>
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="p-0 mt-4 grid grid-cols-2 gap-6 ">
        {/* IMAGE SIDE */}
        <div className="flex items-center justify-center">
          <Image
            src="/celo.svg"
            alt="Celo Icon"
            width={160}
            height={160}
            className="
              transition-all duration-300 
              group-hover:scale-110 
              opacity-80 group-hover:opacity-100
            "
          />
        </div>

        {/* TEXT + BUTTON SIDE */}
        <div
          className="flex flex-col justify-center space-y-4 group
        relative
        p-6
        bg-[#5A32D1]
        text-white
        rounded-xl
        border-0
        transition-all
        duration-300
        ease-out
        hover:bg-[#2A1A78]
        hover:scale-[1.03]
        cursor-pointer"
        >
          <p
            className="
              text-base leading-relaxed
              opacity-0
              group-hover:opacity-100
              translate-y-3
              group-hover:translate-y-0
              transition-all duration-300
            "
          >
            Incentivize users who lend or borrow assets on Aave, Morpho, Euler,
            and more protocols.
          </p>

          {/* LEARN MORE */}
          <button
            className="
              flex items-center gap-2 text-sm font-medium
              opacity-0
              group-hover:opacity-100
              translate-y-3
              group-hover:translate-y-0
              transition-all duration-300
            "
          >
            Learn more
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
