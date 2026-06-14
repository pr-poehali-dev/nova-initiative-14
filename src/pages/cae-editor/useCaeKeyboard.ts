/**
 * Глобальные горячие клавиши CAE-редактора.
 * Подключается один раз на странице редактора.
 *
 * Раскладка:
 *  S       — режим выбора
 *  N       — режим создания узлов
 *  E       — режим создания балок
 *  F       — подогнать масштаб под содержимое (fit-to-content)
 *  Esc     — отмена режима, снять выделение
 *  Delete/
 *  Backspace — удалить выделенное
 *  Ctrl+Z  — undo
 *  Ctrl+Shift+Z / Ctrl+Y — redo
 *  Ctrl+D  — дублировать выделенное
 *  Ctrl+A  — выделить всё
 *  Ctrl+S  — сохранить
 *  F5      — запустить расчёт
 *  ?       — показать справку
 */
import { useEffect, useRef } from "react";
import type { EditorMode } from "@/components/cae/FrameCanvas";

interface KeyboardOptions {
  setMode: (m: EditorMode) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  selectAll: () => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  onSave: () => void;
  onSolve: () => void;
  onToggleHelp: () => void;
  onFit: () => void;
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  return false;
}

export function useCaeKeyboard(opts: KeyboardOptions) {
  // Держим актуальные колбэки в ref'е: слушатель keydown ставится один раз,
  // но всегда вызывает свежие обработчики (без устаревших замыканий и без
  // переустановки слушателя на каждый рендер).
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const opts = optsRef.current;
      // Если фокус в инпуте — не перехватываем буквенные шорткаты,
      // но Ctrl+Z/Y/S работают всегда
      const inField = isEditableTarget(e.target);
      const meta = e.ctrlKey || e.metaKey;

      // Системные шорткаты (работают везде)
      if (meta && !e.shiftKey && (e.key === "z" || e.key === "я")) {
        e.preventDefault();
        opts.undo();
        return;
      }
      if (meta && e.shiftKey && (e.key === "Z" || e.key === "z" || e.key === "Я" || e.key === "я")) {
        e.preventDefault();
        opts.redo();
        return;
      }
      if (meta && (e.key === "y" || e.key === "н")) {
        e.preventDefault();
        opts.redo();
        return;
      }
      if (meta && (e.key === "s" || e.key === "ы")) {
        e.preventDefault();
        opts.onSave();
        return;
      }
      if (meta && (e.key === "a" || e.key === "ф")) {
        if (inField) return;
        e.preventDefault();
        opts.selectAll();
        return;
      }
      if (meta && (e.key === "d" || e.key === "в")) {
        if (inField) return;
        e.preventDefault();
        opts.duplicateSelected();
        return;
      }

      // Не перехватываем дальше если фокус в поле ввода
      if (inField) return;

      switch (e.key) {
        case "s":
        case "S":
        case "ы":
        case "Ы":
          opts.setMode("select");
          break;
        case "n":
        case "N":
        case "т":
        case "Т":
          opts.setMode("draw-node");
          break;
        case "e":
        case "E":
        case "у":
        case "У":
          opts.setMode("draw-element");
          break;
        case "f":
        case "F":
        case "а":
        case "А":
          // Подогнать масштаб под содержимое (как кнопка ⛶ на канве)
          opts.onFit();
          break;
        case "Escape":
          opts.clearSelection();
          opts.setMode("select");
          break;
        case "Delete":
        case "Backspace":
          opts.deleteSelected();
          break;
        case "F5":
          e.preventDefault();
          opts.onSolve();
          break;
        case "?":
        case "/":
          if (e.shiftKey) opts.onToggleHelp();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}