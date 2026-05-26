/**
 * Проверка прогиба: f_max ≤ [f] → η_def = f_max / [f].
 * [f] определяется отраслью и длиной элемента (см. cae-industry.ts).
 */
import type { AnalysisSettings, FrameModel, SolverResponse } from "@/lib/cae-model";
import { getAllowableDeflection, getIndustrySpec } from "@/lib/cae-industry";
import { type ElementCheck, classify } from "./shared";

export function checkDeflection(
  model: FrameModel,
  el: SolverResponse["elements"][number],
  settings: AnalysisSettings,
): ElementCheck | null {
  if (!settings.check_deflection) return null;
  if (el.max_values.abs_uy_max === undefined) return null;

  const industry = getIndustrySpec(settings.industry);
  const f = el.max_values.abs_uy_max;
  const allowable = getAllowableDeflection(
    settings.industry,
    el.length,
    settings.custom_deflection_divisor,
  );
  const util = allowable > 0 ? f / allowable : 0;
  // model используется здесь только опосредованно через industry-настройки.
  void model;
  return {
    element_id: el.element_id,
    kind: "deflection",
    title: "Прогиб",
    actual: f,
    allowable,
    unit: "мм",
    utilization: util,
    status: classify(util),
    formula: `f = ${(f * 1000).toFixed(3)} мм ≤ [f] = ${(allowable * 1000).toFixed(3)} мм (${industry.deflection_label}, ${industry.source})`,
  };
}
