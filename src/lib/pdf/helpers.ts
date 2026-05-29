/**
 * Утилиты для генерации PDF-отчёта CAE:
 *  - fmt(v, d)      — компактный формат числа (k/M/G суффиксы)
 *  - hline()        — горизонтальная линия с заданной толщиной
 *  - tableHeader()  — заголовочная строка таблицы (заливка + жирный текст)
 *  - tableRow()     — строка данных таблицы (чередование зебры через even)
 *
 * Все функции принимают jsPDF doc и работают с цветами из @/lib/pdf/palette,
 * шрифтом — через fontState из @/lib/pdf/font-loader.
 */
import type { jsPDF } from "jspdf";
import { C } from "./palette";
import { fontState } from "./font-loader";

/**
 * Компактный формат числа с приставкой кратности по системе СИ (к/М/Г).
 * Приставка прижата к числу без пробела, чтобы при добавлении единицы
 * получалось корректное обозначение (например «12.0к» + «Н» = «12.0кН»).
 * d = знаков после запятой для |v|<1000.
 */
export function fmt(v: number, d = 2): string {
  if (!isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}Г`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}М`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(2)}к`;
  return v.toFixed(d);
}

/** Горизонтальная линия от x1 до x2 на высоте y. */
export function hline(doc: jsPDF, x1: number, x2: number, y: number, lw = 0.3) {
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

export interface TableCol {
  label: string;
  x: number;
  w: number;
  align?: "left" | "right" | "center";
}

export interface TableCellCol {
  value: string;
  x: number;
  w: number;
  align?: "left" | "right" | "center";
}

/** Заголовочная строка таблицы: заливка серым, жирный шрифт 7pt. Возвращает Y следующей строки. */
export function tableHeader(doc: jsPDF, cols: TableCol[], y: number, rowH = 5): number {
  doc.setFillColor(...C.grid);
  doc.rect(
    cols[0].x,
    y,
    cols[cols.length - 1].x + cols[cols.length - 1].w - cols[0].x,
    rowH,
    "F",
  );
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

/** Строка данных таблицы. even=true даёт «зебру». Возвращает Y следующей строки. */
export function tableRow(
  doc: jsPDF,
  cols: TableCellCol[],
  y: number,
  rowH = 4.5,
  even = false,
): number {
  if (even) {
    doc.setFillColor(245, 245, 242);
    doc.rect(
      cols[0].x,
      y,
      cols[cols.length - 1].x + cols[cols.length - 1].w - cols[0].x,
      rowH,
      "F",
    );
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