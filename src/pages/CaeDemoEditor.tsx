/**
 * Демо-редактор CAE — полный редактор без авторизации.
 * Альфа-тест: все лимиты сняты, расчёты бесплатны.
 */
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import EditorTopBar from "@/components/cae/editor/EditorTopBar";
import EditorCanvasArea from "@/components/cae/editor/EditorCanvasArea";
import EditorSidePanels from "@/components/cae/editor/EditorSidePanels";
import { MaterialPicker, SectionPicker } from "@/components/cae/CatalogPanel";
import KeyboardHintsDialog from "@/components/cae/editor/KeyboardHintsDialog";
import EditorTutorial from "@/components/cae/editor/EditorTutorial";
import EditorAnalysisSettingsDialog from "@/components/cae/editor/EditorAnalysisSettingsDialog";
import EditorLeftPanel from "@/components/cae/editor/EditorLeftPanel";
import { DEFAULT_ANALYSIS_SETTINGS } from "@/lib/cae-model";
import { useCaeDemoProject, DEMO_ELEMENT_LIMIT } from "./cae-editor/useCaeDemoProject";
import { useCaeActions } from "./cae-editor/useCaeActions";
import { useCaeSolver } from "./cae-editor/useCaeSolver";
import { useCaeKeyboard } from "./cae-editor/useCaeKeyboard";
import { useCaeEditorState } from "./cae-editor/useCaeEditorState";
import { useCaeViewSettings } from "./cae-editor/useCaeViewSettings";
import { useLabelOffsets } from "./cae-editor/useLabelOffsets";
import { SITE_URL } from "@/lib/seo";

const CaeDemoEditor = () => {
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
    onReset,
    onSolveUsed,
    undo,
    redo,
    canUndo,
    canRedo,
    solveBlocked,
  } = useCaeDemoProject();

  const {
    result,
    solverError,
    setSolverError,
    solving,
    showDiagram,
    setShowDiagram,
    diagramScale,
    setDiagramScale,
    onSolve: onSolveInternal,
    issues,
    blocked,
  } = useCaeSolver(model, 0, versionId);

  // Обёртка onSolve: блокируем если исчерпан лимит, после успеха — увеличиваем счётчик
  const onSolve = async () => {
    if (solveBlocked) return;
    await onSolveInternal();
    onSolveUsed();
  };

  const errorsCount = issues.filter((i) => i.level === "error").length;

  const {
    mode, setMode,
    gridStep, setGridStep,
    selectedNodeIds, setSelectedNodeIds,
    selectedElementIds, setSelectedElementIds,
    selectedNodeId: _selectedNodeId, selectedElementId,
    matPickerOpen, setMatPickerOpen,
    secPickerOpen, setSecPickerOpen,
    bcCustomOpen, setBcCustomOpen,
    helpOpen, setHelpOpen,
    tutorialOpen, setTutorialOpen,
    welcomeOpen: _welcomeOpen,
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

  const viewSettings = useCaeViewSettings();
  const labelOffsets = useLabelOffsets(0);

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

  return (
    <>
      <Helmet>
        <title>Демо CAE-редактора — расчёт рам и балок · Диплом-Инж.рф</title>
        <meta
          name="description"
          content="Попробуйте облачный CAE-редактор без регистрации: нарисуйте плоскую раму, задайте нагрузки и опоры, запустите МКЭ-расчёт, получите эпюры N/Q/M прямо в браузере."
        />
        <link rel="canonical" href={`${SITE_URL}/cae/demo`} />
      </Helmet>

      {/* Баннер альфа-теста */}
      <div className="bg-[var(--drawing-accent)] text-white">
        <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-gost uppercase tracking-wider">
            Альфа-тест · все расчёты бесплатно · лимиты сняты
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="font-gost uppercase tracking-wider underline underline-offset-2 hover:no-underline"
            >
              Сбросить
            </button>
            <Link
              to="/register"
              className="font-gost-upright font-bold uppercase tracking-wider bg-white text-[var(--drawing-accent)] px-3 py-1 hover:bg-white/90"
            >
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-16 md:pt-16">
        <EditorTopBar
          projectName={projectName}
          model={model}
          result={result}
          dirty={dirty}
          lastSaved={lastSaved}
          saving={saving}
          solving={solving}
          blocked={blocked || solveBlocked}
          errorsCount={errorsCount}
          onSave={onSave}
          onSolve={onSolve}
        />

        {/* Баннеры лимитов отключены на время альфа-тестирования */}

        <div className="max-w-[1400px] mx-auto px-3 py-3 grid gap-3 lg:grid-cols-[260px_1fr_320px]">
          <div className="hidden lg:block">
            <EditorLeftPanel
              mode={mode}
              setMode={setMode}
              gridStep={gridStep}
              setGridStep={setGridStep}
              onStartTutorial={() => setHelpOpen(true)}
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
            elementLimit={DEMO_ELEMENT_LIMIT}
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
            onStartTutorial={() => setHelpOpen(true)}
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
      <EditorAnalysisSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={model.analysis_settings ?? DEFAULT_ANALYSIS_SETTINGS}
        onChange={(s) => updateModel({ ...model, analysis_settings: s })}
      />
    </>
  );
};

export default CaeDemoEditor;