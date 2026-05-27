/**
 * Боковые панели редактора CAE.
 * Содержит:
 *  - Десктопная правая aside (EditorIssuesPanel, EditorRightPanel, EditorChecksPanel, EditorResultsPanel)
 *  - Мобильная раскладка: липкие вкладки (Чертить / Свойства / Проверки / Эпюры)
 *    с соответствующим содержимым под ними
 *  - Плавающая кнопка «Рассчитать» (только mobile, fixed bottom-right)
 */
import Icon from "@/components/ui/icon";
import EditorLeftPanel from "./EditorLeftPanel";
import EditorResultsPanel from "./EditorResultsPanel";
import EditorChecksPanel from "./EditorChecksPanel";
import type { EditorMode, DiagramKind } from "@/components/cae/FrameCanvas";
import type { FrameModel, SolverResponse, BoundaryCondition } from "@/lib/cae-model";

interface Props {
  // Модель и результаты
  model: FrameModel;
  result: SolverResponse | null;
  issues: ReturnType<typeof import("@/lib/cae-validate").validateModel>;
  errorsCount: number;
  // Выбор
  selectedNode: FrameModel["nodes"][number] | null | undefined;
  selectedElementId: string | null;
  nodeBC: BoundaryCondition | undefined;
  nodeLoad: FrameModel["loads"][number] | undefined;
  // Инструменты
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  gridStep: number;
  setGridStep: (g: number) => void;
  // Диаграммы
  showDiagram: DiagramKind;
  setShowDiagram: (d: DiagramKind) => void;
  diagramScale: number;
  setDiagramScale: (s: number) => void;
  // Диалоги
  bcCustomOpen: boolean;
  setBcCustomOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  setMatPickerOpen: (v: boolean) => void;
  setSecPickerOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  // Мобильная вкладка
  mobileTab: "tools" | "checks" | "results";
  setMobileTab: (t: "tools" | "checks" | "results") => void;
  // Действия над моделью
  addBC: (type: BoundaryCondition["type"]) => void;
  removeBC: () => void;
  toggleCustomDof: (dof: string) => void;
  addNodalLoad: (fx: number, fy: number) => void;
  setNodalMoment: (mz: number) => void;
  removeLoadOnNode: () => void;
  setDistributedLoad: (elementId: string, qy: number) => void;
  addInSpanPoint: (elementId: string, ratio: number, fx: number, fy: number) => void;
  removeLoadById: (id: string) => void;
  setElementHinge: (elementId: string, end: "start" | "end", val: boolean) => void;
  deleteSelected: () => void;
  // Навигация
  setSelectedNodeIds: (ids: string[]) => void;
  setSelectedElementIds: (ids: string[]) => void;
  onStartTutorial: () => void;
  // Solve
  solving: boolean;
  blocked: boolean;
  onSolve: () => void;
}

const EditorSidePanels = ({
  model,
  result,
  issues,
  errorsCount,
  selectedNode,
  selectedElementId,
  nodeBC,
  nodeLoad,
  mode,
  setMode,
  gridStep,
  setGridStep,
  showDiagram,
  setShowDiagram,
  diagramScale,
  setDiagramScale,
  bcCustomOpen,
  setBcCustomOpen,
  setMatPickerOpen,
  setSecPickerOpen,
  setSettingsOpen,
  mobileTab,
  setMobileTab,
  addBC,
  removeBC,
  toggleCustomDof,
  addNodalLoad,
  setNodalMoment,
  removeLoadOnNode,
  setDistributedLoad,
  addInSpanPoint,
  removeLoadById,
  setElementHinge,
  deleteSelected,
  setSelectedNodeIds,
  setSelectedElementIds,
  onStartTutorial,
  solving,
  blocked,
  onSolve,
}: Props) => {
  const focusNode = (id: string) => {
    setSelectedNodeIds([id]);
    setSelectedElementIds([]);
  };
  const focusElement = (id: string) => {
    setSelectedElementIds([id]);
    setSelectedNodeIds([]);
  };

  const resultsPanelProps = {
    result,
    model,
    showDiagram,
    setShowDiagram,
    diagramScale,
    setDiagramScale,
  };

  return (
    <>
      {/* Десктоп: правая колонка.
          Свойства узлов/балок переехали в контекстный popup
          (правый клик по объекту), список проблем модели и переключатели
          эпюр — в плавающие иконки CanvasFloatingControls.

          Здесь остаются только:
           - проверки прочности по нормам (EditorChecksPanel)
           - таблицы результатов: реакции/прогибы/напряжения (EditorResultsPanel) */}
      <aside className="hidden lg:block space-y-3 text-[12px]">
        <EditorChecksPanel
          model={model}
          result={result}
          onFocusElement={focusElement}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div data-tutorial="results">
          <EditorResultsPanel {...resultsPanelProps} />
        </div>
      </aside>

      {/* Мобильная раскладка — 3 вкладки: Чертить / Проверки / Эпюры.
          Свойства узла/балки открываются long-press'ом по объекту
          (контекстный popup), отдельной вкладки больше нет. */}
      <div className="lg:hidden col-span-full">
        <div className="grid grid-cols-3 gap-0 border-2 border-[var(--drawing-line)] border-b-0 bg-[var(--drawing-bg)] sticky top-16 z-20">
          {([
            { key: "tools", label: "Чертить", icon: "Pencil" },
            { key: "checks", label: "Проверки", icon: "ShieldCheck" },
            { key: "results", label: "Эпюры", icon: "BarChart3" },
          ] as const).map((t) => {
            const active = mobileTab === t.key;
            const hasIssues = t.key === "checks" && (result || errorsCount > 0);
            return (
              <button
                key={t.key}
                onClick={() => setMobileTab(t.key)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 border-r border-[var(--drawing-line)] last:border-r-0 font-gost text-[10px] uppercase tracking-wider transition ${
                  active
                    ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)]"
                    : "hover:bg-[var(--drawing-paper)] text-[var(--drawing-ink)]"
                }`}
                aria-label={t.label}
                aria-pressed={active}
              >
                <Icon name={t.icon} size={18} />
                <span className="leading-none">{t.label}</span>
                {hasIssues && errorsCount > 0 && !active && (
                  <span className="absolute mt-[-22px] ml-7 bg-[var(--drawing-accent)] text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center">
                    {errorsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="border-2 border-[var(--drawing-line)] p-3 space-y-3 text-[12px] min-h-[200px] pb-24">
          {mobileTab === "tools" && (
            <EditorLeftPanel
              mode={mode}
              setMode={setMode}
              gridStep={gridStep}
              setGridStep={setGridStep}
              onStartTutorial={onStartTutorial}
            />
          )}
          {mobileTab === "checks" && (
            <EditorChecksPanel
              model={model}
              result={result}
              onFocusElement={focusElement}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
          {mobileTab === "results" && (
            <EditorResultsPanel {...resultsPanelProps} />
          )}
        </div>
      </div>

      {/* Плавающая кнопка «Рассчитать» — только на мобилке.
          Видна всегда независимо от активной вкладки, фиксирована к низу экрана. */}
      <button
        onClick={onSolve}
        disabled={solving || blocked}
        className="lg:hidden fixed bottom-4 right-4 z-30 min-w-[64px] min-h-[56px] px-5 py-3 bg-[var(--drawing-accent)] text-white font-gost-upright font-bold text-[14px] uppercase tracking-wider shadow-2xl border-2 border-[var(--drawing-ink)] flex items-center gap-2 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Запустить расчёт"
      >
        {solving ? (
          <>
            <Icon name="Loader2" size={20} className="animate-spin" />
            <span>Счёт…</span>
          </>
        ) : (
          <>
            <Icon name="Play" size={20} />
            <span>Расчёт</span>
          </>
        )}
      </button>
    </>
  );
};

export default EditorSidePanels;