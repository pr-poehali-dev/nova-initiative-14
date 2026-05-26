import type {
  FrameModel,
  ModelNode,
  BoundaryCondition,
  ModelLoad,
  SolverResponse,
} from "@/lib/cae-model";
import { ACCENT, LINE, THIN, BG, NODE_R } from "./canvas-constants";

// Зелёный — для реакций опор (стандарт в LIRA/SCAD)
const REACTION = "#1a8a5a";

interface Props {
  model: FrameModel;
  selectedNodeIds: string[];
  pendingFirstNodeId: string | null;
  cursorWorld: { x: number; y: number } | null;
  size: { w: number; h: number };
  pxPerM: number;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  handleNodeClick: (n: ModelNode, e: React.MouseEvent) => void;
  handleNodePointerDown?: (n: ModelNode, e: React.PointerEvent) => void;
  result: SolverResponse | null;
  showReactions?: boolean;
}

/**
 * Универсальная функция для рисования стрелки силы.
 * (sx, sy) — точка приложения, направление (fx, fy) в пикселях
 * (в направлении приложения силы). Стрелка начинается из (sx, sy) и направлена
 * по силе (наконечник в конце).
 */
function arrowFromPoint(
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

const CanvasOverlays = ({
  model,
  selectedNodeIds,
  pendingFirstNodeId,
  cursorWorld,
  size,
  pxPerM,
  toScreenX,
  toScreenY,
  handleNodeClick,
  handleNodePointerDown,
  result,
  showReactions = true,
}: Props) => {
  const selSet = new Set(selectedNodeIds);
  // === Нагрузки ===
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
        const len = 60;
        const startX = sx - ux * len;
        const startY = sy - uy * len;
        const ah = 8;
        const a1x = sx - Math.cos(Math.atan2(sy - startY, sx - startX) - Math.PI / 6) * ah;
        const a1y = sy - Math.sin(Math.atan2(sy - startY, sx - startX) - Math.PI / 6) * ah;
        const a2x = sx - Math.cos(Math.atan2(sy - startY, sx - startX) + Math.PI / 6) * ah;
        const a2y = sy - Math.sin(Math.atan2(sy - startY, sx - startX) + Math.PI / 6) * ah;
        items.push(
          <g key={`${ld.id}_F`}>
            <line x1={startX} y1={startY} x2={sx} y2={sy} stroke={ACCENT} strokeWidth={2} />
            <polygon points={`${sx},${sy} ${a1x},${a1y} ${a2x},${a2y}`} fill={ACCENT} />
            <text x={startX} y={startY - 6} fontSize={11} fill={ACCENT} fontFamily="monospace">
              {Math.round(mag)} Н
            </text>
          </g>,
        );
      }

      // Узловой момент Mz: круговая стрелка
      const mz = ld.moment?.[2] || 0;
      if (Math.abs(mz) > 1e-9) {
        const r = 16;
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
        const ah = 6;
        const tangent = ccw ? end - Math.PI / 2 : end + Math.PI / 2;
        const a1x = endX + Math.cos(tangent + Math.PI / 8) * ah;
        const a1y = endY + Math.sin(tangent + Math.PI / 8) * ah;
        const a2x = endX + Math.cos(tangent - Math.PI / 8) * ah;
        const a2y = endY + Math.sin(tangent - Math.PI / 8) * ah;
        items.push(
          <g key={`${ld.id}_M`}>
            <path d={path} fill="none" stroke={ACCENT} strokeWidth={2} />
            <polygon points={`${endX},${endY} ${a1x},${a1y} ${a2x},${a2y}`} fill={ACCENT} />
            <text x={sx + r + 6} y={sy - r} fontSize={10} fill={ACCENT} fontFamily="monospace">
              {Math.round(mz)} Н·м
            </text>
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
      const len = 50;
      const startX = sx - ux * len;
      const startY = sy - uy * len;
      const ah = 7;
      const angle = Math.atan2(sy - startY, sx - startX);
      const a1x = sx - Math.cos(angle - Math.PI / 6) * ah;
      const a1y = sy - Math.sin(angle - Math.PI / 6) * ah;
      const a2x = sx - Math.cos(angle + Math.PI / 6) * ah;
      const a2y = sy - Math.sin(angle + Math.PI / 6) * ah;
      return (
        <g key={ld.id} pointerEvents="none">
          <line x1={startX} y1={startY} x2={sx} y2={sy} stroke={ACCENT} strokeWidth={2} />
          <polygon points={`${sx},${sy} ${a1x},${a1y} ${a2x},${a2y}`} fill={ACCENT} />
          <circle cx={sx} cy={sy} r={3} fill={ACCENT} />
          <text x={startX} y={startY - 4} fontSize={10} fill={ACCENT} fontFamily="monospace">
            P={Math.round(mag)} Н
          </text>
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

      const arrowLen = 24; // длина каждой стрелки в пикселях
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
        const ah = 5;
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

      // Подпись по центру
      const midX = (topStartX + topEndX) / 2;
      const midY = (topStartY + topEndY) / 2;
      items.push(
        <text
          key="label"
          x={midX}
          y={midY - 6}
          fontSize={11}
          fill={ACCENT}
          fontFamily="monospace"
          textAnchor="middle"
        >
          q = {Math.round(Math.abs(qy || qx))} Н/м
        </text>,
      );

      return (
        <g key={ld.id} pointerEvents="none">
          {items}
        </g>
      );
    }

    return null;
  };

  // === КГУ ===
  const renderBC = (bc: BoundaryCondition) => {
    const n = model.nodes.find((x) => x.id === bc.node_id);
    if (!n) return null;
    const sx = toScreenX(n.coords[0]);
    const sy = toScreenY(n.coords[1]);
    const dofs = new Set(bc.constrained_dofs);
    if (dofs.has("ux") && dofs.has("uy") && dofs.has("rz")) {
      const s = 14;
      return (
        <g key={bc.id} pointerEvents="none">
          <rect x={sx - s} y={sy - 2} width={s * 2} height={s} fill={LINE} fillOpacity={0.15} stroke={LINE} strokeWidth={1.5} />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={sx - s + i * 7} y1={sy + s - 2} x2={sx - s + i * 7 + 6} y2={sy + s + 6} stroke={LINE} strokeWidth={1.2} />
          ))}
        </g>
      );
    }
    if (dofs.has("ux") && dofs.has("uy")) {
      const s = 10;
      return (
        <g key={bc.id} pointerEvents="none">
          <polygon points={`${sx},${sy + 2} ${sx - s},${sy + s + 2} ${sx + s},${sy + s + 2}`} fill={LINE} fillOpacity={0.15} stroke={LINE} strokeWidth={1.5} />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={sx - s + i * 6} y1={sy + s + 2} x2={sx - s + i * 6 + 5} y2={sy + s + 10} stroke={LINE} strokeWidth={1.2} />
          ))}
        </g>
      );
    }
    return (
      <g key={bc.id} pointerEvents="none">
        <circle cx={sx} cy={sy + 10} r={5} fill={BG} stroke={LINE} strokeWidth={1.5} />
        <line x1={sx - 10} y1={sy + 16} x2={sx + 10} y2={sy + 16} stroke={LINE} strokeWidth={1.5} />
      </g>
    );
  };

  // === Реакции опор (зелёные стрелки) ===
  const renderReaction = (rxn: SolverResponse["reactions"][number]) => {
    const n = model.nodes.find((x) => x.id === rxn.node_id);
    if (!n) return null;
    const sx = toScreenX(n.coords[0]);
    const sy = toScreenY(n.coords[1]);
    const fx = rxn.fx || 0;
    const fy = rxn.fy || 0;
    const mz = rxn.mz || 0;
    const items: React.ReactElement[] = [];

    const mag = Math.sqrt(fx * fx + fy * fy);
    if (mag > 1e-3) {
      // Стрелка реакции рисуется ОТ опоры (не из центра узла):
      // начало смещаем против направления реакции на глубину символа опоры (~24px),
      // наконечник направлен ПО реакции — стрелка уходит от опоры.
      const ux = fx / mag;
      const uy = -fy / mag; // экранная Y инвертирована
      const supportDepth = 24; // px — примерная высота символа опоры
      const startX = sx - ux * supportDepth;
      const startY = sy - uy * supportDepth;
      const arr = arrowFromPoint(
        startX,
        startY,
        fx,
        fy,
        50,
        REACTION,
        `R=${Math.round(mag)} Н`,
        `${rxn.node_id}_RF`,
      );
      if (arr) items.push(arr);
    }

    if (Math.abs(mz) > 1e-3) {
      items.push(
        <text
          key={`${rxn.node_id}_RM`}
          x={sx + 12}
          y={sy + 22}
          fontSize={10}
          fill={REACTION}
          fontFamily="monospace"
          pointerEvents="none"
        >
          M={Math.round(mz)} Н·м
        </text>,
      );
    }

    return items.length > 0 ? <g key={`rxn_${rxn.node_id}`}>{items}</g> : null;
  };

  return (
    <>
      {/* КГУ */}
      {model.boundary_conditions.map((bc) => renderBC(bc))}

      {/* нагрузки */}
      {model.loads.map((ld) => renderLoad(ld))}

      {/* реакции опор (после расчёта) */}
      {showReactions && result?.reactions.map((rxn) => renderReaction(rxn))}

      {/* узлы */}
      {model.nodes.map((n) => {
        const isSel = selSet.has(n.id);
        const isPending = pendingFirstNodeId === n.id;
        return (
          <g
            key={n.id}
            style={{ cursor: isSel ? "move" : "pointer" }}
            onClick={(e) => handleNodeClick(n, e)}
            onPointerDown={handleNodePointerDown ? (e) => handleNodePointerDown(n, e) : undefined}
          >
            <circle
              cx={toScreenX(n.coords[0])}
              cy={toScreenY(n.coords[1])}
              r={isSel || isPending ? NODE_R + 3 : NODE_R}
              fill={isSel ? ACCENT : isPending ? ACCENT : BG}
              stroke={isSel || isPending ? ACCENT : LINE}
              strokeWidth={2}
            />
            <text
              x={toScreenX(n.coords[0]) + 10}
              y={toScreenY(n.coords[1]) - 8}
              fontSize={10}
              fill={THIN}
              fontFamily="monospace"
              pointerEvents="none"
            >
              {n.id}
            </text>
          </g>
        );
      })}

      {/* координаты курсора */}
      {cursorWorld && (
        <text x={10} y={size.h - 12} fontSize={11} fill={THIN} fontFamily="monospace" pointerEvents="none">
          {`x=${cursorWorld.x.toFixed(2)} м,  y=${cursorWorld.y.toFixed(2)} м   ·   масштаб ${pxPerM.toFixed(0)} px/м`}
        </text>
      )}

      {/* Легенда: показывается, если есть результат */}
      {showReactions && result && result.reactions.length > 0 && (
        <g pointerEvents="none">
          <rect x={size.w - 130} y={10} width={120} height={32} fill={BG} fillOpacity={0.85} stroke={THIN} strokeWidth={0.5} />
          <line x1={size.w - 122} y1={22} x2={size.w - 104} y2={22} stroke={REACTION} strokeWidth={2} />
          <polygon points={`${size.w - 104},${22} ${size.w - 109},${19} ${size.w - 109},${25}`} fill={REACTION} />
          <text x={size.w - 98} y={26} fontSize={10} fill={REACTION} fontFamily="monospace">
            реакция опоры
          </text>
        </g>
      )}
    </>
  );
};

export default CanvasOverlays;