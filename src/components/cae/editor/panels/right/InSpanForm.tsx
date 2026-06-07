import { useState } from "react";

/**
 * Форма добавления сосредоточенной силы в пролёте элемента.
 *  - pos: относительная позиция (0…1) от начала элемента
 *  - py:  сила вдоль локальной оси y, в ньютонах
 */
export default function InSpanForm({ onAdd }: { onAdd: (pos: number, py: number) => void }) {
  const [pos, setPos] = useState(0.5);
  const [py, setPy] = useState(-1000);

  // Позиция всегда в диапазоне [0, 1]; невалидный ввод → центр (0.5).
  const safePos = Number.isFinite(pos) ? Math.min(1, Math.max(0, pos)) : 0.5;
  const safePy = Number.isFinite(py) ? py : 0;

  const submit = () => onAdd(safePos, safePy);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] font-gost">
          Позиция (0…1)
          <input
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            max={1}
            value={pos}
            onChange={(e) => setPos(parseFloat(e.target.value))}
            onKeyDown={onKey}
            className="drawing-input font-mono text-[11px] mt-0.5"
          />
        </label>
        <label className="text-[10px] font-gost">
          Py, Н
          <div className="flex items-stretch gap-1 mt-0.5">
            <input
              type="text"
              inputMode="decimal"
              pattern="-?[0-9]*[.,]?[0-9]*"
              step={100}
              value={py}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, ".");
                if (raw === "" || raw === "-" || /^-?[0-9]*\.?[0-9]*$/.test(raw)) {
                  setPy(raw === "" || raw === "-" ? 0 : parseFloat(raw));
                }
              }}
              onKeyDown={onKey}
              className="drawing-input font-mono text-[11px] flex-1 min-w-0"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPy((v) => -(Number.isFinite(v) ? v : 0))}
              title="Сменить знак (+/−)"
              aria-label="Сменить знак"
              className="shrink-0 px-2 min-h-[40px] lg:min-h-0 border border-[var(--drawing-line)] font-mono text-[13px] leading-none flex items-center justify-center hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)]"
            >
              ±
            </button>
          </div>
        </label>
      </div>
      <p className="text-[9px] font-gost text-[var(--drawing-line-thin)] leading-snug">
        Позиция — доля длины от начала стержня: 0.5 = середина, 0.8 = на 80%
        длины. Дробь вида «4/5» вводить не нужно — впишите 0.8.
      </p>
      <button
        type="button"
        onClick={submit}
        className="w-full border border-[var(--drawing-accent)] text-[var(--drawing-accent)] py-2 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-accent)] hover:text-white min-h-[40px] lg:min-h-0"
      >
        Добавить силу
      </button>
    </div>
  );
}