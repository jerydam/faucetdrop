import HeroSection from "@/components/landingPage/Hero";
import Networks from "@/components/Networks";
import OfferTabs from "@/components/landingPage/OfferTabs"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container">
        <HeroSection />
        <Networks />
        <OfferTabs />
      </div>
    </div>
  );
}
