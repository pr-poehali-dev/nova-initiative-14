/**
 * Типы расчётной модели CAE (frontend ↔ cae-solver).
 * Структура зеркалит SolverPayload в backend/cae-solver/solver.py.
 *
 * ВНИМАНИЕ: только описания типов. Никаких runtime-значений и API-вызовов.
 */

export interface Material {
  id: string;
  name: string;
  E: number;          // Па
  G: number;          // Па
  nu?: number;
  rho?: number;
  sigma_yield?: number;
}

export interface Section {
  id: string;
  name: string;
  A: number;          // м²
  I_y?: number;       // м⁴
  I_z: number;        // м⁴
  I_t?: number;
  W_y?: number;       // м³
  W_z?: number;
  h?: number;         // высота сечения, м
  shear_area_y?: number;
  shear_area_z?: number;
}

export interface ModelNode {
  id: string;
  coords: [number, number, number]; // для 2D z=0
  label?: string;
}

export interface ModelElement {
  id: string;
  node_start: string;
  node_end: string;
  material_id: string;
  section_id: string;
  /**
   * Шарнир на начальном узле элемента: освобождает изгибающий момент Mz
   * (для 2D рам). Если true — момент в этом конце стержня равен нулю.
   * Используется для ферм, шатунов, тяг, подкосов, балок Гербера.
   * По умолчанию false (жёсткое соединение).
   */
  hinge_start?: boolean;
  /** Шарнир на конечном узле элемента (Mz=0 в правом конце). */
  hinge_end?: boolean;
  /** Человекочитаемая подпись стержня (например, e1, e2). Если не задана — берётся id. */
  label?: string;
}

export type DofName = "ux" | "uy" | "uz" | "rx" | "ry" | "rz";

export interface BoundaryCondition {
  id: string;
  node_id: string;
  type: "fixed" | "pinned" | "roller_x" | "roller_y" | "sliding" | "custom";
  constrained_dofs: DofName[];
}

export type LoadType =
  | "nodal_force"
  | "in_span_point"
  | "distributed_uniform";

export interface ModelLoad {
  id: string;
  type: LoadType;
  node_id?: string;
  element_id?: string;
  force?: [number, number, number];
  moment?: [number, number, number];
  position_ratio?: number;
  load_local_per_length?: [number, number, number];
}

/**
 * Тип расчёта прочности — какую теорию использовать для эквивалентных напряжений.
 *  - tresca:  σ_экв = √(σ² + 4τ²)  — 3-я теория, максимальных касательных
 *  - mises:   σ_экв = √(σ² + 3τ²)  — 4-я теория, энергетическая (по умолчанию)
 *  - normal:  σ_экв = |σ|          — для хрупких материалов (1-я теория)
 */
export type StrengthTheory = "tresca" | "mises" | "normal";

/**
 * Тип расчёта:
 *  - linear:           линейная статика (по умолчанию). Перемещения малы,
 *                      жёсткость постоянна — нагрузка пропорциональна отклику.
 *  - nonlinear_pdelta: геометрическая нелинейность (P-Δ). Учитывает влияние
 *                      деформированной схемы: сжатая стойка получает
 *                      дополнительный момент от собственного отклонения.
 *                      Нужен для оценки устойчивости сжатых элементов.
 */
export type AnalysisType = "linear" | "nonlinear_pdelta";

/**
 * Отрасль применения конструкции — определяет норматив допускаемого прогиба [f].
 * Список взят из реальных машиностроительных норм и справочников.
 */
export type IndustryKind =
  | "general"
  | "lifting"
  | "machine_tool"
  | "transport"
  | "shaft"
  | "custom";

export interface AnalysisSettings {
  /** Отрасль — выбирает допускаемый прогиб по умолчанию */
  industry: IndustryKind;
  /** Теория прочности для расчёта σ_экв */
  strength_theory: StrengthTheory;
  /** Тип расчёта: линейный (по умолчанию) или нелинейный P-Δ */
  analysis_type?: AnalysisType;
  /** Коэффициент запаса прочности n (σ_экв ≤ σ_т / n). По умолчанию 1.5 */
  safety_factor: number;
  /** Для industry=custom: знаменатель отношения L/k (250 → [f]=L/250). null если не задано */
  custom_deflection_divisor: number | null;
  /** Учитывать ли проверку прогибов */
  check_deflection: boolean;
  /** Учитывать ли проверку прочности */
  check_strength: boolean;
  /**
   * Учитывать ли проверку устойчивости сжатых стержней (продольный изгиб).
   * Применяется только к элементам с N < 0 (сжатие). Считается по Эйлеру/Ясинскому
   * с автоматическим выбором коэффициента приведения длины μ по граничным условиям.
   * По умолчанию включено.
   */
  check_buckling?: boolean;
}

export interface FrameModel {
  meta: { dim: "2d" | "3d" };
  materials: Material[];
  sections: Section[];
  nodes: ModelNode[];
  elements: ModelElement[];
  boundary_conditions: BoundaryCondition[];
  loads: ModelLoad[];
  analysis_options?: { diagram_subdivisions?: number; analysis_type?: AnalysisType };
  analysis_settings?: AnalysisSettings;
}

export interface SolverResponse {
  status: string;
  solver_version: string;
  duration_ms?: number;
  summary: {
    dim: "2d" | "3d";
    n_nodes: number;
    n_elements: number;
    n_dofs: number;
    max_displacement: number;
    max_sigma_vm: number;
    min_safety_factor: number | null;
    analysis_type?: AnalysisType;
    /** Сведения об итерациях P-Δ (только для nonlinear_pdelta) */
    pdelta?: {
      iterations: number;
      converged: boolean;
      unstable: boolean;
    };
  };
  nodal_displacements: Array<{
    node_id: string;
    ux: number;
    uy: number;
    uz?: number;
    rx?: number;
    ry?: number;
    rz: number;
    displacement_magnitude: number;
  }>;
  reactions: Array<{
    node_id: string;
    fx: number;
    fy: number;
    fz?: number;
    mx?: number;
    my?: number;
    mz: number;
  }>;
  elements: Array<{
    element_id: string;
    length: number;
    diagrams: {
      x: number[];
      N: number[];
      Qy: number[];
      Qz: number[];
      T: number[];
      My: number[];
      Mz: number[];
      sigma_vm: number[];
      ux_local?: number[];
      uy_local?: number[];
      uz_local?: number[];
    };
    max_values: {
      abs_N_max: number;
      abs_Mz_max: number;
      abs_My_max: number;
      abs_sigma_vm_max: number;
      abs_uy_max?: number;
      safety_factor: number;
    };
  }>;
  warnings: string[];
  errors: string[];
}