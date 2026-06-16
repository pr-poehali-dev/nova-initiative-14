/**
 * Интерактивная MindMap-канва (drag-and-drop), как в MindMeister, но в стиле
 * чертежа проекта. Реализована на SVG + pointer events, без тяжёлых библиотек.
 *
 * Возможности:
 *  - перетаскивание узлов мышью/пальцем (drag-and-drop);
 *  - панорамирование пустого поля и зум колесом/кнопками;
 *  - добавление дочернего узла, переименование (двойной клик), удаление;
 *  - связи рисуются плавными кривыми между узлами.
 *
 * Компонент управляемый: данные и onChange приходят сверху (страница хранит
 * состояние и сохраняет на сервер).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import type { MindMapData, MindNode, NodeColor } from "@/lib/mindmap";

// Палитра узлов по роли. Фон / рамка / цвет текста подобраны под тему чертежа.
const NODE_STYLE: Record<NodeColor, { fill: string; stroke: string; text: string }> = {
  root: { fill: "var(--drawing-accent)", stroke: "var(--drawing-accent)", text: "#ffffff" },
  group: { fill: "var(--drawing-bg)", stroke: "var(--drawing-line)", text: "var(--drawing-line)" },
  leaf: { fill: "var(--drawing-paper)", stroke: "var(--drawing-line)", text: "var(--drawing-line)" },
  backend: { fill: "var(--drawing-paper)", stroke: "#1d4ed8", text: "#1d4ed8" },
  db: { fill: "var(--drawing-paper)", stroke: "#15803d", text: "#15803d" },
  accent: { fill: "var(--drawing-paper)", stroke: "var(--drawing-accent)", text: "var(--drawing-accent)" },
};

const NODE_W = 190;
const NODE_H = 40;

interface Props {
  data: MindMapData;
  onChange: (next: MindMapData) => void;
}

export default function MindMapCanvas({ data, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ x: 1000, y: 1000, zoom: 0.7 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const didFit = useRef(false);

  /** Подогнать вид так, чтобы все узлы поместились по центру экрана. */
  const fitToView = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || data.nodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of data.nodes) {
      minX = Math.min(minX, n.x - NODE_W / 2);
      minY = Math.min(minY, n.y - NODE_H / 2);
      maxX = Math.max(maxX, n.x + NODE_W / 2);
      maxY = Math.max(maxY, n.y + NODE_H / 2);
    }
    const pad = 60;
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const zoom = Math.min(2.5, Math.max(0.2, Math.min(rect.width / contentW, rect.height / contentH)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({
      zoom,
      x: rect.width / 2 - cx * zoom,
      y: rect.height / 2 - cy * zoom,
    });
  }, [data.nodes]);

  // Один раз после появления узлов центрируем карту по содержимому.
  useEffect(() => {
    if (didFit.current || data.nodes.length === 0) return;
    // Ждём, пока svg получит реальные размеры.
    const id = requestAnimationFrame(() => {
      fitToView();
      didFit.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [data.nodes.length, fitToView]);

  // Текущее перетаскивание: узел или поле (pan).
  const drag = useRef<
    | { kind: "node"; id: string; dx: number; dy: number; moved: boolean }
    | { kind: "pan"; startX: number; startY: number; ox: number; oy: number }
    | null
  >(null);

  const nodeById = useCallback(
    (id: string) => data.nodes.find((n) => n.id === id) || null,
    [data.nodes],
  );

  /** Экранные координаты → координаты канвы. */
  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      const px = clientX - (rect?.left ?? 0);
      const py = clientY - (rect?.top ?? 0);
      return {
        x: (px - view.x) / view.zoom,
        y: (py - view.y) / view.zoom,
      };
    },
    [view],
  );

  const onPointerDownNode = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const n = nodeById(id);
    if (!n) return;
    const w = toWorld(e.clientX, e.clientY);
    drag.current = { kind: "node", id, dx: w.x - n.x, dy: w.y - n.y, moved: false };
    setSelectedId(id);
  };

  const onPointerDownCanvas = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { kind: "pan", startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y };
    setSelectedId(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "node") {
      const w = toWorld(e.clientX, e.clientY);
      d.moved = true;
      onChange({
        ...data,
        nodes: data.nodes.map((n) => (n.id === d.id ? { ...n, x: w.x - d.dx, y: w.y - d.dy } : n)),
      });
    } else {
      setView((v) => ({ ...v, x: d.ox + (e.clientX - d.startX), y: d.oy + (e.clientY - d.startY) }));
    }
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setView((v) => {
      const rect = svgRef.current?.getBoundingClientRect();
      const px = e.clientX - (rect?.left ?? 0);
      const py = e.clientY - (rect?.top ?? 0);
      const nz = Math.min(2.5, Math.max(0.2, v.zoom * factor));
      // Зум к точке курсора.
      const wx = (px - v.x) / v.zoom;
      const wy = (py - v.y) / v.zoom;
      return { x: px - wx * nz, y: py - wy * nz, zoom: nz };
    });
  };

  const zoomBy = (factor: number) =>
    setView((v) => ({ ...v, zoom: Math.min(2.5, Math.max(0.2, v.zoom * factor)) }));

  const startEdit = (id: string) => {
    const n = nodeById(id);
    if (!n) return;
    setEditingId(id);
    setEditText(n.text);
  };

  const commitEdit = () => {
    if (!editingId) return;
    onChange({
      ...data,
      nodes: data.nodes.map((n) => (n.id === editingId ? { ...n, text: editText.trim() || n.text } : n)),
    });
    setEditingId(null);
  };

  const addChild = () => {
    const parent = selectedId ? nodeById(selectedId) : nodeById("root");
    if (!parent) return;
    const id = `n_${Date.now().toString(36)}`;
    const newNode: MindNode = {
      id,
      text: "Новый узел",
      x: parent.x + 240,
      y: parent.y + 30,
      color: "leaf",
    };
    onChange({
      nodes: [...data.nodes, newNode],
      edges: [...data.edges, { from: parent.id, to: id }],
    });
    setSelectedId(id);
    setTimeout(() => startEdit(id), 0);
  };

  const deleteSelected = () => {
    if (!selectedId || selectedId === "root") return;
    onChange({
      nodes: data.nodes.filter((n) => n.id !== selectedId),
      edges: data.edges.filter((ed) => ed.from !== selectedId && ed.to !== selectedId),
    });
    setSelectedId(null);
  };

  // Удаление по клавише Delete (когда не редактируем текст).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, editingId, data]);

  // Кривая связи между двумя узлами (горизонтальная S-кривая).
  const edgePath = (a: MindNode, b: MindNode) => {
    const x1 = a.x;
    const y1 = a.y;
    const x2 = b.x;
    const y2 = b.y;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[var(--drawing-bg)]">
      {/* Панель инструментов */}
      <div className="absolute top-2 left-2 z-10 flex gap-0 bg-[var(--drawing-bg)] border border-[var(--drawing-line)] shadow-sm">
        <ToolBtn icon="Plus" title="Добавить узел (от выбранного)" onClick={addChild} />
        <ToolBtn icon="Trash2" title="Удалить выбранный (Del)" onClick={deleteSelected} disabled={!selectedId || selectedId === "root"} />
        <ToolBtn icon="ZoomIn" title="Приблизить" onClick={() => zoomBy(1.2)} />
        <ToolBtn icon="ZoomOut" title="Отдалить" onClick={() => zoomBy(0.8)} />
        <ToolBtn icon="Maximize" title="Показать всю карту" onClick={fitToView} />
      </div>
      <div className="absolute top-2 right-2 z-10 font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] bg-[var(--drawing-bg)] border border-[var(--drawing-line)] px-2 py-1">
        Перетаскивайте узлы · 2 клика — переименовать · {Math.round(view.zoom * 100)}%
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
          {/* Связи */}
          {data.edges.map((ed, i) => {
            const a = nodeById(ed.from);
            const b = nodeById(ed.to);
            if (!a || !b) return null;
            return (
              <path
                key={i}
                d={edgePath(a, b)}
                fill="none"
                stroke="var(--drawing-line)"
                strokeWidth={1.5}
                opacity={0.5}
              />
            );
          })}

          {/* Узлы */}
          {data.nodes.map((n) => {
            const st = NODE_STYLE[n.color] || NODE_STYLE.leaf;
            const isSel = n.id === selectedId;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x - NODE_W / 2} ${n.y - NODE_H / 2})`}
                onPointerDown={(e) => onPointerDownNode(e, n.id)}
                onDoubleClick={(e) => { e.stopPropagation(); startEdit(n.id); }}
                style={{ cursor: "move" }}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={4}
                  fill={st.fill}
                  stroke={isSel ? "var(--drawing-accent)" : st.stroke}
                  strokeWidth={isSel ? 3 : 1.8}
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={st.text}
                  fontSize={n.color === "root" ? 15 : 12}
                  fontWeight={n.color === "root" || n.color === "group" ? 700 : 500}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {n.text.length > 26 ? n.text.slice(0, 25) + "…" : n.text}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Поле редактирования текста узла */}
      {editingId && (() => {
        const n = nodeById(editingId);
        if (!n) return null;
        const rect = svgRef.current?.getBoundingClientRect();
        const left = (rect ? 0 : 0) + view.x + (n.x - NODE_W / 2) * view.zoom;
        const top = view.y + (n.y - NODE_H / 2) * view.zoom;
        return (
          <input
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
            style={{
              position: "absolute",
              left,
              top,
              width: NODE_W * view.zoom,
              height: NODE_H * view.zoom,
            }}
            className="z-20 border-2 border-[var(--drawing-accent)] bg-white text-center text-[12px] px-1"
          />
        );
      })()}
    </div>
  );
}

function ToolBtn({ icon, title, onClick, disabled }: { icon: string; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="min-w-[40px] min-h-[40px] p-2 border-r border-[var(--drawing-line)] last:border-r-0 hover:bg-[var(--drawing-paper)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[var(--drawing-line)]"
    >
      <Icon name={icon} size={16} />
    </button>
  );
}