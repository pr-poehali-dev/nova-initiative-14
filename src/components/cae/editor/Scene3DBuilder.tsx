/**
 * Панель построения 3D-модели (тикет #51).
 *
 * Рисование узлов/стержней мышью прямо в 3D-сцене ещё не реализовано, поэтому
 * для 3D-проектов даём явный и точный способ собрать каркас:
 *   - добавить узел по координатам (x, y, z);
 *   - соединить два выбранных в сцене узла стержнем.
 *
 * Панель компактная, висит поверх 3D-сцены слева снизу. Узлы выбираются
 * кликом в самой сцене (FrameScene3D), число выбранных приходит сюда пропом.
 */
import { useState } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  selectedNodeCount: number;
  onAddNode: (x: number, y: number, z: number) => void;
  onConnect: () => void;
}

export default function Scene3DBuilder({
  selectedNodeCount,
  onAddNode,
  onConnect,
}: Props) {
  const [open, setOpen] = useState(true);
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [z, setZ] = useState("0");

  const parse = (s: string) => {
    const v = parseFloat(s.replace(/,/g, "."));
    return Number.isFinite(v) ? v : 0;
  };

  const addNode = () => {
    onAddNode(parse(x), parse(y), parse(z));
  };

  const field = (
    label: string,
    val: string,
    set: (v: string) => void,
  ) => (
    <label className="text-[10px] font-gost flex-1 min-w-0">
      {label}
      <input
        type="text"
        inputMode="decimal"
        pattern="-?[0-9]*[.,]?[0-9]*"
        value={val}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, ".");
          if (raw === "" || raw === "-" || /^-?[0-9]*\.?[0-9]*$/.test(raw)) set(raw);
        }}
        className="drawing-input mt-0.5 font-mono text-[11px] w-full"
      />
    </label>
  );

  return (
    <div className="absolute top-2 right-2 z-10 w-[208px] bg-[var(--drawing-bg)] border border-[var(--drawing-line)] shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--drawing-line)] font-gost text-[10px] uppercase tracking-[0.15em] text-[var(--drawing-line)]"
      >
        <span className="flex items-center gap-1.5">
          <Icon name="Boxes" size={13} />
          Построение 3D
        </span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} />
      </button>

      {open && (
        <div className="p-2.5 space-y-2">
          <p className="font-gost text-[9px] text-[var(--drawing-line-thin)] leading-snug">
            Координаты узла, м:
          </p>
          <div className="flex gap-1.5">
            {field("x", x, setX)}
            {field("y", y, setY)}
            {field("z", z, setZ)}
          </div>
          <button
            onClick={addNode}
            className="w-full border border-[var(--drawing-line)] py-1.5 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] flex items-center justify-center gap-1.5"
          >
            <Icon name="Plus" size={13} />
            Добавить узел
          </button>

          <div className="extension-line-h w-full my-1" />

          <p className="font-gost text-[9px] text-[var(--drawing-line-thin)] leading-snug">
            Выберите в сцене 2 узла (клик по узлу), затем соедините стержнем.
            Выбрано: {selectedNodeCount}
          </p>
          <button
            onClick={onConnect}
            disabled={selectedNodeCount !== 2}
            className="w-full border border-[var(--drawing-accent)] text-[var(--drawing-accent)] py-1.5 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-accent)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--drawing-accent)] flex items-center justify-center gap-1.5"
          >
            <Icon name="Spline" size={13} />
            Соединить стержнем
          </button>
        </div>
      )}
    </div>
  );
}
