import type { FrameModel, SolverResponse } from "@/lib/cae-model";
import { ACCENT } from "../canvas-constants";

/**
 * Деформированная форма рамы:
 *  - если у элемента есть эпюра uy_local — рисуем кривую прогиба через её точки
 *    (с автомасштабом так, чтобы max ≈ 15% длины элемента) × diagramScale
 *  - иначе fallback: линия между смещёнными узлами (ux/uy из nodal_displacements)
 *
 * Стиль: красная пунктирная линия (4 4) поверх исходной схемы.
 */
export default function DeformedShape({
  model,
  result,
  diagramScale,
  toScreenX,
  toScreenY,
}: {
  model: FrameModel;
  result: SolverResponse;
  diagramScale: number;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
}) {
  const dispMap = new Map(
    (result.nodal_displacements || []).map((d) => [d.node_id, d]),
  );

  return (
    <>
      {model.elements.map((el) => {
        const a = model.nodes.find((n) => n.id === el.node_start);
        const b = model.nodes.find((n) => n.id === el.node_end);
        if (!a || !b) return null;
        const er = result.elements.find((e) => e.element_id === el.id);

        const dx = b.coords[0] - a.coords[0];
        const dy = b.coords[1] - a.coords[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-9) return null;
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;

        // Точная кривая прогиба по эпюре uy_local
        if (er && er.diagrams.uy_local && er.diagrams.uy_local.length > 0) {
          const uy_local = er.diagrams.uy_local;
          const ux_local = er.diagrams.ux_local || uy_local.map(() => 0);
          const xs = er.diagrams.x;
          const maxAbs = Math.max(
            1e-12,
            ...uy_local.map((v) => Math.abs(v)),
            ...ux_local.map((v) => Math.abs(v)),
          );
          // авто-масштаб + пользовательский diagramScale
          const autoK = (0.15 * len) / maxAbs;
          const k = autoK * diagramScale;
          const points = xs.map((x, i) => {
            const t = x / len;
            const wx0 = a.coords[0] + dx * t;
            const wy0 = a.coords[1] + dy * t;
            const wx = wx0 + ux * ux_local[i] * k + nx * uy_local[i] * k;
            const wy = wy0 + uy * ux_local[i] * k + ny * uy_local[i] * k;
            return `${toScreenX(wx)},${toScreenY(wy)}`;
          });
          return (
            <polyline
              key={`def${el.id}`}
              points={points.join(" ")}
              fill="none"
              stroke={ACCENT}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          );
        }

        // fallback: прямая линия между смещёнными концами узлов
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
    </>
  );
}
