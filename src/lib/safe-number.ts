/**
 * Безопасные утилиты для работы с числами в UI.
 *
 * Проблема, которую они решают: бэкенд-расчёты CAE могут вернуть поле как
 * undefined / null / NaN (например, "запас прочности" если сжатия нет —
 * это бесконечность, и сериализатор пропускает поле). Прямой вызов
 * `value.toFixed(2)` на таком значении валит весь компонент в ErrorBoundary
 * и пользователь видит «белый экран». Эти хелперы гарантируют, что
 * максимум будет показан прочерк "—", но приложение продолжит работать.
 */

/** Безопасная проверка, что значение — конечное число. */
export function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Форматирует число с фиксированным числом знаков после запятой.
 * Если значение не число (undefined/null/NaN/Infinity) — возвращает "—".
 *
 * @example
 *   safeFixed(3.14159, 2)  // "3.14"
 *   safeFixed(undefined)   // "—"
 *   safeFixed(NaN, 2)      // "—"
 */
export function safeFixed(
  v: number | null | undefined,
  digits = 2,
  fallback = "—",
): string {
  if (!isNum(v)) return fallback;
  return v.toFixed(digits);
}

/**
 * Возвращает число или 0, если значение невалидное.
 * Полезно для арифметики: `safeNum(maybeUndef) * 1000`.
 */
export function safeNum(v: number | null | undefined, fallback = 0): number {
  return isNum(v) ? v : fallback;
}
