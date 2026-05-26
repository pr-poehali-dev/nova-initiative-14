/**
 * Подкомпонент CanvasOverlays: отрисовка нагрузок.
 * Поддерживаются:
 *  - узловая сила + узловой момент Mz (круговая стрелка)
 *  - точечная сила в пролёте (in_span_point)
 *  - равномерно-распределённая нагрузка q (гребёнка стрелок)
 *
 * Логика 1:1 перенесена из CanvasOverlays.tsx — пропсы, координаты,
 * масштабы, ключи и обёртки draggable-подписей сохранены без изменений.
 */
import type { FrameModel, ModelLoad } from "@/lib/cae-model";
import { formatDistLoad, formatForce, formatMoment } from "@/lib/formatForce";
import { ACCENT } from "./canvas-constants";
import type { DraggableTextFactory } from "./canvas-overlays-helpers";

interface Props {
  model: FrameModel;
  pxPerM: number;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  arrowScale: number;
  fontScale: number;
  makeDraggableText: DraggableTextFactory;
}

const CanvasLoads = ({
  model,
  pxPerM,
  toScreenX,
  toScreenY,
  arrowScale,
  fontScale,
  makeDraggableText,
}: Props) => {
  const renderLoad = (ld: ModelLoad) => {
    // Узловая сила
    if (ld.type === "nodal_force" && ld.node_id) {
      const n = model.nodes.find((x) => x.id === ld.node_id);
      if (!n) return null;
      const sx = toScreenX(n.coords[0]);
      const sy = toScreenY(n.coords[1]);
      const fx = ld.force?.[0] || 0;
      const fy = ld.force?.[1] || 0;
      const mag = Math.sqrt(fx * fx + fy * fy);
      const items: React.ReactElement[] = [];

      // Стрелка силы: рисуем "входящую" в узел (наконечник в узле)
      // То есть начало стрелки смещаем ПРОТИВ направления силы
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

      // Узловой момент Mz: круговая стрелка
      const mz = ld.moment?.[2] || 0;
      if (Math.abs(mz) > 1e-9) {
        const r = 16 * arrowScale;
        const ccw = mz > 0; // против часовой = положительное Mz
        // Дуга 270°
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

    // Точечная сила в пролёте
    if (ld.type === "in_span_point" && ld.element_id) {
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

    // Распределённая равномерная нагрузка q (гребёнка стрелок)
    if (ld.type === "distributed_uniform" && ld.element_id) {
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

      // Направление нагрузки в ЛОКАЛЬНОЙ СК элемента
      // ось x_local = вдоль (b - a), ось y_local = поворот x_local на +90° (нормаль)
      const ex_world = dx / lenM;
      const ey_world = dy / lenM;
      // нормаль (поворот на +90° против часовой)
      const nx_world = -ey_world;
      const ny_world = ex_world;
      // полное направление нагрузки в мировой СК
      const fx_world = ex_world * qx + nx_world * qy;
      const fy_world = ey_world * qx + ny_world * qy;
      const fmag = Math.sqrt(fx_world * fx_world + fy_world * fy_world);
      if (fmag < 1e-9) return null;
      const fnx = fx_world / fmag; // в мире
      const fny = fy_world / fmag;
      // в экранных координатах: y инвертирован
      const sfnx = fnx;
      const sfny = -fny;

      const arrowLen = 24 * arrowScale; // длина каждой стрелки в пикселях
      // Количество стрелок зависит от длины элемента на экране
      const lenPx = lenM * pxPerM;
      const nArrows = Math.max(2, Math.min(20, Math.round(lenPx / 30)));
      const items: React.ReactElement[] = [];

      // Линия "сверху" гребёнки — на смещении arrowLen от балки против направления нагрузки
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

      // Стрелки
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
            <polygon
              points={`${tipX},${tipY} ${a1x},${a1y} ${a2x},${a2y}`}
              fill={ACCENT}
            />
          </g>,
        );
      }

      // Подпись по центру (перетаскиваемая)
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

    return null;
  };

  return <>{model.loads.map((ld) => renderLoad(ld))}</>;
};

export default CanvasLoads;