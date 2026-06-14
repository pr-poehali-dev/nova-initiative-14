/**
 * Палитра и общие типы 3D-сцены пространственной рамы.
 *
 * Вынесено из FrameScene3D.tsx без изменения логики:
 *  - ScenePalette / FALLBACK_PALETTE / useScenePalette — чтение CSS-переменных
 *    «чертёжной» темы (реагирует на светлую/тёмную тему);
 *  - Vec3 / ViewName / VIEW_DIRS / vec — общие типы и хелперы координат/видов.
 */
import { useState, useEffect } from "react";

/**
 * Палитра 3D-сцены. Читается из CSS-переменных «чертёжной» темы, чтобы
 * 3D-канва выглядела одинаково с 2D-редактором и корректно реагировала
 * на светлую/тёмную тему. Значения после двоеточия — фолбэк (светлая тема).
 */
export interface ScenePalette {
  bg: string;
  line: string;
  thin: string;
  accent: string;
  success: string;
  grid: string;
  paper: string;
}

export const FALLBACK_PALETTE: ScenePalette = {
  bg: "#faf8f0",
  line: "#1a1a2e",
  thin: "#3a3a5e",
  accent: "#c0392b",
  success: "#1a8a5a",
  grid: "#d8d4c4",
  paper: "#f5f3e8",
};

/** Читает текущие значения CSS-переменных темы (реагирует на html.dark). */
export function useScenePalette(): ScenePalette {
  const [palette, setPalette] = useState<ScenePalette>(FALLBACK_PALETTE);
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (name: string, fb: string) =>
        s.getPropertyValue(name).trim() || fb;
      setPalette({
        bg: v("--drawing-bg", FALLBACK_PALETTE.bg),
        line: v("--drawing-line", FALLBACK_PALETTE.line),
        thin: v("--drawing-line-thin", FALLBACK_PALETTE.thin),
        accent: v("--drawing-accent", FALLBACK_PALETTE.accent),
        success: v("--drawing-success", FALLBACK_PALETTE.success),
        // Для линий сетки используем тонкий тон бумаги/линии.
        grid: v("--drawing-line-thin", FALLBACK_PALETTE.grid),
        paper: v("--drawing-paper", FALLBACK_PALETTE.paper),
      });
    };
    read();
    // Реагируем на переключение темы (класс html.dark).
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return palette;
}

export type Vec3 = [number, number, number];

/** Именованные ракурсы быстрых видов. */
export type ViewName = "iso" | "front" | "back" | "left" | "right" | "top" | "bottom";

/** Единичные направления камеры (откуда смотрим) для каждого вида.
 *  Ось Y — вертикаль (вверх). */
export const VIEW_DIRS: Record<ViewName, Vec3> = {
  iso: [1, 0.8, 1],
  front: [0, 0, 1], // смотрим вдоль −Z (плоскость XY, как 2D)
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
};

export const vec = (c: [number, number, number]): Vec3 => [c[0], c[1], c[2]];
