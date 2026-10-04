import Hero from "@/components/Hero";
import DashboardMockup from "@/components/DashboardMockup";
import FeaturesGrid from "@/components/FeaturesGrid";
import FooterCTA from "@/components/FooterCTA";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#050505] selection:bg-cyan-500/30">
      <Hero />
      <DashboardMockup />
      <FeaturesGrid />
      <FooterCTA />
    </main>
  );
}
