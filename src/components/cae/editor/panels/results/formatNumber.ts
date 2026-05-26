/**
 * Безопасный форматтер чисел для панели результатов CAE.
 *
 * Принимает number | null | undefined: бэкенд CAE может пропустить поле
 * (например, max_displacement если расчёт ещё не сошёлся). Прямой `.toFixed(...)`
 * на null/undefined валил компонент в ErrorBoundary → «белый экран».
 *
 * Поведение:
 *  - не-число / NaN / Infinity → "—"
 *  - |v| >= 1000           → экспоненциальная запись 2 знака
 *  - 0 < |v| < 0.001       → экспоненциальная запись 2 знака
 *  - иначе                 → fixed(digits)
 */
export function formatNumber(v: number | null | undefined, digits = 4): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toExponential(2);
  if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2);
  return v.toFixed(digits);
}
