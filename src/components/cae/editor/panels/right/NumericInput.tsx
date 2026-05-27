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
}: {
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Синхронизируем локальный текст с внешним value, когда поле НЕ в фокусе
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
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
}