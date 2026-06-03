/**
 * Глобальная пользовательская настройка инженерной школы (тикет №37).
 *
 * Это «взаимосвязанный переключатель» между машиностроением и строительным
 * проектированием: значение хранится в localStorage и служит:
 *  - дефолтом для НОВЫХ проектов CAE;
 *  - значением, которое показывается и меняется в личном кабинете.
 *
 * Конкретный проект может переопределить школу в своих настройках расчёта
 * (model.analysis_settings.discipline) — тогда используется значение проекта.
 */
import type { DisciplineKind } from "@/lib/cae-model";

const LS_KEY = "cae:pref:discipline";
const DEFAULT_DISCIPLINE: DisciplineKind = "mechanical";

/** Событие, рассылаемое при смене предпочтения — чтобы UI обновился синхронно. */
const EVENT = "cae:discipline-changed";

export function getDisciplinePreference(): DisciplineKind {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === "mechanical" || raw === "construction") return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_DISCIPLINE;
}

export function setDisciplinePreference(value: DisciplineKind): void {
  try {
    localStorage.setItem(LS_KEY, value);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
  } catch {
    /* ignore */
  }
}

/** Подписка на изменение предпочтения (возвращает функцию отписки). */
export function onDisciplineChange(cb: (value: DisciplineKind) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as DisciplineKind | undefined;
    cb(detail ?? getDisciplinePreference());
  };
  window.addEventListener(EVENT, handler);
  // storage-событие — на случай смены в другой вкладке.
  const storageHandler = (e: StorageEvent) => {
    if (e.key === LS_KEY) cb(getDisciplinePreference());
  };
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

export const DISCIPLINE_LABELS: Record<DisciplineKind, string> = {
  mechanical: "Машиностроение",
  construction: "Строительство",
};
