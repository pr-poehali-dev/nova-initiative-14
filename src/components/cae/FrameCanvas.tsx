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
import { useEffect, useRef, useState, type PointerEvent } from "react";
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
import CanvasDiagramTooltip from "./canvas/CanvasDiagramTooltip";
import CanvasDimensions from "./canvas/CanvasDimensions";

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
  selectedNodeIds,
  selectedElementIds,
  onSelectNodes,
  onSelectElements,
  onCanvasClick,
  onMoveNode,
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
  /** Drag узла: {nodeId, сколько пикселей проехали (для отличия от обычного клика)} */
  const [draggingNode, setDraggingNode] = useState<{ id: string; movedPx: number } | null>(null);
  /**
   * Активные касания пальцами на канве (для touch-жестов).
   * При 1 пальце — pan, при 2 — pinch-zoom. Ключ — pointerId, значение — координаты.
   */
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
  /** Дистанция между двумя пальцами на старте pinch — для расчёта коэффициента зума. */
  const pinchStart = useRef<{ dist: number; pxPerM: number; cx: number; cy: number; midX: number; midY: number } | null>(null);
  /** Длительность нажатия пальца — для отличения tap от долгого нажатия для pan. */
  const touchStartTime = useRef<number>(0);

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

  // Нативный wheel-listener с { passive: false } — иначе браузер игнорирует preventDefault
  // и страница продолжает скроллиться при зуме канвы.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Считаем worldBefore по актуальному view через функциональный setState
      setView((v) => {
        const worldBeforeX = v.cx + (mx - size.w / 2) / v.pxPerM;
        const worldBeforeY = v.cy - (my - size.h / 2) / v.pxPerM;
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const newPx = Math.max(20, Math.min(500, v.pxPerM * factor));
        const newCx = worldBeforeX - (mx - size.w / 2) / newPx;
        const newCy = worldBeforeY + (my - size.h / 2) / newPx;
        return { cx: newCx, cy: newCy, pxPerM: newPx };
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [size.w, size.h]);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // ── Touch-обработка: добавляем палец в активные ──
    if (e.pointerType === "touch") {
      activeTouches.current.set(e.pointerId, { x: sx, y: sy });
      touchStartTime.current = Date.now();
      // Если стало 2 пальца — стартуем pinch-zoom
      if (activeTouches.current.size === 2) {
        const pts = Array.from(activeTouches.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        pinchStart.current = {
          dist,
          pxPerM: view.pxPerM,
          cx: view.cx,
          cy: view.cy,
          midX,
          midY,
        };
        // Сбрасываем pan и drag, если они были начаты одним пальцем
        setPanning(null);
        setDraggingNode(null);
      }
      // Если палец один — готовим возможный pan (но не активируем сразу,
      // чтобы не блокировать tap по узлу/элементу)
      return;
    }

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

    // ── Touch: обновляем позицию активного пальца ──
    if (e.pointerType === "touch" && activeTouches.current.has(e.pointerId)) {
      activeTouches.current.set(e.pointerId, { x: sx, y: sy });

      // Pinch-zoom (2 пальца) — приоритетнее pan
      if (activeTouches.current.size === 2 && pinchStart.current) {
        const pts = Array.from(activeTouches.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const factor = dist / pinchStart.current.dist;
        const newPx = Math.max(20, Math.min(500, pinchStart.current.pxPerM * factor));
        // Зум вокруг точки между пальцами на старте
        const { midX, midY, cx, cy, pxPerM } = pinchStart.current;
        const worldBeforeX = cx + (midX - size.w / 2) / pxPerM;
        const worldBeforeY = cy - (midY - size.h / 2) / pxPerM;
        const newCx = worldBeforeX - (midX - size.w / 2) / newPx;
        const newCy = worldBeforeY + (midY - size.h / 2) / newPx;
        setView({ cx: newCx, cy: newCy, pxPerM: newPx });
        return;
      }

      // 1 палец — pan канвы. Активируем только если палец заметно сдвинулся,
      // чтобы не мешать обычным тапам.
      if (activeTouches.current.size === 1 && !draggingNode) {
        if (!panning) {
          // Стартуем pan, если сдвиг > 6 px (за защитой tap)
          const first = Array.from(activeTouches.current.values())[0];
          // first — это текущая позиция, не стартовая. Поэтому используем deltaX/Y из события.
          const moveDist = Math.abs(e.movementX) + Math.abs(e.movementY);
          if (moveDist > 6 || Date.now() - touchStartTime.current > 150) {
            setPanning({ x: first.x, y: first.y });
            try {
              svgRef.current!.setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }
        } else {
          const dx = (sx - panning.x) / view.pxPerM;
          const dy = (sy - panning.y) / view.pxPerM;
          setView((v) => ({ ...v, cx: v.cx - dx, cy: v.cy + dy }));
          setPanning({ x: sx, y: sy });
        }
        return;
      }
    }

    if (panning) {
      const dx = (sx - panning.x) / view.pxPerM;
      const dy = (sy - panning.y) / view.pxPerM;
      setView((v) => ({ ...v, cx: v.cx - dx, cy: v.cy + dy }));
      setPanning({ x: sx, y: sy });
      return;
    }
    if (draggingNode && onMoveNode) {
      const snappedX = snap(w.x, gridStep);
      const snappedY = snap(w.y, gridStep);
      onMoveNode(draggingNode.id, snappedX, snappedY);
      // Считаем сколько проехали — чтобы отличить «случайный сдвиг» от настоящего drag
      const movedPx = draggingNode.movedPx + Math.abs(e.movementX) + Math.abs(e.movementY);
      setDraggingNode({ id: draggingNode.id, movedPx });
    }
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    // ── Touch: убираем палец из активных ──
    if (e.pointerType === "touch") {
      activeTouches.current.delete(e.pointerId);
      if (activeTouches.current.size < 2) {
        pinchStart.current = null;
      }
      // Если pan был активирован touch'ем — закрываем его
      if (panning && activeTouches.current.size === 0) {
        const wasPan = true; // если pan был активен — подавим обычный клик
        setPanning(null);
        try {
          svgRef.current!.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        if (wasPan) {
          suppressNextClick.current = true;
        }
        return;
      }
    }

    if (panning) {
      setPanning(null);
      try {
        svgRef.current!.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (draggingNode) {
      const wasDrag = draggingNode.movedPx > 3;
      setDraggingNode(null);
      try {
        svgRef.current!.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      // если только нажали без движения — оставляем как обычный клик (выбор уже сработал в pointerDown)
      if (wasDrag) {
        // подавим следующий клик
        suppressNextClick.current = true;
      }
      return;
    }
  };

  /** Touch cancel — например, если ОС перехватила жест. Чистим активные касания. */
  const onPointerCancel = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      activeTouches.current.delete(e.pointerId);
      if (activeTouches.current.size < 2) {
        pinchStart.current = null;
      }
      if (activeTouches.current.size === 0) {
        setPanning(null);
      }
    }
  };

  /** Флаг подавления следующего onClick на SVG (после drag/multiselect, чтобы не создать узел) */
  const suppressNextClick = useRef(false);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (panning) return;
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    if (e.shiftKey) {
      // Shift+клик в пустоту — снимаем выделение всё
      onSelectNodes([]);
      onSelectElements([]);
      return;
    }
    // В режиме select клик в пустоту — снять выделение, без создания узла
    if (mode === "select") {
      onSelectNodes([]);
      onSelectElements([]);
      return;
    }
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
    // Multi-select: Shift = добавить/убрать, обычный клик = выбрать только этот
    if (e.shiftKey) {
      const already = selectedNodeIds.includes(n.id);
      const next = already
        ? selectedNodeIds.filter((x) => x !== n.id)
        : [...selectedNodeIds, n.id];
      onSelectNodes(next);
    } else {
      onSelectNodes([n.id]);
      onSelectElements([]);
    }
    suppressNextClick.current = true;
  };

  /** Старт drag узла: pointer-down на узле в режиме select без Shift */
  const handleNodePointerDown = (n: ModelNode, e: React.PointerEvent) => {
    if (mode !== "select" || e.shiftKey || e.button !== 0) return;
    if (!onMoveNode) return;
    e.stopPropagation();
    setDraggingNode({ id: n.id, movedPx: 0 });
    // Выделяем узел при начале drag
    if (!selectedNodeIds.includes(n.id)) {
      onSelectNodes([n.id]);
      onSelectElements([]);
    }
    try {
      svgRef.current!.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleElementClick = (el: ModelElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "draw-element") return;
    if (e.shiftKey) {
      const already = selectedElementIds.includes(el.id);
      const next = already
        ? selectedElementIds.filter((x) => x !== el.id)
        : [...selectedElementIds, el.id];
      onSelectElements(next);
    } else {
      onSelectElements([el.id]);
      onSelectNodes([]);
    }
    suppressNextClick.current = true;
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