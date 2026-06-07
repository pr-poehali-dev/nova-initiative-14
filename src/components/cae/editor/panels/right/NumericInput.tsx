import { useState, useEffect, useRef } from "react";

/**
 * Числовой input с локальным состоянием и commit-ом на blur/Enter.
 *
 * Особенности UX:
 *  1. На фокус — если значение "0", сразу выделяем весь текст. Пользователь
 *     начинает печатать «5» или «-» и оно мгновенно перезаписывает «0»,
 *     без необходимости вручную стирать.
 *  2. Локальное состояние text позволяет промежуточные значения вроде «-» или «»
 *     без вызовов onCommit (которые сбросили бы нагрузку до 0).
 *  3. Commit срабатывает только на blur / Enter, с парсингом и fallback в 0.
 */
export default function NumericInput({
  value,
  onCommit,
  step = 100,
  placeholder = "",
  className = "drawing-input mb-3 font-mono text-[11px]",
  signToggle = false,
}: {
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  placeholder?: string;
  className?: string;
  /**
   * Показать кнопку «±» для смены знака. Нужна на мобильных: многие
   * клавиатуры с inputMode="decimal" не выводят минус, из-за чего нельзя
   * задать отрицательную нагрузку/координату (тикет #54).
   */
  signToggle?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Синхронизируем локальный текст с внешним value, когда поле НЕ в фокусе
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  // Сменить знак текущего значения (по кнопке ±). Работает и для
  // промежуточного состояния в фокусе, и для зафиксированного значения.
  const toggleSign = () => {
    if (focused) {
      setText((t) => {
        if (t === "" || t === "-" || t === ".") return "-";
        return t.startsWith("-") ? t.slice(1) : `-${t}`;
      });
      inputRef.current?.focus();
    } else {
      const next = -value;
      setText(String(next));
      onCommit(next);
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      pattern="-?[0-9]*[.,]?[0-9]*"
      step={step}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        // Выделяем весь текст при входе в поле — это удобный UX:
        // если стоит «0», первая цифра/знак минус сразу заменит его.
        // setTimeout — некоторые мобильные браузеры (Safari iOS) откладывают
        // селекцию до окончания focus-обработчика.
        const el = e.currentTarget;
        setTimeout(() => {
          try { el.select(); } catch { /* ignore */ }
        }, 0);
      }}
      onChange={(e) => {
        // Принимаем только цифры, минус, точку и запятую.
        // Запятую конвертируем в точку, чтобы parseFloat работал на ru-раскладке.
        const raw = e.target.value.replace(/,/g, ".");
        // Разрешаем промежуточные состояния: "", "-", "-1.", "1."
        if (raw === "" || raw === "-" || /^-?[0-9]*\.?[0-9]*$/.test(raw)) {
          setText(raw);
        }
      }}
      onBlur={() => {
        setFocused(false);
        // Пустое или "-" — трактуем как 0
        if (text === "" || text === "-" || text === ".") {
          onCommit(0);
          setText("0");
          return;
        }
        const v = parseFloat(text);
        onCommit(isFinite(v) ? v : 0);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
      placeholder={placeholder}
    />
  );

  if (!signToggle) return input;

  // Поле + кнопка смены знака. Кнопка не уводит фокус с поля (preventDefault
  // на mousedown), чтобы на мобиле клавиатура не закрывалась.
  return (
    <div className="flex items-stretch gap-1">
      <div className="flex-1 min-w-0">{input}</div>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleSign}
        title="Сменить знак (+/−)"
        aria-label="Сменить знак"
        className="shrink-0 px-2 min-h-[40px] lg:min-h-0 border border-[var(--drawing-line)] font-mono text-[13px] leading-none flex items-center justify-center hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] self-start"
      >
        ±
      </button>
    </div>
  );
}