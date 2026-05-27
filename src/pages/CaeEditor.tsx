import { useParams } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import EditorTopBar from "@/components/cae/editor/EditorTopBar";
import EditorCanvasArea from "@/components/cae/editor/EditorCanvasArea";
import EditorSidePanels from "@/components/cae/editor/EditorSidePanels";
import { MaterialPicker, SectionPicker } from "@/components/cae/CatalogPanel";
import KeyboardHintsDialog from "@/components/cae/editor/KeyboardHintsDialog";
import EditorTutorial from "@/components/cae/editor/EditorTutorial";
import EditorWelcomeDialog from "@/components/cae/editor/EditorWelcomeDialog";
import EditorAnalysisSettingsDialog from "@/components/cae/editor/EditorAnalysisSettingsDialog";
import EditorLeftPanel from "@/components/cae/editor/EditorLeftPanel";
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
    addBC,
    removeBC,
    addNodalLoad,
    removeLoadOnNode,
    setNodalMoment,
    toggleCustomDof,
    pickMaterialForElement,
    pickSectionForElement,
    setDistributedLoad,
    addInSpanPoint,
    removeLoadById,
    setElementHinge,
  } = useCaeActions(
    model,
    updateModel,
    selectedNodeIds,
    selectedElementIds,
    setSelectedNodeIds,
    setSelectedElementIds,
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

        <div className="max-w-[1400px] mx-auto px-3 py-3 grid gap-3 lg:grid-cols-[260px_1fr_320px]">
          {/* Левая панель инструментов — на десктопе сбоку, на мобилке в виде вкладки */}
          <div className="hidden lg:block">
            <EditorLeftPanel
              mode={mode}
              setMode={setMode}
              gridStep={gridStep}
              setGridStep={setGridStep}
              onStartTutorial={() => setTutorialOpen(true)}
              arrowScale={viewSettings.arrowScale}
              setArrowScale={viewSettings.setArrowScale}
              fontScale={viewSettings.fontScale}
              setFontScale={viewSettings.setFontScale}
              onResetView={viewSettings.resetView}
              onResetLabelOffsets={labelOffsets.resetAll}
            />
          </div>

          <EditorCanvasArea
            model={model}
            updateModel={updateModel}
            mode={mode}
            gridStep={gridStep}
            selectedNodeIds={selectedNodeIds}
            selectedElementIds={selectedElementIds}
            setSelectedNodeIds={setSelectedNodeIds}
            setSelectedElementIds={setSelectedElementIds}
            onCanvasClick={onCanvasClick}
            moveNode={moveNode}
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
            labelOffsets={labelOffsets}
            issues={issues}
            setShowDiagram={setShowDiagram}
            setDiagramScale={setDiagramScale}
            onFocusNode={(id) => setSelectedNodeIds([id])}
            onFocusElement={(id) => setSelectedElementIds([id])}
          />

          <EditorSidePanels
            model={model}
            result={result}
            issues={issues}
            errorsCount={errorsCount}
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
    </>
  );
};

export default CaeEditor;