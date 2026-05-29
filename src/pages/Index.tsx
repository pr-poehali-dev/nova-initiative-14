import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import StatsSection from "@/components/home/StatsSection";
import ProcessSection from "@/components/home/ProcessSection";
import PricingMentorsSection from "@/components/home/PricingMentorsSection";
import BlogTeaserSection from "@/components/home/BlogTeaserSection";
import CaeTeaserSection from "@/components/home/CaeTeaserSection";
import FaqCtaSection from "@/components/home/FaqCtaSection";
import Seo from "@/components/Seo";
import Reveal from "@/components/Reveal";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const Index = () => {
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Наставничество по дипломному проекту",
    provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    areaServed: { "@type": "City", name: "Екатеринбург" },
    description:
      "Помощь студентам УрФУ с дипломным проектом по машиностроению: разбор замечаний, проверка чертежей в КОМПАС-3D и SolidWorks, оформление по ЕСКД, подготовка к защите ВКР.",
  };

  return (
    <main className="min-h-screen grid-bg">
      <Seo jsonLd={serviceLd} />
      <HeroSection />
      <Reveal>
        <AboutSection />
      </Reveal>
      <Reveal>
        <StatsSection />
      </Reveal>
      <Reveal>
        <ProcessSection />
      </Reveal>
      <Reveal>
        <PricingMentorsSection />
      </Reveal>
      <Reveal>
        <BlogTeaserSection />
      </Reveal>
      <Reveal>
        <CaeTeaserSection />
      </Reveal>
      <Reveal>
        <FaqCtaSection />
      </Reveal>
    </main>
  );
};

export default Index;