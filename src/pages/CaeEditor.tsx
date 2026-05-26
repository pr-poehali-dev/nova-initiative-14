import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import FrameCanvas, { type EditorMode } from "@/components/cae/FrameCanvas";
import { MaterialPicker, SectionPicker } from "@/components/cae/CatalogPanel";
import EditorTopBar from "@/components/cae/editor/EditorTopBar";
import EditorLeftPanel from "@/components/cae/editor/EditorLeftPanel";
import EditorRightPanel from "@/components/cae/editor/EditorRightPanel";
import EditorResultsPanel from "@/components/cae/editor/EditorResultsPanel";
import EditorIssuesPanel from "@/components/cae/editor/EditorIssuesPanel";
import KeyboardHintsDialog from "@/components/cae/editor/KeyboardHintsDialog";
import EditorTutorial, { isTutorialCompleted } from "@/components/cae/editor/EditorTutorial";
import EditorWelcomeDialog, { isWelcomeShown } from "@/components/cae/editor/EditorWelcomeDialog";
import EditorAnalysisSettingsDialog from "@/components/cae/editor/EditorAnalysisSettingsDialog";
import EditorChecksPanel from "@/components/cae/editor/EditorChecksPanel";
import { DEFAULT_ANALYSIS_SETTINGS } from "@/lib/cae-model";
import { useCaeProject } from "./cae-editor/useCaeProject";
import { useCaeActions } from "./cae-editor/useCaeActions";
import { useCaeSolver } from "./cae-editor/useCaeSolver";
import { useCaeKeyboard } from "./cae-editor/useCaeKeyboard";

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
  const [mobileTab, setMobileTab] = useState<"tools" | "props" | "checks" | "results">("tools");

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
  });

  // Объединяем ошибки загрузки и солвера в одно состояние для отображения
  const displayError = solverError || loadError;
  const clearError = () => {
    setSolverError(null);
    setLoadError(null);
  };

  const selectedNode = selectedNodeId
    ? model.nodes.find((n) => n.id === selectedNodeId)
    : null;
  const nodeBC = selectedNode
    ? model.boundary_conditions.find((b) => b.node_id === selectedNode.id)
    : undefined;
  const nodeLoad = selectedNode
    ? model.loads.find((l) => l.type === "nodal_force" && l.node_id === selectedNode.id)
    : undefined;

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
            />
          </div>

          {/* Канва */}
          <div
            className="border-2 border-[var(--drawing-line)] relative h-[58vh] min-h-[360px] lg:h-[70vh] lg:min-h-[480px]"
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
                onClick={() => setHelpOpen(true)}
                className="min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 p-2 border-r border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] hidden md:flex items-center justify-center"
                title="Горячие клавиши (?)"
                aria-label="Горячие клавиши"
              >
                <Icon name="Keyboard" size={18} />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
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
            />
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

          {/* Десктоп: правая колонка со всеми панелями сразу.
              Мобилка: ниже идёт блок с вкладками. */}
          <aside className="hidden lg:block space-y-3 text-[12px]">
            <EditorIssuesPanel
              issues={issues}
              onFocusNode={(id) => {
                setSelectedNodeIds([id]);
                setSelectedElementIds([]);
              }}
              onFocusElement={(id) => {
                setSelectedElementIds([id]);
                setSelectedNodeIds([]);
              }}
            />
            <div data-tutorial="props">
              <EditorRightPanel
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
                removeLoadById={removeLoadById}
                setElementHinge={setElementHinge}
                deleteSelected={deleteSelected}
              />
            </div>

            <EditorChecksPanel
              model={model}
              result={result}
              onFocusElement={(id) => {
                setSelectedElementIds([id]);
                setSelectedNodeIds([]);
              }}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            <div data-tutorial="results">
              <EditorResultsPanel
                result={result}
                model={model}
                showDiagram={showDiagram}
                setShowDiagram={setShowDiagram}
                diagramScale={diagramScale}
                setDiagramScale={setDiagramScale}
              />
            </div>
          </aside>

          {/* Мобильная раскладка — вкладки с инструментами/свойствами/проверками/результатами */}
          <div className="lg:hidden col-span-full">
            <div className="grid grid-cols-4 gap-0 border-2 border-[var(--drawing-line)] border-b-0 bg-[var(--drawing-bg)] sticky top-16 z-20">
              {([
                { key: "tools", label: "Чертить", icon: "Pencil" },
                { key: "props", label: "Свойства", icon: "Sliders" },
                { key: "checks", label: "Проверки", icon: "ShieldCheck" },
                { key: "results", label: "Эпюры", icon: "BarChart3" },
              ] as const).map((t) => {
                const active = mobileTab === t.key;
                const hasIssues = t.key === "checks" && (result || errorsCount > 0);
                return (
                  <button
                    key={t.key}
                    onClick={() => setMobileTab(t.key)}
                    className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 border-r border-[var(--drawing-line)] last:border-r-0 font-gost text-[10px] uppercase tracking-wider transition ${
                      active
                        ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)]"
                        : "hover:bg-[var(--drawing-paper)] text-[var(--drawing-ink)]"
                    }`}
                    aria-label={t.label}
                    aria-pressed={active}
                  >
                    <Icon name={t.icon} size={18} />
                    <span className="leading-none">{t.label}</span>
                    {hasIssues && errorsCount > 0 && !active && (
                      <span className="absolute mt-[-22px] ml-7 bg-[var(--drawing-accent)] text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center">
                        {errorsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-2 border-[var(--drawing-line)] p-3 space-y-3 text-[12px] min-h-[200px] pb-24">
              {mobileTab === "tools" && (
                <EditorLeftPanel
                  mode={mode}
                  setMode={setMode}
                  gridStep={gridStep}
                  setGridStep={setGridStep}
                  onStartTutorial={() => setTutorialOpen(true)}
                />
              )}
              {mobileTab === "props" && (
                <>
                  <EditorIssuesPanel
                    issues={issues}
                    onFocusNode={(id) => {
                      setSelectedNodeIds([id]);
                      setSelectedElementIds([]);
                    }}
                    onFocusElement={(id) => {
                      setSelectedElementIds([id]);
                      setSelectedNodeIds([]);
                    }}
                  />
                  <EditorRightPanel
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
                    removeLoadById={removeLoadById}
                    setElementHinge={setElementHinge}
                    deleteSelected={deleteSelected}
                  />
                </>
              )}
              {mobileTab === "checks" && (
                <EditorChecksPanel
                  model={model}
                  result={result}
                  onFocusElement={(id) => {
                    setSelectedElementIds([id]);
                    setSelectedNodeIds([]);
                  }}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              )}
              {mobileTab === "results" && (
                <EditorResultsPanel
                  result={result}
                  model={model}
                  showDiagram={showDiagram}
                  setShowDiagram={setShowDiagram}
                  diagramScale={diagramScale}
                  setDiagramScale={setDiagramScale}
                />
              )}
            </div>
          </div>
        </div>

        {/* Плавающая кнопка «Рассчитать» — только на мобилке.
            Видна всегда независимо от активной вкладки, фиксирована к низу экрана. */}
        <button
          onClick={onSolve}
          disabled={solving || blocked}
          className="lg:hidden fixed bottom-4 right-4 z-30 min-w-[64px] min-h-[56px] px-5 py-3 bg-[var(--drawing-accent)] text-white font-gost-upright font-bold text-[14px] uppercase tracking-wider shadow-2xl border-2 border-[var(--drawing-ink)] flex items-center gap-2 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Запустить расчёт"
        >
          {solving ? (
            <>
              <Icon name="Loader2" size={20} className="animate-spin" />
              <span>Счёт…</span>
            </>
          ) : (
            <>
              <Icon name="Play" size={20} />
              <span>Расчёт</span>
            </>
          )}
        </button>
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