import QRCode from "qrcode";
import { SITE_URL } from "@/lib/seo";

/**
 * Генерация печатного макета листовки в формате SVG (для CorelDRAW).
 *
 * Размеры в миллиметрах — SVG задаётся в мм, поэтому в Corel импортируется
 * в натуральную величину без масштабирования.
 *   Вылеты под обрез (bleed): по 3 мм с каждой стороны.
 *   Безопасное поле: контент не ближе 5 мм к линии реза.
 *
 * Два QR-кода (CAE и Диплом) встраиваются как ВЕКТОРНЫЕ path — печать
 * любого размера остаётся чёткой. В оба QR зашита одна метка кампании,
 * по которой аналитика различает тираж/место раздачи.
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
  text: string;
  sub: string;
  accent: string;
  /** Фон под QR (всегда контрастный для сканирования). */
  qrLight: string;
  qrDark: string;
}

export const THEMES: FlyerTheme[] = [
  {
    id: "dark",
    label: "Тёмная (синий фон)",
    bg: "#1a1a2e",
    text: "#ffffff",
    sub: "#9aa0c0",
    accent: "#c0392b",
    qrLight: "#ffffff",
    qrDark: "#1a1a2e",
  },
  {
    id: "light",
    label: "Светлая (для тонкой бумаги)",
    bg: "#ffffff",
    text: "#1a1a2e",
    sub: "#5a5a78",
    accent: "#c0392b",
    qrLight: "#ffffff",
    qrDark: "#1a1a2e",
  },
];

export interface FlyerOptions {
  /** utm_source, например flyer_urfu. */
  source: string;
  /** utm_medium, например qr. */
  medium: string;
  /** utm_campaign — метка тиража/места раздачи (может быть пустой). */
  campaign: string;
  /** Формат листовки. */
  format: FlyerFormatId;
  /** Тема оформления. */
  theme: FlyerThemeId;
}

const BLEED = 3; // мм вылет

/** Чистит UTM-значение: латиница, цифры, дефис, подчёркивание. */
export function sanitizeUtm(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

/** Собирает целевой URL QR-лендинга с UTM-метками. */
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

/** Векторный QR: возвращает path-данные и размер сетки N. */
async function qrPaths(url: string, dark: string): Promise<{ d: string; n: number }> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "H",
    color: { dark, light: "#0000" },
  });
  const pathMatch = svg.match(/<path[^>]*d="([^"]+)"[^>]*\/>/);
  const vbMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  return {
    d: pathMatch ? pathMatch[1] : "",
    n: vbMatch ? Number(vbMatch[1]) : 25,
  };
}

interface QrBlock {
  x: number;
  y: number;
  size: number; // мм
  d: string;
  n: number;
  caption: string;
  theme: FlyerTheme;
}

function qrBlockSvg(b: QrBlock): string {
  const scale = b.size / b.n;
  return `
    <g transform="translate(${b.x} ${b.y})">
      <rect x="-1.5" y="-1.5" width="${b.size + 3}" height="${b.size + 3}" fill="${b.theme.qrLight}" stroke="${b.theme.qrDark}" stroke-width="0.4"/>
      <g transform="scale(${scale})"><path d="${b.d}" fill="${b.theme.qrDark}"/></g>
      <text x="${b.size / 2}" y="${b.size + 5}" font-family="'Courier New', monospace" font-size="3.4" font-weight="bold" fill="${b.theme.text}" text-anchor="middle">${b.caption}</text>
    </g>`;
}

/**
 * Строит готовый печатный SVG листовки с двумя QR под выбранный формат и тему.
 * Возвращает строку SVG (UTF-8), готовую к сохранению в .svg.
 *
 * Вёрстка вертикально центрируется по холсту: шапка сверху, QR в нижней
 * трети, адрес внизу. Координаты считаются от размеров выбранного формата,
 * поэтому макет корректно перестраивается под А7/А6/А5/DL.
 */
export async function buildFlyerSvg(o: FlyerOptions): Promise<string> {
  const fmt = getFormat(o.format);
  const th = getTheme(o.theme);

  const canvasW = fmt.w + BLEED * 2;
  const canvasH = fmt.h + BLEED * 2;
  const cx = canvasW / 2;

  const caeUrl = buildFlyerUrl("/urfu_qr_cae", o);
  const diplomUrl = buildFlyerUrl("/urfu_qr_diplom", o);
  const caeQr = await qrPaths(caeUrl, th.qrDark);
  const dipQr = await qrPaths(diplomUrl, th.qrDark);

  // QR-размер масштабируем от ширины формата (но в разумных пределах).
  const qrSize = Math.max(22, Math.min(40, fmt.w * 0.32));
  const gap = qrSize * 0.26;
  const qrY = canvasH - BLEED - 30 - qrSize; // блок QR над адресной зоной
  const leftX = cx - qrSize - gap / 2;
  const rightX = cx + gap / 2;

  // Шрифты масштабируем коэффициентом от ширины (А6 = база).
  const k = fmt.w / 105;
  const fTitle = (11 * k).toFixed(1);
  const fLead = (4.4 * k).toFixed(1);
  const fEyebrow = (3.6 * k).toFixed(1);
  const fAddr = (3.8 * k).toFixed(1);
  const fSub = (3.2 * k).toFixed(1);

  const campaignNote = sanitizeUtm(o.campaign)
    ? `тираж: ${sanitizeUtm(o.campaign)}`
    : "";

  const topY = BLEED + 12 * k;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}mm" height="${canvasH}mm" viewBox="0 0 ${canvasW} ${canvasH}">
  <!-- Формат ${fmt.label}, вылеты ${BLEED} мм. Линия реза = прямоугольник ${fmt.w}x${fmt.h} мм. -->
  <rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="${th.bg}"/>

  <!-- Шапка -->
  <text x="${cx}" y="${topY}" font-family="Arial, sans-serif" font-size="${fEyebrow}" letter-spacing="1.2" fill="${th.accent}" text-anchor="middle">ДИПЛОМ-ИНЖ.РФ · ЕКАТЕРИНБУРГ</text>

  <text x="${cx}" y="${topY + 16 * k}" font-family="Arial, sans-serif" font-size="${fTitle}" font-weight="bold" fill="${th.text}" text-anchor="middle">ИНЖЕНЕРНАЯ</text>
  <text x="${cx}" y="${topY + 28 * k}" font-family="Arial, sans-serif" font-size="${fTitle}" font-weight="bold" fill="${th.text}" text-anchor="middle">ПОДДЕРЖКА СТУДЕНТА</text>

  <line x1="${cx - 28 * k}" y1="${topY + 34 * k}" x2="${cx + 28 * k}" y2="${topY + 34 * k}" stroke="${th.accent}" stroke-width="0.6"/>

  <!-- Два направления -->
  <text x="${cx}" y="${topY + 46 * k}" font-family="Arial, sans-serif" font-size="${fLead}" fill="${th.text}" text-anchor="middle">Доведём диплом (ВКР) до защиты</text>
  <text x="${cx}" y="${topY + 53 * k}" font-family="Arial, sans-serif" font-size="${fLead}" fill="${th.text}" text-anchor="middle">+ бесплатный CAE-сервис расчётов</text>

  <text x="${cx}" y="${qrY - 4}" font-family="Arial, sans-serif" font-size="${fSub}" fill="${th.sub}" text-anchor="middle">Наведи камеру телефона на QR ↓</text>

  <!-- QR-коды -->
  ${qrBlockSvg({ x: leftX, y: qrY, size: qrSize, d: dipQr.d, n: dipQr.n, caption: "ДИПЛОМ / ВКР", theme: th })}
  ${qrBlockSvg({ x: rightX, y: qrY, size: qrSize, d: caeQr.d, n: caeQr.n, caption: "CAE-РАСЧЁТЫ", theme: th })}

  <!-- Адрес (из лендингов) -->
  <text x="${cx}" y="${canvasH - BLEED - 14}" font-family="Arial, sans-serif" font-size="${fAddr}" font-weight="bold" fill="${th.text}" text-anchor="middle">ул. Мира, 34 / ул. Малышева, 132</text>
  <text x="${cx}" y="${canvasH - BLEED - 8}" font-family="Arial, sans-serif" font-size="${fSub}" fill="${th.sub}" text-anchor="middle">перекрёсток у УрФУ · диплом-инж.рф</text>

  <!-- Служебная метка тиража (мелко, можно убрать в Corel) -->
  ${campaignNote ? `<text x="${BLEED + 1}" y="${canvasH - 1}" font-family="'Courier New', monospace" font-size="2" fill="${th.sub}">${campaignNote}</text>` : ""}

  <!-- Метки реза (trim marks) по углам зоны обреза -->
  <g stroke="${th.accent}" stroke-width="0.3">
    <line x1="0" y1="${BLEED}" x2="${BLEED - 1}" y2="${BLEED}"/>
    <line x1="${BLEED}" y1="0" x2="${BLEED}" y2="${BLEED - 1}"/>
    <line x1="${canvasW}" y1="${BLEED}" x2="${canvasW - BLEED + 1}" y2="${BLEED}"/>
    <line x1="${canvasW - BLEED}" y1="0" x2="${canvasW - BLEED}" y2="${BLEED - 1}"/>
    <line x1="0" y1="${canvasH - BLEED}" x2="${BLEED - 1}" y2="${canvasH - BLEED}"/>
    <line x1="${BLEED}" y1="${canvasH}" x2="${BLEED}" y2="${canvasH - BLEED + 1}"/>
    <line x1="${canvasW}" y1="${canvasH - BLEED}" x2="${canvasW - BLEED + 1}" y2="${canvasH - BLEED}"/>
    <line x1="${canvasW - BLEED}" y1="${canvasH}" x2="${canvasW - BLEED}" y2="${canvasH - BLEED + 1}"/>
  </g>
</svg>`;
}

/** Собирает имя файла для скачивания. */
export function flyerFileName(o: FlyerOptions): string {
  const c = sanitizeUtm(o.campaign) || "base";
  return `flyer_${o.format}_${o.theme}_${c}.svg`;
}
