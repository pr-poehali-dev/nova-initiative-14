/**
 * Слой нагрузок на канве CAE — диспетчер по типу нагрузки.
 *
 * Рендеринг по типам вынесен в loads/:
 *   - NodalLoad        — узловая сила Fx/Fy + момент Mz (круговая стрелка)
 *   - InSpanLoad       — точечная сила в пролёте элемента
 *   - DistributedLoad  — равномерно-распределённая нагрузка q (гребёнка)
 *
 * Все рендеры — pure-функции, принимают `makeDraggableText` для перетаскиваемых подписей.
 */
import type { FrameModel } from "@/lib/cae-model";
import type { DraggableTextFactory } from "./canvas-overlays-helpers";
import { renderNodalLoad } from "./loads/NodalLoad";
import { renderInSpanLoad } from "./loads/InSpanLoad";
import { renderDistributedLoad } from "./loads/DistributedLoad";

interface Props {
  model: FrameModel;
  pxPerM: number;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  arrowScale: number;
  fontScale: number;
  makeDraggableText: DraggableTextFactory;
}

const CanvasLoads = ({
  model,
  pxPerM,
  toScreenX,
  toScreenY,
  arrowScale,
  fontScale,
  makeDraggableText,
}: Props) => {
  return (
    <>
      {model.loads.map((ld) => {
        if (ld.type === "nodal_force") {
          return renderNodalLoad(ld, model, toScreenX, toScreenY, arrowScale, fontScale, makeDraggableText);
        }
        if (ld.type === "in_span_point") {
          return renderInSpanLoad(ld, model, toScreenX, toScreenY, arrowScale, fontScale, makeDraggableText);
        }
        if (ld.type === "distributed_uniform") {
          return renderDistributedLoad(
            ld,
            model,
            pxPerM,
            toScreenX,
            toScreenY,
            arrowScale,
            fontScale,
            makeDraggableText,
          );
        }
        return null;
      })}
    </>
  );
};

export default CanvasLoads;
