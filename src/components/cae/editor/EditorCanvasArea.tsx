/**
 * Блок канвы в редакторе CAE.
 * Содержит:
 *  - плавающую панель инструментов (undo/redo/help/fit/settings) слева
 *  - плавающие иконки валидации/подсказки/глаза/эпюр справа
 *  - FrameCanvas
 *  - баннер ошибки решателя/загрузки
 */
import Icon from "@/components/ui/icon";
import FrameCanvas, { type EditorMode, type DiagramKind } from "@/components/cae/FrameCanvas";
import type { FrameModel, SolverResponse } from "@/lib/cae-model";
import type { LabelOffsetsApi } from "@/pages/cae-editor/useLabelOffsets";
import type { ValidationIssue } from "@/lib/cae-validate";
import CanvasFloatingControls from "./CanvasFloatingControls";

interface Props {
  model: FrameModel;
  updateModel: (m: FrameModel) => void;
  mode: EditorMode;
  gridStep: number;
  selectedNodeIds: string[];
  selectedElementIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  setSelectedElementIds: (ids: string[]) => void;
  onCanvasClick: (worldX: number, worldY: number) => void;
  moveNode: (nodeId: string, x: number, y: number) => void;
  result: SolverResponse | null;
  showDiagram: DiagramKind;
  diagramScale: number;
  fitRequestId: number;
  setFitRequestId: (fn: (x: number) => number) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  displayError: string | null;
  clearError: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  arrowScale?: number;
  fontScale?: number;
  labelOffsets?: LabelOffsetsApi;
  elementLimit?: number;

  /* — Управление эпюрами/деформацией прямо на канвасе — */
  issues?: ValidationIssue[];
  setShowDiagram?: (d: DiagramKind) => void;
  setDiagramScale?: (v: number) => void;
  onFocusNode?: (id: string) => void;
  onFocusElement?: (id: string) => void;
}

const EditorCanvasArea = ({
  model,
  updateModel,
  mode,
  gridStep,
  selectedNodeIds,
  selectedElementIds,
  setSelectedNodeIds,
  setSelectedElementIds,
  onCanvasClick,
  moveNode,
  result,
  showDiagram,
  diagramScale,
  fitRequestId,
  setFitRequestId,
  canUndo,
  canRedo,
  undo,
  redo,
  displayError,
  clearError,
  onOpenHelp,
  onOpenSettings,
  arrowScale,
  fontScale,
  labelOffsets,
  elementLimit,
  issues,
  setShowDiagram,
  setDiagramScale,
  onFocusNode,
  onFocusElement,
}: Props) => (
  <div
    className="border-2 border-[var(--drawing-line)] relative h-[75vh] min-h-[420px] lg:h-[70vh] lg:min-h-[480px]"
    data-tutorial="canvas"
  >
    {/* Плавающая панель инструментов — кнопки 44×44 на мобилке, компактные на десктопе */}
    <div className="absolute top-2 left-2 z-10 flex gap-0 bg-[var(--drawing-bg)]/95 border border-[var(--drawing-line)] shadow-sm">
      <button
        onClick={undo}
        disabled={!canUndo}
        className="min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 p-2 border-r border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        title="Отменить (Ctrl+Z)"
        aria-label="Отменить"
      >
        <Icon name="Undo2" size={18} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 p-2 border-r border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        title="Вернуть (Ctrl+Shift+Z)"
        aria-label="Вернуть"
      >
        <Icon name="Redo2" size={18} />
      </button>
      <button
        onClick={onOpenHelp}
        className="min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 p-2 border-r border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] hidden md:flex items-center justify-center"
        title="Горячие клавиши (?)"
        aria-label="Горячие клавиши"
      >
        <Icon name="Keyboard" size={18} />
      </button>
      <button
        onClick={() => setFitRequestId((x) => x + 1)}
        className="min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 p-2 border-r border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] flex items-center justify-center"
        title="Подогнать масштаб под содержимое (F)"
        aria-label="Подогнать масштаб"
      >
        <Icon name="Maximize2" size={18} />
      </button>
      <button
        onClick={onOpenSettings}
        className="min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 p-2 hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] flex items-center justify-center"
        title="Настройки расчёта: отрасль, теория прочности, коэф. запаса"
        aria-label="Настройки расчёта"
      >
        <Icon name="Settings" size={18} />
      </button>
    </div>

    <FrameCanvas
      model={model}
      setModel={updateModel}
      mode={mode}
      gridStep={gridStep}
      selectedNodeIds={selectedNodeIds}
      selectedElementIds={selectedElementIds}
      onSelectNodes={setSelectedNodeIds}
      onSelectElements={setSelectedElementIds}
      onCanvasClick={onCanvasClick}
      onMoveNode={moveNode}
      result={result}
      showDiagram={showDiagram}
      diagramScale={diagramScale}
      fitRequestId={fitRequestId}
      arrowScale={arrowScale}
      fontScale={fontScale}
      labelOffsets={labelOffsets}
      elementLimit={elementLimit}
    />

    {/* Плавающие иконки правого края: валидация, подсказка, глаз, эпюры.
        Показываем и на мобиле — это самые частые действия, чтобы не
        переключаться между вкладками. */}
    {issues && setShowDiagram && setDiagramScale && onFocusNode && onFocusElement && (
      <CanvasFloatingControls
        issues={issues}
        onFocusNode={onFocusNode}
        onFocusElement={onFocusElement}
        hasResult={!!result}
        showDiagram={showDiagram}
        setShowDiagram={setShowDiagram}
        diagramScale={diagramScale}
        setDiagramScale={setDiagramScale}
      />
    )}

    {displayError && (
      <div className="absolute top-14 left-2 right-2 bg-[var(--drawing-accent)] text-white text-xs font-gost p-2 flex items-start gap-2 z-20 shadow-lg">
        <Icon name="AlertCircle" size={14} className="mt-0.5 shrink-0" />
        <span className="flex-1">{displayError}</span>
        <button onClick={clearError} className="shrink-0">
          <Icon name="X" size={14} />
        </button>
      </div>
    )}
  </div>
);

export default EditorCanvasArea;