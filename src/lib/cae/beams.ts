/**
 * Утилиты для модалки подбора балок: длина элемента, масса погонного метра,
 * масса элемента и сводка по всей конструкции.
 *
 * Масса не хранится в каталоге сечений — она вычисляется как A × rho,
 * где A — площадь сечения [м²], rho — плотность материала [кг/м³].
 */
import type { FrameModel, Section, ModelElement } from "@/lib/cae-model";

const DEFAULT_RHO = 7850; // сталь, кг/м³ — если у материала не задана плотность

/** Длина элемента по координатам узлов (3D-безопасно). */
export function elementLength(model: FrameModel, el: ModelElement): number {
  const a = model.nodes.find((n) => n.id === el.node_start);
  const b = model.nodes.find((n) => n.id === el.node_end);
  if (!a || !b) return 0;
  const dx = b.coords[0] - a.coords[0];
  const dy = b.coords[1] - a.coords[1];
  const dz = (b.coords[2] ?? 0) - (a.coords[2] ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Плотность материала элемента, кг/м³. */
export function elementRho(model: FrameModel, el: ModelElement): number {
  const mat = model.materials.find((m) => m.id === el.material_id);
  return mat?.rho ?? DEFAULT_RHO;
}

/** Масса погонного метра сечения при данной плотности, кг/м. */
export function massPerMeter(section: Section, rho: number): number {
  return section.A * rho;
}

/** Найти сечение элемента в модели. */
export function elementSection(model: FrameModel, el: ModelElement): Section | undefined {
  return model.sections.find((s) => s.id === el.section_id);
}

/** Запас прочности элемента из результатов расчёта (если есть). */
export function elementSafety(
  result: { elements?: Array<{ element_id: string; max_values?: { safety_factor?: number } }> } | null,
  elementId: string,
): number | null {
  if (!result?.elements) return null;
  const r = result.elements.find((e) => e.element_id === elementId);
  const sf = r?.max_values?.safety_factor;
  return typeof sf === "number" && isFinite(sf) ? sf : null;
}

/** Суммарная масса конструкции, кг. */
export function totalMass(model: FrameModel): number {
  let sum = 0;
  for (const el of model.elements) {
    const sec = elementSection(model, el);
    if (!sec) continue;
    sum += massPerMeter(sec, elementRho(model, el)) * elementLength(model, el);
  }
  return sum;
}
