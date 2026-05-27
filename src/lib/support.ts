/**
 * HTTP-обёртки для backend support-api.
 * Тикеты техподдержки: создание (юзер/гость), мои тикеты, админ-модерация.
 */
import func2url from "../../backend/func2url.json";
import { getAccessToken } from "@/lib/auth";

const API = (func2url as Record<string, string>)["support-api"];

export type TicketKind = "bug" | "feature" | "question" | "other";
export type TicketImportance = "low" | "normal" | "high" | "critical";
export type TicketStatus = "open" | "in_progress" | "resolved" | "rejected" | "duplicate";

export interface SupportTicket {
  id: number;
  user_id: number | null;
  email: string | null;
  user_email?: string | null;
  user_full_name?: string | null;
  kind: TicketKind;
  title: string;
  body?: string;
  self_importance: TicketImportance;
  status: TicketStatus;
  page_url?: string | null;
  awarded_points: number;
  admin_note?: string | null;
  assigned_admin_id?: number | null;
  resolved_at?: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export interface CreateTicketInput {
  title: string;
  body: string;
  kind?: TicketKind;
  self_importance?: TicketImportance;
  page_url?: string;
  email?: string;
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
  const token = getAccessToken();
  if (token) headers["X-Authorization"] = `Bearer ${token}`;
  const qs = new URLSearchParams({ action, ...query }).toString();
  const res = await fetch(`${API}?${qs}`, {
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

export function createTicket(input: CreateTicketInput) {
  return call<{ ok: boolean; ticket_id: number }>("create-ticket", "POST", input);
}

export function getMyTickets() {
  return call<{ tickets: SupportTicket[] }>("my-tickets", "GET");
}

export function adminListTickets(status?: TicketStatus) {
  return call<{ tickets: SupportTicket[] }>(
    "admin-list",
    "GET",
    undefined,
    status ? { status } : {},
  );
}

export function adminUpdateTicket(input: {
  ticket_id: number;
  status?: TicketStatus;
  admin_note?: string;
  award_points?: number;
}) {
  return call<{ ok: boolean }>("admin-update", "POST", input);
}

/** Человекочитаемые подписи для UI. */
export const KIND_LABELS: Record<TicketKind, string> = {
  bug: "Ошибка",
  feature: "Идея",
  question: "Вопрос",
  other: "Другое",
};

export const IMPORTANCE_LABELS: Record<TicketImportance, string> = {
  low: "Незначительно",
  normal: "Обычная",
  high: "Важно",
  critical: "Критично",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Открыта",
  in_progress: "В работе",
  resolved: "Решена",
  rejected: "Отклонена",
  duplicate: "Дубликат",
};
