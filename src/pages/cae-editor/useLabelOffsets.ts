/**
 * Хранилище пользовательских сдвигов подписей на канвасе (drag-and-drop).
 *
 * Ключи (стабильные идентификаторы подписей):
 *  - `node:{nodeId}`            — подпись узла (n1, n2…)
 *  - `elem:{elementId}`         — подпись стержня (e1, e2…)
 *  - `dim:{elementId}`          — подпись длины (размерной линии)
 *  - `load:{loadId}`            — подпись нагрузки (F, q, M)
 *  - `rxn:{nodeId}`             — подпись реакции опоры (R, H)
 *
 * Сдвиги сохраняются в localStorage в рамках проекта.
 */
import { useEffect, useState, useCallback } from "react";

export interface XYOffset {
  dx: number;
  dy: number;
}

export type LabelOffsetMap = Record<string, XYOffset>;

const lsKey = (projectId: number) => `cae:labelOffsets:${projectId}`;

export interface LabelOffsetsApi {
  /** Получить сдвиг подписи по ключу (0,0 если не задан) */
  getOffset: (key: string) => XYOffset;
  /** Задать сдвиг подписи (абсолютный) */
  setOffset: (key: string, off: XYOffset) => void;
  /** Сбросить сдвиг конкретной подписи */
  resetOffset: (key: string) => void;
  /** Сбросить все сдвиги подписей */
  resetAll: () => void;
}

export function useLabelOffsets(projectId: number): LabelOffsetsApi {
  const [offsets, setOffsets] = useState<LabelOffsetMap>(() => {
    if (!projectId) return {};
    try {
      const raw = localStorage.getItem(lsKey(projectId));
      return raw ? (JSON.parse(raw) as LabelOffsetMap) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!projectId) return;
    try {
      localStorage.setItem(lsKey(projectId), JSON.stringify(offsets));
    } catch { /* ignore */ }
  }, [offsets, projectId]);

  const getOffset = useCallback(
    (key: string): XYOffset => offsets[key] ?? { dx: 0, dy: 0 },
    [offsets],
  );

  const setOffset = useCallback((key: string, off: XYOffset) => {
    setOffsets((prev) => ({ ...prev, [key]: off }));
  }, []);

  const resetOffset = useCallback((key: string) => {
    setOffsets((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setOffsets({}), []);

  return { getOffset, setOffset, resetOffset, resetAll };
}
