/**
 * Общие хелперы для подкомпонентов CanvasOverlays:
 *  - REACTION — цвет реакций опор (зелёный по стандарту LIRA/SCAD)
 *  - arrowFromPoint — универсальная функция стрелки силы
 *  - makeMakeDraggableText — фабрика хелпера-обёртки для перетаскиваемой текстовой подписи
 *
 * Вынесено в отдельный файл, чтобы CanvasOverlays.tsx был чисто сборочным.
 */
import DraggableLabel from "./DraggableLabel";
import type { LabelOffsetsApi } from "@/pages/cae-editor/useLabelOffsets";

// Зелёный — для реакций опор (стандарт в LIRA/SCAD)
export const REACTION = "#1a8a5a";

/**
 * Универсальная функция для рисования стрелки силы.
 * (sx, sy) — точка приложения, направление (fx, fy) в пикселях
 * (в направлении приложения силы). Стрелка начинается из (sx, sy) и направлена
 * по силе (наконечник в конце).
 */
export function arrowFromPoint(
  sx: number,
  sy: number,
  fx: number,
  fy: number,
  length: number,
  color: string,
  label: string,
  key: string,
) {
  const mag = Math.sqrt(fx * fx + fy * fy);
  if (mag < 1e-12) return null;
  // нормаль направления (в SVG ось Y инвертирована, fy положительный вверх в мире)
  const ux = fx / mag;
  const uy = -fy / mag; // экранная Y
  // Стрелка идёт ОТ точки приложения В сторону действия силы:
  // То есть наконечник — в (sx + ux*length, sy + uy*length).
  const ex = sx + ux * length;
  const ey = sy + uy * length;
  const ah = 8;
  const a1x = ex - ux * ah - uy * ah * 0.5;
  const a1y = ey - uy * ah + ux * ah * 0.5;
  const a2x = ex - ux * ah + uy * ah * 0.5;
  const a2y = ey - uy * ah - ux * ah * 0.5;
  return (
    <g key={key} pointerEvents="none">
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={2} />
      <polygon points={`${ex},${ey} ${a1x},${a1y} ${a2x},${a2y}`} fill={color} />
      <text
        x={ex + ux * 5}
        y={ey + uy * 5 - 2}
        fontSize={11}
        fill={color}
        fontFamily="monospace"
        textAnchor={ux > 0.5 ? "start" : ux < -0.5 ? "end" : "middle"}
      >
        {label}
      </text>
    </g>
  );
}

export type DraggableTextFactory = (
  offsetKey: string,
  baseX: number,
  baseY: number,
  render: (x: number, y: number) => React.ReactElement,
) => React.ReactElement;

/**
 * Фабрика хелпера: создаёт функцию, которая возвращает либо перетаскиваемую
 * текстовую подпись (если переданы labelOffsets + svgRef), либо статичную обёртку.
 */
export function makeMakeDraggableText(
  labelOffsets: LabelOffsetsApi | undefined,
  svgRef: React.RefObject<SVGSVGElement> | undefined,
): DraggableTextFactory {
  return (offsetKey, baseX, baseY, render) => {
    if (!labelOffsets || !svgRef) {
      return <g pointerEvents="none">{render(baseX, baseY)}</g>;
    }
    return (
      <DraggableLabel
        offsetKey={offsetKey}
        baseX={baseX}
        baseY={baseY}
        labelOffsets={labelOffsets}
        svgRef={svgRef}
      >
        {(x, y) => render(x, y)}
      </DraggableLabel>
    );
  };
}
