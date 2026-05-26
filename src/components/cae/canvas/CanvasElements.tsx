import { useState } from "react";
import type { FrameModel, ModelElement, SolverResponse } from "@/lib/cae-model";
import { ACCENT, LINE, ELEMENT_W } from "./canvas-constants";
import DraggableLabel from "./DraggableLabel";
import type { LabelOffsetsApi } from "@/pages/cae-editor/useLabelOffsets";

interface Props {
  model: FrameModel;
  selectedElementIds: string[];
  result: SolverResponse | null;
  showDiagram: "none" | "deformed" | "N" | "Qy" | "Mz" | "sigma" | "uy";
  diagramScale: number;
  mode: "select" | "draw-node" | "draw-element" | "bc" | "load-nodal" | "load-distributed";
  pendingFirstNodeId: string | null;
  cursorWorld: { x: number; y: number } | null;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  handleElementClick: (el: ModelElement, e: React.MouseEvent) => void;
  fontScale?: number;
  labelOffsets?: LabelOffsetsApi;
  svgRef?: React.RefObject<SVGSVGElement>;
}

// Ширина невидимой зоны клика вокруг балки (px). Стандарт CAD: 12-14 px.
const HIT_AREA_WIDTH = 14;

const CanvasElements = ({
  model,
  selectedElementIds,
  result,
  showDiagram,
  diagramScale,
  mode,
  pendingFirstNodeId,
  cursorWorld,
  toScreenX,
  toScreenY,
  handleElementClick,
  fontScale = 1,
  labelOffsets,
  svgRef,
}: Props) => {
  const selSet = new Set(selectedElementIds);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // === Деформированная схема ===
  const dispMap = new Map(
    (result?.nodal_displacements || []).map((d) => [d.node_id, d]),
  );
  const renderDeformed = showDiagram === "deformed" && result;

  return (
    <>
      {/* Элементы (исходные) — рисуем как группу из двух линий:
          1) видимая тонкая линия — то, что видит пользователь
          2) невидимая широкая (transparent, stroke-width=14) — для удобного попадания мышью.
          Подсветка при наведении — лёгкий цветовой акцент (а при выборе — полная подсветка). */}
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
              onPointerEnter={() => setHoveredId(el.id)}
              onPointerLeave={() => setHoveredId((prev) => (prev === el.id ? null : prev))}
            />
          </g>
        );
      })}

      {/* Подписи стержней (e1, e2, …) — на середине стержня, со смещением по нормали
          так, чтобы не пересекать ось стержня. Чтобы текст был всегда читаемый —
          под подписью рисуем белую плашку. */}
      {model.elements.map((el) => {
        const a = model.nodes.find((n) => n.id === el.node_start);
        const b = model.nodes.find((n) => n.id === el.node_end);
        if (!a || !b) return null;
        const ax = toScreenX(a.coords[0]);
        const ay = toScreenY(a.coords[1]);
        const bx = toScreenX(b.coords[0]);
        const by = toScreenY(b.coords[1]);
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);
        if (len < 24) return null;
        // нормаль "вниз-вправо" в экране (для горизонтальных балок будет ниже линии)
        const nx = dy / len;
        const ny = -dx / len;
        const off = 11;
        const tx = mx + nx * off;
        const ty = my + ny * off;
        const label = el.label || el.id;
        const fs = 10 * fontScale;
        const w = label.length * fs * 0.6 + 6;
        const h = fs + 2;
        const draggable = !!labelOffsets && !!svgRef;
        const inner = (cx: number, cy: number) => (
          <>
            <rect
              x={cx - w / 2}
              y={cy - h / 2}
              width={w}
              height={h}
              fill="#ffffff"
              fillOpacity={0.85}
              rx={2}
            />
            <text
              x={cx}
              y={cy + fs * 0.34}
              fontSize={fs}
              fontFamily="monospace"
              fontWeight="bold"
              fill={LINE}
              textAnchor="middle"
            >
              {label}
            </text>
          </>
        );
        if (!draggable) {
          return (
            <g key={`lbl-${el.id}`} pointerEvents="none">{inner(tx, ty)}</g>
          );
        }
        return (
          <DraggableLabel
            key={`lbl-${el.id}`}
            offsetKey={`elem:${el.id}`}
            baseX={tx}
            baseY={ty}
            labelOffsets={labelOffsets}
            svgRef={svgRef}
          >
            {(x, y) => inner(x, y)}
          </DraggableLabel>
        );
      })}

      {/* Шарниры на концах элементов — белый кружок с обводкой возле узла,
          смещённый на 12 px вдоль оси стержня. Маркер для ферм, шатунов,
          подкосов, балок Гербера. */}
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

      {/* деформированная форма — рисуем через uy_local из эпюр (учитывает прогиб внутри элемента) */}
      {renderDeformed &&
        model.elements.map((el) => {
          const a = model.nodes.find((n) => n.id === el.node_start);
          const b = model.nodes.find((n) => n.id === el.node_end);
          if (!a || !b) return null;
          const er = result?.elements.find((e) => e.element_id === el.id);

          // Автоматический масштаб: подбираем k так, чтобы max прогиб ≈ 15% длины элемента
          const dx = b.coords[0] - a.coords[0];
          const dy = b.coords[1] - a.coords[1];
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1e-9) return null;
          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy;
          const ny = ux;

          // Если есть точки uy_local — рисуем кривую прогиба через них
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
              // ux_local — вдоль оси элемента, uy_local — нормаль
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

          // fallback: старая логика по узлам (если эпюр прогиба нет)
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