import { useState } from "react";

/**
 * Форма ввода распределённой равномерной нагрузки q (по локальной оси y).
 * Кнопка «Применить» появляется только когда введено ненулевое значение,
 * чтобы добавление было явным (а не «молча на blur»). Поддержан Enter.
 *
 *  - current: текущее значение q на элементе (Н/м), 0 если нагрузки нет
 *  - onApply: сохранить значение в модель
 */
export default function DistributedForm({
  current,
  onApply,
}: {
  current: number;
  onApply: (qy: number) => void;
}) {
  const [text, setText] = useState(current ? String(current) : "");

  const parsed = parseFloat(text.replace(/,/g, "."));
  const valid = Number.isFinite(parsed);
  const changed = valid && parsed !== current;

  const apply = () => {
    if (valid) onApply(parsed);
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        inputMode="decimal"
        pattern="-?[0-9]*[.,]?[0-9]*"
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, ".");
          if (raw === "" || raw === "-" || /^-?[0-9]*\.?[0-9]*$/.test(raw)) {
            setText(raw);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        placeholder="0 (нет нагрузки)"
        className="drawing-input font-mono text-[11px]"
      />
      {/* Кнопка появляется только когда есть валидное изменённое значение */}
      {changed && (
        <button
          type="button"
          onClick={apply}
          className="w-full border border-[var(--drawing-accent)] text-[var(--drawing-accent)] py-2 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-accent)] hover:text-white min-h-[40px] lg:min-h-0"
        >
          {current ? "Обновить нагрузку" : "Добавить нагрузку"}
        </button>
      )}
    </div>
  );
}
