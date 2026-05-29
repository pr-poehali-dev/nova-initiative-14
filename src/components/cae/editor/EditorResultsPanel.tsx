/**
 * Правая панель результатов расчёта CAE.
 * Композиция подкомпонентов:
 *   - ResultsSummary    — числовая сводка (узлы, прогиб, σ, запас, время)
 *   - AnalyticCheck     — сравнение КЭМ с аналит. формулой (если схема узнана)
 *   - ReactionsTable    — таблица реакций опор
 *   - DiagramControls   — переключение вида схемы и эпюр
 *
 * Аналитика расчёта прогибов вынесена в @/lib/cae/analytic-deflection.
 */
import type { DiagramKind } from "@/components/cae/FrameCanvas";
import type { SolverResponse, FrameModel } from "@/lib/cae-model";
import { computeAnalytic } from "@/lib/cae/analytic-deflection";
import ResultsSummary from "./panels/results/ResultsSummary";
import AnalyticCheck from "./panels/results/AnalyticCheck";
import ReactionsTable from "./panels/results/ReactionsTable";
import DiagramControls from "./panels/results/DiagramControls";

interface Props {
  result: SolverResponse | null;
  model: FrameModel;
  showDiagram: DiagramKind;
  setShowDiagram: (d: DiagramKind) => void;
  diagramScale: number;
  setDiagramScale: (v: number) => void;
  /**
   * Показывать ли фильтры вида/эпюр/масштаба (DiagramControls).
   * На мобильной раскладке они уже доступны на канвасе (CanvasFloatingControls),
   * поэтому передаём false. По умолчанию true (десктоп).
   */
  showDiagramControls?: boolean;
}

const EditorResultsPanel = ({
  result,
  model,
  showDiagram,
  setShowDiagram,
  diagramScale,
  setDiagramScale,
  showDiagramControls = true,
}: Props) => {
  const analytic = result ? computeAnalytic(model) : null;
  const numericMm = result ? result.summary.max_displacement * 1000 : null;
  const analyticMm = analytic ? analytic.f_analytic * 1000 : null;
  const deltaPct =
    numericMm !== null && analyticMm !== null && analyticMm > 1e-9
      ? ((numericMm - analyticMm) / analyticMm) * 100
      : null;

  return (
    <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
        Результат
      </p>
      {!result ? (
        <p className="text-[11px] text-[var(--drawing-line-thin)]">
          Нажмите «Посчитать» после построения схемы.
        </p>
      ) : (
        <>
          <ResultsSummary result={result} />

          {analytic && analyticMm !== null && deltaPct !== null && numericMm !== null && (
            <AnalyticCheck
              analytic={analytic}
              numericMm={numericMm}
              analyticMm={analyticMm}
              deltaPct={deltaPct}
            />
          )}

          <ReactionsTable reactions={result.reactions} />

          {showDiagramControls && (
            <DiagramControls
              showDiagram={showDiagram}
              setShowDiagram={setShowDiagram}
              diagramScale={diagramScale}
              setDiagramScale={setDiagramScale}
            />
          )}

          {result.warnings.length > 0 && (
            <div className="mt-3 p-2 border border-[var(--drawing-accent)] text-[10px] text-[var(--drawing-accent)]">
              {result.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EditorResultsPanel;