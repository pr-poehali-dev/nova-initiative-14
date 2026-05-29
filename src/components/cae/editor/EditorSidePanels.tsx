/**
 * Боковые панели редактора CAE.
 * Содержит:
 *  - Десктопная правая aside (EditorChecksPanel + EditorResultsPanel с фильтрами эпюр)
 *  - Мобильная раскладка: два блока стека под канвасом — «Проверки» и
 *    «Результаты» (с id-якорями mobile-checks / mobile-results, к которым
 *    скроллит мобильный HUD на канвасе). Инструменты/сетка/вид переехали
 *    в MobileCanvasHud, фильтры эпюр — в CanvasFloatingControls.
 *  - Плавающая кнопка «Рассчитать» (только mobile, fixed bottom-right)
 */
import Icon from "@/components/ui/icon";
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
  showDiagram,
  setShowDiagram,
  diagramScale,
  setDiagramScale,
  setSettingsOpen,
  setSelectedNodeIds,
  setSelectedElementIds,
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

      {/* Мобильная раскладка — два блока стека под канвасом: «Проверки» и
          «Результаты». Инструменты/сетка/вид теперь в MobileCanvasHud на
          канвасе, фильтры эпюр — в CanvasFloatingControls. Свойства узла/балки
          открываются удержанием пальца по объекту (контекстный popup).
          id-якоря используются HUD-кнопками для плавного скролла. */}
      <div className="lg:hidden col-span-full space-y-3 pb-24 text-[12px]">
        {/* Якоря — пустые div с scroll-margin, чтобы HUD-кнопки точно
            докручивали до панелей с учётом фиксированного топ-бара.
            Сами панели рендерят свои чертёжные рамки. */}
        <div id="mobile-checks" className="scroll-mt-20">
          <EditorChecksPanel
            model={model}
            result={result}
            onFocusElement={focusElement}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>

        <div id="mobile-results" className="scroll-mt-20">
          <EditorResultsPanel {...resultsPanelProps} showDiagramControls={false} />
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