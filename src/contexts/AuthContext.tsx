import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  type SsoUser,
  type RegisterOptions,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveTokens,
  clearTokens,
  login as apiLogin,
  register as apiRegister,
  refresh as apiRefresh,
  logout as apiLogout,
  fetchUserInfo,
} from "@/lib/auth";

interface AuthState {
  user: SsoUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthApi extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName?: string, options?: RegisterOptions) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: getStoredUser(),
    loading: true,
    error: null,
  });

  const handleTokens = useCallback((t: { user: SsoUser; access_token: string; refresh_token: string; token_type: string; expires_in: number }) => {
    saveTokens(t);
    setState({ user: t.user, loading: false, error: null });
  }, []);

  const refreshUser = useCallback(async () => {
    const access = getAccessToken();
    if (!access) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const res = await fetchUserInfo(access);
    if (res.ok && res.data?.user) {
      setState({ user: res.data.user, loading: false, error: null });
      localStorage.setItem("sso_user", JSON.stringify(res.data.user));
      return;
    }

    // Различаем НАСТОЯЩУЮ ошибку авторизации (401/403) и временный сбой
    // (нет сети — status 0, или серверная 5xx). На временном сбое НЕЛЬЗЯ
    // разлогинивать: токены валидны, просто запрос не дошёл. Оставляем
    // сохранённого пользователя залогиненным — это и есть причина бага,
    // когда сессия «слетала» от случайного обрыва связи.
    const isAuthError = res.status === 401 || res.status === 403;
    if (!isAuthError) {
      const stored = getStoredUser();
      setState({ user: stored, loading: false, error: null });
      return;
    }

    // access протух/невалиден — пробуем обновить по refresh-токену.
    const rt = getRefreshToken();
    if (!rt) {
      clearTokens();
      setState({ user: null, loading: false, error: null });
      return;
    }
    const r = await apiRefresh(rt);
    if (r.ok && r.data) {
      handleTokens(r.data);
    } else if (r.status === 401 || r.status === 403) {
      // refresh-токен тоже отвергнут сервером — это честный разлогин.
      clearTokens();
      setState({ user: null, loading: false, error: null });
    } else {
      // refresh не удался из-за сети/5xx — сохраняем сессию, не разлогиниваем.
      const stored = getStoredUser();
      setState({ user: stored, loading: false, error: null });
    }
  }, [handleTokens]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await apiLogin(email, password);
    if (res.ok && res.data) {
      handleTokens(res.data);
      return true;
    }
    setState((s) => ({ ...s, loading: false, error: res.message || "Ошибка входа" }));
    return false;
  }, [handleTokens]);

  const register = useCallback(async (email: string, password: string, fullName?: string, options?: RegisterOptions): Promise<boolean> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await apiRegister(email, password, fullName, options);
    if (res.ok && res.data) {
      handleTokens(res.data);
      return true;
    }
    setState((s) => ({ ...s, loading: false, error: res.message || "Ошибка регистрации" }));
    return false;
  }, [handleTokens]);

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    if (rt) {
      try { await apiLogout(rt); } catch { /* ignore */ }
    }
    clearTokens();
    setState({ user: null, loading: false, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}