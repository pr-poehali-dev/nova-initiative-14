/**
 * HTTP-обёртки для backend referral-api.
 * Включает получение реф-профиля, рейтинг и помощник для сборки ссылки приглашения.
 */
import func2url from "../../backend/func2url.json";
import { getAccessToken } from "@/lib/auth";

const API = (func2url as Record<string, string>)["referral-api"];

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface Achievement {
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  points: number;
  awarded: boolean;
  awarded_at: string | null;
  /** Прогресс для ачивок с числовым порогом. null — бинарная ачивка. */
  progress: AchievementProgress | null;
}

export interface ReferralProfile {
  referral_code: string;
  total_points: number;
  referrals_count: number;
  active_referrals_count: number;
  rank: number;
  /** Привязан ли пользователь к пригласившему (применён ли код). */
  has_referrer: boolean;
  achievements: Achievement[];
}

export interface ReferralWeekStats {
  /** Расчётов за последние 7 дней. */
  runs: number;
  /** Проектов, с которыми работал за неделю. */
  active_projects: number;
  /** Средняя сложность — элементов в расчёте (null, если расчётов не было). */
  avg_complexity: number | null;
  /** Среднее отношение элементов к узлам. */
  avg_ratio: number | null;
}

export interface ReferralFriend {
  name: string;
  joined_at: string | null;
  /** Делал ли расчёты хоть раз (активирован). */
  ever_active: boolean;
  week: ReferralWeekStats;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  active_referrals: number;
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
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = getAccessToken();
  if (token) headers["X-Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}?action=${action}`, {
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

export function getReferralProfile() {
  return call<ReferralProfile>("get-profile", "GET");
}

export function getLeaderboard() {
  return call<{ leaders: LeaderboardEntry[] }>("leaderboard", "GET");
}

/** Список приглашённых друзей с их активностью за неделю. */
export function getMyReferrals() {
  return call<{ referrals: ReferralFriend[] }>("referrals", "GET");
}

/** Применить код приглашения позже (если зарегистрировался не по нему). */
export function applyRefCode(refCode: string) {
  return call<{ ok: boolean }>("apply-ref-code", "POST", { ref_code: refCode });
}

/** Красивый домен сайта в кириллице — для ссылок, которыми делятся. */
const PRETTY_HOST = "диплом-инж.рф";

/**
 * Собирает реферальную ссылку на лендинг CAE в человекочитаемом виде
 * (кириллический домен, без punycode-«мусора» вроде xn--…).
 * Браузеры и мессенджеры корректно открывают такие ссылки.
 */
export function buildReferralUrl(refCode: string | null | undefined): string {
  if (!refCode) return "";
  return `https://${PRETTY_HOST}/cae?ref=${refCode}`;
}

const REF_STORAGE_KEY = "pending_ref_code";

/**
 * Сохраняет реф-код в localStorage, чтобы он не потерялся при переходах
 * между /cae → /register. Срок жизни — 30 дней.
 */
export function rememberRefCode(code: string) {
  try {
    const payload = JSON.stringify({
      code: code.toUpperCase().slice(0, 16),
      saved_at: Date.now(),
    });
    localStorage.setItem(REF_STORAGE_KEY, payload);
  } catch {
    /* localStorage недоступен — игнорируем */
  }
}

const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Возвращает сохранённый реф-код, если он ещё не протух. */
export function getRememberedRefCode(): string | null {
  try {
    const raw = localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string; saved_at?: number };
    if (!parsed.code || !parsed.saved_at) return null;
    if (Date.now() - parsed.saved_at > REF_TTL_MS) {
      localStorage.removeItem(REF_STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function clearRememberedRefCode() {
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    /* localStorage недоступен — игнорируем */
  }
}