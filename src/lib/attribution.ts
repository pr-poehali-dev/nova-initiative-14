/**
 * Атрибуция источника перехода (откуда пришёл посетитель).
 *
 * Определяет тип источника по UTM-меткам, реферреру и пути входа (включая
 * QR-флаеры /urfu_qr_*). Источник ПЕРВОГО касания запоминается в localStorage
 * и потом привязывается к регистрации (модель «первое касание»).
 *
 * Используется:
 *  - useVisitorTracking → отправка визита в track-visit;
 *  - форма регистрации → передача источника первого касания в sso-auth.
 */

export type SourceType =
  | "direct" // прямой заход (нет реферрера и UTM)
  | "referral" // переход с другого сайта
  | "organic" // поисковая выдача (google/yandex и т.п.)
  | "social" // соцсети / мессенджеры
  | "utm" // помечено utm_source
  | "qr_flyer" // QR-флаер у УрФУ (/urfu_qr_*)
  | "internal"; // внутренний переход по сайту

export interface Attribution {
  sourceType: SourceType;
  /** Человекочитаемый ярлык: «Яндекс», «Telegram», «QR-флаер: CAE», домен и т.п. */
  sourceLabel: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  /** Путь, на который зашёл посетитель. */
  landingPath: string;
}

const FIRST_TOUCH_KEY = "attr_first_touch";

const SEARCH_HOSTS: Record<string, string> = {
  "google.": "Google",
  "yandex.": "Яндекс",
  "ya.ru": "Яндекс",
  "bing.": "Bing",
  "duckduckgo.": "DuckDuckGo",
  "mail.ru": "Поиск Mail.ru",
};

const SOCIAL_HOSTS: Record<string, string> = {
  "t.me": "Telegram",
  "telegram.": "Telegram",
  "vk.com": "ВКонтакте",
  "vk.ru": "ВКонтакте",
  "instagram.": "Instagram",
  "facebook.": "Facebook",
  "youtube.": "YouTube",
  "wa.me": "WhatsApp",
  "whatsapp.": "WhatsApp",
  "dzen.ru": "Дзен",
  "habr.com": "Хабр",
};

/** QR-флаеры: путь → понятный ярлык. */
const QR_FLYER_LABELS: Record<string, string> = {
  "/urfu_qr_cae": "QR-флаер: CAE",
  "/urfu_qr_diplom": "QR-флаер: Диплом",
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function matchHost(host: string, table: Record<string, string>): string | null {
  for (const key of Object.keys(table)) {
    if (host.includes(key)) return table[key];
  }
  return null;
}

/**
 * Классифицирует ТЕКУЩИЙ заход: разбирает UTM, путь и реферрер.
 * referrer передаётся явно (document.referrer на момент входа).
 */
export function classifyAttribution(
  path: string,
  referrer: string,
  search: string,
): Attribution {
  const params = new URLSearchParams(search);
  const utmSource = params.get("utm_source") || "";
  const utmMedium = params.get("utm_medium") || "";
  const utmCampaign = params.get("utm_campaign") || "";

  const base: Attribution = {
    sourceType: "direct",
    sourceLabel: "Прямой заход",
    referrer: referrer || "",
    utmSource,
    utmMedium,
    utmCampaign,
    landingPath: path,
  };

  // 1) QR-флаер — приоритетнее всего: человек пришёл с бумажного флаера.
  // Если в ссылку QR зашита UTM-кампания (utm_campaign) — добавляем её в
  // ярлык, чтобы различать конкретные флаеры/тиражи между собой.
  if (QR_FLYER_LABELS[path]) {
    const baseLabel = QR_FLYER_LABELS[path];
    const label = utmCampaign ? `${baseLabel} · ${utmCampaign}` : baseLabel;
    return { ...base, sourceType: "qr_flyer", sourceLabel: label };
  }

  // 2) UTM-метка — явно размеченная кампания.
  if (utmSource) {
    const label = utmCampaign
      ? `${utmSource} · ${utmCampaign}`
      : utmSource;
    return { ...base, sourceType: "utm", sourceLabel: label };
  }

  // 3) Реферрер.
  const refHost = hostFromUrl(referrer);
  if (refHost) {
    // Свой же домен — внутренний переход (не считаем источником трафика).
    if (refHost.includes("xn----gtbhgbqhkfi") || refHost.includes("xn--p1ai")) {
      return { ...base, sourceType: "internal", sourceLabel: "Внутренний переход" };
    }
    const search = matchHost(refHost, SEARCH_HOSTS);
    if (search) return { ...base, sourceType: "organic", sourceLabel: search };
    const social = matchHost(refHost, SOCIAL_HOSTS);
    if (social) return { ...base, sourceType: "social", sourceLabel: social };
    return { ...base, sourceType: "referral", sourceLabel: refHost };
  }

  // 4) Прямой заход.
  return base;
}

/**
 * Источник ПЕРВОГО касания. Если ещё не сохранён — классифицирует текущий
 * заход и запоминает в localStorage навсегда (до очистки браузера).
 * Возвращает сохранённый источник.
 */
export function getOrCreateFirstTouch(): Attribution {
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    if (raw) return JSON.parse(raw) as Attribution;
  } catch {
    /* ignore */
  }
  const attr = classifyAttribution(
    window.location.pathname,
    document.referrer || "",
    window.location.search,
  );
  try {
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(attr));
  } catch {
    /* ignore */
  }
  return attr;
}

/** Прочитать источник первого касания без создания (для формы регистрации). */
export function readFirstTouch(): Attribution | null {
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}