/**
 * Чистые операции над свойствами элемента (стержня):
 *  - смена материала / сечения с автодобавлением в каталог модели
 *  - переключение шарниров на концах (Mz=0 в указанном узле)
 */
import type { FrameModel, Material, Section } from "@/lib/cae-model";

/** Назначить материал элементу. Если материала ещё нет в model.materials — добавляет. */
export function pickMaterialForElement(
  model: FrameModel,
  elementId: string,
  mat: Material,
): FrameModel {
  const exists = model.materials.find((m) => m.id === mat.id);
  const materials = exists ? model.materials : [...model.materials, mat];
  const elements = model.elements.map((e) =>
    e.id === elementId ? { ...e, material_id: mat.id } : e,
  );
  return { ...model, materials, elements };
}

/** Назначить сечение элементу. Если сечения ещё нет в model.sections — добавляет. */
export function pickSectionForElement(
  model: FrameModel,
  elementId: string,
  sec: Section,
): FrameModel {
  const exists = model.sections.find((s) => s.id === sec.id);
  const sections = exists ? model.sections : [...model.sections, sec];
  const elements = model.elements.map((e) =>
    e.id === elementId ? { ...e, section_id: sec.id } : e,
  );
  return { ...model, sections, elements };
}

/** Назначить сечение СРАЗУ ВСЕМ элементам модели («Применить ко всем»). */
export function pickSectionForAllElements(
  model: FrameModel,
  sec: Section,
): FrameModel {
  const exists = model.sections.find((s) => s.id === sec.id);
  const sections = exists ? model.sections : [...model.sections, sec];
  const elements = model.elements.map((e) => ({ ...e, section_id: sec.id }));
  return { ...model, sections, elements };
}

/**
 * Переключатель шарнира на одном из концов элемента.
 * Освобождает изгибающий момент Mz в указанном узле — нужно для ферм,
 * шатунов, тяг, балок Гербера.
 */
export function setElementHinge(
  model: FrameModel,
  elementId: string,
  end: "start" | "end",
  on: boolean,
): FrameModel {
  const elements = model.elements.map((e) =>
    e.id === elementId
      ? end === "start"
        ? { ...e, hinge_start: on }
        : { ...e, hinge_end: on }
      : e,
  );
  return { ...model, elements };
}