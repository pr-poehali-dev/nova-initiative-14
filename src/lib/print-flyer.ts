import QRCode from "qrcode";
import { jsPDF } from "jspdf";
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

/** QR-лендинги, которые аналитика распознаёт как источник «QR-флаер». */
export const QR_LANDINGS = [
  { path: "/urfu_qr_diplom", label: "Диплом — наставничество" },
  { path: "/urfu_qr_cae", label: "CAE — расчёты онлайн" },
] as const;

/** Один QR-блок листовки: куда ведёт, подпись и описание. */
export interface FlyerQrBlock {
  landing: string;
  caption: string;
  note: string;
}

export interface FlyerOptions {
  source: string;
  medium: string;
  campaign: string;
  format: FlyerFormatId;
  theme: FlyerThemeId;
  /** Сколько QR на листовке: 1 (крупный по центру) или 2 (в два столбца). */
  qrCount: 1 | 2;
  /** Редактируемые тексты шапки. */
  logo: string;
  eyebrow: string;
  title: string; // строки через \n
  subtitle: string;
  address: string;
  addressLabel: string;
  /** QR-блоки (для qrCount=1 используется только первый). */
  qrBlocks: [FlyerQrBlock, FlyerQrBlock];
}

/** Значения по умолчанию для нового макета. */
export const DEFAULT_FLYER: FlyerOptions = {
  source: "flyer_urfu",
  medium: "qr",
  campaign: "",
  format: "a6",
  theme: "light",
  qrCount: 2,
  logo: "ДИПЛОМ-ИНЖ.РФ",
  eyebrow: "СТУДЕНТАМ УРФУ · ЕКАТЕРИНБУРГ",
  title: "ИНЖЕНЕРНАЯ\nПОМОЩЬ",
  subtitle: "Наведи камеру на QR-код",
  address: "ул. Мира, 34 / ул. Малышева, 132 · Екатеринбург",
  addressLabel: "МЫ НАХОДИМСЯ",
  qrBlocks: [
    {
      landing: "/urfu_qr_diplom",
      caption: "Диплом",
      note: "Наставничество по дипломному проекту: чертежи, расчёты, защита ВКР",
    },
    {
      landing: "/urfu_qr_cae",
      caption: "CAE",
      note: "Расчёт балок, рам и ферм онлайн — сейчас бесплатно",
    },
  ],
};

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

/**
 * Векторный QR через низкоуровневое API QRCode.create: строим fill-path из
 * прямоугольников тёмных модулей (надёжнее, чем парсить svg-строку).
 * Возвращает path-данные (d) и размер сетки N (число модулей по стороне).
 */
function qrPaths(url: string): { d: string; n: number } {
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const n: number = qr.modules.size;
  const data: Uint8Array = qr.modules.data;
  let d = "";
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (data[row * n + col]) {
        // Один тёмный модуль 1×1 в координатах сетки.
        d += `M${col} ${row}h1v1h-1z`;
      }
    }
  }
  return { d, n };
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

  // QR по выбранным лендингам (с UTM-метками). Второй нужен только для qrCount=2.
  const qr0 = qrPaths(buildFlyerUrl(o.qrBlocks[0].landing, o));
  const qr1 = o.qrCount === 2 ? qrPaths(buildFlyerUrl(o.qrBlocks[1].landing, o)) : qr0;

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
  if (o.logo.trim()) {
    parts.push(
      `<text x="${cx}" y="${y}" font-size="${(unit * 5).toFixed(2)}" font-weight="700" fill="${th.accent}" text-anchor="middle">${esc(o.logo)}</text>`,
    );
    y += unit * 6;
  }

  // Eyebrow
  if (o.eyebrow.trim()) {
    parts.push(
      `<text x="${cx}" y="${y}" font-size="${(unit * 3).toFixed(2)}" fill="${th.muted}" text-anchor="middle">${esc(o.eyebrow)}</text>`,
    );
    y += unit * 5;
  }

  // Заголовок (многострочный) + подчёркивание
  const titleSize = unit * 7.5;
  const titleLines = o.title.split("\n").filter((l) => l.length > 0);
  for (const line of titleLines) {
    y += titleSize * 1.05;
    parts.push(
      `<text x="${cx}" y="${y}" font-size="${titleSize.toFixed(2)}" font-weight="700" fill="${th.fg}" text-anchor="middle">${esc(line)}</text>`,
    );
  }
  if (titleLines.length) {
    y += unit * 2;
    parts.push(
      `<line x1="${cx - unit * 14}" y1="${y}" x2="${cx + unit * 14}" y2="${y}" stroke="${th.accent}" stroke-width="${(unit * 0.8).toFixed(2)}"/>`,
    );
    y += unit * 4;
  }

  // Subtitle
  if (o.subtitle.trim()) {
    parts.push(
      `<text x="${cx}" y="${y}" font-size="${(unit * 3.2).toFixed(2)}" font-weight="700" fill="${th.fg}" text-anchor="middle">${esc(o.subtitle)}</text>`,
    );
    y += unit * 5;
  }

  // === QR-блоки === поддержка 1 (крупный по центру) или 2 (в два столбца)
  const qrTop = y + unit * 1;
  const pad = unit * 1.2;
  const noteSize = unit * 2.8;
  let maxBlockBottom = qrTop;

  // Геометрия колонок зависит от числа QR.
  const cols =
    o.qrCount === 2
      ? (() => {
          const colW = (W - margin * 2 - unit * 4) / 2;
          const qrSize = Math.min(colW - unit * 2, unit * 30);
          return {
            colW,
            qrSize,
            centers: [
              margin + unit * 2 + colW / 2,
              margin + unit * 2 + colW + unit * 4 + colW / 2 - unit * 2,
            ],
          };
        })()
      : (() => {
          const colW = W - margin * 2 - unit * 8;
          const qrSize = Math.min(colW, unit * 44);
          return { colW, qrSize, centers: [cx] };
        })();

  const qrs = o.qrCount === 2 ? [qr0, qr1] : [qr0];

  for (let i = 0; i < qrs.length; i++) {
    const colCx = cols.centers[i];
    const qrSize = cols.qrSize;
    const qrX = colCx - qrSize / 2;
    const b = o.qrBlocks[i];

    // Белая подложка под QR
    parts.push(
      `<rect x="${(qrX - pad).toFixed(2)}" y="${(qrTop - pad).toFixed(2)}" width="${(qrSize + pad * 2).toFixed(2)}" height="${(qrSize + pad * 2).toFixed(2)}" fill="#ffffff" stroke="${th.frame}" stroke-width="${(unit * 0.3).toFixed(2)}"/>`,
    );
    // Векторный QR
    const scale = qrSize / qrs[i].n;
    parts.push(
      `<g transform="translate(${qrX.toFixed(2)} ${qrTop.toFixed(2)}) scale(${scale.toFixed(4)})"><path d="${qrs[i].d}" fill="#1a1a2e" shape-rendering="crispEdges"/></g>`,
    );

    // Подпись под QR (акцентом)
    let cy = qrTop + qrSize + pad + unit * 5;
    if (b.caption.trim()) {
      parts.push(
        `<text x="${colCx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="${(unit * 5).toFixed(2)}" font-weight="700" fill="${th.accent}" text-anchor="middle">${esc(b.caption)}</text>`,
      );
      cy += unit * 3.5;
    }

    // Пояснение (перенос по ширине колонки)
    if (b.note.trim()) {
      const noteLines = wrapMono(b.note, noteSize, cols.colW - unit * 2);
      for (const line of noteLines) {
        cy += noteSize * 1.35;
        parts.push(
          `<text x="${colCx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="${noteSize.toFixed(2)}" font-weight="700" fill="${th.fg}" text-anchor="middle">${esc(line)}</text>`,
        );
      }
    }
    if (cy > maxBlockBottom) maxBlockBottom = cy;
  }

  // === Адрес снизу ===
  // Разделитель ставим строго НИЖЕ конца самого длинного описания с гарантированным
  // отступом — так текст никогда не наезжает на рамку «Мы находимся».
  // maxBlockBottom — базовая линия последней строки описания; добавляем высоту
  // descender (≈0.3em) и крупный воздушный зазор, как на онлайн-эталоне.
  const addrLines = o.address.trim()
    ? wrapMono(o.address, unit * 3, W - margin * 2 - unit * 8)
    : [];
  const addrBlockH = unit * 4 + unit * 4 * (addrLines.length + 1); // разделитель..адрес
  const bottomLimit = H - margin - unit * 4;
  // воздух от конца описания: descender последней строки + зазор
  let sepY = maxBlockBottom + noteSize * 0.3 + unit * 7;
  // Если блок не помещается до нижней рамки — прижимаем к низу (но не выше контента).
  if (sepY + addrBlockH > bottomLimit) {
    sepY = Math.max(maxBlockBottom + noteSize * 0.3 + unit * 4, bottomLimit - addrBlockH);
  }

  if (addrLines.length) {
    // Разделитель
    parts.push(
      `<line x1="${margin + unit * 4}" y1="${sepY.toFixed(2)}" x2="${W - margin - unit * 4}" y2="${sepY.toFixed(2)}" stroke="${th.frame}" stroke-width="${(unit * 0.3).toFixed(2)}"/>`,
    );
    let ay = sepY;
    if (o.addressLabel.trim()) {
      ay = sepY + unit * 4;
      parts.push(
        `<text x="${cx}" y="${ay.toFixed(2)}" font-size="${(unit * 2.3).toFixed(2)}" fill="${th.muted}" text-anchor="middle">${esc(o.addressLabel)}</text>`,
      );
    }
    for (const line of addrLines) {
      ay += unit * 4;
      parts.push(
        `<text x="${cx}" y="${ay.toFixed(2)}" font-size="${(unit * 3).toFixed(2)}" font-weight="700" fill="${th.fg}" text-anchor="middle">${esc(line)}</text>`,
      );
    }
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

/** Базовое имя файла (без расширения) по формату/теме/кампании. */
function fileBase(o: FlyerOptions): string {
  const c = sanitizeUtm(o.campaign) || "base";
  return `flyer_${o.format}_${o.theme}_${c}`;
}

export function flyerFileName(o: FlyerOptions): string {
  return `${fileBase(o)}.svg`;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Скачивает макет как SVG-файл. */
export function downloadFlyerSvg(svg: string, o: FlyerOptions) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${fileBase(o)}.svg`);
  URL.revokeObjectURL(url);
}

/**
 * Рендерит SVG-строку в canvas заданного DPI (по умолчанию 300 — печать).
 * Используется для экспорта PNG/PDF. Размер берётся из мм-габаритов формата.
 */
function svgToCanvas(svg: string, o: FlyerOptions, dpi = 300): Promise<HTMLCanvasElement> {
  const fmt = getFormat(o.format);
  const mmW = fmt.w + BLEED * 2;
  const mmH = fmt.h + BLEED * 2;
  const pxW = Math.round((mmW / 25.4) * dpi);
  const pxH = Math.round((mmH / 25.4) * dpi);

  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pxW;
      canvas.height = pxH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("no canvas ctx"));
        return;
      }
      // Белая подложка — чтобы прозрачные зоны не стали чёрными в JPEG/PDF.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pxW, pxH);
      ctx.drawImage(img, 0, 0, pxW, pxH);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Скачивает макет как PNG (300 dpi). */
export async function downloadFlyerPng(svg: string, o: FlyerOptions) {
  const canvas = await svgToCanvas(svg, o, 300);
  triggerDownload(canvas.toDataURL("image/png"), `${fileBase(o)}.png`);
}

/** Скачивает макет как PDF (лист точно по габаритам формата с вылетами, в мм). */
export async function downloadFlyerPdf(svg: string, o: FlyerOptions) {
  const fmt = getFormat(o.format);
  const mmW = fmt.w + BLEED * 2;
  const mmH = fmt.h + BLEED * 2;
  const canvas = await svgToCanvas(svg, o, 300);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [mmW, mmH] });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, mmW, mmH);
  pdf.save(`${fileBase(o)}.pdf`);
}