/**
 * Движок генератора рекламных материалов «диплом-инж.рф».
 *
 * Рисует макет на <canvas> в фирменном «чертёжном» стиле и выгружает
 * результат в PNG / JPG / PDF. AI не используется — весь контент задаёт
 * администратор вручную (заголовок, подзаголовок, текст, призыв, формат, тема).
 *
 * Единый рендер на canvas даёт идентичный результат во всех трёх форматах вывода.
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

/** Фирменная палитра (из src/index.css). */
const COLORS = {
  // bg: "#faf8f0",
  bg: "#ffffff",
  line: "#1a1a2e",
  lineThin: "#3a3a5e",
  accent: "#c0392b",
  blue: "#2c3e80",
  paper: "#f5f3e8",
};

export type AdFormat = "post" | "story" | "cover" | "leaflet" | "flyer_quarter";
export type AdTheme = "light" | "dark" | "accent";

export interface AdFormatSpec {
  key: AdFormat;
  label: string;
  /** Габариты холста в пикселях (для печати A5 — 300 dpi). */
  width: number;
  height: number;
  hint: string;
}

/** Доступные форматы материалов. */
export const AD_FORMATS: AdFormatSpec[] = [
  {
    key: "post",
    label: "Пост 1080×1080",
    width: 1080,
    height: 1080,
    hint: "Telegram, VK, Instagram",
  },
  {
    key: "story",
    label: "Сториз 1080×1920",
    width: 1080,
    height: 1920,
    hint: "Stories / Reels 9:16",
  },
  {
    key: "cover",
    label: "Обложка 1200×630",
    width: 1200,
    height: 630,
    hint: "Блог, OG-превью",
  },
  {
    key: "leaflet",
    label: "Листовка A5",
    width: 1748,
    height: 2480,
    hint: "Печать, A5 300 dpi",
  },
  {
    key: "flyer_quarter",
    label: "Флаер 1/4 A4 (QR)",
    width: 1240,
    height: 1748,
    hint: "Печать, 105×148 мм 300 dpi · 4 шт на листе A4",
  },
];

/** Один QR-блок на флаере: ссылка + подпись + пояснение. */
export interface QrBlock {
  /** Ссылка, в которую кодируется QR. */
  url: string;
  /** Крупная подпись под QR (например «Диплом» / «CAE»). */
  caption: string;
  /** Пояснение под подписью (1–2 строки). */
  note: string;
}

export interface AdContent {
  format: AdFormat;
  theme: AdTheme;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  cta: string;
  site: string;
  /** Адрес/локация — печатается на QR-флаере. */
  address?: string;
  /** Два QR-блока для флаера 1/4 A4 (левый и правый столбец). */
  qrBlocks?: [QrBlock, QrBlock];
}

export const DEFAULT_AD: AdContent = {
  format: "post",
  theme: "light",
  eyebrow: "Инженерные расчёты онлайн",
  title: "СAE-РАСЧЁТЫ\nЗА МИНУТЫ",
  subtitle: "Балки, рамы, фермы — прямо в браузере",
  body: "Постройте расчётную схему, задайте нагрузки и опоры, получите эпюры N, Q, M и готовый PDF-отчёт.",
  cta: "Попробовать бесплатно",
  site: "диплом-инж.рф",
};

/** Базовый домен для ссылок в QR (человекочитаемый домен .рф в punycode). */
const QR_BASE_URL = "https://xn----gtbhgbqhkfi.xn--p1ai";

/**
 * Готовый жанр «QR-флаер у УрФУ» (1/4 A4): два QR в два столбца с подписями
 * «Диплом» и «CAE», адрес перекрёстка и пометка, что сейчас бесплатно.
 */
export const QR_FLYER_PRESET: AdContent = {
  format: "flyer_quarter",
  theme: "light",
  eyebrow: "Студентам УрФУ · Екатеринбург",
  title: "ИНЖЕНЕРНАЯ\nПОМОЩЬ",
  subtitle: "Наведи камеру на QR-код",
  body: "",
  cta: "",
  site: "диплом-инж.рф",
  address: "ул. Мира, 34 / ул. Малышева, 132 · Екатеринбург",
  qrBlocks: [
    {
      url: `${QR_BASE_URL}/urfu_qr_diplom`,
      caption: "Диплом",
      note: "Наставничество по дипломному проекту: чертежи, расчёты, защита ВКР",
    },
    {
      url: `${QR_BASE_URL}/urfu_qr_cae`,
      caption: "CAE",
      note: "Расчёт балок, рам и ферм онлайн — сейчас бесплатно",
    },
  ],
};

interface Palette {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  frame: string;
}

function palette(theme: AdTheme): Palette {
  switch (theme) {
    case "dark":
      return {
        bg: COLORS.line,
        fg: COLORS.bg,
        muted: "#9aa0c0",
        accent: COLORS.accent,
        frame: COLORS.bg,
      };
    case "accent":
      return {
        bg: COLORS.accent,
        fg: "#ffffff",
        muted: "rgba(255,255,255,0.78)",
        accent: "#ffffff",
        frame: "#ffffff",
      };
    case "light":
    default:
      return {
        bg: COLORS.bg,
        fg: COLORS.line,
        muted: COLORS.lineThin,
        accent: COLORS.accent,
        frame: COLORS.line,
      };
  }
}

/** Перенос текста по ширине с учётом ручных переносов \n. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** Рисует «чертёжную» сетку фона. */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 1;
  const step = Math.round(w / 24);
  for (let x = step; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Угловые засечки в стиле чертёжной рамки. */
function drawCorners(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  size: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size / 8);
  const corners: [number, number, number, number][] = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * size);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * size, cy);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Главная функция отрисовки макета на переданный canvas.
 * Масштабирует все размеры от ширины холста, поэтому единый код подходит
 * для всех форматов (квадрат, вертикаль, горизонталь, A5).
 */
export function renderAd(canvas: HTMLCanvasElement, content: AdContent) {
  // QR-флаер рисуется отдельным макетом (синхронно — без QR-картинок;
  // QR подставляются в renderAdAsync). Здесь рисуем рамку и подписи, чтобы
  // мгновенное превью не «прыгало» до загрузки QR.
  if (content.format === "flyer_quarter") {
    renderQrFlyer(canvas, content, null);
    return;
  }
  const spec =
    AD_FORMATS.find((f) => f.key === content.format) || AD_FORMATS[0];
  const { width: W, height: H } = spec;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const p = palette(content.theme);
  const unit = W / 100; // относительная единица
  const margin = unit * 8;

  // Фон
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx, W, H, p.fg);

  // Рамка-чертёж
  ctx.strokeStyle = p.frame;
  ctx.lineWidth = Math.max(2, unit * 0.4);
  ctx.strokeRect(margin, margin, W - margin * 2, H - margin * 2);
  drawCorners(
    ctx,
    margin,
    margin,
    W - margin * 2,
    H - margin * 2,
    p.accent,
    unit * 4,
  );

  const contentX = margin + unit * 6;
  const contentW = W - margin * 2 - unit * 12;
  let cursorY = margin + unit * 12;

  // Шапка: логотип-марка
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.accent;
  ctx.font = `700 ${unit * 4.4}px "Courier New", monospace`;
  ctx.fillText("ДИПЛОМ-ИНЖ", contentX, cursorY);
  const logoW = ctx.measureText("ДИПЛОМ-ИНЖ").width;
  ctx.fillStyle = p.fg;
  ctx.font = `400 ${unit * 4.4}px "Courier New", monospace`;
  ctx.fillText(".РФ", contentX + logoW + unit * 0.6, cursorY);
  cursorY += unit * 6;

  // Eyebrow (надзаголовок, разрядка)
  if (content.eyebrow.trim()) {
    ctx.fillStyle = p.muted;
    ctx.font = `400 ${unit * 2.6}px "Courier New", monospace`;
    const eb = content.eyebrow.toUpperCase().split("").join("\u200a");
    ctx.fillText(eb, contentX, cursorY);
    cursorY += unit * 4;
  }

  // Title (крупный)
  if (content.title.trim()) {
    const titleSize = unit * (content.format === "cover" ? 7 : 9);
    ctx.fillStyle = p.fg;
    ctx.font = `700 ${titleSize}px "Courier New", monospace`;
    const titleLines = wrapText(ctx, content.title, contentW);
    for (const line of titleLines) {
      cursorY += titleSize * 1.05;
      ctx.fillText(line, contentX, cursorY);
    }
    // Акцентная подчёркивающая линия
    cursorY += unit * 1.5;
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = unit * 0.9;
    ctx.beginPath();
    ctx.moveTo(contentX, cursorY);
    ctx.lineTo(contentX + unit * 22, cursorY);
    ctx.stroke();
    cursorY += unit * 4;
  }

  // Subtitle
  if (content.subtitle.trim()) {
    const subSize = unit * 3.6;
    ctx.fillStyle = p.fg;
    ctx.font = `700 ${subSize}px "Courier New", monospace`;
    const subLines = wrapText(ctx, content.subtitle, contentW);
    for (const line of subLines) {
      cursorY += subSize * 1.25;
      ctx.fillText(line, contentX, cursorY);
    }
    cursorY += unit * 2.5;
  }

  // Body
  if (content.body.trim()) {
    const bodySize = unit * 2.9;
    ctx.fillStyle = p.muted;
    ctx.font = `400 ${bodySize}px "Courier New", monospace`;
    const bodyLines = wrapText(ctx, content.body, contentW);
    for (const line of bodyLines) {
      cursorY += bodySize * 1.4;
      ctx.fillText(line, contentX, cursorY);
    }
  }

  // Нижний блок: CTA-плашка + сайт
  const footerY = H - margin - unit * 6;
  if (content.cta.trim()) {
    ctx.font = `700 ${unit * 3.2}px "Courier New", monospace`;
    const ctaText = content.cta;
    const ctaW = ctx.measureText(ctaText).width + unit * 8;
    const ctaH = unit * 7;
    const ctaX = contentX;
    const ctaYTop = footerY - ctaH;
    ctx.fillStyle = p.accent;
    ctx.fillRect(ctaX, ctaYTop, ctaW, ctaH);
    ctx.fillStyle = content.theme === "accent" ? COLORS.accent : "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(ctaText, ctaX + unit * 4, ctaYTop + ctaH / 2 + unit * 0.2);
    ctx.textBaseline = "alphabetic";

    // Сайт справа от плашки
    ctx.fillStyle = p.fg;
    ctx.font = `400 ${unit * 2.8}px "Courier New", monospace`;
    const siteText = content.site;
    const siteW = ctx.measureText(siteText).width;
    ctx.fillText(
      siteText,
      W - margin - unit * 6 - siteW,
      ctaYTop + ctaH / 2 + unit * 1,
    );
  }
}

/**
 * Макет QR-флаера 1/4 A4: шапка, два QR-кода в ДВА СТОЛБЦА с подписями
 * («Диплом» и «CAE») и пояснениями, адрес перекрёстка снизу.
 * qrImages — пара уже отрисованных QR (или null, если ещё не готовы —
 * тогда на их месте рисуется рамка-заглушка).
 */
function renderQrFlyer(
  canvas: HTMLCanvasElement,
  content: AdContent,
  qrImages: [HTMLImageElement, HTMLImageElement] | null,
) {
  const spec = AD_FORMATS.find((f) => f.key === "flyer_quarter")!;
  const { width: W, height: H } = spec;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const p = palette(content.theme);
  const unit = W / 100;
  const margin = unit * 5;

  // Фон + сетка + рамка
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx, W, H, p.fg);
  ctx.strokeStyle = p.frame;
  ctx.lineWidth = Math.max(2, unit * 0.5);
  ctx.strokeRect(margin, margin, W - margin * 2, H - margin * 2);
  drawCorners(
    ctx,
    margin,
    margin,
    W - margin * 2,
    H - margin * 2,
    p.accent,
    unit * 4,
  );

  const cx = W / 2;
  let y = margin + unit * 9;

  // Логотип-марка по центру
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${unit * 5}px "Courier New", monospace`;
  ctx.fillStyle = p.accent;
  ctx.fillText("ДИПЛОМ-ИНЖ.РФ", cx, y);
  y += unit * 6;

  // Eyebrow
  if (content.eyebrow.trim()) {
    ctx.fillStyle = p.muted;
    ctx.font = `400 ${unit * 2.7}px "Courier New", monospace`;
    ctx.fillText(content.eyebrow.toUpperCase(), cx, y);
    y += unit * 5;
  }

  // Title (крупный, по центру, многострочный)
  if (content.title.trim()) {
    const titleSize = unit * 7.5;
    ctx.fillStyle = p.fg;
    ctx.font = `700 ${titleSize}px "Courier New", monospace`;
    for (const line of content.title.split("\n")) {
      y += titleSize * 1.05;
      ctx.fillText(line, cx, y);
    }
    y += unit * 2;
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = unit * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - unit * 14, y);
    ctx.lineTo(cx + unit * 14, y);
    ctx.stroke();
    y += unit * 4;
  }

  // Subtitle (инструкция «наведи камеру»)
  if (content.subtitle.trim()) {
    ctx.fillStyle = p.fg;
    ctx.font = `700 ${unit * 3.2}px "Courier New", monospace`;
    ctx.fillText(content.subtitle, cx, y);
    y += unit * 5;
  }

  // === Два QR-столбца ===
  const blocks = content.qrBlocks;
  const colW = (W - margin * 2 - unit * 4) / 2; // две колонки с зазором
  const qrSize = Math.min(colW - unit * 2, unit * 34);
  const colCenters = [
    margin + unit * 2 + colW / 2, // левая колонка
    margin + unit * 2 + colW + unit * 4 + colW / 2 - unit * 2, // правая колонка
  ];
  const qrTop = y + unit * 2;

  for (let i = 0; i < 2; i++) {
    const colCx = colCenters[i];
    const qrX = colCx - qrSize / 2;
    const block = blocks?.[i];

    // Белая подложка под QR (для надёжного скана на любой теме)
    const pad = unit * 1.2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX - pad, qrTop - pad, qrSize + pad * 2, qrSize + pad * 2);
    ctx.strokeStyle = p.frame;
    ctx.lineWidth = unit * 0.3;
    ctx.strokeRect(qrX - pad, qrTop - pad, qrSize + pad * 2, qrSize + pad * 2);

    if (qrImages) {
      ctx.drawImage(qrImages[i], qrX, qrTop, qrSize, qrSize);
    } else {
      // Заглушка пока QR не готов
      ctx.fillStyle = p.muted;
      ctx.font = `400 ${unit * 2.2}px "Courier New", monospace`;
      ctx.fillText("QR…", colCx, qrTop + qrSize / 2);
    }

    // Подпись под QR (крупно)
    let cy = qrTop + qrSize + pad + unit * 5;
    if (block?.caption) {
      ctx.fillStyle = p.accent;
      ctx.font = `700 ${unit * 5}px "Courier New", monospace`;
      ctx.fillText(block.caption, colCx, cy);
      cy += unit * 4;
    }
    // Пояснение (перенос по ширине колонки)
    if (block?.note) {
      ctx.fillStyle = p.fg;
      const noteSize = unit * 2.4;
      ctx.font = `400 ${noteSize}px "Courier New", monospace`;
      const noteLines = wrapText(ctx, block.note, colW - unit * 2);
      for (const line of noteLines) {
        cy += noteSize * 1.35;
        ctx.fillText(line, colCx, cy);
      }
    }
  }

  // === Адрес снизу ===
  if (content.address?.trim()) {
    // Было: const addrY = H - margin - unit * 8;
    // Стало (поднимаем базовую точку выше):
    const addrY = H - margin - unit * 13;
    ctx.strokeStyle = p.frame;
    ctx.lineWidth = unit * 0.3;
    ctx.beginPath();
    ctx.moveTo(margin + unit * 4, addrY - unit * 4);
    ctx.lineTo(W - margin - unit * 4, addrY - unit * 4);
    ctx.stroke();

    ctx.fillStyle = p.muted;
    ctx.font = `400 ${unit * 2.3}px "Courier New", monospace`;
    ctx.fillText("МЫ НАХОДИМСЯ", cx, addrY);
    ctx.fillStyle = p.fg;
    ctx.font = `700 ${unit * 3}px "Courier New", monospace`;
    const addrLines = wrapText(ctx, content.address, W - margin * 2 - unit * 8);
    let ay = addrY;
    for (const line of addrLines) {
      ay += unit * 4;
      ctx.fillText(line, cx, ay);
    }
  }

  // Сброс выравнивания, чтобы не влиять на другие рендеры
  ctx.textAlign = "left";
}

/** Создаёт QR-код как HTMLImageElement из ссылки. */
function makeQrImage(url: string): Promise<HTMLImageElement> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 600,
    color: { dark: "#1a1a2e", light: "#ffffff" },
  }).then(
    (dataUrl) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
      }),
  );
}

/**
 * Асинхронный рендер: для QR-флаера сначала генерирует QR-картинки, затем
 * рисует макет с ними. Для остальных форматов просто вызывает renderAd.
 * Используется и для превью, и перед экспортом, чтобы QR точно были в кадре.
 */
export async function renderAdAsync(
  canvas: HTMLCanvasElement,
  content: AdContent,
) {
  if (content.format === "flyer_quarter" && content.qrBlocks) {
    const [a, b] = await Promise.all([
      makeQrImage(content.qrBlocks[0].url),
      makeQrImage(content.qrBlocks[1].url),
    ]);
    renderQrFlyer(canvas, content, [a, b]);
    return;
  }
  renderAd(canvas, content);
}

/** Имя файла без расширения по содержимому. */
function fileBase(content: AdContent): string {
  const safe = (content.title || "ad")
    .replace(/\s+/g, "-")
    .replace(/[^\wа-яё-]/gi, "")
    .slice(0, 40);
  return `diplom-inzh-${content.format}-${safe || "material"}`;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Выгрузка макета как PNG. */
export function exportPng(canvas: HTMLCanvasElement, content: AdContent) {
  const url = canvas.toDataURL("image/png");
  triggerDownload(url, `${fileBase(content)}.png`);
}

/** Выгрузка макета как JPG (белая подложка под прозрачность не нужна — фон непрозрачный). */
export function exportJpg(canvas: HTMLCanvasElement, content: AdContent) {
  const url = canvas.toDataURL("image/jpeg", 0.92);
  triggerDownload(url, `${fileBase(content)}.jpg`);
}

/** Выгрузка макета как PDF (один лист по габаритам макета). */
export function exportPdf(canvas: HTMLCanvasElement, content: AdContent) {
  const w = canvas.width;
  const h = canvas.height;
  const orientation = w >= h ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: [w, h] });
  const img = canvas.toDataURL("image/jpeg", 0.95);
  pdf.addImage(img, "JPEG", 0, 0, w, h);
  pdf.save(`${fileBase(content)}.pdf`);
}
