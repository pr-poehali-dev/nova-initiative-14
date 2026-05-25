/**
 * Валидатор расчётной модели.
 *
 * Запускается до отправки в solver и при изменении модели для отображения
 * списка проблем. Возвращает плоский массив issues с уровнем (error / warning),
 * человеческим сообщением и ссылкой на проблемный объект (узел или элемент).
 *
 * Уровни:
 *  - error  — расчёт запускать нельзя (математически или физически некорректная задача)
 *  - warning — расчёт пойдёт, но результат может быть неожиданным
 *
 * Проверки покрывают типовые ошибки студента:
 *  - нет узлов / элементов / опор / нагрузок
 *  - висячие узлы (не входят ни в один элемент)
 *  - элемент длины ноль
 *  - элемент ссылается на несуществующий узел
 *  - материал / сечение не задан
 *  - совпадающие узлы (одна координата)
 *  - кинематически изменяемая система (нет ни одной заделки и нет тройки шарниров)
 *  - нагрузка не приложена ни к чему
 */
import type { FrameModel } from "./cae-model";

export type IssueLevel = "error" | "warning";
export type IssueTargetKind = "node" | "element" | "load" | "bc" | "global";

export interface ValidationIssue {
  level: IssueLevel;
  /** Машинный код для дедупликации/тестов */
  code: string;
  /** Текст для пользователя — конкретный, без размытых формулировок */
  message: string;
  /** Краткая подсказка как исправить */
  hint?: string;
  /** К чему относится — для подсветки на канве и навигации */
  target: { kind: IssueTargetKind; id?: string };
}

const EPS = 1e-9;

export function validateModel(model: FrameModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeById = new Map(model.nodes.map((n) => [n.id, n]));

  // === Глобальные проверки наличия ===
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

  // === Узлы: совпадающие координаты ===
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

  // === Висячие узлы (не входят в элементы и не имеют нагрузки/опоры) ===
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

  // === Элементы ===
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

    // Материал и сечение должны существовать в каталоге
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

  // === Опоры на несуществующих узлах ===
  for (const bc of model.boundary_conditions) {
    if (!nodeById.has(bc.node_id)) {
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

  // === Нагрузки на несуществующих объектах + нулевые ===
  const elementIds = new Set(model.elements.map((e) => e.id));
  for (const ld of model.loads) {
    if (ld.node_id && !nodeById.has(ld.node_id)) {
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

    // Проверка «нулевая нагрузка»
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

  // === Кинематическая изменяемость (минимальная проверка для 2D) ===
  // В 2D раме нужно ограничить минимум 3 DOF (3 уравнения равновесия).
  // Считаем суммарное число закреплённых DOF (по типам опор):
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

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}

export function summarizeIssues(issues: ValidationIssue[]): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const i of issues) {
    if (i.level === "error") errors++;
    else warnings++;
  }
  return { errors, warnings };
}
