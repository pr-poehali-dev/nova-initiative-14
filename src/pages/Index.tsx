import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import ProcessSection from "@/components/home/ProcessSection";
import PricingMentorsSection from "@/components/home/PricingMentorsSection";
import FaqCtaSection from "@/components/home/FaqCtaSection";

const Index = () => {
  return (
    <main className="min-h-screen grid-bg">
      <HeroSection />
      <AboutSection />
      <ProcessSection />
      <PricingMentorsSection />
      <FaqCtaSection />
    </main>
  );
};

export default Index;
