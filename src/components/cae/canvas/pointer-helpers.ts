/**
 * Вспомогательные функции и под-хук для pointer-логики канвы.
 * Вынесено из useCanvasPointer.ts без изменения поведения.
 */
import { useRef } from "react";

/** Привязка значения к шагу сетки. */
export function snap(v: number, step: number) {
  return Math.round(v / step) * step;
}

/** Параметры старта pinch-zoom (зум двумя пальцами). */
export interface PinchStart {
  dist: number;
  pxPerM: number;
  cx: number;
  cy: number;
  midX: number;
  midY: number;
}

export interface TouchGestures {
  /**
   * Активные касания пальцами на канве (для touch-жестов).
   * При 1 пальце — pan, при 2 — pinch-zoom. Ключ — pointerId, значение — координаты.
   */
  activeTouches: React.MutableRefObject<Map<number, { x: number; y: number }>>;
  /** Дистанция между двумя пальцами на старте pinch — для расчёта коэффициента зума. */
  pinchStart: React.MutableRefObject<PinchStart | null>;
  /** Длительность нажатия пальца — для отличения tap от долгого нажатия для pan. */
  touchStartTime: React.MutableRefObject<number>;
}

/**
 * Под-хук: контейнер ref'ов touch-жестов. Вынесено как ref'ы (не state),
 * поэтому не влияет на порядок state-хуков родителя.
 */
export function useTouchGestures(): TouchGestures {
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<PinchStart | null>(null);
  const touchStartTime = useRef<number>(0);
  return { activeTouches, pinchStart, touchStartTime };
}
