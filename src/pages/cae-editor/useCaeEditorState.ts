/**
 * Хук: локальное UI-состояние редактора CAE.
 * Содержит:
 *  - mode, gridStep, selectedNodeIds, selectedElementIds
 *  - флаги открытия диалогов (matPicker, secPicker, bcCustom, help, tutorial, welcome, settings)
 *  - mobileTab, fitRequestId
 *  - useEffect для автозапуска welcome/tutorial
 *  - производные: selectedNodeId, selectedElementId, selectedNode, nodeBC, nodeLoad
 *  - displayError, clearError
 */
import { useEffect, useState } from "react";
import type { EditorMode } from "@/components/cae/FrameCanvas";
import type { FrameModel } from "@/lib/cae-model";
import { isTutorialCompleted } from "@/components/cae/editor/EditorTutorial";
import { isWelcomeShown } from "@/components/cae/editor/EditorWelcomeDialog";

interface Params {
  model: FrameModel;
  loadingModel: boolean;
  authLoading: boolean;
  solverError: string | null;
  setSolverError: (v: string | null) => void;
  loadError: string | null;
  setLoadError: (v: string | null) => void;
}

export interface CaeEditorStateResult {
  // Инструменты и сетка
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  gridStep: number;
  setGridStep: (g: number) => void;
  // Выделение
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
  selectedNodeId: string | null;
  selectedElementId: string | null;
  // Диалоги
  matPickerOpen: boolean;
  setMatPickerOpen: (v: boolean) => void;
  secPickerOpen: boolean;
  setSecPickerOpen: (v: boolean) => void;
  bcCustomOpen: boolean;
  setBcCustomOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  tutorialOpen: boolean;
  setTutorialOpen: (v: boolean) => void;
  welcomeOpen: boolean;
  setWelcomeOpen: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  // Мобильная раскладка (вкладка "props" удалена — свойства открываются
  // через контекстный popup по long-press, отдельной вкладки больше нет).
  mobileTab: "tools" | "checks" | "results";
  setMobileTab: (t: "tools" | "checks" | "results") => void;
  // Fit-to-content
  fitRequestId: number;
  setFitRequestId: (fn: (x: number) => number) => void;
  // Производные из model + selectedNode
  selectedNode: FrameModel["nodes"][number] | null | undefined;
  nodeBC: FrameModel["boundary_conditions"][number] | undefined;
  nodeLoad: FrameModel["loads"][number] | undefined;
  // Ошибки
  displayError: string | null;
  clearError: () => void;
}

export function useCaeEditorState({
  model,
  loadingModel,
  authLoading,
  solverError,
  setSolverError,
  loadError,
  setLoadError,
}: Params): CaeEditorStateResult {
  const [mode, setMode] = useState<EditorMode>("draw-node");
  const [gridStep, setGridStep] = useState(0.5);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [matPickerOpen, setMatPickerOpen] = useState(false);
  const [secPickerOpen, setSecPickerOpen] = useState(false);
  const [bcCustomOpen, setBcCustomOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Мобильная раскладка: одна активная вкладка снизу под канвасом.
  // Не показывается на десктопе (lg-брейкпоинт и выше) — там обычные две колонки.
  const [mobileTab, setMobileTab] = useState<"tools" | "checks" | "results">("tools");
  // Триггер ручной «подгонки масштаба» канвы — кнопка-лупа.
  const [fitRequestId, setFitRequestId] = useState(0);

  // При первом визите на пустой проект показываем приветственный экран.
  // Туториал автозапускаем только если приветствие уже было показано (повторный визит)
  // и пользователь его не проходил — это страховка, чтобы не дублировать UI.
  useEffect(() => {
    if (loadingModel || authLoading) return;
    const isEmpty = model.nodes.length === 0 && model.elements.length === 0;
    if (isEmpty && !isWelcomeShown()) {
      const t = window.setTimeout(() => setWelcomeOpen(true), 400);
      return () => window.clearTimeout(t);
    }
    if (!isEmpty && !isTutorialCompleted() && !isWelcomeShown()) {
      const t = window.setTimeout(() => setTutorialOpen(true), 600);
      return () => window.clearTimeout(t);
    }
  }, [loadingModel, authLoading, model.nodes.length, model.elements.length]);

  // Одиночный выбор для правой панели свойств
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

  const selectedNode = selectedNodeId
    ? model.nodes.find((n) => n.id === selectedNodeId)
    : null;
  const nodeBC = selectedNode
    ? model.boundary_conditions.find((b) => b.node_id === selectedNode.id)
    : undefined;
  const nodeLoad = selectedNode
    ? model.loads.find((l) => l.type === "nodal_force" && l.node_id === selectedNode.id)
    : undefined;

  // Объединяем ошибки загрузки и солвера в одно состояние для отображения
  const displayError = solverError || loadError;
  const clearError = () => {
    setSolverError(null);
    setLoadError(null);
  };

  return {
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
  };
}