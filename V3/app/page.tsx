import HeroSection from "@/components/landingPage/Hero";
import Networks from "@/components/Networks";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container">
        <HeroSection />
        <Networks />
        FAUCET LANDING PAGE HERE
      </div>
    </div>
  );
}
