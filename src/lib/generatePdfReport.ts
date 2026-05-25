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
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.ink);
  for (const nd of model.nodes) {
    const x = toX(nd.coords[0]);
    const y = toY(nd.coords[1]);
    doc.text(nd.id, x + 1.5, y - 2);
  }

  // Размерная линия пролёта (для горизонтальной балки)
  if (spanX > 0 && model.elements.length > 0) {
    const yDim = oy + boxH - 8;
    const xL = toX(minX), xR = toX(maxX);
    doc.setDrawColor(...C.thin);
    doc.setLineWidth(0.25);
    doc.line(xL, yDim, xR, yDim);
    doc.line(xL, yDim - 1.5, xL, yDim + 1.5);
    doc.line(xR, yDim - 1.5, xR, yDim + 1.5);
    doc.setFontSize(7);
    doc.setTextColor(...C.thin);
    doc.text(`L = ${spanX.toFixed(2)} м`, (xL + xR) / 2, yDim - 1.5, { align: "center" });
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
        doc.setFontSize(7);
        doc.setTextColor(...C.accent);
        const lbl = `F = ${formatForce(mag)}`;
        doc.text(lbl, tailX - dirX * 1.5, tailY - dirY * 1.5 - (dirY < 0 ? 0 : 2), {
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
        doc.setFontSize(7);
        doc.setTextColor(...C.accent);
        doc.text(`M = ${formatMoment(mz)}`, tipX + r + 1, tipY - r);
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
      doc.setFontSize(7);
      doc.setTextColor(...C.accent);
      doc.text(`q = ${formatDistLoad(qMag)}`, midX, midY - 1.8, { align: "center" });
    }

    // ── Точечная сила в пролёте ──
    if (ld.type === "in_span_point" && ld.element_id) {
      const el = model.elements.find((e) => e.id === ld.element_id);
      if (!el) continue;
      const a = model.nodes.find((n) => n.id === el.node_start);
      const b = model.nodes.find((n) => n.id === el.node_end);
      if (!a || !b) continue;

      const t = ld.position_ratio ?? 0.5;
      const wx = a.coords[0] + (b.coords[0] - a.coords[0]) * t;
      const wy = a.coords[1] + (b.coords[1] - a.coords[1]) * t;
      const fx = ld.force?.[0] ?? 0;
      const fy = ld.force?.[1] ?? 0;
      const mag = Math.sqrt(fx * fx + fy * fy);
      if (mag < 1e-9) continue;

      const tipX = toX(wx);
      const tipY = toY(wy);
      const arrowLen = 9;
      const dirX = fx / mag;
      const dirY = -fy / mag;
      const tailX = tipX - dirX * arrowLen;
      const tailY = tipY - dirY * arrowLen;
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(0.7);
      doc.line(tailX, tailY, tipX, tipY);
      // Наконечник
      const hL = 2.2, hW = 1.2;
      const perpX = -dirY, perpY = dirX;
      doc.line(tipX, tipY, tipX - dirX * hL + perpX * hW, tipY - dirY * hL + perpY * hW);
      doc.line(tipX, tipY, tipX - dirX * hL - perpX * hW, tipY - dirY * hL - perpY * hW);
      // Подпись P = ...
      doc.setFont(fontState.name, "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.accent);
      const lbl = `P = ${formatForce(mag)}`;
      const labelY = tailY - dirY * 1.5 - (dirY < 0 ? 0 : 2);
      const labelX = tailX - dirX * 1.5;
      doc.text(lbl, labelX, labelY, {
        align: dirX > 0.3 ? "right" : dirX < -0.3 ? "left" : "center",
      });
      // Подпись положения
      doc.setFontSize(6);
      doc.setTextColor(...C.thin);
      doc.text(`x=${(t * 100).toFixed(0)}%`, tipX, tipY + 3.5, { align: "center" });
    }
  }

  // Реакции опор (из результата) — зелёными стрелками
  if (result) {
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(7);
    for (const r of result.reactions) {
      const nd = model.nodes.find((n) => n.id === r.node_id);
      if (!nd) continue;
      const x = toX(nd.coords[0]);
      const y = toY(nd.coords[1]);
      // Вертикальная реакция — стрелка снаружи опоры под балкой, указывает к узлу
      if (Math.abs(r.fy) > 1) {
        const arrowLen = 8;
        const dir = r.fy > 0 ? 1 : -1; // если реакция положительная — стрелка снизу-вверх
        doc.setDrawColor(...C.Q);
        doc.setLineWidth(0.7);
        // Опора уже занимает 3 мм снизу от узла, поэтому стрелку рисуем ниже опоры
        const supportOff = 3;
        const tailY = y + supportOff + arrowLen * dir;
        const tipY = y + supportOff * dir;
        doc.line(x, tailY, x, tipY);
        // наконечник
        doc.line(x, tipY, x - 1.3, tipY + 1.8 * dir);
        doc.line(x, tipY, x + 1.3, tipY + 1.8 * dir);
        doc.setTextColor(...C.Q);
        doc.text(`R = ${formatForce(Math.abs(r.fy))}`, x + 1.5, tailY + (dir > 0 ? 2.5 : -1));
      }
      // Горизонтальная реакция
      if (Math.abs(r.fx) > 1) {
        const arrowLen = 8;
        const dir = r.fx > 0 ? -1 : 1;
        doc.setDrawColor(...C.Q);
        doc.setLineWidth(0.7);
        const tailX = x + arrowLen * dir;
        doc.line(tailX, y, x, y);
        doc.line(x, y, x + 1.8 * dir, y - 1.3);
        doc.line(x, y, x + 1.8 * dir, y + 1.3);
        doc.setTextColor(...C.Q);
        doc.text(`H = ${formatForce(Math.abs(r.fx))}`, tailX, y + (dir > 0 ? -2 : 3.5),
          { align: dir > 0 ? "right" : "left" });
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
type DiagramKind = "N" | "Qy" | "Mz" | "uy";

interface DiagramMeta {
  title: string;
  unit: string;
  color: [number, number, number];
  scale: number; // множитель для пересчёта значения в отображаемые единицы
  pickVals: (d: SolverResponse["elements"][number]["diagrams"]) => number[];
}

const DIAGRAM_META: Record<DiagramKind, DiagramMeta> = {
  N: { title: "N — продольная сила", unit: "Н", color: [44, 62, 128], scale: 1, pickVals: (d) => d.N },
  Qy: { title: "Q — поперечная сила", unit: "Н", color: [26, 138, 90], scale: 1, pickVals: (d) => d.Qy },
  Mz: { title: "M — изгибающий момент", unit: "Н·м", color: [192, 57, 43], scale: 1, pickVals: (d) => d.Mz },
  uy: { title: "v — прогиб (локальный Y)", unit: "мм", color: [217, 119, 6], scale: 1e3, pickVals: (d) => d.uy_local ?? [] },
};

function fmtNum(v: number): string {
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}·10⁶`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(2)}·10³`;
  if (a >= 1) return v.toFixed(2);
  if (a >= 1e-2) return v.toFixed(3);
  return v.toExponential(2);
}

function drawDiagram(
  doc: jsPDF,
  model: FrameModel,
  result: SolverResponse,
  kind: DiagramKind,
  ox: number, oy: number, boxW: number, boxH: number,
) {
  if (model.nodes.length === 0) return;

  const meta = DIAGRAM_META[kind];
  const color = meta.color;

  // Внутренние отступы для осей и подписей
  const padL = 18, padR = 8, padT = 10, padB = 14;
  const plotX = ox + padL;
  const plotY = oy + padT;
  const plotW = boxW - padL - padR;
  const plotH = boxH - padT - padB;

  // Границы по X (мировые координаты балки)
  const xsCoords = model.nodes.map((n) => n.coords[0]);
  const minX = Math.min(...xsCoords);
  const maxX = Math.max(...xsCoords);
  const spanX = maxX - minX || 1;

  // Собираем все значения по всем элементам для оси Y
  let yMin = Infinity, yMax = -Infinity;
  for (const er of result.elements) {
    const vs = meta.pickVals(er.diagrams);
    for (const v of vs) {
      const sv = v * meta.scale;
      if (sv < yMin) yMin = sv;
      if (sv > yMax) yMax = sv;
    }
  }
  if (!isFinite(yMin) || !isFinite(yMax)) {
    yMin = -1; yMax = 1;
  }
  // Гарантированно включаем 0 и добавляем 10% поля
  yMin = Math.min(yMin, 0);
  yMax = Math.max(yMax, 0);
  const yRange = yMax - yMin;
  const yPad = yRange > 0 ? yRange * 0.12 : 1;
  const yLow = yMin - yPad;
  const yHigh = yMax + yPad;
  const ySpan = yHigh - yLow || 1;

  // Преобразования: X — глобальная координата балки, Y — значение эпюры
  const toPxX = (xw: number) => plotX + ((xw - minX) / spanX) * plotW;
  const toPxY = (val: number) => plotY + plotH - ((val - yLow) / ySpan) * plotH;
  const yZero = toPxY(0);

  // Внешняя рамка
  doc.setDrawColor(...C.grid);
  doc.setLineWidth(0.2);
  doc.rect(ox, oy, boxW, boxH);

  // ── Заголовок эпюры ──
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...color);
  doc.text(`${meta.title}, ${meta.unit}`, ox + 3, oy + 5);

  // ── Сетка и оси ──
  // Горизонтальные линии (значения Y)
  const niceStep = (range: number, target = 4): number => {
    const raw = range / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return nice * mag;
  };
  const yStep = niceStep(ySpan);
  doc.setDrawColor(...C.grid);
  doc.setLineWidth(0.15);
  doc.setFont(fontState.name, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.thin);
  const yStart = Math.ceil(yLow / yStep) * yStep;
  for (let yv = yStart; yv <= yHigh + 1e-9; yv += yStep) {
    const py = toPxY(yv);
    doc.line(plotX, py, plotX + plotW, py);
    doc.text(fmtNum(yv), plotX - 1.5, py + 1, { align: "right" });
  }

  // Вертикальные линии (координата X по балке)
  const xStep = niceStep(spanX, 6);
  const xStart = Math.ceil(minX / xStep) * xStep;
  for (let xv = xStart; xv <= maxX + 1e-9; xv += xStep) {
    const px = toPxX(xv);
    doc.line(px, plotY, px, plotY + plotH);
    doc.text(`${xv.toFixed(2)}`, px, plotY + plotH + 4, { align: "center" });
  }
  // Подпись оси X (метры)
  doc.setFontSize(6);
  doc.text("x, м", plotX + plotW + 3, plotY + plotH + 1);

  // Жирная ось — нулевая линия эпюры (баланс балки)
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.4);
  doc.line(plotX, yZero, plotX + plotW, yZero);

  // Узлы — короткие риски по нулю
  doc.setFillColor(...C.ink);
  for (const nd of model.nodes) {
    const px = toPxX(nd.coords[0]);
    doc.circle(px, yZero, 0.7, "F");
    doc.setFont(fontState.name, "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.ink);
    doc.text(nd.id, px, yZero - 1.5, { align: "center" });
    doc.setFont(fontState.name, "normal");
  }

  // ── Сама эпюра ──
  // Найдём глобальные экстремумы по всей балке (для подписей)
  let globalMaxV = -Infinity, globalMinV = Infinity;
  let maxX_w = 0, minX_w = 0;
  let maxElId = "", minElId = "";

  for (const el of model.elements) {
    const er = result.elements.find((e) => e.element_id === el.id);
    if (!er) continue;
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;
    const x0 = a.coords[0], x1 = b.coords[0];
    const vs = meta.pickVals(er.diagrams);
    const xs = er.diagrams.x;
    if (!vs || vs.length === 0) continue;

    // Точки полилинии
    const pts: [number, number][] = [];
    for (let i = 0; i < xs.length; i++) {
      const t = xs[i] / er.length;
      const xw = x0 + (x1 - x0) * t;
      const sv = vs[i] * meta.scale;
      pts.push([toPxX(xw), toPxY(sv)]);

      if (sv > globalMaxV) { globalMaxV = sv; maxX_w = xw; maxElId = el.id; }
      if (sv < globalMinV) { globalMinV = sv; minX_w = xw; minElId = el.id; }
    }

    // Заливка полигона (нулевая ось → эпюра → нулевая ось)
    if (pts.length >= 2) {
      const linesArr: number[][] = [];
      // Старт: первая точка эпюры
      linesArr.push([pts[0][0] - pts[0][0], pts[0][1] - yZero]); // относительно (pts[0][0], yZero)
      for (let i = 1; i < pts.length; i++) {
        linesArr.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
      }
      // Замыкание к нулю
      linesArr.push([pts[pts.length - 1][0] - pts[pts.length - 1][0], yZero - pts[pts.length - 1][1]]);
      linesArr.push([pts[0][0] - pts[pts.length - 1][0], 0]);

      doc.setFillColor(color[0], color[1], color[2]);
      doc.setGState(doc.GState({ opacity: 0.18 }));
      doc.lines(linesArr, pts[0][0], yZero, [1, 1], "F", true);
      doc.setGState(doc.GState({ opacity: 1 }));
    }

    // Линия эпюры
    doc.setDrawColor(...color);
    doc.setLineWidth(0.8);
    for (let i = 1; i < pts.length; i++) {
      doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    }
  }

  // Если эпюра практически нулевая
  if (Math.abs(globalMaxV) < 1e-6 && Math.abs(globalMinV) < 1e-6) {
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.thin);
    doc.text("эпюра нулевая (все значения = 0)", plotX + plotW / 2, plotY + plotH / 2, { align: "center" });
    return;
  }

  // ── Подписи экстремумов с координатами ──
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...color);

  const labelExtremum = (val: number, xw: number, elId: string, isMax: boolean) => {
    if (Math.abs(val) < 1e-9) return;
    const px = toPxX(xw);
    const py = toPxY(val);
    // Маркер
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(px, py, 1.0, "F");
    // Вертикальный пунктир от 0 к точке
    doc.setDrawColor(...color);
    doc.setLineWidth(0.25);
    const dashLen = 1.2;
    const yA = Math.min(py, yZero), yB = Math.max(py, yZero);
    for (let yp = yA; yp < yB; yp += dashLen * 2) {
      doc.line(px, yp, px, Math.min(yp + dashLen, yB));
    }
    // Подпись со значением и координатой
    const text = `${isMax ? "max" : "min"} = ${fmtNum(val)} ${meta.unit}`;
    const coordText = `(${elId}, x = ${xw.toFixed(2)} м)`;
    // Адаптивное смещение: если точка выше оси — текст выше; если ниже — текст ниже
    const above = val >= 0;
    // Также сдвигаем по горизонтали чтоб не выходить за рамку
    let alignH: "left" | "center" | "right" = "center";
    let tx = px;
    if (px - plotX < 30) { alignH = "left"; tx = px + 2; }
    else if (plotX + plotW - px < 30) { alignH = "right"; tx = px - 2; }
    const ty = above ? py - 3.5 : py + 5;
    doc.setFont(fontState.name, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...color);
    doc.text(text, tx, ty, { align: alignH });
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(6);
    doc.setTextColor(...C.thin);
    doc.text(coordText, tx, ty + (above ? -3 : 3), { align: alignH });
  };

  labelExtremum(globalMaxV, maxX_w, maxElId, true);
  if (Math.abs(globalMinV - globalMaxV) > 1e-9) {
    labelExtremum(globalMinV, minX_w, minElId, false);
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

    // Уникальные материалы/сечения, реально используемые элементами
    const usedMatIds = new Set<string>();
    const usedSecIds = new Set<string>();
    for (const el of model.elements) {
      usedMatIds.add(el.material_id);
      usedSecIds.add(el.section_id);
    }
    const usedMats = model.materials.filter((m) => usedMatIds.has(m.id));
    const usedSecs = model.sections.filter((s) => usedSecIds.has(s.id));
    // fallback на первый, если ничего не сматчили
    const matList = usedMats.length > 0 ? usedMats : model.materials.slice(0, 1);
    const secList = usedSecs.length > 0 ? usedSecs : model.sections.slice(0, 1);

    const dataRows: [string, string][] = [];
    for (const mat of matList) {
      dataRows.push(["Материал", mat.name]);
      dataRows.push(["  Модуль E", `${(mat.E / 1e9).toFixed(0)} ГПа`]);
      if (mat.sigma_yield) {
        dataRows.push(["  Предел текучести σ_т", `${(mat.sigma_yield / 1e6).toFixed(0)} МПа`]);
      }
    }
    for (const sec of secList) {
      dataRows.push(["Сечение", sec.name]);
      dataRows.push(["  Площадь A", `${(sec.A * 1e4).toFixed(2)} см²`]);
      dataRows.push(["  Момент инерции Iz", `${(sec.I_z * 1e8).toFixed(0)} см⁴`]);
      if (sec.W_z) {
        dataRows.push(["  Момент сопротивления Wz", `${(sec.W_z * 1e6).toFixed(1)} см³`]);
      }
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
        } else if (ld.type === "in_span_point" && ld.element_id) {
          const fy = ld.force?.[1] ?? 0;
          const fx = ld.force?.[0] ?? 0;
          const pos = ((ld.position_ratio ?? 0.5) * 100).toFixed(0);
          const f = Math.abs(fy) > Math.abs(fx) ? fy : fx;
          desc = `Элемент ${ld.element_id}: P=${formatForce(f)} в ${pos}%`;
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

  // ── Страницы 2 и 3: Эпюры (по 2 на странице — крупно и читаемо) ───────
  const epyKinds: DiagramKind[] = ["N", "Qy", "Mz", "uy"];
  const pageTitles = ["Эпюры N, Q", "Эпюра M и прогибы"];
  const epyPerPage = 2;

  for (let p = 0; p < 2; p++) {
    doc.addPage();
    // Штамп
    doc.setFillColor(...C.ink);
    doc.rect(ML, MT, CW, 8, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${projectName || "Расчёт"} · ${pageTitles[p]}`, ML + 3, MT + 5.5);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    doc.text("диплом-инж.рф", PW - MR - 3, MT + 5.5, { align: "right" });

    const epyH = (PH - MT - MB - 10 - 4) / epyPerPage;
    const epyW = CW;

    for (let i = 0; i < epyPerPage; i++) {
      const kind = epyKinds[p * epyPerPage + i];
      if (!kind) continue;
      drawDiagram(doc, model, result, kind, ML, MT + 10 + (epyH + 4) * i, epyW, epyH);
    }
  }

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