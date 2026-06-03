/**
 * Чистые операции над узлами модели CAE.
 * Каждая функция принимает текущую модель + параметры и возвращает
 * { model, selection? } — без побочных эффектов.
 *
 * Используется внутри useCaeActions для разгрузки одного 380-строчного хука.
 */
import {
  genId,
  type FrameModel,
  type ModelElement,
  type ModelLoad,
  type ModelNode,
  type NodeConnectionType,
} from "@/lib/cae-model";

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
 * Проекция точки (px,py) на отрезок [a→b]. Возвращает точку проекции,
 * параметр t∈[0,1] вдоль отрезка и расстояние от точки до отрезка.
 */
function projectPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { x: number; y: number; t: number; dist: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
  t = Math.min(1, Math.max(0, t));
  const x = ax + t * dx;
  const y = ay + t * dy;
  const dist = Math.hypot(px - x, py - y);
  return { x, y, t, dist };
}

/**
 * Ищет ближайший к точке элемент, на который «попадает» клик.
 * tolWorld — допуск в мировых единицах (пересчитанный радиус тапа).
 * Узлы-концы исключаются: если клик у самого узла, делить нечего.
 */
export function findElementNearPoint(
  model: FrameModel,
  worldX: number,
  worldY: number,
  tolWorld: number,
): { element: ModelElement; t: number; x: number; y: number } | null {
  let best: { element: ModelElement; t: number; x: number; y: number; dist: number } | null = null;
  for (const el of model.elements) {
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;
    const proj = projectPointOnSegment(
      worldX,
      worldY,
      a.coords[0],
      a.coords[1],
      b.coords[0],
      b.coords[1],
    );
    // Не делим у самых концов (там и так есть узел) — отступ 1% длины.
    if (proj.t <= 0.01 || proj.t >= 0.99) continue;
    if (proj.dist <= tolWorld && (!best || proj.dist < best.dist)) {
      best = { element: el, t: proj.t, x: proj.x, y: proj.y, dist: proj.dist };
    }
  }
  if (!best) return null;
  return { element: best.element, t: best.t, x: best.x, y: best.y };
}

/**
 * Добавляет узел НА существующий элемент, реально разбивая его на два стержня,
 * соединённых в новом узле (тикет №36). Новый узел становится общим — он
 * физически связывает обе половины, поэтому расчёт «видит» соединение.
 *
 * Что переносится на половинки:
 *  - материал и сечение — копируются на обе части;
 *  - шарниры: внешние концы сохраняют свои шарниры, внутреннее соединение
 *    в новом узле делается жёстким (без шарнира);
 *  - распределённая нагрузка — переносится на ОБЕ половины (та же интенсивность);
 *  - сосредоточенная сила в пролёте — попадает на ту половину, где находится,
 *    с пересчётом относительной позиции.
 */
export function addNodeOnElement(
  model: FrameModel,
  element: ModelElement,
  x: number,
  y: number,
  t: number,
): ActionResult {
  const newNodeId = genId("n", model.nodes);
  const newNode: ModelNode = { id: newNodeId, coords: [x, y, 0] };

  const nodesWithNew = [...model.nodes, newNode];

  // Две новые половины. Первой выдаём id исходного элемента (чтобы по
  // возможности сохранить ссылки), второй — новый свободный id.
  const id1 = element.id;
  const id2 = genId("e", [...model.elements, { id: id1 }]);

  const half1: ModelElement = {
    ...element,
    id: id1,
    node_start: element.node_start,
    node_end: newNodeId,
    hinge_start: element.hinge_start,
    hinge_end: false, // внутреннее соединение — жёсткое
  };
  const half2: ModelElement = {
    ...element,
    id: id2,
    node_start: newNodeId,
    node_end: element.node_end,
    hinge_start: false, // внутреннее соединение — жёсткое
    hinge_end: element.hinge_end,
  };

  const elements = model.elements.flatMap((e) =>
    e.id === element.id ? [half1, half2] : [e],
  );

  // Переносим нагрузки исходного элемента на половины.
  const loads: ModelLoad[] = [];
  const usedLoadIds = new Set(model.loads.map((l) => l.id));
  const freshLoadId = () => {
    let i = 1;
    let id = `L${i}`;
    while (usedLoadIds.has(id)) id = `L${++i}`;
    usedLoadIds.add(id);
    return id;
  };

  for (const l of model.loads) {
    if (l.element_id !== element.id) {
      loads.push(l);
      continue;
    }
    if (l.type === "distributed_uniform") {
      // Та же распределённая нагрузка на обе половины.
      loads.push({ ...l, element_id: id1 });
      loads.push({ ...l, id: freshLoadId(), element_id: id2 });
    } else if (l.type === "in_span_point") {
      const pos = l.position_ratio ?? 0.5;
      if (pos <= t) {
        // Сила на первой половине — масштабируем позицию к [0,1] внутри неё.
        loads.push({ ...l, element_id: id1, position_ratio: t > 0 ? pos / t : 0 });
      } else {
        loads.push({
          ...l,
          element_id: id2,
          position_ratio: t < 1 ? (pos - t) / (1 - t) : 1,
        });
      }
    } else {
      loads.push(l);
    }
  }

  return {
    model: { ...model, nodes: nodesWithNew, elements, loads },
    nodeIds: [newNodeId],
    elementIds: [id1, id2],
  };
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

/**
 * Задать конструктивный тип соединения узла (сварное/болтовое/…).
 * Конструктивная характеристика для документации — на расчёт не влияет.
 * Значение "none" сбрасывает признак.
 */
export function setNodeConnection(
  model: FrameModel,
  nodeId: string,
  connection: NodeConnectionType,
): FrameModel {
  const nodes = model.nodes.map((n) =>
    n.id === nodeId
      ? connection === "none"
        ? (() => {
            const { connection: _omit, ...rest } = n;
            return rest as ModelNode;
          })()
        : { ...n, connection }
      : n,
  );
  return { ...model, nodes };
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