import {
  genId,
  constrainedFromType,
  type FrameModel,
  type ModelNode,
  type ModelLoad,
  type BoundaryCondition,
  type Material,
  type Section,
  type DofName,
} from "@/lib/cae-model";

export function useCaeActions(
  model: FrameModel,
  updateModel: (next: FrameModel) => void,
  selectedNodeId: string | null,
  selectedElementId: string | null,
  setSelectedNodeId: (id: string | null) => void,
  setSelectedElementId: (id: string | null) => void,
) {
  const onCanvasClick = (worldX: number, worldY: number) => {
    const id = genId("n", model.nodes);
    const n: ModelNode = { id, coords: [worldX, worldY, 0] };
    updateModel({ ...model, nodes: [...model.nodes, n] });
    setSelectedNodeId(id);
  };

  const deleteSelected = () => {
    if (selectedNodeId) {
      const remaining = model.nodes.filter((n) => n.id !== selectedNodeId);
      const elements = model.elements.filter(
        (e) => e.node_start !== selectedNodeId && e.node_end !== selectedNodeId,
      );
      const bcs = model.boundary_conditions.filter((b) => b.node_id !== selectedNodeId);
      const loads = model.loads.filter((l) => l.node_id !== selectedNodeId);
      updateModel({ ...model, nodes: remaining, elements, boundary_conditions: bcs, loads });
      setSelectedNodeId(null);
      return;
    }
    if (selectedElementId) {
      const elements = model.elements.filter((e) => e.id !== selectedElementId);
      const loads = model.loads.filter((l) => l.element_id !== selectedElementId);
      updateModel({ ...model, elements, loads });
      setSelectedElementId(null);
    }
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
