/**
 * Рамка массового выделения в 3D-сцене (тикет #60).
 *
 * Слушает левую кнопку мыши на canvas: при перетаскивании по пустому месту
 * рисует прямоугольник выделения и по отпусканию выделяет все узлы, чьи
 * экранные проекции попали внутрь рамки. Камеру при этом не двигает —
 * OrbitControls вращает сцену правой кнопкой, pan — колёсиком.
 *
 * Рамка рисуется через DOM-оверлей (фиксированный div), а не в WebGL —
 * так проще и не нагружает рендер сцены.
 */
import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ModelNode } from "@/lib/cae-model";

export interface SelectRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const DRAG_THRESHOLD = 5; // px — меньше считаем кликом, а не рамкой

export default function BoxSelect3D({
  nodes,
  enabled,
  onSelectNodes,
  onRectChange,
}: {
  nodes: ModelNode[];
  enabled: boolean;
  onSelectNodes: (ids: string[]) => void;
  /** Текущая рамка для отрисовки DOM-оверлеем (null — рамки нет). */
  onRectChange: (r: SelectRect | null) => void;
}) {
  const { camera, gl } = useThree();
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const rectRef = useRef<SelectRect | null>(null);

  const setRect = (r: SelectRect | null) => {
    rectRef.current = r;
    onRectChange(r);
  };

  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      // Только левая кнопка. Старт всегда фиксируем; рамку покажем,
      // когда курсор уйдёт дальше порога (иначе это обычный клик-выбор).
      if (e.button !== 0) return;
      startRef.current = { x: e.clientX, y: e.clientY };
      draggingRef.current = false;
    };

    const onMove = (e: PointerEvent) => {
      const s = startRef.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!draggingRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      draggingRef.current = true;
      setRect({ x0: s.x, y0: s.y, x1: e.clientX, y1: e.clientY });
    };

    const onUp = () => {
      const s = startRef.current;
      startRef.current = null;
      if (!s || !draggingRef.current) {
        setRect(null);
        return;
      }
      draggingRef.current = false;
      const r = rectRef.current;
      setRect(null);
      if (!r) return;

      const bounds = el.getBoundingClientRect();
      const left = Math.min(r.x0, r.x1);
      const right = Math.max(r.x0, r.x1);
      const top = Math.min(r.y0, r.y1);
      const bottom = Math.max(r.y0, r.y1);

      const v = new THREE.Vector3();
      const hits: string[] = [];
      for (const n of nodes) {
        v.set(n.coords[0], n.coords[1], n.coords[2]);
        v.project(camera);
        // NDC → экранные пиксели относительно окна.
        const sx = bounds.left + ((v.x + 1) / 2) * bounds.width;
        const sy = bounds.top + ((1 - v.y) / 2) * bounds.height;
        // z вне [-1,1] — точка за камерой, пропускаем.
        if (v.z < -1 || v.z > 1) continue;
        if (sx >= left && sx <= right && sy >= top && sy <= bottom) {
          hits.push(n.id);
        }
      }
      onSelectNodes(hits);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, gl, camera, nodes, onSelectNodes]);

  return null;
}