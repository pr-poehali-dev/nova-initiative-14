/**
 * HTTP-обёртки для backend-функций CAE (cae-api, cae-solver).
 * Используют authCall с проксированием Authorization → X-Authorization.
 */
import func2url from "../../../backend/func2url.json";
import { authorizedFetch } from "@/lib/auth";
import type { FrameModel, SolverResponse } from "./types";
import { withAutoRefVector } from "./utils";

const CAE_API = (func2url as Record<string, string>)["cae-api"];
const CAE_SOLVER = (func2url as Record<string, string>)["cae-solver"];

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  message?: string;
}

async function authCall<T = unknown>(
  url: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const res = await authorizedFetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const obj = (data as Record<string, unknown>) || {};
  return {
    ok: res.ok,
    status: res.status,
    data: data as T,
    error: (obj.error as string) || undefined,
    message: (obj.message as string) || undefined,
  };
}

export function getProjectModel(projectId: number) {
  return authCall<{
    project: {
      id: number;
      name: string;
      project_type: string;
      units_length: string;
      units_force: string;
    };
    version_id: number | null;
    version_number: number | null;
    model: FrameModel | Record<string, never>;
  }>(`${CAE_API}?action=get-model&id=${projectId}`, "GET");
}

export function saveProjectModel(
  projectId: number,
  model: FrameModel,
  comment?: string,
) {
  return authCall<{
    ok: boolean;
    version_id: number;
    version_number: number;
    saved_at: string;
  }>(`${CAE_API}?action=save-model&id=${projectId}`, "POST", { model, comment });
}

/**
 * Прокидывает тип расчёта (линейный / нелинейный P-Δ) из настроек анализа
 * в analysis_options, который читает решатель на бэкенде.
 */
function withAnalysisType(model: FrameModel): FrameModel {
  const analysisType = model.analysis_settings?.analysis_type ?? "linear";
  // Для 3D подставляем авто-ориентацию сечения (ref_vector), чтобы плоские
  // рамы считались по сильной оси, как в 2D.
  const oriented = withAutoRefVector(model);
  return {
    ...oriented,
    analysis_options: {
      ...oriented.analysis_options,
      analysis_type: analysisType,
    },
  };
}

export async function runSolver(
  model: FrameModel,
  projectId?: number,
  versionId?: number,
): Promise<ApiResult<SolverResponse>> {
  const m = withAnalysisType(model);
  const payload = {
    ...m,
    meta: { ...m.meta, project_id: projectId, version_id: versionId },
  };
  return authCall<SolverResponse>(`${CAE_SOLVER}?action=solve`, "POST", payload);
}

/** Демо-расчёт без авторизации (action=demo). Не требует токена. */
export async function runDemoSolver(
  model: FrameModel,
): Promise<ApiResult<SolverResponse>> {
  return authCall<SolverResponse>(`${CAE_SOLVER}?action=demo`, "POST", withAnalysisType(model));
}