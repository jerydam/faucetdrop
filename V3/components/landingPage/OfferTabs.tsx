"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function OfferTabs() {
  const [openCard, setOpenCard] = useState<number | null>(null);

  return (
    <div className="min-h-screen w-full flex justify-center items-center">
      <div className="w-full max-w-4xl flex flex-col gap-10">
        <Tabs defaultValue="faucets" className="w-full">
          <TabsList className="w-full flex justify-center bg-transparent p-0">
            <div className="flex w-fit md:w-fit bg-[#020817]/50 border border-white/5 rounded-full p-1 backdrop-blur-sm overflow-x-auto">
              {["faucets", "quests", "quizzes", "enterprise"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="rounded-full px-10 py-2.5 text-lg text-gray-300
                    data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white
                    data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>

          {/* ------------------------------------------------------------------------------------------ */}
          {/*                                        FAUCETS TAB                                         */}
          {/* ------------------------------------------------------------------------------------------ */}
          <TabsContent value="faucets" className="text-white mt-5">
            <TabHeader text="Smarter, Flexibility, Onchain Distribution" />

            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: 1,
                  title: "Open Drop",
                  desc: "Open-access distribution secured with a unique 6-character drop-code",
                },
                {
                  id: 2,
                  title: "Whitelist Drop",
                  desc: "Reward specific wallets with precision. Only approved addresses can claim.",
                },
                {
                  id: 3,
                  title: "Custom Drop",
                  desc: "Advanced fully customizable distribution engine with complex logic",
                },
              ].map((card) => (
                <FaucetCard
                  key={card.id}
                  card={card}
                  openCard={openCard}
                  setOpenCard={setOpenCard}
                />
              ))}
            </CardContent>
          </TabsContent>

          {/* ------------------------------------------------------------------------------------------ */}
          {/*                                      QUESTS TAB                                           */}
          {/* ------------------------------------------------------------------------------------------ */}
          <TabsContent value="quests" className="text-white mt-5">
            <TabHeader text="Gamified Progress + Automated Rewards" />

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <ImgBox src="111.png" />

              <HoverRevealCard
                title="Reward Participants"
                desc="Create task-based quests with points and automatically distribute rewards upon completion"
              />
            </CardContent>
          </TabsContent>

          {/* ------------------------------------------------------------------------------------------ */}
          {/*                                      QUIZZES TAB                                          */}
          {/* ------------------------------------------------------------------------------------------ */}
          <TabsContent value="quizzes" className="text-white mt-5">
            <TabHeader text="Fun, Interactive, AI-Powered Web3 Quiz Engine" />

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <ImgBox src="222.png" />

              <HoverRevealCard
                title="Engagements"
                desc="Set up interactive, time-based, AI-powered Web3 quizzes tied directly to onchain rewards"
              />
            </CardContent>
          </TabsContent>

          {/* ------------------------------------------------------------------------------------------ */}
          {/*                                    ENTERPRISE TAB                                          */}
          {/* ------------------------------------------------------------------------------------------ */}
          <TabsContent value="enterprise" className="text-white mt-5">
            <TabHeader text="White Label Solutions" />

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <ImgBox src="333.png" />

              <HoverRevealCard
                title="White Label Solutions"
                desc="Designed for protocols and large ecosystems running massive airdrops or global onboarding campaigns"
              />
            </CardContent>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------------------------------- COMPONENTS ---------------------------------- */

function TabHeader({ text }: { text: string }) {
  return (
    <Card className="bg-transparent text-white border-0">
      <CardHeader>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
          className="flex gap-12 items-center justify-center"
        >
          <span className="text-xl opacity-80">{text}</span>
        </motion.div>
      </CardHeader>
    </Card>
  );
}

/* -------------------------- FAUCET CARD (Expandable + Hover) -------------------------- */

function FaucetCard({
  card,
  openCard,
  setOpenCard,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  card: any;
  openCard: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOpenCard: any;
}) {
  const isOpen = openCard === card.id;

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -6 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      viewport={{ once: true }}
      onClick={() => setOpenCard(isOpen ? null : card.id)}
      className={`
        text-left flex flex-col justify-center space-y-4 group relative p-6 rounded-lg
        transition-all duration-300 cursor-pointer
        ${isOpen ? "bg-transparent ring-1 ring-[#2563EB]" : "bg-[#2563EB] text-white"}
        md:bg-[#2563EB] md:text-white md:hover:bg-transparent md:hover:ring-1 md:hover:ring-[#2563EB]
      `}
    >
      <h3 className="text-3xl font-semibold">{card.title}</h3>

      <p
        className={`
        text-lg leading-relaxed transition-all duration-300
        ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
        md:opacity-0 md:translate-y-3 md:group-hover:opacity-100 md:group-hover:translate-y-0
      `}
      >
        {card.desc}
      </p>

      <Button
        onClick={(e) => e.stopPropagation()}
        className={`
          flex items-center justify-end w-fit gap-2 text-sm font-medium mt-4 rounded px-5 py-3 bg-[#2563EB]
          transition-all duration-300
          ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
          md:opacity-0 md:translate-y-3 md:group-hover:opacity-100 md:group-hover:translate-y-0
        `}
      >
        Learn more <ExternalLink className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

/* ------------------------------- IMAGE BOX -------------------------------- */

function ImgBox({ src }: { src: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="order-2 md:order-1 flex items-center justify-center ring-1 ring-[#2563EB] rounded-lg bg-cover bg-center"
      style={{ backgroundImage: `url('/${src}')`, minHeight: "260px" }}
    />
  );
}

/* -------------------------- HOVER-REVEAL CARD -------------------------- */

function HoverRevealCard({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -6 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      viewport={{ once: true }}
      className="order-1 md:order-2 text-left flex flex-col justify-center space-y-4 group relative p-6
        bg-[#2563EB] text-white rounded-lg transition-all duration-300
        hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer"
    >
      <h3 className="text-3xl font-semibold">{title}</h3>

      <p className="text-lg leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
        {desc}
      </p>

      <Button className="flex items-center justify-end w-fit gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 rounded">
        Learn more <ExternalLink className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
