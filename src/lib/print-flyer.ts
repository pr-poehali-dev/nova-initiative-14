import QRCode from "qrcode";
import { SITE_URL } from "@/lib/seo";

/**
 * Генерация печатного макета листовки в формате SVG (для CorelDRAW).
 *
 * Макет 1:1 повторяет онлайн-генератор QR-флаера (renderQrFlyer в
 * adGenerator.ts): чертёжная сетка, рамка с угловыми засечками, центрированный
 * логотип, крупный заголовок с подчёркиванием, два QR с подписями и адрес.
 *
 * Размеры — в миллиметрах: SVG импортируется в Corel в натуральную величину.
 *   Вылеты под обрез (bleed): по 3 мм с каждой стороны.
 * QR-коды встраиваются как ВЕКТОРНЫЕ path — печать любого размера чёткая.
 * В оба QR зашита одна метка кампании (utm_campaign) — по ней аналитика
 * различает тираж/место раздачи.
 */

export type FlyerFormatId = "a7" | "a6" | "a5" | "dl";
export type FlyerThemeId = "dark" | "light";

export interface FlyerFormat {
  id: FlyerFormatId;
  label: string;
  /** Обрезной размер (после реза), мм. */
  w: number;
  h: number;
}

export const FORMATS: FlyerFormat[] = [
  { id: "a7", label: "А7 (74×105 мм)", w: 74, h: 105 },
  { id: "a6", label: "А6 (105×148 мм)", w: 105, h: 148 },
  { id: "a5", label: "А5 (148×210 мм)", w: 148, h: 210 },
  { id: "dl", label: "Евро-DL (99×210 мм)", w: 99, h: 210 },
];

export interface FlyerTheme {
  id: FlyerThemeId;
  label: string;
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  frame: string;
}

/** Палитры повторяют palette() онлайн-генератора. */
export const THEMES: FlyerTheme[] = [
  {
    id: "light",
    label: "Светлая (как онлайн-макет)",
    bg: "#ffffff",
    fg: "#1a1a2e",
    muted: "#1a1a2e",
    accent: "#c0392b",
    frame: "#1a1a2e",
  },
  {
    id: "dark",
    label: "Тёмная (синий фон)",
    bg: "#1a1a2e",
    fg: "#ffffff",
    muted: "#9aa0c0",
    accent: "#c0392b",
    frame: "#ffffff",
  },
];

export interface FlyerOptions {
  source: string;
  medium: string;
  campaign: string;
  format: FlyerFormatId;
  theme: FlyerThemeId;
}

const BLEED = 3; // мм вылет

export function sanitizeUtm(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

export function buildFlyerUrl(landing: string, o: FlyerOptions): string {
  const params = new URLSearchParams();
  if (sanitizeUtm(o.source)) params.set("utm_source", sanitizeUtm(o.source));
  if (sanitizeUtm(o.medium)) params.set("utm_medium", sanitizeUtm(o.medium));
  if (sanitizeUtm(o.campaign)) params.set("utm_campaign", sanitizeUtm(o.campaign));
  const qs = params.toString();
  return `${SITE_URL}${landing}${qs ? `?${qs}` : ""}`;
}

function getFormat(id: FlyerFormatId): FlyerFormat {
  return FORMATS.find((f) => f.id === id) || FORMATS[1];
}
function getTheme(id: FlyerThemeId): FlyerTheme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

/** Векторный QR: path-данные и размер сетки N. Цвет всегда тёмный (на белом). */
async function qrPaths(url: string): Promise<{ d: string; n: number }> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "H",
    color: { dark: "#1a1a2e", light: "#0000" },
  });
  const pathMatch = svg.match(/<path[^>]*d="([^"]+)"[^>]*\/>/);
  const vbMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  return {
    d: pathMatch ? pathMatch[1] : "",
    n: vbMatch ? Number(vbMatch[1]) : 25,
  };
}

/** Экранирование XML-спецсимволов в тексте. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Перенос строки по ширине (моноширинный шрифт ≈ 0.6em на символ).
 * Повторяет wrapText() онлайн-генератора с учётом ручных \n.
 */
function wrapMono(text: string, fontMm: number, maxWidthMm: number): string[] {
  const charW = fontMm * 0.6;
  const maxChars = Math.max(1, Math.floor(maxWidthMm / charW));
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (test.length > maxChars && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) out.push(cur);
  }
  return out;
}

const FONT = "'Courier New', monospace";

/**
 * Строит печатный SVG листовки с двумя QR, повторяя онлайн-макет 1:1.
 */
export async function buildFlyerSvg(o: FlyerOptions): Promise<string> {
  const fmt = getFormat(o.format);
  const th = getTheme(o.theme);

  const W = fmt.w + BLEED * 2;
  const H = fmt.h + BLEED * 2;
  const cx = W / 2;

  // Относительная единица — как unit = W/100 в онлайн-рендере.
  const unit = W / 100;
  const margin = BLEED + unit * 5; // рамка с учётом вылетов

  const caeUrl = buildFlyerUrl("/urfu_qr_cae", o);
  const diplomUrl = buildFlyerUrl("/urfu_qr_diplom", o);
  const caeQr = await qrPaths(caeUrl);
  const dipQr = await qrPaths(diplomUrl);

  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`,
  );
  parts.push(`<!-- Формат ${fmt.label}, вылеты ${BLEED} мм. Рез = ${fmt.w}x${fmt.h} мм. -->`);

  // Фон
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${th.bg}"/>`);

  // Чертёжная сетка (alpha 0.08), как drawGrid
  const step = W / 24;
  let grid = `<g stroke="${th.fg}" stroke-width="0.15" opacity="0.08">`;
  for (let x = step; x < W; x += step) grid += `<line x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="${H}"/>`;
  for (let y = step; y < H; y += step) grid += `<line x1="0" y1="${y.toFixed(2)}" x2="${W}" y2="${y.toFixed(2)}"/>`;
  grid += `</g>`;
  parts.push(grid);

  // Рамка-чертёж
  const fw = W - margin * 2;
  const fh = H - margin * 2;
  parts.push(
    `<rect x="${margin}" y="${margin}" width="${fw}" height="${fh}" fill="none" stroke="${th.frame}" stroke-width="${(unit * 0.5).toFixed(2)}"/>`,
  );

  // Угловые засечки (drawCorners)
  const cs = unit * 4;
  const clw = (unit * 0.5).toFixed(2);
  const corner = (px: number, py: number, sx: number, sy: number) =>
    `<path d="M ${px} ${py + sy * cs} L ${px} ${py} L ${px + sx * cs} ${py}" fill="none" stroke="${th.accent}" stroke-width="${clw}"/>`;
  parts.push(`<g>`);
  parts.push(corner(margin, margin, 1, 1));
  parts.push(corner(margin + fw, margin, -1, 1));
  parts.push(corner(margin, margin + fh, 1, -1));
  parts.push(corner(margin + fw, margin + fh, -1, -1));
  parts.push(`</g>`);

  let y = margin + unit * 9;

  // Логотип-марка по центру
  parts.push(
    `<text x="${cx}" y="${y}" font-size="${(unit * 5).toFixed(2)}" font-weight="700" fill="${th.accent}" text-anchor="middle">ДИПЛОМ-ИНЖ.РФ</text>`,
  );
  y += unit * 6;

  // Eyebrow
  parts.push(
    `<text x="${cx}" y="${y}" font-size="${(unit * 3).toFixed(2)}" fill="${th.muted}" text-anchor="middle">${esc("СТУДЕНТАМ УРФУ · ЕКАТЕРИНБУРГ")}</text>`,
  );
  y += unit * 5;

  // Заголовок (2 строки) + подчёркивание
  const titleSize = unit * 7.5;
  for (const line of ["ИНЖЕНЕРНАЯ", "ПОМОЩЬ"]) {
    y += titleSize * 1.05;
    parts.push(
      `<text x="${cx}" y="${y}" font-size="${titleSize.toFixed(2)}" font-weight="700" fill="${th.fg}" text-anchor="middle">${line}</text>`,
    );
  }
  y += unit * 2;
  parts.push(
    `<line x1="${cx - unit * 14}" y1="${y}" x2="${cx + unit * 14}" y2="${y}" stroke="${th.accent}" stroke-width="${(unit * 0.8).toFixed(2)}"/>`,
  );
  y += unit * 4;

  // Subtitle
  y += unit * 0;
  parts.push(
    `<text x="${cx}" y="${y}" font-size="${(unit * 3.2).toFixed(2)}" font-weight="700" fill="${th.fg}" text-anchor="middle">Наведи камеру на QR-код</text>`,
  );
  y += unit * 5;

  // === Два QR-столбца === (повтор геометрии renderQrFlyer)
  const colW = (W - margin * 2 - unit * 4) / 2;
  const qrSize = Math.min(colW - unit * 2, unit * 34);
  const colCenters = [
    margin + unit * 2 + colW / 2,
    margin + unit * 2 + colW + unit * 4 + colW / 2 - unit * 2,
  ];
  const qrTop = y + unit * 2;
  const pad = unit * 1.2;

  const blocks = [
    { qr: dipQr, caption: "Диплом", note: "Наставничество по дипломному проекту: чертежи, расчёты, защита ВКР" },
    { qr: caeQr, caption: "CAE", note: "Расчёт балок, рам и ферм онлайн — сейчас бесплатно" },
  ];

  for (let i = 0; i < 2; i++) {
    const colCx = colCenters[i];
    const qrX = colCx - qrSize / 2;
    const b = blocks[i];

    // Белая подложка под QR
    parts.push(
      `<rect x="${(qrX - pad).toFixed(2)}" y="${(qrTop - pad).toFixed(2)}" width="${(qrSize + pad * 2).toFixed(2)}" height="${(qrSize + pad * 2).toFixed(2)}" fill="#ffffff" stroke="${th.frame}" stroke-width="${(unit * 0.3).toFixed(2)}"/>`,
    );
    // Векторный QR
    const scale = qrSize / b.qr.n;
    parts.push(
      `<g transform="translate(${qrX.toFixed(2)} ${qrTop.toFixed(2)}) scale(${scale.toFixed(4)})"><path d="${b.qr.d}" fill="#1a1a2e"/></g>`,
    );

    // Подпись под QR (акцентом)
    let cy = qrTop + qrSize + pad + unit * 5;
    parts.push(
      `<text x="${colCx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="${(unit * 5).toFixed(2)}" font-weight="700" fill="${th.accent}" text-anchor="middle">${esc(b.caption)}</text>`,
    );
    cy += unit * 4;

    // Пояснение (перенос по ширине колонки)
    const noteSize = unit * 2.8;
    const noteLines = wrapMono(b.note, noteSize, colW - unit * 2);
    for (const line of noteLines) {
      cy += noteSize * 1.35;
      parts.push(
        `<text x="${colCx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="${noteSize.toFixed(2)}" font-weight="700" fill="${th.fg}" text-anchor="middle">${esc(line)}</text>`,
      );
    }
  }

  // === Адрес снизу === (повтор renderQrFlyer)
  const address = "ул. Мира, 34 / ул. Малышева, 132 · Екатеринбург";
  const addrY = H - margin - unit * 13;
  parts.push(
    `<line x1="${margin + unit * 4}" y1="${(addrY - unit * 4).toFixed(2)}" x2="${W - margin - unit * 4}" y2="${(addrY - unit * 4).toFixed(2)}" stroke="${th.frame}" stroke-width="${(unit * 0.3).toFixed(2)}"/>`,
  );
  parts.push(
    `<text x="${cx}" y="${addrY.toFixed(2)}" font-size="${(unit * 2.3).toFixed(2)}" fill="${th.muted}" text-anchor="middle">МЫ НАХОДИМСЯ</text>`,
  );
  const addrLines = wrapMono(address, unit * 3, W - margin * 2 - unit * 8);
  let ay = addrY;
  for (const line of addrLines) {
    ay += unit * 4;
    parts.push(
      `<text x="${cx}" y="${ay.toFixed(2)}" font-size="${(unit * 3).toFixed(2)}" font-weight="700" fill="${th.fg}" text-anchor="middle">${esc(line)}</text>`,
    );
  }

  // Служебная метка тиража (мелко, можно убрать в Corel)
  const campaignNote = sanitizeUtm(o.campaign) ? `тираж: ${sanitizeUtm(o.campaign)}` : "";
  if (campaignNote) {
    parts.push(
      `<text x="${BLEED + 1}" y="${H - 1}" font-size="2" fill="${th.muted}">${esc(campaignNote)}</text>`,
    );
  }

  // Метки реза по углам зоны обреза
  let trim = `<g stroke="${th.accent}" stroke-width="0.3">`;
  trim += `<line x1="0" y1="${BLEED}" x2="${BLEED - 1}" y2="${BLEED}"/><line x1="${BLEED}" y1="0" x2="${BLEED}" y2="${BLEED - 1}"/>`;
  trim += `<line x1="${W}" y1="${BLEED}" x2="${W - BLEED + 1}" y2="${BLEED}"/><line x1="${W - BLEED}" y1="0" x2="${W - BLEED}" y2="${BLEED - 1}"/>`;
  trim += `<line x1="0" y1="${H - BLEED}" x2="${BLEED - 1}" y2="${H - BLEED}"/><line x1="${BLEED}" y1="${H}" x2="${BLEED}" y2="${H - BLEED + 1}"/>`;
  trim += `<line x1="${W}" y1="${H - BLEED}" x2="${W - BLEED + 1}" y2="${H - BLEED}"/><line x1="${W - BLEED}" y1="${H}" x2="${W - BLEED}" y2="${H - BLEED + 1}"/>`;
  trim += `</g>`;
  parts.push(trim);

  parts.push(`</svg>`);
  return parts.join("\n");
}

export function flyerFileName(o: FlyerOptions): string {
  const c = sanitizeUtm(o.campaign) || "base";
  return `flyer_${o.format}_${o.theme}_${c}.svg`;
}
