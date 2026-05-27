import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import type { FrameModel, SolverResponse } from "@/lib/cae-model";
import { generatePdfReport } from "@/lib/generatePdfReport";
import SupportTicketModal from "@/components/SupportTicketModal";

interface Props {
  projectName: string;
  projectId?: number;
  model: FrameModel;
  result: SolverResponse | null;
  dirty: boolean;
  lastSaved: string | null;
  saving: boolean;
  solving: boolean;
  blocked?: boolean;
  errorsCount?: number;
  onSave: () => void;
  onSolve: () => void;
}

const EditorTopBar = ({
  projectName,
  projectId,
  model,
  result,
  dirty,
  lastSaved,
  saving,
  solving,
  blocked = false,
  errorsCount = 0,
  onSave,
  onSolve,
}: Props) => {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  // Подготовка тех. блока для предзаполнения тикета в техподдержку.
  // Тикет создаётся через support-api, ответ придёт на email пользователя.
  const buildSupportPrefill = (): { title: string; body: string } => {
    const idStr = projectId ? String(projectId) : "не определён";
    const dim = model.meta.dim === "2d" ? "Плоская рама 2D" : "Пространственная 3D";
    const title = `Проблема в CAE-проекте #${idStr}: ${projectName || "без названия"}`;
    const body = [
      "Опишите проблему здесь:",
      "—",
      "",
      "————————————————————————",
      "ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ (не удаляйте):",
      `ID проекта: ${idStr}`,
      `Название: ${projectName || "без названия"}`,
      `Тип расчёта: ${dim}`,
      `Узлов: ${model.nodes?.length ?? 0}, элементов: ${model.elements?.length ?? 0}`,
      `Расчёт выполнен: ${result ? "да" : "нет"}`,
    ].join("\n");
    return { title, body };
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName || "model"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePdf = async () => {
    if (!result || pdfBusy) return;
    setPdfBusy(true);
    try {
      // Берём живой SVG канваса со всеми ручными сдвигами подписей —
      // чтобы расчётная схема в отчёте 1-в-1 совпадала с тем, что видит пользователь.
      // ВАЖНО: ищем по data-scheme-svg, а не по [data-tutorial="canvas"] svg,
      // потому что внутри блока канваса лежат ещё иконки Lucide-кнопок тулбара
      // (Undo2, Redo2, Keyboard, Maximize2, Settings) — каждая тоже <svg>.
      // querySelector брал первую — иконку Undo2 — и в отчёт уходила «стрелка назад».
      const schemeSvg = document.querySelector<SVGSVGElement>(
        '[data-scheme-svg="frame"]',
      );
      await generatePdfReport(model, result, projectName, { schemeSvg });
    } catch (e) {
      console.error("Ошибка генерации PDF:", e);
      alert("Не удалось сформировать PDF. Проверь подключение к интернету.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
  <div className="bg-[var(--drawing-bg)] border-b-[2.5px] border-[var(--drawing-line)]">
    <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-wrap items-center gap-3">
      <Link
        to="/cae/projects"
        className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
      >
        ← Проекты
      </Link>
      <div className="extension-line-h h-[2px] w-6 mx-1" />
      <div>
        <p className="font-gost-upright text-sm font-bold leading-tight">
          {projectName || "Без названия"}
        </p>
        <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
          {model.meta.dim === "2d" ? (
            "Плоская рама 2D"
          ) : (
            <>
              Пространственная 3D{" "}
              <span
                className="text-amber-700"
                title="3D-режим в разработке: аналитическая верификация результатов на эталонных задачах ещё не пройдена. Для дипломных расчётов используйте 2D-режим."
              >
                (в разработке)
              </span>
            </>
          )}
          {dirty && " · несохранено"}
          {lastSaved && !dirty && ` · сохранено в ${lastSaved}`}
        </p>
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          title="Откроет форму обращения в техподдержку с предзаполненной тех. информацией"
          className="mt-1 inline-flex items-center gap-1 font-gost text-[10px] uppercase tracking-[0.15em] text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] transition-colors"
        >
          <Icon name="LifeBuoy" size={11} />
          {projectId ? `Сообщить о проблеме · ID #${projectId}` : "Сообщить о проблеме"}
        </button>
      </div>
      {/* Счётчики модели — узлы и элементы. На время альфа-теста лимит безграничный (∞). */}
      <div className="hidden md:flex items-center gap-2 ml-4">
        <div className="border border-[var(--drawing-line)] px-2 py-1 leading-tight">
          <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Узлы</p>
          <p className="font-gost-upright text-xs font-bold flex items-baseline gap-1">
            {model.nodes?.length ?? 0}
            <span className="font-gost text-[9px] font-normal text-[var(--drawing-accent)]">/ ∞</span>
          </p>
        </div>
        <div className="border border-[var(--drawing-line)] px-2 py-1 leading-tight">
          <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Элементы</p>
          <p className="font-gost-upright text-xs font-bold flex items-baseline gap-1">
            {model.elements?.length ?? 0}
            <span className="font-gost text-[9px] font-normal text-[var(--drawing-accent)]">/ ∞</span>
          </p>
        </div>
        <div className="border border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 px-2 py-1 leading-tight">
          <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Расчёты</p>
          <p className="font-gost-upright text-xs font-bold text-[var(--drawing-accent)]">
            Безлимит
          </p>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className="btn-drawing text-[11px] disabled:opacity-50"
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
        <button
          onClick={onSolve}
          disabled={solving || blocked}
          data-tutorial="solve"
          className="btn-drawing btn-drawing-accent text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            blocked
              ? `В модели ${errorsCount} ошиб${errorsCount === 1 ? "ка" : "ок"} — расчёт невозможен. Откройте «Проблемы модели» справа.`
              : "Запустить расчёт (F5)"
          }
        >
          <Icon name={blocked ? "CircleX" : "Play"} size={12} className="mr-1" />
          {solving ? "Считаем…" : blocked ? "Есть ошибки" : "Посчитать"}
        </button>
        <button
          onClick={handlePdf}
          disabled={!result || pdfBusy}
          className="btn-drawing text-[11px] disabled:opacity-40"
          title="Скачать PDF-отчёт с эпюрами и реакциями опор"
        >
          <Icon name="FileDown" size={12} className="mr-1" />
          {pdfBusy ? "Готовим…" : "PDF"}
        </button>
        <button
          onClick={handleExportJson}
          className="btn-drawing text-[11px]"
          title="Экспорт модели в JSON — для импорта в другой проект или резервной копии"
        >
          <Icon name="Braces" size={12} className="mr-1" />
          JSON
        </button>
      </div>
    </div>

    <SupportTicketModal
      open={supportOpen}
      onClose={() => setSupportOpen(false)}
      defaultTitle={buildSupportPrefill().title}
      defaultBody={buildSupportPrefill().body}
      defaultKind="bug"
    />
  </div>
  );
};

export default EditorTopBar;