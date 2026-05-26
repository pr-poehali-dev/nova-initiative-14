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

export type CheckKind = "deflection" | "strength" | "buckling";
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

/**
 * Определение коэффициента приведения длины μ для расчёта устойчивости.
 * Анализирует закрепления узлов и шарниры на концах элемента.
 *
 * Случаи по СП 16.13330 / Сопромату Феодосьева:
 *   μ = 0.5 — оба конца защемлены жёстко
 *   μ = 0.7 — один конец защемлён, второй шарнирно опёрт
 *   μ = 1.0 — оба конца шарнирные (классическая формула Эйлера)
 *   μ = 2.0 — один конец защемлён, второй свободен (консольный стержень)
 *
 * Конец считается «защемлённым», если узел зафиксирован по перемещениям + повороту
 * и в элементе нет шарнира с этой стороны. «Шарнирно опёртым» — если узел зафиксирован
 * по перемещениям, но повёрнут свободно (или в элементе стоит шарнир).
 * «Свободный» — узел без опор или с малым числом связей.
 */
function fixityOfEnd(
  nodeId: string,
  elementHinge: boolean,
  model: FrameModel,
): "fixed" | "pinned" | "free" {
  if (elementHinge) return "pinned"; // шарнир в самом стержне ⇒ конец шарнирный
  const bc = model.boundary_conditions.find((b) => b.node_id === nodeId);
  if (!bc) {
    // Узел без опоры. Если к нему сходится 2+ стержня — считаем условно «pinned»,
    // одиночный стержень в этом узле — свободный конец (консоль).
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

function computeMu(end1: "fixed" | "pinned" | "free", end2: "fixed" | "pinned" | "free"): number {
  const set = [end1, end2].sort().join("-");
  if (set === "fixed-fixed") return 0.5;
  if (set === "fixed-pinned") return 0.7;
  if (set === "pinned-pinned") return 1.0;
  if (set === "fixed-free") return 2.0;
  if (set === "free-pinned") return 2.0; // мгновенно изменяемая система — даём консервативное значение
  return 1.0;
}

function muLabel(end1: string, end2: string): string {
  const t = (e: string) => (e === "fixed" ? "защ." : e === "pinned" ? "шарн." : "своб.");
  return `${t(end1)} ↔ ${t(end2)}`;
}

/**
 * Коэффициент продольного изгиба φ по таблицам Ясинского для стали Ст3 / СП 16.13330.
 * Интерполяция между табличными значениями по гибкости λ.
 *
 * Источник: СНиП II-23-81*, СП 16.13330.2017, таблица для стали с σ_т = 240 МПа.
 * При другом σ_т результат корректируется через приведённую гибкость λ̄ = λ·√(σ_т/E)
 * — но для дипломных расчётов чаще используют табличный φ напрямую.
 */
function phiBuckling(lambda: number): number {
  if (lambda <= 0) return 1.0;
  // Табличные точки: λ → φ (для стали Ст3)
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
    try {
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

    // === Проверка устойчивости сжатых стержней ===
    // Считаем только если N < 0 (сжатие). Применима к фермам, шатунам, штокам,
    // винтам, колоннам прессов, стойкам станков, подкосам.
    if (settings.check_buckling !== false && mat?.sigma_yield) {
      const sec = model.sections.find((s) => s.id === modelEl.section_id);
      // Используем максимальное по абсолютной величине осевое усилие N.
      // Знак не всегда сохраняется в abs_N_max — проверяем через эпюру N (минимум).
      // Если в элементе есть растяжение и сжатие — берём пиковое сжатие.
      let nMinSigned = 0;
      for (const v of el.diagrams?.N ?? []) {
        if (v < nMinSigned) nMinSigned = v;
      }
      const nCompression = -nMinSigned; // положительное число для сжатия, 0 — нет сжатия
      if (sec && nCompression > 1e-3) {
        const A = sec.A;
        const iMin = Math.sqrt(Math.min(sec.I_z, sec.I_y ?? sec.I_z) / A); // радиус инерции, м
        const end1 = fixityOfEnd(modelEl.node_start, !!modelEl.hinge_start, model);
        const end2 = fixityOfEnd(modelEl.node_end, !!modelEl.hinge_end, model);
        const mu = computeMu(end1, end2);
        const lambda = (mu * el.length) / iMin;
        const phi = phiBuckling(lambda);
        const allowableSigmaStrength = mat.sigma_yield / settings.safety_factor;
        const sigmaActual = nCompression / A; // напряжение сжатия, Па
        const allowable = phi * allowableSigmaStrength; // φ·[σ]
        const util = allowable > 0 ? sigmaActual / allowable : 0;
        checks.push({
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
        });
      }
    }
    } catch (err) {
      // Сбойный элемент не должен валить весь рендер таблицы проверок.
      // Например, у пользовательского сечения может отсутствовать I_z/I_y.
      console.warn("runChecks: пропускаем элемент", el?.element_id, err);
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