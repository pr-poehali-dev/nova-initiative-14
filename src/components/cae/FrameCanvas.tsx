/**
 * 2D-канва для рисования рамы (SVG).
 * Поддерживает:
 *  - pan (правая кнопка / средняя / Space + drag)
 *  - zoom (колесо мыши)
 *  - сетку со snap
 *  - режимы: select / draw-node / draw-element / bc / load
 *  - визуализацию узлов, элементов, КГУ, нагрузок
 *  - наложение деформированной схемы и эпюр после расчёта
 *
 * Логика разбита на три хука:
 *  - useCanvasView      — viewport: resize, автофит, wheel-zoom, координаты
 *  - useCanvasPointer   — pointer/touch: pan, pinch, drag, click-suppression
 *  - useCanvasInteractions — выбор узлов/элементов, draw-element, drag-start
 */
import { useEffect } from "react";
import type {
  FrameModel,
  SolverResponse,
} from "@/lib/cae-model";
import type { LabelOffsetsApi } from "@/pages/cae-editor/useLabelOffsets";
import type { ContextRequest } from "./canvas/useCanvasInteractions";

export type { ContextRequest } from "./canvas/useCanvasInteractions";
import { BG } from "./canvas/canvas-constants";
import CanvasGrid from "./canvas/CanvasGrid";
import CanvasElements from "./canvas/CanvasElements";
import CanvasDiagrams from "./canvas/CanvasDiagrams";
import CanvasOverlays from "./canvas/CanvasOverlays";
import CanvasDiagramTooltip from "./canvas/CanvasDiagramTooltip";
import CanvasDimensions from "./canvas/CanvasDimensions";
import { useCanvasView } from "./canvas/useCanvasView";
import { useCanvasPointer } from "./canvas/useCanvasPointer";
import { useCanvasInteractions } from "./canvas/useCanvasInteractions";

export type EditorMode =
  | "select"
  | "draw-node"
  | "draw-element"
  | "bc"
  | "load-nodal"
  | "load-distributed";

export type DiagramKind = "none" | "deformed" | "N" | "Qy" | "Mz" | "sigma" | "uy";

interface Props {
  model: FrameModel;
  setModel: (m: FrameModel) => void;
  mode: EditorMode;
  gridStep: number; // м
  selectedNodeIds: string[];
  selectedElementIds: string[];
  onSelectNodes: (ids: string[]) => void;
  onSelectElements: (ids: string[]) => void;
  onCanvasClick: (worldX: number, worldY: number) => void;
  onMoveNode?: (nodeId: string, x: number, y: number) => void;
  result: SolverResponse | null;
  showDiagram: DiagramKind;
  diagramScale: number;
  /** Внешний триггер для ручного автоподбора масштаба (кнопка «Подогнать»). */
  fitRequestId?: number;
  /** Глобальный множитель размера стрелок (нагрузок и реакций). По умолчанию 1. */
  arrowScale?: number;
  /** Глобальный множитель размера шрифта подписей. По умолчанию 1. */
  fontScale?: number;
  /** API для пользовательских сдвигов подписей (drag-and-drop). */
  labelOffsets?: LabelOffsetsApi;
  /** Максимальное число элементов (демо-режим). При достижении лимита новые не создаются. */
  elementLimit?: number;
  /**
   * Колбэк открытия контекстного popup'а свойств узла/элемента.
   * Срабатывает на правый клик (десктоп) или long-press 500мс (мобиль).
   */
  onRequestContext?: (req: ContextRequest) => void;
}

const FrameCanvas = ({
  model,
  setModel,
  mode,
  gridStep,
  selectedNodeIds,
  selectedElementIds,
  onSelectNodes,
  onSelectElements,
  onCanvasClick,
  onMoveNode,
  result,
  showDiagram,
  diagramScale,
  fitRequestId,
  arrowScale = 1,
  fontScale = 1,
  labelOffsets,
  elementLimit,
  onRequestContext,
}: Props) => {
  // ── Viewport: размер, view, координатные функции ──
  const { svgRef, size, view, setView, toScreenX, toScreenY, toWorld } =
    useCanvasView(model, fitRequestId);

  // ── Pointer/touch: pan, pinch-zoom, drag узла, click ──
  const {
    panning,
    draggingNode,
    setDraggingNode,
    suppressNextClick,
    cursorWorld,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    handleSvgClick,
  } = useCanvasPointer({
    svgRef,
    size,
    view,
    setView,
    toWorld,
    mode,
    gridStep,
    onMoveNode,
    onSelectNodes,
    onSelectElements,
    onCanvasClick,
  });

  // ── Взаимодействие с объектами: выбор, draw-element, drag-start ──
  const {
    pendingFirstNodeId,
    handleNodeClick,
    handleNodePointerDown,
    handleElementClick,
    handleNodeContextMenu,
    handleElementContextMenu,
    handleElementPointerDown,
  } = useCanvasInteractions({
    svgRef,
    model,
    setModel,
    mode,
    selectedNodeIds,
    selectedElementIds,
    onSelectNodes,
    onSelectElements,
    onMoveNode,
    pxPerM: view.pxPerM,
    suppressNextClick,
    setDraggingNode,
    elementLimit,
    onRequestContext,
  });

  // Подавляем встроенный «autoscroll-mode» Chrome/Firefox по middle-click.
  // React-event приходит уже после, поэтому preventDefault там не сработает —
  // нужен native listener в фазе capture.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };
    // auxclick — событие отпускания средней/правой кнопки. Тоже гасим,
    // чтобы не открывалось контекстное меню браузера.
    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("auxclick", onAuxClick);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("auxclick", onAuxClick);
    };
  }, [svgRef]);

  return (
    <svg
      ref={svgRef}
      data-scheme-svg="frame"
      className="w-full h-full select-none"
      style={{
        background: BG,
        cursor: panning ? "grabbing" : mode === "draw-node" ? "crosshair" : "default",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleSvgClick}
    >
      <CanvasGrid
        size={size}
        gridStep={gridStep}
        pxPerM={view.pxPerM}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        toWorld={toWorld}
      />

      <CanvasDimensions
        model={model}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        pxPerM={view.pxPerM}
        fontScale={fontScale}
        labelOffsets={labelOffsets}
        svgRef={svgRef}
      />

      <CanvasElements
        model={model}
        selectedElementIds={selectedElementIds}
        result={result}
        showDiagram={showDiagram}
        diagramScale={diagramScale}
        mode={mode}
        pendingFirstNodeId={pendingFirstNodeId}
        cursorWorld={cursorWorld}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        handleElementClick={handleElementClick}
        handleElementContextMenu={handleElementContextMenu}
        handleElementPointerDown={handleElementPointerDown}
        fontScale={fontScale}
        labelOffsets={labelOffsets}
        svgRef={svgRef}
      />

      <g data-pdf-hide="diagrams">
        <CanvasDiagrams
          model={model}
          result={result}
          showDiagram={showDiagram}
          diagramScale={diagramScale}
          toScreenX={toScreenX}
          toScreenY={toScreenY}
        />
      </g>

      <CanvasOverlays
        model={model}
        selectedNodeIds={selectedNodeIds}
        pendingFirstNodeId={pendingFirstNodeId}
        cursorWorld={cursorWorld}
        result={result}
        size={size}
        pxPerM={view.pxPerM}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        handleNodeClick={handleNodeClick}
        handleNodePointerDown={handleNodePointerDown}
        handleNodeContextMenu={handleNodeContextMenu}
        arrowScale={arrowScale}
        fontScale={fontScale}
        labelOffsets={labelOffsets}
        svgRef={svgRef}
      />

      <CanvasDiagramTooltip
        model={model}
        result={result}
        showDiagram={showDiagram}
        cursorWorld={cursorWorld}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
      />
    </svg>
  );
};

export default FrameCanvas;