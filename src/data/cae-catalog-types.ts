/**
 * Типы для каталогов CAE: расширяют базовые Material / Section дополнительными
 * полями каталога (ГОСТ, категория, тип сечения, описание).
 *
 * Чистый файл типов — без рантайма.
 */
import type { Material, Section, FrameModel } from "@/lib/cae-model";

export interface MaterialCatalogEntry extends Material {
  category:
    | "steel"
    | "alloy"
    | "cast_iron"
    | "aluminium"
    | "concrete"
    | "custom";
  gost?: string;
  description?: string;
  /** Временное сопротивление, Па. Используется в расчёте усталостной прочности. */
  sigma_ultimate?: number;
}

export type SectionType =
  | "i_beam"          // двутавр
  | "channel"         // швеллер
  | "angle_eq"        // уголок равнополочный
  | "pipe_round"      // труба круглая
  | "pipe_rect"       // труба прямоугольная
  | "rect_solid"      // прямоугольник сплошной
  | "circle_solid"    // круг сплошной
  | "custom";

export interface SectionCatalogEntry extends Section {
  type: SectionType;
  category: string;
  gost?: string;
}

export interface FrameTemplate {
  id: string;
  name: string;
  description: string;
  /** Упрощённое SVG-представление для миниатюры (только path d-атрибут). */
  preview: string;
  build: () => FrameModel;
}
