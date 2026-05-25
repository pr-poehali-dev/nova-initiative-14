/**
 * Панель проблем модели (issues).
 * Показывает результат validateModel() — список ошибок (блокируют расчёт)
 * и предупреждений (расчёт пойдёт, но возможны неожиданности).
 *
 * Клик по issue выделяет связанный узел или элемент на канве, чтобы
 * пользователь быстро нашёл и исправил проблему.
 */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { ValidationIssue } from "@/lib/cae-validate";

interface Props {
  issues: ValidationIssue[];
  onFocusNode: (id: string) => void;
  onFocusElement: (id: string) => void;
}

const EditorIssuesPanel = ({ issues, onFocusNode, onFocusElement }: Props) => {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const [open, setOpen] = useState(true);

  if (issues.length === 0) {
    return (
      <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3 flex items-center gap-2 text-[12px] font-gost text-[#1a8a5a]">
        <Icon name="CircleCheck" size={14} />
        Модель корректна — можно запускать расчёт
      </div>
    );
  }

  const handleClick = (it: ValidationIssue) => {
    if (it.target.kind === "node" && it.target.id) onFocusNode(it.target.id);
    else if (it.target.kind === "element" && it.target.id) onFocusElement(it.target.id);
  };

  return (
    <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--drawing-paper)]"
      >
        <span className="flex items-center gap-2 font-gost text-[11px] uppercase tracking-[0.15em]">
          <Icon name="ListChecks" size={14} />
          Проблемы модели
          {errors.length > 0 && (
            <span className="bg-[var(--drawing-accent)] text-white px-1.5 py-0.5 rounded text-[10px] normal-case tracking-normal">
              {errors.length} ошибк{errors.length === 1 ? "а" : errors.length < 5 ? "и" : ""}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="bg-[#c98800] text-white px-1.5 py-0.5 rounded text-[10px] normal-case tracking-normal">
              {warnings.length} предупр.
            </span>
          )}
        </span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} />
      </button>

      {open && (
        <div className="border-t border-[var(--drawing-line)] max-h-[280px] overflow-y-auto">
          {[...errors, ...warnings].map((it, idx) => {
            const isError = it.level === "error";
            const color = isError ? "var(--drawing-accent)" : "#c98800";
            const clickable =
              (it.target.kind === "node" || it.target.kind === "element") && !!it.target.id;
            return (
              <div
                key={idx}
                className={`px-3 py-2 border-b border-dashed border-[var(--drawing-line)] last:border-0 ${
                  clickable ? "cursor-pointer hover:bg-[var(--drawing-paper)]" : ""
                }`}
                onClick={() => clickable && handleClick(it)}
                title={clickable ? "Кликните чтобы выделить объект" : ""}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    name={isError ? "CircleX" : "TriangleAlert"}
                    size={14}
                    className="mt-0.5 shrink-0"
                    style={{ color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-gost leading-snug" style={{ color }}>
                      {it.message}
                    </p>
                    {it.hint && (
                      <p className="text-[11px] text-[var(--drawing-line-thin)] mt-0.5 leading-snug">
                        {it.hint}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EditorIssuesPanel;
