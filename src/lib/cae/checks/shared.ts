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
 *
 * Для балки напряжённое состояние плоское (нормальное σ + касательное τ),
 * для него точно:
 *   σ_Мизес = √(σ² + 3τ²),  σ_Трэска = √(σ² + 4τ²).
 * Отношение σ_Трэска/σ_Мизес лежит в диапазоне:
 *   1.0   — при чистом изгибе (τ = 0, теории совпадают),
 *   2/√3 ≈ 1.1547 — при чистом сдвиге (σ = 0).
 *
 * Solver возвращает только σ_vm (без разложения на σ и τ), поэтому точный
 * пересчёт невозможен. Берём ВЕРХНЮЮ (консервативную) границу 1.1547·σ_vm:
 * она никогда не занижает напряжение, то есть запас прочности оценивается
 * в безопасную сторону. Это отражено в пояснении к проверке.
 *
 * Для теории нормальных напряжений (хрупкие материалы) нужна только
 * нормальная составляющая, которую solver не возвращает отдельно — поэтому
 * используем σ_vm как верхнюю оценку.
 */
export const TRESCA_UPPER_BOUND = 2 / Math.sqrt(3); // ≈ 1.1547

export function recomputeStress(sigmaVm: number, theory: StrengthTheory): number {
  switch (theory) {
    case "tresca":
      return sigmaVm * TRESCA_UPPER_BOUND; // верхняя (консервативная) граница
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
      return "3-я теория (Треска, верхняя оценка)";
    case "normal":
      return "1-я теория (нормальные напряжения)";
    case "mises":
    default:
      return "4-я теория (Мизес)";
  }
}