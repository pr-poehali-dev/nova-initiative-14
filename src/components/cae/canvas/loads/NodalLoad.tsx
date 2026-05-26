import type { FrameModel, ModelLoad } from "@/lib/cae-model";
import { formatForce, formatMoment } from "@/lib/formatForce";
import { ACCENT } from "../canvas-constants";
import type { DraggableTextFactory } from "../canvas-overlays-helpers";

/**
 * Узловая нагрузка: точечная сила (Fx, Fy) + момент Mz (круговая стрелка).
 *
 * Сила рисуется «входящей» в узел — наконечник стрелки в узле, хвост
 * смещён против направления силы на 60·arrowScale пикселей.
 *
 * Момент: дуга 270° с маленьким наконечником на конце. Знак Mz определяет
 * направление обхода (ccw для Mz > 0).
 */
export function renderNodalLoad(
  ld: ModelLoad,
  model: FrameModel,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number,
  arrowScale: number,
  fontScale: number,
  makeDraggableText: DraggableTextFactory,
): React.ReactElement | null {
  if (!ld.node_id) return null;
  const n = model.nodes.find((x) => x.id === ld.node_id);
  if (!n) return null;
  const sx = toScreenX(n.coords[0]);
  const sy = toScreenY(n.coords[1]);
  const fx = ld.force?.[0] || 0;
  const fy = ld.force?.[1] || 0;
  const mag = Math.sqrt(fx * fx + fy * fy);
  const items: React.ReactElement[] = [];

  if (mag > 1e-9) {
    const ux = fx / mag;
    const uy = -fy / mag;
    const len = 60 * arrowScale;
    const startX = sx - ux * len;
    const startY = sy - uy * len;
    const ah = 8 * arrowScale;
    const a1x = sx - Math.cos(Math.atan2(sy - startY, sx - startX) - Math.PI / 6) * ah;
    const a1y = sy - Math.sin(Math.atan2(sy - startY, sx - startX) - Math.PI / 6) * ah;
    const a2x = sx - Math.cos(Math.atan2(sy - startY, sx - startX) + Math.PI / 6) * ah;
    const a2y = sy - Math.sin(Math.atan2(sy - startY, sx - startX) + Math.PI / 6) * ah;
    const fs = 11 * fontScale;
    items.push(
      <g key={`${ld.id}_F`}>
        <line x1={startX} y1={startY} x2={sx} y2={sy} stroke={ACCENT} strokeWidth={2} pointerEvents="none" />
        <polygon points={`${sx},${sy} ${a1x},${a1y} ${a2x},${a2y}`} fill={ACCENT} pointerEvents="none" />
        {makeDraggableText(`load:${ld.id}`, startX, startY - 6, (x, y) => (
          <text x={x} y={y} fontSize={fs} fill={ACCENT} fontFamily="monospace">
            {formatForce(mag)}
          </text>
        ))}
      </g>,
    );
  }

  const mz = ld.moment?.[2] || 0;
  if (Math.abs(mz) > 1e-9) {
    const r = 16 * arrowScale;
    const ccw = mz > 0;
    const start = ccw ? -Math.PI / 2 : Math.PI / 2;
    const end = ccw ? Math.PI : 0;
    const sweepX = sx + r * Math.cos(start);
    const sweepY = sy + r * Math.sin(start);
    const endX = sx + r * Math.cos(end);
    const endY = sy + r * Math.sin(end);
    const sweepFlag = ccw ? 1 : 0;
    const path = `M ${sweepX} ${sweepY} A ${r} ${r} 0 1 ${sweepFlag} ${endX} ${endY}`;
    const ah = 6 * arrowScale;
    const tangent = ccw ? end - Math.PI / 2 : end + Math.PI / 2;
    const a1x = endX + Math.cos(tangent + Math.PI / 8) * ah;
    const a1y = endY + Math.sin(tangent + Math.PI / 8) * ah;
    const a2x = endX + Math.cos(tangent - Math.PI / 8) * ah;
    const a2y = endY + Math.sin(tangent - Math.PI / 8) * ah;
    const fs = 10 * fontScale;
    items.push(
      <g key={`${ld.id}_M`}>
        <path d={path} fill="none" stroke={ACCENT} strokeWidth={2} pointerEvents="none" />
        <polygon points={`${endX},${endY} ${a1x},${a1y} ${a2x},${a2y}`} fill={ACCENT} pointerEvents="none" />
        {makeDraggableText(`loadM:${ld.id}`, sx + r + 6, sy - r, (x, y) => (
          <text x={x} y={y} fontSize={fs} fill={ACCENT} fontFamily="monospace">
            {formatMoment(mz)}
          </text>
        ))}
      </g>,
    );
  }

  return items.length > 0 ? <g key={ld.id}>{items}</g> : null;
}
