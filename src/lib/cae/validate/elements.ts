/**
 * Проверки элементов (стержней):
 *  - ссылка на несуществующий узел (element_missing_node)
 *  - петля на одном узле (element_self_loop)
 *  - нулевая длина (element_zero_length)
 *  - отсутствует материал / сечение в каталоге модели
 */
import type { FrameModel, ModelNode } from "@/lib/cae-model";
import { type ValidationIssue, EPS } from "./types";

export function validateElements(model: FrameModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeById = new Map<string, ModelNode>(model.nodes.map((n) => [n.id, n]));

  for (const el of model.elements) {
    const a = nodeById.get(el.node_start);
    const b = nodeById.get(el.node_end);

    if (!a) {
      issues.push({
        level: "error",
        code: "element_missing_node",
        message: `Элемент ${el.id} ссылается на несуществующий узел ${el.node_start}`,
        target: { kind: "element", id: el.id },
      });
      continue;
    }
    if (!b) {
      issues.push({
        level: "error",
        code: "element_missing_node",
        message: `Элемент ${el.id} ссылается на несуществующий узел ${el.node_end}`,
        target: { kind: "element", id: el.id },
      });
      continue;
    }
    if (el.node_start === el.node_end) {
      issues.push({
        level: "error",
        code: "element_self_loop",
        message: `Элемент ${el.id} замыкается на один узел ${el.node_start}`,
        target: { kind: "element", id: el.id },
      });
      continue;
    }

    const dx = a.coords[0] - b.coords[0];
    const dy = a.coords[1] - b.coords[1];
    const dz = a.coords[2] - b.coords[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < EPS) {
      issues.push({
        level: "error",
        code: "element_zero_length",
        message: `Длина элемента ${el.id} равна нулю`,
        hint: "Передвиньте один из узлов",
        target: { kind: "element", id: el.id },
      });
    }

    if (!model.materials.some((m) => m.id === el.material_id)) {
      issues.push({
        level: "error",
        code: "element_no_material",
        message: `У элемента ${el.id} не задан материал (id «${el.material_id}» не найден)`,
        hint: "Выберите материал в правой панели",
        target: { kind: "element", id: el.id },
      });
    }
    if (!model.sections.some((s) => s.id === el.section_id)) {
      issues.push({
        level: "error",
        code: "element_no_section",
        message: `У элемента ${el.id} не задано сечение (id «${el.section_id}» не найден)`,
        hint: "Выберите сечение в правой панели",
        target: { kind: "element", id: el.id },
      });
    }
  }

  return issues;
}
