/**
 * Хук истории изменений модели — undo/redo с глубиной до 50 шагов.
 * Работает поверх useCaeProject: оборачивает updateModel в стек снимков.
 *
 * История хранится как массив снимков (JSON.parse(JSON.stringify(model))).
 * Каждое изменение через pushHistory() обрезает «будущее» и добавляет
 * новый снимок в конец. undo сдвигает указатель назад, redo — вперёд.
 *
 * setModelDirect позволяет менять модель без записи в историю
 * (например, при загрузке из backend или при undo/redo).
 */
import { useCallback, useRef, useState } from "react";
import type { FrameModel } from "@/lib/cae-model";

const MAX_HISTORY = 50;

export interface HistoryApi {
  /** Текущая модель (отображается в редакторе) */
  model: FrameModel;
  /** Заменить модель и записать в историю — единственная точка мутации */
  pushModel: (next: FrameModel) => void;
  /** Заменить модель БЕЗ записи в историю (загрузка с сервера, undo/redo) */
  setModelDirect: (next: FrameModel) => void;
  /** Сбросить историю и установить новую базовую модель */
  resetHistory: (initial: FrameModel) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function clone(m: FrameModel): FrameModel {
  return JSON.parse(JSON.stringify(m)) as FrameModel;
}

export function useCaeHistory(initial: FrameModel): HistoryApi {
  const [model, setModel] = useState<FrameModel>(initial);
  const stack = useRef<FrameModel[]>([clone(initial)]);
  const cursor = useRef<number>(0); // индекс текущего снимка в stack
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(cursor.current > 0);
    setCanRedo(cursor.current < stack.current.length - 1);
  }, []);

  const pushModel = useCallback((next: FrameModel) => {
    // Обрезаем «будущее» если делали undo и сейчас новое действие
    if (cursor.current < stack.current.length - 1) {
      stack.current = stack.current.slice(0, cursor.current + 1);
    }
    stack.current.push(clone(next));
    if (stack.current.length > MAX_HISTORY) {
      // Переполнение: удаляем самый старый снимок из начала. Поскольку только
      // что добавили снимок в конец, новый «текущий» — это последний индекс.
      // Курсор обязан указывать на него, иначе после 50 правок undo/redo
      // ссылались бы на неверный снимок (рассинхрон cursor и stack).
      stack.current.shift();
      cursor.current = stack.current.length - 1;
    } else {
      cursor.current += 1;
    }
    setModel(next);
    syncFlags();
  }, [syncFlags]);

  const setModelDirect = useCallback((next: FrameModel) => {
    setModel(next);
  }, []);

  const resetHistory = useCallback((init: FrameModel) => {
    stack.current = [clone(init)];
    cursor.current = 0;
    setModel(init);
    syncFlags();
  }, [syncFlags]);

  const undo = useCallback(() => {
    if (cursor.current <= 0) return;
    cursor.current -= 1;
    setModel(clone(stack.current[cursor.current]));
    syncFlags();
  }, [syncFlags]);

  const redo = useCallback(() => {
    if (cursor.current >= stack.current.length - 1) return;
    cursor.current += 1;
    setModel(clone(stack.current[cursor.current]));
    syncFlags();
  }, [syncFlags]);

  return {
    model,
    pushModel,
    setModelDirect,
    resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}