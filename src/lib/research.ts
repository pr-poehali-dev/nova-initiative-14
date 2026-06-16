/**
 * HTTP-обёртки для backend research-api.
 * Хранилище НИР владельца: список, чтение, создание, сохранение с версиями,
 * просмотр истории версий. Доступ только для роли владелец (is_owner) —
 * проверяется на бэкенде.
 */
import func2url from "../../backend/func2url.json";
import { authorizedFetch } from "@/lib/auth";

const API = (func2url as Record<string, string>)["research-api"];

export type ResearchStatus = "draft" | "active" | "archived";

/** Карточка работы в списке (без полного текста). */
export interface ResearchPaperMeta {
  id: number;
  title: string;
  status: ResearchStatus;
  versions: number;
  chars: number;
  created_at: string | null;
  updated_at: string | null;
}

/** Полная работа с текстом. */
export interface ResearchPaper {
  id: number;
  title: string;
  content: string;
  status: ResearchStatus;
  created_at: string | null;
  updated_at: string | null;
}

/** Версия работы (мета). */
export interface ResearchVersion {
  id: number;
  version_no: number;
  title: string;
  note: string | null;
  chars: number;
  created_at: string | null;
}

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  message?: string;
}

async function call<T = unknown>(
  action: string,
  method: "GET" | "POST",
  body?: unknown,
  query: Record<string, string> = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const qs = new URLSearchParams({ action, ...query }).toString();
  const res = await authorizedFetch(`${API}?${qs}`, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
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

export function listResearch() {
  return call<{ papers: ResearchPaperMeta[] }>("list", "GET");
}

export function getResearch(id: number) {
  return call<{ paper: ResearchPaper }>("get", "GET", undefined, { id: String(id) });
}

export function createResearch(title?: string) {
  return call<{ ok: boolean; id: number }>("create", "POST", { title });
}

export function saveResearch(input: {
  id: number;
  title: string;
  content: string;
  status?: ResearchStatus;
  note?: string;
}) {
  return call<{ ok: boolean; version_no: number }>("save", "POST", input);
}

export function listResearchVersions(id: number) {
  return call<{ versions: ResearchVersion[] }>("versions", "GET", undefined, { id: String(id) });
}

export function getResearchVersionContent(versionId: number) {
  return call<{ title: string; content: string; version_no: number }>(
    "version-content",
    "GET",
    undefined,
    { version_id: String(versionId) },
  );
}

/** Человекочитаемые подписи статуса для UI. */
export const RESEARCH_STATUS_LABELS: Record<ResearchStatus, string> = {
  draft: "Черновик",
  active: "В работе",
  archived: "В архиве",
};
