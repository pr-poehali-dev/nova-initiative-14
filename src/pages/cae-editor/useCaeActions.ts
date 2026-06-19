/**
 * Хук-обёртка над чистыми операциями модели CAE.
 * Подписывает функции из ./actions/* к актуальному model + selection state
 * и проксирует апдейты в updateModel (с записью в историю).
 *
 * Чистая логика вынесена в:
 *   - ./actions/nodeActions    — создание/удаление/дубликаты/перемещение узлов
 *   - ./actions/bcActions      — граничные условия (опоры) и DOF
 *   - ./actions/loadActions    — узловые/распределённые/пролётные нагрузки
 *   - ./actions/elementActions — материал/сечение/шарниры стержня
 *
 * Хук не содержит бизнес-логики — только связывает state и pure-функции.
 */
import {
  type FrameModel,
  type Material,
  type Section,
  type BoundaryCondition,
  type DofName,
  type NodeConnectionType,
} from "@/lib/cae-model";
import {
  addNodeAt,
  addNodeOnElement,
  findElementNearPoint,
  deleteSelection,
  duplicateSelection,
  moveNode as moveNodePure,
  setNodeCoord as setNodeCoordPure,
  addNodeAtCoords as addNodeAtCoordsPure,
  connectNodes as connectNodesPure,
  setNodeConnection as setNodeConnectionPure,
} from "./actions/nodeActions";
import {
  setBC,
  removeBC as removeBCPure,
  toggleCustomDof as toggleCustomDofPure,
} from "./actions/bcActions";
import {
  setNodalForce,
  setNodalForceVec as setNodalForceVecPure,
  removeNodalLoad,
  setNodalMoment as setNodalMomentPure,
  setNodalMomentVec as setNodalMomentVecPure,
  setDistributedLoad as setDistributedLoadPure,
  addInSpanPoint as addInSpanPointPure,
  updateInSpanPoint as updateInSpanPointPure,
  removeLoadById as removeLoadByIdPure,
} from "./actions/loadActions";
import {
  pickMaterialForElement as pickMaterialPure,
  pickSectionForElement as pickSectionPure,
  setElementHinge as setElementHingePure,
} from "./actions/elementActions";

export interface UseCaeActionsOptions {
  /**
   * Лимит узлов в модели (альфа-тест: 10).
   * При попытке создать узел сверх лимита создание блокируется и вызывается
   * onNodeLimitReached. Если не указан — лимит не применяется.
   */
  nodeLimit?: number;
  /** Колбэк, вызываемый при достижении лимита узлов (для показа модалки). */
  onNodeLimitReached?: () => void;
  /**
   * Текущий шаг сетки (м) — используется как допуск «попадания» клика на
   * существующий стержень при добавлении узла. Если клик ближе половины
   * шага к стержню, узел врезается в него с разбиением (тикет №36).
   */
  gridStep?: number;
}

export function useCaeActions(
  model: FrameModel,
  updateModel: (next: FrameModel) => void,
  selectedNodeIds: string[],
  selectedElementIds: string[],
  setSelectedNodeIds: (ids: string[]) => void,
  setSelectedElementIds: (ids: string[]) => void,
  options: UseCaeActionsOptions = {},
) {
  const { nodeLimit, onNodeLimitReached, gridStep } = options;
  // Совместимость с одиночным выбором (правая панель показывает свойства одного объекта)
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

  const onCanvasClick = (worldX: number, worldY: number) => {
    // Лимит узлов (альфа-тест): блокируем создание и зовём модалку.
    if (nodeLimit !== undefined && model.nodes.length >= nodeLimit) {
      onNodeLimitReached?.();
      return;
    }
    // Тикет №36: если клик пришёлся на существующий стержень — врезаем узел
    // в него с реальным разбиением на два соединённых элемента. Иначе —
    // создаём обычный свободный узел.
    const tol = (gridStep ?? 0.5) * 0.5;
    const hit = findElementNearPoint(model, worldX, worldY, tol);
    if (hit) {
      const r = addNodeOnElement(model, hit.element, hit.x, hit.y, hit.t);
      updateModel(r.model);
      // Не оставляем только что поставленный узел выделенным — иначе он висит
      // подсвеченным и мешает ставить следующие.
      setSelectedNodeIds([]);
      return;
    }
    const r = addNodeAt(model, worldX, worldY);
    updateModel(r.model);
    setSelectedNodeIds([]);
  };

  const deleteSelected = () => {
    const r = deleteSelection(model, selectedNodeIds, selectedElementIds);
    updateModel(r.model);
    if (r.nodeIds) setSelectedNodeIds(r.nodeIds);
    if (r.elementIds) setSelectedElementIds(r.elementIds);
  };

  const duplicateSelected = (offsetX = 0.5, offsetY = -0.5) => {
    // Считаем сколько новых узлов появится при дублировании — если выходим
    // за лимит, ничего не делаем и показываем модалку.
    if (nodeLimit !== undefined && selectedNodeIds.length > 0) {
      if (model.nodes.length + selectedNodeIds.length > nodeLimit) {
        onNodeLimitReached?.();
        return;
      }
    }
    const r = duplicateSelection(model, selectedNodeIds, selectedElementIds, offsetX, offsetY);
    updateModel(r.model);
    if (r.nodeIds) setSelectedNodeIds(r.nodeIds);
    if (r.elementIds) setSelectedElementIds(r.elementIds);
  };

  const moveNode = (nodeId: string, x: number, y: number) => {
    updateModel(moveNodePure(model, nodeId, x, y));
  };

  /** Точная установка одной координаты выбранного узла (0=x,1=y,2=z). */
  const setNodeCoord = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedNodeId) return;
    updateModel(setNodeCoordPure(model, selectedNodeId, axis, value));
  };

  /** Добавить узел по точным координатам (для 3D-панели, тикет #51). */
  const addNodeAtCoords = (x: number, y: number, z: number) => {
    if (nodeLimit !== undefined && model.nodes.length >= nodeLimit) {
      onNodeLimitReached?.();
      return;
    }
    const r = addNodeAtCoordsPure(model, x, y, z);
    updateModel(r.model);
    if (r.nodeIds) setSelectedNodeIds(r.nodeIds);
  };

  /** Соединить два выбранных узла стержнем (для 3D-панели, тикет #51). */
  const connectSelectedNodes = () => {
    const r = connectNodesPure(model, selectedNodeIds);
    if (r.model === model) return;
    updateModel(r.model);
    if (r.elementIds) {
      setSelectedElementIds(r.elementIds);
      setSelectedNodeIds([]);
    }
  };

  /** Соединить два узла стержнем по явным id (клик в 3D-сцене, режим «Балка»). */
  const connectTwoNodes = (a: string, b: string) => {
    const r = connectNodesPure(model, [a, b]);
    if (r.model === model) return;
    updateModel(r.model);
    if (r.elementIds) {
      setSelectedElementIds(r.elementIds);
      setSelectedNodeIds([]);
    }
  };

  const setNodeConnection = (connection: NodeConnectionType) => {
    if (!selectedNodeId) return;
    updateModel(setNodeConnectionPure(model, selectedNodeId, connection));
  };

  const selectAll = () => {
    setSelectedNodeIds(model.nodes.map((n) => n.id));
    setSelectedElementIds(model.elements.map((e) => e.id));
  };

  const clearSelection = () => {
    setSelectedNodeIds([]);
    setSelectedElementIds([]);
  };

  const addBC = (type: BoundaryCondition["type"]) => {
    if (!selectedNodeId) return;
    updateModel(setBC(model, selectedNodeId, type));
  };

  const removeBC = () => {
    if (!selectedNodeId) return;
    updateModel(removeBCPure(model, selectedNodeId));
  };

  const addNodalLoad = (fx: number, fy: number) => {
    if (!selectedNodeId) return;
    updateModel(setNodalForce(model, selectedNodeId, fx, fy));
  };

  const removeLoadOnNode = () => {
    if (!selectedNodeId) return;
    updateModel(removeNodalLoad(model, selectedNodeId));
  };

  const setNodalMoment = (mz: number) => {
    if (!selectedNodeId) return;
    updateModel(setNodalMomentPure(model, selectedNodeId, mz));
  };

  /** Установить одну компоненту узловой силы (0=Fx,1=Fy,2=Fz) — для 3D. */
  const setNodalForceComponent = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedNodeId) return;
    const cur = model.loads.find(
      (l) => l.type === "nodal_force" && l.node_id === selectedNodeId,
    );
    const f: [number, number, number] = [
      cur?.force?.[0] ?? 0,
      cur?.force?.[1] ?? 0,
      cur?.force?.[2] ?? 0,
    ];
    f[axis] = value;
    updateModel(setNodalForceVecPure(model, selectedNodeId, f));
  };

  /** Установить одну компоненту узлового момента (0=Mx,1=My,2=Mz) — для 3D. */
  const setNodalMomentComponent = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedNodeId) return;
    const cur = model.loads.find(
      (l) => l.type === "nodal_force" && l.node_id === selectedNodeId,
    );
    const m: [number, number, number] = [
      cur?.moment?.[0] ?? 0,
      cur?.moment?.[1] ?? 0,
      cur?.moment?.[2] ?? 0,
    ];
    m[axis] = value;
    updateModel(setNodalMomentVecPure(model, selectedNodeId, m));
  };

  const toggleCustomDof = (dof: DofName) => {
    if (!selectedNodeId) return;
    updateModel(toggleCustomDofPure(model, selectedNodeId, dof));
  };

  const pickMaterialForElement = (mat: Material) => {
    if (!selectedElementId) return;
    updateModel(pickMaterialPure(model, selectedElementId, mat));
  };

  const pickSectionForElement = (sec: Section) => {
    if (!selectedElementId) return;
    updateModel(pickSectionPure(model, selectedElementId, sec));
  };

  const setDistributedLoad = (qy: number, qz?: number) => {
    if (!selectedElementId) return;
    updateModel(setDistributedLoadPure(model, selectedElementId, qy, qz));
  };

  const addInSpanPoint = (pos: number, py: number) => {
    if (!selectedElementId) return;
    updateModel(addInSpanPointPure(model, selectedElementId, pos, py));
  };

  const updateInSpanPoint = (loadId: string, pos: number, py: number) => {
    updateModel(updateInSpanPointPure(model, loadId, pos, py));
  };

  const removeLoadById = (loadId: string) => {
    updateModel(removeLoadByIdPure(model, loadId));
  };

  const setElementHinge = (end: "start" | "end", on: boolean) => {
    if (!selectedElementId) return;
    updateModel(setElementHingePure(model, selectedElementId, end, on));
  };

  return {
    onCanvasClick,
    deleteSelected,
    duplicateSelected,
    moveNode,
    setNodeCoord,
    addNodeAtCoords,
    connectSelectedNodes,
    connectTwoNodes,
    selectAll,
    clearSelection,
    setNodeConnection,
    addBC,
    removeBC,
    addNodalLoad,
    removeLoadOnNode,
    setNodalMoment,
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
  };
}