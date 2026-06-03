import type { FrameModel, ModelElement, SolverResponse } from "@/lib/cae-model";
import { ACCENT } from "./canvas-constants";
import { formatForce, formatMoment } from "@/lib/formatForce";

interface Props {
  model: FrameModel;
  result: SolverResponse | null;
  showDiagram: "none" | "deformed" | "N" | "Qy" | "Mz" | "sigma" | "uy";
  diagramScale: number;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
}

// Форматирование значения эпюры с единицами по системе СИ.
// Силы (N, Qy) и моменты (Mz) масштабируются с приставкой кратности
// прямо в единице (например «20.0 кН·м») через общие форматтеры.
// Напряжения (МПа) и перемещения (мм) выводятся в производных единицах.
const fmtVal = (v: number, kind: string): string => {
  if (kind === "N" || kind === "Qy") return formatForce(v);
  if (kind === "Mz") return formatMoment(v);
  if (kind === "sigma") {
    const mpa = v / 1e6;
    return `${mpa.toFixed(Math.abs(mpa) >= 100 ? 0 : 1)} МПа`;
  }
  if (kind === "uy") {
    const mm = v * 1e3;
    return `${mm.toFixed(Math.abs(mm) >= 10 ? 1 : 2)} мм`;
  }
  return String(v);
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
    else if (showDiagram === "uy") { vals = er.diagrams.uy_local ?? []; color = "#d97706"; }

    const maxAbs = Math.max(1e-12, ...vals.map((v) => Math.abs(v)));
    elDataList.push({ el, vals, xs: er.diagrams.x, color, nx, ny, dx, dy, len, a, b, maxAbs });
  }

  // Глобальный максимум и минимум — для подписей, поиска экстремумов И масштаба.
  const globalMax = Math.max(...elDataList.flatMap((d) => d.vals));
  const globalMin = Math.min(...elDataList.flatMap((d) => d.vals));

  // ЕДИНЫЙ глобальный масштаб эпюр (тикет №39): амплитуда всех стержней
  // считается от одного максимума по модулю по всей раме. Благодаря этому
  // эпюры физически согласованы — в общем узле значение у соседних балок
  // совпадает (например, −10 Н·м у одной и +10 Н·м у другой ложатся в одну
  // точку). Пользователь регулирует визуальную высоту ползунком diagramScale.
  const globalAbs = Math.max(
    1e-12,
    Math.abs(globalMax),
    Math.abs(globalMin),
    ...elDataList.map((d) => d.maxAbs),
  );
  const offsetPx = 40 * diagramScale;

  // Находим точки глобального макс и мин
  let maxPoint: DiagramPoint | null = null;
  let minPoint: DiagramPoint | null = null;

  const svgElements: React.ReactNode[] = [];

  for (const d of elDataList) {
    const { el, vals, xs, color, nx, ny, dx, dy, len, a } = d;
    const points: string[] = [];

    // Знаковое соглашение РФ-школы: эпюра M рисуется со стороны РАСТЯНУТОГО волокна.
    // Левая нормаль (-uy, ux) указывает "вверх" для горизонтального стержня и "наружу"
    // влево для вертикального. Положительный Mz по нашему солверу растягивает нижнее
    // волокно (правая сторона относительно направления стержня), поэтому для Mz
    // инвертируем знак — эпюра ложится на сторону растянутого волокна.
    const signFactor = showDiagram === "Mz" ? -1 : 1;
    for (let i = 0; i < xs.length; i++) {
      const t = xs[i] / len;
      const wx = a.coords[0] + dx * t;
      const wy = a.coords[1] + dy * t;
      // Единый глобальный масштаб (тикет №39): нормируем по общему максимуму
      // globalAbs, поэтому эпюры соседних стержней совпадают в общих узлах,
      // а высота столбика отражает реальное соотношение усилий между балками.
      const dist = signFactor * (vals[i] / globalAbs) * offsetPx;
      const sx = toScreenX(wx) + nx * dist;
      const sy = toScreenY(wy) - ny * dist;
      points.push(`${sx},${sy}`);

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
    const text = fmtVal(pt.val, kind);

    // Смещение подписи: чуть дальше от линии эпюры (в ту же сторону, куда легла эпюра).
    // Для Mz знак инвертирован — подпись тоже должна следовать за инверсией.
    const d = elDataList.find((d) => d.el.id === pt.elId);
    const extraOffset = 10;
    const signFactor = kind === "Mz" ? -1 : 1;
    const sign = (pt.val >= 0 ? 1 : -1) * signFactor;
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