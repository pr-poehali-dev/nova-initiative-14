/**
 * CanvasOverlays — сборочный компонент SVG-наложений на канвасе.
 * Рисует поверх балок: опоры, нагрузки, реакции и узлы.
 *
 * Логика разбита на 3 подкомпонента и общий хелпер-модуль:
 *   - CanvasBoundaryConditions  — опоры по ГОСТ 2.770
 *   - CanvasLoads               — нагрузки (F, q, M, точечная P)
 *   - CanvasReactionsAndNodes   — реакции опор, узлы, курсор, легенда
 *   - canvas-overlays-helpers   — REACTION, arrowFromPoint, makeMakeDraggableText
 *
 * Порядок отрисовки сохранён: КГУ → нагрузки → реакции → узлы → курсор → легенда.
 */
import type {
  FrameModel,
  ModelNode,
  SolverResponse,
} from "@/lib/cae-model";
import type { LabelOffsetsApi } from "@/pages/cae-editor/useLabelOffsets";
import CanvasBoundaryConditions from "./CanvasBoundaryConditions";
import CanvasLoads from "./CanvasLoads";
import CanvasReactionsAndNodes from "./CanvasReactionsAndNodes";
import { makeMakeDraggableText } from "./canvas-overlays-helpers";

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
  showReactions?: boolean;
  arrowScale?: number;
  fontScale?: number;
  labelOffsets?: LabelOffsetsApi;
  svgRef?: React.RefObject<SVGSVGElement>;
}

const CanvasOverlays = ({
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
  showReactions = true,
  arrowScale = 1,
  fontScale = 1,
  labelOffsets,
  svgRef,
}: Props) => {
  const makeDraggableText = makeMakeDraggableText(labelOffsets, svgRef);

  return (
    <>
      {/* КГУ */}
      <CanvasBoundaryConditions
        model={model}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
      />

      {/* нагрузки */}
      <CanvasLoads
        model={model}
        pxPerM={pxPerM}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        arrowScale={arrowScale}
        fontScale={fontScale}
        makeDraggableText={makeDraggableText}
      />

      {/* реакции опор, узлы, курсор и легенда */}
      <CanvasReactionsAndNodes
        model={model}
        selectedNodeIds={selectedNodeIds}
        pendingFirstNodeId={pendingFirstNodeId}
        cursorWorld={cursorWorld}
        size={size}
        pxPerM={pxPerM}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        handleNodeClick={handleNodeClick}
        handleNodePointerDown={handleNodePointerDown}
        result={result}
        showReactions={showReactions}
        arrowScale={arrowScale}
        fontScale={fontScale}
        makeDraggableText={makeDraggableText}
      />
    </>
  );
};

export default CanvasOverlays;