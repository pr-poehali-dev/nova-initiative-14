import func2url from "../../backend/func2url.json";
import { readFirstTouch } from "@/lib/attribution";

export interface SsoUser {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  locale: string;
  email_verified: boolean;
  is_active: boolean;
  roles: string[];
  created_at: string | null;
  is_alpha_tester?: boolean;
  cae_plan?: string;
  /** Флаг администратора (выдаётся вручную в БД). Открывает доступ к админке. */
  is_admin?: boolean;
  /** Флаг владельца продукта (выдаётся вручную в БД). Доступ к внутренней
   *  дорожной карте PLM и владельческим разделам кабинета. */
  is_owner?: boolean;
  /** Личный реф-код пользователя для приглашения друзей. */
  referral_code?: string | null;
  /** Согласие на маркетинговую рассылку. */
  marketing_consent?: boolean;
}

/**
 * Глобальный флаг альфа-теста CAE-сервиса.
 * Пока true — любой зарегистрированный пользователь считается альфа-тестером:
 * - все расчёты бесплатны
 * - лимиты на проекты и элементы сняты
 * - подписка отображается как «Альфа-тест»
 */
export const ALPHA_TEST_MODE = true;

/**
 * Возвращает план пользователя для отображения и логики гейтов.
 * В режиме ALPHA_TEST_MODE всегда возвращает "alpha".
 */
export function getUserPlan(user: SsoUser | null): string {
  if (!user) return "guest";
  if (ALPHA_TEST_MODE) return "alpha";
  return user.cae_plan || "free";
}

export function isAlphaTester(user: SsoUser | null): boolean {
  return Boolean(user) && ALPHA_TEST_MODE;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: SsoUser;
}

const API = (func2url as Record<string, string>)["sso-auth"];
const LS_ACCESS = "sso_access";
const LS_REFRESH = "sso_refresh";
const LS_USER = "sso_user";
const LS_EXPIRES = "sso_expires_at";

/**
 * За сколько секунд до истечения access-токена считаем его «протухшим» и
 * заранее обновляем. Защищает от ситуации, когда токен формально жив, но
 * запрос успеет дойти до сервера уже после фактического истечения.
 */
const TOKEN_REFRESH_SKEW_SEC = 30;

export function getAccessToken(): string | null {
  return localStorage.getItem(LS_ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(LS_REFRESH);
}

/** Unix-время (мс) истечения access-токена или 0, если неизвестно. */
function getAccessExpiresAt(): number {
  const raw = localStorage.getItem(LS_EXPIRES);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function getStoredUser(): SsoUser | null {
  const raw = localStorage.getItem(LS_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SsoUser;
  } catch {
    return null;
  }
}

export function saveTokens(t: TokenPair) {
  localStorage.setItem(LS_ACCESS, t.access_token);
  localStorage.setItem(LS_REFRESH, t.refresh_token);
  localStorage.setItem(LS_USER, JSON.stringify(t.user));
  const expiresAt = Date.now() + (t.expires_in || 0) * 1000;
  localStorage.setItem(LS_EXPIRES, String(expiresAt));
}

export function clearTokens() {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_EXPIRES);
}

/**
 * Признак того, что access-токен скоро истечёт (или уже истёк).
 * Если время истечения неизвестно (старая сессия) — считаем валидным,
 * реактивный refresh по 401 подстрахует.
 */
function isAccessStale(): boolean {
  const expiresAt = getAccessExpiresAt();
  if (!expiresAt) return false;
  return Date.now() >= expiresAt - TOKEN_REFRESH_SKEW_SEC * 1000;
}

// Один общий промис обновления токена, чтобы параллельные запросы не
// запускали refresh одновременно (иначе refresh-токен «прокручивается»
// несколько раз и часть запросов получает невалидный токен).
let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  const r = await refresh(rt);
  if (r.ok && r.data) {
    saveTokens(r.data);
    return r.data.access_token;
  }
  // Честный отказ авторизации — чистим сессию. Сетевые/5xx не трогаем.
  if (r.status === 401 || r.status === 403) clearTokens();
  return null;
}

/** Запускает refresh, дедуплицируя параллельные вызовы. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Возвращает заведомо свежий access-токен, проактивно обновляя его по
 * refresh-токену, если срок жизни истёк или вот-вот истечёт. Используется
 * всеми авторизованными запросами к бэкенду.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const access = getAccessToken();
  if (!access) return null;
  if (isAccessStale()) {
    const fresh = await refreshAccessToken();
    return fresh ?? getAccessToken();
  }
  return access;
}

/**
 * Авторизованный fetch с автоматическим обновлением токена.
 * 1. Подставляет свежий access-токен (с проактивным refresh по сроку).
 * 2. Если сервер ответил 401 — один раз обновляет токен и повторяет запрос.
 * Это устраняет «пустые блоки» после простоя вкладки: токен протух, но
 * данные подгружаются прозрачно, без ручного F5.
 */
export async function authorizedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const buildHeaders = (token: string | null): Headers => {
    const h = new Headers(init.headers || {});
    if (!h.has("Accept")) h.set("Accept", "application/json");
    if (token) h.set("X-Authorization", `Bearer ${token}`);
    return h;
  };

  const token = await getValidAccessToken();
  let res = await fetch(url, { ...init, headers: buildHeaders(token) });

  if (res.status === 401 && getRefreshToken()) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      res = await fetch(url, { ...init, headers: buildHeaders(fresh) });
    }
  }
  return res;
}

async function call<T = unknown>(
  action: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
  authToken?: string,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string; message?: string }> {
  const url = `${API}?action=${action}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (authToken) headers["X-Authorization"] = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body || {}) : undefined,
    });
  } catch {
    // Сетевая ошибка (нет соединения, таймаут, обрыв). Это НЕ ошибка
    // авторизации — отдаём status 0, чтобы вызывающий не сбрасывал сессию.
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

export interface RegisterOptions {
  /** Реф-код пригласившего (из ?ref=ABCDEFGH на лендинге). */
  refCode?: string;
  /** Согласие на маркетинговую рассылку. */
  marketingConsent?: boolean;
  /** Хочу попасть в лист ожидания приоритетной волны. */
  joinWaitlist?: boolean;
}

export async function register(
  email: string,
  password: string,
  fullName?: string,
  options?: RegisterOptions,
) {
  // Источник ПЕРВОГО касания — для атрибуции регистрации (откуда пришёл).
  const attribution = readFirstTouch();
  return call<TokenPair>("register", "POST", {
    email,
    password,
    full_name: fullName || "",
    ref_code: options?.refCode || "",
    marketing_consent: options?.marketingConsent || false,
    join_waitlist: options?.joinWaitlist || false,
    attribution: attribution || undefined,
  });
}

export async function login(email: string, password: string) {
  return call<TokenPair>("login", "POST", { email, password });
}

export async function refresh(refreshToken: string) {
  return call<TokenPair>("refresh", "POST", { refresh_token: refreshToken });
}

export async function logout(refreshToken: string) {
  return call("logout", "POST", { refresh_token: refreshToken });
}

export async function fetchUserInfo(accessToken: string) {
  return call<{ user: SsoUser }>("userinfo", "GET", undefined, accessToken);
}

// ───────────────── Админ-статистика посещений ─────────────────

export interface SourceStat {
  sourceType: string;
  sourceLabel: string;
  count: number;
}

export interface DailyStat {
  date: string;
  visits: number;
  signups: number;
}

export interface PageStat {
  path: string;
  title: string;
  unique: number;
  total: number;
}

export interface AdminStats {
  period_days: number;
  totals: { visits: number; signups: number; sources: number };
  visits_by_source: SourceStat[];
  signups_by_source: SourceStat[];
  top_pages: PageStat[];
  daily: DailyStat[];
}

/** Сводная статистика посещений и регистраций по источникам (только админ). */
export async function fetchAdminStats(
  days = 30,
): Promise<{ ok: boolean; status: number; data: AdminStats | null }> {
  const url = `${API}?action=admin-stats&days=${days}`;
  const res = await authorizedFetch(url);
  let data: AdminStats | null = null;
  try {
    data = (await res.json()) as AdminStats;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data: res.ok ? data : null };
}

/**
 * Повторно отправляет письмо с подтверждением email.
 * Бэкенд намеренно отвечает 200 даже если email не зарегистрирован —
 * чтобы не раскрывать существование аккаунта.
 */
export async function resendVerification(email: string) {
  return call<{ ok: boolean; email_sent?: boolean; message?: string }>(
    "resend-verification",
    "POST",
    { email },
  );
}

export type OAuthProvider = "yandex" | "vk" | "google" | "mailru";

export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  yandex: "Яндекс",
  vk: "ВКонтакте",
  google: "Google",
  mailru: "Mail.ru",
};

export interface OauthProvidersResp {
  providers: OAuthProvider[];
  vk_sdk?: { enabled: boolean; app_id: string | null };
}

export async function fetchOauthProviders() {
  return call<OauthProvidersResp>("oauth-providers", "GET");
}

export async function oauthVkSdkLogin(payload: {
  access_token: string;
  sub_provider?: "vk" | "mail_ru" | "ok_ru";
  user?: Record<string, unknown>;
  redirect_after?: string;
}) {
  return call<TokenPair & { redirect_after?: string }>(
    "oauth-vk-sdk",
    "POST",
    payload,
  );
}

export async function oauthStart(provider: OAuthProvider, redirectAfter = "/account") {
  const url = `${API}?action=oauth-start&provider=${provider}&redirect_after=${encodeURIComponent(redirectAfter)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`oauth-start ${res.status}`);
  return (await res.json()) as { authorize_url: string; provider: OAuthProvider };
}

export async function oauthCallback(code: string, state: string) {
  return call<TokenPair & { redirect_after?: string }>(
    "oauth-callback",
    "POST",
    { code, state },
  );
}

export interface LinkedIdentity {
  provider: OAuthProvider;
  email: string | null;
  created_at: string | null;
  last_login_at: string | null;
}

export interface IdentitiesResp {
  identities: LinkedIdentity[];
  has_password: boolean;
  available_providers: OAuthProvider[];
}

/** Список привязанных способов входа текущего пользователя. */
export async function fetchIdentities(accessToken: string) {
  return call<IdentitiesResp>("identities", "GET", undefined, accessToken);
}

/** Отвязать провайдера от аккаунта. */
export async function unlinkIdentity(accessToken: string, provider: OAuthProvider) {
  return call<{ unlinked: boolean; provider: string }>(
    "identity-unlink",
    "POST",
    { provider },
    accessToken,
  );
}

/**
 * Запуск привязки нового провайдера из ЛК.
 * link=1 + Bearer-токен → backend привяжет провайдера к текущему аккаунту.
 */
export async function oauthStartLink(provider: OAuthProvider, accessToken: string, redirectAfter = "/account") {
  const url = `${API}?action=oauth-start&link=1&provider=${provider}&redirect_after=${encodeURIComponent(redirectAfter)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Authorization": `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`oauth-start ${res.status}`);
  return (await res.json()) as { authorize_url: string; provider: OAuthProvider };
}

// ──────────────────────────── Профиль ────────────────────────────

/** Авторизованный POST к sso-auth с авто-обновлением токена. */
async function authCall<T = unknown>(action: string, body: Record<string, unknown>) {
  const res = await authorizedFetch(`${API}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* ignore */ }
  const obj = (data as Record<string, unknown>) || {};
  return {
    ok: res.ok,
    status: res.status,
    data: data as T,
    error: (obj.error as string) || undefined,
    message: (obj.message as string) || undefined,
  };
}

/** Сменить отображаемое имя. Возвращает обновлённый профиль. */
export async function updateProfile(fullName: string) {
  return authCall<{ ok: boolean; user: SsoUser }>("update-profile", { full_name: fullName });
}

/** Сменить пароль. Если пароль уже есть — нужен currentPassword. */
export async function changePassword(newPassword: string, currentPassword?: string) {
  return authCall<{ ok: boolean; message?: string }>("change-password", {
    new_password: newPassword,
    current_password: currentPassword || "",
  });
}

// ──────────────────────────── Админ ────────────────────────────

export interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  is_owner: boolean;
  email_verified: boolean;
  total_points: number;
  created_at: string | null;
  last_login_at: string | null;
}

/** Список пользователей для админки (с поиском). */
export async function adminListUsers(q = "") {
  const url = `${API}?action=admin-users${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const res = await authorizedFetch(url, { method: "GET" });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return {
    ok: res.ok,
    status: res.status,
    data: data as { users: AdminUser[] } | null,
  };
}

/** Выдать/снять флаг роли (is_admin | is_owner). */
export async function adminSetRole(userId: number, field: "is_admin" | "is_owner", value: boolean) {
  return authCall<{ ok: boolean }>("admin-set-role", { user_id: userId, field, value });
}

/** Заблокировать/разблокировать вход пользователя. */
export async function adminToggleActive(userId: number, value: boolean) {
  return authCall<{ ok: boolean }>("admin-toggle-active", { user_id: userId, value });
}

/** Начислить (или списать) баллы пользователю. */
export async function adminAwardPoints(userId: number, points: number, note: string) {
  return authCall<{ ok: boolean; total_points: number }>("admin-award-points", {
    user_id: userId,
    points,
    note,
  });
}