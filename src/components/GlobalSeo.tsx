import Seo from "./Seo";
import useContacts from "@/hooks/useContacts";
import { SITE_URL, SITE_NAME, SITE_OG_IMAGE } from "@/lib/seo";

const GlobalSeo = () => {
  const { contacts: c } = useContacts();

  const sameAs = [c.telegram_link, c.vk_link, c.max_link].filter(Boolean);

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_OG_IMAGE,
    image: SITE_OG_IMAGE,
    email: c.email || undefined,
    telephone: c.phone || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    address: c.address
      ? {
          "@type": "PostalAddress",
          streetAddress: c.address,
          addressLocality: c.city || "Екатеринбург",
          addressCountry: "RU",
        }
      : undefined,
  };

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    image: SITE_OG_IMAGE,
    description:
      "Наставничество студентов УрФУ по дипломному проекту в области машиностроения: разбор замечаний, проверка чертежей, подготовка к защите ВКР.",
    areaServed: { "@type": "City", name: c.city || "Екатеринбург" },
    address: {
      "@type": "PostalAddress",
      streetAddress: c.address || undefined,
      addressLocality: c.city || "Екатеринбург",
      addressCountry: "RU",
    },
    telephone: c.phone || undefined,
    email: c.email || undefined,
    openingHours: c.working_hours
      ? `Mo-Su ${c.working_hours.replace("–", "-")}`
      : "Mo-Su 10:00-20:00",
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "ru-RU",
  };

  return <Seo jsonLd={[organization, localBusiness, website]} />;
};

export default GlobalSeo;
