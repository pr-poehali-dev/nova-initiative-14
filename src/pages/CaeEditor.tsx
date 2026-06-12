import { useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import EditorTopBar from "@/components/cae/editor/EditorTopBar";
import EditorCanvasArea from "@/components/cae/editor/EditorCanvasArea";
import EditorSidePanels from "@/components/cae/editor/EditorSidePanels";
import ContextPropertiesPopup, {
  type ContextTarget,
} from "@/components/cae/editor/ContextPropertiesPopup";
import NodeLimitModal from "@/components/cae/NodeLimitModal";
import { MaterialPicker, SectionPicker } from "@/components/cae/CatalogPanel";
import KeyboardHintsDialog from "@/components/cae/editor/KeyboardHintsDialog";
import EditorTutorial from "@/components/cae/editor/EditorTutorial";
import EditorWelcomeDialog from "@/components/cae/editor/EditorWelcomeDialog";
import EditorAnalysisSettingsDialog from "@/components/cae/editor/EditorAnalysisSettingsDialog";
import EditorLeftPanel from "@/components/cae/editor/EditorLeftPanel";
import LoadInputModal from "@/components/cae/editor/LoadInputModal";
import DraftRestoreBanner from "@/components/cae/editor/DraftRestoreBanner";
import { DEFAULT_ANALYSIS_SETTINGS } from "@/lib/cae-model";
import { useCaeProject } from "./cae-editor/useCaeProject";
import { useCaeActions } from "./cae-editor/useCaeActions";
import { useCaeSolver } from "./cae-editor/useCaeSolver";
import { useCaeKeyboard } from "./cae-editor/useCaeKeyboard";
import { useCaeEditorState } from "./cae-editor/useCaeEditorState";
import { useCaeViewSettings } from "./cae-editor/useCaeViewSettings";
import { useLabelOffsets } from "./cae-editor/useLabelOffsets";

const CaeEditor = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id ? parseInt(id, 10) : 0;

  const {
    model,
    updateModel,
    projectName,
    versionId,
    loadingModel,
    saving,
    lastSaved,
    dirty,
    loadError,
    setLoadError,
    authLoading,
    onSave,
    undo,
    redo,
    canUndo,
    canRedo,
    draftFound,
    restoreDraft,
    discardDraft,
  } = useCaeProject(projectId);

  const {
    result,
    solverError,
    setSolverError,
    solving,
    showDiagram,
    setShowDiagram,
    diagramScale,
    setDiagramScale,
    onSolve,
    issues,
    blocked,
  } = useCaeSolver(model, projectId, versionId);

  const errorsCount = issues.filter((i) => i.level === "error").length;

  const {
    mode, setMode,
    gridStep, setGridStep,
    selectedNodeIds, setSelectedNodeIds,
    selectedElementIds, setSelectedElementIds,
    selectedNodeId, selectedElementId,
    matPickerOpen, setMatPickerOpen,
    secPickerOpen, setSecPickerOpen,
    bcCustomOpen, setBcCustomOpen,
    helpOpen, setHelpOpen,
    tutorialOpen, setTutorialOpen,
    welcomeOpen, setWelcomeOpen,
    settingsOpen, setSettingsOpen,
    mobileTab, setMobileTab,
    fitRequestId, setFitRequestId,
    selectedNode,
    nodeBC,
    nodeLoad,
    displayError,
    clearError,
  } = useCaeEditorState({
    model,
    loadingModel,
    authLoading,
    solverError,
    setSolverError,
    loadError,
    setLoadError,
  });

  // Контекстный popup свойств (правый клик / long-press).
  // null = закрыт. Содержит координаты клика и тип/id объекта.
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);

  // 3D-редактор: канва во всю ширину, левая/правая панели — скрываемые
  // оверлеи поверх сцены (по референсу Bambu Studio). Видимость по кнопкам.
  const is3d = model.meta?.dim === "3d";
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Модальное окно ввода узловых нагрузок (удобная форма по всем осям).
  const [loadModalOpen, setLoadModalOpen] = useState(false);

  // Лимит узлов на альфа-тесте — защита от перегрузки решателя
  // на больших моделях, пока публичная версия не оптимизирована.
  const NODE_LIMIT_ALPHA = 10;
  const [nodeLimitOpen, setNodeLimitOpen] = useState(false);

  // Мобильные модальные окна проверок / результатов (открываются HUD-кнопками).
  const [mobileChecksOpen, setMobileChecksOpen] = useState(false);
  const [mobileResultsOpen, setMobileResultsOpen] = useState(false);

  // Глобальные настройки отображения (размер стрелок и шрифта подписей).
  // Сохраняются в localStorage между сессиями.
  const viewSettings = useCaeViewSettings();

  // Сдвиги подписей (drag-and-drop). Привязаны к проекту.
  const labelOffsets = useLabelOffsets(projectId);

  const {
    onCanvasClick,
    deleteSelected,
    duplicateSelected,
    moveNode,
    selectAll,
    clearSelection,
    setNodeConnection,
    addBC,
    removeBC,
    addNodalLoad,
    removeLoadOnNode,
    setNodalMoment,
    setNodeCoord,
    addNodeAtCoords,
    connectSelectedNodes,
    connectTwoNodes,
    setNodalForceComponent,
    setNodalMomentComponent,
    toggleCustomDof,
    pickMaterialForElement,
    pickSectionForElement,
    setDistributedLoad,
    addInSpanPoint,
    updateInSpanPoint,
    removeLoadById,
    setElementHinge,
  } = useCaeActions(
    model,
    updateModel,
    selectedNodeIds,
    selectedElementIds,
    setSelectedNodeIds,
    setSelectedElementIds,
    {
      nodeLimit: NODE_LIMIT_ALPHA,
      onNodeLimitReached: () => setNodeLimitOpen(true),
      gridStep,
    },
  );

  useCaeKeyboard({
    setMode,
    deleteSelected,
    duplicateSelected,
    selectAll,
    clearSelection,
    undo,
    redo,
    onSave,
    onSolve,
    onToggleHelp: () => setHelpOpen((v) => !v),
    onFit: () => setFitRequestId((x) => x + 1),
  });

  if (authLoading || loadingModel) {
    return (
      <div className="pt-24 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем проект…
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{projectName ? `${projectName} · CAE` : "CAE-редактор"} · Диплом-Инж.рф</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="pt-16 md:pt-16">
        <EditorTopBar
          projectName={projectName}
          projectId={projectId}
          model={model}
          result={result}
          dirty={dirty}
          lastSaved={lastSaved}
          saving={saving}
          solving={solving}
          blocked={blocked}
          errorsCount={errorsCount}
          onSave={onSave}
          onSolve={onSolve}
        />

        {draftFound && (
          <DraftRestoreBanner
            savedAt={draftFound.savedAt}
            onRestore={restoreDraft}
            onDiscard={discardDraft}
          />
        )}

        <div
          className={
            is3d
              ? "relative w-full px-0 py-0"
              : "max-w-[1400px] mx-auto px-3 py-3 grid gap-3 lg:grid-cols-[240px_1fr_300px]"
          }
        >
          {/* Левая панель инструментов.
              3D: скрываемый плавающий оверлей слева поверх канвы.
              2D: статичная колонка слева. */}
          <div
            className={
              is3d
                ? `hidden lg:block absolute top-3 left-3 z-20 w-[240px] transition-transform duration-200 ${
                    leftPanelOpen ? "translate-x-0" : "-translate-x-[260px]"
                  }`
                : "hidden lg:block"
            }
          >
            <EditorLeftPanel
              mode={mode}
              setMode={setMode}
              gridStep={gridStep}
              setGridStep={setGridStep}
              dim={model.meta?.dim ?? "2d"}
              onStartTutorial={() => setTutorialOpen(true)}
              arrowScale={viewSettings.arrowScale}
              setArrowScale={viewSettings.setArrowScale}
              fontScale={viewSettings.fontScale}
              setFontScale={viewSettings.setFontScale}
              onResetView={viewSettings.resetView}
              onResetLabelOffsets={labelOffsets.resetAll}
            />
          </div>

          {/* 3D: кнопки-«язычки» для показа/скрытия панелей. */}
          {is3d && (
            <>
              <button
                onClick={() => setLeftPanelOpen((v) => !v)}
                className="hidden lg:flex absolute top-3 z-30 items-center justify-center w-7 h-12 bg-[var(--drawing-bg)] border border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] transition-all duration-200"
                style={{ left: leftPanelOpen ? "259px" : "12px" }}
                title={leftPanelOpen ? "Скрыть панель инструментов" : "Показать панель инструментов"}
              >
                <Icon name={leftPanelOpen ? "ChevronLeft" : "ChevronRight"} size={16} />
              </button>
              <button
                onClick={() => setRightPanelOpen((v) => !v)}
                className="hidden lg:flex absolute top-3 z-30 items-center justify-center w-7 h-12 bg-[var(--drawing-bg)] border border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] transition-all duration-200"
                style={{ right: rightPanelOpen ? "319px" : "12px" }}
                title={rightPanelOpen ? "Скрыть инспектор" : "Показать инспектор"}
              >
                <Icon name={rightPanelOpen ? "ChevronRight" : "ChevronLeft"} size={16} />
              </button>
            </>
          )}

          <EditorCanvasArea
            model={model}
            updateModel={updateModel}
            mode={mode}
            setMode={setMode}
            gridStep={gridStep}
            setGridStep={setGridStep}
            selectedNodeIds={selectedNodeIds}
            selectedElementIds={selectedElementIds}
            setSelectedNodeIds={setSelectedNodeIds}
            setSelectedElementIds={setSelectedElementIds}
            onCanvasClick={onCanvasClick}
            moveNode={moveNode}
            addNodeAtCoords={addNodeAtCoords}
            connectSelectedNodes={connectSelectedNodes}
            connectTwoNodes={connectTwoNodes}
            result={result}
            showDiagram={showDiagram}
            diagramScale={diagramScale}
            fitRequestId={fitRequestId}
            setFitRequestId={setFitRequestId}
            canUndo={canUndo}
            canRedo={canRedo}
            undo={undo}
            redo={redo}
            displayError={displayError}
            clearError={clearError}
            onOpenHelp={() => setHelpOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            arrowScale={viewSettings.arrowScale}
            fontScale={viewSettings.fontScale}
            setArrowScale={viewSettings.setArrowScale}
            setFontScale={viewSettings.setFontScale}
            onResetView={() => { viewSettings.resetView(); labelOffsets.resetAll(); }}
            labelOffsets={labelOffsets}
            issues={issues}
            setShowDiagram={setShowDiagram}
            setDiagramScale={setDiagramScale}
            onFocusNode={(id) => setSelectedNodeIds([id])}
            onFocusElement={(id) => setSelectedElementIds([id])}
            onRequestContext={(req) => {
              // Синхронизируем выделение с объектом popup'а — иначе действия,
              // привязанные к selectedElementId/Node (нагрузки, шарниры),
              // применятся к старому или пустому выделению.
              if (req.kind === "element") {
                setSelectedElementIds([req.id]);
                setSelectedNodeIds([]);
              } else {
                setSelectedNodeIds([req.id]);
                setSelectedElementIds([]);
              }
              setContextTarget(req);
            }}
            onOpenChecks={() => setMobileChecksOpen(true)}
            onOpenResults={() => setMobileResultsOpen(true)}
            fullHeight={is3d}
          />

          <div
            className={
              is3d
                ? `hidden lg:block absolute top-3 right-3 z-20 w-[300px] max-h-[calc(100vh-96px)] overflow-y-auto transition-transform duration-200 ${
                    rightPanelOpen ? "translate-x-0" : "translate-x-[320px]"
                  }`
                : "contents"
            }
          >
          <EditorSidePanels
            model={model}
            result={result}
            issues={issues}
            errorsCount={errorsCount}
            mobileChecksOpen={mobileChecksOpen}
            setMobileChecksOpen={setMobileChecksOpen}
            mobileResultsOpen={mobileResultsOpen}
            setMobileResultsOpen={setMobileResultsOpen}
            selectedNode={selectedNode}
            selectedElementId={selectedElementId}
            nodeBC={nodeBC}
            nodeLoad={nodeLoad}
            mode={mode}
            setMode={setMode}
            gridStep={gridStep}
            setGridStep={setGridStep}
            showDiagram={showDiagram}
            setShowDiagram={setShowDiagram}
            diagramScale={diagramScale}
            setDiagramScale={setDiagramScale}
            bcCustomOpen={bcCustomOpen}
            setBcCustomOpen={setBcCustomOpen}
            setMatPickerOpen={setMatPickerOpen}
            setSecPickerOpen={setSecPickerOpen}
            setSettingsOpen={setSettingsOpen}
            mobileTab={mobileTab}
            setMobileTab={setMobileTab}
            addBC={addBC}
            removeBC={removeBC}
            toggleCustomDof={toggleCustomDof}
            addNodalLoad={addNodalLoad}
            setNodalMoment={setNodalMoment}
            removeLoadOnNode={removeLoadOnNode}
            setDistributedLoad={setDistributedLoad}
            addInSpanPoint={addInSpanPoint}
            removeLoadById={removeLoadById}
            setElementHinge={setElementHinge}
            deleteSelected={deleteSelected}
            setSelectedNodeIds={setSelectedNodeIds}
            setSelectedElementIds={setSelectedElementIds}
            onStartTutorial={() => setTutorialOpen(true)}
            solving={solving}
            blocked={blocked}
            onSolve={onSolve}
          />
          </div>
        </div>
      </div>

      {/* Плавающая кнопка «Нагрузки» — видна, когда выбран ровно один узел.
          Даёт явный и заметный способ открыть модалку ввода нагрузок
          (вместо неочевидного правого клика). */}
      {selectedNode && selectedNodeIds.length === 1 && !loadModalOpen && (
        <button
          onClick={() => setLoadModalOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--drawing-accent)] text-white font-gost-upright font-bold text-xs uppercase tracking-wider px-5 py-3 shadow-2xl border-2 border-[var(--drawing-line)] flex items-center gap-2 hover:brightness-110 active:scale-95 transition"
        >
          <Icon name="MoveDown" size={16} />
          Нагрузки на узел {selectedNode.id}
        </button>
      )}

      <LoadInputModal
        open={loadModalOpen}
        onClose={() => setLoadModalOpen(false)}
        dim={model.meta?.dim ?? "2d"}
        node={selectedNode}
        nodeLoad={nodeLoad}
        setForce={setNodalForceComponent}
        setMoment={setNodalMomentComponent}
        onRemove={removeLoadOnNode}
      />

      <MaterialPicker
        open={matPickerOpen}
        onClose={() => setMatPickerOpen(false)}
        currentId={
          selectedElementId
            ? model.elements.find((x) => x.id === selectedElementId)?.material_id || null
            : null
        }
        onPick={pickMaterialForElement}
      />
      <SectionPicker
        open={secPickerOpen}
        onClose={() => setSecPickerOpen(false)}
        currentId={
          selectedElementId
            ? model.elements.find((x) => x.id === selectedElementId)?.section_id || null
            : null
        }
        onPick={pickSectionForElement}
      />

      <KeyboardHintsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <EditorTutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      <EditorWelcomeDialog
        open={welcomeOpen}
        onClose={() => setWelcomeOpen(false)}
        onStartTutorial={() => setTutorialOpen(true)}
        onLoadTemplate={(tpl) => updateModel(tpl)}
      />
      <EditorAnalysisSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={model.analysis_settings ?? DEFAULT_ANALYSIS_SETTINGS}
        onChange={(s) => updateModel({ ...model, analysis_settings: s })}
      />

      <NodeLimitModal
        open={nodeLimitOpen}
        onClose={() => setNodeLimitOpen(false)}
        currentLimit={NODE_LIMIT_ALPHA}
        currentNodeCount={model.nodes.length}
      />

      {/* Контекстный popup со свойствами узла/элемента.
          Открывается правым кликом (десктоп) или long-press 500мс (мобиль). */}
      {contextTarget && (
        <ContextPropertiesPopup
          target={contextTarget}
          onClose={() => setContextTarget(null)}
          model={model}
          selectedNode={selectedNode}
          selectedElementId={selectedElementId}
          nodeBC={nodeBC}
          nodeLoad={nodeLoad}
          bcCustomOpen={bcCustomOpen}
          setBcCustomOpen={setBcCustomOpen}
          addBC={addBC}
          removeBC={removeBC}
          toggleCustomDof={toggleCustomDof}
          addNodalLoad={addNodalLoad}
          setNodalMoment={setNodalMoment}
          setNodeCoord={setNodeCoord}
          setNodalForceComponent={setNodalForceComponent}
          setNodalMomentComponent={setNodalMomentComponent}
          removeLoadOnNode={removeLoadOnNode}
          setNodeConnection={setNodeConnection}
          setMatPickerOpen={setMatPickerOpen}
          setSecPickerOpen={setSecPickerOpen}
          setDistributedLoad={setDistributedLoad}
          addInSpanPoint={addInSpanPoint}
          updateInSpanPoint={updateInSpanPoint}
          removeLoadById={removeLoadById}
          setElementHinge={setElementHinge}
          deleteSelected={deleteSelected}
        />
      )}
    </>
  );
};

export default CaeEditor;