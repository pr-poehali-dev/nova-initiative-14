/**
 * Глобальный «сторож» несохранённых изменений и обновлений приложения.
 *
 * Зачем: при выходе новой версии сайта старые JS-чанки становятся
 * недоступны, и приложение раньше молча перезагружало страницу. Если в этот
 * момент пользователь работал в CAE-редакторе и не сохранился — терялись
 * данные. Этот модуль позволяет:
 *   1. Редактору сообщать, есть ли несохранённые изменения (setUnsaved).
 *   2. Логике перезагрузки (AppErrorBoundary) спросить разрешение, а не
 *      перезагружать молча — через показ popup-подтверждения.
 *
 * Модуль не зависит от React — это простое разделяемое состояние, чтобы его
 * мог читать и класс-компонент ErrorBoundary, и функциональные хуки.
 */

let unsaved = false;

/** Установить флаг несохранённых изменений (вызывает редактор). */
export function setUnsavedChanges(value: boolean): void {
  unsaved = value;
  // Дублируем флаг в window — его читает независимый watchdog в index.html
  // (он не Vite-модуль и не может импортировать этот файл).
  try {
    (window as unknown as { __caeUnsaved?: boolean }).__caeUnsaved = value;
  } catch {
    /* ignore */
  }
}

/** Есть ли сейчас несохранённые изменения. */
export function hasUnsavedChanges(): boolean {
  return unsaved;
}

// === Запрос подтверждения обновления ===
// AppErrorBoundary при необходимости перезагрузки вызывает requestReload().
// Если подписан обработчик (редактор открыт) и есть несохранённые данные —
// показываем подтверждение. Иначе перезагружаем сразу.

type ReloadHandler = (info: { reason: string }) => void;
let reloadHandler: ReloadHandler | null = null;

/** Подписать обработчик показа popup-подтверждения обновления. */
export function setReloadHandler(handler: ReloadHandler | null): void {
  reloadHandler = handler;
}

/**
 * Запросить перезагрузку. Возвращает true, если запрос «перехвачен»
 * (показан popup) и немедленную перезагрузку выполнять НЕ нужно.
 * Возвращает false, если перехватчика нет — вызывающий перезагружает сам.
 */
export function requestReloadConfirmation(reason: string): boolean {
  if (reloadHandler && unsaved) {
    reloadHandler({ reason });
    return true;
  }
  return false;
}