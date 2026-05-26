/**
 * Универсальная перетаскиваемая SVG-подпись.
 *
 * Использует pointer-события для захвата мыши и пересчитывает сдвиг
 * в системе координат SVG (с учётом текущего масштаба и зума).
 *
 * Управление:
 *   - ЛКМ drag — перенос подписи
 *   - Двойной клик — сброс положения в исходное (offset → 0,0)
 *
 * Сдвиг хранится во внешнем сторе через `labelOffsets` (см. useLabelOffsets).
 */
import { useRef, useCallback } from "react";
import type { LabelOffsetsApi } from "@/pages/cae-editor/useLabelOffsets";

interface Props {
  offsetKey: string;
  baseX: number;
  baseY: number;
  labelOffsets?: LabelOffsetsApi;
  svgRef: React.RefObject<SVGSVGElement>;
  children: (x: number, y: number) => React.ReactNode;
}

const DraggableLabel = ({ offsetKey, baseX, baseY, labelOffsets, svgRef, children }: Props) => {
  const off = labelOffsets?.getOffset(offsetKey) ?? { dx: 0, dy: 0 };
  const x = baseX + off.dx;
  const y = baseY + off.dy;

  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startDx: number;
    startDy: number;
    scale: number;
    moved: boolean;
  } | null>(null);

  // Получает экранный масштаб SVG (CTM) — для перевода клиентских пикселей в svg-координаты.
  const getScale = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const ctm = svg.getScreenCTM();
    if (!ctm) return 1;
    // CTM.a — горизонтальный масштаб. Для наших случаев CTM пропорциональна → достаточно одного значения.
    return ctm.a || 1;
  }, [svgRef]);

  const onPointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (!labelOffsets) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDx: off.dx,
      startDy: off.dy,
      scale: getScale(),
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<SVGGElement>) => {
    const s = dragRef.current;
    if (!s) return;
    const scale = s.scale || 1;
    const dx = (e.clientX - s.startClientX) / scale;
    const dy = (e.clientY - s.startClientY) / scale;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) s.moved = true;
    labelOffsets?.setOffset(offsetKey, {
      dx: s.startDx + dx,
      dy: s.startDy + dy,
    });
  };

  const onPointerUp = (e: React.PointerEvent<SVGGElement>) => {
    const s = dragRef.current;
    dragRef.current = null;
    if (!s) return;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    labelOffsets?.resetOffset(offsetKey);
  };

  return (
    <g
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      style={{ cursor: labelOffsets ? "move" : "default" }}
    >
      {children(x, y)}
    </g>
  );
};

export default DraggableLabel;
