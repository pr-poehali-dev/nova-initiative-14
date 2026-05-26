/**
 * Проверки элементов по результатам расчёта — публичный barrel + orchestrator.
 *
 * Декомпозиция:
 *  - ./cae/checks/shared      — типы (CheckKind, ElementCheck), classify(), color()
 *  - ./cae/checks/deflection  — проверка прогиба f ≤ [f]
 *  - ./cae/checks/strength    — проверка прочности σ_экв ≤ σ_т/n
 *  - ./cae/checks/buckling    — устойчивость сжатых стержней σ ≤ φ·[σ]
 *
 * Источники:
 *  - Феодосьев В.И. «Сопротивление материалов»
 *  - Биргер, Шорр, Иосилевич «Расчёт на прочность деталей машин»
 *  - СП 16.13330.2017, СНиП II-23-81* (таблицы φ Ясинского)
 *  - Отраслевые нормы [f] — см. cae-industry.ts
 */
import type { FrameModel, SolverResponse } from "./cae-model";
import { DEFAULT_ANALYSIS_SETTINGS } from "./cae-model";
import {
  type ElementCheck,
  type CheckKind,
  type CheckStatus,
  utilizationColor,
} from "./cae/checks/shared";
import { checkDeflection } from "./cae/checks/deflection";
import { checkStrength } from "./cae/checks/strength";
import { checkBuckling } from "./cae/checks/buckling";

export type { CheckKind, CheckStatus, ElementCheck };
export { utilizationColor };

export interface ChecksSummary {
  checks: ElementCheck[];
  max_utilization: number;
  failed_count: number;
  warn_count: number;
  ok_count: number;
}

/**
 * Запускает все включённые проверки для каждого элемента и аккумулирует сводку.
 * Сбой одного элемента (например, нет I_z у пользовательского сечения) не должен
 * валить весь рендер таблицы — оборачиваем тело цикла в try/catch.
 */
export function runChecks(model: FrameModel, result: SolverResponse): ChecksSummary {
  const settings = model.analysis_settings ?? DEFAULT_ANALYSIS_SETTINGS;
  const checks: ElementCheck[] = [];

  for (const el of result.elements) {
    try {
      const modelEl = model.elements.find((e) => e.id === el.element_id);
      if (!modelEl) continue;

      const def = checkDeflection(model, el, settings);
      if (def) checks.push(def);

      const str = checkStrength(model, modelEl, el, settings);
      if (str) checks.push(str);

      const buc = checkBuckling(model, modelEl, el, settings);
      if (buc) checks.push(buc);
    } catch (err) {
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
