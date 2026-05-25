import { useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import FrameCanvas, { type EditorMode } from "@/components/cae/FrameCanvas";
import { MaterialPicker, SectionPicker } from "@/components/cae/CatalogPanel";
import EditorTopBar from "@/components/cae/editor/EditorTopBar";
import EditorLeftPanel from "@/components/cae/editor/EditorLeftPanel";
import EditorRightPanel from "@/components/cae/editor/EditorRightPanel";
import EditorResultsPanel from "@/components/cae/editor/EditorResultsPanel";
import { useCaeProject } from "./cae-editor/useCaeProject";
import { useCaeActions } from "./cae-editor/useCaeActions";
import { useCaeSolver } from "./cae-editor/useCaeSolver";

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
  } = useCaeProject(projectId);

  const [mode, setMode] = useState<EditorMode>("draw-node");
  const [gridStep, setGridStep] = useState(0.5);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [matPickerOpen, setMatPickerOpen] = useState(false);
  const [secPickerOpen, setSecPickerOpen] = useState(false);
  const [bcCustomOpen, setBcCustomOpen] = useState(false);

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
  } = useCaeSolver(model, projectId, versionId);

  const {
    onCanvasClick,
    deleteSelected,
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
  } = useCaeActions(
    model,
    updateModel,
    selectedNodeId,
    selectedElementId,
    setSelectedNodeId,
    setSelectedElementId,
  );

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
          onSave={onSave}
          onSolve={onSolve}
        />

        <div className="max-w-[1400px] mx-auto px-3 py-3 grid gap-3 lg:grid-cols-[260px_1fr_320px]">
          <EditorLeftPanel
            mode={mode}
            setMode={setMode}
            gridStep={gridStep}
            setGridStep={setGridStep}
          />

          {/* Канва */}
          <div
            className="border-2 border-[var(--drawing-line)] relative"
            style={{ height: "70vh", minHeight: 480 }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
            }}
          >
            <FrameCanvas
              model={model}
              setModel={updateModel}
              mode={mode}
              gridStep={gridStep}
              selectedNodeId={selectedNodeId}
              selectedElementId={selectedElementId}
              onSelectNode={setSelectedNodeId}
              onSelectElement={setSelectedElementId}
              onCanvasClick={onCanvasClick}
              result={result}
              showDiagram={showDiagram}
              diagramScale={diagramScale}
            />
            {displayError && (
              <div className="absolute top-2 left-2 right-2 bg-[var(--drawing-accent)] text-white text-xs font-gost p-2 flex items-start gap-2">
                <Icon name="AlertCircle" size={14} className="mt-0.5 shrink-0" />
                <span className="flex-1">{displayError}</span>
                <button onClick={clearError} className="shrink-0">
                  <Icon name="X" size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Правая колонка: свойства + результаты */}
          <aside className="space-y-3 text-[12px]">
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
              deleteSelected={deleteSelected}
            />

            <EditorResultsPanel
              result={result}
              model={model}
              showDiagram={showDiagram}
              setShowDiagram={setShowDiagram}
              diagramScale={diagramScale}
              setDiagramScale={setDiagramScale}
            />
          </aside>
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
    </>
  );
};

export default CaeEditor;