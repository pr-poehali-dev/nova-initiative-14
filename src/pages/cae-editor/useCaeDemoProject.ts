/**
 * Хук демо-редактора: полный аналог useCaeProject, но без бэкенда.
 * Модель и счётчик расчётов хранятся в localStorage.
 *
 * Лимиты демо-режима:
 *  - до 5 элементов
 *  - 1 бесплатный расчёт (сбрасывается при onReset или вручную)
 */
import { useState, useCallback, useEffect } from "react";
import { emptyModel, type FrameModel } from "@/lib/cae-model";
import { FRAME_TEMPLATES } from "@/lib/cae-catalog";
import { useCaeHistory } from "./useCaeHistory";

const STORAGE_KEY = "cae_demo_model";
const SOLVE_COUNT_KEY = "cae_demo_solves";

export const DEMO_ELEMENT_LIMIT = 5;
export const DEMO_SOLVE_LIMIT = 1;

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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SOLVE_COUNT_KEY);
    const tpl = FRAME_TEMPLATES.find((t) => t.id === "simply_supported");
    const fresh = tpl ? tpl.build() : emptyModel("2d");
    resetHistory(fresh);
    setDirty(false);
    setLastSaved(null);
    setSolveCount(0);
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
    solveLimit: DEMO_SOLVE_LIMIT,
    solvesLeft,
    solveBlocked,
  };
}