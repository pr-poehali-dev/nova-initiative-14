/**
 * Хук: логика взаимодействия с объектами на канве.
 * Содержит: nodeAt (поиск узла под курсором), handleNodeClick (выбор / draw-element),
 * handleNodePointerDown (старт drag + long-press для контекста),
 * handleElementClick (выбор элемента), handleNodeContextMenu / handleElementContextMenu
 * (правый клик / long-press → открывает popup со свойствами),
 * pendingFirstNodeId (для режима draw-element).
 */
import { useEffect, useRef, useState } from "react";
import type { FrameModel, ModelNode, ModelElement } from "@/lib/cae-model";
import type { EditorMode } from "@/components/cae/FrameCanvas";
import { NODE_R } from "./canvas-constants";

/** Цель открытия контекстного popup'а свойств. */
export interface ContextRequest {
  kind: "node" | "element";
  id: string;
  clientX: number;
  clientY: number;
}

interface Params {
  svgRef: React.RefObject<SVGSVGElement>;
  model: FrameModel;
  setModel: (m: FrameModel) => void;
  mode: EditorMode;
  selectedNodeIds: string[];
  selectedElementIds: string[];
  onSelectNodes: (ids: string[]) => void;
  onSelectElements: (ids: string[]) => void;
  onMoveNode?: (nodeId: string, x: number, y: number) => void;
  pxPerM: number;
  suppressNextClick: React.MutableRefObject<boolean>;
  setDraggingNode: React.Dispatch<React.SetStateAction<{ id: string; movedPx: number } | null>>;
  elementLimit?: number;
  /**
   * Запрос на открытие контекстного popup'а со свойствами.
   * Срабатывает на правый клик (desktop) или long-press 500мс (mobile).
   */
  onRequestContext?: (req: ContextRequest) => void;
}

export interface CanvasInteractionsResult {
  pendingFirstNodeId: string | null;
  nodeAt: (worldX: number, worldY: number) => ModelNode | null;
  handleNodeClick: (n: ModelNode, e: React.MouseEvent) => void;
  handleNodePointerDown: (n: ModelNode, e: React.PointerEvent) => void;
  handleElementClick: (el: ModelElement, e: React.MouseEvent) => void;
  handleNodeContextMenu: (n: ModelNode, e: React.MouseEvent) => void;
  handleElementContextMenu: (el: ModelElement, e: React.MouseEvent) => void;
  handleElementPointerDown: (el: ModelElement, e: React.PointerEvent) => void;
}

/** Длительность long-press для открытия контекстного попапа на мобиле. */
const LONG_PRESS_MS = 500;
/** Допустимый сдвиг пальца, при котором long-press ещё считается «удержанием». */
const LONG_PRESS_TOLERANCE_PX = 8;

export function useCanvasInteractions({
  svgRef,
  model,
  setModel,
  mode,
  selectedNodeIds,
  selectedElementIds,
  onSelectNodes,
  onSelectElements,
  onMoveNode,
  pxPerM,
  suppressNextClick,
  setDraggingNode,
  elementLimit,
  onRequestContext,
}: Params): CanvasInteractionsResult {
  const [pendingFirstNodeId, setPendingFirstNodeId] = useState<string | null>(null);

  /**
   * Long-press для мобилы: при нажатии пальцем на узел/элемент стартуем таймер,
   * если за 500мс палец не двинулся и не отпущен — открываем контекстный popup.
   * Хранится в ref'е чтобы можно было отменить из move/up хендлеров.
   */
  const longPressTimer = useRef<number | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  };

  const startLongPress = (
    kind: "node" | "element",
    id: string,
    clientX: number,
    clientY: number,
  ) => {
    cancelLongPress();
    longPressStart.current = { x: clientX, y: clientY };
    longPressTimer.current = window.setTimeout(() => {
      // Сбрасываем drag и подавляем последующий click — пользователь
      // удержал палец, чтобы открыть свойства, а не выделить/нарисовать.
      setDraggingNode(null);
      suppressNextClick.current = true;
      onRequestContext?.({ kind, id, clientX, clientY });
      longPressTimer.current = null;
    }, LONG_PRESS_MS);
  };

  /**
   * Глобально слушаем pointermove/pointerup чтобы отменять long-press
   * если палец сдвинулся (значит юзер хочет pan'нуть или перетащить узел).
   */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!longPressStart.current) return;
      const dx = Math.abs(e.clientX - longPressStart.current.x);
      const dy = Math.abs(e.clientY - longPressStart.current.y);
      if (dx + dy > LONG_PRESS_TOLERANCE_PX) {
        cancelLongPress();
      }
    };
    const onUp = () => cancelLongPress();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);



  // === Поиск узла под курсором (для draw-element / select) ===
  const nodeAt = (worldX: number, worldY: number): ModelNode | null => {
    const r = (NODE_R + 4) / pxPerM;
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
          if (elementLimit !== undefined && model.elements.length >= elementLimit) {
            setPendingFirstNodeId(null);
            return;
          }
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

  /** Старт drag узла: pointer-down на узле в режиме select без Shift.
   *  Также стартует таймер long-press для touch — через 500мс откроется
   *  контекстный popup со свойствами узла. */
  const handleNodePointerDown = (n: ModelNode, e: React.PointerEvent) => {
    // Long-press для тача — работает в ЛЮБОМ режиме, чтобы пользователь мог
    // открыть свойства узла даже находясь в режиме рисования.
    if (e.pointerType === "touch" && onRequestContext) {
      startLongPress("node", n.id, e.clientX, e.clientY);
    }

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

  /** Touch-pointerdown на элементе — стартует long-press, чтобы открыть
   *  контекстный popup. Сам выбор элемента отрабатывает в onClick. */
  const handleElementPointerDown = (el: ModelElement, e: React.PointerEvent) => {
    if (e.pointerType === "touch" && onRequestContext) {
      startLongPress("element", el.id, e.clientX, e.clientY);
    }
  };

  /** Правый клик / context-menu по узлу. */
  const handleNodeContextMenu = (n: ModelNode, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onRequestContext) return;
    // Выделяем узел, чтобы EditorRightPanel в popup'е получил selectedNode.
    onSelectNodes([n.id]);
    onSelectElements([]);
    onRequestContext({ kind: "node", id: n.id, clientX: e.clientX, clientY: e.clientY });
  };

  /** Правый клик / context-menu по элементу. */
  const handleElementContextMenu = (el: ModelElement, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onRequestContext) return;
    onSelectElements([el.id]);
    onSelectNodes([]);
    onRequestContext({ kind: "element", id: el.id, clientX: e.clientX, clientY: e.clientY });
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

  return {
    pendingFirstNodeId,
    nodeAt,
    handleNodeClick,
    handleNodePointerDown,
    handleElementClick,
    handleNodeContextMenu,
    handleElementContextMenu,
    handleElementPointerDown,
  };
}