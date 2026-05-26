import type { FrameModel } from "@/lib/cae-model";
import { ACCENT } from "../canvas-constants";

/**
 * Preview-линия от выбранного первого узла до позиции курсора —
 * показывается в режиме "draw-element" пока пользователь не кликнул на второй узел.
 */
export default function DrawElementPreview({
  model,
  pendingFirstNodeId,
  cursorWorld,
  toScreenX,
  toScreenY,
}: {
  model: FrameModel;
  pendingFirstNodeId: string;
  cursorWorld: { x: number; y: number };
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
}) {
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
}
