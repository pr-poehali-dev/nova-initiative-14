/**
 * Чистые операции над узлами модели CAE.
 * Каждая функция принимает текущую модель + параметры и возвращает
 * { model, selection? } — без побочных эффектов.
 *
 * Используется внутри useCaeActions для разгрузки одного 380-строчного хука.
 */
import { genId, type FrameModel, type ModelElement, type ModelNode } from "@/lib/cae-model";

export interface ActionResult {
  model: FrameModel;
  nodeIds?: string[];
  elementIds?: string[];
}

/** Создать узел в указанной точке мира. */
export function addNodeAt(model: FrameModel, worldX: number, worldY: number): ActionResult {
  const id = genId("n", model.nodes);
  const n: ModelNode = { id, coords: [worldX, worldY, 0] };
  return { model: { ...model, nodes: [...model.nodes, n] }, nodeIds: [id] };
}

/**
 * Удалить выбранные узлы и элементы. Каскад:
 *  - элементы, ссылающиеся на удалённые узлы, удаляются
 *  - граничные условия на удалённых узлах удаляются
 *  - нагрузки на удалённых узлах/элементах удаляются
 */
export function deleteSelection(
  model: FrameModel,
  selectedNodeIds: string[],
  selectedElementIds: string[],
): ActionResult {
  if (selectedNodeIds.length === 0 && selectedElementIds.length === 0) {
    return { model, nodeIds: [], elementIds: [] };
  }
  const nodeSet = new Set(selectedNodeIds);
  const elemSet = new Set(selectedElementIds);
  const remainingNodes = model.nodes.filter((n) => !nodeSet.has(n.id));
  const remainingElements = model.elements.filter(
    (e) =>
      !elemSet.has(e.id) && !nodeSet.has(e.node_start) && !nodeSet.has(e.node_end),
  );
  const remainingElIds = new Set(remainingElements.map((e) => e.id));
  const bcs = model.boundary_conditions.filter((b) => !nodeSet.has(b.node_id));
  const loads = model.loads.filter((l) => {
    if (l.node_id && nodeSet.has(l.node_id)) return false;
    if (l.element_id && !remainingElIds.has(l.element_id)) return false;
    return true;
  });
  return {
    model: {
      ...model,
      nodes: remainingNodes,
      elements: remainingElements,
      boundary_conditions: bcs,
      loads,
    },
    nodeIds: [],
    elementIds: [],
  };
}

/**
 * Дублировать выбранные узлы и элементы со смещением.
 * Узлы получают новые id; элементы дублируются только если оба их узла дублируются.
 */
export function duplicateSelection(
  model: FrameModel,
  selectedNodeIds: string[],
  selectedElementIds: string[],
  offsetX = 0.5,
  offsetY = -0.5,
): ActionResult {
  if (selectedNodeIds.length === 0 && selectedElementIds.length === 0) {
    return { model };
  }

  const nodesToCopy = new Set<string>(selectedNodeIds);
  for (const elId of selectedElementIds) {
    const el = model.elements.find((e) => e.id === elId);
    if (el) {
      nodesToCopy.add(el.node_start);
      nodesToCopy.add(el.node_end);
    }
  }

  const nodeIdMap = new Map<string, string>();
  const newNodes: ModelNode[] = [];
  let nodeCounter = model.nodes.length + 1;
  for (const nid of nodesToCopy) {
    const src = model.nodes.find((n) => n.id === nid);
    if (!src) continue;
    let newId = `n${nodeCounter++}`;
    while (model.nodes.some((n) => n.id === newId)) newId = `n${nodeCounter++}`;
    nodeIdMap.set(nid, newId);
    newNodes.push({
      ...src,
      id: newId,
      coords: [src.coords[0] + offsetX, src.coords[1] + offsetY, src.coords[2]],
    });
  }

  const newElements: ModelElement[] = [];
  let elCounter = model.elements.length + 1;
  const newElementIds: string[] = [];
  for (const elId of selectedElementIds) {
    const src = model.elements.find((e) => e.id === elId);
    if (!src) continue;
    const ns = nodeIdMap.get(src.node_start);
    const ne = nodeIdMap.get(src.node_end);
    if (!ns || !ne) continue;
    let newId = `e${elCounter++}`;
    while (model.elements.some((e) => e.id === newId)) newId = `e${elCounter++}`;
    newElements.push({ ...src, id: newId, node_start: ns, node_end: ne });
    newElementIds.push(newId);
  }

  return {
    model: {
      ...model,
      nodes: [...model.nodes, ...newNodes],
      elements: [...model.elements, ...newElements],
    },
    nodeIds: Array.from(nodeIdMap.values()),
    elementIds: newElementIds,
  };
}

/** Переместить узел в новые координаты (drag-операция). */
export function moveNode(model: FrameModel, nodeId: string, x: number, y: number): FrameModel {
  const nodes = model.nodes.map((n) =>
    n.id === nodeId
      ? { ...n, coords: [x, y, n.coords[2]] as [number, number, number] }
      : n,
  );
  return { ...model, nodes };
}
