import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import type { ModelLoad, ModelNode } from "@/lib/cae-model";

interface Props {
  open: boolean;
  onClose: () => void;
  dim: "2d" | "3d";
  node: ModelNode | null | undefined;
  nodeLoad: ModelLoad | undefined;
  /** Применить силу по оси (0=Fx,1=Fy,2=Fz). */
  setForce: (axis: 0 | 1 | 2, value: number) => void;
  /** Применить момент по оси (0=Mx,1=My,2=Mz). */
  setMoment: (axis: 0 | 1 | 2, value: number) => void;
  /** Убрать все нагрузки с узла. */
  onRemove: () => void;
}

const parse = (s: string): number => {
  const v = parseFloat(s.replace(/,/g, "."));
  return Number.isFinite(v) ? v : 0;
};

/** Поле ввода числа со знаком и подписью оси. */
function AxisField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const toggleSign = () =>
    onChange(value.startsWith("-") ? value.slice(1) : value === "" ? "-" : `-${value}`);
  return (
    <label className="block">
      <span className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
        {label}, {unit}
      </span>
      <div className="flex items-stretch gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, ".");
            if (raw === "" || raw === "-" || /^-?[0-9]*\.?[0-9]*$/.test(raw)) onChange(raw);
          }}
          placeholder="0"
          className="drawing-input font-mono text-sm flex-1 min-w-0"
        />
        <button
          type="button"
          onClick={toggleSign}
          title="Сменить знак (+/−)"
          className="shrink-0 px-2.5 border border-[var(--drawing-line)] font-mono text-base leading-none flex items-center justify-center hover:bg-[var(--drawing-paper)]"
        >
          ±
        </button>
      </div>
    </label>
  );
}

/**
 * Модальное окно ввода узловых нагрузок. Удобная форма для выбранного узла:
 * силы по осям (Fx/Fy/Fz) и моменты (Mx/My/Mz для 3D, Mz для 2D).
 * Значения применяются к модели по кнопке «Применить».
 */
export default function LoadInputModal({
  open,
  onClose,
  dim,
  node,
  nodeLoad,
  setForce,
  setMoment,
  onRemove,
}: Props) {
  const is3d = dim === "3d";
  const [fx, setFx] = useState("0");
  const [fy, setFy] = useState("0");
  const [fz, setFz] = useState("0");
  const [mx, setMx] = useState("0");
  const [my, setMy] = useState("0");
  const [mz, setMz] = useState("0");

  // При открытии подставляем текущие значения узла.
  useEffect(() => {
    if (!open) return;
    const f = nodeLoad?.force ?? [0, 0, 0];
    const m = nodeLoad?.moment ?? [0, 0, 0];
    setFx(String(f[0] ?? 0));
    setFy(String(f[1] ?? 0));
    setFz(String(f[2] ?? 0));
    setMx(String(m[0] ?? 0));
    setMy(String(m[1] ?? 0));
    setMz(String(m[2] ?? 0));
  }, [open, nodeLoad]);

  if (!open || !node) return null;

  const apply = () => {
    setForce(0, parse(fx));
    setForce(1, parse(fy));
    if (is3d) setForce(2, parse(fz));
    if (is3d) {
      setMoment(0, parse(mx));
      setMoment(1, parse(my));
    }
    setMoment(2, parse(mz));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)]">
          <div className="flex items-center gap-2">
            <Icon name="MoveDown" size={16} className="text-[var(--drawing-accent)]" />
            <h2 className="font-gost-upright text-sm font-bold uppercase tracking-wide">
              Нагрузки на узел {node.id}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="hover:text-[var(--drawing-accent)]">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-2">
              Силы
            </p>
            <div className={`grid ${is3d ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
              <AxisField label="Fx" unit="Н" value={fx} onChange={setFx} />
              <AxisField label="Fy" unit="Н" value={fy} onChange={setFy} />
              {is3d && <AxisField label="Fz" unit="Н" value={fz} onChange={setFz} />}
            </div>
          </div>

          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-2">
              Моменты
            </p>
            <div className={`grid ${is3d ? "grid-cols-3" : "grid-cols-1"} gap-3`}>
              {is3d && <AxisField label="Mx" unit="Н·м" value={mx} onChange={setMx} />}
              {is3d && <AxisField label="My" unit="Н·м" value={my} onChange={setMy} />}
              <AxisField label="Mz" unit="Н·м" value={mz} onChange={setMz} />
            </div>
          </div>

          <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-snug">
            Положительное направление сил — вдоль осей координат. Отрицательная Fy — нагрузка вниз.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[var(--drawing-line)]/40">
          <button
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-accent)] hover:underline"
          >
            Убрать нагрузки
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn-drawing text-xs"
            >
              Отмена
            </button>
            <button
              onClick={apply}
              className="btn-drawing btn-drawing-accent text-xs"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
