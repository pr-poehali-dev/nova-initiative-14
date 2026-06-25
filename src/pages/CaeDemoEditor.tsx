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
 *
 * Разметка вынесена в ./cae-editor/CaeDemoEditorView (+ баннер/уведомление)
 * без изменения логики — здесь только хуки, состояние и сборка пропсов.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { type ContextTarget } from "@/components/cae/editor/ContextPropertiesPopup";
import type { SolverResponse } from "@/lib/cae-model";
import { useCaeDemoProject, DEMO_ELEMENT_LIMIT, getSolveCount } from "./cae-editor/useCaeDemoProject";
import { useCaeActions } from "./cae-editor/useCaeActions";
import { useCaeSolver } from "./cae-editor/useCaeSolver";
import { useCaeKeyboard } from "./cae-editor/useCaeKeyboard";
import { useCaeEditorState } from "./cae-editor/useCaeEditorState";
import { useCaeViewSettings } from "./cae-editor/useCaeViewSettings";
import { useLabelOffsets } from "./cae-editor/useLabelOffsets";
import { DEFAULT_ANALYSIS_SETTINGS } from "@/lib/cae-model";
import { useAuth } from "@/contexts/AuthContext";
import CaeDemoBanner from "./cae-editor/CaeDemoBanner";
import CaeDemoLimitNotice from "./cae-editor/CaeDemoLimitNotice";
import CaeDemoEditorView from "./cae-editor/CaeDemoEditorView";
import WidgetEditorToolbar from "@/components/widget/WidgetEditorToolbar";
import BeamSectionsModal from "@/components/cae/BeamSectionsModal";
import Icon from "@/components/ui/icon";
import Seo from "@/components/Seo";

export interface CaeDemoEditorProps {
  /** Лимиты под тариф (виджет партнёра). Если не заданы — стандартные demo. */
  limits?: { solveLimit?: number; nodeLimit?: number; elementLimit?: number };
  /** Встроенный режим (iframe-виджет): не редиректить авторизованных,
   *  не показывать SEO. */
  embedded?: boolean;
  /** Доп. узел, который рендерится поверх редактора (партнёрская модалка
   *  заявки при исчерпании лимита). */
  overlaySlot?: ReactNode;
  /** Колбэк при исчерпании лимита расчётов (вместо модалки регистрации). */
  onLimitReached?: () => void;
  /** Название компании-партнёра (для панели виджета). */
  company?: string;
  /** Колбэк после КАЖДОГО успешного расчёта (виджет учитывает его в биллинге). */
  onSolveSuccess?: () => void;
  /** Ключ партнёра — solver применит лимит расчётов по настройкам партнёра. */
  widgetKey?: string;
}

const CaeDemoEditor = ({ limits, embedded, overlaySlot, onLimitReached, company, onSolveSuccess, widgetKey }: CaeDemoEditorProps = {}) => {
  const { user, loading: authLoadingCtx } = useAuth();
  const nav = useNavigate();

  // Авторизованный пользователь не должен попадать на демо —
  // перебрасываем в его реальный список проектов. В embedded-режиме (виджет
  // на чужом сайте) редирект отключён — там нет нашей авторизации.
  useEffect(() => {
    if (!embedded && !authLoadingCtx && user) {
      nav("/cae/projects", { replace: true });
    }
  }, [user, authLoadingCtx, nav, embedded]);

  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);
  const NODE_LIMIT_ALPHA = limits?.nodeLimit ?? 10;
  const elementLimitEff = limits?.elementLimit ?? DEMO_ELEMENT_LIMIT;
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
    solvesLeft,
  } = useCaeDemoProject({
    solveLimit: limits?.solveLimit,
    nodeLimit: limits?.nodeLimit,
    elementLimit: limits?.elementLimit,
  });

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
  } = useCaeSolver(model, 0, versionId, { demo: true, widgetKey });

  // Обёртка onSolve: если лимит исчерпан — открываем модалку с регистрацией.
  // После успешного расчёта увеличиваем счётчик; если это был последний — тоже открываем модалку.
  const reachLimit = () => {
    if (onLimitReached) onLimitReached();
    else setLimitModalOpen(true);
  };

  const onSolve = async () => {
    if (solveBlocked) {
      reachLimit();
      return;
    }
    const r = await onSolveInternal();
    // Сервер сам считает лимит по IP (защита от обхода через инкогнито).
    // 429 — лимит исчерпан на сервере: добиваем локальный счётчик до лимита
    // и показываем модалку регистрации / партнёрскую заявку.
    if (r.status === 429) {
      while (getSolveCount() < solveLimit) onSolveUsed();
      reachLimit();
      return;
    }
    onSolveUsed();
    // Успешный расчёт — сообщаем виджету для учёта в месячном биллинге.
    if (onSolveSuccess) onSolveSuccess();
    // Если только что использовали последний расчёт — приглашаем дальше
    if (solveCount + 1 >= solveLimit) {
      reachLimit();
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

  // Модалка подбора сечений «Балки».
  const [beamsOpen, setBeamsOpen] = useState(false);

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
    setSectionForElement,
    setSectionForAll,
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

  // Авто-открытие модалки «Балки» после расчёта, если есть проблемы
  // (балка с запасом прочности < 1) — предлагаем подобрать сечение.
  const autoBeamsRef = useRef<SolverResponse | null>(null);
  useEffect(() => {
    if (!result || autoBeamsRef.current === result) return;
    autoBeamsRef.current = result;
    const hasProblem = (result.elements || []).some(
      (e) => typeof e.max_values?.safety_factor === "number" && e.max_values.safety_factor < 1,
    );
    if (hasProblem) setBeamsOpen(true);
  }, [result]);

  return (
    <>
    {!embedded && (
      <Seo
        title="Демо-редактор CAE — расчёт балок, рам и ферм онлайн · Диплом-Инж.рф"
        description="Попробуйте облачный CAE-сервис без регистрации: постройте схему, выполните конечно-элементный расчёт, получите эпюры N, Q, M и PDF-отчёт по ЕСКД."
      />
    )}
    {overlaySlot}
    <CaeDemoEditorView
      embedded={embedded}
      layoutProps={{
        is3d,
        leftPanelOpen,
        setLeftPanelOpen,
        rightPanelOpen,
        setRightPanelOpen,
        draftFound: null,
        restoreDraft: () => {},
        discardDraft: () => {},
        embedded,
        embeddedToolbar: (
          <WidgetEditorToolbar
            onSolve={onSolve}
            solving={solving}
            blocked={blocked}
            solvesLeft={solvesLeft}
            solveLimit={solveLimit}
            company={company}
            onOpenBeams={() => setBeamsOpen(true)}
          />
        ),
        bannerSlot: (
          <CaeDemoBanner
            solveBlocked={solveBlocked}
            solveCount={solveCount}
            solveLimit={solveLimit}
            onReset={onReset}
          />
        ),
        topSlot: solveBlocked ? <CaeDemoLimitNotice solveLimit={solveLimit} /> : null,
        topBarProps: {
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
        },
        leftPanelProps: {
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
        },
        canvasProps: {
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
          elementLimit: elementLimitEff,
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
          embedded,
        },
        sidePanelsProps: {
          model,
          result,
          issues,
          errorsCount,
          hideMobileSolve: embedded,
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
        },
      }}
      modalsProps={{
        showLoadButton: !!selectedNode && selectedNodeIds.length === 1 && !loadModalOpen,
        loadButtonNodeId: selectedNode?.id ?? "",
        onOpenLoadModal: () => setLoadModalOpen(true),
        loadModalProps: {
          open: loadModalOpen,
          onClose: () => setLoadModalOpen(false),
          dim: model.meta?.dim ?? "2d",
          node: selectedNode,
          nodeLoad,
          setForce: setNodalForceComponent,
          setMoment: setNodalMomentComponent,
          onRemove: removeLoadOnNode,
        },
        materialPickerProps: {
          open: matPickerOpen,
          onClose: () => setMatPickerOpen(false),
          currentId: selectedElementId
            ? model.elements.find((x) => x.id === selectedElementId)?.material_id || null
            : null,
          onPick: pickMaterialForElement,
        },
        sectionPickerProps: {
          open: secPickerOpen,
          onClose: () => setSecPickerOpen(false),
          currentId: selectedElementId
            ? model.elements.find((x) => x.id === selectedElementId)?.section_id || null
            : null,
          onPick: pickSectionForElement,
        },
        helpOpen,
        onCloseHelp: () => setHelpOpen(false),
        tutorialOpen,
        onCloseTutorial: () => setTutorialOpen(false),
        tutorialModal: embedded,
        welcomeProps: {
          open: false,
          onClose: () => {},
          onStartTutorial: () => {},
          onLoadTemplate: () => {},
        },
        analysisSettingsProps: {
          open: settingsOpen,
          onClose: () => setSettingsOpen(false),
          settings: model.analysis_settings ?? DEFAULT_ANALYSIS_SETTINGS,
          onChange: (s) => updateModel({ ...model, analysis_settings: s }),
        },
        nodeLimitProps: {
          open: nodeLimitOpen,
          onClose: () => setNodeLimitOpen(false),
          currentLimit: NODE_LIMIT_ALPHA,
          currentNodeCount: model.nodes.length,
        },
      }}
      demoLimitModalProps={{
        open: limitModalOpen,
        onClose: () => setLimitModalOpen(false),
        usedSolves: solveCount,
        solveLimit,
      }}
      popupProps={{
        target: contextTarget,
        popupProps: {
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
        },
      }}
    />

    {/* Плавающая кнопка «Балки» в обычном демо (в виджете — в панели сверху). */}
    {!embedded && (
      <button
        onClick={() => setBeamsOpen(true)}
        className="fixed bottom-4 left-4 z-30 btn-drawing text-xs inline-flex items-center gap-1.5 shadow-lg"
        title="Подбор сечений балок"
      >
        <Icon name="Construction" size={14} /> Балки
      </button>
    )}

    <BeamSectionsModal
      open={beamsOpen}
      onClose={() => setBeamsOpen(false)}
      model={model}
      result={result}
      onSetSection={setSectionForElement}
      onApplyToAll={setSectionForAll}
    />
    </>
  );
};

export default CaeDemoEditor;