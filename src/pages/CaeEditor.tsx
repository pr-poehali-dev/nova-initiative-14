import { useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import { type ContextTarget } from "@/components/cae/editor/ContextPropertiesPopup";
import { DEFAULT_ANALYSIS_SETTINGS } from "@/lib/cae-model";
import { useCaeProject } from "./cae-editor/useCaeProject";
import { useCaeActions } from "./cae-editor/useCaeActions";
import { useCaeSolver } from "./cae-editor/useCaeSolver";
import { useCaeKeyboard } from "./cae-editor/useCaeKeyboard";
import { useCaeEditorState } from "./cae-editor/useCaeEditorState";
import { useCaeViewSettings } from "./cae-editor/useCaeViewSettings";
import { useLabelOffsets } from "./cae-editor/useLabelOffsets";
import CaeEditorLayout from "./cae-editor/CaeEditorLayout";
import CaeEditorModals from "./cae-editor/CaeEditorModals";
import CaeEditorContextPopup from "./cae-editor/CaeEditorContextPopup";

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

      <CaeEditorLayout
        is3d={is3d}
        leftPanelOpen={leftPanelOpen}
        setLeftPanelOpen={setLeftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
        draftFound={draftFound}
        restoreDraft={restoreDraft}
        discardDraft={discardDraft}
        topBarProps={{
          projectName,
          projectId,
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
          onStartTutorial: () => setTutorialOpen(true),
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
          onStartTutorial: () => setTutorialOpen(true),
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
          open: welcomeOpen,
          onClose: () => setWelcomeOpen(false),
          onStartTutorial: () => setTutorialOpen(true),
          onLoadTemplate: (tpl) => updateModel(tpl),
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

export default CaeEditor;
