/**
 * Глобальные настройки отображения схемы на канвасе.
 * Управляют размером стрелок (нагрузок, реакций) и шрифта подписей.
 *
 * Значения хранятся в localStorage, чтобы пользователь не настраивал заново
 * при каждом открытии проекта.
 *
 * Также здесь хранятся пользовательские сдвиги подписей (drag-and-drop).
 */
import { useEffect, useState } from "react";

const LS_ARROW = "cae:view:arrowScale";
const LS_FONT = "cae:view:fontScale";

const readNum = (key: string, fallback: number): number => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = parseFloat(raw);
    return isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
};

export interface CaeViewSettings {
  /** Множитель размера стрелок: 0.5 — мелкие, 1 — обычные, 2 — крупные */
  arrowScale: number;
  setArrowScale: (v: number) => void;
  /** Множитель размера шрифта подписей: 0.7 — мелкий, 1 — обычный, 1.6 — крупный */
  fontScale: number;
  setFontScale: (v: number) => void;
  /** Сбросить все настройки вида на значения по умолчанию */
  resetView: () => void;
}

export function useCaeViewSettings(): CaeViewSettings {
  const [arrowScale, setArrowScaleState] = useState<number>(() => readNum(LS_ARROW, 1));
  const [fontScale, setFontScaleState] = useState<number>(() => readNum(LS_FONT, 1));

  useEffect(() => {
    try { localStorage.setItem(LS_ARROW, String(arrowScale)); } catch { /* ignore */ }
  }, [arrowScale]);

  useEffect(() => {
    try { localStorage.setItem(LS_FONT, String(fontScale)); } catch { /* ignore */ }
  }, [fontScale]);

  const setArrowScale = (v: number) => setArrowScaleState(Math.max(0.3, Math.min(3, v)));
  const setFontScale = (v: number) => setFontScaleState(Math.max(0.5, Math.min(2.5, v)));
  const resetView = () => {
    setArrowScaleState(1);
    setFontScaleState(1);
  };

  return { arrowScale, setArrowScale, fontScale, setFontScale, resetView };
}
