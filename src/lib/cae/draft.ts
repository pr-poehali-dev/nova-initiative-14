/**
 * Локальное автосохранение черновика модели CAE (тикет №49).
 *
 * Проблема: при фоновой перезагрузке вкладки (обновление сессии, recovery от
 * устаревшего кэша) терялись несохранённые изменения рамы. Решение — хранить
 * актуальную модель в localStorage и предлагать восстановить её при следующем
 * открытии того же проекта.
 *
 * Это именно ЧЕРНОВИК на устройстве: основное сохранение по-прежнему идёт на
 * сервер через "Сохранить". Черновик автоматически очищается после успешного
 * серверного сохранения или после восстановления/отказа.
 */
import type { FrameModel } from "@/lib/cae-model";

const PREFIX = "cae:draft:";
/** Черновики старше этого срока считаем устаревшими и игнорируем. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

export interface CaeDraft {
  projectId: number;
  model: FrameModel;
  savedAt: number; // epoch ms
}

function keyFor(projectId: number): string {
  return `${PREFIX}${projectId}`;
}

/** Сохранить черновик модели проекта в localStorage. */
export function saveDraft(projectId: number, model: FrameModel): void {
  if (!projectId) return;
  try {
    const payload: CaeDraft = { projectId, model, savedAt: Date.now() };
    localStorage.setItem(keyFor(projectId), JSON.stringify(payload));
  } catch {
    /* квота переполнена или приватный режим — молча игнорируем */
  }
}

/** Прочитать черновик проекта (или null, если его нет/устарел/битый). */
export function loadDraft(projectId: number): CaeDraft | null {
  if (!projectId) return null;
  try {
    const raw = localStorage.getItem(keyFor(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CaeDraft;
    if (!parsed || !parsed.model || !(parsed.model as FrameModel).meta) return null;
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      clearDraft(projectId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Удалить черновик проекта. */
export function clearDraft(projectId: number): void {
  if (!projectId) return;
  try {
    localStorage.removeItem(keyFor(projectId));
  } catch {
    /* ignore */
  }
}

/** Человекочитаемое время сохранения черновика. */
export function formatDraftTime(savedAt: number): string {
  try {
    return new Date(savedAt).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
