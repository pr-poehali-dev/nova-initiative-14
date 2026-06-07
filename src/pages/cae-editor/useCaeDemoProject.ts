/**
 * Хук демо-редактора: полный аналог useCaeProject, но без бэкенда.
 * Модель и счётчик расчётов хранятся в localStorage.
 *
 * Демо-лимиты для незарегистрированных пользователей:
 *  - до 2 расчётов — после исчерпания показываем модалку регистрации
 *  - количество узлов не ограничено (можно рисовать любую модель)
 * После регистрации (альфа-тест) лимиты сняты.
 */
import { useState, useCallback, useEffect } from "react";
import { emptyModel, type FrameModel } from "@/lib/cae-model";
import { FRAME_TEMPLATES } from "@/lib/cae-catalog";
import { useCaeHistory } from "./useCaeHistory";

const STORAGE_KEY = "cae_demo_model";
const SOLVE_COUNT_KEY = "cae_demo_solves";

// Демо-лимиты (без регистрации). После регистрации — альфа-тест без лимитов.
// Узлы не ограничиваем — рисовать модель можно любую.
// Лимит расчётов жёсткий: 2 пробных, дальше модалка регистрации.
export const DEMO_NODE_LIMIT = 9999;
export const DEMO_ELEMENT_LIMIT = 9999;
export const DEMO_SOLVE_LIMIT = 2;

function loadFromStorage(): FrameModel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FrameModel;
    if (parsed?.meta?.dim) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(model: FrameModel) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  } catch {
    // localStorage недоступен (приватный режим) — игнорируем
  }
}

function getSolveCount(): number {
  try {
    return parseInt(localStorage.getItem(SOLVE_COUNT_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function incrementSolveCount() {
  try {
    localStorage.setItem(SOLVE_COUNT_KEY, String(getSolveCount() + 1));
  } catch (e) {
    void e;
  }
}

function getInitialModel(): FrameModel {
  const saved = loadFromStorage();
  if (saved) return saved;
  const tpl = FRAME_TEMPLATES.find((t) => t.id === "simply_supported");
  return tpl ? tpl.build() : emptyModel("2d");
}

export function useCaeDemoProject() {
  const history = useCaeHistory(getInitialModel());
  const { model, pushModel, setModelDirect, resetHistory, undo, redo, canUndo, canRedo } = history;

  const [lastSaved, setLastSaved] = useState<string | null>(
    localStorage.getItem(STORAGE_KEY) ? "из localStorage" : null,
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [solveCount, setSolveCount] = useState(getSolveCount);

  const solvesLeft = Math.max(0, DEMO_SOLVE_LIMIT - solveCount);
  const solveBlocked = solvesLeft <= 0;
  const nodesUsed = model.nodes.length;
  const nodesLeft = Math.max(0, DEMO_NODE_LIMIT - nodesUsed);
  const nodesBlocked = nodesUsed >= DEMO_NODE_LIMIT;

  // Автосохранение в localStorage при каждом изменении модели
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      saveToStorage(model);
      setLastSaved(new Date().toLocaleTimeString("ru-RU"));
      setDirty(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [model, dirty]);

  const updateModel = useCallback(
    (next: FrameModel) => {
      pushModel(next);
      setDirty(true);
    },
    [pushModel],
  );

  const setModel = useCallback(
    (next: FrameModel) => {
      setModelDirect(next);
    },
    [setModelDirect],
  );

  const onSave = useCallback(() => {
    setSaving(true);
    saveToStorage(model);
    setLastSaved(new Date().toLocaleTimeString("ru-RU"));
    setDirty(false);
    setSaving(false);
  }, [model]);

  /** Вызывается ПОСЛЕ успешного расчёта — увеличивает счётчик */
  const onSolveUsed = useCallback(() => {
    incrementSolveCount();
    setSolveCount(getSolveCount());
  }, []);

  const onReset = useCallback(() => {
    // Сбрасываем только МОДЕЛЬ (чертёж), но НЕ счётчик расчётов.
    // Иначе кнопка «Сбросить» обнуляла лимит из 2 пробных расчётов —
    // пользователь мог считать бесконечно (тикет #50).
    localStorage.removeItem(STORAGE_KEY);
    const tpl = FRAME_TEMPLATES.find((t) => t.id === "simply_supported");
    const fresh = tpl ? tpl.build() : emptyModel("2d");
    resetHistory(fresh);
    setDirty(false);
    setLastSaved(null);
  }, [resetHistory]);

  return {
    model,
    setModel,
    updateModel,
    projectName: "Демо-проект",
    versionId: null as number | null,
    loadingModel: false,
    saving,
    lastSaved,
    dirty,
    loadError: null as string | null,
    setLoadError: (_: string | null) => {},
    authLoading: false,
    onSave,
    onReset,
    onSolveUsed,
    undo,
    redo,
    canUndo,
    canRedo,
    elementLimit: DEMO_ELEMENT_LIMIT,
    nodeLimit: DEMO_NODE_LIMIT,
    solveLimit: DEMO_SOLVE_LIMIT,
    solveCount,
    solvesLeft,
    solveBlocked,
    nodesUsed,
    nodesLeft,
    nodesBlocked,
  };
}