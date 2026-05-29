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
import { requestReloadConfirmation } from "@/lib/reloadGuard";

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

/** Жёсткая перезагрузка с очисткой кэша/SW. Вызывается напрямую или после
 *  подтверждения пользователем (когда были несохранённые данные). */
export async function performHardReload() {
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

async function silentReload(triggerType: string, errorMessage?: string) {
  if (getAttempts() >= MAX_AUTO_RELOADS) return; // защита от петли
  // Если в редакторе есть несохранённые данные — не перезагружаем молча,
  // а просим подтверждение (popup покажет ReloadConfirmDialog).
  if (requestReloadConfirmation(triggerType)) {
    logRecovery(triggerType + "_deferred", errorMessage);
    return;
  }
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
    // Не оставляем «белый фон». Если лимит авто-релоадов исчерпан и страница
    // продолжает падать — показываем тихий понятный экран с кнопкой
    // «Перезагрузить вручную». Это намного лучше пустоты: пользователь
    // понимает, что произошло, и может действовать.
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#faf8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#1a1a1a",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#6b6b6b",
              marginBottom: 16,
            }}
          >
            Диплом-Инж.рф
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>
            Страница не отрисовалась
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 24px", color: "#3a3a3a" }}>
            Это разовый сбой. Нажмите кнопку ниже — страница откроется заново.
          </p>
          <button
            type="button"
            onClick={() => {
              try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* ignore */ }
              const url = new URL(window.location.href);
              url.searchParams.set("_r", String(Date.now()));
              window.location.href = url.toString();
            }}
            style={{
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 500,
              background: "#1a1a1a",
              color: "#faf8f0",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;