/**
 * Чистые утилиты для расчётной модели CAE (без побочных эффектов).
 *  - genId(prefix, existing)  — следующий свободный id вида `${prefix}${n}`
 *  - constrainedFromType(t,d) — список фиксируемых DOF для типа опоры (2D/3D)
 */
import type { BoundaryCondition, DofName } from "./types";

export function genId(prefix: string, existing: { id: string }[]): string {
  const used = new Set(existing.map((x) => x.id));
  let i = 1;
  while (used.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
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
