/**
 * Типы расчётной модели CAE (frontend ↔ cae-solver).
 * Структура зеркалит SolverPayload в backend/cae-solver/solver.py.
 */
import func2url from "../../backend/func2url.json";
import { getAccessToken } from "@/lib/auth";

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
  analysis_options?: { diagram_subdivisions?: number };
  analysis_settings?: AnalysisSettings;
}

/** Дефолтные настройки расчёта — общее машиностроение, Мизес, n=1.5 */
export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  industry: "general",
  strength_theory: "mises",
  safety_factor: 1.5,
  custom_deflection_divisor: null,
  check_deflection: true,
  check_strength: true,
  check_buckling: true,
};

// ===== Дефолты =====

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

// ===== API =====

const CAE_API = (func2url as Record<string, string>)["cae-api"];
const CAE_SOLVER = (func2url as Record<string, string>)["cae-solver"];

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  message?: string;
}

async function authCall<T = unknown>(
  url: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = getAccessToken();
  if (token) headers["X-Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const obj = (data as Record<string, unknown>) || {};
  return {
    ok: res.ok,
    status: res.status,
    data: data as T,
    error: (obj.error as string) || undefined,
    message: (obj.message as string) || undefined,
  };
}

export function getProjectModel(projectId: number) {
  return authCall<{
    project: { id: number; name: string; project_type: string; units_length: string; units_force: string };
    version_id: number | null;
    version_number: number | null;
    model: FrameModel | Record<string, never>;
  }>(`${CAE_API}?action=get-model&id=${projectId}`, "GET");
}

export function saveProjectModel(projectId: number, model: FrameModel, comment?: string) {
  return authCall<{ ok: boolean; version_id: number; version_number: number; saved_at: string }>(
    `${CAE_API}?action=save-model&id=${projectId}`,
    "POST",
    { model, comment },
  );
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

export async function runSolver(model: FrameModel, projectId?: number, versionId?: number): Promise<ApiResult<SolverResponse>> {
  const payload = {
    ...model,
    meta: { ...model.meta, project_id: projectId, version_id: versionId },
  };
  return authCall<SolverResponse>(`${CAE_SOLVER}?action=solve`, "POST", payload);
}

// ===== Утилиты =====

export function genId(prefix: string, existing: { id: string }[]): string {
  const used = new Set(existing.map((x) => x.id));
  let i = 1;
  while (used.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}

export function constrainedFromType(t: BoundaryCondition["type"], dim: "2d" | "3d"): DofName[] {
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