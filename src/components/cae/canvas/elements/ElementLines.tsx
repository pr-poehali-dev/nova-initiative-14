import { useState } from "react";
import type { FrameModel, ModelElement } from "@/lib/cae-model";
import { ACCENT, LINE, ELEMENT_W } from "../canvas-constants";

/**
 * Линии стержней: видимая (тонкая) + невидимая широкая зона клика (14 px).
 * Подсветка при наведении, акцент при выборе. Подписи и шарниры — в отдельных компонентах.
 */
const HIT_AREA_WIDTH = 14;

export default function ElementLines({
  model,
  selectedElementIds,
  toScreenX,
  toScreenY,
  handleElementClick,
  handleElementContextMenu,
  handleElementPointerDown,
}: {
  model: FrameModel;
  selectedElementIds: string[];
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  handleElementClick: (el: ModelElement, e: React.MouseEvent) => void;
  handleElementContextMenu?: (el: ModelElement, e: React.MouseEvent) => void;
  handleElementPointerDown?: (el: ModelElement, e: React.PointerEvent) => void;
}) {
  const selSet = new Set(selectedElementIds);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {model.elements.map((el) => {
        const a = model.nodes.find((n) => n.id === el.node_start);
        const b = model.nodes.find((n) => n.id === el.node_end);
        if (!a || !b) return null;
        const isSel = selSet.has(el.id);
        const isHover = hoveredId === el.id && !isSel;
        const x1 = toScreenX(a.coords[0]);
        const y1 = toScreenY(a.coords[1]);
        const x2 = toScreenX(b.coords[0]);
        const y2 = toScreenY(b.coords[1]);
        const stroke = isSel ? ACCENT : isHover ? ACCENT : LINE;
        const width = isSel ? ELEMENT_W + 1.5 : isHover ? ELEMENT_W + 1 : ELEMENT_W;
        return (
          <g key={el.id}>
            {/* Видимая линия балки */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={width}
              opacity={isHover ? 0.85 : 1}
              pointerEvents="none"
            />
            {/* Широкая невидимая зона клика. Принимает все события мыши вместо тонкой линии. */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="transparent"
              strokeWidth={HIT_AREA_WIDTH}
              strokeLinecap="round"
              style={{ cursor: "pointer" }}
              onClick={(e) => handleElementClick(el, e)}
              onContextMenu={handleElementContextMenu ? (e) => handleElementContextMenu(el, e) : undefined}
              onPointerDown={handleElementPointerDown ? (e) => handleElementPointerDown(el, e) : undefined}
              onPointerEnter={() => setHoveredId(el.id)}
              onPointerLeave={() => setHoveredId((prev) => (prev === el.id ? null : prev))}
            />
          </g>
        );
      })}
    </>
  );
}