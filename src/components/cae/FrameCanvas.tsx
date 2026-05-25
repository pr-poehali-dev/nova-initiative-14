/**
 * 2D-канва для рисования рамы (SVG).
 * Поддерживает:
 *  - pan (правая кнопка / средняя / Space + drag)
 *  - zoom (колесо мыши)
 *  - сетку со snap
 *  - режимы: select / draw-node / draw-element / bc / load
 *  - визуализацию узлов, элементов, КГУ, нагрузок
 *  - наложение деформированной схемы и эпюр после расчёта
 */
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type {
  FrameModel,
  ModelNode,
  ModelElement,
  BoundaryCondition,
  ModelLoad,
  SolverResponse,
} from "@/lib/cae-model";

export type EditorMode =
  | "select"
  | "draw-node"
  | "draw-element"
  | "bc"
  | "load-nodal"
  | "load-distributed";

export type DiagramKind = "none" | "deformed" | "N" | "Qy" | "Mz" | "sigma";

interface Props {
  model: FrameModel;
  setModel: (m: FrameModel) => void;
  mode: EditorMode;
  gridStep: number; // м
  selectedNodeId: string | null;
  selectedElementId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectElement: (id: string | null) => void;
  onCanvasClick: (worldX: number, worldY: number) => void;
  result: SolverResponse | null;
  showDiagram: DiagramKind;
  diagramScale: number;
}

interface ViewState {
  // мировые координаты центра + масштаб (px/м)
  cx: number;
  cy: number;
  pxPerM: number;
}

const NODE_R = 6;
const ELEMENT_W = 2.5;
const ACCENT = "#c0392b";
const LINE = "#1a1a2e";
const THIN = "#3a3a5e";
const BG = "#faf8f0";
const GRID = "rgba(26,26,46,0.08)";
const AXIS = "rgba(26,26,46,0.35)";

function snap(v: number, step: number) {
  return Math.round(v / step) * step;
}

const FrameCanvas = ({
  model,
  setModel,
  mode,
  gridStep,
  selectedNodeId,
  selectedElementId,
  onSelectNode,
  onSelectElement,
  onCanvasClick,
  result,
  showDiagram,
  diagramScale,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [view, setView] = useState<ViewState>({ cx: 2, cy: 1, pxPerM: 80 });
  const [panning, setPanning] = useState<{ x: number; y: number } | null>(null);
  const [pendingFirstNodeId, setPendingFirstNodeId] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);

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

  // Координатные функции (мировые в м → экранные в px)
  const toScreenX = (x: number) => size.w / 2 + (x - view.cx) * view.pxPerM;
  // ось Y инвертирована: вверх в мире = вверх на экране
  const toScreenY = (y: number) => size.h / 2 - (y - view.cy) * view.pxPerM;
  const toWorld = (sx: number, sy: number) => ({
    x: view.cx + (sx - size.w / 2) / view.pxPerM,
    y: view.cy - (sy - size.h / 2) / view.pxPerM,
  });

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldBefore = toWorld(mx, my);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newPx = Math.max(20, Math.min(500, view.pxPerM * factor));
    // сохраняем позицию мира под курсором
    const newCx = worldBefore.x - (mx - size.w / 2) / newPx;
    const newCy = worldBefore.y + (my - size.h / 2) / newPx;
    setView({ cx: newCx, cy: newCy, pxPerM: newPx });
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    // средняя/правая кнопка или с shift — pan
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      setPanning({ x: sx, y: sy });
      svgRef.current!.setPointerCapture(e.pointerId);
      return;
    }
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = toWorld(sx, sy);
    setCursorWorld(w);
    if (panning) {
      const dx = (sx - panning.x) / view.pxPerM;
      const dy = (sy - panning.y) / view.pxPerM;
      setView((v) => ({ ...v, cx: v.cx - dx, cy: v.cy + dy }));
      setPanning({ x: sx, y: sy });
    }
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (panning) {
      setPanning(null);
      try {
        svgRef.current!.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (panning) return;
    if (e.shiftKey) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = toWorld(sx, sy);
    const sx_ = snap(w.x, gridStep);
    const sy_ = snap(w.y, gridStep);
    onCanvasClick(sx_, sy_);
  };

  // === Поиск узла под курсором (для draw-element / select) ===
  const nodeAt = (worldX: number, worldY: number): ModelNode | null => {
    const r = (NODE_R + 4) / view.pxPerM;
    for (const n of model.nodes) {
      const dx = n.coords[0] - worldX;
      const dy = n.coords[1] - worldY;
      if (Math.sqrt(dx * dx + dy * dy) <= r) return n;
    }
    return null;
  };

  const handleNodeClick = (n: ModelNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "draw-element") {
      if (!pendingFirstNodeId) {
        setPendingFirstNodeId(n.id);
      } else if (pendingFirstNodeId !== n.id) {
        const exists = model.elements.some(
          (el) =>
            (el.node_start === pendingFirstNodeId && el.node_end === n.id) ||
            (el.node_start === n.id && el.node_end === pendingFirstNodeId),
        );
        if (!exists) {
          const newEl: ModelElement = {
            id: `e${model.elements.length + 1}`,
            node_start: pendingFirstNodeId,
            node_end: n.id,
            material_id: model.materials[0]?.id || "steel",
            section_id: model.sections[0]?.id || "i20",
          };
          setModel({ ...model, elements: [...model.elements, newEl] });
        }
        setPendingFirstNodeId(null);
      } else {
        setPendingFirstNodeId(null);
      }
      return;
    }
    onSelectNode(n.id);
    onSelectElement(null);
  };

  const handleElementClick = (el: ModelElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "draw-element") return;
    onSelectElement(el.id);
    onSelectNode(null);
  };

  // === Рендер сетки ===
  const grid: React.ReactElement[] = [];
  const gridPx = gridStep * view.pxPerM;
  if (gridPx >= 14) {
    const w0 = toWorld(0, 0);
    const w1 = toWorld(size.w, size.h);
    const xStart = Math.floor(w0.x / gridStep) * gridStep;
    const xEnd = Math.ceil(w1.x / gridStep) * gridStep;
    const yStart = Math.floor(w1.y / gridStep) * gridStep;
    const yEnd = Math.ceil(w0.y / gridStep) * gridStep;
    for (let x = xStart; x <= xEnd + 1e-9; x += gridStep) {
      const sx = toScreenX(x);
      grid.push(
        <line key={`vx${x.toFixed(3)}`} x1={sx} x2={sx} y1={0} y2={size.h} stroke={GRID} strokeWidth={1} />,
      );
    }
    for (let y = yStart; y <= yEnd + 1e-9; y += gridStep) {
      const sy = toScreenY(y);
      grid.push(
        <line key={`hy${y.toFixed(3)}`} x1={0} x2={size.w} y1={sy} y2={sy} stroke={GRID} strokeWidth={1} />,
      );
    }
  }
  // оси
  const x0 = toScreenX(0);
  const y0 = toScreenY(0);
  if (x0 >= 0 && x0 <= size.w)
    grid.push(<line key="axY" x1={x0} x2={x0} y1={0} y2={size.h} stroke={AXIS} strokeWidth={1.2} />);
  if (y0 >= 0 && y0 <= size.h)
    grid.push(<line key="axX" x1={0} x2={size.w} y1={y0} y2={y0} stroke={AXIS} strokeWidth={1.2} />);

  // === Деформированная схема ===
  const dispMap = new Map(
    (result?.nodal_displacements || []).map((d) => [d.node_id, d]),
  );

  const renderDeformed = showDiagram === "deformed" && result;

  // === Эпюры по элементам ===
  const renderDiagramOnEl = (el: ModelElement) => {
    if (!result) return null;
    const er = result.elements.find((e) => e.element_id === el.id);
    if (!er) return null;
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) return null;
    const dx = b.coords[0] - a.coords[0];
    const dy = b.coords[1] - a.coords[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-9) return null;
    const ux = dx / len;
    const uy = dy / len;
    // нормаль (поворот на +90°)
    const nx = -uy;
    const ny = ux;
    let vals: number[] = [];
    let color = ACCENT;
    if (showDiagram === "N") {
      vals = er.diagrams.N;
      color = "#2c3e80";
    } else if (showDiagram === "Qy") {
      vals = er.diagrams.Qy;
      color = "#1a8a5a";
    } else if (showDiagram === "Mz") {
      vals = er.diagrams.Mz;
      color = "#c0392b";
    } else if (showDiagram === "sigma") {
      vals = er.diagrams.sigma_vm;
      color = "#7d3c98";
    } else {
      return null;
    }
    const xs = er.diagrams.x;
    const maxAbs = Math.max(1e-12, ...vals.map((v) => Math.abs(v)));
    const offsetPx = 40 * diagramScale;
    const points: string[] = [];
    for (let i = 0; i < xs.length; i++) {
      const t = xs[i] / len;
      const wx = a.coords[0] + dx * t;
      const wy = a.coords[1] + dy * t;
      const dist = (vals[i] / maxAbs) * offsetPx;
      const sx = toScreenX(wx) + nx * dist;
      const sy = toScreenY(wy) - ny * dist;
      points.push(`${sx},${sy}`);
    }
    // подложка (заливка от линии элемента к эпюре)
    const baseStart = `${toScreenX(a.coords[0])},${toScreenY(a.coords[1])}`;
    const baseEnd = `${toScreenX(b.coords[0])},${toScreenY(b.coords[1])}`;
    const fillPoints = [baseStart, ...points, baseEnd].join(" ");
    return (
      <g key={`d${el.id}`} pointerEvents="none">
        <polygon points={fillPoints} fill={color} fillOpacity={0.15} />
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={1.5} />
      </g>
    );
  };

  // === Рисуем нагрузки ===
  const renderLoad = (ld: ModelLoad) => {
    if (ld.type === "nodal_force" && ld.node_id) {
      const n = model.nodes.find((x) => x.id === ld.node_id);
      if (!n) return null;
      const fx = ld.force?.[0] || 0;
      const fy = ld.force?.[1] || 0;
      const sx = toScreenX(n.coords[0]);
      const sy = toScreenY(n.coords[1]);
      const mag = Math.sqrt(fx * fx + fy * fy);
      if (mag < 1e-9) return null;
      const len = 60;
      const ex = sx - (fx / mag) * len;
      const ey = sy + (fy / mag) * len;
      const angle = Math.atan2(sy - ey, sx - ex);
      const ah = 8;
      const a1x = sx - Math.cos(angle - Math.PI / 6) * ah;
      const a1y = sy - Math.sin(angle - Math.PI / 6) * ah;
      const a2x = sx - Math.cos(angle + Math.PI / 6) * ah;
      const a2y = sy - Math.sin(angle + Math.PI / 6) * ah;
      return (
        <g key={ld.id} pointerEvents="none">
          <line x1={ex} y1={ey} x2={sx} y2={sy} stroke={ACCENT} strokeWidth={2} />
          <polygon points={`${sx},${sy} ${a1x},${a1y} ${a2x},${a2y}`} fill={ACCENT} />
          <text x={ex} y={ey - 6} fontSize={11} fill={ACCENT} fontFamily="monospace">
            {Math.round(mag)} Н
          </text>
        </g>
      );
    }
    return null;
  };

  // === КГУ ===
  const renderBC = (bc: BoundaryCondition) => {
    const n = model.nodes.find((x) => x.id === bc.node_id);
    if (!n) return null;
    const sx = toScreenX(n.coords[0]);
    const sy = toScreenY(n.coords[1]);
    const dofs = new Set(bc.constrained_dofs);
    if (dofs.has("ux") && dofs.has("uy") && dofs.has("rz")) {
      // защемление: квадрат с штриховкой
      const s = 14;
      return (
        <g key={bc.id} pointerEvents="none">
          <rect x={sx - s} y={sy - 2} width={s * 2} height={s} fill={LINE} fillOpacity={0.15} stroke={LINE} strokeWidth={1.5} />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={sx - s + i * 7} y1={sy + s - 2} x2={sx - s + i * 7 + 6} y2={sy + s + 6} stroke={LINE} strokeWidth={1.2} />
          ))}
        </g>
      );
    }
    if (dofs.has("ux") && dofs.has("uy")) {
      // шарнирная: треугольник + штриховка
      const s = 10;
      return (
        <g key={bc.id} pointerEvents="none">
          <polygon points={`${sx},${sy + 2} ${sx - s},${sy + s + 2} ${sx + s},${sy + s + 2}`} fill={LINE} fillOpacity={0.15} stroke={LINE} strokeWidth={1.5} />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={sx - s + i * 6} y1={sy + s + 2} x2={sx - s + i * 6 + 5} y2={sy + s + 10} stroke={LINE} strokeWidth={1.2} />
          ))}
        </g>
      );
    }
    // каток
    return (
      <g key={bc.id} pointerEvents="none">
        <circle cx={sx} cy={sy + 10} r={5} fill={BG} stroke={LINE} strokeWidth={1.5} />
        <line x1={sx - 10} y1={sy + 16} x2={sx + 10} y2={sy + 16} stroke={LINE} strokeWidth={1.5} />
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      className="w-full h-full select-none"
      style={{
        background: BG,
        cursor: panning ? "grabbing" : mode === "draw-node" ? "crosshair" : "default",
        touchAction: "none",
      }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleSvgClick}
    >
      {/* сетка */}
      {grid}

      {/* элементы (исходные) */}
      {model.elements.map((el) => {
        const a = model.nodes.find((n) => n.id === el.node_start);
        const b = model.nodes.find((n) => n.id === el.node_end);
        if (!a || !b) return null;
        const isSel = selectedElementId === el.id;
        return (
          <line
            key={el.id}
            x1={toScreenX(a.coords[0])}
            y1={toScreenY(a.coords[1])}
            x2={toScreenX(b.coords[0])}
            y2={toScreenY(b.coords[1])}
            stroke={isSel ? ACCENT : LINE}
            strokeWidth={isSel ? ELEMENT_W + 1.5 : ELEMENT_W}
            style={{ cursor: "pointer" }}
            onClick={(e) => handleElementClick(el, e)}
          />
        );
      })}

      {/* деформированная форма */}
      {renderDeformed &&
        model.elements.map((el) => {
          const a = model.nodes.find((n) => n.id === el.node_start);
          const b = model.nodes.find((n) => n.id === el.node_end);
          if (!a || !b) return null;
          const da = dispMap.get(a.id);
          const db = dispMap.get(b.id);
          if (!da || !db) return null;
          const k = diagramScale * 200;
          return (
            <line
              key={`def${el.id}`}
              x1={toScreenX(a.coords[0] + da.ux * k)}
              y1={toScreenY(a.coords[1] + da.uy * k)}
              x2={toScreenX(b.coords[0] + db.ux * k)}
              y2={toScreenY(b.coords[1] + db.uy * k)}
              stroke={ACCENT}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          );
        })}

      {/* эпюры */}
      {result && showDiagram !== "none" && showDiagram !== "deformed" &&
        model.elements.map((el) => renderDiagramOnEl(el))}

      {/* КГУ */}
      {model.boundary_conditions.map((bc) => renderBC(bc))}

      {/* нагрузки */}
      {model.loads.map((ld) => renderLoad(ld))}

      {/* preview элемента (draw-element) */}
      {mode === "draw-element" && pendingFirstNodeId && cursorWorld && (() => {
        const n = model.nodes.find((x) => x.id === pendingFirstNodeId);
        if (!n) return null;
        return (
          <line
            x1={toScreenX(n.coords[0])}
            y1={toScreenY(n.coords[1])}
            x2={toScreenX(cursorWorld.x)}
            y2={toScreenY(cursorWorld.y)}
            stroke={ACCENT}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        );
      })()}

      {/* узлы */}
      {model.nodes.map((n) => {
        const isSel = selectedNodeId === n.id;
        const isPending = pendingFirstNodeId === n.id;
        return (
          <g key={n.id} style={{ cursor: "pointer" }} onClick={(e) => handleNodeClick(n, e)}>
            <circle
              cx={toScreenX(n.coords[0])}
              cy={toScreenY(n.coords[1])}
              r={isSel || isPending ? NODE_R + 3 : NODE_R}
              fill={isSel ? ACCENT : isPending ? ACCENT : BG}
              stroke={isSel || isPending ? ACCENT : LINE}
              strokeWidth={2}
            />
            <text
              x={toScreenX(n.coords[0]) + 10}
              y={toScreenY(n.coords[1]) - 8}
              fontSize={10}
              fill={THIN}
              fontFamily="monospace"
              pointerEvents="none"
            >
              {n.id}
            </text>
          </g>
        );
      })}

      {/* координаты курсора */}
      {cursorWorld && (
        <text x={10} y={size.h - 12} fontSize={11} fill={THIN} fontFamily="monospace" pointerEvents="none">
          {`x=${cursorWorld.x.toFixed(2)} м,  y=${cursorWorld.y.toFixed(2)} м   ·   масштаб ${view.pxPerM.toFixed(0)} px/м`}
        </text>
      )}
    </svg>
  );
};

export default FrameCanvas;
