/**
 * Валидатор расчётной модели — публичный barrel + orchestrator.
 *
 * Запускается до отправки в solver и при изменении модели для отображения
 * списка проблем. Возвращает плоский массив issues с уровнем (error / warning),
 * человеческим сообщением и ссылкой на проблемный объект.
 *
 * Декомпозиция:
 *  - ./cae/validate/types     — типы ValidationIssue, IssueLevel, IssueTargetKind, EPS
 *  - ./cae/validate/global    — наличие узлов/элементов/опор + кинематическая изменяемость
 *  - ./cae/validate/nodes     — совпадающие координаты, висячие узлы
 *  - ./cae/validate/elements  — целостность ссылок, нулевая длина, материал/сечение
 *  - ./cae/validate/bcs-loads — опоры + нагрузки (целостность ссылок, нулевые величины)
 *
 * Проверки покрывают типовые ошибки студента и выдают конкретные подсказки.
 */
import type { FrameModel } from "./cae-model";
import {
  type ValidationIssue,
  type IssueLevel,
  type IssueTargetKind,
} from "./cae/validate/types";
import { validateGlobal } from "./cae/validate/global";
import { validateNodes } from "./cae/validate/nodes";
import { validateElements } from "./cae/validate/elements";
import { validateBCs, validateLoads } from "./cae/validate/bcs-loads";

export type { ValidationIssue, IssueLevel, IssueTargetKind };

export function validateModel(model: FrameModel): ValidationIssue[] {
  return [
    ...validateGlobal(model),
    ...validateNodes(model),
    ...validateElements(model),
    ...validateBCs(model),
    ...validateLoads(model),
  ];
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}

export function summarizeIssues(issues: ValidationIssue[]): {
  errors: number;
  warnings: number;
} {
  let errors = 0;
  let warnings = 0;
  for (const i of issues) {
    if (i.level === "error") errors++;
    else warnings++;
  }
  return { errors, warnings };
}
