import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import StackStrip from "@/components/landing/StackStrip";
import Pipeline from "@/components/landing/Pipeline";
import Features from "@/components/landing/Features";
import Architecture from "@/components/landing/Architecture";
import FinalCTA from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <main className="landing landing-grain relative min-h-screen overflow-x-clip bg-ink text-fg">
      <Nav />
      <Hero />
      {/* Blueprint frame: hairline rails that every section below hangs from */}
      <div className="relative mx-auto mt-24 max-w-6xl border-x border-hair sm:mt-32">
        <StackStrip />
        <Pipeline />
        <Features />
        <Architecture />
        <FinalCTA />
      </div>
    </main>
  );
}
