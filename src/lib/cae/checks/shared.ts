/**
 * Общие типы и утилиты для проверок CAE: deflection, strength, buckling.
 *
 *  - CheckKind / CheckStatus / ElementCheck — типы результата проверки
 *  - classify(util)         — η → "ok" / "warn" / "fail" по WARN_THRESHOLD = 0.85
 *  - utilizationColor       — цвет статуса для UI
 */
import type { StrengthTheory } from "@/lib/cae-model";

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

export const WARN_THRESHOLD = 0.85;

export function classify(util: number): CheckStatus {
  if (util > 1) return "fail";
  if (util >= WARN_THRESHOLD) return "warn";
  return "ok";
}

/** Цвет для коэффициента использования η */
export function utilizationColor(status: CheckStatus): string {
  switch (status) {
    case "fail":
      return "var(--drawing-accent)";
    case "warn":
      return "#c98800";
    case "ok":
    default:
      return "#1a8a5a";
  }
}

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
export function recomputeStress(sigmaVm: number, theory: StrengthTheory): number {
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

export function theoryLabel(theory: StrengthTheory): string {
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
