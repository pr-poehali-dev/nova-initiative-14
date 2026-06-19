/**
 * Хук: обработка pointer/touch-событий на SVG-канве.
 * Содержит: pan (мышь / один палец), pinch-zoom (два пальца), drag узла,
 * handleSvgClick (с подавлением после drag/pan), onPointerCancel/onPointerLeave.
 * Не содержит логики выбора узлов/элементов — это в useCanvasInteractions.
 *
 * Хелпер snap и контейнер ref'ов touch-жестов вынесены в ./pointer-helpers
 * без изменения поведения.
 */
import { useRef, useState, type PointerEvent } from "react";
import type { EditorMode } from "@/components/cae/FrameCanvas";
import type { ViewState } from "./useCanvasView";
import { snap, useTouchGestures } from "./pointer-helpers";
import { DRAG_THRESHOLD_PX } from "./interactions-shared";

interface Params {
  svgRef: React.RefObject<SVGSVGElement>;
  size: { w: number; h: number };
  view: ViewState;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
  toWorld: (sx: number, sy: number) => { x: number; y: number };
  mode: EditorMode;
  gridStep: number;
  onMoveNode?: (nodeId: string, x: number, y: number) => void;
  onSelectNodes: (ids: string[]) => void;
  onSelectElements: (ids: string[]) => void;
  onCanvasClick: (worldX: number, worldY: number) => void;
}

export interface CanvasPointerResult {
  panning: { x: number; y: number } | null;
  draggingNode: { id: string; movedPx: number } | null;
  setDraggingNode: React.Dispatch<React.SetStateAction<{ id: string; movedPx: number } | null>>;
  suppressNextClick: React.MutableRefObject<boolean>;
  cursorWorld: { x: number; y: number } | null;
  setCursorWorld: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  onPointerDown: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: (e: PointerEvent<SVGSVGElement>) => void;
  handleSvgClick: (e: React.MouseEvent<SVGSVGElement>) => void;
}

export function useCanvasPointer({
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
}: Params): CanvasPointerResult {
  const [panning, setPanning] = useState<{ x: number; y: number } | null>(null);
  const [draggingNode, setDraggingNode] = useState<{ id: string; movedPx: number } | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);

  // Контейнер ref'ов touch-жестов (activeTouches / pinchStart / touchStartTime).
  const { activeTouches, pinchStart, touchStartTime } = useTouchGestures();
  /** Флаг подавления следующего onClick на SVG (после drag/multiselect, чтобы не создать узел) */
  const suppressNextClick = useRef(false);

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
      // Для middle-click важно — иначе Chrome/Firefox запустят свой
      // «autoscroll-mode» с курсором-якорем поверх нашего pan'а.
      e.preventDefault();
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

      // 1 палец на узле-кандидате — перетаскиваем узел, но только после
      // заметного сдвига (порог). Пока сдвиг мал — это tap (выбор узла).
      if (activeTouches.current.size === 1 && draggingNode && onMoveNode) {
        const movedPx = draggingNode.movedPx + Math.abs(e.movementX) + Math.abs(e.movementY);
        if (movedPx > DRAG_THRESHOLD_PX) {
          const snappedX = snap(w.x, gridStep);
          const snappedY = snap(w.y, gridStep);
          onMoveNode(draggingNode.id, snappedX, snappedY);
        }
        setDraggingNode({ id: draggingNode.id, movedPx });
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
      // Считаем сколько проехали — чтобы отличить клик от настоящего drag.
      const movedPx = draggingNode.movedPx + Math.abs(e.movementX) + Math.abs(e.movementY);
      // Двигаем узел только после преодоления порога. Пока сдвиг мал —
      // это клик (выбор), узел не сдвигаем.
      if (movedPx > DRAG_THRESHOLD_PX) {
        const snappedX = snap(w.x, gridStep);
        const snappedY = snap(w.y, gridStep);
        onMoveNode(draggingNode.id, snappedX, snappedY);
      }
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
      const wasRealDrag = draggingNode.movedPx > DRAG_THRESHOLD_PX;
      const isTouch = e.pointerType === "touch";
      setDraggingNode(null);
      try {
        svgRef.current!.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (wasRealDrag) {
        // Это было настоящее перетаскивание: узел уже на новом месте.
        // Снимаем выделение, чтобы узел не оставался подсвеченным «висящим».
        onSelectNodes([]);
        onSelectElements([]);
        // Подавляем последующий click, иначе handleSvgClick/handleNodeClick
        // переоткроют выбор или создадут узел.
        suppressNextClick.current = true;
      } else if (isTouch) {
        // Чистый тап пальцем: capture не делали — click дойдёт до узла и
        // handleNodeClick сам выделит его. Ничего не подавляем.
      } else {
        // Чистый клик мышью: указатель был захвачен, поэтому click уйдёт на
        // SVG. Выбор узла уже сделан в pointerDown — подавляем click, чтобы
        // handleSvgClick не сбросил его.
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

  return {
    panning,
    draggingNode,
    setDraggingNode,
    suppressNextClick,
    cursorWorld,
    setCursorWorld,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    handleSvgClick,
  };
}