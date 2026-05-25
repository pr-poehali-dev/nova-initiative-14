import type {
  FrameModel,
  ModelNode,
  BoundaryCondition,
  ModelLoad,
} from "@/lib/cae-model";
import { ACCENT, LINE, THIN, BG, NODE_R } from "./canvas-constants";

interface Props {
  model: FrameModel;
  selectedNodeId: string | null;
  pendingFirstNodeId: string | null;
  cursorWorld: { x: number; y: number } | null;
  size: { w: number; h: number };
  pxPerM: number;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  handleNodeClick: (n: ModelNode, e: React.MouseEvent) => void;
}

const CanvasOverlays = ({
  model,
  selectedNodeId,
  pendingFirstNodeId,
  cursorWorld,
  size,
  pxPerM,
  toScreenX,
  toScreenY,
  handleNodeClick,
}: Props) => {
  // === Рисуем нагрузки ===
  const renderLoad = (ld: ModelLoad) => {
    if (ld.type === "nodal_force" && ld.node_id) {
      const n = model.nodes.find((x) => x.id === ld.node_id);
      if (!n) return null;
      const fx = ld.force?.[0] || 0;
      const fy = ld.force?.[1] || 0;
      const sx = toScreenX(n.coords[0]);
      const sy = toScreenY(n.coords[1]);
      const mag = Math.sqrt(fx * fx + fy * fy);
      if (mag < 1e-9) return null;
      const len = 60;
      const ex = sx - (fx / mag) * len;
      const ey = sy + (fy / mag) * len;
      const angle = Math.atan2(sy - ey, sx - ex);
      const ah = 8;
      const a1x = sx - Math.cos(angle - Math.PI / 6) * ah;
      const a1y = sy - Math.sin(angle - Math.PI / 6) * ah;
      const a2x = sx - Math.cos(angle + Math.PI / 6) * ah;
      const a2y = sy - Math.sin(angle + Math.PI / 6) * ah;
      return (
        <g key={ld.id} pointerEvents="none">
          <line x1={ex} y1={ey} x2={sx} y2={sy} stroke={ACCENT} strokeWidth={2} />
          <polygon points={`${sx},${sy} ${a1x},${a1y} ${a2x},${a2y}`} fill={ACCENT} />
          <text x={ex} y={ey - 6} fontSize={11} fill={ACCENT} fontFamily="monospace">
            {Math.round(mag)} Н
          </text>
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
      // защемление: квадрат с штриховкой
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
      // шарнирная: треугольник + штриховка
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
    // каток
    return (
      <g key={bc.id} pointerEvents="none">
        <circle cx={sx} cy={sy + 10} r={5} fill={BG} stroke={LINE} strokeWidth={1.5} />
        <line x1={sx - 10} y1={sy + 16} x2={sx + 10} y2={sy + 16} stroke={LINE} strokeWidth={1.5} />
      </g>
    );
  };

  return (
    <>
      {/* КГУ */}
      {model.boundary_conditions.map((bc) => renderBC(bc))}

      {/* нагрузки */}
      {model.loads.map((ld) => renderLoad(ld))}

      {/* узлы */}
      {model.nodes.map((n) => {
        const isSel = selectedNodeId === n.id;
        const isPending = pendingFirstNodeId === n.id;
        return (
          <g key={n.id} style={{ cursor: "pointer" }} onClick={(e) => handleNodeClick(n, e)}>
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
    </>
  );
};

export default CanvasOverlays;
