import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  classifyAttribution,
  getOrCreateFirstTouch,
  type Attribution,
} from "@/lib/attribution";

const PAGE_NAMES: Record<string, string> = {
  "/": "Главная",
  "/program": "Программа",
  "/pricing": "Тарифы",
  "/cases": "Кейсы",
  "/experts": "Эксперты",
  "/faq": "FAQ",
  "/contacts": "Контакты",
  "/privacy": "Политика конфиденциальности",
};

export interface VisitorData {
  pages: string[];
  referrer: string;
  timeOnSite: number;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  device: string;
  /** Источник текущего визита (тип + ярлык + путь входа). */
  attribution: Attribution | null;
  /** Путь, на который зашёл посетитель в этой сессии. */
  landingPath: string;
}

const SESSION_KEY = "vt_pages";
const START_KEY = "vt_start";

function getDevice(): string {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/i.test(ua)) return "Мобильный";
  if (/Tablet|iPad/i.test(ua)) return "Планшет";
  return "Компьютер";
}

function getUtm(param: string): string {
  return new URLSearchParams(window.location.search).get(param) || "";
}

export function getVisitorData(): VisitorData {
  const raw = sessionStorage.getItem(SESSION_KEY);
  const pages: string[] = raw ? JSON.parse(raw) : [];
  const startTime = Number(sessionStorage.getItem(START_KEY) || Date.now());
  const timeOnSite = Math.round((Date.now() - startTime) / 1000);

  const storedReferrer = sessionStorage.getItem("vt_referrer") || "";

  // Источник текущей сессии (атрибуция захода) — сохраняется при старте.
  let attribution: Attribution | null = null;
  try {
    const raw = sessionStorage.getItem("vt_attribution");
    if (raw) attribution = JSON.parse(raw) as Attribution;
  } catch {
    /* ignore */
  }
  const landingPath = sessionStorage.getItem("vt_landing") || "";

  return {
    pages,
    referrer: storedReferrer,
    timeOnSite,
    utmSource: sessionStorage.getItem("vt_utm_source") || "",
    utmMedium: sessionStorage.getItem("vt_utm_medium") || "",
    utmCampaign: sessionStorage.getItem("vt_utm_campaign") || "",
    device: getDevice(),
    attribution,
    landingPath,
  };
}

export function useVisitorTracking() {
  const location = useLocation();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (!sessionStorage.getItem(START_KEY)) {
        sessionStorage.setItem(START_KEY, String(Date.now()));
      }
      if (!sessionStorage.getItem("vt_referrer")) {
        sessionStorage.setItem("vt_referrer", document.referrer || "Прямой заход");
      }
      const utmSource = getUtm("utm_source");
      const utmMedium = getUtm("utm_medium");
      const utmCampaign = getUtm("utm_campaign");
      if (utmSource) sessionStorage.setItem("vt_utm_source", utmSource);
      if (utmMedium) sessionStorage.setItem("vt_utm_medium", utmMedium);
      if (utmCampaign) sessionStorage.setItem("vt_utm_campaign", utmCampaign);

      // Источник ПЕРВОГО касания — запоминаем навсегда (для атрибуции
      // будущей регистрации). А источник ТЕКУЩЕГО визита — на сессию.
      getOrCreateFirstTouch();
      if (!sessionStorage.getItem("vt_attribution")) {
        const attr = classifyAttribution(
          window.location.pathname,
          document.referrer || "",
          window.location.search,
        );
        sessionStorage.setItem("vt_attribution", JSON.stringify(attr));
        sessionStorage.setItem("vt_landing", window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    const pageName = PAGE_NAMES[location.pathname] || location.pathname;
    const raw = sessionStorage.getItem(SESSION_KEY);
    const pages: string[] = raw ? JSON.parse(raw) : [];
    if (pages[pages.length - 1] !== pageName) {
      pages.push(pageName);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(pages));
    }
  }, [location.pathname]);
}