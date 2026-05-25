import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  type SolverResponse,
} from "@/lib/cae-model";

const formatNumber = (v: number, digits = 4) => {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toExponential(2);
  if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2);
  return v.toFixed(digits);
};

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
    : null;
  const nodeLoad = selectedNode
    ? model.loads.find((l) => l.type === "nodal_force" && l.node_id === selectedNode.id)
    : null;

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
        {/* Верхняя панель */}
        <div className="bg-[var(--drawing-bg)] border-b-[2.5px] border-[var(--drawing-line)]">
          <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-wrap items-center gap-3">
            <Link
              to="/cae/projects"
              className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
            >
              ← Проекты
            </Link>
            <div className="extension-line-h h-[2px] w-6 mx-1" />
            <div>
              <p className="font-gost-upright text-sm font-bold leading-tight">
                {projectName || "Без названия"}
              </p>
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                {model.meta.dim === "2d" ? "Плоская рама 2D" : "Пространственная 3D"}
                {dirty && " · несохранено"}
                {lastSaved && !dirty && ` · сохранено в ${lastSaved}`}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                onClick={onSave}
                disabled={saving || !dirty}
                className="btn-drawing text-[11px] disabled:opacity-50"
              >
                {saving ? "Сохраняем…" : "Сохранить"}
              </button>
              <button
                onClick={onSolve}
                disabled={solving}
                className="btn-drawing btn-drawing-accent text-[11px] disabled:opacity-50"
              >
                <Icon name="Play" size={12} className="mr-1" />
                {solving ? "Считаем…" : "Посчитать"}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-3 py-3 grid gap-3 lg:grid-cols-[260px_1fr_320px]">
          {/* Левая панель: инструменты */}
          <aside className="space-y-3">
            <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                Инструменты
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                  { v: "draw-node", label: "Узел", icon: "Circle" },
                  { v: "draw-element", label: "Балка", icon: "Minus" },
                  { v: "select", label: "Выбор", icon: "MousePointer" },
                ].map((t) => (
                  <button
                    key={t.v}
                    onClick={() => setMode(t.v as EditorMode)}
                    className={`border py-2 px-2 font-gost uppercase tracking-wider flex items-center gap-1.5 transition ${
                      mode === t.v
                        ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                        : "border-[var(--drawing-line)] hover:border-[var(--drawing-accent)]"
                    }`}
                  >
                    <Icon name={t.icon} size={12} />
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-2 leading-relaxed">
                {mode === "draw-node" && "Клик по холсту — добавить узел"}
                {mode === "draw-element" && "Клик на 2 узла подряд — провести балку"}
                {mode === "select" && "Клик на узел или балку — выбрать"}
              </p>
            </div>

            <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                Сетка
              </p>
              <div className="flex gap-1.5">
                {[0.1, 0.25, 0.5, 1].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGridStep(g)}
                    className={`flex-1 border py-1 text-[11px] font-mono ${
                      gridStep === g
                        ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)] border-[var(--drawing-line)]"
                        : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                    }`}
                  >
                    {g} м
                  </button>
                ))}
              </div>
            </div>

            <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3 text-[11px] space-y-1.5">
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                Подсказки
              </p>
              <p>• <b>Колесо</b> — зум</p>
              <p>• <b>Shift+ЛКМ</b> — пан</p>
              <p>• <b>Delete</b> — удалить выбранное</p>
            </div>
          </aside>

          {/* Канва */}
          <div className="border-2 border-[var(--drawing-line)] relative" style={{ height: "70vh", minHeight: 480 }}
               tabIndex={0}
               onKeyDown={(e) => {
                 if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
               }}>
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

          {/* Правая панель: свойства и результаты */}
          <aside className="space-y-3 text-[12px]">
            {/* Свойства выбранного */}
            {selectedNode ? (
              <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
                <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                  Узел {selectedNode.id}
                </p>
                <p className="font-mono text-[11px] mb-3">
                  x = {selectedNode.coords[0].toFixed(2)} м<br />
                  y = {selectedNode.coords[1].toFixed(2)} м
                </p>

                <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
                  Опора
                </p>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {[
                    { v: "fixed", label: "Защ.", icon: "Anchor" },
                    { v: "pinned", label: "Шарн.", icon: "Triangle" },
                    { v: "roller_x", label: "Кат.", icon: "Circle" },
                  ].map((b) => (
                    <button
                      key={b.v}
                      onClick={() => addBC(b.v as BoundaryCondition["type"])}
                      className={`border py-1.5 px-1 text-[10px] font-gost uppercase ${
                        nodeBC?.type === b.v
                          ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)] border-[var(--drawing-line)]"
                          : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                {nodeBC && (
                  <button onClick={removeBC} className="text-[10px] font-gost uppercase text-[var(--drawing-accent)] hover:underline mb-3">
                    Убрать опору
                  </button>
                )}

                <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5 mt-2">
                  Узловая нагрузка
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <label className="text-[10px] font-gost">
                    Fx, Н
                    <input
                      type="number"
                      step={100}
                      value={nodeLoad?.force?.[0] ?? 0}
                      onChange={(e) => addNodalLoad(parseFloat(e.target.value) || 0, nodeLoad?.force?.[1] ?? 0)}
                      className="drawing-input mt-0.5 font-mono text-[11px]"
                    />
                  </label>
                  <label className="text-[10px] font-gost">
                    Fy, Н
                    <input
                      type="number"
                      step={100}
                      value={nodeLoad?.force?.[1] ?? 0}
                      onChange={(e) => addNodalLoad(nodeLoad?.force?.[0] ?? 0, parseFloat(e.target.value) || 0)}
                      className="drawing-input mt-0.5 font-mono text-[11px]"
                    />
                  </label>
                </div>
                {nodeLoad && (
                  <button onClick={removeLoadOnNode} className="text-[10px] font-gost uppercase text-[var(--drawing-accent)] hover:underline">
                    Убрать нагрузку
                  </button>
                )}

                <div className="extension-line-h w-full my-3" />
                <button
                  onClick={deleteSelected}
                  className="w-full border border-[var(--drawing-accent)] text-[var(--drawing-accent)] py-1.5 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-accent)] hover:text-white"
                >
                  Удалить узел
                </button>
              </div>
            ) : selectedElementId ? (
              <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
                <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                  Элемент {selectedElementId}
                </p>
                <p className="text-[11px] mb-3 text-[var(--drawing-line-thin)]">
                  Материал и сечение — общие для всех элементов в текущей версии редактора.
                </p>
                <button
                  onClick={deleteSelected}
                  className="w-full border border-[var(--drawing-accent)] text-[var(--drawing-accent)] py-1.5 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-accent)] hover:text-white"
                >
                  Удалить элемент
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[var(--drawing-line-thin)] bg-[var(--drawing-bg)] p-3 text-[var(--drawing-line-thin)]">
                <p className="font-gost text-[10px] uppercase tracking-[0.2em] mb-1">Подсказка</p>
                <p className="text-[11px] leading-relaxed">
                  Выберите узел или элемент, чтобы настроить опору, нагрузку или удалить.
                </p>
              </div>
            )}

            {/* Результаты */}
            <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                Результат
              </p>
              {!result ? (
                <p className="text-[11px] text-[var(--drawing-line-thin)]">
                  Нажмите «Посчитать» после построения схемы.
                </p>
              ) : (
                <>
                  <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono mb-3">
                    <dt className="text-[var(--drawing-line-thin)]">Узлов:</dt>
                    <dd>{result.summary.n_nodes}</dd>
                    <dt className="text-[var(--drawing-line-thin)]">Элементов:</dt>
                    <dd>{result.summary.n_elements}</dd>
                    <dt className="text-[var(--drawing-line-thin)]">Макс. прогиб:</dt>
                    <dd>{formatNumber(result.summary.max_displacement * 1000, 3)} мм</dd>
                    <dt className="text-[var(--drawing-line-thin)]">Макс σ Мизес:</dt>
                    <dd>{formatNumber(result.summary.max_sigma_vm / 1e6, 1)} МПа</dd>
                    <dt className="text-[var(--drawing-line-thin)]">Запас:</dt>
                    <dd>{result.summary.min_safety_factor && result.summary.min_safety_factor < 1e5 ? result.summary.min_safety_factor.toFixed(2) : "∞"}</dd>
                    <dt className="text-[var(--drawing-line-thin)]">Время:</dt>
                    <dd>{result.duration_ms} мс</dd>
                  </dl>

                  <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
                    Эпюра
                  </p>
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {[
                      { v: "none", label: "Скр." },
                      { v: "deformed", label: "Дефор." },
                      { v: "N", label: "N" },
                      { v: "Qy", label: "Q" },
                      { v: "Mz", label: "M" },
                      { v: "sigma", label: "σ" },
                    ].map((d) => (
                      <button
                        key={d.v}
                        onClick={() => setShowDiagram(d.v as DiagramKind)}
                        className={`border py-1 text-[10px] font-gost uppercase ${
                          showDiagram === d.v
                            ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                            : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <label className="text-[10px] font-gost text-[var(--drawing-line-thin)]">
                    Масштаб эпюры
                    <input
                      type="range"
                      min={0.1}
                      max={3}
                      step={0.1}
                      value={diagramScale}
                      onChange={(e) => setDiagramScale(parseFloat(e.target.value))}
                      className="w-full mt-1"
                    />
                  </label>

                  {result.warnings.length > 0 && (
                    <div className="mt-3 p-2 border border-[var(--drawing-accent)] text-[10px] text-[var(--drawing-accent)]">
                      {result.warnings.map((w, i) => (
                        <p key={i}>⚠ {w}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default CaeEditor;
