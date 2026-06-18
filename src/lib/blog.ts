/**
 * HTTP-обёртки для раздела маркетинга «Статьи для блогов».
 * Закрытое хранилище статей владельца (для Яндекс Дзен и др. площадок):
 * список, чтение, создание, сохранение, удаление. Доступ только для роли
 * владелец (is_owner) — проверяется на бэкенде.
 */
import func2url from "../../backend/func2url.json";
import { authorizedFetch } from "@/lib/auth";

const API = (func2url as Record<string, string>)["research-api"];

export type BlogStatus = "draft" | "ready" | "published" | "archived";
export type BlogPlatform = "dzen" | "vc" | "habr" | "telegram" | "site" | "other";

/** Карточка статьи в списке (без полного текста). */
export interface BlogArticleMeta {
  id: number;
  title: string;
  subtitle: string;
  cover_emoji: string;
  platform: BlogPlatform;
  tags: string;
  status: BlogStatus;
  chars: number;
  created_at: string | null;
  updated_at: string | null;
}

/** Полная статья с текстом. */
export interface BlogArticle extends BlogArticleMeta {
  content: string;
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
  const qs = new URLSearchParams({ action, ...query }).toString();
  const res = await authorizedFetch(`${API}?${qs}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
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

export function listBlogArticles() {
  return call<{ articles: BlogArticleMeta[] }>("blog-list", "GET");
}

export function getBlogArticle(id: number) {
  return call<{ article: BlogArticle }>("blog-get", "GET", undefined, { id: String(id) });
}

export function createBlogArticle(input: Partial<BlogArticle>) {
  return call<{ ok: boolean; id: number }>("blog-create", "POST", input);
}

export function saveBlogArticle(input: {
  id: number;
  title: string;
  subtitle: string;
  cover_emoji: string;
  platform: BlogPlatform;
  tags: string;
  status: BlogStatus;
  content: string;
}) {
  return call<{ ok: boolean }>("blog-save", "POST", input);
}

export function deleteBlogArticle(id: number) {
  return call<{ ok: boolean }>("blog-delete", "POST", { id });
}

export const BLOG_STATUS_LABELS: Record<BlogStatus, string> = {
  draft: "Черновик",
  ready: "Готова",
  published: "Опубликована",
  archived: "В архиве",
};

export const BLOG_PLATFORM_LABELS: Record<BlogPlatform, string> = {
  dzen: "Яндекс Дзен",
  vc: "VC.ru",
  habr: "Хабр",
  telegram: "Telegram",
  site: "Свой сайт",
  other: "Другое",
};

/** Метрики статьи для блога: знаки, слова, ≈ время чтения. */
export function articleStats(content: string): { chars: number; words: number; readMin: number } {
  const chars = content.length;
  const words = (content.match(/[\p{L}\p{N}]+/gu) || []).length;
  const readMin = Math.max(1, Math.round(words / 180));
  return { chars, words, readMin };
}
