import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

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

  return {
    pages,
    referrer: storedReferrer,
    timeOnSite,
    utmSource: sessionStorage.getItem("vt_utm_source") || "",
    utmMedium: sessionStorage.getItem("vt_utm_medium") || "",
    utmCampaign: sessionStorage.getItem("vt_utm_campaign") || "",
    device: getDevice(),
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
