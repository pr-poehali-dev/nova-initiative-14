import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import FrameCanvas, {
  type EditorMode,
  type DiagramKind,
} from "@/components/cae/FrameCanvas";
import {
  emptyModel,
  getProjectModel,
  saveProjectModel,
  runSolver,
  genId,
  constrainedFromType,
  type FrameModel,
  type ModelNode,
  type BoundaryCondition,
  type ModelLoad,
  type Material,
  type Section,
  type DofName,
  type SolverResponse,
} from "@/lib/cae-model";
import { MaterialPicker, SectionPicker } from "@/components/cae/CatalogPanel";
import EditorTopBar from "@/components/cae/editor/EditorTopBar";
import EditorLeftPanel from "@/components/cae/editor/EditorLeftPanel";
import EditorRightPanel from "@/components/cae/editor/EditorRightPanel";
import EditorResultsPanel from "@/components/cae/editor/EditorResultsPanel";

const CaeEditor = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id ? parseInt(id, 10) : 0;
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [model, setModel] = useState<FrameModel>(emptyModel("2d"));
  const [projectName, setProjectName] = useState("");
  const [versionId, setVersionId] = useState<number | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [mode, setMode] = useState<EditorMode>("draw-node");
  const [gridStep, setGridStep] = useState(0.5);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const [result, setResult] = useState<SolverResponse | null>(null);
  const [solverError, setSolverError] = useState<string | null>(null);
  const [solving, setSolving] = useState(false);
  const [showDiagram, setShowDiagram] = useState<DiagramKind>("none");
  const [diagramScale, setDiagramScale] = useState(1);

  // slide-in каталоги
  const [matPickerOpen, setMatPickerOpen] = useState(false);
  const [secPickerOpen, setSecPickerOpen] = useState(false);
  const [bcCustomOpen, setBcCustomOpen] = useState(false);

  // ===== Load =====
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav("/login", { replace: true, state: { from: `/cae/projects/${projectId}` } });
      return;
    }
    if (!projectId) return;
    setLoadingModel(true);
    getProjectModel(projectId)
      .then((r) => {
        if (!r.ok || !r.data) {
          setSolverError(r.message || "Не удалось загрузить проект");
          return;
        }
        setProjectName(r.data.project.name);
        setVersionId(r.data.version_id);
        const m = r.data.model as FrameModel | Record<string, never>;
        if (m && (m as FrameModel).meta) {
          setModel(m as FrameModel);
        } else {
          const dim = r.data.project.project_type === "frame_3d" ? "3d" : "2d";
          setModel(emptyModel(dim as "2d" | "3d"));
        }
      })
      .finally(() => setLoadingModel(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user, authLoading]);

  // ===== Сохранение (по кнопке) =====
  const onSave = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);
    const r = await saveProjectModel(projectId, model, "Manual save");
    setSaving(false);
    if (r.ok && r.data) {
      setVersionId(r.data.version_id);
      setLastSaved(new Date().toLocaleTimeString("ru-RU"));
      setDirty(false);
    } else {
      setSolverError(r.message || "Ошибка сохранения");
    }
  }, [projectId, model]);

  const updateModel = (next: FrameModel) => {
    setModel(next);
    setDirty(true);
  };

  // ===== Действия по клику на канву =====
  const onCanvasClick = (worldX: number, worldY: number) => {
    if (mode === "draw-node") {
      const id = genId("n", model.nodes);
      const n: ModelNode = { id, coords: [worldX, worldY, 0] };
      updateModel({ ...model, nodes: [...model.nodes, n] });
      setSelectedNodeId(id);
    }
  };

  // ===== Удаление =====
  const deleteSelected = () => {
    if (selectedNodeId) {
      const remaining = model.nodes.filter((n) => n.id !== selectedNodeId);
      const elements = model.elements.filter(
        (e) => e.node_start !== selectedNodeId && e.node_end !== selectedNodeId,
      );
      const bcs = model.boundary_conditions.filter((b) => b.node_id !== selectedNodeId);
      const loads = model.loads.filter((l) => l.node_id !== selectedNodeId);
      updateModel({
        ...model,
        nodes: remaining,
        elements,
        boundary_conditions: bcs,
        loads,
      });
      setSelectedNodeId(null);
      return;
    }
    if (selectedElementId) {
      const elements = model.elements.filter((e) => e.id !== selectedElementId);
      const loads = model.loads.filter((l) => l.element_id !== selectedElementId);
      updateModel({ ...model, elements, loads });
      setSelectedElementId(null);
    }
  };

  // ===== КГУ =====
  const addBC = (type: BoundaryCondition["type"]) => {
    if (!selectedNodeId) return;
    const constrained = constrainedFromType(type, model.meta.dim);
    const existing = model.boundary_conditions.find((b) => b.node_id === selectedNodeId);
    let bcs = model.boundary_conditions;
    if (existing) {
      bcs = bcs.map((b) =>
        b.node_id === selectedNodeId ? { ...b, type, constrained_dofs: constrained } : b,
      );
    } else {
      bcs = [
        ...bcs,
        {
          id: genId("bc", model.boundary_conditions),
          node_id: selectedNodeId,
          type,
          constrained_dofs: constrained,
        },
      ];
    }
    updateModel({ ...model, boundary_conditions: bcs });
  };

  const removeBC = () => {
    if (!selectedNodeId) return;
    updateModel({
      ...model,
      boundary_conditions: model.boundary_conditions.filter(
        (b) => b.node_id !== selectedNodeId,
      ),
    });
  };

  // ===== Нагрузка =====
  const addNodalLoad = (fx: number, fy: number) => {
    if (!selectedNodeId) return;
    const existing = model.loads.find(
      (l) => l.type === "nodal_force" && l.node_id === selectedNodeId,
    );
    let loads = model.loads;
    if (existing) {
      loads = loads.map((l) =>
        l === existing ? { ...l, force: [fx, fy, 0] as [number, number, number] } : l,
      );
    } else {
      const ld: ModelLoad = {
        id: genId("L", model.loads),
        type: "nodal_force",
        node_id: selectedNodeId,
        force: [fx, fy, 0],
        moment: [0, 0, 0],
      };
      loads = [...loads, ld];
    }
    updateModel({ ...model, loads });
  };

  const removeLoadOnNode = () => {
    if (!selectedNodeId) return;
    updateModel({
      ...model,
      loads: model.loads.filter(
        (l) => !(l.type === "nodal_force" && l.node_id === selectedNodeId),
      ),
    });
  };

  // ===== Узловой момент =====
  const setNodalMoment = (mz: number) => {
    if (!selectedNodeId) return;
    const existing = model.loads.find(
      (l) => l.type === "nodal_force" && l.node_id === selectedNodeId,
    );
    let loads = model.loads;
    if (existing) {
      loads = loads.map((l) =>
        l === existing
          ? { ...l, moment: [0, 0, mz] as [number, number, number] }
          : l,
      );
    } else {
      loads = [
        ...loads,
        {
          id: genId("L", model.loads),
          type: "nodal_force",
          node_id: selectedNodeId,
          force: [0, 0, 0],
          moment: [0, 0, mz],
        },
      ];
    }
    updateModel({ ...model, loads });
  };

  // ===== КГУ вручную (чекбоксы) =====
  const toggleCustomDof = (dof: DofName) => {
    if (!selectedNodeId) return;
    const existing = model.boundary_conditions.find((b) => b.node_id === selectedNodeId);
    const current = new Set(existing?.constrained_dofs || []);
    if (current.has(dof)) current.delete(dof);
    else current.add(dof);
    const dofs = Array.from(current) as DofName[];

    if (dofs.length === 0) {
      updateModel({
        ...model,
        boundary_conditions: model.boundary_conditions.filter((b) => b.node_id !== selectedNodeId),
      });
      return;
    }

    let bcs = model.boundary_conditions;
    if (existing) {
      bcs = bcs.map((b) =>
        b.node_id === selectedNodeId ? { ...b, type: "custom", constrained_dofs: dofs } : b,
      );
    } else {
      bcs = [
        ...bcs,
        {
          id: genId("bc", model.boundary_conditions),
          node_id: selectedNodeId,
          type: "custom",
          constrained_dofs: dofs,
        },
      ];
    }
    updateModel({ ...model, boundary_conditions: bcs });
  };

  // ===== Материал / сечение для выбранного элемента =====
  const pickMaterialForElement = (mat: Material) => {
    if (!selectedElementId) return;
    // добавляем в model.materials, если ещё нет
    const exists = model.materials.find((m) => m.id === mat.id);
    const materials = exists ? model.materials : [...model.materials, mat];
    const elements = model.elements.map((e) =>
      e.id === selectedElementId ? { ...e, material_id: mat.id } : e,
    );
    updateModel({ ...model, materials, elements });
  };

  const pickSectionForElement = (sec: Section) => {
    if (!selectedElementId) return;
    const exists = model.sections.find((s) => s.id === sec.id);
    const sections = exists ? model.sections : [...model.sections, sec];
    const elements = model.elements.map((e) =>
      e.id === selectedElementId ? { ...e, section_id: sec.id } : e,
    );
    updateModel({ ...model, sections, elements });
  };

  // ===== Распределённая нагрузка на элементе =====
  const setDistributedLoad = (qy: number) => {
    if (!selectedElementId) return;
    const existing = model.loads.find(
      (l) => l.type === "distributed_uniform" && l.element_id === selectedElementId,
    );
    let loads = model.loads;
    if (qy === 0) {
      loads = loads.filter((l) => l !== existing);
    } else if (existing) {
      loads = loads.map((l) =>
        l === existing ? { ...l, load_local_per_length: [0, qy, 0] as [number, number, number] } : l,
      );
    } else {
      loads = [
        ...loads,
        {
          id: genId("L", model.loads),
          type: "distributed_uniform",
          element_id: selectedElementId,
          load_local_per_length: [0, qy, 0],
        },
      ];
    }
    updateModel({ ...model, loads });
  };

  // ===== Точечная сила в пролёте =====
  const addInSpanPoint = (pos: number, py: number) => {
    if (!selectedElementId) return;
    const loads: ModelLoad[] = [
      ...model.loads,
      {
        id: genId("L", model.loads),
        type: "in_span_point",
        element_id: selectedElementId,
        force: [0, py, 0],
        position_ratio: pos,
      },
    ];
    updateModel({ ...model, loads });
  };

  // ===== Запуск решателя =====
  const onSolve = async () => {
    setSolverError(null);
    setSolving(true);
    setResult(null);

    if (model.nodes.length < 2) {
      setSolverError("Минимум 2 узла для расчёта");
      setSolving(false);
      return;
    }
    if (model.elements.length === 0) {
      setSolverError("Нет ни одного элемента");
      setSolving(false);
      return;
    }
    if (model.boundary_conditions.length === 0) {
      setSolverError("Не заданы граничные условия (опоры)");
      setSolving(false);
      return;
    }

    const r = await runSolver(model, projectId, versionId ?? undefined);
    setSolving(false);
    if (r.ok && r.data && r.data.status === "ok") {
      setResult(r.data);
      setShowDiagram("Mz");
    } else {
      setSolverError(r.message || r.error || "Ошибка решателя");
    }
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
            {solverError && (
              <div className="absolute top-2 left-2 right-2 bg-[var(--drawing-accent)] text-white text-xs font-gost p-2 flex items-start gap-2">
                <Icon name="AlertCircle" size={14} className="mt-0.5 shrink-0" />
                <span className="flex-1">{solverError}</span>
                <button onClick={() => setSolverError(null)} className="shrink-0">
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
              deleteSelected={deleteSelected}
            />

            <EditorResultsPanel
              result={result}
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
