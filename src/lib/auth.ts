import func2url from "../../backend/func2url.json";

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

export function getAccessToken(): string | null {
  return localStorage.getItem(LS_ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(LS_REFRESH);
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
}

export function clearTokens() {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_USER);
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

  const res = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(body || {}) : undefined,
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
  return call<TokenPair>("register", "POST", {
    email,
    password,
    full_name: fullName || "",
    ref_code: options?.refCode || "",
    marketing_consent: options?.marketingConsent || false,
    join_waitlist: options?.joinWaitlist || false,
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