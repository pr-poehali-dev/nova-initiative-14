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
} from "@/lib/cae-model";
import {
  addNodeAt,
  deleteSelection,
  duplicateSelection,
  moveNode as moveNodePure,
} from "./actions/nodeActions";
import {
  setBC,
  removeBC as removeBCPure,
  toggleCustomDof as toggleCustomDofPure,
} from "./actions/bcActions";
import {
  setNodalForce,
  removeNodalLoad,
  setNodalMoment as setNodalMomentPure,
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
  const { nodeLimit, onNodeLimitReached } = options;
  // Совместимость с одиночным выбором (правая панель показывает свойства одного объекта)
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

  const onCanvasClick = (worldX: number, worldY: number) => {
    // Лимит узлов (альфа-тест): блокируем создание и зовём модалку.
    if (nodeLimit !== undefined && model.nodes.length >= nodeLimit) {
      onNodeLimitReached?.();
      return;
    }
    const r = addNodeAt(model, worldX, worldY);
    updateModel(r.model);
    if (r.nodeIds) setSelectedNodeIds(r.nodeIds);
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

  const setDistributedLoad = (qy: number) => {
    if (!selectedElementId) return;
    updateModel(setDistributedLoadPure(model, selectedElementId, qy));
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
  };
}