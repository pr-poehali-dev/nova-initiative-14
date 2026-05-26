/**
 * Проверка прочности по выбранной теории (Мизес / Треска / нормальные напряжения).
 *
 *   σ_экв ≤ [σ] = σ_т / n
 *
 * σ_т берётся из материала, n — из настроек анализа (safety_factor).
 */
import type {
  AnalysisSettings,
  FrameModel,
  ModelElement,
  SolverResponse,
} from "@/lib/cae-model";
import {
  type ElementCheck,
  classify,
  recomputeStress,
  theoryLabel,
} from "./shared";

export function checkStrength(
  model: FrameModel,
  modelEl: ModelElement,
  el: SolverResponse["elements"][number],
  settings: AnalysisSettings,
): ElementCheck | null {
  if (!settings.check_strength) return null;
  const mat = model.materials.find((m) => m.id === modelEl.material_id);
  if (!mat?.sigma_yield) return null;

  const sigmaActual = recomputeStress(
    el.max_values.abs_sigma_vm_max,
    settings.strength_theory,
  );
  const allowable = mat.sigma_yield / settings.safety_factor;
  const util = allowable > 0 ? sigmaActual / allowable : 0;
  return {
    element_id: el.element_id,
    kind: "strength",
    title: "Прочность",
    actual: sigmaActual,
    allowable,
    unit: "МПа",
    utilization: util,
    status: classify(util),
    formula:
      `σ_экв = ${(sigmaActual / 1e6).toFixed(1)} МПа ≤ [σ] = σ_т/n = ` +
      `${(mat.sigma_yield / 1e6).toFixed(0)}/${settings.safety_factor} = ` +
      `${(allowable / 1e6).toFixed(1)} МПа (${theoryLabel(settings.strength_theory)})`,
  };
}
