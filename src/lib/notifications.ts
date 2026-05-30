/**
 * HTTP-обёртки для backend notifications-api.
 * Колокольчик уведомлений: список, счётчик непрочитанных, отметки прочтения.
 */
import func2url from "../../backend/func2url.json";
import { getAccessToken } from "@/lib/auth";

const API = (func2url as Record<string, string>)["notifications-api"];

export type NotificationType =
  | "ticket_reply"
  | "ticket_resolved"
  | "fix"
  | "update"
  | "system";

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  ticket_id: number | null;
  is_read: boolean;
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
  const token = getAccessToken();
  if (token) headers["X-Authorization"] = `Bearer ${token}`;
  const qs = new URLSearchParams({ action, ...query }).toString();
  let res: Response;
  try {
    res = await fetch(`${API}?${qs}`, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, data: null, error: "network_error" };
  }
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

export function listNotifications(limit = 30) {
  return call<{ notifications: AppNotification[] }>("list", "GET", undefined, {
    limit: String(limit),
  });
}

export function getUnreadCount() {
  return call<{ unread: number }>("unread-count", "GET");
}

export function markNotificationRead(id: number) {
  return call<{ ok: boolean }>("mark-read", "POST", { id });
}

export function markAllNotificationsRead() {
  return call<{ ok: boolean }>("mark-all-read", "POST");
}

// === Журнал версий CAE ===

export type ChangelogCategory = "feature" | "fix" | "improvement" | "breaking";

export interface ChangelogEntry {
  id: number;
  version: string;
  title: string;
  category: ChangelogCategory;
  body: string | null;
  released_at: string | null;
}

export function listChangelog(limit = 50) {
  return call<{ changelog: ChangelogEntry[] }>("changelog-list", "GET", undefined, {
    limit: String(limit),
  });
}

export function createChangelogEntry(input: {
  version: string;
  title: string;
  category?: ChangelogCategory;
  body?: string;
  notify?: boolean;
}) {
  return call<{ ok: boolean; id: number }>("changelog-create", "POST", input);
}