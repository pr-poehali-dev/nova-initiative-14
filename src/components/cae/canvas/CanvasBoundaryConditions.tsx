/**
 * Подкомпонент CanvasOverlays: отрисовка опор (КГУ).
 * По ГОСТ 2.770:
 *   - три DOF (ux,uy,rz) закреплены → жёсткая заделка (прямоугольник + штриховка)
 *   - два DOF (ux,uy) → шарнирно-неподвижная опора (треугольник + штриховка)
 *   - один DOF → подвижный шарнир/каток (круг с горизонтальной линией)
 *
 * Логика 1:1 перенесена из CanvasOverlays.tsx.
 */
import type { FrameModel, BoundaryCondition } from "@/lib/cae-model";
import { LINE, BG } from "./canvas-constants";

interface Props {
  model: FrameModel;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
}

const CanvasBoundaryConditions = ({ model, toScreenX, toScreenY }: Props) => {
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

  return <>{model.boundary_conditions.map((bc) => renderBC(bc))}</>;
};

export default CanvasBoundaryConditions;
