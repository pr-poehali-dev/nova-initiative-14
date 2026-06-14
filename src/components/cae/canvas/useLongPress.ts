/**
 * Под-хук long-press для мобильного контекстного меню канвы.
 *
 * Вынесено из useCanvasInteractions.ts без изменения логики: владеет
 * собственными ref'ами таймера/старта и глобальным слушателем pointermove/up,
 * который отменяет удержание при сдвиге пальца.
 *
 * При нажатии пальцем на узел/элемент стартуем таймер; если за 500мс палец
 * не двинулся и не отпущен — выделяем объект и открываем контекстный popup.
 */
import { useEffect, useRef } from "react";
import {
  type ContextRequest,
  LONG_PRESS_MS,
  LONG_PRESS_TOLERANCE_PX,
} from "./interactions-shared";

interface Params {
  onSelectNodes: (ids: string[]) => void;
  onSelectElements: (ids: string[]) => void;
  suppressNextClick: React.MutableRefObject<boolean>;
  setDraggingNode: React.Dispatch<React.SetStateAction<{ id: string; movedPx: number } | null>>;
  onRequestContext?: (req: ContextRequest) => void;
}

export interface LongPressApi {
  startLongPress: (
    kind: "node" | "element",
    id: string,
    clientX: number,
    clientY: number,
  ) => void;
  cancelLongPress: () => void;
}

export function useLongPress({
  onSelectNodes,
  onSelectElements,
  suppressNextClick,
  setDraggingNode,
  onRequestContext,
}: Params): LongPressApi {
  /**
   * Long-press для мобилы: при нажатии пальцем на узел/элемент стартуем таймер,
   * если за 500мс палец не двинулся и не отпущен — открываем контекстный popup.
   * Хранится в ref'е чтобы можно было отменить из move/up хендлеров.
   */
  const longPressTimer = useRef<number | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  };

  const startLongPress = (
    kind: "node" | "element",
    id: string,
    clientX: number,
    clientY: number,
  ) => {
    cancelLongPress();
    longPressStart.current = { x: clientX, y: clientY };
    longPressTimer.current = window.setTimeout(() => {
      // Сбрасываем drag и подавляем последующий click — пользователь
      // удержал палец, чтобы открыть свойства, а не выделить/нарисовать.
      setDraggingNode(null);
      suppressNextClick.current = true;
      // ВАЖНО: выделяем объект ДО открытия popup, как это делает контекст-меню
      // на десктопе. Иначе на мобиле selectedNode/selectedElementId остаются
      // пустыми, panel свойств рендерится «вхолостую» и падает с ошибкой.
      if (kind === "node") {
        onSelectNodes([id]);
        onSelectElements([]);
      } else {
        onSelectElements([id]);
        onSelectNodes([]);
      }
      onRequestContext?.({ kind, id, clientX, clientY });
      longPressTimer.current = null;
    }, LONG_PRESS_MS);
  };

  /**
   * Глобально слушаем pointermove/pointerup чтобы отменять long-press
   * если палец сдвинулся (значит юзер хочет pan'нуть или перетащить узел).
   */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!longPressStart.current) return;
      const dx = Math.abs(e.clientX - longPressStart.current.x);
      const dy = Math.abs(e.clientY - longPressStart.current.y);
      if (dx + dy > LONG_PRESS_TOLERANCE_PX) {
        cancelLongPress();
      }
    };
    const onUp = () => cancelLongPress();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return { startLongPress, cancelLongPress };
}
