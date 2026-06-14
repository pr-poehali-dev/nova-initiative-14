/**
 * Демо-редактор CAE — это ОБЫЧНЫЙ редактор с демо-ограничениями.
 *
 * Использует те же презентационные компоненты раскладки, что и реальный
 * редактор (CaeEditorLayout / CaeEditorModals / CaeEditorContextPopup),
 * поэтому весь функционал (3D-раскладка, скрываемые панели, плавающая
 * кнопка «Нагрузки», окно ввода нагрузок) полностью совпадает.
 *
 * Демо-специфика:
 *  - данные в localStorage (useCaeDemoProject) без бэкенда;
 *  - лимит пробных расчётов с модалкой регистрации;
 *  - баннер демо-режима со счётчиком расчётов;
 *  - редирект авторизованных пользователей в их проекты.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import { type ContextTarget } from "@/components/cae/editor/ContextPropertiesPopup";
import DemoLimitModal from "@/components/cae/DemoLimitModal";
import { useCaeDemoProject, DEMO_ELEMENT_LIMIT, getSolveCount } from "./cae-editor/useCaeDemoProject";
import { useCaeActions } from "./cae-editor/useCaeActions";
import { useCaeSolver } from "./cae-editor/useCaeSolver";
import { useCaeKeyboard } from "./cae-editor/useCaeKeyboard";
import { useCaeEditorState } from "./cae-editor/useCaeEditorState";
import { useCaeViewSettings } from "./cae-editor/useCaeViewSettings";
import { useLabelOffsets } from "./cae-editor/useLabelOffsets";
import { SITE_URL } from "@/lib/seo";
import { DEFAULT_ANALYSIS_SETTINGS } from "@/lib/cae-model";
import { useAuth } from "@/contexts/AuthContext";
import CaeEditorLayout from "./cae-editor/CaeEditorLayout";
import CaeEditorModals from "./cae-editor/CaeEditorModals";
import CaeEditorContextPopup from "./cae-editor/CaeEditorContextPopup";

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
    const r = await onSolveInternal();
    // Сервер сам считает лимит по IP (защита от обхода через инкогнито).
    // 429 — лимит исчерпан на сервере: добиваем локальный счётчик до лимита
    // и показываем модалку регистрации.
    if (r.status === 429) {
      while (getSolveCount() < solveLimit) onSolveUsed();
      setLimitModalOpen(true);
      return;
    }
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

  // 3D-редактор: канва во всю ширину, левая/правая панели — скрываемые
  // оверлеи поверх сцены. Видимость по кнопкам.
  const is3d = model.meta?.dim === "3d";
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Модальное окно ввода узловых нагрузок (удобная форма по всем осям).
  const [loadModalOpen, setLoadModalOpen] = useState(false);

  // Мобильные модальные окна проверок / результатов (открываются HUD-кнопками).
  const [mobileChecksOpen, setMobileChecksOpen] = useState(false);
  const [mobileResultsOpen, setMobileResultsOpen] = useState(false);

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

      <CaeEditorLayout
        is3d={is3d}
        leftPanelOpen={leftPanelOpen}
        setLeftPanelOpen={setLeftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
        draftFound={null}
        restoreDraft={() => {}}
        discardDraft={() => {}}
        bannerSlot={
          /* Баннер демо-режима со счётчиком пробных расчётов */
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
        }
        topSlot={
          /* Уведомление об исчерпании лимита расчётов */
          solveBlocked ? (
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
          ) : null
        }
        topBarProps={{
          projectName,
          model,
          result,
          dirty,
          lastSaved,
          saving,
          solving,
          blocked,
          errorsCount,
          onSave,
          onSolve,
        }}
        leftPanelProps={{
          mode,
          setMode,
          gridStep,
          setGridStep,
          dim: model.meta?.dim ?? "2d",
          onStartTutorial: () => setHelpOpen(true),
          arrowScale: viewSettings.arrowScale,
          setArrowScale: viewSettings.setArrowScale,
          fontScale: viewSettings.fontScale,
          setFontScale: viewSettings.setFontScale,
          onResetView: viewSettings.resetView,
          onResetLabelOffsets: labelOffsets.resetAll,
        }}
        canvasProps={{
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
          onOpenHelp: () => setHelpOpen(true),
          onOpenSettings: () => setSettingsOpen(true),
          arrowScale: viewSettings.arrowScale,
          fontScale: viewSettings.fontScale,
          setArrowScale: viewSettings.setArrowScale,
          setFontScale: viewSettings.setFontScale,
          onResetView: () => { viewSettings.resetView(); labelOffsets.resetAll(); },
          labelOffsets,
          elementLimit: DEMO_ELEMENT_LIMIT,
          issues,
          setShowDiagram,
          setDiagramScale,
          onFocusNode: (id) => setSelectedNodeIds([id]),
          onFocusElement: (id) => setSelectedElementIds([id]),
          onRequestContext: (req) => {
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
          },
          onOpenChecks: () => setMobileChecksOpen(true),
          onOpenResults: () => setMobileResultsOpen(true),
          fullHeight: is3d,
        }}
        sidePanelsProps={{
          model,
          result,
          issues,
          errorsCount,
          mobileChecksOpen,
          setMobileChecksOpen,
          mobileResultsOpen,
          setMobileResultsOpen,
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
          onStartTutorial: () => setHelpOpen(true),
          solving,
          blocked,
          onSolve,
        }}
      />

      <CaeEditorModals
        showLoadButton={!!selectedNode && selectedNodeIds.length === 1 && !loadModalOpen}
        loadButtonNodeId={selectedNode?.id ?? ""}
        onOpenLoadModal={() => setLoadModalOpen(true)}
        loadModalProps={{
          open: loadModalOpen,
          onClose: () => setLoadModalOpen(false),
          dim: model.meta?.dim ?? "2d",
          node: selectedNode,
          nodeLoad,
          setForce: setNodalForceComponent,
          setMoment: setNodalMomentComponent,
          onRemove: removeLoadOnNode,
        }}
        materialPickerProps={{
          open: matPickerOpen,
          onClose: () => setMatPickerOpen(false),
          currentId: selectedElementId
            ? model.elements.find((x) => x.id === selectedElementId)?.material_id || null
            : null,
          onPick: pickMaterialForElement,
        }}
        sectionPickerProps={{
          open: secPickerOpen,
          onClose: () => setSecPickerOpen(false),
          currentId: selectedElementId
            ? model.elements.find((x) => x.id === selectedElementId)?.section_id || null
            : null,
          onPick: pickSectionForElement,
        }}
        helpOpen={helpOpen}
        onCloseHelp={() => setHelpOpen(false)}
        tutorialOpen={tutorialOpen}
        onCloseTutorial={() => setTutorialOpen(false)}
        welcomeProps={{
          open: false,
          onClose: () => {},
          onStartTutorial: () => {},
          onLoadTemplate: () => {},
        }}
        analysisSettingsProps={{
          open: settingsOpen,
          onClose: () => setSettingsOpen(false),
          settings: model.analysis_settings ?? DEFAULT_ANALYSIS_SETTINGS,
          onChange: (s) => updateModel({ ...model, analysis_settings: s }),
        }}
        nodeLimitProps={{
          open: nodeLimitOpen,
          onClose: () => setNodeLimitOpen(false),
          currentLimit: NODE_LIMIT_ALPHA,
          currentNodeCount: model.nodes.length,
        }}
      />

      <DemoLimitModal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        usedSolves={solveCount}
        solveLimit={solveLimit}
      />

      <CaeEditorContextPopup
        target={contextTarget}
        popupProps={{
          onClose: () => setContextTarget(null),
          model,
          selectedNode,
          selectedElementId,
          nodeBC,
          nodeLoad,
          bcCustomOpen,
          setBcCustomOpen,
          addBC,
          removeBC,
          toggleCustomDof,
          addNodalLoad,
          setNodalMoment,
          setNodeCoord,
          setNodalForceComponent,
          setNodalMomentComponent,
          removeLoadOnNode,
          setNodeConnection,
          setMatPickerOpen,
          setSecPickerOpen,
          setDistributedLoad,
          addInSpanPoint,
          updateInSpanPoint,
          removeLoadById,
          setElementHinge,
          deleteSelected,
        }}
      />
    </>
  );
};

export default CaeDemoEditor;