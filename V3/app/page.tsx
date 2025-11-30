import HeroSection from "@/components/landingPage/Hero";
import Networks from "@/components/Networks";
import OfferTabs from "@/components/landingPage/OfferTabs"
import FaucetChats from "@/components/landingPage/FaucetChats";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container">
        <HeroSection />
        <Networks />
        <FaucetChats />
        <OfferTabs />
      </div>
    </div>
  );
}
