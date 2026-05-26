import type { FrameModel } from "@/lib/cae-model";
import { LINE } from "../canvas-constants";
import DraggableLabel from "../DraggableLabel";
import type { LabelOffsetsApi } from "@/pages/cae-editor/useLabelOffsets";

/**
 * Подписи стержней (e1, e2, …) — на середине стержня, со смещением по нормали
 * чтобы не пересекать ось. Текст накладывается на белую плашку для читаемости.
 * Поддержка перетаскивания через DraggableLabel, если переданы labelOffsets+svgRef.
 */
export default function ElementLabels({
  model,
  toScreenX,
  toScreenY,
  fontScale = 1,
  labelOffsets,
  svgRef,
}: {
  model: FrameModel;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  fontScale?: number;
  labelOffsets?: LabelOffsetsApi;
  svgRef?: React.RefObject<SVGSVGElement>;
}) {
  return (
    <>
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
        // нормаль «вниз-вправо» в экране (для горизонтальных балок будет ниже линии)
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
            <g key={`lbl-${el.id}`} pointerEvents="none">
              {inner(tx, ty)}
            </g>
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
    </>
  );
}
