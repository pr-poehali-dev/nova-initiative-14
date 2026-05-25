import type { FrameModel, ModelElement, SolverResponse } from "@/lib/cae-model";
import { ACCENT } from "./canvas-constants";

interface Props {
  model: FrameModel;
  result: SolverResponse | null;
  showDiagram: "none" | "deformed" | "N" | "Qy" | "Mz" | "sigma";
  diagramScale: number;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
}

// Единицы измерения для каждого типа эпюры
const UNITS: Record<string, string> = {
  N: "Н",
  Qy: "Н",
  Mz: "Н·м",
  sigma: "МПа",
};

// Форматирование значения: автовыбор разрядности
const fmtVal = (v: number, kind: string): string => {
  const val = kind === "sigma" ? v / 1e6 : v;
  const abs = Math.abs(val);
  if (abs === 0) return "0";
  if (abs >= 10000) return `${(val / 1000).toFixed(1)}к`;
  if (abs >= 1000) return val.toFixed(0);
  if (abs >= 100) return val.toFixed(1);
  if (abs >= 1) return val.toFixed(2);
  return val.toExponential(2);
};

interface DiagramPoint {
  sx: number;
  sy: number;
  val: number;
  idx: number;
  elId: string;
}

const CanvasDiagrams = ({ model, result, showDiagram, diagramScale, toScreenX, toScreenY }: Props) => {
  if (!result || showDiagram === "none" || showDiagram === "deformed") return null;

  // Сначала собираем данные по всем элементам, чтобы найти глобальный макс/мин
  interface ElData {
    el: ModelElement;
    vals: number[];
    xs: number[];
    color: string;
    nx: number;
    ny: number;
    dx: number;
    dy: number;
    len: number;
    a: { coords: [number, number, number] };
    b: { coords: [number, number, number] };
    maxAbs: number;
  }
  const elDataList: ElData[] = [];

  for (const el of model.elements) {
    const er = result.elements.find((e) => e.element_id === el.id);
    if (!er) continue;
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    if (!a || !b) continue;
    const dx = b.coords[0] - a.coords[0];
    const dy = b.coords[1] - a.coords[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-9) continue;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    let vals: number[] = [];
    let color = ACCENT;
    if (showDiagram === "N") { vals = er.diagrams.N; color = "#2c3e80"; }
    else if (showDiagram === "Qy") { vals = er.diagrams.Qy; color = "#1a8a5a"; }
    else if (showDiagram === "Mz") { vals = er.diagrams.Mz; color = "#c0392b"; }
    else if (showDiagram === "sigma") { vals = er.diagrams.sigma_vm; color = "#7d3c98"; }

    const maxAbs = Math.max(1e-12, ...vals.map((v) => Math.abs(v)));
    elDataList.push({ el, vals, xs: er.diagrams.x, color, nx, ny, dx, dy, len, a, b, maxAbs });
  }

  // Глобальный максимум и минимум (для единого масштаба подписей)
  const globalMax = Math.max(...elDataList.flatMap((d) => d.vals));
  const globalMin = Math.min(...elDataList.flatMap((d) => d.vals));
  const globalMaxAbs = Math.max(1e-12, ...elDataList.flatMap((d) => d.vals.map(Math.abs)));
  const offsetPx = 40 * diagramScale;

  // Находим точки глобального макс и мин
  let maxPoint: DiagramPoint | null = null;
  let minPoint: DiagramPoint | null = null;

  const svgElements: React.ReactNode[] = [];

  for (const d of elDataList) {
    const { el, vals, xs, color, nx, ny, dx, dy, len, a } = d;
    const points: string[] = [];
    const screenPts: { sx: number; sy: number }[] = [];

    for (let i = 0; i < xs.length; i++) {
      const t = xs[i] / len;
      const wx = a.coords[0] + dx * t;
      const wy = a.coords[1] + dy * t;
      const dist = (vals[i] / globalMaxAbs) * offsetPx;
      const sx = toScreenX(wx) + nx * dist;
      const sy = toScreenY(wy) - ny * dist;
      points.push(`${sx},${sy}`);
      screenPts.push({ sx, sy });

      if (vals[i] === globalMax && maxPoint === null) {
        maxPoint = { sx, sy, val: globalMax, idx: i, elId: el.id };
      }
      if (vals[i] === globalMin && minPoint === null) {
        minPoint = { sx, sy, val: globalMin, idx: i, elId: el.id };
      }
    }

    const asx = toScreenX(a.coords[0]);
    const asy = toScreenY(a.coords[1]);
    const bsx = toScreenX(d.b.coords[0]);
    const bsy = toScreenY(d.b.coords[1]);
    const fillPoints = [`${asx},${asy}`, ...points, `${bsx},${bsy}`].join(" ");

    svgElements.push(
      <g key={`d${el.id}`} pointerEvents="none">
        <polygon points={fillPoints} fill={color} fillOpacity={0.15} />
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={1.5} />
      </g>,
    );
  }

  // Рендерим подписи макс/мин
  const renderLabel = (pt: DiagramPoint, isMax: boolean, kind: string) => {
    const color = elDataList.find((d) => d.el.id === pt.elId)?.color ?? ACCENT;
    const unit = UNITS[kind] ?? "";
    const text = `${fmtVal(pt.val, kind)} ${unit}`;

    // Смещение подписи: чуть дальше от линии эпюры
    const d = elDataList.find((d) => d.el.id === pt.elId);
    const extraOffset = 10;
    const sign = pt.val >= 0 ? 1 : -1;
    const lx = pt.sx + (d ? d.nx * sign * extraOffset : 0);
    const ly = pt.sy - (d ? d.ny * sign * extraOffset : 0);

    // Якорь текста зависит от направления нормали
    const nx = d?.nx ?? 0;
    const anchor = nx > 0.3 ? "start" : nx < -0.3 ? "end" : "middle";
    const baseline = (d?.ny ?? 0) > 0.3 ? "auto" : (d?.ny ?? 0) < -0.3 ? "hanging" : "middle";

    return (
      <g key={`lbl-${pt.elId}-${isMax ? "max" : "min"}`} pointerEvents="none">
        {/* Маркер-точка */}
        <circle cx={pt.sx} cy={pt.sy} r={3} fill={color} />
        {/* Фон подписи */}
        <text
          x={lx}
          y={ly}
          fontSize={10}
          fontFamily="monospace"
          fill="white"
          stroke="white"
          strokeWidth={3}
          strokeLinejoin="round"
          textAnchor={anchor}
          dominantBaseline={baseline}
          paintOrder="stroke"
        >
          {text}
        </text>
        {/* Сама подпись */}
        <text
          x={lx}
          y={ly}
          fontSize={10}
          fontFamily="monospace"
          fill={color}
          textAnchor={anchor}
          dominantBaseline={baseline}
        >
          {text}
        </text>
      </g>
    );
  };

  // Добавляем подписи: макс всегда, мин — только если отличается от макса и значимый
  const labels: React.ReactNode[] = [];
  if (maxPoint && Math.abs((maxPoint as DiagramPoint).val) > 1e-9) {
    labels.push(renderLabel(maxPoint, true, showDiagram));
  }
  if (
    minPoint &&
    Math.abs((minPoint as DiagramPoint).val) > 1e-9 &&
    (minPoint as DiagramPoint).val !== globalMax
  ) {
    labels.push(renderLabel(minPoint, false, showDiagram));
  }

  return (
    <>
      {svgElements}
      {labels}
    </>
  );
};

export default CanvasDiagrams;
