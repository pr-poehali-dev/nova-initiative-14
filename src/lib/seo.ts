export const SITE_URL = "https://xn----gtbhgbqhkfi.xn--p1ai";
export const SITE_NAME = "Диплом-Инж.рф";
export const SITE_OG_IMAGE =
  "https://cdn.poehali.dev/projects/138efeb3-8342-4a32-95c7-e2f3ec523fb3/files/og-image-1779207387203.png";

export interface PageSeo {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
}

export const PAGES_SEO: Record<string, PageSeo> = {
  "/": {
    title: "Диплом-Инж.рф — наставничество по дипломному проекту УрФУ · машиностроение",
    description:
      "Практикующие инженеры-конструкторы Екатеринбурга помогут довести дипломный проект (ВКР) до защиты: разбор замечаний, проверка чертежей в КОМПАС-3D и SolidWorks, расчёты, оформление по ЕСКД.",
    keywords:
      "наставничество по диплому, помощь с дипломом УрФУ, дипломный проект машиностроение, ВКР Екатеринбург, КОМПАС-3D, SolidWorks, ЕСКД, защита диплома",
  },
  "/program": {
    title: "Программа наставничества по диплому — этапы работы · Диплом-Инж.рф",
    description:
      "Как устроена работа над дипломным проектом: диагностика, план, проверка ПЗ и чертежей, разбор замечаний научрука, подготовка к защите ВКР. Машиностроение, УрФУ.",
    keywords:
      "программа наставничества, этапы дипломного проекта, план работы над ВКР, подготовка к защите диплома",
  },
  "/pricing": {
    title: "Тарифы и цены на наставничество по диплому — Диплом-Инж.рф",
    description:
      "Стоимость наставничества по дипломному проекту: экспресс-разбор за 3 дня, индивидуальный и групповой форматы на месяц и 3 месяца. Онлайн / в офисе в Екатеринбурге.",
    keywords:
      "цена наставничества, тарифы дипломный проект, стоимость помощи с ВКР, экспресс разбор диплома",
  },
  "/cases": {
    title: "Кейсы и примеры дипломных проектов — Диплом-Инж.рф",
    description:
      "Реальные кейсы наставничества: как студенты УрФУ доводили дипломный проект до защиты. Машиностроение, КОМПАС-3D, SolidWorks, оформление по ЕСКД.",
    keywords:
      "кейсы дипломных проектов, примеры ВКР машиностроение, отзывы выпускников УрФУ",
  },
  "/experts": {
    title: "Наставники — инженеры-конструкторы Екатеринбурга · Диплом-Инж.рф",
    description:
      "Команда наставников: практикующие инженеры-конструкторы с опытом в машиностроении. Работают с дипломными проектами УрФУ онлайн и в офисе.",
    keywords:
      "наставники инженеры, менторы УрФУ, конструкторы Екатеринбург, эксперты по диплому",
  },
  "/faq": {
    title: "Частые вопросы о наставничестве по диплому — Диплом-Инж.рф",
    description:
      "Ответы на популярные вопросы: пишете ли диплом за студента, как проходят встречи с наставником, сколько стоит, что делать, если до защиты ВКР мало времени.",
    keywords:
      "вопросы о дипломе, как работает наставник, помощь со студенческим проектом, защита ВКР вопросы",
  },
  "/contacts": {
    title: "Контакты — Диплом-Инж.рф · Екатеринбург",
    description:
      "Связаться с наставниками: Telegram, телефон, адрес офиса в Екатеринбурге. Бесплатная диагностика дипломного проекта за 20 минут.",
    keywords:
      "контакты наставник по диплому, Екатеринбург, диагностика ВКР, записаться на консультацию",
  },
  "/privacy": {
    title: "Политика конфиденциальности — Диплом-Инж.рф",
    description:
      "Как мы обрабатываем персональные данные пользователей сайта Диплом-Инж.рф. Условия сбора, хранения и удаления информации.",
  },
  "/offer": {
    title: "Публичная оферта — Диплом-Инж.рф",
    description:
      "Условия предоставления услуг наставничества и доступа к CAE-сервису Диплом-Инж.рф: предмет договора, права и обязанности сторон, порядок оплаты.",
  },
  "/about": {
    title: "О проекте Диплом-Инж.рф — наставничество для будущих инженеров",
    description:
      "Кто стоит за проектом, какие принципы наставничества, почему мы не пишем диплом за студента и как помогаем выпускникам УрФУ дойти до защиты.",
    keywords:
      "о проекте, миссия наставничества, принципы работы, наставник по машиностроению",
  },
  "/reviews": {
    title: "Отзывы студентов о наставничестве — Диплом-Инж.рф",
    description:
      "Реальные отзывы выпускников УрФУ и других вузов о работе с наставниками: подготовка дипломного проекта, защита ВКР, разбор замечаний.",
    keywords:
      "отзывы о наставничестве, отзывы УрФУ, опыт студентов, рекомендации по диплому",
  },
  "/vacancies": {
    title: "Вакансии — стать наставником в Диплом-Инж.рф",
    description:
      "Ищем практикующих инженеров-конструкторов в команду наставников. Помогаем студентам УрФУ с дипломным проектом по машиностроению.",
    keywords:
      "вакансия наставник, работа инженером-конструктором, ментор машиностроение Екатеринбург",
  },
};

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