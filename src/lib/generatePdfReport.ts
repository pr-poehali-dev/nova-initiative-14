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
import { svg2pdf } from "svg2pdf.js";
import type { FrameModel, SolverResponse } from "./cae-model";
import { runChecks, type ElementCheck } from "./cae-checks";
import { getIndustrySpec } from "./cae-industry";
import { DEFAULT_ANALYSIS_SETTINGS } from "./cae-model";
import { formatDistLoad, formatForce, formatMoment } from "./formatForce";

// Декомпозированные модули:
//   pdf/font-loader — загрузка Roboto с кириллицей + fontState singleton
//   pdf/palette     — цветовая палитра C (ink/thin/accent/N/Q/M/grid)
//   pdf/helpers     — fmt(), hline(), tableHeader(), tableRow()
import { ensureCyrillicFont, fontState } from "./pdf/font-loader";
import { C } from "./pdf/palette";
import { fmt, hline, tableHeader, tableRow } from "./pdf/helpers";

// ── Векторная расчётная схема ──────────────────────────────────────────────
/**
 * Рисует расчётную схему максимально близко к виду в приложении:
 *  - стержни с подписями e1, e2…
 *  - узлы с подписями n1, n2…
 *  - маркеры опор по ГОСТ 2.770 (треугольник = шарнир, штриховка = заделка, каток)
 *  - шарниры на концах стержней (белые кружки)
 *  - нагрузки: распределённые q (гребёнка с правильным направлением), точечные P
 *    (с подписью x=50%), узловые силы, моменты
 *  - реакции опор R (вертикальная) и H (горизонтальная) зелёным
 *  - размерные линии длин каждого стержня с засечками
 *  - общий габарит L внизу
 */
function drawScheme(
  doc: jsPDF,
  model: FrameModel,
  result: SolverResponse | null,
  ox: number,
  oy: number,
  boxW: number,
  boxH: number,
  opts?: { title?: string; showReactions?: boolean; showLoads?: boolean; showDims?: boolean },
) {
  if (model.nodes.length === 0) return;
  const showReactions = opts?.showReactions !== false;
  const showLoads = opts?.showLoads !== false;
  const showDims = opts?.showDims !== false;
  const title = opts?.title ?? "РАСЧЁТНАЯ СХЕМА";

  // Границы модели в мировых координатах
  const xs = model.nodes.map((n) => n.coords[0]);
  const ys = model.nodes.map((n) => n.coords[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  // Бóльшие поля: сверху — нагрузки и подписи q, снизу — опоры/реакции/L,
  // слева/справа — подписи R, H и x=50%.
  const padL = 18, padR = 18, padT = 18, padB = 26;
  const effectiveSpanY = Math.max(spanY, spanX * 0.05);
  const scaleX = (boxW - padL - padR) / spanX;
  const scaleY = (boxH - padT - padB) / effectiveSpanY;
  const scale = Math.min(scaleX, scaleY);
  const offX = ox + padL + (boxW - padL - padR - spanX * scale) / 2;
  const offY = oy + padT + (boxH - padT - padB - effectiveSpanY * scale) / 2 + (spanY === 0 ? effectiveSpanY * scale / 2 : 0);

  const toX = (x: number) => offX + (x - minX) * scale;
  const toY = (y: number) => offY + (maxY - y) * scale;

  // Рамка области схемы
  doc.setDrawColor(...C.grid);
  doc.setLineWidth(0.3);
  doc.rect(ox, oy, boxW, boxH);

  // Подпись над рамкой
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.thin);
  doc.text(title, ox + 3, oy + 4);
  doc.setFont(fontState.name, "normal");

  // Длины стержней — теперь рисуем В САМОМ КОНЦЕ функции (после эпюр),
  // чтобы плашки накладывались поверх и не пересекались с метками стержней.
  // (см. блок «Подписи длин стержней» в конце drawScheme).

  // Элементы (поверх размерных линий)
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.9);
  for (const el of model.elements) {
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;
    doc.line(toX(a.coords[0]), toY(a.coords[1]), toX(b.coords[0]), toY(b.coords[1]));
  }

  // Шарниры на концах элементов — белый кружок с обводкой
  for (const el of model.elements) {
    if (!el.hinge_start && !el.hinge_end) continue;
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;
    const ax = toX(a.coords[0]);
    const ay = toY(a.coords[1]);
    const bx = toX(b.coords[0]);
    const by = toY(b.coords[1]);
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 0.1) continue;
    const ux = dx / len;
    const uy = dy / len;
    const off = Math.min(2.5, len * 0.2);
    const r = 1.0;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...C.ink);
    doc.setLineWidth(0.4);
    if (el.hinge_start) doc.circle(ax + ux * off, ay + uy * off, r, "FD");
    if (el.hinge_end) doc.circle(bx - ux * off, by - uy * off, r, "FD");
  }

  // Подписи стержней (e1, e2, …) — в позиции 40% длины со смещением по нормали
  // в "противоположную" сторону относительно длины. Длина рисуется в позиции 60%
  // со смещением по нормали в "положительную" сторону. Так подписи никогда
  // не наезжают друг на друга.
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.ink);
  for (const el of model.elements) {
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;
    const ax = toX(a.coords[0]);
    const ay = toY(a.coords[1]);
    const bx = toX(b.coords[0]);
    const by = toY(b.coords[1]);
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 12) continue;
    const nx = (by - ay) / len;
    const ny = -(bx - ax) / len;
    // Позиция 40% длины + смещение на -4 мм по нормали (одна сторона стержня)
    const t = 0.40;
    const midX = ax + (bx - ax) * t;
    const midY = ay + (by - ay) * t;
    const off = -4.5;
    const tx = midX + nx * off;
    const ty = midY + ny * off;
    const label = el.label || el.id;
    const tw = doc.getTextWidth(label) + 1.6;
    doc.setFillColor(255, 255, 255);
    doc.rect(tx - tw / 2, ty - 1.7, tw, 2.6, "F");
    doc.text(label, tx, ty + 0.5, { align: "center" });
  }
  doc.setFont(fontState.name, "normal");

  // Узлы
  doc.setFillColor(...C.ink);
  for (const nd of model.nodes) {
    const x = toX(nd.coords[0]);
    const y = toY(nd.coords[1]);
    doc.circle(x, y, 1.0, "F");
  }

  // Граничные условия по ГОСТ 2.770: заделка (квадрат+штриховка),
  // шарнир (треугольник+штриховка), каток (треугольник+кружок).
  for (const bc of model.boundary_conditions) {
    const nd = model.nodes.find((n) => n.id === bc.node_id);
    if (!nd) continue;
    const x = toX(nd.coords[0]);
    const y = toY(nd.coords[1]);
    const dofs = new Set(bc.constrained_dofs);
    const isFixed = dofs.has("ux") && dofs.has("uy") && dofs.has("rz");
    const isPinned = dofs.has("ux") && dofs.has("uy") && !dofs.has("rz");

    doc.setDrawColor(...C.ink);
    doc.setLineWidth(0.4);

    if (isFixed) {
      // Заделка: прямоугольник со штриховкой
      const w = 6, h = 3;
      doc.rect(x - w / 2, y + 0.5, w, h, "S");
      for (let i = 0; i < 4; i++) {
        const sx = x - w / 2 + (i + 0.3) * (w / 4);
        doc.line(sx, y + 0.5 + h, sx + 1.5, y + 0.5 + h + 2);
      }
    } else if (isPinned) {
      // Шарнир: треугольник вершиной вверх + штриховка
      const s = 3.2;
      doc.triangle(x - s, y + s + 0.5, x + s, y + s + 0.5, x, y + 0.5, "S");
      doc.line(x - s, y + s + 0.5, x + s, y + s + 0.5);
      for (let i = 0; i < 4; i++) {
        const sx = x - s + (i + 0.3) * (s / 2);
        doc.line(sx, y + s + 0.5, sx + 1.2, y + s + 0.5 + 1.6);
      }
    } else {
      // Каток: треугольник + горизонтальная линия с кружками
      const s = 2.8;
      doc.triangle(x - s, y + s + 0.5, x + s, y + s + 0.5, x, y + 0.5, "S");
      doc.line(x - s - 1, y + s + 2.4, x + s + 1, y + s + 2.4);
      doc.circle(x - 1.4, y + s + 1.6, 0.5, "S");
      doc.circle(x + 1.4, y + s + 1.6, 0.5, "S");
    }
  }

  // Подписи узлов (n1, n2…) — над узлом, белая плашка
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.ink);
  for (const nd of model.nodes) {
    const x = toX(nd.coords[0]);
    const y = toY(nd.coords[1]);
    const tw = doc.getTextWidth(nd.id) + 1.4;
    doc.setFillColor(255, 255, 255);
    doc.rect(x + 1.5, y - 4.5, tw, 2.8, "F");
    doc.text(nd.id, x + 1.5 + tw / 2, y - 2.5, { align: "center" });
  }
  doc.setFont(fontState.name, "normal");

  // Общий габарит L снизу (как в приложении) с засечками-выносками
  if (showDims && spanX > 0 && model.elements.length > 0) {
    const yDim = oy + boxH - 6;
    const xL = toX(minX), xR = toX(maxX);
    doc.setDrawColor(...C.thin);
    doc.setLineWidth(0.25);
    // Размерная линия
    doc.line(xL, yDim, xR, yDim);
    // Засечки под 45° (ГОСТ 2.307)
    doc.line(xL - 1.2, yDim + 1.2, xL + 1.2, yDim - 1.2);
    doc.line(xR - 1.2, yDim + 1.2, xR + 1.2, yDim - 1.2);
    // Выносные линии (вертикальные тонкие)
    doc.setLineWidth(0.15);
    doc.line(xL, toY(minY) + 6, xL, yDim + 2);
    doc.line(xR, toY(minY) + 6, xR, yDim + 2);
    doc.setFontSize(7);
    doc.setFont(fontState.name, "bold");
    doc.setTextColor(...C.ink);
    const lblL = `L = ${spanX.toFixed(2)} м`;
    const tw = doc.getTextWidth(lblL) + 2;
    doc.setFillColor(255, 255, 255);
    doc.rect((xL + xR) / 2 - tw / 2, yDim - 2.5, tw, 2.6, "F");
    doc.text(lblL, (xL + xR) / 2, yDim - 0.5, { align: "center" });
    doc.setFont(fontState.name, "normal");
  }

  if (!showLoads) {
    // ранний выход — нагрузки и реакции рисуем только если попросили
    return;
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
    // Логика 1-в-1 с приложением (CanvasOverlays):
    //   ось x_local — от a к b, ось y_local — поворот x_local на +90° против часовой.
    //   Полное направление нагрузки в мире = ex*qx + nrm*qy.
    //   Стрелка строится "входящей в балку" — наконечник на оси стержня,
    //   хвост на смещении против направления нагрузки.
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

      const dx = b.coords[0] - a.coords[0];
      const dy = b.coords[1] - a.coords[1];
      const lenM = Math.sqrt(dx * dx + dy * dy);
      if (lenM < 1e-9) continue;

      // Локальные оси в мировой СК
      const ex_world = dx / lenM, ey_world = dy / lenM;
      const nx_world = -ey_world, ny_world = ex_world; // нормаль (+90° против часовой)
      // Полное направление нагрузки в мире
      const fx_world = ex_world * qx + nx_world * qy;
      const fy_world = ey_world * qx + ny_world * qy;
      const fmag = Math.sqrt(fx_world * fx_world + fy_world * fy_world);
      if (fmag < 1e-9) continue;
      // Единичный вектор в мире
      const fnx_world = fx_world / fmag;
      const fny_world = fy_world / fmag;
      // В экранных координатах Y инвертирован
      const sfnx = fnx_world;
      const sfny = -fny_world;

      const arrowH = 5; // длина каждой стрелки в мм PDF
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(0.4);

      const aX = toX(a.coords[0]), aY = toY(a.coords[1]);
      const bX = toX(b.coords[0]), bY = toY(b.coords[1]);
      // Верхняя линия гребёнки — на смещении ПРОТИВ направления нагрузки
      const topAX = aX - sfnx * arrowH;
      const topAY = aY - sfny * arrowH;
      const topBX = bX - sfnx * arrowH;
      const topBY = bY - sfny * arrowH;
      doc.line(topAX, topAY, topBX, topBY);

      // Стрелки от верхней линии к оси стержня (наконечник на оси)
      const steps = Math.max(4, Math.min(14, Math.round(lenM * scale / 6)));
      const hL = 1.5, hW = 0.8;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const tipX = aX + (bX - aX) * t;
        const tipY = aY + (bY - aY) * t;
        const tailX = tipX - sfnx * arrowH;
        const tailY = tipY - sfny * arrowH;
        doc.line(tailX, tailY, tipX, tipY);
        // Наконечник стрелки направлен В сторону балки (по +sfnx/+sfny)
        const angle = Math.atan2(tipY - tailY, tipX - tailX);
        const a1x = tipX - Math.cos(angle - Math.PI / 6) * hL * 2;
        const a1y = tipY - Math.sin(angle - Math.PI / 6) * hL * 2;
        const a2x = tipX - Math.cos(angle + Math.PI / 6) * hL * 2;
        const a2y = tipY - Math.sin(angle + Math.PI / 6) * hL * 2;
        // Маленькие штрихи треугольника наконечника
        doc.line(tipX, tipY, a1x, a1y);
        doc.line(tipX, tipY, a2x, a2y);
        void hW;
      }

      // Подпись q (по абсолютной величине, как в приложении)
      const midX = (topAX + topBX) / 2;
      const midY = (topAY + topBY) / 2;
      doc.setFont(fontState.name, "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.accent);
      const lbl = `q = ${formatDistLoad(Math.abs(qy) > Math.abs(qx) ? qy : qx)}`;
      const tw = doc.getTextWidth(lbl) + 2;
      doc.setFillColor(255, 255, 255);
      doc.rect(midX - tw / 2, midY - 3.2, tw, 2.6, "F");
      doc.text(lbl, midX, midY - 1.2, { align: "center" });
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
  if (result && showReactions) {
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

  // ── Подписи длин стержней (поверх всего) ──
  // Размещаются в позиции 60% длины стержня и смещаются по нормали на +5 мм
  // в "положительную" сторону. Метки стержней (e1, e2…) стоят в позиции 40%
  // на отрицательной стороне нормали — таким образом подписи никогда
  // не перекрываются ни друг с другом, ни с узлами на концах.
  if (showDims) {
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.thin);
    for (const el of model.elements) {
      const a = model.nodes.find((n) => n.id === el.node_start);
      const b = model.nodes.find((n) => n.id === el.node_end);
      if (!a || !b) continue;
      const ax = toX(a.coords[0]);
      const ay = toY(a.coords[1]);
      const bx = toX(b.coords[0]);
      const by = toY(b.coords[1]);
      const lenPx = Math.hypot(bx - ax, by - ay);
      if (lenPx < 22) continue;
      const lenM = Math.hypot(b.coords[0] - a.coords[0], b.coords[1] - a.coords[1]);
      const nx = (by - ay) / lenPx;
      const ny = -(bx - ax) / lenPx;
      const t = 0.62;
      const midX = ax + (bx - ax) * t;
      const midY = ay + (by - ay) * t;
      const off = 5;
      const tx = midX + nx * off;
      const ty = midY + ny * off;
      const txt = `${lenM.toFixed(3)} м`;
      const tw = doc.getTextWidth(txt) + 2;
      doc.setFillColor(255, 255, 255);
      doc.rect(tx - tw / 2, ty - 1.7, tw, 2.6, "F");
      doc.text(txt, tx, ty + 0.4, { align: "center" });
    }
  }
}

// Форматирование сил и моментов — единый источник правды для всего приложения.
// Правила (см. src/lib/formatForce.ts):
//   |F| < 1000 Н   → "X Н"
//   |F| ≥ 1000 Н   → "X.X кН"
//   |F| ≥ 1 000 000 Н → "X.XX МН"

// ── Эпюры на PDF ───────────────────────────────────────────────────────────
type DiagramKind = "N" | "Qy" | "Mz" | "uy";

/**
 * Рисует эпюру выбранной величины ПОВЕРХ расчётной схемы — точно как в приложении:
 *  - каждый стержень имеет свою локальную нормаль
 *  - значения эпюры откладываются по нормали в обе стороны от оси
 *  - область между осью стержня и графиком эпюры заливается полупрозрачным цветом
 *  - подписываются глобальные max и min с маркерами
 * Использует тот же масштаб координат, что и drawScheme.
 */
function drawDiagramOverScheme(
  doc: jsPDF,
  model: FrameModel,
  result: SolverResponse,
  kind: DiagramKind,
  ox: number,
  oy: number,
  boxW: number,
  boxH: number,
) {
  if (model.nodes.length === 0) return;

  // Сначала рисуем схему без нагрузок и реакций — чистый каркас с подписями узлов/стержней
  drawScheme(doc, model, result, ox, oy, boxW, boxH, {
    title: `ЭПЮРА ${kind === "N" ? "N — продольная сила" : kind === "Qy" ? "Qy — поперечная сила" : kind === "Mz" ? "Mz — изгибающий момент" : "v — прогиб"}`,
    showLoads: false,
    showReactions: false,
    showDims: false,
  });

  // Координатное преобразование такое же, как в drawScheme — пересчитываем заново
  const xs = model.nodes.map((n) => n.coords[0]);
  const ys = model.nodes.map((n) => n.coords[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const padL = 18, padR = 18, padT = 18, padB = 26;
  const effectiveSpanY = Math.max(spanY, spanX * 0.05);
  const scale = Math.min((boxW - padL - padR) / spanX, (boxH - padT - padB) / effectiveSpanY);
  const offX = ox + padL + (boxW - padL - padR - spanX * scale) / 2;
  const offY = oy + padT + (boxH - padT - padB - effectiveSpanY * scale) / 2 + (spanY === 0 ? effectiveSpanY * scale / 2 : 0);
  const toX = (x: number) => offX + (x - minX) * scale;
  const toY = (y: number) => offY + (maxY - y) * scale;

  const color: [number, number, number] =
    kind === "N" ? [44, 62, 128]
    : kind === "Qy" ? [26, 138, 90]
    : kind === "Mz" ? [192, 57, 43]
    : [217, 119, 6];
  const unit = kind === "Mz" ? "Н·м" : kind === "uy" ? "мм" : "Н";

  // Сбор данных по элементам и глобальный maxAbs
  interface ElDiag {
    el: { id: string; node_start: string; node_end: string; label?: string };
    vals: number[];
    xs: number[];
    nx: number; ny: number; // нормаль в МИРЕ
    aX: number; aY: number; bX: number; bY: number; // экранные координаты
    len: number;
    a: { coords: [number, number, number] };
    dx: number; dy: number;
    // Точка локального |max| — заполняется при отрисовке, используется
    // для подписи каждого стержня его собственным экстремумом.
    localPeak?: { val: number; sx: number; sy: number };
  }
  const list: ElDiag[] = [];
  let globalMax = -Infinity, globalMin = Infinity;
  let maxRef: { val: number; sxRel: number; syRel: number; elId: string } | null = null;
  let minRef: { val: number; sxRel: number; syRel: number; elId: string } | null = null;

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
    const nx = -dy / len, ny = dx / len; // нормаль в МИРЕ
    let vals: number[] = [];
    if (kind === "N") vals = er.diagrams.N;
    else if (kind === "Qy") vals = er.diagrams.Qy;
    else if (kind === "Mz") vals = er.diagrams.Mz;
    else vals = (er.diagrams.uy_local ?? []).map((v) => v * 1000); // в мм для подписи
    if (!vals || vals.length === 0) continue;
    list.push({
      el: { id: el.id, node_start: el.node_start, node_end: el.node_end, label: el.label },
      vals, xs: er.diagrams.x,
      nx, ny,
      aX: toX(a.coords[0]), aY: toY(a.coords[1]),
      bX: toX(b.coords[0]), bY: toY(b.coords[1]),
      len, a, dx, dy,
    });
    for (const v of vals) {
      if (v > globalMax) globalMax = v;
      if (v < globalMin) globalMin = v;
    }
  }
  if (list.length === 0) return;

  // Масштаб эпюры — ГЛОБАЛЬНЫЙ с защитой минимальной высоты ("floor").
  // Самый большой элемент занимает offsetPdf мм. Каждый стержень рисуется
  // пропорционально своему |max| / globalMaxAbs — поэтому 200 Н на фоне
  // 50 кН будут визуально в 250 раз меньше (это правильное восприятие порядка).
  // НО чтобы крошечные эпюры не исчезали в 0.04 мм и оставались читаемыми,
  // вводим floor: каждый элемент гарантированно не меньше MIN_FRACTION
  // от offsetPdf. Это компромисс между честным масштабом и UX.
  const schemeSize = Math.min(boxW - 36, boxH - 44); // эффективный размер в мм
  const rawOffset = schemeSize * 0.22; // 22% от размера схемы
  const offsetPdf = Math.min(rawOffset, 14); // не больше 14 мм
  const MIN_FRACTION = 0.08; // минимум 8% — мелкие эпюры остаются видимыми
  const globalMaxAbs = Math.max(1e-12, ...list.flatMap((d) => d.vals.map((v) => Math.abs(v))));

  // Рисуем для каждого стержня
  for (const d of list) {
    // Локальный |max| этого стержня
    const elMaxAbs = Math.max(1e-12, ...d.vals.map((v) => Math.abs(v)));
    // Целевая высота эпюры этого стержня в мм:
    //   - честная доля от globalMaxAbs (elMaxAbs / globalMaxAbs)
    //   - но не меньше MIN_FRACTION (чтобы мелкие не исчезли)
    const targetHeightMm = offsetPdf * Math.max(elMaxAbs / globalMaxAbs, MIN_FRACTION);
    // Коэффициент перевода значения эпюры в мм для этого стержня.
    // Внутри элемента форма эпюры сохраняется (все точки умножаются на k).
    const k = targetHeightMm / elMaxAbs;
    const sx_arr: number[] = [];
    const sy_arr: number[] = [];
    let iLocalMax = 0;
    for (let i = 0; i < d.xs.length; i++) {
      const t = d.xs[i] / d.len;
      const wx = d.a.coords[0] + d.dx * t;
      const wy = d.a.coords[1] + d.dy * t;
      // В мире: смещение по нормали на vals[i]*k. Учитываем что Y экрана инвертирован.
      const dist = d.vals[i] * k;
      const sx = toX(wx) + d.nx * dist;
      const sy = toY(wy) - d.ny * dist; // - потому что мировая y вверх, экранная вниз
      sx_arr.push(sx);
      sy_arr.push(sy);
      if (Math.abs(d.vals[i]) > Math.abs(d.vals[iLocalMax])) iLocalMax = i;
      if (d.vals[i] === globalMax && maxRef === null) {
        maxRef = { val: globalMax, sxRel: sx, syRel: sy, elId: d.el.id };
      }
      if (d.vals[i] === globalMin && minRef === null) {
        minRef = { val: globalMin, sxRel: sx, syRel: sy, elId: d.el.id };
      }
    }
    // Запоминаем точку локального |max| для последующих подписей.
    d.localPeak = {
      val: d.vals[iLocalMax],
      sx: sx_arr[iLocalMax],
      sy: sy_arr[iLocalMax],
    };

    // Полигон-заливка: вершины [aX,aY] → все точки эпюры → [bX,bY] → замыкание на aX,aY
    const polyX = [d.aX, ...sx_arr, d.bX];
    const polyY = [d.aY, ...sy_arr, d.bY];
    // Заливка через doc.lines (относительные смещения)
    const segs: number[][] = [];
    for (let i = 1; i < polyX.length; i++) {
      segs.push([polyX[i] - polyX[i - 1], polyY[i] - polyY[i - 1]]);
    }
    segs.push([polyX[0] - polyX[polyX.length - 1], polyY[0] - polyY[polyY.length - 1]]);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setGState(doc.GState({ opacity: 0.18 }));
    doc.lines(segs, polyX[0], polyY[0], [1, 1], "F", true);
    doc.setGState(doc.GState({ opacity: 1 }));

    // Линия эпюры
    doc.setDrawColor(...color);
    doc.setLineWidth(0.7);
    for (let i = 1; i < sx_arr.length; i++) {
      doc.line(sx_arr[i - 1], sy_arr[i - 1], sx_arr[i], sy_arr[i]);
    }
  }

  // Подписи: КАЖДЫЙ стержень помечается своим локальным экстремумом —
  // это даёт пользователю числовое значение даже на визуально мелкой эпюре.
  // Глобальные max и min выделяются жирным шрифтом и контрастной плашкой.
  // Детект коллизий: если плашки накладываются — ищем альтернативную позицию.
  interface LblRect { x: number; y: number; w: number; h: number }
  const placedLbls: LblRect[] = [];
  const lblOverlaps = (a: LblRect, b: LblRect) =>
    !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);

  // Форматирование значения в "человекочитаемых" единицах
  // (Н/кН/МН для сил, Н·м/кН·м/МН·м для моментов, мм для прогиба).
  const formatVal = (v: number): string => {
    if (kind === "Mz") return formatMoment(v);
    if (kind === "uy") return `${v.toFixed(2)} мм`;
    return formatForce(v); // N и Qy
  };

  // Глобальный |max| (используется для решения «значимости» — какие подписи
  // показывать жирно). Эпюры со значениями < 1% от глобального не подписываем
  // вовсе — это шум численного решения.
  const globalAbs = Math.max(globalMax, -globalMin, 1e-12);
  const SIGNIFICANCE = 0.01; // 1% от глобального max — порог отображения подписи

  const drawValueLabel = (
    pt: { val: number; sxRel: number; syRel: number; elId: string },
    isGlobalExtremum: boolean,
  ) => {
    if (Math.abs(pt.val) < globalAbs * SIGNIFICANCE) return;
    const d = list.find((x) => x.el.id === pt.elId);
    const sign = pt.val >= 0 ? 1 : -1;
    // Маркер: для глобальных экстремумов крупнее
    doc.setFillColor(...color);
    doc.circle(pt.sxRel, pt.syRel, isGlobalExtremum ? 1.2 : 0.7, "F");
    // Подпись
    const txt = formatVal(pt.val);
    if (isGlobalExtremum) {
      doc.setFont(fontState.name, "bold");
      doc.setFontSize(7.5);
    } else {
      doc.setFont(fontState.name, "normal");
      doc.setFontSize(6);
    }
    const tw = doc.getTextWidth(txt) + 2;
    const th = isGlobalExtremum ? 3 : 2.4;

    // Кандидаты позиций для плашки: от ближайшей к точке до сдвинутых
    const candidates: Array<{ x: number; y: number }> = [];
    for (const offText of [3, 5.5, 8.5, 12]) {
      const nx = d?.nx ?? 0;
      const ny = d?.ny ?? 0;
      // По нормали в текущую сторону (sign)
      candidates.push({
        x: pt.sxRel + nx * sign * offText - tw / 2,
        y: pt.syRel - ny * sign * offText - th / 2,
      });
      // По нормали в противоположную сторону
      candidates.push({
        x: pt.sxRel - nx * sign * offText - tw / 2,
        y: pt.syRel + ny * sign * offText - th / 2,
      });
      // По диагоналям (вдоль стержня + нормаль)
      const ex = ny, ey = -nx; // вектор вдоль стержня (90° от нормали)
      candidates.push({
        x: pt.sxRel + ex * offText + nx * sign * offText - tw / 2,
        y: pt.syRel - ey * offText - ny * sign * offText - th / 2,
      });
      candidates.push({
        x: pt.sxRel - ex * offText + nx * sign * offText - tw / 2,
        y: pt.syRel + ey * offText - ny * sign * offText - th / 2,
      });
    }

    // Выбираем первый кандидат без коллизий
    let chosen = candidates[0];
    for (const c of candidates) {
      const r: LblRect = { x: c.x, y: c.y, w: tw, h: th };
      const hasOverlap = placedLbls.some((p) => lblOverlaps(r, p));
      if (!hasOverlap) {
        chosen = c;
        break;
      }
    }
    placedLbls.push({ x: chosen.x, y: chosen.y, w: tw, h: th });

    // Выноска от точки к центру плашки — только если плашка отъехала далеко.
    const dxLine = chosen.x + tw / 2 - pt.sxRel;
    const dyLine = chosen.y + th / 2 - pt.syRel;
    if (Math.hypot(dxLine, dyLine) > 2.5) {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.2);
      doc.line(pt.sxRel, pt.syRel, chosen.x + tw / 2, chosen.y + th / 2);
    }

    // Плашка
    if (isGlobalExtremum) {
      // Цветная заливка для глобальных — выделяемся среди локальных подписей
      doc.setFillColor(255, 255, 255);
      doc.rect(chosen.x, chosen.y, tw, th, "F");
      doc.setDrawColor(...color);
      doc.setLineWidth(0.3);
      doc.rect(chosen.x, chosen.y, tw, th);
      doc.setTextColor(...color);
    } else {
      // Полупрозрачная белая плашка для локальных
      doc.setGState(doc.GState({ opacity: 0.88 }));
      doc.setFillColor(255, 255, 255);
      doc.rect(chosen.x, chosen.y, tw, th, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
      doc.setTextColor(...C.ink);
    }
    doc.text(txt, chosen.x + tw / 2, chosen.y + th - 0.7, { align: "center" });
    doc.setFont(fontState.name, "normal");
  };

  // Сначала рисуем глобальные max и min — их позиции "застолбят" место,
  // и локальные подписи будут подстраиваться вокруг них.
  if (maxRef) drawValueLabel(maxRef, true);
  if (minRef && minRef.val !== (maxRef?.val ?? Infinity)) drawValueLabel(minRef, true);

  // Затем — локальные пики каждого стержня (кроме тех, что совпадают
  // с глобальными — чтобы не дублировать подпись).
  for (const d of list) {
    if (!d.localPeak) continue;
    const isGlobalMax = maxRef !== null && d.el.id === maxRef.elId && d.localPeak.val === maxRef.val;
    const isGlobalMin = minRef !== null && d.el.id === minRef.elId && d.localPeak.val === minRef.val;
    if (isGlobalMax || isGlobalMin) continue;
    drawValueLabel(
      { val: d.localPeak.val, sxRel: d.localPeak.sx, syRel: d.localPeak.sy, elId: d.el.id },
      false,
    );
  }

  // Легенда внизу справа: честно описываем масштаб (глобальный с floor 8%).
  doc.setFont(fontState.name, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.thin);
  doc.text(
    `Эпюра в нормалях стержней · глобальный масштаб (|max| = ${formatVal(globalAbs)}, floor 8%) · подписи — пиковые значения по каждому стержню`,
    ox + boxW - 3,
    oy + boxH - 2,
    { align: "right" },
  );
}

/**
 * Развёртка одного стержня на одной странице.
 * Сверху — шапка с подписью узлов, длиной, материалом и сечением.
 * Далее — горизонтальная ось стержня с маркерами узлов и шарнирами.
 * Под ней — три крупные эпюры N, Qy, Mz (высота ~50 мм каждая) с:
 *   • выносными подписями max/min со стрелкой к точке экстремума,
 *   • размерной сеткой по длине (0, L/4, L/2, 3L/4, L),
 *   • заливкой области между нулевой осью и кривой эпюры,
 *   • подписью единиц измерения справа сверху.
 */
function drawSingleElementUnfolded(
  doc: jsPDF,
  model: FrameModel,
  result: SolverResponse,
  elementId: string,
  ox: number,
  oy: number,
  boxW: number,
  boxH: number,
) {
  const el = model.elements.find((e) => e.id === elementId);
  const er = result.elements.find((e) => e.element_id === elementId);
  if (!el || !er) return;
  const mat = model.materials.find((m) => m.id === el.material_id);
  const sec = model.sections.find((s) => s.id === el.section_id);
  const label = el.label || el.id;

  // ── Шапка стержня ──
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text(`Стержень ${label} — развёртка с эпюрами`, ox, oy + 5);

  doc.setFont(fontState.name, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.thin);
  const headerLines = [
    `Узлы: ${el.node_start} → ${el.node_end}    Длина L = ${er.length.toFixed(3)} м`,
    mat ? `Материал: ${mat.name}    E = ${(mat.E / 1e9).toFixed(0)} ГПа` : "",
    sec ? `Сечение: ${sec.name}    A = ${(sec.A * 1e4).toFixed(2)} см²    Iz = ${(sec.I_z * 1e8).toFixed(1)} см⁴` : "",
  ].filter(Boolean);
  let yHead = oy + 10;
  for (const ln of headerLines) {
    doc.text(ln, ox, yHead);
    yHead += 4.5;
  }
  yHead += 2;

  // ── Ось стержня с маркерами узлов и шарнирами ──
  const barY = yHead + 5;
  const barXL = ox + 12;
  const barXR = ox + boxW - 12;
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(2.0);
  doc.line(barXL, barY, barXR, barY);
  // Узлы
  doc.setFillColor(...C.ink);
  doc.circle(barXL, barY, 1.4, "F");
  doc.circle(barXR, barY, 1.4, "F");
  // Шарниры на концах
  if (el.hinge_start) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...C.ink);
    doc.setLineWidth(0.5);
    doc.circle(barXL + 4, barY, 1.2, "FD");
  }
  if (el.hinge_end) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...C.ink);
    doc.setLineWidth(0.5);
    doc.circle(barXR - 4, barY, 1.2, "FD");
  }
  // Подписи узлов
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.ink);
  doc.text(el.node_start, barXL, barY - 3, { align: "center" });
  doc.text(el.node_end, barXR, barY - 3, { align: "center" });

  // Размерная линия снизу: L = X м
  doc.setDrawColor(...C.thin);
  doc.setLineWidth(0.25);
  const yDim = barY + 6;
  doc.line(barXL, yDim, barXR, yDim);
  // Засечки 45°
  doc.line(barXL - 1.4, yDim + 1.4, barXL + 1.4, yDim - 1.4);
  doc.line(barXR - 1.4, yDim + 1.4, barXR + 1.4, yDim - 1.4);
  // Выносные тонкие линии
  doc.setLineWidth(0.15);
  doc.line(barXL, barY + 2, barXL, yDim + 1.6);
  doc.line(barXR, barY + 2, barXR, yDim + 1.6);
  doc.setFont(fontState.name, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.ink);
  const lblL = `L = ${er.length.toFixed(3)} м`;
  const twL = doc.getTextWidth(lblL) + 2;
  doc.setFillColor(255, 255, 255);
  doc.rect((barXL + barXR) / 2 - twL / 2, yDim - 2.6, twL, 2.8, "F");
  doc.text(lblL, (barXL + barXR) / 2, yDim - 0.5, { align: "center" });

  // ── Три крупные эпюры ──
  const epyTop = yDim + 6;
  const epyBottom = oy + boxH - 4;
  const gap = 4;
  const epyH = Math.max(35, (epyBottom - epyTop - gap * 2) / 3);

  const drawBigEpy = (
    by: number, bh: number,
    vals: number[], xs: number[],
    color: [number, number, number],
    title: string, unit: string,
    fullTitle: string,
  ) => {
    const plotX = barXL;
    const plotW = barXR - barXL;
    // Внешняя рамка-плашка
    doc.setDrawColor(...C.grid);
    doc.setLineWidth(0.25);
    doc.rect(ox, by, boxW, bh);
    // Заголовок эпюры слева сверху
    doc.setFont(fontState.name, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...color);
    doc.text(title, ox + 2, by + 5.5);
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.thin);
    doc.text(fullTitle, ox + 2 + doc.getTextWidth(title) + 2, by + 5.5);
    // Единицы справа сверху
    doc.setFontSize(8);
    doc.setTextColor(...C.thin);
    doc.text(unit, ox + boxW - 2, by + 5.5, { align: "right" });

    // Область графика
    const plotTop = by + 9;
    const plotH = bh - 14; // место под подписи x снизу
    const plotBot = plotTop + plotH;

    // Границы по Y
    let vMin = 0, vMax = 0;
    for (const v of vals) {
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    if (vMin === 0 && vMax === 0) {
      // Нулевая эпюра
      doc.setDrawColor(...C.ink);
      doc.setLineWidth(0.5);
      const yZero = plotTop + plotH / 2;
      doc.line(plotX, yZero, plotX + plotW, yZero);
      doc.setFont(fontState.name, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.thin);
      const txt = "эпюра нулевая на этом стержне";
      const tw = doc.getTextWidth(txt) + 4;
      doc.setFillColor(255, 255, 255);
      doc.rect(plotX + plotW / 2 - tw / 2, yZero - 2, tw, 4, "F");
      doc.text(txt, plotX + plotW / 2, yZero + 1, { align: "center" });
      return;
    }
    // Симметричное расширение, чтобы график не упирался в края
    const vSpan = vMax - vMin || 1;
    const pad = vSpan * 0.18;
    const vLow = vMin - (vMin < 0 ? pad : 0);
    const vHigh = vMax + (vMax > 0 ? pad : 0);
    const vRange = vHigh - vLow || 1;
    const yZero = plotBot - ((0 - vLow) / vRange) * plotH;

    const toPxX = (xw: number) => plotX + (xw / er.length) * plotW;
    const toPxY = (v: number) => plotBot - ((v - vLow) / vRange) * plotH;

    // Сетка по длине: 0, L/4, L/2, 3L/4, L
    doc.setDrawColor(...C.grid);
    doc.setLineWidth(0.15);
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.thin);
    const ticks = [0, 0.25, 0.5, 0.75, 1.0];
    for (const t of ticks) {
      const xw = t * er.length;
      const px = toPxX(xw);
      // Вертикальная линия сетки
      doc.line(px, plotTop, px, plotBot);
      // Подпись под графиком
      doc.text(`${xw.toFixed(2)} м`, px, plotBot + 4, { align: "center" });
    }

    // Нулевая ось эпюры — жирная
    doc.setDrawColor(...C.ink);
    doc.setLineWidth(0.7);
    doc.line(plotX, yZero, plotX + plotW, yZero);

    // Полигон заливки
    const pts: [number, number][] = xs.map((x, i) => [toPxX(x), toPxY(vals[i])]);
    if (pts.length >= 2) {
      const segs: number[][] = [];
      segs.push([0, pts[0][1] - yZero]);
      for (let i = 1; i < pts.length; i++) {
        segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
      }
      segs.push([0, yZero - pts[pts.length - 1][1]]);
      segs.push([plotX - pts[pts.length - 1][0], 0]);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.setGState(doc.GState({ opacity: 0.22 }));
      doc.lines(segs, plotX, yZero, [1, 1], "F", true);
      doc.setGState(doc.GState({ opacity: 1 }));
    }

    // Линия эпюры
    doc.setDrawColor(...color);
    doc.setLineWidth(1.2);
    for (let i = 1; i < pts.length; i++) {
      doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    }

    // Подписи max/min с выноской — с учётом коллизий и границ графика.
    // Алгоритм: собираем список плашек, для каждой определяем "предпочтительную"
    // позицию (выше точки если значение положительное, ниже если отрицательное),
    // ограничиваем по X (не выходим за рамку графика) и проверяем пересечение
    // с уже отрисованными плашками — если есть, ищем альтернативную позицию.
    let iMax = 0, iMin = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[iMax]) iMax = i;
      if (vals[i] < vals[iMin]) iMin = i;
    }

    interface Rect { x: number; y: number; w: number; h: number }
    const placed: Rect[] = [];
    const overlaps = (a: Rect, b: Rect) =>
      !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);

    const drawCallout = (i: number) => {
      if (Math.abs(vals[i]) < 1e-9) return;
      const px = toPxX(xs[i]);
      const py = toPxY(vals[i]);
      // Маркер
      doc.setFillColor(...color);
      doc.circle(px, py, 1.2, "F");

      // Используем человекочитаемые единицы (Н/кН/МН, Н·м/кН·м/МН·м).
      // unit/title здесь — ярлык типа эпюры ("N"/"Qy"/"Mz"), не строка единиц,
      // поэтому единицы зашиты в formatForce/formatMoment.
      const valTxt = unit === "Н·м" ? formatMoment(vals[i]) : formatForce(vals[i]);
      const coordTxt = `x = ${xs[i].toFixed(2)} м`;
      doc.setFont(fontState.name, "bold");
      doc.setFontSize(8);
      const tw1 = doc.getTextWidth(valTxt);
      doc.setFont(fontState.name, "normal");
      doc.setFontSize(6.5);
      const tw2 = doc.getTextWidth(coordTxt);
      const tw = Math.max(tw1, tw2) + 3;
      const th = 7;

      // Список кандидатов «куда положить плашку»: предпочтительные первые
      const preferAbove = vals[i] >= 0;
      const candidates: Array<{ x: number; y: number; callY: number }> = [];
      // 1) предпочтительная сторона
      {
        const dirY = preferAbove ? -1 : 1;
        const callY = py + dirY * 6;
        let bxLbl = px - tw / 2;
        if (bxLbl < plotX) bxLbl = plotX;
        if (bxLbl + tw > plotX + plotW) bxLbl = plotX + plotW - tw;
        const byLbl = preferAbove ? callY - th : callY;
        candidates.push({ x: bxLbl, y: byLbl, callY });
      }
      // 2) противоположная сторона
      {
        const dirY = preferAbove ? 1 : -1;
        const callY = py + dirY * 6;
        let bxLbl = px - tw / 2;
        if (bxLbl < plotX) bxLbl = plotX;
        if (bxLbl + tw > plotX + plotW) bxLbl = plotX + plotW - tw;
        const byLbl = !preferAbove ? callY - th : callY;
        candidates.push({ x: bxLbl, y: byLbl, callY });
      }
      // 3) сдвиг по горизонтали (если плашка пересекает с уже размещённой)
      for (const dx of [-tw - 4, tw + 4, -tw / 2 - 6, tw / 2 + 6]) {
        const dirY = preferAbove ? -1 : 1;
        const callY = py + dirY * 6;
        let bxLbl = px + dx - tw / 2;
        if (bxLbl < plotX) bxLbl = plotX;
        if (bxLbl + tw > plotX + plotW) bxLbl = plotX + plotW - tw;
        const byLbl = preferAbove ? callY - th : callY;
        candidates.push({ x: bxLbl, y: byLbl, callY });
      }

      // Выбираем первый кандидат без пересечений; если все плохи — берём предпочтительный
      let chosen = candidates[0];
      for (const c of candidates) {
        const r: Rect = { x: c.x, y: c.y, w: tw, h: th };
        const hasOverlap = placed.some((p) => overlaps(r, p));
        // Также проверяем, не вылезла ли плашка за вертикальные пределы графика
        const outsideY = c.y < plotTop - 8 || c.y + th > plotBot + 16;
        if (!hasOverlap && !outsideY) {
          chosen = c;
          break;
        }
      }

      placed.push({ x: chosen.x, y: chosen.y, w: tw, h: th });

      // Выноска от точки к плашке (с лёгким изломом если плашка сдвинута)
      doc.setDrawColor(...color);
      doc.setLineWidth(0.35);
      const lblCenterX = chosen.x + tw / 2;
      doc.line(px, py, lblCenterX, chosen.callY);
      doc.line(lblCenterX, chosen.callY, lblCenterX, chosen.y + th / 2);

      // Сама плашка
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...color);
      doc.setLineWidth(0.3);
      doc.rect(chosen.x, chosen.y, tw, th, "FD");
      doc.setFont(fontState.name, "bold");
      doc.setFontSize(8);
      doc.setTextColor(...color);
      doc.text(valTxt, chosen.x + tw / 2, chosen.y + 3.2, { align: "center" });
      doc.setFont(fontState.name, "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...C.thin);
      doc.text(coordTxt, chosen.x + tw / 2, chosen.y + 6, { align: "center" });
    };

    drawCallout(iMax);
    if (iMin !== iMax) drawCallout(iMin);

    // Подписи vMin/vMax на левой оси — в крупных единицах (кН, кН·м).
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.thin);
    const fmtAxis = (v: number) => (unit === "Н·м" ? formatMoment(v) : formatForce(v));
    if (vMax > 0) doc.text(fmtAxis(vMax), plotX - 1, toPxY(vMax) + 1, { align: "right" });
    if (vMin < 0) doc.text(fmtAxis(vMin), plotX - 1, toPxY(vMin) + 1, { align: "right" });
    doc.text("0", plotX - 1, yZero + 1, { align: "right" });
  };

  drawBigEpy(epyTop, epyH, er.diagrams.N, er.diagrams.x,
    [44, 62, 128], "N", "Н", "— продольная сила");
  drawBigEpy(epyTop + epyH + gap, epyH, er.diagrams.Qy, er.diagrams.x,
    [26, 138, 90], "Qy", "Н", "— поперечная сила");
  drawBigEpy(epyTop + (epyH + gap) * 2, epyH, er.diagrams.Mz, er.diagrams.x,
    [192, 57, 43], "Mz", "Н·м", "— изгибающий момент");
}

// Старая функция drawDiagram (графики X–Y по длине балки) удалена.
// Эпюры теперь рисуются двумя способами, идентичными виду в приложении:
//   • drawDiagramOverScheme — поверх расчётной схемы в нормалях стержней
//   • drawUnfoldedDiagrams  — развёртка каждого стержня горизонтально
 
function _drawDiagramLegacyStub(
  doc: jsPDF,
  model: FrameModel,
  result: SolverResponse,
  ox: number, oy: number, boxW: number, boxH: number,
) {
  return;
  const color: [number, number, number] = [44, 62, 128];
  const meta = { title: "", unit: "", scale: 1, pickVals: (_d: SolverResponse["elements"][number]["diagrams"]) => [0] };

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

  // Если эпюра практически нулевая — выводим подпись над нулевой осью с белой плашкой,
  // чтобы текст не сливался с самой линией балки и подписями узлов.
  if (Math.abs(globalMaxV) < 1e-6 && Math.abs(globalMinV) < 1e-6) {
    const label = "эпюра нулевая (все значения = 0)";
    const fontSize = 9;
    doc.setFont(fontState.name, "normal");
    doc.setFontSize(fontSize);
    // Размер плашки
    const textW = doc.getTextWidth(label);
    const padX = 3;
    const padY = 1.6;
    const boxW2 = textW + padX * 2;
    const boxH2 = fontSize * 0.45 + padY * 2;
    // Размещаем подпись чуть выше середины верхней половины графика — подальше от нулевой оси
    const cx = plotX + plotW / 2;
    const cy = plotY + plotH * 0.28;
    // Белая плашка с тонкой рамкой
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...C.grid);
    doc.setLineWidth(0.2);
    doc.rect(cx - boxW2 / 2, cy - boxH2 / 2, boxW2, boxH2, "FD");
    // Текст
    doc.setTextColor(...C.thin);
    doc.text(label, cx, cy + fontSize * 0.18, { align: "center" });
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
 

/**
 * Рендерит SVG расчётной схемы в заданную область PDF (через svg2pdf.js).
 * Возвращает true если получилось, false — если упало (тогда вызывающий код
 * должен откатиться на векторную перерисовку через drawScheme).
 *
 * Клонируем SVG и подставляем явные размеры viewBox/width/height,
 * чтобы svg2pdf корректно вычислил масштаб.
 */
async function renderSchemeFromSvg(
  doc: jsPDF,
  svgSource: SVGSVGElement,
  ox: number,
  oy: number,
  boxW: number,
  boxH: number,
  title: string,
): Promise<boolean> {
  try {
    // Рамка области схемы (как в drawScheme)
    doc.setDrawColor(...C.grid);
    doc.setLineWidth(0.3);
    doc.rect(ox, oy, boxW, boxH);

    // Подпись над рамкой
    doc.setFont(fontState.name, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.thin);
    doc.text(title, ox + 3, oy + 4);
    doc.setFont(fontState.name, "normal");

    // Клонируем исходный SVG (не трогаем DOM приложения)
    const clone = svgSource.cloneNode(true) as SVGSVGElement;
    const rect = svgSource.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 500;
    if (!clone.getAttribute("viewBox")) {
      clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));

    // Скрываем слой эпюр — в первой схеме PDF нужна только расчётная схема
    // без наложенных диаграмм N/Q/M/uy. Слой помечен data-pdf-hide="diagrams".
    clone.querySelectorAll("[data-pdf-hide]").forEach((el) => {
      (el as SVGElement).style.display = "none";
    });

    // Прячем подсказку курсора (текст с координатами курсора снизу) — она не нужна в отчёте.
    clone.querySelectorAll("text").forEach((t) => {
      const txt = t.textContent || "";
      if (/^x=\s*-?\d/.test(txt) && /масштаб/.test(txt)) t.remove();
    });

    // Нормализация всех <text> для корректного рендера через svg2pdf:
    //  1) фиксируем шрифт Roboto (загружен через ensureCyrillicFont, содержит
    //     кириллицу) — svg2pdf берёт шрифты, зарегистрированные в jsPDF через
    //     addFont, по ТОЧНОМУ совпадению имени font-family,
    //  2) сбрасываем унаследованный letter-spacing (иначе символы расходятся
    //     через пробел, как «R = 5 0 . 7»),
    //  3) если шрифт с кириллицей НЕ загрузился (fontState.name === helvetica) —
    //     транслитерируем единицы в латиницу как запасной вариант, чтобы
    //     отчёт не выглядел сломанным.
    const useCyrillic = fontState.name === "Roboto";
    const fontFamily = useCyrillic ? "Roboto" : "helvetica";

    const cyrToLatUnits = (s: string): string =>
      s
        .replace(/МН·м/g, "MN*m")
        .replace(/кН·м/g, "kN*m")
        .replace(/Н·м/g, "N*m")
        .replace(/МН\/м/g, "MN/m")
        .replace(/кН\/м/g, "kN/m")
        .replace(/Н\/м/g, "N/m")
        .replace(/МН/g, "MN")
        .replace(/кН/g, "kN")
        .replace(/\bН\b/g, "N")
        .replace(/·/g, "*");

    const fixTextNode = (t: SVGTextElement | SVGTSpanElement) => {
      t.setAttribute("font-family", fontFamily);
      t.setAttribute("letter-spacing", "0");
      t.style.letterSpacing = "0";
      t.style.fontFamily = fontFamily;
    };

    clone.querySelectorAll("text").forEach((t) => {
      fixTextNode(t as SVGTextElement);
      t.querySelectorAll("tspan").forEach((ts) =>
        fixTextNode(ts as SVGTSpanElement),
      );
      // Транслитерация — только если шрифт с кириллицей не доступен
      if (!useCyrillic) {
        if (t.children.length === 0) {
          t.textContent = cyrToLatUnits(t.textContent || "");
        } else {
          t.querySelectorAll("tspan").forEach((ts) => {
            ts.textContent = cyrToLatUnits(ts.textContent || "");
          });
        }
      }
    });

    // Подбираем такую область внутри рамки, чтобы сохранить пропорции SVG.
    const innerPad = 6;
    const availW = boxW - innerPad * 2;
    const availH = boxH - innerPad * 2 - 4; // -4 на подпись сверху
    const aspect = w / h;
    let drawW = availW;
    let drawH = drawW / aspect;
    if (drawH > availH) { drawH = availH; drawW = drawH * aspect; }
    const drawX = ox + (boxW - drawW) / 2;
    const drawY = oy + 4 + (availH - drawH) / 2 + innerPad;

    await svg2pdf(clone, doc, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
    return true;
  } catch (err) {
     
    console.warn("svg2pdf: не удалось перенести схему как вектор, откат на ручную отрисовку", err);
    return false;
  }
}

// ── Главная функция ────────────────────────────────────────────────────────
export async function generatePdfReport(
  model: FrameModel,
  result: SolverResponse,
  projectName: string,
  options?: { schemeSvg?: SVGSVGElement | null },
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

  // Расчётная схема — левая половина.
  // Если из приложения передали живой SVG (со всеми ручными сдвигами подписей),
  // переносим его как векторную графику через svg2pdf.js — отчёт получится
  // 1-в-1 как пользователь видит на экране. При сбое — fallback на drawScheme.
  const schemeW = CW * 0.55;
  const schemeH = PH - MT - MB - 10 - 20; // минус штамп и нижний блок
  let schemeRendered = false;
  if (options?.schemeSvg) {
    schemeRendered = await renderSchemeFromSvg(
      doc,
      options.schemeSvg,
      ML,
      y,
      schemeW,
      schemeH,
      "РАСЧЁТНАЯ СХЕМА",
    );
  }
  if (!schemeRendered) {
    drawScheme(doc, model, result, ML, y, schemeW, schemeH);
  }

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
      { label: "Fx", x: rxX + rxW * 0.22, w: rxW * 0.26, align: "right" as const },
      { label: "Fy", x: rxX + rxW * 0.48, w: rxW * 0.26, align: "right" as const },
      { label: "Mz", x: rxX + rxW * 0.74, w: rxW * 0.26, align: "right" as const },
    ];
    sy = tableHeader(doc, cols, sy);

    result.reactions.forEach((r, i) => {
      sy = tableRow(
        doc,
        [
          { value: r.node_id, ...cols[0] },
          { value: formatForce(r.fx), ...cols[1] },
          { value: formatForce(r.fy), ...cols[2] },
          { value: formatMoment(r.mz), ...cols[3] },
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
      { label: "N", x: rxX + rxW * 0.2, w: rxW * 0.25, align: "right" as const },
      { label: "Q", x: rxX + rxW * 0.45, w: rxW * 0.25, align: "right" as const },
      { label: "M", x: rxX + rxW * 0.7, w: rxW * 0.3, align: "right" as const },
    ];
    sy = tableHeader(doc, eCols, sy);

    result.elements.forEach((er, i) => {
      const mv = er.max_values;
      const absQmax = er.diagrams.Qy.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      sy = tableRow(
        doc,
        [
          { value: er.element_id, ...eCols[0] },
          { value: formatForce(mv.abs_N_max), ...eCols[1] },
          { value: formatForce(absQmax), ...eCols[2] },
          { value: formatMoment(mv.abs_Mz_max ?? 0), ...eCols[3] },
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

  // ── Страница «Проверки конструкции» ───────────────────────────────────
  drawChecksPage(doc, model, result, projectName, FONT, PW, PH, ML, MR, MT, MB, CW);

  // ── Страницы Эпюр поверх схемы (как в приложении) ─────────────────────
  // Каждая эпюра — отдельная страница с расчётной схемой и эпюрой
  // в нормалях стержней. Это удобнее всего смотрится для рам.
  const epyKinds: DiagramKind[] = ["N", "Qy", "Mz", "uy"];
  const epyPageTitles: Record<DiagramKind, string> = {
    N: "Эпюра N (продольная сила)",
    Qy: "Эпюра Qy (поперечная сила)",
    Mz: "Эпюра Mz (изгибающий момент)",
    uy: "Эпюра v (прогиб)",
  };
  for (const kind of epyKinds) {
    doc.addPage();
    doc.setFillColor(...C.ink);
    doc.rect(ML, MT, CW, 8, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${projectName || "Расчёт"} · ${epyPageTitles[kind]}`, ML + 3, MT + 5.5);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    doc.text("диплом-инж.рф", PW - MR - 3, MT + 5.5, { align: "right" });

    drawDiagramOverScheme(doc, model, result, kind, ML, MT + 10, CW, PH - MT - MB - 10);
  }

  // ── Развёртка стержней: каждый стержень — отдельная страница ──
  // Три крупные эпюры N, Qy, Mz во всю ширину листа с выносными подписями
  // max/min и размерной сеткой по длине стержня (0, L/4, L/2, 3L/4, L).
  const totalEls = model.elements.length;
  for (let i = 0; i < totalEls; i++) {
    const el = model.elements[i];
    doc.addPage();
    doc.setFillColor(...C.ink);
    doc.rect(ML, MT, CW, 8, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    const label = el.label || el.id;
    doc.text(
      `${projectName || "Расчёт"} · Развёртка стержня ${label} (${i + 1}/${totalEls})`,
      ML + 3, MT + 5.5,
    );
    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    doc.text("диплом-инж.рф", PW - MR - 3, MT + 5.5, { align: "right" });

    drawSingleElementUnfolded(doc, model, result, el.id, ML, MT + 10, CW, PH - MT - MB - 10);
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

// ── Страница «Проверки конструкции» ───────────────────────────────────────
function drawChecksPage(
  doc: jsPDF,
  model: FrameModel,
  result: SolverResponse,
  projectName: string,
  FONT: string,
  PW: number,
  PH: number,
  ML: number,
  MR: number,
  MT: number,
  MB: number,
  CW: number,
) {
  const settings = model.analysis_settings ?? DEFAULT_ANALYSIS_SETTINGS;
  const summary = runChecks(model, result);
  if (summary.checks.length === 0) return;

  doc.addPage();
  // Штамп
  doc.setFillColor(...C.ink);
  doc.rect(ML, MT, CW, 8, "F");
  doc.setFont(FONT, "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`${projectName || "Расчёт"} · Проверки конструкции`, ML + 3, MT + 5.5);
  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.text("диплом-инж.рф", PW - MR - 3, MT + 5.5, { align: "right" });

  let y = MT + 14;

  // ── Настройки расчёта (что использовалось) ──
  const industry = getIndustrySpec(settings.industry);
  doc.setFont(FONT, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.ink);
  doc.text("ПАРАМЕТРЫ РАСЧЁТА", ML, y);
  hline(doc, ML, ML + CW, y + 1.5, 0.3);
  y += 5;

  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.ink);

  const theoryName =
    settings.strength_theory === "tresca"
      ? "3-я теория (Треска): σ_экв = √(σ² + 4τ²)"
      : settings.strength_theory === "normal"
        ? "1-я теория (нормальные напряжения)"
        : "4-я теория (Мизес): σ_экв = √(σ² + 3τ²)";

  const params: [string, string][] = [
    ["Отрасль применения", industry.label],
    ["Норматив [f]", industry.deflection_label],
    ["Источник", industry.source],
    ["Теория прочности", theoryName],
    ["Коэффициент запаса n", settings.safety_factor.toFixed(2)],
  ];
  for (const [k, v] of params) {
    doc.setTextColor(...C.thin);
    doc.text(k, ML, y);
    doc.setTextColor(...C.ink);
    doc.text(v, ML + 55, y);
    y += 4.2;
  }

  y += 4;

  // ── Сводка по результатам проверок ──
  doc.setFont(FONT, "bold");
  doc.setFontSize(8);
  doc.text("ИТОГ ПРОВЕРОК", ML, y);
  hline(doc, ML, ML + CW, y + 1.5, 0.3);
  y += 5;

  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  const overallStatus =
    summary.failed_count > 0 ? "НЕ ПРОХОДИТ" : summary.warn_count > 0 ? "БЛИЗКО К ПРЕДЕЛУ" : "ПРОХОДИТ";
  const overallColor: [number, number, number] =
    summary.failed_count > 0
      ? [200, 30, 30]
      : summary.warn_count > 0
        ? [201, 136, 0]
        : [26, 138, 90];

  doc.setTextColor(...C.thin);
  doc.text("Результат", ML, y);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...overallColor);
  doc.text(overallStatus, ML + 55, y);
  doc.setFont(FONT, "normal");
  y += 4.2;

  doc.setTextColor(...C.thin);
  doc.text("Макс. коэф. использования η_max", ML, y);
  doc.setTextColor(...C.ink);
  doc.text(summary.max_utilization.toFixed(2), ML + 55, y);
  y += 4.2;

  doc.setTextColor(...C.thin);
  doc.text("Проверок выполнено", ML, y);
  doc.setTextColor(...C.ink);
  doc.text(
    `${summary.checks.length} (OK: ${summary.ok_count}, предупр.: ${summary.warn_count}, не прошло: ${summary.failed_count})`,
    ML + 55,
    y,
  );
  y += 6;

  // ── Таблица проверок ──
  doc.setFont(FONT, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.ink);
  doc.text("ТАБЛИЦА ПРОВЕРОК ПО ЭЛЕМЕНТАМ", ML, y);
  hline(doc, ML, ML + CW, y + 1.5, 0.3);
  y += 4;

  // Колонки — суммарно 1.00 от CW, без перехлёста, с явными границами и единицами в значениях
  const cCols = [
    { label: "Элем.",     x: ML,                w: CW * 0.08, align: "left"  as const },
    { label: "Проверка",  x: ML + CW * 0.08,    w: CW * 0.17, align: "left"  as const },
    { label: "Факт",      x: ML + CW * 0.25,    w: CW * 0.17, align: "right" as const },
    { label: "Допускаемое",x: ML + CW * 0.42,   w: CW * 0.17, align: "right" as const },
    { label: "η",         x: ML + CW * 0.59,    w: CW * 0.10, align: "right" as const },
    { label: "Статус",    x: ML + CW * 0.69,    w: CW * 0.31, align: "left"  as const },
  ];

  const headerRowH = 6;
  // Шапка таблицы — фон и текст внутри одного прямоугольника
  doc.setFillColor(...C.grid);
  doc.rect(ML, y, CW, headerRowH, "F");
  doc.setFont(FONT, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.ink);
  cCols.forEach((c) => {
    const tx =
      c.align === "right" ? c.x + c.w - 1.5 : c.align === "center" ? c.x + c.w / 2 : c.x + 1.5;
    doc.text(c.label, tx, y + headerRowH - 1.8, { align: c.align });
  });
  y += headerRowH;

  // Форматтеры значения с единицей в одной строке (например: «26.67 мм», «230.0 МПа»)
  const formatValueWithUnit = (val: number, unit: string): string => {
    if (unit === "МПа") return `${(val / 1e6).toFixed(1)} МПа`;
    return `${(val * 1000).toFixed(2)} мм`;
  };

  const rowH = 5;
  summary.checks.forEach((c, i) => {
    if (y > PH - MB - 14) return;

    const statusText =
      c.status === "fail" ? "Не проходит" : c.status === "warn" ? "На пределе" : "OK";
    const statusColor: [number, number, number] =
      c.status === "fail"
        ? [200, 30, 30]
        : c.status === "warn"
          ? [201, 136, 0]
          : [26, 138, 90];

    // Зебра — фон на всю строку
    if (i % 2 === 0) {
      doc.setFillColor(248, 245, 240);
      doc.rect(ML, y, CW, rowH, "F");
    }

    const ty = y + rowH - 1.8;

    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.ink);
    doc.text(c.element_id, cCols[0].x + 1.5, ty);
    doc.text(c.title, cCols[1].x + 1.5, ty);
    doc.text(formatValueWithUnit(c.actual, c.unit), cCols[2].x + cCols[2].w - 1.5, ty, { align: "right" });
    doc.text(formatValueWithUnit(c.allowable, c.unit), cCols[3].x + cCols[3].w - 1.5, ty, { align: "right" });

    // η — крупно, цветом статуса
    doc.setFont(FONT, "bold");
    doc.setTextColor(...statusColor);
    doc.text(c.utilization.toFixed(2), cCols[4].x + cCols[4].w - 1.5, ty, { align: "right" });

    // Статус — отдельной колонкой, тоже цветом
    doc.text(statusText, cCols[5].x + 2, ty);

    y += rowH;
  });

  // Нижняя черта таблицы
  doc.setDrawColor(...C.thin);
  doc.setLineWidth(0.3);
  doc.line(ML, y, ML + CW, y);

  y += 4;
  hline(doc, ML, ML + CW, y, 0.3);
  y += 4;

  // ── Пояснение по формулам ──
  doc.setFont(FONT, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.ink);
  doc.text("РАСЧЁТНЫЕ ФОРМУЛЫ", ML, y);
  y += 4;
  doc.setFont(FONT, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.thin);
  const explanations = [
    "Прогиб: f_max ≤ [f] = L / k, где k берётся по выбранной отрасли. η_def = f_max / [f].",
    `Прочность: σ_экв ≤ [σ] = σ_т / n = σ_т / ${settings.safety_factor.toFixed(2)}. η_str = σ_экв / [σ].`,
    "η ≤ 1 — конструкция проходит проверку. 0,85 < η ≤ 1 — на пределе. η > 1 — не проходит.",
    "Источник теории прочности: Феодосьев В.И. «Сопротивление материалов»; Биргер «Расчёт деталей машин».",
  ];
  for (const line of explanations) {
    if (y > PH - MB - 4) break;
    doc.text(line, ML, y);
    y += 3.2;
  }

  // Нижний колонтитул страницы
  doc.setFont(FONT, "normal");
  doc.setFontSize(6);
  doc.setTextColor(...C.thin);
  doc.text(
    `Сформировано: ${new Date().toLocaleString("ru-RU")} · диплом-инж.рф`,
    PW / 2,
    PH - 4,
    { align: "center" },
  );
}