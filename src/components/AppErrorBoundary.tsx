/**
 * Корневой Error Boundary приложения.
 *
 * Зачем: если где-то в дереве React случилась runtime-ошибка (например, после
 * деплоя у пользователя в кэше остался старый чанк, несовместимый с новым
 * index.html — это типичная причина "белого экрана") — вместо пустого фона
 * мы покажем явное сообщение и две кнопки: "Перезагрузить" и
 * "Сбросить кэш и перезагрузить". Так пользователь не уйдёт с сайта.
 *
 * Дополнительно: ловим глобальные window.onerror и unhandledrejection,
 * связанные с динамической подгрузкой чанков (`ChunkLoadError`,
 * `Failed to fetch dynamically imported module`) — это самый частый
 * сценарий "белого экрана после деплоя". При таких ошибках мы один раз
 * делаем hard reload с очисткой Service Worker / кэша.
 */
import * as React from "react";

interface State {
  error: Error | null;
}

const CACHE_BUST_FLAG = "__cae_cache_busted_at";

/** Жёсткая перезагрузка с попыткой убить кэш и SW. */
async function hardReload() {
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
  // Добавим cache-buster в URL, чтобы CDN не отдал старую страницу
  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(Date.now()));
  window.location.replace(url.toString());
}

/** Похоже ли это на ошибку загрузки чанка (после деплоя)? */
function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as Error)?.message || String(err);
  const name = (err as Error)?.name || "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

/** Один раз за сессию автоматически чиним устаревший кэш чанков. */
function autoFixOnChunkError(err: unknown) {
  if (!isChunkLoadError(err)) return false;
  try {
    const already = sessionStorage.getItem(CACHE_BUST_FLAG);
    if (already) return false; // уже пробовали — не зацикливаемся
    sessionStorage.setItem(CACHE_BUST_FLAG, String(Date.now()));
  } catch { /* ignore */ }
  hardReload();
  return true;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
     
    console.error("AppErrorBoundary:", error);
    autoFixOnChunkError(error);
  }

  componentDidMount() {
    // Глобально слушаем ошибки загрузки модулей и unhandled rejections.
    window.addEventListener("error", this.onWindowError);
    window.addEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.onWindowError);
    window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  onWindowError = (e: ErrorEvent) => {
    autoFixOnChunkError(e.error || e.message);
  };

  onUnhandledRejection = (e: PromiseRejectionEvent) => {
    autoFixOnChunkError(e.reason);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#faf8f0",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          color: "#1a1a2e",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            border: "2px solid #1a1a2e",
            background: "#ffffff",
            padding: "24px 22px",
          }}
        >
          <p
            style={{
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#3a3a5e",
              margin: 0,
            }}
          >
            Диплом-Инж.рф
          </p>
          <h1 style={{ fontSize: 22, margin: "8px 0 12px", fontWeight: 700 }}>
            Страница не загрузилась
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 18px" }}>
            Скорее всего, в браузере сохранилась устаревшая версия сайта после
            обновления. Нажми «Сбросить кэш и перезагрузить» — это решит
            проблему за секунду.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button
              onClick={() => hardReload()}
              style={{
                flex: "1 1 auto",
                minHeight: 44,
                padding: "10px 18px",
                background: "#c0392b",
                color: "#fff",
                border: "2px solid #c0392b",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Сбросить кэш и перезагрузить
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                flex: "1 1 auto",
                minHeight: 44,
                padding: "10px 18px",
                background: "transparent",
                color: "#1a1a2e",
                border: "2px solid #1a1a2e",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Просто перезагрузить
            </button>
          </div>
          <details style={{ marginTop: 18 }}>
            <summary
              style={{
                fontSize: 11,
                color: "#3a3a5e",
                cursor: "pointer",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Техническая информация
            </summary>
            <pre
              style={{
                marginTop: 10,
                padding: 10,
                background: "#f4f1e3",
                border: "1px solid #d8d4c2",
                fontSize: 11,
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#3a3a5e",
                maxHeight: 200,
                overflow: "auto",
              }}
            >
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
