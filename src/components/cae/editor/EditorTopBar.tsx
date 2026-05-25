import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import type { FrameModel, SolverResponse } from "@/lib/cae-model";
import { generatePdfReport } from "@/lib/generatePdfReport";

interface Props {
  projectName: string;
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

  const handlePdf = async () => {
    if (!result || pdfBusy) return;
    setPdfBusy(true);
    try {
      await generatePdfReport(model, result, projectName);
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
          {model.meta.dim === "2d" ? "Плоская рама 2D" : "Пространственная 3D"}
          {dirty && " · несохранено"}
          {lastSaved && !dirty && ` · сохранено в ${lastSaved}`}
        </p>
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
      </div>
    </div>
  </div>
  );
};

export default EditorTopBar;