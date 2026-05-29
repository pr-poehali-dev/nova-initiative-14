/**
 * Демо-редактор CAE — полный редактор без авторизации.
 * Альфа-тест: все лимиты сняты, расчёты бесплатны.
 */
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
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
import DemoLimitModal from "@/components/cae/DemoLimitModal";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CaeDemoEditor = () => {
  const { user, loading: authLoadingCtx } = useAuth();
  const nav = useNavigate();

  // Авторизованный пользователь не должен попадать на демо —
  // перебрасываем в его реальный список проектов.
  useEffect(() => {
    if (!authLoadingCtx && user) {
      nav("/cae/projects", { replace: true });
    }
  }, [user, authLoadingCtx, nav]);

  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);
  const NODE_LIMIT_ALPHA = 10;
  const [nodeLimitOpen, setNodeLimitOpen] = useState(false);
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
    solveCount,
    solveLimit,
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
  } = useCaeSolver(model, 0, versionId, { demo: true });

  // Обёртка onSolve: если лимит исчерпан — открываем модалку с регистрацией.
  // После успешного расчёта увеличиваем счётчик; если это был последний — тоже открываем модалку.
  const onSolve = async () => {
    if (solveBlocked) {
      setLimitModalOpen(true);
      return;
    }
    await onSolveInternal();
    onSolveUsed();
    // Если только что использовали последний расчёт — приглашаем зарегистрироваться
    if (solveCount + 1 >= solveLimit) {
      setLimitModalOpen(true);
    }
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

      {/* Баннер демо-режима со счётчиком пробных расчётов */}
      <div className="bg-[var(--drawing-accent)] text-white">
        <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-gost uppercase tracking-wider">
            <span className="font-bold">Демо без регистрации</span>
            <span className={`inline-flex items-center gap-1 ${solveBlocked ? "bg-red-700" : "bg-white/15"} px-2 py-0.5`}>
              Пробных расчётов: <span className="font-bold">{solveCount}/{solveLimit}</span>
            </span>
          </div>
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
              Регистрация · безлимит
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
          blocked={blocked}
          errorsCount={errorsCount}
          onSave={onSave}
          onSolve={onSolve}
        />

        {/* Уведомление об исчерпании лимита расчётов */}
        {solveBlocked && (
          <div className="bg-amber-50 border-b-2 border-amber-700/40">
            <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-amber-900">
                Лимит демо исчерпан: <strong>{solveLimit} расчётов</strong> использовано.
              </span>
              <Link
                to="/register"
                className="btn-drawing text-[10px] border-amber-700/60 hover:border-amber-700 inline-flex"
              >
                Зарегистрироваться — расчёты без лимита&nbsp;&rarr;
              </Link>
            </div>
          </div>
        )}

        <div className="max-w-[1400px] mx-auto px-3 py-3 grid gap-3 lg:grid-cols-[240px_1fr_300px]">
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
            setMode={setMode}
            gridStep={gridStep}
            setGridStep={setGridStep}
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
            setArrowScale={viewSettings.setArrowScale}
            setFontScale={viewSettings.setFontScale}
            onResetView={() => { viewSettings.resetView(); labelOffsets.resetAll(); }}
            labelOffsets={labelOffsets}
            elementLimit={DEMO_ELEMENT_LIMIT}
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

      <DemoLimitModal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        usedSolves={solveCount}
        solveLimit={solveLimit}
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
          removeLoadOnNode={removeLoadOnNode}
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

export default CaeDemoEditor;