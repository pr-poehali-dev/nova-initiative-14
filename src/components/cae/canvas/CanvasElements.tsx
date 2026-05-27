/**
 * Слой стержней на канве CAE — композиция подкомпонентов:
 *   - ElementLines           — видимые линии + невидимая зона клика (14 px)
 *   - ElementLabels          — подписи e1, e2 … (с белой плашкой, перетаскиваемые)
 *   - ElementHinges          — белые кружки шарниров на концах стержней
 *   - DeformedShape          — пунктирная кривая прогиба (если showDiagram="deformed")
 *   - DrawElementPreview     — preview от первого узла до курсора в режиме draw-element
 */
import type { FrameModel, ModelElement, SolverResponse } from "@/lib/cae-model";
import type { LabelOffsetsApi } from "@/pages/cae-editor/useLabelOffsets";
import ElementLines from "./elements/ElementLines";
import ElementLabels from "./elements/ElementLabels";
import ElementHinges from "./elements/ElementHinges";
import DeformedShape from "./elements/DeformedShape";
import DrawElementPreview from "./elements/DrawElementPreview";

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
  handleElementContextMenu?: (el: ModelElement, e: React.MouseEvent) => void;
  handleElementPointerDown?: (el: ModelElement, e: React.PointerEvent) => void;
  fontScale?: number;
  labelOffsets?: LabelOffsetsApi;
  svgRef?: React.RefObject<SVGSVGElement>;
}

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
  handleElementContextMenu,
  handleElementPointerDown,
  fontScale = 1,
  labelOffsets,
  svgRef,
}: Props) => {
  const renderDeformed = showDiagram === "deformed" && result;

  return (
    <>
      <ElementLines
        model={model}
        selectedElementIds={selectedElementIds}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        handleElementClick={handleElementClick}
        handleElementContextMenu={handleElementContextMenu}
        handleElementPointerDown={handleElementPointerDown}
      />

      <ElementLabels
        model={model}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        fontScale={fontScale}
        labelOffsets={labelOffsets}
        svgRef={svgRef}
      />

      <ElementHinges model={model} toScreenX={toScreenX} toScreenY={toScreenY} />

      {renderDeformed && result && (
        <DeformedShape
          model={model}
          result={result}
          diagramScale={diagramScale}
          toScreenX={toScreenX}
          toScreenY={toScreenY}
        />
      )}

      {mode === "draw-element" && pendingFirstNodeId && cursorWorld && (
        <DrawElementPreview
          model={model}
          pendingFirstNodeId={pendingFirstNodeId}
          cursorWorld={cursorWorld}
          toScreenX={toScreenX}
          toScreenY={toScreenY}
        />
      )}
    </>
  );
};

export default CanvasElements;