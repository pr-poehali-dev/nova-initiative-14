/**
 * Хук: логика взаимодействия с объектами на канве.
 * Содержит: nodeAt (поиск узла под курсором), handleNodeClick (выбор / draw-element),
 * handleNodePointerDown (старт drag + long-press для контекста),
 * handleElementClick (выбор элемента), handleNodeContextMenu / handleElementContextMenu
 * (правый клик / long-press → открывает popup со свойствами),
 * pendingFirstNodeId (для режима draw-element).
 *
 * Long-press для мобильного контекста вынесен в ./useLongPress, общие типы/
 * константы — в ./interactions-shared (без изменения логики).
 */
import { useState } from "react";
import { genId, type FrameModel, type ModelNode, type ModelElement } from "@/lib/cae-model";
import type { EditorMode } from "@/components/cae/FrameCanvas";
import { type ContextRequest } from "./interactions-shared";
import { useLongPress } from "./useLongPress";

export type { ContextRequest } from "./interactions-shared";

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

  // Long-press для мобильного контекстного меню (таймеры/слушатели внутри хука).
  const { startLongPress } = useLongPress({
    onSelectNodes,
    onSelectElements,
    suppressNextClick,
    setDraggingNode,
    onRequestContext,
  });

  // === Поиск узла под курсором (для draw-element / select) ===
  // Радиус 18px (комфортный для тапа пальцем) пересчитан в мировые единицы.
  const nodeAt = (worldX: number, worldY: number): ModelNode | null => {
    const r = 18 / pxPerM;
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
            id: genId("e", model.elements),
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
    // ── TOUCH ──
    // НЕ останавливаем всплытие и НЕ захватываем указатель: событие должно
    // дойти до обработчика SVG, который регистрирует палец в activeTouches.
    // Иначе при касании вторым пальцем pinch-zoom «не видит» первый палец
    // (тот, что попал на узел/балку) и камера дёргается в случайную сторону.
    // Перетаскивание узла пальцем стартует позже — в onPointerMove, когда
    // подтверждён ровно один активный палец и заметный сдвиг.
    if (e.pointerType === "touch") {
      // Long-press для контекстного меню — работает в любом режиме.
      if (onRequestContext) startLongPress("node", n.id, e.clientX, e.clientY);
      if (mode === "select" && !e.shiftKey && onMoveNode) {
        // Помечаем «кандидата» на drag, но без movedPx-старта и без capture.
        setDraggingNode({ id: n.id, movedPx: 0 });
      }
      return;
    }

    // ── МЫШЬ ──
    if (mode !== "select" || e.shiftKey || e.button !== 0) return;
    if (!onMoveNode) return;
    e.stopPropagation();
    setDraggingNode({ id: n.id, movedPx: 0 });
    // Мышь захватывает указатель — последующий click уйдёт на SVG, а не на узел,
    // поэтому handleNodeClick не сработает. Выделяем узел уже здесь (это и есть
    // реакция на «клик»). Если жест окажется перетаскиванием — выбор снимется
    // в onPointerUp после преодоления порога.
    onSelectNodes([n.id]);
    onSelectElements([]);
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