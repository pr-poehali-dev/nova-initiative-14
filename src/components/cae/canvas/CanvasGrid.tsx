import { GRID, AXIS } from "./canvas-constants";

interface Props {
  size: { w: number; h: number };
  gridStep: number;
  pxPerM: number;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  toWorld: (sx: number, sy: number) => { x: number; y: number };
}

const CanvasGrid = ({ size, gridStep, pxPerM, toScreenX, toScreenY, toWorld }: Props) => {
  const grid: React.ReactElement[] = [];
  const gridPx = gridStep * pxPerM;
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

  return <>{grid}</>;
};

export default CanvasGrid;
