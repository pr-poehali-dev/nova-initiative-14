/**
 * Дефолтные значения расчётной модели CAE.
 *
 * Содержит:
 *  - DEFAULT_ANALYSIS_SETTINGS — общее машиностроение, Мизес, n=1.5
 *  - DEFAULT_MATERIAL — Сталь Ст3
 *  - DEFAULT_SECTION — Двутавр I20 (ГОСТ 8239-89)
 *  - emptyModel(dim) — пустая модель с одним материалом и одним сечением
 */
import type {
  AnalysisSettings,
  FrameModel,
  Material,
  Section,
} from "./types";

/** Дефолтные настройки расчёта — общее машиностроение, Мизес, n=1.5 */
export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  discipline: "mechanical",
  industry: "general",
  strength_theory: "mises",
  analysis_type: "linear",
  safety_factor: 1.5,
  custom_deflection_divisor: null,
  check_deflection: true,
  check_strength: true,
  check_buckling: true,
};

export const DEFAULT_MATERIAL: Material = {
  id: "steel",
  name: "Сталь Ст3",
  E: 2.1e11,
  G: 8.1e10,
  nu: 0.3,
  rho: 7850,
  sigma_yield: 245e6,
};

export const DEFAULT_SECTION: Section = {
  id: "i20",
  name: "Двутавр I20 (ГОСТ 8239-89)",
  A: 26.8e-4,
  I_y: 115e-8,
  I_z: 1840e-8,
  I_t: 5.4e-8,
  W_y: 23.1e-6,
  W_z: 184e-6,
  h: 0.2,
  shear_area_y: 13.4e-4,
  shear_area_z: 18.7e-4,
};

export function emptyModel(dim: "2d" | "3d" = "2d"): FrameModel {
  return {
    meta: { dim },
    materials: [{ ...DEFAULT_MATERIAL }],
    sections: [{ ...DEFAULT_SECTION }],
    nodes: [],
    elements: [],
    boundary_conditions: [],
    loads: [],
    analysis_options: { diagram_subdivisions: 20 },
    analysis_settings: { ...DEFAULT_ANALYSIS_SETTINGS },
  };
}