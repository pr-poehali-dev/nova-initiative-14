/**
 * Диалог подтверждения обновления приложения.
 *
 * Когда выходит новая версия сайта, старые JS-чанки становятся недоступны и
 * приложению нужно перезагрузиться. Если пользователь работает в редакторе и
 * НЕ сохранился, молча перезагружать нельзя — потеряются данные. Этот диалог
 * перехватывает такой случай (через reloadGuard) и спрашивает разрешение,
 * честно предупреждая о потере несохранённых данных.
 */
import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { setReloadHandler, setUnsavedChanges } from "@/lib/reloadGuard";
import { performHardReload } from "@/components/AppErrorBoundary";

export default function ReloadConfirmDialog() {
  const [open, setOpen] = useState(false);
  // Мягкое уведомление после восстановления от сбоя (#29).
  const [errorNotice, setErrorNotice] = useState(false);

  useEffect(() => {
    // Источник 1: React-перехват в AppErrorBoundary (chunk-ошибки внутри SPA).
    setReloadHandler(() => setOpen(true));
    // Источник 2: независимый watchdog в index.html — он шлёт это событие,
    // когда есть несохранённые данные, вместо браузерного confirm.
    const onReq = () => setOpen(true);
    window.addEventListener("cae:reload-request", onReq);

    // После восстановления от реального сбоя — один раз показываем плашку.
    try {
      if (sessionStorage.getItem("__cae_error_notice")) {
        sessionStorage.removeItem("__cae_error_notice");
        setErrorNotice(true);
        window.setTimeout(() => setErrorNotice(false), 8000);
      }
    } catch { /* ignore */ }

    return () => {
      setReloadHandler(null);
      window.removeEventListener("cae:reload-request", onReq);
    };
  }, []);

  if (errorNotice && !open) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[110] w-[min(92vw,460px)] bg-[var(--drawing-bg)] border-2 border-[var(--drawing-accent)] shadow-2xl p-3 flex items-start gap-2.5">
        <Icon name="ShieldAlert" size={18} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-gost-upright font-bold text-[13px] mb-0.5">
            Мы заметили сбой и уже разбираемся
          </p>
          <p className="font-gost text-[11px] leading-snug text-[var(--drawing-line-thin)]">
            Страница восстановлена автоматически. Если вы вошли в аккаунт — мы
            напишем в уведомлениях, когда проблема будет исправлена.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setErrorNotice(false)}
          aria-label="Закрыть"
          className="shrink-0 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
        >
          <Icon name="X" size={16} />
        </button>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-[420px] bg-[var(--drawing-bg)] border-2 border-[var(--drawing-accent)] shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5">
          <Icon name="RefreshCw" size={16} className="text-[var(--drawing-accent)]" />
          <p className="font-gost-upright font-bold text-[14px] uppercase tracking-wide text-[var(--drawing-accent)]">
            Доступно обновление
          </p>
        </div>

        <div className="p-4 space-y-3">
          <p className="font-gost text-[13px] leading-relaxed text-[var(--drawing-line)]">
            Вышла новая версия редактора — например, исправлены ошибки расчёта
            и интерфейса. Чтобы продолжить корректно, страницу нужно обновить.
          </p>
          <p className="font-gost text-[12px] leading-relaxed text-[var(--drawing-accent)] flex items-start gap-1.5">
            <Icon name="TriangleAlert" size={14} className="mt-0.5 shrink-0" />
            <span>
              В проекте есть несохранённые изменения. При обновлении они будут
              потеряны. Сначала закройте это окно и сохраните проект, затем
              обновите страницу.
            </span>
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                // Снимаем флаг несохранённых данных ДО перезагрузки, иначе
                // beforeunload-страж покажет ещё один браузерный вопрос.
                setUnsavedChanges(false);
                performHardReload();
              }}
              className="w-full border-2 border-[var(--drawing-accent)] bg-[var(--drawing-accent)] text-white py-2.5 text-[12px] font-gost uppercase tracking-wider"
            >
              Обновить сейчас (потерять изменения)
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full border-2 border-[var(--drawing-line)] py-2.5 text-[12px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-paper)]"
            >
              Не сейчас — я сохранюсь
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}