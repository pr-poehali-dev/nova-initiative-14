import QRCode from "qrcode";
import { SITE_URL } from "@/lib/seo";

/**
 * Генерация печатного макета листовки А6 в формате SVG (для CorelDRAW).
 *
 * Размеры в миллиметрах — SVG задаётся в мм, поэтому в Corel импортируется
 * в натуральную величину без масштабирования.
 *   А6 обрезной формат: 105 × 148 мм.
 *   Вылеты под обрез (bleed): по 3 мм с каждой стороны → холст 111 × 154 мм.
 *   Безопасное поле (контент не ближе): 5 мм от линии реза.
 *
 * Два QR-кода (CAE и Диплом) встраиваются как ВЕКТОРНЫЕ path — печать
 * любого размера остаётся чёткой. В оба QR зашита одна метка кампании,
 * по которой аналитика различает тираж/место раздачи.
 */

export interface FlyerOptions {
  /** utm_source, например flyer_urfu. */
  source: string;
  /** utm_medium, например qr. */
  medium: string;
  /** utm_campaign — метка тиража/места раздачи (может быть пустой). */
  campaign: string;
}

const BLEED = 3; // мм вылет
const TRIM_W = 105; // мм ширина после обреза (А6)
const TRIM_H = 148; // мм высота после обреза
const CANVAS_W = TRIM_W + BLEED * 2; // 111
const CANVAS_H = TRIM_H + BLEED * 2; // 154

const INK = "#1a1a2e"; // тёмно-синий (как фирменный)
const ACCENT = "#c0392b"; // акцент
const PAPER = "#ffffff";

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

/** Векторный QR как набор <path> для вставки в SVG (без обёртки <svg>). */
async function qrPaths(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "H",
    color: { dark: INK, light: "#0000" },
  });
  // QRCode рисует на сетке 0..N (атрибут viewBox="0 0 N N"). Достаём path и N.
  const pathMatch = svg.match(/<path[^>]*d="([^"]+)"[^>]*\/>/);
  const vbMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const d = pathMatch ? pathMatch[1] : "";
  const n = vbMatch ? Number(vbMatch[1]) : 25;
  return JSON.stringify({ d, n });
}

interface QrBlock {
  x: number;
  y: number;
  size: number; // мм
  d: string;
  n: number;
  caption: string;
}

function qrBlockSvg(b: QrBlock): string {
  const scale = b.size / b.n;
  return `
    <g transform="translate(${b.x} ${b.y})">
      <rect x="-1.5" y="-1.5" width="${b.size + 3}" height="${b.size + 3}" fill="${PAPER}" stroke="${INK}" stroke-width="0.4"/>
      <g transform="scale(${scale})"><path d="${b.d}" fill="${INK}"/></g>
      <text x="${b.size / 2}" y="${b.size + 5}" font-family="'Courier New', monospace" font-size="3.4" font-weight="bold" fill="${INK}" text-anchor="middle">${b.caption}</text>
    </g>`;
}

/**
 * Строит готовый печатный SVG листовки А6 с двумя QR.
 * Возвращает строку SVG (UTF-8), готовую к сохранению в .svg.
 */
export async function buildFlyerSvg(o: FlyerOptions): Promise<string> {
  const caeUrl = buildFlyerUrl("/urfu_qr_cae", o);
  const diplomUrl = buildFlyerUrl("/urfu_qr_diplom", o);

  const caeQr = JSON.parse(await qrPaths(caeUrl)) as { d: string; n: number };
  const dipQr = JSON.parse(await qrPaths(diplomUrl)) as { d: string; n: number };

  // Координаты считаем относительно холста с вылетами.
  const cx = CANVAS_W / 2;
  const qrSize = 34; // мм
  const qrY = 96;
  const gap = 9;
  const leftX = cx - qrSize - gap / 2;
  const rightX = cx + gap / 2;

  const campaignNote = sanitizeUtm(o.campaign)
    ? `тираж: ${sanitizeUtm(o.campaign)}`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}mm" height="${CANVAS_H}mm" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
  <!-- Холст с вылетами 3 мм. Линия реза = прямоугольник ${TRIM_W}x${TRIM_H} мм. -->
  <rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="${INK}"/>

  <!-- Шапка -->
  <text x="${cx}" y="${BLEED + 14}" font-family="Arial, sans-serif" font-size="3.6" letter-spacing="1.4" fill="${ACCENT}" text-anchor="middle">ДИПЛОМ-ИНЖ.РФ · ЕКАТЕРИНБУРГ</text>

  <text x="${cx}" y="${BLEED + 30}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="${PAPER}" text-anchor="middle">ИНЖЕНЕРНАЯ</text>
  <text x="${cx}" y="${BLEED + 42}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="${PAPER}" text-anchor="middle">ПОДДЕРЖКА СТУДЕНТА</text>

  <line x1="${cx - 30}" y1="${BLEED + 48}" x2="${cx + 30}" y2="${BLEED + 48}" stroke="${ACCENT}" stroke-width="0.6"/>

  <!-- Два направления -->
  <text x="${cx}" y="${BLEED + 60}" font-family="Arial, sans-serif" font-size="4.4" fill="${PAPER}" text-anchor="middle">Доведём диплом (ВКР) до защиты</text>
  <text x="${cx}" y="${BLEED + 67}" font-family="Arial, sans-serif" font-size="4.4" fill="${PAPER}" text-anchor="middle">+ бесплатный CAE-сервис расчётов</text>

  <text x="${cx}" y="${BLEED + 80}" font-family="Arial, sans-serif" font-size="3.4" fill="#9aa0c0" text-anchor="middle">Наведи камеру телефона на QR ↓</text>

  <!-- QR-коды -->
  ${qrBlockSvg({ x: leftX, y: qrY, size: qrSize, d: dipQr.d, n: dipQr.n, caption: "ДИПЛОМ / ВКР" })}
  ${qrBlockSvg({ x: rightX, y: qrY, size: qrSize, d: caeQr.d, n: caeQr.n, caption: "CAE-РАСЧЁТЫ" })}

  <!-- Адрес (из лендингов) -->
  <text x="${cx}" y="${CANVAS_H - BLEED - 18}" font-family="Arial, sans-serif" font-size="3.8" font-weight="bold" fill="${PAPER}" text-anchor="middle">ул. Мира, 34 / ул. Малышева, 132</text>
  <text x="${cx}" y="${CANVAS_H - BLEED - 12}" font-family="Arial, sans-serif" font-size="3.2" fill="#9aa0c0" text-anchor="middle">перекрёсток у УрФУ · диплом-инж.рф</text>

  <!-- Служебная метка тиража (мелко, можно убрать в Corel) -->
  ${campaignNote ? `<text x="${BLEED + 1}" y="${CANVAS_H - 1}" font-family="'Courier New', monospace" font-size="2" fill="#3a3a5e">${campaignNote}</text>` : ""}

  <!-- Метки реза (trim marks) по углам зоны обреза -->
  <g stroke="${ACCENT}" stroke-width="0.3">
    <line x1="0" y1="${BLEED}" x2="${BLEED - 1}" y2="${BLEED}"/>
    <line x1="${BLEED}" y1="0" x2="${BLEED}" y2="${BLEED - 1}"/>
    <line x1="${CANVAS_W}" y1="${BLEED}" x2="${CANVAS_W - BLEED + 1}" y2="${BLEED}"/>
    <line x1="${CANVAS_W - BLEED}" y1="0" x2="${CANVAS_W - BLEED}" y2="${BLEED - 1}"/>
    <line x1="0" y1="${CANVAS_H - BLEED}" x2="${BLEED - 1}" y2="${CANVAS_H - BLEED}"/>
    <line x1="${BLEED}" y1="${CANVAS_H}" x2="${BLEED}" y2="${CANVAS_H - BLEED + 1}"/>
    <line x1="${CANVAS_W}" y1="${CANVAS_H - BLEED}" x2="${CANVAS_W - BLEED + 1}" y2="${CANVAS_H - BLEED}"/>
    <line x1="${CANVAS_W - BLEED}" y1="${CANVAS_H}" x2="${CANVAS_W - BLEED}" y2="${CANVAS_H - BLEED + 1}"/>
  </g>
</svg>`;
}

/** Соберает имя файла для скачивания. */
export function flyerFileName(o: FlyerOptions): string {
  const c = sanitizeUtm(o.campaign) || "base";
  return `flyer_a6_${c}.svg`;
}
