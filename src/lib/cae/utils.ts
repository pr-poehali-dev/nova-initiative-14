/**
 * Чистые утилиты для расчётной модели CAE (без побочных эффектов).
 *  - genId(prefix, existing)  — следующий свободный id вида `${prefix}${n}`
 *  - constrainedFromType(t,d) — список фиксируемых DOF для типа опоры (2D/3D)
 */
import type { BoundaryCondition, DofName, FrameModel } from "./types";

/**
 * Автоматический опорный вектор ориентации сечения для 3D-элемента.
 *
 * Решатель строит локальные оси так: z_local = normalize(x_local × ref_vector),
 * y_local = z_local × x_local. Чтобы изгиб в горизонтальной/вертикальной
 * плоскости рамы (xy) шёл по СИЛЬНОЙ оси сечения I_z — как в 2D-режиме —
 * нужно, чтобы локальная z совпала с глобальной Z = [0,0,1].
 *
 * Для оси элемента d=[dx,dy,dz] это достигается вектором, перпендикулярным
 * оси в плоскости xy: ref = [-dy, dx, 0] (тогда x × ref ∝ [0,0,1]).
 *
 * Вырожденный случай — вертикальный стержень (dx=dy=0): ось перпендикулярна
 * плоскости xy. Берём ref = [1, 0, 0], что даёт устойчивую ориентацию
 * (изгиб в плоскости xz по I_z), совпадающую со сверкой 2D↔3D для колонн.
 */
export function autoRefVector(
  start: [number, number, number],
  end: [number, number, number],
): [number, number, number] {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    // Вертикальный стержень (вдоль Z) — ось в плоскости xy не определена.
    return [1, 0, 0];
  }
  return [-dy, dx, 0];
}

/**
 * Проставляет элементам 3D-модели авто-ref_vector там, где он не задан явно,
 * чтобы плоские рамы в 3D считались по сильной оси (как 2D). Для 2D-моделей и
 * элементов с уже заданным ref_vector — возвращает модель без изменений
 * (идемпотентно).
 */
export function withAutoRefVector(model: FrameModel): FrameModel {
  if (model.meta?.dim !== "3d") return model;
  const nodeById = new Map(model.nodes.map((n) => [n.id, n]));
  let changed = false;
  const elements = model.elements.map((e) => {
    if (e.ref_vector) return e;
    const a = nodeById.get(e.node_start);
    const b = nodeById.get(e.node_end);
    if (!a || !b) return e;
    changed = true;
    return { ...e, ref_vector: autoRefVector(a.coords, b.coords) };
  });
  return changed ? { ...model, elements } : model;
}

export function genId(prefix: string, existing: { id: string }[]): string {
  const used = new Set(existing.map((x) => x.id));
  let i = 1;
  while (used.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}

/**
 * Чинит расчётную модель, загруженную из хранилища.
 *
 * Старые сохранённые модели могли содержать два дефекта (тикеты №34, №35, №40):
 *  1. Дублирующиеся id элементов (например, два «e3») — последствие старого
 *     генератора id вида `e${elements.length + 1}`, который переиспользовал
 *     номер после удаления среднего элемента. Дубликаты ломали React-ключи
 *     и решатель. Здесь дублям выдаётся новый уникальный id.
 *  2. «Висящие» элементы, ссылающиеся на несуществующий узел (узел был удалён,
 *     а стержень остался). Такие элементы и связанные с ними нагрузки удаляются.
 *
 * Функция идемпотентна: для корректной модели возвращает её без изменений.
 */
export function normalizeModel(model: FrameModel): FrameModel {
  const nodeIds = new Set(model.nodes.map((n) => n.id));

  // 1. Удаляем элементы с битыми ссылками на узлы.
  const validElements = model.elements.filter(
    (e) => nodeIds.has(e.node_start) && nodeIds.has(e.node_end),
  );

  // 2. Переименовываем дубликаты id элементов.
  const seen = new Set<string>();
  const usedIds = new Set(validElements.map((e) => e.id));
  const renamed = new Map<string, string>();
  const elements = validElements.map((e) => {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      return e;
    }
    let i = 1;
    let fresh = `e${i}`;
    while (usedIds.has(fresh) || seen.has(fresh)) fresh = `e${++i}`;
    usedIds.add(fresh);
    seen.add(fresh);
    renamed.set(e.id, fresh);
    return { ...e, id: fresh };
  });

  // 3. Чистим нагрузки, ссылающиеся на исчезнувшие элементы; переносим
  //    нагрузки на переименованные элементы (если дубликат имел нагрузку,
  //    она оставалась на первом элементе с этим id — это поведение сохраняем).
  const validElIds = new Set(elements.map((e) => e.id));
  const loads = (model.loads || []).filter((l) => {
    if (l.element_id && !validElIds.has(l.element_id) && !renamed.has(l.element_id)) {
      return false;
    }
    return true;
  });

  const changed =
    elements.length !== model.elements.length ||
    renamed.size > 0 ||
    loads.length !== (model.loads || []).length;

  return changed ? { ...model, elements, loads } : model;
}

export function constrainedFromType(
  t: BoundaryCondition["type"],
  dim: "2d" | "3d",
): DofName[] {
  // Конвенции:
  //   roller_x — каток, перекатывающийся ВДОЛЬ оси X (запрещает перемещение по Y)
  //   roller_y — каток, перекатывающийся ВДОЛЬ оси Y (запрещает перемещение по X)
  //   sliding  — «ползун»: фиксирует поворот и одно перемещение, второе свободно
  if (dim === "2d") {
    if (t === "fixed") return ["ux", "uy", "rz"];
    if (t === "pinned") return ["ux", "uy"];
    if (t === "roller_x") return ["uy"];
    if (t === "roller_y") return ["ux"];
    if (t === "sliding") return ["ux", "rz"];
    return [];
  }
  if (t === "fixed") return ["ux", "uy", "uz", "rx", "ry", "rz"];
  if (t === "pinned") return ["ux", "uy", "uz"];
  if (t === "roller_x") return ["uy", "uz"];
  if (t === "roller_y") return ["ux", "uz"];
  if (t === "sliding") return ["ux", "uz", "rx", "ry", "rz"];
  return [];
}