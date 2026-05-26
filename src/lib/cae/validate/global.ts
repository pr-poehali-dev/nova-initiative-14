/**
 * Глобальные проверки модели:
 *  - наличие узлов, элементов, опор, нагрузок
 *  - кинематическая изменяемость 2D-рамы (минимум 3 закреплённых DOF)
 */
import type { FrameModel } from "@/lib/cae-model";
import type { ValidationIssue } from "./types";

export function validateGlobal(model: FrameModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (model.nodes.length === 0) {
    issues.push({
      level: "error",
      code: "no_nodes",
      message: "В модели нет ни одного узла",
      hint: "Перейдите в режим «Узел» (N) и кликните по холсту",
      target: { kind: "global" },
    });
  }
  if (model.elements.length === 0 && model.nodes.length > 0) {
    issues.push({
      level: "error",
      code: "no_elements",
      message: "В модели нет ни одного элемента",
      hint: "Режим «Балка» (E), кликните на два узла подряд",
      target: { kind: "global" },
    });
  }
  if (model.boundary_conditions.length === 0 && model.elements.length > 0) {
    issues.push({
      level: "error",
      code: "no_supports",
      message: "Нет ни одной опоры — рама не закреплена",
      hint: "Выберите узел и задайте опору в правой панели",
      target: { kind: "global" },
    });
  }
  if (model.loads.length === 0 && model.elements.length > 0) {
    issues.push({
      level: "warning",
      code: "no_loads",
      message: "Не задано ни одной нагрузки",
      hint: "Без нагрузок все усилия и прогибы будут нулевыми",
      target: { kind: "global" },
    });
  }

  // Кинематическая изменяемость (2D): должно быть закреплено минимум 3 DOF.
  if (model.elements.length > 0 && model.boundary_conditions.length > 0) {
    let totalConstrained = 0;
    for (const bc of model.boundary_conditions) {
      totalConstrained += bc.constrained_dofs.filter(
        (d) => d === "ux" || d === "uy" || d === "rz",
      ).length;
    }
    if (totalConstrained < 3) {
      issues.push({
        level: "error",
        code: "kinematic_unstable",
        message: `Рама кинематически изменяема: закреплено ${totalConstrained} степеней свободы из необходимых 3`,
        hint: "Добавьте опоры: например, шарнир (ux, uy) + катковая опора (uy)",
        target: { kind: "global" },
      });
    }
  }

  return issues;
}
