/**
 * Хук: логика взаимодействия с объектами на канве.
 * Содержит: nodeAt (поиск узла под курсором), handleNodeClick (выбор / draw-element),
 * handleNodePointerDown (старт drag), handleElementClick (выбор элемента),
 * pendingFirstNodeId (для режима draw-element).
 */
import { useState } from "react";
import type { FrameModel, ModelNode, ModelElement } from "@/lib/cae-model";
import type { EditorMode } from "@/components/cae/FrameCanvas";
import { NODE_R } from "./canvas-constants";

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
}

export interface CanvasInteractionsResult {
  pendingFirstNodeId: string | null;
  nodeAt: (worldX: number, worldY: number) => ModelNode | null;
  handleNodeClick: (n: ModelNode, e: React.MouseEvent) => void;
  handleNodePointerDown: (n: ModelNode, e: React.PointerEvent) => void;
  handleElementClick: (el: ModelElement, e: React.MouseEvent) => void;
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
}: Params): CanvasInteractionsResult {
  const [pendingFirstNodeId, setPendingFirstNodeId] = useState<string | null>(null);

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

  return {
    pendingFirstNodeId,
    nodeAt,
    handleNodeClick,
    handleNodePointerDown,
    handleElementClick,
  };
}
