/**
 * 2D-канва для рисования рамы (SVG).
 * Поддерживает:
 *  - pan (правая кнопка / средняя / Space + drag)
 *  - zoom (колесо мыши)
 *  - сетку со snap
 *  - режимы: select / draw-node / draw-element / bc / load
 *  - визуализацию узлов, элементов, КГУ, нагрузок
 *  - наложение деформированной схемы и эпюр после расчёта
 */
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type {
  FrameModel,
  ModelNode,
  ModelElement,
  SolverResponse,
} from "@/lib/cae-model";
import { NODE_R, BG } from "./canvas/canvas-constants";
import CanvasGrid from "./canvas/CanvasGrid";
import CanvasElements from "./canvas/CanvasElements";
import CanvasDiagrams from "./canvas/CanvasDiagrams";
import CanvasOverlays from "./canvas/CanvasOverlays";

export type EditorMode =
  | "select"
  | "draw-node"
  | "draw-element"
  | "bc"
  | "load-nodal"
  | "load-distributed";

export type DiagramKind = "none" | "deformed" | "N" | "Qy" | "Mz" | "sigma";

interface Props {
  model: FrameModel;
  setModel: (m: FrameModel) => void;
  mode: EditorMode;
  gridStep: number; // м
  selectedNodeId: string | null;
  selectedElementId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectElement: (id: string | null) => void;
  onCanvasClick: (worldX: number, worldY: number) => void;
  result: SolverResponse | null;
  showDiagram: DiagramKind;
  diagramScale: number;
}

interface ViewState {
  // мировые координаты центра + масштаб (px/м)
  cx: number;
  cy: number;
  pxPerM: number;
}

function snap(v: number, step: number) {
  return Math.round(v / step) * step;
}

const FrameCanvas = ({
  model,
  setModel,
  mode,
  gridStep,
  selectedNodeId,
  selectedElementId,
  onSelectNode,
  onSelectElement,
  onCanvasClick,
  result,
  showDiagram,
  diagramScale,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [view, setView] = useState<ViewState>({ cx: 2, cy: 1, pxPerM: 80 });
  const [panning, setPanning] = useState<{ x: number; y: number } | null>(null);
  const [pendingFirstNodeId, setPendingFirstNodeId] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);

  // Resize observer
  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, []);

  // Координатные функции (мировые в м → экранные в px)
  const toScreenX = (x: number) => size.w / 2 + (x - view.cx) * view.pxPerM;
  // ось Y инвертирована: вверх в мире = вверх на экране
  const toScreenY = (y: number) => size.h / 2 - (y - view.cy) * view.pxPerM;
  const toWorld = (sx: number, sy: number) => ({
    x: view.cx + (sx - size.w / 2) / view.pxPerM,
    y: view.cy - (sy - size.h / 2) / view.pxPerM,
  });

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldBefore = toWorld(mx, my);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newPx = Math.max(20, Math.min(500, view.pxPerM * factor));
    // сохраняем позицию мира под курсором
    const newCx = worldBefore.x - (mx - size.w / 2) / newPx;
    const newCy = worldBefore.y + (my - size.h / 2) / newPx;
    setView({ cx: newCx, cy: newCy, pxPerM: newPx });
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    // средняя/правая кнопка или с shift — pan
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      setPanning({ x: sx, y: sy });
      svgRef.current!.setPointerCapture(e.pointerId);
      return;
    }
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = toWorld(sx, sy);
    setCursorWorld(w);
    if (panning) {
      const dx = (sx - panning.x) / view.pxPerM;
      const dy = (sy - panning.y) / view.pxPerM;
      setView((v) => ({ ...v, cx: v.cx - dx, cy: v.cy + dy }));
      setPanning({ x: sx, y: sy });
    }
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (panning) {
      setPanning(null);
      try {
        svgRef.current!.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (panning) return;
    if (e.shiftKey) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = toWorld(sx, sy);
    const sx_ = snap(w.x, gridStep);
    const sy_ = snap(w.y, gridStep);
    onCanvasClick(sx_, sy_);
  };

  // === Поиск узла под курсором (для draw-element / select) ===
   
  const nodeAt = (worldX: number, worldY: number): ModelNode | null => {
    const r = (NODE_R + 4) / view.pxPerM;
    for (const n of model.nodes) {
      const dx = n.coords[0] - worldX;
      const dy = n.coords[1] - worldY;
      if (Math.sqrt(dx * dx + dy * dy) <= r) return n;
    }
    return null;
  };

  const handleNodeClick = (n: ModelNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "draw-element") {
      if (!pendingFirstNodeId) {
        setPendingFirstNodeId(n.id);
      } else if (pendingFirstNodeId !== n.id) {
        const exists = model.elements.some(
          (el) =>
            (el.node_start === pendingFirstNodeId && el.node_end === n.id) ||
            (el.node_start === n.id && el.node_end === pendingFirstNodeId),
        );
        if (!exists) {
          const newEl: ModelElement = {
            id: `e${model.elements.length + 1}`,
            node_start: pendingFirstNodeId,
            node_end: n.id,
            material_id: model.materials[0]?.id || "steel",
            section_id: model.sections[0]?.id || "i20",
          };
          setModel({ ...model, elements: [...model.elements, newEl] });
        }
        setPendingFirstNodeId(null);
      } else {
        setPendingFirstNodeId(null);
      }
      return;
    }
    onSelectNode(n.id);
    onSelectElement(null);
  };

  const handleElementClick = (el: ModelElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "draw-element") return;
    onSelectElement(el.id);
    onSelectNode(null);
  };

  return (
    <svg
      ref={svgRef}
      className="w-full h-full select-none"
      style={{
        background: BG,
        cursor: panning ? "grabbing" : mode === "draw-node" ? "crosshair" : "default",
        touchAction: "none",
      }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
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

      <CanvasElements
        model={model}
        selectedElementId={selectedElementId}
        result={result}
        showDiagram={showDiagram}
        diagramScale={diagramScale}
        mode={mode}
        pendingFirstNodeId={pendingFirstNodeId}
        cursorWorld={cursorWorld}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        handleElementClick={handleElementClick}
      />

      <CanvasDiagrams
        model={model}
        result={result}
        showDiagram={showDiagram}
        diagramScale={diagramScale}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
      />

      <CanvasOverlays
        model={model}
        selectedNodeId={selectedNodeId}
        pendingFirstNodeId={pendingFirstNodeId}
        cursorWorld={cursorWorld}
        size={size}
        pxPerM={view.pxPerM}
        toScreenX={toScreenX}
        toScreenY={toScreenY}
        handleNodeClick={handleNodeClick}
      />
    </svg>
  );
};

export default FrameCanvas;
