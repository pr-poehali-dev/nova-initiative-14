/**
 * Размерные отметки длин элементов — ГОСТ-стиль:
 * выносные линии + размерная линия со стрелками + подпись в метрах.
 * Отрисовываются под схемой (всегда ниже элемента, с учётом нормали).
 */
import type { FrameModel } from "@/lib/cae-model";
import { THIN } from "./canvas-constants";

interface Props {
  model: FrameModel;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  pxPerM: number;
}

const DIM_COLOR = THIN;
const DIM_OPACITY = 0.55;
// Отступ выносной линии от узла (px)
const EXT_OFFSET = 14;
// Длина выносной линии за размерную (px)
const EXT_OVERSHOOT = 4;
// Минимальная длина элемента в px, при которой подпись помещается
const MIN_PX_FOR_LABEL = 40;

const fmtLen = (m: number): string => {
  if (m >= 1) return `${+m.toFixed(3).replace(/\.?0+$/, "")} м`;
  return `${+(m * 100).toFixed(1)} см`;
};

const CanvasDimensions = ({ model, toScreenX, toScreenY, pxPerM }: Props) => {
  const elements: React.ReactNode[] = [];

  for (const el of model.elements) {
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;

    const ax = toScreenX(a.coords[0]);
    const ay = toScreenY(a.coords[1]);
    const bx = toScreenX(b.coords[0]);
    const by = toScreenY(b.coords[1]);

    const dxPx = bx - ax;
    const dyPx = by - ay;
    const lenPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
    if (lenPx < 4) continue;

    // Единичный вектор вдоль элемента (экранный)
    const ux = dxPx / lenPx;
    const uy = dyPx / lenPx;

    // Нормаль: выбираем сторону «ниже» элемента на экране
    // (ny > 0 → вниз на экране = обычно «наружу» от балки)
    // Всегда откладываем в ту сторону, где ny > 0 (вниз) или nx < 0 (влево)
    let nx = -uy;
    let ny = ux;
    // Предпочитаем сторону вниз-влево (наружу для горизонтальных балок)
    if (ny < 0) { nx = -nx; ny = -ny; }

    const worldLen = Math.sqrt(
      Math.pow(b.coords[0] - a.coords[0], 2) +
      Math.pow(b.coords[1] - a.coords[1], 2),
    );

    // Смещение размерной линии от оси элемента
    const dimOffset = EXT_OFFSET;

    // Точки размерной линии (параллельно элементу, смещены на нормаль)
    const d1x = ax + nx * dimOffset;
    const d1y = ay + ny * dimOffset;
    const d2x = bx + nx * dimOffset;
    const d2y = by + ny * dimOffset;

    // Выносные линии: от узла до размерной линии + небольшой выступ
    const e1ax = ax;
    const e1ay = ay;
    const e1bx = ax + nx * (dimOffset + EXT_OVERSHOOT);
    const e1by = ay + ny * (dimOffset + EXT_OVERSHOOT);

    const e2ax = bx;
    const e2ay = by;
    const e2bx = bx + nx * (dimOffset + EXT_OVERSHOOT);
    const e2by = by + ny * (dimOffset + EXT_OVERSHOOT);

    // Стрелки на концах размерной линии (засечки ГОСТ-стиль: короткий диагональный штрих)
    const arrowLen = 5;
    // Засечка = штрих под 45° к размерной линии
    const diagX = (ux + nx) * 0.707;
    const diagY = (uy + ny) * 0.707;

    const t1x1 = d1x - diagX * arrowLen;
    const t1y1 = d1y - diagY * arrowLen;
    const t1x2 = d1x + diagX * arrowLen;
    const t1y2 = d1y + diagY * arrowLen;

    const t2x1 = d2x - diagX * arrowLen;
    const t2y1 = d2y - diagY * arrowLen;
    const t2x2 = d2x + diagX * arrowLen;
    const t2y2 = d2y + diagY * arrowLen;

    // Подпись в середине размерной линии
    const mx = (d1x + d2x) / 2;
    const my = (d1y + d2y) / 2;

    // Угол поворота текста вдоль элемента (чтобы читался вдоль линии)
    let angleDeg = Math.atan2(uy, ux) * (180 / Math.PI);
    // Переворачиваем текст, если он «вверх ногами»
    if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;

    // Смещение текста ещё чуть дальше от размерной линии
    const txtOffsetPx = 7;
    const txtX = mx + nx * txtOffsetPx;
    const txtY = my + ny * txtOffsetPx;

    const showLabel = lenPx >= MIN_PX_FOR_LABEL;

    elements.push(
      <g key={`dim-${el.id}`} opacity={DIM_OPACITY} pointerEvents="none">
        {/* Выносные линии */}
        <line x1={e1ax} y1={e1ay} x2={e1bx} y2={e1by}
          stroke={DIM_COLOR} strokeWidth={0.75} strokeDasharray="none" />
        <line x1={e2ax} y1={e2ay} x2={e2bx} y2={e2by}
          stroke={DIM_COLOR} strokeWidth={0.75} />

        {/* Размерная линия */}
        <line x1={d1x} y1={d1y} x2={d2x} y2={d2y}
          stroke={DIM_COLOR} strokeWidth={0.75} />

        {/* Засечки (ГОСТ) */}
        <line x1={t1x1} y1={t1y1} x2={t1x2} y2={t1y2}
          stroke={DIM_COLOR} strokeWidth={1} />
        <line x1={t2x1} y1={t2y1} x2={t2x2} y2={t2y2}
          stroke={DIM_COLOR} strokeWidth={1} />

        {/* Подпись длины */}
        {showLabel && (
          <text
            x={txtX}
            y={txtY}
            fontSize={9}
            fontFamily="monospace"
            fill={DIM_COLOR}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${angleDeg}, ${txtX}, ${txtY})`}
          >
            {fmtLen(worldLen)}
          </text>
        )}
      </g>,
    );
  }

  // Подавляем warning: pxPerM используется для будущего адаптивного порога
  void pxPerM;

  return <g>{elements}</g>;
};

export default CanvasDimensions;
