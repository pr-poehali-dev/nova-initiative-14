/**
 * Проверки опор и нагрузок:
 *  - опора на несуществующем узле (bc_missing_node)
 *  - опора не закрепляет ни одной DOF (bc_empty)
 *  - нагрузка на несуществующем узле / элементе (load_missing_…)
 *  - нагрузка с нулевой величиной (load_zero)
 */
import type { FrameModel } from "@/lib/cae-model";
import { type ValidationIssue, EPS } from "./types";

export function validateBCs(model: FrameModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(model.nodes.map((n) => n.id));

  for (const bc of model.boundary_conditions) {
    if (!nodeIds.has(bc.node_id)) {
      issues.push({
        level: "error",
        code: "bc_missing_node",
        message: `Опора ${bc.id} стоит на несуществующем узле ${bc.node_id}`,
        target: { kind: "bc", id: bc.id },
      });
    }
    if (bc.constrained_dofs.length === 0) {
      issues.push({
        level: "warning",
        code: "bc_empty",
        message: `Опора в узле ${bc.node_id} не закрепляет ни одной степени свободы`,
        hint: "Выберите тип опоры или отметьте DOF в режиме «Пользовательская»",
        target: { kind: "node", id: bc.node_id },
      });
    }
  }

  return issues;
}

export function validateLoads(model: FrameModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(model.nodes.map((n) => n.id));
  const elementIds = new Set(model.elements.map((e) => e.id));

  for (const ld of model.loads) {
    if (ld.node_id && !nodeIds.has(ld.node_id)) {
      issues.push({
        level: "error",
        code: "load_missing_node",
        message: `Нагрузка ${ld.id} приложена к несуществующему узлу ${ld.node_id}`,
        target: { kind: "load", id: ld.id },
      });
    }
    if (ld.element_id && !elementIds.has(ld.element_id)) {
      issues.push({
        level: "error",
        code: "load_missing_element",
        message: `Нагрузка ${ld.id} приложена к несуществующему элементу ${ld.element_id}`,
        target: { kind: "load", id: ld.id },
      });
    }

    const f = ld.force || [0, 0, 0];
    const m = ld.moment || [0, 0, 0];
    const q = ld.load_local_per_length || [0, 0, 0];
    const mag =
      Math.abs(f[0]) + Math.abs(f[1]) + Math.abs(f[2]) +
      Math.abs(m[0]) + Math.abs(m[1]) + Math.abs(m[2]) +
      Math.abs(q[0]) + Math.abs(q[1]) + Math.abs(q[2]);
    if (mag < EPS) {
      issues.push({
        level: "warning",
        code: "load_zero",
        message: `Нагрузка ${ld.id} имеет нулевую величину`,
        hint: "Задайте ненулевое значение или удалите нагрузку",
        target: { kind: "load", id: ld.id },
      });
    }
  }

  return issues;
}
