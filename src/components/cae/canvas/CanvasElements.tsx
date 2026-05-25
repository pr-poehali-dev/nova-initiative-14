import type { FrameModel, ModelElement, SolverResponse } from "@/lib/cae-model";
import { ACCENT, LINE, ELEMENT_W } from "./canvas-constants";

interface Props {
  model: FrameModel;
  selectedElementId: string | null;
  result: SolverResponse | null;
  showDiagram: "none" | "deformed" | "N" | "Qy" | "Mz" | "sigma";
  diagramScale: number;
  mode: "select" | "draw-node" | "draw-element" | "bc" | "load-nodal" | "load-distributed";
  pendingFirstNodeId: string | null;
  cursorWorld: { x: number; y: number } | null;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  handleElementClick: (el: ModelElement, e: React.MouseEvent) => void;
}

const CanvasElements = ({
  model,
  selectedElementId,
  result,
  showDiagram,
  diagramScale,
  mode,
  pendingFirstNodeId,
  cursorWorld,
  toScreenX,
  toScreenY,
  handleElementClick,
}: Props) => {
  // === Деформированная схема ===
  const dispMap = new Map(
    (result?.nodal_displacements || []).map((d) => [d.node_id, d]),
  );
  const renderDeformed = showDiagram === "deformed" && result;

  return (
    <>
      {/* элементы (исходные) */}
      {model.elements.map((el) => {
        const a = model.nodes.find((n) => n.id === el.node_start);
        const b = model.nodes.find((n) => n.id === el.node_end);
        if (!a || !b) return null;
        const isSel = selectedElementId === el.id;
        return (
          <line
            key={el.id}
            x1={toScreenX(a.coords[0])}
            y1={toScreenY(a.coords[1])}
            x2={toScreenX(b.coords[0])}
            y2={toScreenY(b.coords[1])}
            stroke={isSel ? ACCENT : LINE}
            strokeWidth={isSel ? ELEMENT_W + 1.5 : ELEMENT_W}
            style={{ cursor: "pointer" }}
            onClick={(e) => handleElementClick(el, e)}
          />
        );
      })}

      {/* деформированная форма */}
      {renderDeformed &&
        model.elements.map((el) => {
          const a = model.nodes.find((n) => n.id === el.node_start);
          const b = model.nodes.find((n) => n.id === el.node_end);
          if (!a || !b) return null;
          const da = dispMap.get(a.id);
          const db = dispMap.get(b.id);
          if (!da || !db) return null;
          const k = diagramScale * 200;
          return (
            <line
              key={`def${el.id}`}
              x1={toScreenX(a.coords[0] + da.ux * k)}
              y1={toScreenY(a.coords[1] + da.uy * k)}
              x2={toScreenX(b.coords[0] + db.ux * k)}
              y2={toScreenY(b.coords[1] + db.uy * k)}
              stroke={ACCENT}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          );
        })}

      {/* preview элемента (draw-element) */}
      {mode === "draw-element" && pendingFirstNodeId && cursorWorld && (() => {
        const n = model.nodes.find((x) => x.id === pendingFirstNodeId);
        if (!n) return null;
        return (
          <line
            x1={toScreenX(n.coords[0])}
            y1={toScreenY(n.coords[1])}
            x2={toScreenX(cursorWorld.x)}
            y2={toScreenY(cursorWorld.y)}
            stroke={ACCENT}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        );
      })()}
    </>
  );
};

export default CanvasElements;
