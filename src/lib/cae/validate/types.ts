/**
 * Общие типы для валидации расчётной модели.
 *
 * level: error  — расчёт запускать нельзя
 *        warning — расчёт пойдёт, но результат может быть неожиданным
 * target — к чему относится: для подсветки на канве и навигации к проблеме
 */
export type IssueLevel = "error" | "warning";
export type IssueTargetKind = "node" | "element" | "load" | "bc" | "global";

export interface ValidationIssue {
  level: IssueLevel;
  /** Машинный код для дедупликации/тестов */
  code: string;
  /** Текст для пользователя — конкретный, без размытых формулировок */
  message: string;
  /** Краткая подсказка как исправить */
  hint?: string;
  /** К чему относится — для подсветки на канве и навигации */
  target: { kind: IssueTargetKind; id?: string };
}

/** Порог геометрической нулевой длины и совпадения координат, м. */
export const EPS = 1e-9;
