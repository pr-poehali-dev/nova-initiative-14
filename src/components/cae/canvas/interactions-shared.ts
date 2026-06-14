/**
 * Общие типы и константы для логики взаимодействия с объектами канвы.
 * Вынесено из useCanvasInteractions.ts без изменения значений и поведения.
 */

/** Цель открытия контекстного popup'а свойств. */
export interface ContextRequest {
  kind: "node" | "element";
  id: string;
  clientX: number;
  clientY: number;
}

/** Длительность long-press для открытия контекстного попапа на мобиле. */
export const LONG_PRESS_MS = 500;

/** Допустимый сдвиг пальца, при котором long-press ещё считается «удержанием». */
export const LONG_PRESS_TOLERANCE_PX = 8;
