import { useState, useEffect } from "react";

/**
 * Числовой input с локальным состоянием и commit-ом на blur/Enter.
 * Решает проблему «пользователь стирает 0 чтобы напечатать -1000, а во время ввода
 * вызываются onChange с NaN, что сбрасывает нагрузку».
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

  // Синхронизируем локальный текст с внешним value, когда поле НЕ в фокусе
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <input
      type="number"
      step={step}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
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
