import func2url from "../../backend/func2url.json";
import { authorizedFetch } from "@/lib/auth";

const API = (func2url as Record<string, string>)["cae-api"];

export interface CaeTariff {
  slug: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  price_one_off: number;
  max_projects: number;
  max_elements: number;
  max_solves_per_month: number;
  allow_nonlinear: boolean;
  allow_team: boolean;
  max_team_members: number;
}

export interface CaeProject {
  id: number;
  name: string;
  slug: string;
  description: string;
  project_type: string;
  units_length: string;
  units_force: string;
  is_archived: boolean;
  current_version_id: number | null;
  created_at: string | null;
  updated_at: string | null;
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
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
  query?: Record<string, string>,
  auth = false,
): Promise<ApiResult<T>> {
  const qs = new URLSearchParams({ action, ...(query || {}) }).toString();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const doFetch = auth ? authorizedFetch : fetch;
  const res = await doFetch(`${API}?${qs}`, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body || {}),
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

export function fetchCaeTariffs() {
  return call<{ tariffs: CaeTariff[] }>("tariffs", "GET");
}

export function joinWaitlist(payload: {
  email: string;
  full_name?: string;
  role_self?: string;
  purpose?: string;
  referral_source?: string;
}) {
  return call<{ ok: boolean; id?: number; already_in?: boolean; message?: string }>(
    "waitlist",
    "POST",
    payload,
    undefined,
    true,
  );
}

export function listProjects() {
  return call<{ projects: CaeProject[] }>("list-projects", "GET", undefined, undefined, true);
}

export function getProject(id: number) {
  return call<{ project: CaeProject }>("get-project", "GET", undefined, { id: String(id) }, true);
}

export function createProject(payload: {
  name: string;
  description?: string;
  project_type?: string;
  units_length?: string;
  units_force?: string;
}) {
  return call<{ project: CaeProject }>("create-project", "POST", payload, undefined, true);
}

export function updateProject(id: number, payload: Partial<CaeProject>) {
  return call<{ project: CaeProject }>(
    "update-project",
    "PATCH",
    payload,
    { id: String(id) },
    true,
  );
}

export function archiveProject(id: number) {
  return call<{ ok: boolean }>("archive-project", "DELETE", undefined, { id: String(id) }, true);
}