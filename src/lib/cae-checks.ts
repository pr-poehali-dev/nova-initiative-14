/**
 * Проверки элементов по результатам расчёта.
 * Запускается после успешного решения и возвращает список проверок
 * с коэффициентом использования η (нагрузка / предел).
 *
 * Реализованы две проверки:
 *  1. Прогиб элемента: f_max ≤ [f]  → η_def = f_max / [f]
 *  2. Прочность по выбранной теории: σ_экв ≤ [σ] = σ_т / n → η_str = σ_экв / [σ]
 *
 * Источники:
 *  - Феодосьев В.И. «Сопротивление материалов» — теории прочности
 *  - Биргер, Шорр, Иосилевич «Расчёт на прочность деталей машин» — допускаемые [σ]
 *  - Отраслевые нормы для [f] — см. cae-industry.ts
 */
import type { FrameModel, SolverResponse, StrengthTheory } from "./cae-model";
import { DEFAULT_ANALYSIS_SETTINGS } from "./cae-model";
import { getAllowableDeflection, getIndustrySpec } from "./cae-industry";

export type CheckKind = "deflection" | "strength";
export type CheckStatus = "ok" | "warn" | "fail";

export interface ElementCheck {
  element_id: string;
  kind: CheckKind;
  /** Текстовое название проверки для отчёта */
  title: string;
  /** Фактическая величина (численно), м или Па */
  actual: number;
  /** Допускаемая величина */
  allowable: number;
  /** Единица измерения для UI */
  unit: string;
  /** Коэффициент использования η = actual / allowable */
  utilization: number;
  status: CheckStatus;
  /** Пояснение с формулой и источником */
  formula: string;
}

const WARN_THRESHOLD = 0.85;

/**
 * Эквивалентное напряжение из σ_vm (Мизес) пересчётом для других теорий.
 * Solver уже считает sigma_vm. Если выбрана Tresca — пересчёт через приближение
 * σ_tresca ≈ σ_vm · (2/√3) только в случаях чистого изгиба + сдвига; для общей
 * картины принимаем консервативное соотношение σ_tresca = 1.155·σ_vm.
 *
 * Для теории нормальных напряжений (хрупкие) берём только нормальную составляющую,
 * которую solver не возвращает отдельно — поэтому в этом случае используем σ_vm
 * как верхнюю оценку и помечаем пояснением.
 */
function recomputeStress(sigmaVm: number, theory: StrengthTheory): number {
  switch (theory) {
    case "tresca":
      return sigmaVm * 1.1547; // 2/√3
    case "normal":
      return sigmaVm; // консервативная верхняя оценка
    case "mises":
    default:
      return sigmaVm;
  }
}

function theoryLabel(theory: StrengthTheory): string {
  switch (theory) {
    case "tresca":
      return "3-я теория (Треска)";
    case "normal":
      return "1-я теория (нормальные напряжения)";
    case "mises":
    default:
      return "4-я теория (Мизес)";
  }
}

function classify(util: number): CheckStatus {
  if (util > 1) return "fail";
  if (util >= WARN_THRESHOLD) return "warn";
  return "ok";
}

export interface ChecksSummary {
  checks: ElementCheck[];
  max_utilization: number;
  failed_count: number;
  warn_count: number;
  ok_count: number;
}

export function runChecks(model: FrameModel, result: SolverResponse): ChecksSummary {
  const settings = model.analysis_settings ?? DEFAULT_ANALYSIS_SETTINGS;
  const checks: ElementCheck[] = [];
  const industry = getIndustrySpec(settings.industry);

  for (const el of result.elements) {
    const modelEl = model.elements.find((e) => e.id === el.element_id);
    if (!modelEl) continue;
    const mat = model.materials.find((m) => m.id === modelEl.material_id);

    // === Проверка прогиба ===
    if (settings.check_deflection && el.max_values.abs_uy_max !== undefined) {
      const f = el.max_values.abs_uy_max;
      const allowable = getAllowableDeflection(
        settings.industry,
        el.length,
        settings.custom_deflection_divisor,
      );
      const util = allowable > 0 ? f / allowable : 0;
      checks.push({
        element_id: el.element_id,
        kind: "deflection",
        title: "Прогиб",
        actual: f,
        allowable,
        unit: "мм",
        utilization: util,
        status: classify(util),
        formula: `f = ${(f * 1000).toFixed(3)} мм ≤ [f] = ${(allowable * 1000).toFixed(3)} мм (${industry.deflection_label}, ${industry.source})`,
      });
    }

    // === Проверка прочности ===
    if (settings.check_strength && mat?.sigma_yield) {
      const sigmaActual = recomputeStress(el.max_values.abs_sigma_vm_max, settings.strength_theory);
      const allowable = mat.sigma_yield / settings.safety_factor;
      const util = allowable > 0 ? sigmaActual / allowable : 0;
      checks.push({
        element_id: el.element_id,
        kind: "strength",
        title: "Прочность",
        actual: sigmaActual,
        allowable,
        unit: "МПа",
        utilization: util,
        status: classify(util),
        formula: `σ_экв = ${(sigmaActual / 1e6).toFixed(1)} МПа ≤ [σ] = σ_т/n = ${(mat.sigma_yield / 1e6).toFixed(0)}/${settings.safety_factor} = ${(allowable / 1e6).toFixed(1)} МПа (${theoryLabel(settings.strength_theory)})`,
      });
    }
  }

  let maxUtil = 0;
  let failed = 0;
  let warn = 0;
  let ok = 0;
  for (const c of checks) {
    if (c.utilization > maxUtil) maxUtil = c.utilization;
    if (c.status === "fail") failed++;
    else if (c.status === "warn") warn++;
    else ok++;
  }

  return {
    checks,
    max_utilization: maxUtil,
    failed_count: failed,
    warn_count: warn,
    ok_count: ok,
  };
}

/** Цвет для коэффициента использования η */
export function utilizationColor(status: CheckStatus): string {
  switch (status) {
    case "fail":
      return "var(--drawing-accent)"; // красный
    case "warn":
      return "#c98800"; // жёлто-оранжевый
    case "ok":
    default:
      return "#1a8a5a"; // зелёный
  }
}
