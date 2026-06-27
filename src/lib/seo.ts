// Единый источник SEO-данных вынесен в seo-routes.mjs (корень проекта),
// чтобы его могли использовать ОДНОВРЕМЕННО фронт (рантайм-теги SPA) и
// build-плагин Vite (генерация статических HTML для поискового робота).
import {
  SITE_URL as _SITE_URL,
  SITE_NAME as _SITE_NAME,
  SITE_OG_IMAGE as _SITE_OG_IMAGE,
  PAGES_SEO as _PAGES_SEO,
} from "../../seo-routes.mjs";

export const SITE_URL = _SITE_URL;
export const SITE_NAME = _SITE_NAME;
export const SITE_OG_IMAGE = _SITE_OG_IMAGE;

export interface PageSeo {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
}

export const PAGES_SEO: Record<string, PageSeo> = _PAGES_SEO;

export const ALL_ROUTES = Object.keys(PAGES_SEO);

export function getPageSeo(pathname: string): PageSeo {
  return PAGES_SEO[pathname] || PAGES_SEO["/"];
}

// ── Schema.org-хелперы (для ИИ-поиска: Google AI Overviews, Алиса, Gemini) ──

type Json = Record<string, unknown>;

/** Абсолютный URL по относительному пути. */
export function absUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "/" : path}`;
}

/**
 * BreadcrumbList — хлебные крошки. Помогают ИИ-поиску понять место страницы
 * в структуре сайта и формируют «дорожку» в выдаче.
 * @param trail массив [название, путь]; путь "/" для главной добавляется сам.
 */
export function breadcrumbsLd(trail: Array<[string, string]>): Json {
  const items = [["Главная", "/"], ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: absUrl(path),
    })),
  };
}

/**
 * Course — образовательная программа наставничества. Сильный сигнал
 * для ИИ-ответов на запросы «как написать диплом», «помощь с ВКР».
 */
export function courseLd(opts: {
  name: string;
  description: string;
  url: string;
  hasParts?: string[];
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: "ru-RU",
    provider: {
      "@type": "EducationalOrganization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(opts.hasParts && opts.hasParts.length
      ? {
          hasPart: opts.hasParts.map((n) => ({
            "@type": "Course",
            name: n,
            provider: { "@type": "EducationalOrganization", name: SITE_NAME },
          })),
        }
      : {}),
  };
}

/**
 * Service + предложения (OfferCatalog) — для страницы тарифов.
 * Помогает ИИ-поиску отвечать на «сколько стоит помощь с дипломом».
 */
export function serviceLd(opts: {
  name: string;
  description: string;
  url: string;
  offers?: Array<{ name: string; price: number; description?: string }>;
  areaServed?: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    url: opts.url,
    areaServed: { "@type": "City", name: opts.areaServed || "Екатеринбург" },
    provider: {
      "@type": "EducationalOrganization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(opts.offers && opts.offers.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: opts.name,
            itemListElement: opts.offers.map((o) => ({
              "@type": "Offer",
              name: o.name,
              ...(o.description ? { description: o.description } : {}),
              ...(o.price > 0
                ? { price: o.price, priceCurrency: "RUB" }
                : {}),
            })),
          },
        }
      : {}),
  };
}

/**
 * SoftwareApplication — облачный CAE-инструмент. Для запросов
 * «расчёт рамы онлайн», «эпюры моментов калькулятор».
 */
export function softwareLd(opts: {
  name: string;
  description: string;
  url: string;
  features?: string[];
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    applicationCategory: "EngineeringApplication",
    operatingSystem: "Web",
    inLanguage: "ru-RU",
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "RUB",
      description: "Бесплатный доступ в режиме альфа-теста",
    },
    ...(opts.features && opts.features.length
      ? { featureList: opts.features }
      : {}),
  };
}

/**
 * FAQPage — блок «вопрос-ответ». Один из самых сильных сигналов для
 * ИИ-поиска (Google AI Overviews, Алиса): ответы попадают в выдачу дословно.
 * @param items массив пар {q, a}.
 */
export function faqLd(items: Array<{ q: string; a: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

/**
 * TechArticle — техническая статья (методика расчёта). Сильный сигнал для
 * ИИ-поиска: показывает, что на странице есть фактическая инженерная методика
 * (допущения, формулы, нормы ГОСТ), которую можно цитировать с атрибуцией.
 */
export function techArticleLd(opts: {
  headline: string;
  description: string;
  url: string;
  about?: string[];
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: opts.headline,
    description: opts.description,
    url: opts.url,
    inLanguage: "ru-RU",
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    ...(opts.about && opts.about.length
      ? { about: opts.about.map((a) => ({ "@type": "Thing", name: a })) }
      : {}),
  };
}

/**
 * HowTo — пошаговая инструкция. Помогает ИИ-поиску отвечать на запросы
 * «как рассчитать балку онлайн».
 */
export function howToLd(opts: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string }>;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    inLanguage: "ru-RU",
    step: opts.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}