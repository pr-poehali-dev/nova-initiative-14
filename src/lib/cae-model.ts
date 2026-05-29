/**
 * Расчётная модель CAE — публичный барель-модуль.
 *
 * Реальные исходники разбиты по ответственности:
 *  - ./cae/types     — TypeScript интерфейсы (Material, Section, FrameModel, SolverResponse, …)
 *  - ./cae/defaults  — DEFAULT_MATERIAL, DEFAULT_SECTION, DEFAULT_ANALYSIS_SETTINGS, emptyModel()
 *  - ./cae/utils     — genId, constrainedFromType
 *  - ./cae/api       — getProjectModel, saveProjectModel, runSolver, ApiResult
 *
 * Этот файл сохраняет единую публичную точку входа `@/lib/cae-model` для
 * 32+ потребителей в src/, чтобы новых правок импортов было меньше. Новые
 * модули предпочтительно импортировать напрямую из подпапок `@/lib/cae/*`.
 */
export type {
  Material,
  Section,
  ModelNode,
  ModelElement,
  DofName,
  BoundaryCondition,
  LoadType,
  ModelLoad,
  StrengthTheory,
  AnalysisType,
  IndustryKind,
  AnalysisSettings,
  FrameModel,
  SolverResponse,
} from "./cae/types";

export {
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_MATERIAL,
  DEFAULT_SECTION,
  emptyModel,
} from "./cae/defaults";

export { genId, constrainedFromType } from "./cae/utils";

export {
  getProjectModel,
  saveProjectModel,
  runSolver,
} from "./cae/api";
export type { ApiResult } from "./cae/api";