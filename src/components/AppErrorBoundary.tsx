/**
 * Корневой Error Boundary приложения — РАБОТАЕТ ТИХО.
 *
 * Пользователь НИКОГДА не видит никаких плашек, кнопок и сообщений об ошибке.
 * При любом runtime-исключении React-дерева мы в фоне:
 *   1. Очищаем HTTP-кэш и Service Worker (если есть)
 *   2. Делаем hard-reload с cache-buster параметром
 *
 * Защита от петли: не больше 2 авто-релоадов за сессию (общий счётчик с
 * watchdog'ом в index.html через ключ `__cae_autoreload_count`).
 *
 * Если лимит исчерпан — рендерим пустой фон в цвет чертёжного листа,
 * чтобы не моргать белым (это уже крайний край: значит ошибка стабильная,
 * перезагрузки её не решают — но и страшное "что-то сломалось" мы не показываем).
 */
import * as React from "react";
import funcUrls from "../../backend/func2url.json";

interface State {
  error: Error | null;
}

const RELOAD_KEY = "__cae_autoreload_count";
const MAX_AUTO_RELOADS = 2;
const LOG_URL = (funcUrls as Record<string, string>)["recovery-log"];

function getAttempts(): number {
  try {
    return parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}
function bumpAttempts() {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(getAttempts() + 1));
  } catch { /* ignore */ }
}

// Тихая отправка лога. sendBeacon переживает навигацию (мы тут же перезагружаем).
function logRecovery(triggerType: string, errorMessage?: string) {
  if (!LOG_URL) return;
  try {
    const payload = JSON.stringify({
      trigger_type: triggerType,
      error_message: errorMessage ? String(errorMessage).slice(0, 2000) : null,
      attempt: getAttempts() + 1,
      page_url: window.location.href,
    });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(LOG_URL, blob);
    } else {
      fetch(LOG_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch { /* ignore */ }
}

async function silentReload(triggerType: string, errorMessage?: string) {
  if (getAttempts() >= MAX_AUTO_RELOADS) return; // защита от петли
  logRecovery(triggerType, errorMessage);
  bumpAttempts();
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* ignore */ }
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* ignore */ }
  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(Date.now()));
  window.location.replace(url.toString());
}

const CHUNK_RE = /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|error loading dynamically imported module/i;

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };
  private resetTimer: number | null = null;

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
     
    console.error("AppErrorBoundary:", error);
    // Тихо перезагружаемся в фоне — пользователь не видит экрана с ошибкой.
    silentReload("react_error", error?.stack || error?.message || String(error));
  }

  componentDidMount() {
    window.addEventListener("error", this.onWindowError);
    window.addEventListener("unhandledrejection", this.onUnhandledRejection);
    // После 3 секунд успешного рендера сбрасываем счётчик — значит сайт ожил.
    this.resetTimer = window.setTimeout(() => {
      try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* ignore */ }
    }, 3000);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.onWindowError);
    window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
    if (this.resetTimer) window.clearTimeout(this.resetTimer);
  }

  onWindowError = (e: ErrorEvent) => {
    const msg = ((e?.error?.message as string) || e?.message || "") + "";
    if (CHUNK_RE.test(msg)) silentReload("window_error", msg);
  };

  onUnhandledRejection = (e: PromiseRejectionEvent) => {
    const r = e?.reason as { message?: string } | string | undefined;
    const msg = (typeof r === "string" ? r : r?.message || "") + "";
    if (CHUNK_RE.test(msg)) silentReload("unhandled_rejection", msg);
  };

  render() {
    if (!this.state.error) return this.props.children;
    // Тихий фон чертёжного листа. Никаких сообщений и кнопок — параллельно
    // в componentDidCatch уже запустился silentReload(). Если лимит петли
    // исчерпан, останется пустой фон — это лучше, чем технический трейс.
    return <div style={{ minHeight: "100vh", background: "#faf8f0" }} />;
  }
}

export default AppErrorBoundary;