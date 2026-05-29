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
import { useEffect } from "react";
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
  // Мобильные модальные окна (управляются HUD-кнопками на канвасе)
  mobileChecksOpen?: boolean;
  setMobileChecksOpen?: (v: boolean) => void;
  mobileResultsOpen?: boolean;
  setMobileResultsOpen?: (v: boolean) => void;
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
  mobileChecksOpen,
  setMobileChecksOpen,
  mobileResultsOpen,
  setMobileResultsOpen,
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

      {/* Мобильные модальные окна: «Проверки» и «Результаты».
          Открываются HUD-кнопками на канвасе (MobileCanvasHud). Инструменты/
          сетка/вид — в MobileCanvasHud, фильтры эпюр — в CanvasFloatingControls.
          Свойства узла/балки — удержанием пальца по объекту (контекстный popup). */}
      {mobileChecksOpen && (
        <MobileModal title="Проверки конструкции" onClose={() => setMobileChecksOpen?.(false)}>
          <EditorChecksPanel
            model={model}
            result={result}
            onFocusElement={(id) => {
              focusElement(id);
              setMobileChecksOpen?.(false);
            }}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </MobileModal>
      )}

      {mobileResultsOpen && (
        <MobileModal title="Результаты и эпюры" onClose={() => setMobileResultsOpen?.(false)}>
          <EditorResultsPanel {...resultsPanelProps} showDiagramControls={false} />
        </MobileModal>
      )}

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

/**
 * Мобильное модальное окно (full-screen sheet) для блоков проверок/результатов.
 * Тёмная подложка + панель снизу почти во весь экран, прокручиваемая.
 * Только на мобильной ширине (lg:hidden).
 */
function MobileModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute left-0 right-0 bottom-0 max-h-[88vh] flex flex-col bg-[var(--drawing-bg)] border-t-2 border-[var(--drawing-line)] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--drawing-line)] shrink-0">
          <p className="font-gost text-[12px] uppercase tracking-[0.2em] text-[var(--drawing-line)] font-bold">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--drawing-line)] active:bg-[var(--drawing-paper)]"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default EditorSidePanels;