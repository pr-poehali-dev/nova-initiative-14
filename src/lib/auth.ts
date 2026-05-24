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

export async function register(email: string, password: string, fullName?: string) {
  return call<TokenPair>("register", "POST", {
    email,
    password,
    full_name: fullName || "",
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
