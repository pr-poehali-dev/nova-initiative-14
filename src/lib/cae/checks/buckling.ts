/**
 * Проверка устойчивости сжатых стержней (продольный изгиб).
 * Применима только при N < 0 (сжатие): фермы, шатуны, штоки, винты,
 * колонны прессов, стойки станков, подкосы.
 *
 *   σ_сжат = N/A ≤ φ·[σ]
 *
 * Где:
 *   - μ — коэффициент приведения длины по СП 16.13330 (зависит от закреплений)
 *   - λ = μ·L/i — гибкость
 *   - φ(λ) — коэффициент продольного изгиба по таблицам Ясинского
 *   - [σ] = σ_т / n — допускаемое из проверки прочности
 *
 * Источники: СП 16.13330.2017, СНиП II-23-81*, Феодосьев «Сопромат».
 */
import type {
  AnalysisSettings,
  FrameModel,
  ModelElement,
  SolverResponse,
} from "@/lib/cae-model";
import { type ElementCheck, classify } from "./shared";

type EndFixity = "fixed" | "pinned" | "free";

/**
 * Определение состояния конца стержня по граничным условиям + шарнирам элемента.
 *  - "fixed"  — узел зафиксирован по ux, uy и rz, шарнира нет
 *  - "pinned" — зафиксированы только перемещения / стоит шарнир / 2+ соседних стержня
 *  - "free"   — узел без опор и единственный стержень (консольный конец)
 */
function fixityOfEnd(
  nodeId: string,
  elementHinge: boolean,
  model: FrameModel,
): EndFixity {
  if (elementHinge) return "pinned";
  const bc = model.boundary_conditions.find((b) => b.node_id === nodeId);
  if (!bc) {
    const incident = model.elements.filter(
      (e) => e.node_start === nodeId || e.node_end === nodeId,
    ).length;
    return incident >= 2 ? "pinned" : "free";
  }
  const dofs = new Set(bc.constrained_dofs);
  const hasUx = dofs.has("ux");
  const hasUy = dofs.has("uy");
  const hasRz = dofs.has("rz");
  if (hasUx && hasUy && hasRz) return "fixed";
  if (hasUx || hasUy) return "pinned";
  return "free";
}

/**
 * μ — коэффициент приведения длины:
 *   защ.↔защ.  → 0.5
 *   защ.↔шарн. → 0.7
 *   шарн.↔шарн.→ 1.0
 *   защ.↔своб.→ 2.0
 *   свободно-шарн. → 2.0 (мгновенно изменяемая — даём консервативное значение)
 */
function computeMu(end1: EndFixity, end2: EndFixity): number {
  const set = [end1, end2].sort().join("-");
  if (set === "fixed-fixed") return 0.5;
  if (set === "fixed-pinned") return 0.7;
  if (set === "pinned-pinned") return 1.0;
  if (set === "fixed-free") return 2.0;
  if (set === "free-pinned") return 2.0;
  return 1.0;
}

function muLabel(end1: string, end2: string): string {
  const t = (e: string) => (e === "fixed" ? "защ." : e === "pinned" ? "шарн." : "своб.");
  return `${t(end1)} ↔ ${t(end2)}`;
}

/**
 * Коэффициент продольного изгиба φ по таблицам Ясинского для стали Ст3 / СП 16.13330.
 * Линейная интерполяция между табличными точками.
 *
 * При другом σ_т результат строго следует корректировать через приведённую
 * гибкость λ̄ = λ·√(σ_т/E), но для дипломных расчётов чаще используют
 * табличный φ напрямую — это и заложено.
 */
function phiBuckling(lambda: number): number {
  if (lambda <= 0) return 1.0;
  const table: Array<[number, number]> = [
    [0, 1.0], [10, 0.99], [20, 0.97], [30, 0.95], [40, 0.92],
    [50, 0.89], [60, 0.86], [70, 0.81], [80, 0.75], [90, 0.69],
    [100, 0.6], [110, 0.52], [120, 0.45], [130, 0.4], [140, 0.36],
    [150, 0.32], [160, 0.29], [170, 0.26], [180, 0.23], [190, 0.21],
    [200, 0.19], [210, 0.17], [220, 0.16],
  ];
  if (lambda >= 220) return 0.16 * Math.pow(220 / lambda, 2);
  for (let i = 1; i < table.length; i++) {
    const [l0, p0] = table[i - 1];
    const [l1, p1] = table[i];
    if (lambda <= l1) {
      const k = (lambda - l0) / (l1 - l0);
      return p0 + (p1 - p0) * k;
    }
  }
  return 0.16;
}

export function checkBuckling(
  model: FrameModel,
  modelEl: ModelElement,
  el: SolverResponse["elements"][number],
  settings: AnalysisSettings,
): ElementCheck | null {
  if (settings.check_buckling === false) return null;
  const mat = model.materials.find((m) => m.id === modelEl.material_id);
  if (!mat?.sigma_yield) return null;

  const sec = model.sections.find((s) => s.id === modelEl.section_id);
  if (!sec) return null;

  // Берём минимальное (по знаку) N — пиковое сжатие в элементе.
  let nMinSigned = 0;
  for (const v of el.diagrams?.N ?? []) {
    if (v < nMinSigned) nMinSigned = v;
  }
  const nCompression = -nMinSigned; // > 0 при наличии сжатия
  if (nCompression <= 1e-3) return null;

  const A = sec.A;
  const iMin = Math.sqrt(Math.min(sec.I_z, sec.I_y ?? sec.I_z) / A);
  const end1 = fixityOfEnd(modelEl.node_start, !!modelEl.hinge_start, model);
  const end2 = fixityOfEnd(modelEl.node_end, !!modelEl.hinge_end, model);
  const mu = computeMu(end1, end2);
  const lambda = (mu * el.length) / iMin;
  const phi = phiBuckling(lambda);
  const allowableSigmaStrength = mat.sigma_yield / settings.safety_factor;
  const sigmaActual = nCompression / A;
  const allowable = phi * allowableSigmaStrength;
  const util = allowable > 0 ? sigmaActual / allowable : 0;
  return {
    element_id: el.element_id,
    kind: "buckling",
    title: "Устойчивость",
    actual: sigmaActual,
    allowable,
    unit: "МПа",
    utilization: util,
    status: classify(util),
    formula:
      `λ = μ·L/i = ${mu.toFixed(2)}·${el.length.toFixed(3)}/${iMin.toFixed(4)} = ${lambda.toFixed(1)}; ` +
      `φ = ${phi.toFixed(3)} (СП 16.13330, ${muLabel(end1, end2)}); ` +
      `σ = N/A = ${(sigmaActual / 1e6).toFixed(1)} МПа ≤ φ·[σ] = ${(allowable / 1e6).toFixed(1)} МПа`,
  };
}
