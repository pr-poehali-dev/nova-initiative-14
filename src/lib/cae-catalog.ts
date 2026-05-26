/**
 * Каталог CAE — публичный барель-модуль.
 *
 * Реальные исходники разбиты по ответственности в src/data/:
 *  - cae-catalog-types — типы (MaterialCatalogEntry, SectionCatalogEntry, FrameTemplate)
 *  - cae-materials     — каталог материалов (стали, чугуны, алюминий) + MATERIAL_GROUPS, findMaterial
 *  - cae-sections      — каталог сечений (ГОСТ 8239, 8240, 8509, 10704) + параметрические конструкторы
 *  - cae-templates     — типовые шаблоны задач (консоль, рама, ферма и т.п.)
 *
 * Этот файл сохраняет единую публичную точку входа `@/lib/cae-catalog` для
 * всех существующих потребителей в src/, чтобы веер импортов не менялся.
 */
export type {
  MaterialCatalogEntry,
  SectionCatalogEntry,
  SectionType,
  FrameTemplate,
} from "@/data/cae-catalog-types";

export {
  MATERIAL_CATALOG,
  MATERIAL_GROUPS,
  findMaterial,
} from "@/data/cae-materials";

export {
  I_BEAMS_8239,
  CHANNELS_8240,
  ANGLES_8509,
  PIPES_ROUND_10704,
  SECTION_CATALOG,
  SECTION_GROUPS,
  findSection,
  makeRectSection,
  makeCircleSection,
  makeRectPipeSection,
} from "@/data/cae-sections";

export { FRAME_TEMPLATES } from "@/data/cae-templates";
