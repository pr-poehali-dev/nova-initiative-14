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

const CanvasDiagrams = ({ model, result, showDiagram, diagramScale, toScreenX, toScreenY }: Props) => {
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

  if (!result || showDiagram === "none" || showDiagram === "deformed") return null;

  return <>{model.elements.map((el) => renderDiagramOnEl(el))}</>;
};

export default CanvasDiagrams;
