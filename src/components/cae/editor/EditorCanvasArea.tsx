/**
 * Блок канвы в редакторе CAE.
 * Содержит:
 *  - плавающую панель инструментов (undo/redo/help/fit/settings) слева
 *  - плавающие иконки валидации/подсказки/глаза/эпюр справа
 *  - FrameCanvas
 *  - баннер ошибки решателя/загрузки
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import FrameCanvas, {
  type EditorMode,
  type DiagramKind,
  type ContextRequest,
} from "@/components/cae/FrameCanvas";
import type { FrameModel, SolverResponse } from "@/lib/cae-model";
import type { LabelOffsetsApi } from "@/pages/cae-editor/useLabelOffsets";
import type { ValidationIssue } from "@/lib/cae-validate";
import CanvasFloatingControls from "./CanvasFloatingControls";
import MobileCanvasHud from "./MobileCanvasHud";
import Scene3DBuilder from "./Scene3DBuilder";

// 3D-сцена тяжёлая (three.js) — грузим лениво только для 3D-проектов.
const FrameScene3D = lazy(() => import("@/components/cae/FrameScene3D"));

interface Props {
  model: FrameModel;
  updateModel: (m: FrameModel) => void;
  mode: EditorMode;
  setMode?: (m: EditorMode) => void;
  gridStep: number;
  /** Изменение шага сетки (мобильный HUD «Сетка»). */
  setGridStep?: (g: number) => void;
  selectedNodeIds: string[];
  selectedElementIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  setSelectedElementIds: (ids: string[]) => void;
  onCanvasClick: (worldX: number, worldY: number) => void;
  moveNode: (nodeId: string, x: number, y: number) => void;
  /** Добавить узел по точным координатам (панель построения 3D, тикет #51). */
  addNodeAtCoords?: (x: number, y: number, z: number) => void;
  /** Соединить два выбранных узла стержнем (панель построения 3D, тикет #51). */
  connectSelectedNodes?: () => void;
  /** Соединить два узла стержнем по id (клик по двум узлам в 3D-сцене). */
  connectTwoNodes?: (a: string, b: string) => void;
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
  /** Изменение масштаба стрелок (мобильный HUD «Вид»). */
  setArrowScale?: (v: number) => void;
  /** Изменение масштаба шрифта подписей (мобильный HUD «Вид»). */
  setFontScale?: (v: number) => void;
  /** Сброс настроек вида + положения подписей (мобильный HUD «Вид»). */
  onResetView?: () => void;
  labelOffsets?: LabelOffsetsApi;
  elementLimit?: number;

  /* — Управление эпюрами/деформацией прямо на канвасе — */
  issues?: ValidationIssue[];
  setShowDiagram?: (d: DiagramKind) => void;
  setDiagramScale?: (v: number) => void;
  onFocusNode?: (id: string) => void;
  onFocusElement?: (id: string) => void;

  /** Открытие контекстного popup'а свойств (правый клик / long-press). */
  onRequestContext?: (req: ContextRequest) => void;

  /** Открыть модальное окно проверок / результатов (мобильный HUD). */
  onOpenChecks?: () => void;
  onOpenResults?: () => void;
  /** Канва во всю высоту экрана (3D-режим, fullscreen-макет). */
  fullHeight?: boolean;
}

const EditorCanvasArea = ({
  model,
  updateModel,
  mode,
  setMode,
  gridStep,
  setGridStep,
  selectedNodeIds,
  selectedElementIds,
  setSelectedNodeIds,
  setSelectedElementIds,
  onCanvasClick,
  moveNode,
  addNodeAtCoords,
  connectSelectedNodes,
  connectTwoNodes,
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
  setArrowScale,
  setFontScale,
  onResetView,
  labelOffsets,
  elementLimit,
  issues,
  setShowDiagram,
  setDiagramScale,
  onFocusNode,
  onFocusElement,
  onRequestContext,
  onOpenChecks,
  onOpenResults,
  fullHeight,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Полноэкранный режим через нативный Fullscreen API — канва раскрывается на
  // ВЕСЬ экран устройства (а не только окно браузера), как просили в тикете
  // #64. Esc и системный выход обрабатывает сам браузер. Если API недоступен
  // (старый/мобильный браузер), мягко откатываемся на CSS-фуллскрин
  // (fixed inset-0) — он раскрывает хотя бы на окно браузера.
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cssFallback, setCssFallback] = useState(false);

  // Держим состояние в синхроне с браузером: выход по Esc/кнопке системы
  // тоже сбрасывает флаг и пересчитывает масштаб канвы.
  useEffect(() => {
    const onFsChange = () => {
      const on = document.fullscreenElement === containerRef.current;
      setIsFullscreen(on);
      if (!on) setCssFallback(false);
      setTimeout(() => setFitRequestId((x) => x + 1), 50);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [setFitRequestId]);

  // Esc выходит из CSS-фолбэка (нативный fullscreen Esc обрабатывает сам).
  useEffect(() => {
    if (!cssFallback) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCssFallback(false);
        setIsFullscreen(false);
        setTimeout(() => setFitRequestId((x) => x + 1), 50);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cssFallback, setFitRequestId]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    // Уже в полноэкранном — выходим (нативно или из CSS-фолбэка).
    if (isFullscreen) {
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch { /* игнорируем */ }
      } else {
        setCssFallback(false);
        setIsFullscreen(false);
        setTimeout(() => setFitRequestId((x) => x + 1), 50);
      }
      return;
    }
    // Пробуем нативный полноэкранный режим (на весь экран устройства).
    if (el && el.requestFullscreen) {
      try {
        await el.requestFullscreen();
        // Состояние выставит обработчик fullscreenchange.
        return;
      } catch { /* не получилось — уходим в CSS-фолбэк ниже */ }
    }
    // Фолбэк: на окно браузера через CSS.
    setCssFallback(true);
    setIsFullscreen(true);
    setTimeout(() => setFitRequestId((x) => x + 1), 50);
  };

  return (
  <div
    ref={containerRef}
    className={`border-2 border-[var(--drawing-line)] ${
      isFullscreen
        ? cssFallback
          ? "fixed inset-0 z-[55] h-screen w-screen bg-[var(--drawing-bg)]"
          : "h-screen w-screen bg-[var(--drawing-bg)]"
        : `relative ${
            fullHeight
              ? "h-[calc(100vh-72px)] min-h-[480px]"
              : "h-[75vh] min-h-[420px] lg:h-[70vh] lg:min-h-[480px]"
          }`
    }`}
    data-tutorial="canvas"
  >
    {/* Плавающая панель инструментов — кнопки 44×44 на мобилке, компактные на десктопе.
        Явный цвет текста и непрозрачный фон, чтобы иконки были чётко видны. */}
    <div className="absolute top-2 left-2 z-10 flex gap-0 bg-[var(--drawing-bg)] text-[var(--drawing-line)] border border-[var(--drawing-line)] shadow-sm">
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
        title="Центрировать и подогнать масштаб под содержимое (F)"
        aria-label="Центрировать вид"
      >
        <Icon name="Focus" size={18} />
      </button>
      <button
        onClick={toggleFullscreen}
        className={`min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 p-2 border-r border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] flex items-center justify-center ${
          isFullscreen ? "bg-[var(--drawing-accent)] text-white" : ""
        }`}
        title={isFullscreen ? "Свернуть из полного экрана (Esc)" : "Развернуть на весь экран"}
        aria-label={isFullscreen ? "Свернуть" : "На весь экран"}
      >
        <Icon name={isFullscreen ? "Minimize2" : "Maximize2"} size={18} />
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

    {model.meta?.dim === "3d" ? (
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center font-gost text-xs text-[var(--drawing-line-thin)]">
            Загружаем 3D-сцену…
          </div>
        }
      >
        <FrameScene3D
          model={model}
          selectedNodeIds={selectedNodeIds}
          selectedElementIds={selectedElementIds}
          onSelectNodes={setSelectedNodeIds}
          onSelectElements={setSelectedElementIds}
          result={result}
          showDeformed={showDiagram === "deformed"}
          fitRequestId={fitRequestId}
          mode={mode}
          gridStep={gridStep}
          onAddNodeAt={addNodeAtCoords}
          onConnectTwoNodes={connectTwoNodes}
          onRequestContext={onRequestContext}
        />
        {addNodeAtCoords && connectSelectedNodes && (
          <Scene3DBuilder
            selectedNodeCount={selectedNodeIds.length}
            onAddNode={addNodeAtCoords}
            onConnect={connectSelectedNodes}
          />
        )}
      </Suspense>
    ) : (
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
        onRequestContext={onRequestContext}
      />
    )}

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

    {/* Мобильный HUD: инструмент / сетка / вид + якоря к блокам под канвасом.
        Каждая иконка открывает bottom-sheet. На десктопе скрыт (там левая
        панель). Рендерим только когда есть все необходимые сеттеры. */}
    {setMode &&
      setGridStep &&
      setArrowScale &&
      setFontScale &&
      onResetView &&
      onOpenChecks &&
      onOpenResults &&
      arrowScale !== undefined &&
      fontScale !== undefined && (
        <MobileCanvasHud
          mode={mode}
          setMode={setMode}
          gridStep={gridStep}
          setGridStep={setGridStep}
          arrowScale={arrowScale}
          setArrowScale={setArrowScale}
          fontScale={fontScale}
          setFontScale={setFontScale}
          onResetView={onResetView}
          onOpenChecks={onOpenChecks}
          onOpenResults={onOpenResults}
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
};

export default EditorCanvasArea;