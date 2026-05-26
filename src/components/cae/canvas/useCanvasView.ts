/**
 * Хук: управление viewport канвы.
 * Содержит: resize observer, view state (cx/cy/pxPerM), автофит под содержимое,
 * ручной fitRequestId, wheel-zoom, координатные функции toScreenX/toScreenY/toWorld.
 */
import { useEffect, useRef, useState } from "react";
import type { FrameModel } from "@/lib/cae-model";

export interface ViewState {
  cx: number;
  cy: number;
  pxPerM: number;
}

export interface CanvasViewResult {
  svgRef: React.RefObject<SVGSVGElement>;
  size: { w: number; h: number };
  view: ViewState;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  toWorld: (sx: number, sy: number) => { x: number; y: number };
}

export function useCanvasView(
  model: FrameModel,
  fitRequestId: number | undefined,
): CanvasViewResult {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [view, setView] = useState<ViewState>({ cx: 2, cy: 1, pxPerM: 80 });

  /**
   * Флаг: автоматическое центрирование уже было выполнено для текущей модели.
   * Не сбрасывается при обычных правках (добавление узла, перемещение), чтобы
   * не «прыгал» зум; сбрасывается только при смене проекта (см. зависимость).
   */
  const autoFittedRef = useRef<string | null>(null);

  // Resize observer
  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, []);

  /**
   * Автоцентрирование и подбор масштаба под содержимое модели.
   * Запускается один раз, когда:
   *   • в модели уже есть хотя бы один узел,
   *   • размер канвы известен (size.w > 0),
   *   • это первый рендер этой модели (autoFittedRef ещё не пометил её).
   * Запас 12% по краям, минимальный масштаб 30 px/м, максимальный 300 px/м.
   */
  useEffect(() => {
    if (size.w < 50 || size.h < 50) return;
    if (model.nodes.length === 0) return;
    // «Подпись» модели по узлам — для определения, нужно ли пересчитать автозум.
    // Берём только количество узлов и id первого/последнего, чтобы не дёргаться на каждое перемещение.
    const fingerprint = `${model.nodes.length}|${model.nodes[0]?.id}|${model.nodes[model.nodes.length - 1]?.id}`;
    if (autoFittedRef.current === fingerprint) return;

    const xs = model.nodes.map((n) => n.coords[0]);
    const ys = model.nodes.map((n) => n.coords[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 0.5);
    const spanY = Math.max(maxY - minY, 0.5);
    // Запас 12% с каждой стороны
    const pad = 0.12;
    const fitX = (size.w * (1 - 2 * pad)) / spanX;
    const fitY = (size.h * (1 - 2 * pad)) / spanY;
    const pxPerM = Math.max(30, Math.min(300, Math.min(fitX, fitY)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({ cx, cy, pxPerM });
    autoFittedRef.current = fingerprint;
  }, [model.nodes, size.w, size.h]);

  /**
   * Ручной запрос «Подогнать» — сбрасываем флаг автозума, эффект выше
   * пересчитает масштаб и центр. Запускается при изменении fitRequestId.
   */
  useEffect(() => {
    if (fitRequestId === undefined) return;
    autoFittedRef.current = null;
    if (model.nodes.length === 0 || size.w < 50) return;
    const xs = model.nodes.map((n) => n.coords[0]);
    const ys = model.nodes.map((n) => n.coords[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 0.5);
    const spanY = Math.max(maxY - minY, 0.5);
    const pad = 0.12;
    const fitX = (size.w * (1 - 2 * pad)) / spanX;
    const fitY = (size.h * (1 - 2 * pad)) / spanY;
    const pxPerM = Math.max(30, Math.min(300, Math.min(fitX, fitY)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({ cx, cy, pxPerM });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequestId]);

  // Нативный wheel-listener с { passive: false } — иначе браузер игнорирует preventDefault
  // и страница продолжает скроллиться при зуме канвы.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setView((v) => {
        const worldBeforeX = v.cx + (mx - size.w / 2) / v.pxPerM;
        const worldBeforeY = v.cy - (my - size.h / 2) / v.pxPerM;
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const newPx = Math.max(20, Math.min(500, v.pxPerM * factor));
        const newCx = worldBeforeX - (mx - size.w / 2) / newPx;
        const newCy = worldBeforeY + (my - size.h / 2) / newPx;
        return { cx: newCx, cy: newCy, pxPerM: newPx };
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [size.w, size.h]);

  // Координатные функции (мировые в м → экранные в px)
  const toScreenX = (x: number) => size.w / 2 + (x - view.cx) * view.pxPerM;
  // ось Y инвертирована: вверх в мире = вверх на экране
  const toScreenY = (y: number) => size.h / 2 - (y - view.cy) * view.pxPerM;
  const toWorld = (sx: number, sy: number) => ({
    x: view.cx + (sx - size.w / 2) / view.pxPerM,
    y: view.cy - (sy - size.h / 2) / view.pxPerM,
  });

  return { svgRef, size, view, setView, toScreenX, toScreenY, toWorld };
}
