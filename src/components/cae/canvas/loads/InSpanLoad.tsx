import type { FrameModel, ModelLoad } from "@/lib/cae-model";
import { formatForce } from "@/lib/formatForce";
import { ACCENT } from "../canvas-constants";
import type { DraggableTextFactory } from "../canvas-overlays-helpers";

/**
 * Сосредоточенная сила в пролёте элемента (in_span_point).
 * Рисуется стрелкой с маленьким кружком в точке приложения, подпись «P = …»
 * у хвоста стрелки.
 *
 * Позиция = position_ratio (0…1) от node_start к node_end.
 */
export function renderInSpanLoad(
  ld: ModelLoad,
  model: FrameModel,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number,
  arrowScale: number,
  fontScale: number,
  makeDraggableText: DraggableTextFactory,
): React.ReactElement | null {
  if (!ld.element_id) return null;
  const el = model.elements.find((e) => e.id === ld.element_id);
  if (!el) return null;
  const a = model.nodes.find((n) => n.id === el.node_start);
  const b = model.nodes.find((n) => n.id === el.node_end);
  if (!a || !b) return null;
  const t = ld.position_ratio ?? 0.5;
  const wx = a.coords[0] + (b.coords[0] - a.coords[0]) * t;
  const wy = a.coords[1] + (b.coords[1] - a.coords[1]) * t;
  const sx = toScreenX(wx);
  const sy = toScreenY(wy);
  const fx = ld.force?.[0] || 0;
  const fy = ld.force?.[1] || 0;
  const mag = Math.sqrt(fx * fx + fy * fy);
  if (mag < 1e-9) return null;
  const ux = fx / mag;
  const uy = -fy / mag;
  const len = 50 * arrowScale;
  const startX = sx - ux * len;
  const startY = sy - uy * len;
  const ah = 7 * arrowScale;
  const angle = Math.atan2(sy - startY, sx - startX);
  const a1x = sx - Math.cos(angle - Math.PI / 6) * ah;
  const a1y = sy - Math.sin(angle - Math.PI / 6) * ah;
  const a2x = sx - Math.cos(angle + Math.PI / 6) * ah;
  const a2y = sy - Math.sin(angle + Math.PI / 6) * ah;
  const fs = 10 * fontScale;
  return (
    <g key={ld.id}>
      <line x1={startX} y1={startY} x2={sx} y2={sy} stroke={ACCENT} strokeWidth={2} pointerEvents="none" />
      <polygon points={`${sx},${sy} ${a1x},${a1y} ${a2x},${a2y}`} fill={ACCENT} pointerEvents="none" />
      <circle cx={sx} cy={sy} r={3} fill={ACCENT} pointerEvents="none" />
      {makeDraggableText(`load:${ld.id}`, startX, startY - 4, (x, y) => (
        <text x={x} y={y} fontSize={fs} fill={ACCENT} fontFamily="monospace">
          P = {formatForce(mag)}
        </text>
      ))}
    </g>
  );
}
