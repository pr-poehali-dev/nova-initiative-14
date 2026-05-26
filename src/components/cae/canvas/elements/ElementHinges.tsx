import type { FrameModel } from "@/lib/cae-model";
import { LINE } from "../canvas-constants";

/**
 * Маркеры шарниров на концах стержней (Mz = 0): белый кружок с обводкой,
 * смещённый на ~12 px вдоль оси стержня от узла. Признак фермы / шатуна /
 * тяги / подкоса / балки Гербера.
 */
export default function ElementHinges({
  model,
  toScreenX,
  toScreenY,
}: {
  model: FrameModel;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
}) {
  return (
    <>
      {model.elements.map((el) => {
        if (!el.hinge_start && !el.hinge_end) return null;
        const a = model.nodes.find((n) => n.id === el.node_start);
        const b = model.nodes.find((n) => n.id === el.node_end);
        if (!a || !b) return null;
        const ax = toScreenX(a.coords[0]);
        const ay = toScreenY(a.coords[1]);
        const bx = toScreenX(b.coords[0]);
        const by = toScreenY(b.coords[1]);
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);
        if (len < 1e-3) return null;
        const ux = dx / len;
        const uy = dy / len;
        const offset = Math.min(14, len * 0.25);
        const r = 4.5;
        return (
          <g key={`hinge-${el.id}`} pointerEvents="none">
            {el.hinge_start && (
              <circle
                cx={ax + ux * offset}
                cy={ay + uy * offset}
                r={r}
                fill="#ffffff"
                stroke={LINE}
                strokeWidth={1.4}
              />
            )}
            {el.hinge_end && (
              <circle
                cx={bx - ux * offset}
                cy={by - uy * offset}
                r={r}
                fill="#ffffff"
                stroke={LINE}
                strokeWidth={1.4}
              />
            )}
          </g>
        );
      })}
    </>
  );
}
