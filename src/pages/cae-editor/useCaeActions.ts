import {
  genId,
  constrainedFromType,
  type FrameModel,
  type ModelNode,
  type ModelElement,
  type ModelLoad,
  type BoundaryCondition,
  type Material,
  type Section,
  type DofName,
} from "@/lib/cae-model";

export function useCaeActions(
  model: FrameModel,
  updateModel: (next: FrameModel) => void,
  selectedNodeIds: string[],
  selectedElementIds: string[],
  setSelectedNodeIds: (ids: string[]) => void,
  setSelectedElementIds: (ids: string[]) => void,
) {
  // Совместимость с одиночным выбором (правая панель показывает свойства одного объекта)
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

  const onCanvasClick = (worldX: number, worldY: number) => {
    const id = genId("n", model.nodes);
    const n: ModelNode = { id, coords: [worldX, worldY, 0] };
    updateModel({ ...model, nodes: [...model.nodes, n] });
    setSelectedNodeIds([id]);
  };

  const deleteSelected = () => {
    if (selectedNodeIds.length === 0 && selectedElementIds.length === 0) return;
    const nodeSet = new Set(selectedNodeIds);
    const elemSet = new Set(selectedElementIds);
    const remainingNodes = model.nodes.filter((n) => !nodeSet.has(n.id));
    const remainingElements = model.elements.filter(
      (e) =>
        !elemSet.has(e.id) &&
        !nodeSet.has(e.node_start) &&
        !nodeSet.has(e.node_end),
    );
    const remainingElIds = new Set(remainingElements.map((e) => e.id));
    const bcs = model.boundary_conditions.filter((b) => !nodeSet.has(b.node_id));
    const loads = model.loads.filter((l) => {
      if (l.node_id && nodeSet.has(l.node_id)) return false;
      if (l.element_id && !remainingElIds.has(l.element_id)) return false;
      return true;
    });
    updateModel({
      ...model,
      nodes: remainingNodes,
      elements: remainingElements,
      boundary_conditions: bcs,
      loads,
    });
    setSelectedNodeIds([]);
    setSelectedElementIds([]);
  };

  /** Дублировать выбранные узлы и элементы со смещением.
   *  Узлы получают новые id; элементы — если оба их узла дублируются — копируются
   *  и связываются с новыми узлами; иначе элемент не копируется. */
  const duplicateSelected = (offsetX = 0.5, offsetY = -0.5) => {
    if (selectedNodeIds.length === 0 && selectedElementIds.length === 0) return;

    // Сначала собираем все узлы, которые надо дублировать (включая концы выбранных элементов)
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

    // Дублируем элементы, у которых оба узла скопированы
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

    updateModel({
      ...model,
      nodes: [...model.nodes, ...newNodes],
      elements: [...model.elements, ...newElements],
    });

    // Выделяем новосозданные объекты
    setSelectedNodeIds(Array.from(nodeIdMap.values()));
    setSelectedElementIds(newElementIds);
  };

  /** Переместить узел в новые координаты (drag). Записывается в историю одной операцией. */
  const moveNode = (nodeId: string, x: number, y: number) => {
    const nodes = model.nodes.map((n) =>
      n.id === nodeId ? { ...n, coords: [x, y, n.coords[2]] as [number, number, number] } : n,
    );
    updateModel({ ...model, nodes });
  };

  /** Выделить все узлы и элементы */
  const selectAll = () => {
    setSelectedNodeIds(model.nodes.map((n) => n.id));
    setSelectedElementIds(model.elements.map((e) => e.id));
  };

  /** Снять выделение */
  const clearSelection = () => {
    setSelectedNodeIds([]);
    setSelectedElementIds([]);
  };

  const addBC = (type: BoundaryCondition["type"]) => {
    if (!selectedNodeId) return;
    const constrained = constrainedFromType(type, model.meta.dim);
    const existing = model.boundary_conditions.find((b) => b.node_id === selectedNodeId);
    let bcs = model.boundary_conditions;
    if (existing) {
      bcs = bcs.map((b) =>
        b.node_id === selectedNodeId ? { ...b, type, constrained_dofs: constrained } : b,
      );
    } else {
      bcs = [
        ...bcs,
        {
          id: genId("bc", model.boundary_conditions),
          node_id: selectedNodeId,
          type,
          constrained_dofs: constrained,
        },
      ];
    }
    updateModel({ ...model, boundary_conditions: bcs });
  };

  const removeBC = () => {
    if (!selectedNodeId) return;
    updateModel({
      ...model,
      boundary_conditions: model.boundary_conditions.filter(
        (b) => b.node_id !== selectedNodeId,
      ),
    });
  };

  const addNodalLoad = (fx: number, fy: number) => {
    if (!selectedNodeId) return;
    const existing = model.loads.find(
      (l) => l.type === "nodal_force" && l.node_id === selectedNodeId,
    );
    let loads = model.loads;
    if (existing) {
      loads = loads.map((l) =>
        l === existing ? { ...l, force: [fx, fy, 0] as [number, number, number] } : l,
      );
    } else {
      const ld: ModelLoad = {
        id: genId("L", model.loads),
        type: "nodal_force",
        node_id: selectedNodeId,
        force: [fx, fy, 0],
        moment: [0, 0, 0],
      };
      loads = [...loads, ld];
    }
    updateModel({ ...model, loads });
  };

  const removeLoadOnNode = () => {
    if (!selectedNodeId) return;
    updateModel({
      ...model,
      loads: model.loads.filter(
        (l) => !(l.type === "nodal_force" && l.node_id === selectedNodeId),
      ),
    });
  };

  const setNodalMoment = (mz: number) => {
    if (!selectedNodeId) return;
    const existing = model.loads.find(
      (l) => l.type === "nodal_force" && l.node_id === selectedNodeId,
    );
    let loads = model.loads;
    if (existing) {
      loads = loads.map((l) =>
        l === existing
          ? { ...l, moment: [0, 0, mz] as [number, number, number] }
          : l,
      );
    } else {
      loads = [
        ...loads,
        {
          id: genId("L", model.loads),
          type: "nodal_force",
          node_id: selectedNodeId,
          force: [0, 0, 0],
          moment: [0, 0, mz],
        },
      ];
    }
    updateModel({ ...model, loads });
  };

  const toggleCustomDof = (dof: DofName) => {
    if (!selectedNodeId) return;
    const existing = model.boundary_conditions.find((b) => b.node_id === selectedNodeId);
    const current = new Set(existing?.constrained_dofs || []);
    if (current.has(dof)) current.delete(dof);
    else current.add(dof);
    const dofs = Array.from(current) as DofName[];

    if (dofs.length === 0) {
      updateModel({
        ...model,
        boundary_conditions: model.boundary_conditions.filter(
          (b) => b.node_id !== selectedNodeId,
        ),
      });
      return;
    }

    let bcs = model.boundary_conditions;
    if (existing) {
      bcs = bcs.map((b) =>
        b.node_id === selectedNodeId ? { ...b, type: "custom", constrained_dofs: dofs } : b,
      );
    } else {
      bcs = [
        ...bcs,
        {
          id: genId("bc", model.boundary_conditions),
          node_id: selectedNodeId,
          type: "custom",
          constrained_dofs: dofs,
        },
      ];
    }
    updateModel({ ...model, boundary_conditions: bcs });
  };

  const pickMaterialForElement = (mat: Material) => {
    if (!selectedElementId) return;
    const exists = model.materials.find((m) => m.id === mat.id);
    const materials = exists ? model.materials : [...model.materials, mat];
    const elements = model.elements.map((e) =>
      e.id === selectedElementId ? { ...e, material_id: mat.id } : e,
    );
    updateModel({ ...model, materials, elements });
  };

  const pickSectionForElement = (sec: Section) => {
    if (!selectedElementId) return;
    const exists = model.sections.find((s) => s.id === sec.id);
    const sections = exists ? model.sections : [...model.sections, sec];
    const elements = model.elements.map((e) =>
      e.id === selectedElementId ? { ...e, section_id: sec.id } : e,
    );
    updateModel({ ...model, sections, elements });
  };

  const setDistributedLoad = (qy: number) => {
    if (!selectedElementId) return;
    const existing = model.loads.find(
      (l) => l.type === "distributed_uniform" && l.element_id === selectedElementId,
    );
    let loads = model.loads;
    if (qy === 0) {
      loads = loads.filter((l) => l !== existing);
    } else if (existing) {
      loads = loads.map((l) =>
        l === existing
          ? { ...l, load_local_per_length: [0, qy, 0] as [number, number, number] }
          : l,
      );
    } else {
      loads = [
        ...loads,
        {
          id: genId("L", model.loads),
          type: "distributed_uniform",
          element_id: selectedElementId,
          load_local_per_length: [0, qy, 0],
        },
      ];
    }
    updateModel({ ...model, loads });
  };

  const addInSpanPoint = (pos: number, py: number) => {
    if (!selectedElementId) return;
    const loads: ModelLoad[] = [
      ...model.loads,
      {
        id: genId("L", model.loads),
        type: "in_span_point",
        element_id: selectedElementId,
        force: [0, py, 0],
        position_ratio: pos,
      },
    ];
    updateModel({ ...model, loads });
  };

  const removeLoadById = (loadId: string) => {
    updateModel({
      ...model,
      loads: model.loads.filter((l) => l.id !== loadId),
    });
  };

  return {
    onCanvasClick,
    deleteSelected,
    duplicateSelected,
    moveNode,
    selectAll,
    clearSelection,
    addBC,
    removeBC,
    addNodalLoad,
    removeLoadOnNode,
    setNodalMoment,
    toggleCustomDof,
    pickMaterialForElement,
    pickSectionForElement,
    setDistributedLoad,
    addInSpanPoint,
    removeLoadById,
  };
}