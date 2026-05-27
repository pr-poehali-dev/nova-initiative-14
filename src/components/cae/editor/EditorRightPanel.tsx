/**
 * Правая панель редактора CAE — роутер по типу выбранного объекта:
 *  - выбран узел      → NodePropertiesPanel
 *  - выбран элемент   → ElementPropertiesPanel
 *  - ничего не выбрано → подсказка
 *
 * Подкомпоненты:
 *   - panels/right/NumericInput            (numeric input с commit-on-blur)
 *   - panels/right/InSpanForm              (форма добавления силы в пролёте)
 *   - panels/right/NodePropertiesPanel     (свойства узла)
 *   - panels/right/ElementPropertiesPanel  (свойства стержня)
 */
import type {
  FrameModel,
  ModelNode,
  BoundaryCondition,
  ModelLoad,
  DofName,
} from "@/lib/cae-model";
import NodePropertiesPanel from "./panels/right/NodePropertiesPanel";
import ElementPropertiesPanel from "./panels/right/ElementPropertiesPanel";

interface Props {
  model: FrameModel;
  selectedNode: ModelNode | null | undefined;
  selectedElementId: string | null;
  nodeBC: BoundaryCondition | undefined;
  nodeLoad: ModelLoad | undefined;
  bcCustomOpen: boolean;
  setBcCustomOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  addBC: (type: BoundaryCondition["type"]) => void;
  removeBC: () => void;
  toggleCustomDof: (d: DofName) => void;
  addNodalLoad: (fx: number, fy: number) => void;
  setNodalMoment: (mz: number) => void;
  removeLoadOnNode: () => void;
  setMatPickerOpen: (v: boolean) => void;
  setSecPickerOpen: (v: boolean) => void;
  setDistributedLoad: (qy: number) => void;
  addInSpanPoint: (pos: number, py: number) => void;
  removeLoadById: (loadId: string) => void;
  /** Переключение шарнира на конце элемента (Mz=0). */
  setElementHinge: (end: "start" | "end", on: boolean) => void;
  deleteSelected: () => void;
}

const EditorRightPanel = ({
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
  removeLoadOnNode,
  setMatPickerOpen,
  setSecPickerOpen,
  setDistributedLoad,
  addInSpanPoint,
  removeLoadById,
  setElementHinge,
  deleteSelected,
}: Props) => {
  if (selectedNode) {
    return (
      <NodePropertiesPanel
        selectedNode={selectedNode}
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
        deleteSelected={deleteSelected}
      />
    );
  }

  if (selectedElementId) {
    return (
      <ElementPropertiesPanel
        model={model}
        selectedElementId={selectedElementId}
        setMatPickerOpen={setMatPickerOpen}
        setSecPickerOpen={setSecPickerOpen}
        setElementHinge={setElementHinge}
        setDistributedLoad={setDistributedLoad}
        addInSpanPoint={addInSpanPoint}
        removeLoadById={removeLoadById}
        deleteSelected={deleteSelected}
      />
    );
  }

  // Если ничего не выбрано — не показываем пустую заглушку.
  // Подсказка теперь живёт в иконке вопроса на канвасе (CanvasFloatingControls).
  return null;
};

export default EditorRightPanel;