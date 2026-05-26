/**
 * Загрузка TTF-шрифта Roboto с кириллицей в jsPDF документ.
 * Стандартные шрифты jsPDF (Helvetica/Times/Courier) не поддерживают
 * кириллицу — без этого модуля русские буквы в отчёте превратятся в мусор.
 *
 * Шрифт грузится из GitHub googlefonts (raw + jsdelivr CDN как fallback),
 * кешируется в памяти base64 — повторные генерации не делают сетевых запросов.
 *
 * Экспортируется fontState — объект-singleton с актуальным именем шрифта
 * ("Roboto" если загрузка прошла, "helvetica" если нет). Используется
 * по всему generatePdfReport для doc.setFont(fontState.name, …).
 */
import type { jsPDF } from "jspdf";

const FONT_TTF_URL =
  "https://raw.githubusercontent.com/googlefonts/roboto-2/main/src/hinted/Roboto-Regular.ttf";
const FONT_BOLD_TTF_URL =
  "https://raw.githubusercontent.com/googlefonts/roboto-2/main/src/hinted/Roboto-Bold.ttf";

const FONT_TTF_FALLBACKS = [
  "https://cdn.jsdelivr.net/gh/googlefonts/roboto-2@main/src/hinted/Roboto-Regular.ttf",
];
const FONT_BOLD_TTF_FALLBACKS = [
  "https://cdn.jsdelivr.net/gh/googlefonts/roboto-2@main/src/hinted/Roboto-Bold.ttf",
];

let cachedFontB64: string | null = null;
let cachedBoldB64: string | null = null;

/** Singleton с актуальным именем шрифта PDF. Меняется на "Roboto" после успешной загрузки. */
export const fontState = { name: "helvetica" };

async function fetchFontB64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 10000) {
    throw new Error(`Подозрительно маленький файл (${buf.byteLength} байт) с ${url}`);
  }
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchWithFallback(primary: string, fallbacks: string[]): Promise<string> {
  const urls = [primary, ...fallbacks];
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const b64 = await fetchFontB64(url);
      console.info(`[PDF] Шрифт загружен с ${url}`);
      return b64;
    } catch (e) {
      console.warn(`[PDF] Не удалось загрузить ${url}:`, e);
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Все источники шрифта недоступны");
}

/**
 * Гарантирует, что в jsPDF документе зарегистрирован шрифт "Roboto" с кириллицей.
 * Возвращает true при успехе, false если фолбэк-шрифт остался helvetica.
 *
 * После успешного вызова fontState.name === "Roboto".
 */
export async function ensureCyrillicFont(doc: jsPDF): Promise<boolean> {
  try {
    if (!cachedFontB64) {
      cachedFontB64 = await fetchWithFallback(FONT_TTF_URL, FONT_TTF_FALLBACKS);
    }
    if (!cachedBoldB64) {
      cachedBoldB64 = await fetchWithFallback(FONT_BOLD_TTF_URL, FONT_BOLD_TTF_FALLBACKS);
    }
    doc.addFileToVFS("Roboto-Regular.ttf", cachedFontB64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", cachedBoldB64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    doc.setFont("Roboto", "normal");
    fontState.name = "Roboto";
    return true;
  } catch (e) {
    console.error("[PDF] Не удалось загрузить шрифт с кириллицей:", e);
    fontState.name = "helvetica";
    return false;
  }
}
