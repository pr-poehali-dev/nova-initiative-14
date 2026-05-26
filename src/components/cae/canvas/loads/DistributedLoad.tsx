import type { FrameModel, ModelLoad } from "@/lib/cae-model";
import { formatDistLoad } from "@/lib/formatForce";
import { ACCENT } from "../canvas-constants";
import type { DraggableTextFactory } from "../canvas-overlays-helpers";

/**
 * Равномерно-распределённая нагрузка q — гребёнка стрелок поперёк стержня.
 *
 *  1. Считаем направление в локальной СК элемента: ex_world (вдоль элемента),
 *     nx_world (нормаль, поворот +90°).
 *  2. Полное направление нагрузки = ex·qx + nx·qy (в мире).
 *  3. Линия «сверху» гребёнки — на смещении arrowLen против направления нагрузки.
 *  4. Количество стрелок n = clamp(2…20, lenPx/30).
 *  5. Подпись «q = …» по центру гребёнки (перетаскиваемая).
 */
export function renderDistributedLoad(
  ld: ModelLoad,
  model: FrameModel,
  pxPerM: number,
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
  const dx = b.coords[0] - a.coords[0];
  const dy = b.coords[1] - a.coords[1];
  const lenM = Math.sqrt(dx * dx + dy * dy);
  if (lenM < 1e-9) return null;
  const qy = ld.load_local_per_length?.[1] || 0;
  const qx = ld.load_local_per_length?.[0] || 0;
  if (Math.abs(qy) < 1e-9 && Math.abs(qx) < 1e-9) return null;

  // Локальный базис элемента
  const ex_world = dx / lenM;
  const ey_world = dy / lenM;
  const nx_world = -ey_world; // нормаль (поворот +90° против часовой)
  const ny_world = ex_world;
  // Полное направление нагрузки в мировой СК
  const fx_world = ex_world * qx + nx_world * qy;
  const fy_world = ey_world * qx + ny_world * qy;
  const fmag = Math.sqrt(fx_world * fx_world + fy_world * fy_world);
  if (fmag < 1e-9) return null;
  const fnx = fx_world / fmag;
  const fny = fy_world / fmag;
  // в экранных координатах: y инвертирован
  const sfnx = fnx;
  const sfny = -fny;

  const arrowLen = 24 * arrowScale;
  const lenPx = lenM * pxPerM;
  const nArrows = Math.max(2, Math.min(20, Math.round(lenPx / 30)));
  const items: React.ReactElement[] = [];

  const topStartX = toScreenX(a.coords[0]) - sfnx * arrowLen;
  const topStartY = toScreenY(a.coords[1]) - sfny * arrowLen;
  const topEndX = toScreenX(b.coords[0]) - sfnx * arrowLen;
  const topEndY = toScreenY(b.coords[1]) - sfny * arrowLen;
  items.push(
    <line
      key="top"
      x1={topStartX}
      y1={topStartY}
      x2={topEndX}
      y2={topEndY}
      stroke={ACCENT}
      strokeWidth={1.5}
    />,
  );

  for (let i = 0; i <= nArrows; i++) {
    const t = i / nArrows;
    const wx = a.coords[0] + dx * t;
    const wy = a.coords[1] + dy * t;
    const tipX = toScreenX(wx);
    const tipY = toScreenY(wy);
    const tailX = tipX - sfnx * arrowLen;
    const tailY = tipY - sfny * arrowLen;
    const ah = 5 * arrowScale;
    const angle = Math.atan2(tipY - tailY, tipX - tailX);
    const a1x = tipX - Math.cos(angle - Math.PI / 6) * ah;
    const a1y = tipY - Math.sin(angle - Math.PI / 6) * ah;
    const a2x = tipX - Math.cos(angle + Math.PI / 6) * ah;
    const a2y = tipY - Math.sin(angle + Math.PI / 6) * ah;
    items.push(
      <g key={`a${i}`}>
        <line x1={tailX} y1={tailY} x2={tipX} y2={tipY} stroke={ACCENT} strokeWidth={1.3} />
        <polygon points={`${tipX},${tipY} ${a1x},${a1y} ${a2x},${a2y}`} fill={ACCENT} />
      </g>,
    );
  }

  const midX = (topStartX + topEndX) / 2;
  const midY = (topStartY + topEndY) / 2;
  const fs = 11 * fontScale;
  return (
    <g key={ld.id}>
      <g pointerEvents="none">{items}</g>
      {makeDraggableText(`load:${ld.id}`, midX, midY - 6, (x, y) => (
        <text
          x={x}
          y={y}
          fontSize={fs}
          fill={ACCENT}
          fontFamily="monospace"
          textAnchor="middle"
        >
          q = {formatDistLoad(Math.abs(qy || qx))}
        </text>
      ))}
    </g>
  );
}
