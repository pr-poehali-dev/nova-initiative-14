/**
 * Чистые операции над граничными условиями (опорами) модели CAE.
 * Все функции возвращают новую FrameModel.
 */
import {
  genId,
  constrainedFromType,
  type BoundaryCondition,
  type DofName,
  type FrameModel,
} from "@/lib/cae-model";

/** Поставить/обновить опору типа `type` на узле. */
export function setBC(
  model: FrameModel,
  nodeId: string,
  type: BoundaryCondition["type"],
): FrameModel {
  const constrained = constrainedFromType(type, model.meta.dim);
  const existing = model.boundary_conditions.find((b) => b.node_id === nodeId);
  let bcs = model.boundary_conditions;
  if (existing) {
    bcs = bcs.map((b) =>
      b.node_id === nodeId ? { ...b, type, constrained_dofs: constrained } : b,
    );
  } else {
    bcs = [
      ...bcs,
      {
        id: genId("bc", model.boundary_conditions),
        node_id: nodeId,
        type,
        constrained_dofs: constrained,
      },
    ];
  }
  return { ...model, boundary_conditions: bcs };
}

/** Снять опору с узла (если есть). */
export function removeBC(model: FrameModel, nodeId: string): FrameModel {
  return {
    ...model,
    boundary_conditions: model.boundary_conditions.filter((b) => b.node_id !== nodeId),
  };
}

/**
 * Переключить произвольное ограничение DOF на узле.
 * Если итоговый набор пустой — удаляет опору. Иначе создаёт/обновляет
 * с типом "custom".
 */
export function toggleCustomDof(
  model: FrameModel,
  nodeId: string,
  dof: DofName,
): FrameModel {
  const existing = model.boundary_conditions.find((b) => b.node_id === nodeId);
  const current = new Set(existing?.constrained_dofs || []);
  if (current.has(dof)) current.delete(dof);
  else current.add(dof);
  const dofs = Array.from(current) as DofName[];

  if (dofs.length === 0) {
    return {
      ...model,
      boundary_conditions: model.boundary_conditions.filter((b) => b.node_id !== nodeId),
    };
  }

  let bcs = model.boundary_conditions;
  if (existing) {
    bcs = bcs.map((b) =>
      b.node_id === nodeId ? { ...b, type: "custom", constrained_dofs: dofs } : b,
    );
  } else {
    bcs = [
      ...bcs,
      {
        id: genId("bc", model.boundary_conditions),
        node_id: nodeId,
        type: "custom",
        constrained_dofs: dofs,
      },
    ];
  }
  return { ...model, boundary_conditions: bcs };
}
