/**
 * Подкомпонент CanvasOverlays: реакции опор + интерактивные узлы +
 * подпись координат курсора + легенда реакций.
 *
 * Сгруппированы вместе, поскольку все они зависят от одного и того же набора
 * пропсов (model, toScreen, makeDraggableText, fontScale) и отрисовываются
 * после нагрузок/КГУ в исходном CanvasOverlays.tsx.
 *
 * Логика 1:1 перенесена.
 */
import type { FrameModel, ModelNode, SolverResponse } from "@/lib/cae-model";
import { ACCENT, LINE, THIN, BG, NODE_R } from "./canvas-constants";
import { REACTION, type DraggableTextFactory } from "./canvas-overlays-helpers";

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
  showReactions: boolean;
  arrowScale: number;
  fontScale: number;
  makeDraggableText: DraggableTextFactory;
}

const CanvasReactionsAndNodes = ({
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
  showReactions,
  arrowScale,
  fontScale,
  makeDraggableText,
}: Props) => {
  const selSet = new Set(selectedNodeIds);

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
      // Реакция: стрелка из узла наружу. Длина и наконечник масштабируются arrowScale.
      const reactionLen = 50 * arrowScale;
      const ux = fx / mag;
      const uy = -fy / mag;
      const ex = sx + ux * reactionLen;
      const ey = sy + uy * reactionLen;
      const ah = 8 * arrowScale;
      const a1x = ex - ux * ah - uy * ah * 0.5;
      const a1y = ey - uy * ah + ux * ah * 0.5;
      const a2x = ex - ux * ah + uy * ah * 0.5;
      const a2y = ey - uy * ah - ux * ah * 0.5;
      const fs = 11 * fontScale;
      items.push(
        <g key={`${rxn.node_id}_RF`}>
          <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={REACTION} strokeWidth={2} pointerEvents="none" />
          <polygon points={`${ex},${ey} ${a1x},${a1y} ${a2x},${a2y}`} fill={REACTION} pointerEvents="none" />
          {makeDraggableText(`rxn:${rxn.node_id}`, ex + ux * 5, ey + uy * 5 - 2, (x, y) => (
            <text
              x={x}
              y={y}
              fontSize={fs}
              fill={REACTION}
              fontFamily="monospace"
              textAnchor={ux > 0.5 ? "start" : ux < -0.5 ? "end" : "middle"}
            >
              R={Math.round(mag)} Н
            </text>
          ))}
        </g>,
      );
    }

    if (Math.abs(mz) > 1e-3) {
      const fs = 10 * fontScale;
      items.push(
        <g key={`${rxn.node_id}_RM`}>
          {makeDraggableText(`rxnM:${rxn.node_id}`, sx + 12, sy + 22, (x, y) => (
            <text x={x} y={y} fontSize={fs} fill={REACTION} fontFamily="monospace">
              M={Math.round(mz)} Н·м
            </text>
          ))}
        </g>,
      );
    }

    return items.length > 0 ? <g key={`rxn_${rxn.node_id}`}>{items}</g> : null;
  };

  return (
    <>
      {/* реакции опор (после расчёта) */}
      {showReactions && result?.reactions.map((rxn) => renderReaction(rxn))}

      {/* узлы — кружок (кликабельный) + перетаскиваемая подпись отдельной группой */}
      {model.nodes.map((n) => {
        const isSel = selSet.has(n.id);
        const isPending = pendingFirstNodeId === n.id;
        const cx = toScreenX(n.coords[0]);
        const cy = toScreenY(n.coords[1]);
        const fs = 10 * fontScale;
        return (
          <g key={n.id}>
            <g
              style={{ cursor: isSel ? "move" : "pointer" }}
              onClick={(e) => handleNodeClick(n, e)}
              onPointerDown={handleNodePointerDown ? (e) => handleNodePointerDown(n, e) : undefined}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isSel || isPending ? NODE_R + 3 : NODE_R}
                fill={isSel ? ACCENT : isPending ? ACCENT : BG}
                stroke={isSel || isPending ? ACCENT : LINE}
                strokeWidth={2}
              />
            </g>
            {makeDraggableText(`node:${n.id}`, cx + 10, cy - 8, (x, y) => (
              <text x={x} y={y} fontSize={fs} fill={THIN} fontFamily="monospace">
                {n.id}
              </text>
            ))}
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

export default CanvasReactionsAndNodes;
