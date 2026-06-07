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

  // Смена знака (минус часто недоступен на мобильной decimal-клавиатуре, #54).
  const toggleSign = () => {
    setText((t) => {
      if (t === "" || t === "-") return "-";
      return t.startsWith("-") ? t.slice(1) : `-${t}`;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-1">
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
          className="drawing-input font-mono text-[11px] flex-1 min-w-0"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleSign}
          title="Сменить знак (+/−)"
          aria-label="Сменить знак"
          className="shrink-0 px-2 min-h-[40px] lg:min-h-0 border border-[var(--drawing-line)] font-mono text-[13px] leading-none flex items-center justify-center hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)]"
        >
          ±
        </button>
      </div>
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