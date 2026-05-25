/**
 * Генерация PDF-отчёта по результатам МКЭ-расчёта.
 * Формат: А4 альбомный, векторный (jsPDF), без растровых скриншотов.
 *
 * Структура отчёта:
 *  1. Штамп (название проекта, дата, размерность)
 *  2. Расчётная схема — векторная отрисовка узлов и элементов
 *  3. Сводка результатов
 *  4. Таблица реакций опор
 *  5. Таблица экстремальных усилий по элементам
 *  6. Эпюры N, Q, M — векторные полигоны для каждого элемента
 */
import { jsPDF } from "jspdf";
import type { FrameModel, SolverResponse } from "./cae-model";

// ── Загрузка шрифта с кириллицей ──────────────────────────────────────────
// Стандартные шрифты jsPDF (Helvetica/Times/Courier) не поддерживают кириллицу.
// Подгружаем Roboto Regular и кешируем base64 в памяти.
// Используем raw.githubusercontent.com — стабильный источник с правильным CORS.
const FONT_TTF_URL =
  "https://raw.githubusercontent.com/googlefonts/roboto-2/main/src/hinted/Roboto-Regular.ttf";
const FONT_BOLD_TTF_URL =
  "https://raw.githubusercontent.com/googlefonts/roboto-2/main/src/hinted/Roboto-Bold.ttf";

// Запасные источники на случай блокировки основного
const FONT_TTF_FALLBACKS = [
  "https://cdn.jsdelivr.net/gh/googlefonts/roboto-2@main/src/hinted/Roboto-Regular.ttf",
];
const FONT_BOLD_TTF_FALLBACKS = [
  "https://cdn.jsdelivr.net/gh/googlefonts/roboto-2@main/src/hinted/Roboto-Bold.ttf",
];

let cachedFontB64: string | null = null;
let cachedBoldB64: string | null = null;
const fontState = { name: "helvetica" };

async function fetchFontB64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 10000) {
    throw new Error(`Подозрительно маленький файл (${buf.byteLength} байт) с ${url}`);
  }
  // ArrayBuffer → base64
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

async function ensureCyrillicFont(doc: jsPDF): Promise<boolean> {
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

// ── Цвета ──────────────────────────────────────────────────────────────────
const C = {
  ink: [26, 26, 46] as [number, number, number],
  thin: [90, 90, 120] as [number, number, number],
  accent: [192, 57, 43] as [number, number, number],
  N: [44, 62, 128] as [number, number, number],
  Q: [26, 138, 90] as [number, number, number],
  M: [192, 57, 43] as [number, number, number],
  grid: [220, 220, 215] as [number, number, number],
};

const fmt = (v: number, d = 2) => {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 100000) return v.toExponential(2);
  return v.toFixed(d);
};

// ── Вспомогательные функции рисования ─────────────────────────────────────
function hline(doc: jsPDF, x1: number, x2: number, y: number, lw = 0.3) {
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

function tableHeader(
  doc: jsPDF,
  cols: { label: string; x: number; w: number; align?: "left" | "right" | "center" }[],
  y: number,
  rowH = 5,
) {
  doc.setFillColor(...C.grid);
  doc.rect(cols[0].x, y, cols[cols.length - 1].x + cols[cols.length - 1].w - cols[0].x, rowH, "F");
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.thin);
  cols.forEach((c) => {
    doc.text(c.label, c.align === "right" ? c.x + c.w - 1 : c.x + 1, y + rowH - 1.5, {
      align: c.align ?? "left",
    });
  });
  return y + rowH;
}

function tableRow(
  doc: jsPDF,
  cols: { value: string; x: number; w: number; align?: "left" | "right" | "center" }[],
  y: number,
  rowH = 4.5,
  even = false,
) {
  if (even) {
    doc.setFillColor(245, 245, 242);
    doc.rect(cols[0].x, y, cols[cols.length - 1].x + cols[cols.length - 1].w - cols[0].x, rowH, "F");
  }
  doc.setFont(fontState.name, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.ink);
  cols.forEach((c) => {
    doc.text(c.value, c.align === "right" ? c.x + c.w - 1 : c.x + 1, y + rowH - 1.5, {
      align: c.align ?? "left",
    });
  });
  return y + rowH;
}

// ── Векторная расчётная схема ──────────────────────────────────────────────
function drawScheme(
  doc: jsPDF,
  model: FrameModel,
  result: SolverResponse | null,
  ox: number,   // origin X на странице (мм)
  oy: number,   // origin Y на странице (мм)
  boxW: number, // ширина области (мм)
  boxH: number, // высота области (мм)
) {
  if (model.nodes.length === 0) return;

  // Границы модели в мировых координатах
  const xs = model.nodes.map((n) => n.coords[0]);
  const ys = model.nodes.map((n) => n.coords[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const pad = 14; // отступ внутри рамки (место под подписи опор/нагрузок)
  // Если вертикальный размах слишком мал (1D балка), не растягиваем по Y
  const effectiveSpanY = Math.max(spanY, spanX * 0.05);
  const scaleX = (boxW - pad * 2) / spanX;
  const scaleY = (boxH - pad * 2) / effectiveSpanY;
  const scale = Math.min(scaleX, scaleY);
  const offX = ox + pad + (boxW - pad * 2 - spanX * scale) / 2;
  const offY = oy + pad + (boxH - pad * 2 - effectiveSpanY * scale) / 2 + ((spanY === 0 ? effectiveSpanY * scale / 2 : 0));

  const toX = (x: number) => offX + (x - minX) * scale;
  const toY = (y: number) => offY + (maxY - y) * scale; // Y инвертирован

  // Рамка области схемы
  doc.setDrawColor(...C.grid);
  doc.setLineWidth(0.3);
  doc.rect(ox, oy, boxW, boxH);

  // Подпись над рамкой
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.thin);
  doc.text("РАСЧЁТНАЯ СХЕМА", ox + 3, oy + 4);
  doc.setFont(fontState.name, "normal");

  // Элементы
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.8);
  for (const el of model.elements) {
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;
    doc.line(toX(a.coords[0]), toY(a.coords[1]), toX(b.coords[0]), toY(b.coords[1]));
  }

  // Узлы
  doc.setFillColor(...C.ink);
  for (const nd of model.nodes) {
    const x = toX(nd.coords[0]);
    const y = toY(nd.coords[1]);
    doc.circle(x, y, 0.8, "F");
  }

  // Граничные условия — маленькие треугольники под узлом
  doc.setDrawColor(...C.thin);
  doc.setLineWidth(0.3);
  for (const bc of model.boundary_conditions) {
    const nd = model.nodes.find((n) => n.id === bc.node_id);
    if (!nd) continue;
    const x = toX(nd.coords[0]);
    const y = toY(nd.coords[1]);
    // Треугольник опоры
    doc.setDrawColor(...C.thin);
    doc.triangle(x - 2.5, y + 1.5, x + 2.5, y + 1.5, x, y - 0.5, "S");
    // Штриховка под треугольником
    doc.line(x - 3, y + 1.8, x + 3, y + 1.8);
  }

  // Подписи узлов
  doc.setFont(fontState.name, "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...C.thin);
  for (const nd of model.nodes) {
    const x = toX(nd.coords[0]);
    const y = toY(nd.coords[1]);
    doc.text(nd.id, x + 1.2, y - 1.2);
  }

  // Размерная линия пролёта (для горизонтальной балки)
  if (spanX > 0 && model.elements.length > 0) {
    const yDim = oy + boxH - 6;
    const xL = toX(minX), xR = toX(maxX);
    doc.setDrawColor(...C.thin);
    doc.setLineWidth(0.2);
    doc.line(xL, yDim, xR, yDim);
    doc.line(xL, yDim - 1, xL, yDim + 1);
    doc.line(xR, yDim - 1, xR, yDim + 1);
    doc.setFontSize(6);
    doc.setTextColor(...C.thin);
    doc.text(`L = ${spanX.toFixed(2)} м`, (xL + xR) / 2, yDim - 1, { align: "center" });
  }

  // Нагрузки — узловые силы, распределённые и моменты
  for (const ld of model.loads) {
    // ── Узловая сила ──
    if (ld.type === "nodal_force" && ld.node_id) {
      const nd = model.nodes.find((n) => n.id === ld.node_id);
      if (!nd) continue;
      const fx = ld.force?.[0] ?? 0;
      const fy = ld.force?.[1] ?? 0;
      const mz = ld.moment?.[2] ?? 0;
      const tipX = toX(nd.coords[0]);
      const tipY = toY(nd.coords[1]);

      if (Math.abs(fx) > 1e-9 || Math.abs(fy) > 1e-9) {
        const mag = Math.sqrt(fx * fx + fy * fy);
        const arrowLen = 8;
        // Направление: куда указывает сила (стрелка прилетает в узел)
        const dirX = fx / mag;
        const dirY = -fy / mag; // экран Y вниз
        const tailX = tipX - dirX * arrowLen;
        const tailY = tipY - dirY * arrowLen;
        doc.setDrawColor(...C.accent);
        doc.setLineWidth(0.6);
        doc.line(tailX, tailY, tipX, tipY);
        // Наконечник
        const hL = 1.8, hW = 1.0;
        const perpX = -dirY, perpY = dirX;
        doc.line(tipX, tipY, tipX - dirX * hL + perpX * hW, tipY - dirY * hL + perpY * hW);
        doc.line(tipX, tipY, tipX - dirX * hL - perpX * hW, tipY - dirY * hL - perpY * hW);
        // Подпись
        doc.setFont(fontState.name, "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(...C.accent);
        const lbl = formatForce(mag);
        doc.text(lbl, tailX - dirX * 1.5, tailY - dirY * 1.5, {
          align: dirX > 0.3 ? "right" : dirX < -0.3 ? "left" : "center",
        });
      }

      // Момент в узле — дуга со стрелкой
      if (Math.abs(mz) > 1e-9) {
        const r = 3.2;
        doc.setDrawColor(...C.accent);
        doc.setLineWidth(0.5);
        // Рисуем дугу как ломаную (jsPDF.circle не умеет частичные дуги)
        const segs = 16;
        const startA = -Math.PI * 0.25;
        const endA = Math.PI * 1.25;
        const sign = mz > 0 ? 1 : -1;
        for (let i = 0; i < segs; i++) {
          const a1 = startA + sign * (i / segs) * (endA - startA);
          const a2 = startA + sign * ((i + 1) / segs) * (endA - startA);
          doc.line(tipX + r * Math.cos(a1), tipY + r * Math.sin(a1), tipX + r * Math.cos(a2), tipY + r * Math.sin(a2));
        }
        doc.setFont(fontState.name, "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(...C.accent);
        doc.text(formatMoment(mz), tipX + r + 0.5, tipY - r + 0.5);
      }
    }

    // ── Распределённая нагрузка ──
    if (ld.type === "distributed_uniform" && ld.element_id) {
      const el = model.elements.find((e) => e.id === ld.element_id);
      if (!el) continue;
      const a = model.nodes.find((n) => n.id === el.node_start);
      const b = model.nodes.find((n) => n.id === el.node_end);
      if (!a || !b) continue;

      const qx = ld.load_local_per_length?.[0] ?? 0;
      const qy = ld.load_local_per_length?.[1] ?? 0;
      const qMag = Math.sqrt(qx * qx + qy * qy);
      if (qMag < 1e-9) continue;

      // Локальная ось элемента в мировых координатах
      const dx = b.coords[0] - a.coords[0];
      const dy = b.coords[1] - a.coords[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-9) continue;
      const ex = dx / len, ey = dy / len;       // ось x локальная
      const nx = -ey, ny = ex;                  // ось y локальная (нормаль)

      // Высота стрелок нагрузки (фикс. размер на странице)
      const arrowH = 5;
      // Знак: если qy>0 — стрелки идут с положительной нормали В балку
      const sign = qy >= 0 ? 1 : -1;

      doc.setDrawColor(...C.accent);
      doc.setLineWidth(0.4);

      // Верхняя линия эпюры распределёнки
      const aX = toX(a.coords[0]), aY = toY(a.coords[1]);
      const bX = toX(b.coords[0]), bY = toY(b.coords[1]);
      const offX2 = nx * arrowH * sign;
      const offY2 = -ny * arrowH * sign; // экран Y инвертирован
      doc.line(aX + offX2, aY + offY2, bX + offX2, bY + offY2);

      // Стрелки вниз к балке
      const steps = Math.max(4, Math.min(12, Math.round(len * scale / 6)));
      const hL = 1.4, hW = 0.7;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wx = a.coords[0] + dx * t;
        const wy = a.coords[1] + dy * t;
        const sx = toX(wx), sy = toY(wy);
        const tx = sx + offX2, ty = sy + offY2;
        doc.line(tx, ty, sx, sy);
        // Наконечник к балке
        const adx = -offX2 / arrowH;
        const ady = -offY2 / arrowH;
        const px = -ady, py = adx;
        doc.line(sx, sy, sx - adx * hL + px * hW, sy - ady * hL + py * hW);
        doc.line(sx, sy, sx - adx * hL - px * hW, sy - ady * hL - py * hW);
      }

      // Подпись q
      const midX = (aX + bX) / 2 + offX2;
      const midY = (aY + bY) / 2 + offY2;
      doc.setFont(fontState.name, "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(...C.accent);
      doc.text(`q = ${formatDistLoad(qMag)}`, midX, midY - 1.5, { align: "center" });
    }
  }

  // Реакции опор (из результата) — синими стрелками вверх
  if (result) {
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(5.5);
    for (const r of result.reactions) {
      const nd = model.nodes.find((n) => n.id === r.node_id);
      if (!nd) continue;
      const x = toX(nd.coords[0]);
      const y = toY(nd.coords[1]);
      // Вертикальная реакция
      if (Math.abs(r.fy) > 1) {
        const arrowLen = 6;
        const dir = r.fy > 0 ? 1 : -1; // вверх если положительная
        doc.setDrawColor(...C.Q);
        doc.setLineWidth(0.5);
        // стрелка снаружи опоры — снизу вверх к узлу
        const tailY = y + arrowLen * dir;
        doc.line(x, tailY, x, y);
        // наконечник
        doc.line(x, y, x - 1, y + 1.5 * dir);
        doc.line(x, y, x + 1, y + 1.5 * dir);
        doc.setTextColor(...C.Q);
        doc.text(`R=${formatForce(Math.abs(r.fy))}`, x + 1, tailY + (dir > 0 ? 2 : -1));
      }
      // Горизонтальная реакция
      if (Math.abs(r.fx) > 1) {
        const arrowLen = 6;
        const dir = r.fx > 0 ? -1 : 1;
        doc.setDrawColor(...C.Q);
        doc.setLineWidth(0.5);
        const tailX = x + arrowLen * dir;
        doc.line(tailX, y, x, y);
        doc.line(x, y, x + 1.5 * dir, y - 1);
        doc.line(x, y, x + 1.5 * dir, y + 1);
        doc.setTextColor(...C.Q);
        doc.text(`H=${formatForce(Math.abs(r.fx))}`, tailX, y + (dir > 0 ? -1.5 : 3));
      }
    }
  }
}

// Форматирование сил и моментов с автомасштабом
function formatForce(N: number): string {
  const a = Math.abs(N);
  if (a >= 1e6) return `${(N / 1e6).toFixed(2)} МН`;
  if (a >= 1e3) return `${(N / 1e3).toFixed(1)} кН`;
  return `${N.toFixed(0)} Н`;
}
function formatMoment(Nm: number): string {
  const a = Math.abs(Nm);
  if (a >= 1e3) return `${(Nm / 1e3).toFixed(1)} кН·м`;
  return `${Nm.toFixed(0)} Н·м`;
}
function formatDistLoad(qNperM: number): string {
  const a = Math.abs(qNperM);
  if (a >= 1e3) return `${(qNperM / 1e3).toFixed(1)} кН/м`;
  return `${qNperM.toFixed(0)} Н/м`;
}

// ── Эпюры на PDF ───────────────────────────────────────────────────────────
function drawDiagram(
  doc: jsPDF,
  model: FrameModel,
  result: SolverResponse,
  kind: "N" | "Qy" | "Mz",
  ox: number, oy: number, boxW: number, boxH: number,
) {
  if (model.nodes.length === 0) return;

  const xs = model.nodes.map((n) => n.coords[0]);
  const ys = model.nodes.map((n) => n.coords[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const pad = 14;
  const effectiveSpanY = Math.max(spanY, spanX * 0.05);
  const scaleX = (boxW - pad * 2) / spanX;
  const scaleY = (boxH - pad * 2) / effectiveSpanY;
  const scale = Math.min(scaleX, scaleY);
  const offX = ox + pad + (boxW - pad * 2 - spanX * scale) / 2;
  const offY = oy + pad + (boxH - pad * 2 - effectiveSpanY * scale) / 2 +
    (spanY === 0 ? effectiveSpanY * scale / 2 : 0);

  const toX = (x: number) => offX + (x - minX) * scale;
  const toY = (y: number) => offY + (maxY - y) * scale;

  const color = kind === "N" ? C.N : kind === "Qy" ? C.Q : C.M;

  // Рамка
  doc.setDrawColor(...C.grid);
  doc.setLineWidth(0.2);
  doc.rect(ox, oy, boxW, boxH);

  // Подпись типа эпюры
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...color);
  const kindLabel = kind === "N" ? "N — продольная сила, Н" : kind === "Qy" ? "Q — поперечная сила, Н" : "M — изгибающий момент, Н·м";
  doc.text(kindLabel, ox + 2, oy + 4);

  // Ось элементов (балка) — чёрная тонкая
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.5);
  for (const el of model.elements) {
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;
    doc.line(toX(a.coords[0]), toY(a.coords[1]), toX(b.coords[0]), toY(b.coords[1]));
  }

  // Метки узлов на балке
  doc.setFont(fontState.name, "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...C.thin);
  for (const nd of model.nodes) {
    const x = toX(nd.coords[0]);
    const y = toY(nd.coords[1]);
    doc.setFillColor(...C.ink);
    doc.circle(x, y, 0.6, "F");
    doc.text(nd.id, x, y + 4, { align: "center" });
  }

  // Глобальный максимум для нормировки
  let globalMaxAbs = 1e-12;
  for (const er of result.elements) {
    const vals = kind === "N" ? er.diagrams.N : kind === "Qy" ? er.diagrams.Qy : er.diagrams.Mz;
    for (const v of vals) globalMaxAbs = Math.max(globalMaxAbs, Math.abs(v));
  }

  // Если эпюра практически нулевая — рисуем подпись и выходим
  if (globalMaxAbs < 1e-6) {
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.thin);
    const cx = (toX(minX) + toX(maxX)) / 2;
    const cy = toY((minY + maxY) / 2);
    doc.text("эпюра нулевая", cx, cy - 4, { align: "center" });
    return;
  }

  const offsetMM = 14; // макс высота эпюры в мм

  const fmtVal = (v: number): string => {
    const a = Math.abs(v);
    if (a >= 1e6) return `${(v / 1e6).toFixed(2)}М`;
    if (a >= 1e3) return `${(v / 1e3).toFixed(1)}к`;
    return v.toFixed(0);
  };

  for (const el of model.elements) {
    const er = result.elements.find((e) => e.element_id === el.id);
    if (!er) continue;
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;

    const dx = b.coords[0] - a.coords[0];
    const dy = b.coords[1] - a.coords[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-9) continue;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;

    const vals = kind === "N" ? er.diagrams.N : kind === "Qy" ? er.diagrams.Qy : er.diagrams.Mz;
    const dxArr = er.diagrams.x;

    // Точки эпюры в координатах страницы
    const epPts: [number, number][] = [];
    for (let i = 0; i < dxArr.length; i++) {
      const t = dxArr[i] / len;
      const wx = a.coords[0] + dx * t;
      const wy = a.coords[1] + dy * t;
      const dist = (vals[i] / globalMaxAbs) * offsetMM;
      epPts.push([toX(wx) + nx * dist, toY(wy) - ny * dist]);
    }
    const baseA: [number, number] = [toX(a.coords[0]), toY(a.coords[1])];
    const baseB: [number, number] = [toX(b.coords[0]), toY(b.coords[1])];

    // Заливка полигона (балка → эпюра → балка) через path API
    // Используем lines() — встроенный полигон в jsPDF
    if (epPts.length >= 2) {
      const linesArr: number[][] = [];
      // Стартуем в baseA — двигаемся в первую точку эпюры
      linesArr.push([epPts[0][0] - baseA[0], epPts[0][1] - baseA[1]]);
      // Затем по точкам эпюры
      for (let i = 1; i < epPts.length; i++) {
        linesArr.push([epPts[i][0] - epPts[i - 1][0], epPts[i][1] - epPts[i - 1][1]]);
      }
      // Замыкание к baseB
      linesArr.push([baseB[0] - epPts[epPts.length - 1][0], baseB[1] - epPts[epPts.length - 1][1]]);

      doc.setFillColor(color[0], color[1], color[2]);
      doc.setDrawColor(...color);
      doc.setLineWidth(0.4);
      // Полупрозрачная заливка
      doc.setGState(doc.GState({ opacity: 0.18 }));
      doc.lines(linesArr, baseA[0], baseA[1], [1, 1], "F", true);
      doc.setGState(doc.GState({ opacity: 1 }));
      // Контурная линия эпюры (без заливки)
      doc.setLineWidth(0.7);
      for (let i = 1; i < epPts.length; i++) {
        doc.line(epPts[i - 1][0], epPts[i - 1][1], epPts[i][0], epPts[i][1]);
      }
      // Перпендикуляры — крайние ординаты от балки к эпюре
      doc.setLineWidth(0.4);
      doc.line(baseA[0], baseA[1], epPts[0][0], epPts[0][1]);
      doc.line(baseB[0], baseB[1], epPts[epPts.length - 1][0], epPts[epPts.length - 1][1]);
    }

    // Подписи значений: на концах и в точке макс/мин
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...color);

    const annotate = (idx: number, alignCenter = true) => {
      const t = dxArr[idx] / len;
      const wx = a.coords[0] + dx * t;
      const wy = a.coords[1] + dy * t;
      const dist = (vals[idx] / globalMaxAbs) * offsetMM;
      const lx = toX(wx) + nx * dist;
      const ly = toY(wy) - ny * dist;
      // Смещаем подпись от балки
      const sgn = dist >= 0 ? -1 : 1;
      doc.text(fmtVal(vals[idx]), lx, ly + sgn * 1.2, { align: alignCenter ? "center" : "left" });
    };

    // Левый конец
    annotate(0);
    // Правый конец
    annotate(dxArr.length - 1);
    // Глобальный максимум по модулю
    let maxAbsEl = 0, maxIdx = 0;
    vals.forEach((v, i) => { if (Math.abs(v) > maxAbsEl) { maxAbsEl = Math.abs(v); maxIdx = i; } });
    if (maxIdx !== 0 && maxIdx !== dxArr.length - 1 && maxAbsEl > 1e-9) {
      annotate(maxIdx);
    }
  }
}

// ── Главная функция ────────────────────────────────────────────────────────
export async function generatePdfReport(
  model: FrameModel,
  result: SolverResponse,
  projectName: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const hasCyrillic = await ensureCyrillicFont(doc);
  const FONT = hasCyrillic ? "Roboto" : "helvetica";
  doc.setFont(FONT, "normal");

  const PW = 297, PH = 210;
  const ML = 10, MR = 10, MT = 10, MB = 10;
  const CW = PW - ML - MR; // content width

  // ── Страница 1: схема + сводка + реакции ──────────────────────────────
  // Штамп сверху
  doc.setFillColor(...C.ink);
  doc.rect(ML, MT, CW, 8, "F");
  doc.setFont(FONT, "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(projectName || "Расчёт рамы", ML + 3, MT + 5.5);
  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.text(
    `Плоская рама 2D · ${new Date().toLocaleDateString("ru-RU")} · диплом-инж.рф`,
    PW - MR - 3,
    MT + 5.5,
    { align: "right" },
  );

  const y = MT + 10;

  // Расчётная схема — левая половина
  const schemeW = CW * 0.55;
  const schemeH = PH - MT - MB - 10 - 20; // минус штамп и нижний блок
  drawScheme(doc, model, result, ML, y, schemeW, schemeH);

  // Правая колонка: сводка + реакции
  const rxX = ML + schemeW + 4;
  const rxW = CW - schemeW - 4;

  // Подзаголовок «Сводка»
  doc.setFont(FONT, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.thin);
  doc.text("РЕЗУЛЬТАТЫ РАСЧЁТА", rxX, y + 4);
  doc.setFont(FONT, "normal");
  hline(doc, rxX, rxX + rxW, y + 5.5, 0.3);
  doc.setDrawColor(...C.thin);

  const s = result.summary;
  const summaryRows = [
    ["Узлов", String(s.n_nodes)],
    ["Элементов", String(s.n_elements)],
    ["Степеней свободы", String(s.n_dofs)],
    ["Макс. прогиб", `${fmt(s.max_displacement * 1000, 3)} мм`],
    ["Макс. σ Мизес", `${fmt(s.max_sigma_vm / 1e6, 1)} МПа`],
    ["Запас прочности", s.min_safety_factor && s.min_safety_factor < 1e5 ? s.min_safety_factor.toFixed(2) : "∞"],
    ["Время расчёта", `${result.duration_ms ?? "—"} мс`],
  ];

  let sy = y + 8;
  doc.setFontSize(7);
  for (const [label, value] of summaryRows) {
    doc.setTextColor(...C.thin);
    doc.text(label, rxX, sy);
    doc.setTextColor(...C.ink);
    doc.text(value, rxX + rxW, sy, { align: "right" });
    sy += 4.5;
  }

  hline(doc, rxX, rxX + rxW, sy, 0.3);
  doc.setDrawColor(...C.thin);
  sy += 4;

  // Реакции опор
  if (result.reactions.length > 0) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.thin);
    doc.text("РЕАКЦИИ ОПОР", rxX, sy);
    doc.setFont(FONT, "normal");
    hline(doc, rxX, rxX + rxW, sy + 1.5, 0.3);
    doc.setDrawColor(...C.thin);
    sy += 4;

    const cols = [
      { label: "Узел", x: rxX, w: rxW * 0.22, align: "left" as const },
      { label: "Fx, Н", x: rxX + rxW * 0.22, w: rxW * 0.26, align: "right" as const },
      { label: "Fy, Н", x: rxX + rxW * 0.48, w: rxW * 0.26, align: "right" as const },
      { label: "Mz, Н·м", x: rxX + rxW * 0.74, w: rxW * 0.26, align: "right" as const },
    ];
    sy = tableHeader(doc, cols, sy);

    result.reactions.forEach((r, i) => {
      sy = tableRow(
        doc,
        [
          { value: r.node_id, ...cols[0] },
          { value: fmt(r.fx, 0), ...cols[1] },
          { value: fmt(r.fy, 0), ...cols[2] },
          { value: fmt(r.mz, 0), ...cols[3] },
        ],
        sy,
        4.5,
        i % 2 === 0,
      );
    });

    sy += 4;
    hline(doc, rxX, rxX + rxW, sy, 0.3);
    doc.setDrawColor(...C.thin);
    sy += 4;
  }

  // Таблица экстремальных усилий по элементам
  if (result.elements.length > 0) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.thin);
    doc.text("УСИЛИЯ ПО ЭЛЕМЕНТАМ", rxX, sy);
    doc.setFont(FONT, "normal");
    hline(doc, rxX, rxX + rxW, sy + 1.5, 0.3);
    doc.setDrawColor(...C.thin);
    sy += 4;

    const eCols = [
      { label: "Элем.", x: rxX, w: rxW * 0.2, align: "left" as const },
      { label: "N, Н", x: rxX + rxW * 0.2, w: rxW * 0.25, align: "right" as const },
      { label: "Q, Н", x: rxX + rxW * 0.45, w: rxW * 0.25, align: "right" as const },
      { label: "M, Н·м", x: rxX + rxW * 0.7, w: rxW * 0.3, align: "right" as const },
    ];
    sy = tableHeader(doc, eCols, sy);

    result.elements.forEach((er, i) => {
      const mv = er.max_values;
      const absQmax = er.diagrams.Qy.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      sy = tableRow(
        doc,
        [
          { value: er.element_id, ...eCols[0] },
          { value: fmt(mv.abs_N_max, 0), ...eCols[1] },
          { value: fmt(absQmax, 0), ...eCols[2] },
          { value: fmt(mv.abs_Mz_max ?? 0, 0), ...eCols[3] },
        ],
        sy,
        4.5,
        i % 2 === 0,
      );
      if (sy > PH - MB - 6) return; // не выходить за поле
    });

    sy += 4;
    hline(doc, rxX, rxX + rxW, sy, 0.3);
    doc.setDrawColor(...C.thin);
    sy += 4;
  }

  // ── Блок «Исходные данные» (материал, сечение, нагрузки, опоры) ──────
  if (sy < PH - MB - 30) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.thin);
    doc.text("ИСХОДНЫЕ ДАННЫЕ", rxX, sy);
    doc.setFont(FONT, "normal");
    hline(doc, rxX, rxX + rxW, sy + 1.5, 0.3);
    doc.setDrawColor(...C.thin);
    sy += 4;

    const mat = model.materials[0];
    const sec = model.sections[0];
    const dataRows: [string, string][] = [];
    if (mat) {
      dataRows.push(["Материал", mat.name]);
      dataRows.push(["Модуль E", `${(mat.E / 1e9).toFixed(0)} ГПа`]);
      if (mat.sigma_yield) {
        dataRows.push(["Предел текучести σ_т", `${(mat.sigma_yield / 1e6).toFixed(0)} МПа`]);
      }
    }
    if (sec) {
      dataRows.push(["Сечение", sec.name]);
      dataRows.push(["Площадь A", `${(sec.A * 1e4).toFixed(2)} см²`]);
      dataRows.push(["Момент инерции I_z", `${(sec.I_z * 1e8).toFixed(0)} см⁴`]);
    }
    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    for (const [label, value] of dataRows) {
      if (sy > PH - MB - 6) break;
      doc.setTextColor(...C.thin);
      doc.text(label, rxX, sy);
      doc.setTextColor(...C.ink);
      doc.text(value, rxX + rxW, sy, { align: "right" });
      sy += 4;
    }

    // Нагрузки
    if (model.loads.length > 0 && sy < PH - MB - 12) {
      sy += 2;
      doc.setTextColor(...C.thin);
      doc.setFontSize(6.5);
      doc.text("Приложенные нагрузки:", rxX, sy);
      sy += 3.5;
      doc.setFontSize(7);
      for (const ld of model.loads) {
        if (sy > PH - MB - 4) break;
        let desc = "";
        if (ld.type === "nodal_force" && ld.node_id) {
          const fx = ld.force?.[0] ?? 0;
          const fy = ld.force?.[1] ?? 0;
          const mz = ld.moment?.[2] ?? 0;
          const parts: string[] = [];
          if (Math.abs(fx) > 1e-9) parts.push(`Fx=${formatForce(fx)}`);
          if (Math.abs(fy) > 1e-9) parts.push(`Fy=${formatForce(fy)}`);
          if (Math.abs(mz) > 1e-9) parts.push(`Mz=${formatMoment(mz)}`);
          desc = `Узел ${ld.node_id}: ${parts.join(", ")}`;
        } else if (ld.type === "distributed_uniform" && ld.element_id) {
          const qy = ld.load_local_per_length?.[1] ?? 0;
          desc = `Элемент ${ld.element_id}: q=${formatDistLoad(qy)}`;
        }
        if (desc) {
          doc.setTextColor(...C.ink);
          doc.text(desc, rxX, sy);
          sy += 3.5;
        }
      }
    }
  }

  // ── Страница 2: Эпюры N, Q, M ──────────────────────────────────────────
  doc.addPage();

  // Штамп
  doc.setFillColor(...C.ink);
  doc.rect(ML, MT, CW, 8, "F");
  doc.setFont(FONT, "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`${projectName || "Расчёт"} · Эпюры`, ML + 3, MT + 5.5);
  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.text("диплом-инж.рф", PW - MR - 3, MT + 5.5, { align: "right" });

  const epyH = (PH - MT - MB - 10 - 4) / 3;
  const epyW = CW;

  drawDiagram(doc, model, result, "N", ML, MT + 10, epyW, epyH);
  drawDiagram(doc, model, result, "Qy", ML, MT + 10 + epyH + 2, epyW, epyH);
  drawDiagram(doc, model, result, "Mz", ML, MT + 10 + (epyH + 2) * 2, epyW, epyH);

  // Нижний колонтитул
  doc.setFont(FONT, "normal");
  doc.setFontSize(6);
  doc.setTextColor(...C.thin);
  doc.text(
    `Сформировано: ${new Date().toLocaleString("ru-RU")} · диплом-инж.рф`,
    PW / 2,
    PH - 4,
    { align: "center" },
  );

  // Сохранение
  const safeName = (projectName || "report").replace(/[^a-zа-яё0-9_\- ]/gi, "_").slice(0, 40);
  doc.save(`${safeName}_отчёт.pdf`);
}