/**
 * Проверки узлов:
 *  - совпадающие координаты (duplicate_nodes)
 *  - висячий узел: не входит в элементы и не имеет опоры/нагрузки (orphan_node)
 */
import type { FrameModel } from "@/lib/cae-model";
import { type ValidationIssue, EPS } from "./types";

export function validateNodes(model: FrameModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Совпадающие координаты
  for (let i = 0; i < model.nodes.length; i++) {
    for (let j = i + 1; j < model.nodes.length; j++) {
      const a = model.nodes[i];
      const b = model.nodes[j];
      const dx = a.coords[0] - b.coords[0];
      const dy = a.coords[1] - b.coords[1];
      const dz = a.coords[2] - b.coords[2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < EPS) {
        issues.push({
          level: "warning",
          code: "duplicate_nodes",
          message: `Узлы ${a.id} и ${b.id} лежат в одной точке`,
          hint: "Удалите один из них или сместите",
          target: { kind: "node", id: b.id },
        });
      }
    }
  }

  // Висячие узлы
  const usedNodeIds = new Set<string>();
  model.elements.forEach((e) => {
    usedNodeIds.add(e.node_start);
    usedNodeIds.add(e.node_end);
  });
  for (const n of model.nodes) {
    if (usedNodeIds.has(n.id)) continue;
    const hasBC = model.boundary_conditions.some((b) => b.node_id === n.id);
    const hasLoad = model.loads.some((l) => l.node_id === n.id);
    if (!hasBC && !hasLoad) {
      issues.push({
        level: "warning",
        code: "orphan_node",
        message: `Узел ${n.id} не используется (нет элементов, опор, нагрузок)`,
        hint: "Удалите его или подключите элементом",
        target: { kind: "node", id: n.id },
      });
    }
  }

  return issues;
}
