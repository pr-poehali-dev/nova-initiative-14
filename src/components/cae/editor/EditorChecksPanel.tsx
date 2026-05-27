/**
 * Панель проверок (отображается после расчёта).
 * Показывает коэффициент использования η по каждому элементу и каждой проверке,
 * с цветовой индикацией: зелёный η<0.85, жёлтый 0.85–1.0, красный η>1.0.
 *
 * Клик по строке выделяет элемент на канве — пользователь сразу видит,
 * где конструкция перегружена.
 */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { FrameModel, SolverResponse } from "@/lib/cae-model";
import { runChecks, utilizationColor, type ElementCheck } from "@/lib/cae-checks";
import { safeFixed, safeNum } from "@/lib/safe-number";

interface Props {
  model: FrameModel;
  result: SolverResponse | null;
  onFocusElement: (id: string) => void;
  onOpenSettings: () => void;
}

const EditorChecksPanel = ({ model, result, onFocusElement, onOpenSettings }: Props) => {
  const [open, setOpen] = useState(true);

  if (!result) return null;

  // Защита от падений: если runChecks по какой-то причине бросит исключение
  // (битые данные в проекте, отсутствие поля у сечения), показываем
  // тихий fallback вместо краша всего экрана редактора.
  let summary;
  try {
    summary = runChecks(model, result);
  } catch (err) {
    console.warn("EditorChecksPanel: runChecks упал", err);
    return (
      <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
        <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
          Проверки временно недоступны
        </span>
      </div>
    );
  }

  if (summary.checks.length === 0) {
    return (
      <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
            Проверки конструкции
          </span>
          <button
            onClick={onOpenSettings}
            className="text-[10px] font-gost text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] flex items-center gap-1"
          >
            <Icon name="Settings" size={11} /> настройки
          </button>
        </div>
        <p className="text-[11px] text-[var(--drawing-line-thin)]">
          Проверки отключены в настройках или у материала не задан предел текучести σ_т.
        </p>
      </div>
    );
  }

  const overallStatus =
    summary.failed_count > 0 ? "fail" : summary.warn_count > 0 ? "warn" : "ok";
  const overallColor = utilizationColor(overallStatus);

  return (
    <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--drawing-paper)]"
      >
        <span className="flex items-center gap-2 font-gost text-[11px] uppercase tracking-[0.15em]">
          <Icon name="ShieldCheck" size={14} />
          Проверки конструкции
          <span
            className="px-1.5 py-0.5 rounded text-[10px] normal-case tracking-normal text-white"
            style={{ backgroundColor: overallColor }}
          >
            η_max = {safeFixed(summary.max_utilization, 2)}
          </span>
        </span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} />
      </button>

      {open && (
        <>
          {/* Сводка по статусам */}
          <div className="px-3 py-2 border-t border-[var(--drawing-line)] flex items-center justify-between text-[11px] font-gost">
            <div className="flex gap-3">
              {summary.ok_count > 0 && (
                <span className="flex items-center gap-1" style={{ color: "#1a8a5a" }}>
                  <Icon name="CircleCheck" size={12} /> {summary.ok_count}
                </span>
              )}
              {summary.warn_count > 0 && (
                <span className="flex items-center gap-1" style={{ color: "#c98800" }}>
                  <Icon name="TriangleAlert" size={12} /> {summary.warn_count}
                </span>
              )}
              {summary.failed_count > 0 && (
                <span className="flex items-center gap-1" style={{ color: "var(--drawing-accent)" }}>
                  <Icon name="CircleX" size={12} /> {summary.failed_count}
                </span>
              )}
            </div>
            <button
              onClick={onOpenSettings}
              className="text-[10px] text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] flex items-center gap-1"
            >
              <Icon name="Settings" size={11} /> настройки
            </button>
          </div>

          {/* Таблица проверок.
              На мобиле обернули в overflow-x-auto + min-w-[360px] —
              без этого 5 колонок (элем / проверка / факт / доп / η)
              сжимались до нечитаемой каши на телефонах ≤360px. */}
          <div className="max-h-[280px] overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-[360px] text-[11px] font-mono">
              <thead className="bg-[var(--drawing-paper)] sticky top-0">
                <tr className="border-b border-[var(--drawing-line)]">
                  <th className="text-left px-2 py-1 font-gost text-[10px] uppercase tracking-wider whitespace-nowrap">Элем.</th>
                  <th className="text-left px-2 py-1 font-gost text-[10px] uppercase tracking-wider">Проверка</th>
                  <th className="text-right px-2 py-1 font-gost text-[10px] uppercase tracking-wider whitespace-nowrap">Факт</th>
                  <th className="text-right px-2 py-1 font-gost text-[10px] uppercase tracking-wider whitespace-nowrap">Доп.</th>
                  <th className="text-right px-2 py-1 font-gost text-[10px] uppercase tracking-wider">η</th>
                </tr>
              </thead>
              <tbody>
                {summary.checks.map((c, i) => (
                  <ChecksRow key={i} check={c} onFocus={() => onFocusElement(c.element_id)} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const ChecksRow = ({ check, onFocus }: { check: ElementCheck; onFocus: () => void }) => {
  const color = utilizationColor(check.status);
  const fmt = (v: number | null | undefined) =>
    check.unit === "МПа"
      ? safeFixed(safeNum(v) / 1e6, 1)
      : safeFixed(safeNum(v) * 1000, 2);
  return (
    <tr
      onClick={onFocus}
      className="border-b border-dashed border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] cursor-pointer"
      title={check.formula}
    >
      <td className="px-2 py-1 font-bold">{check.element_id}</td>
      <td className="px-2 py-1">{check.title}</td>
      <td className="px-2 py-1 text-right">{fmt(check.actual)}</td>
      <td className="px-2 py-1 text-right">{fmt(check.allowable)}</td>
      <td
        className="px-2 py-1 text-right font-bold"
        style={{ color, minWidth: 50 }}
      >
        {safeFixed(check.utilization, 2)}
      </td>
    </tr>
  );
};

export default EditorChecksPanel;