/**
 * Tooltip эпюры при наведении на элемент в режиме просмотра эпюр.
 * Показывает значение N/Q/M/σ в ближайшей к курсору точке элемента,
 * а также вертикальный пунктир от элемента к точке эпюры.
 */
import type { FrameModel, SolverResponse } from "@/lib/cae-model";

type DiagramKind = "none" | "deformed" | "N" | "Qy" | "Mz" | "sigma";

interface Props {
  model: FrameModel;
  result: SolverResponse | null;
  showDiagram: DiagramKind;
  cursorWorld: { x: number; y: number } | null;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
}

const DIAGRAM_LABELS: Record<string, { name: string; unit: string; scale: number; color: string }> = {
  N: { name: "N", unit: "Н", scale: 1, color: "#2c3e80" },
  Qy: { name: "Q", unit: "Н", scale: 1, color: "#1a8a5a" },
  Mz: { name: "M", unit: "Н·м", scale: 1, color: "#c0392b" },
  sigma: { name: "σ", unit: "МПа", scale: 1e-6, color: "#7d3c98" },
};

const CanvasDiagramTooltip = ({
  model,
  result,
  showDiagram,
  cursorWorld,
  toScreenX,
  toScreenY,
}: Props) => {
  if (!result || !cursorWorld) return null;
  if (showDiagram === "none" || showDiagram === "deformed") return null;
  const meta = DIAGRAM_LABELS[showDiagram];
  if (!meta) return null;

  // Найти ближайший элемент к курсору (в мировых координатах)
  // Считаем расстояние от точки до отрезка элемента + параметр t.
  let bestEl: typeof result.elements[number] | null = null;
  let bestT = 0;
  let bestDist = Infinity;
  let bestWx = 0;
  let bestWy = 0;
  const PROXIMITY_THRESHOLD_M = 0.5; // не показывать дальше 50 см от элемента

  for (const el of model.elements) {
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;
    const ax = a.coords[0];
    const ay = a.coords[1];
    const dx = b.coords[0] - ax;
    const dy = b.coords[1] - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) continue;
    let t = ((cursorWorld.x - ax) * dx + (cursorWorld.y - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + dx * t;
    const projY = ay + dy * t;
    const distX = cursorWorld.x - projX;
    const distY = cursorWorld.y - projY;
    const dist = Math.sqrt(distX * distX + distY * distY);
    if (dist < bestDist) {
      bestDist = dist;
      bestT = t;
      bestEl = result.elements.find((e) => e.element_id === el.id) || null;
      bestWx = projX;
      bestWy = projY;
    }
  }

  if (!bestEl || bestDist > PROXIMITY_THRESHOLD_M) return null;

  // Интерполируем значение эпюры по параметру t (длина элемента уже в bestEl.length)
  const xs = bestEl.diagrams.x;
  const vals = (bestEl.diagrams as Record<string, number[]>)[showDiagram];
  if (!vals || vals.length === 0) return null;

  const xAtT = bestT * bestEl.length;
  // Находим окружающие точки и линейно интерполируем
  let value = vals[0];
  for (let i = 0; i < xs.length - 1; i++) {
    if (xs[i] <= xAtT && xAtT <= xs[i + 1]) {
      const frac = xs[i + 1] === xs[i] ? 0 : (xAtT - xs[i]) / (xs[i + 1] - xs[i]);
      value = vals[i] + (vals[i + 1] - vals[i]) * frac;
      break;
    }
  }
  if (xAtT >= xs[xs.length - 1]) value = vals[vals.length - 1];

  const displayValue = value * meta.scale;
  const sx = toScreenX(bestWx);
  const sy = toScreenY(bestWy);

  // Текст и фон tooltip-а
  const label = `${meta.name}(${xAtT.toFixed(2)} м) = ${
    Math.abs(displayValue) >= 1000 || (Math.abs(displayValue) < 0.01 && displayValue !== 0)
      ? displayValue.toExponential(2)
      : displayValue.toFixed(2)
  } ${meta.unit}`;
  const textWidth = label.length * 6.5 + 12;
  const tooltipX = sx + 14;
  const tooltipY = sy - 28;

  return (
    <g pointerEvents="none">
      {/* Вертикальный пунктир от точки элемента к подписи */}
      <line
        x1={sx}
        y1={sy}
        x2={tooltipX}
        y2={tooltipY + 12}
        stroke={meta.color}
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.7}
      />
      {/* Маркер на эпюре */}
      <circle cx={sx} cy={sy} r={4} fill={meta.color} stroke="#fff" strokeWidth={1.5} />
      {/* Фон tooltip-а */}
      <rect
        x={tooltipX}
        y={tooltipY}
        width={textWidth}
        height={20}
        fill="#faf8f0"
        stroke={meta.color}
        strokeWidth={1.5}
      />
      <text
        x={tooltipX + 6}
        y={tooltipY + 14}
        fontSize={11}
        fill={meta.color}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
};

export default CanvasDiagramTooltip;
