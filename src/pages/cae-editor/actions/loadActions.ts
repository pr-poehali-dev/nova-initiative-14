/**
 * Чистые операции над нагрузками модели CAE:
 *  - точечные узловые силы (nodal_force) и узловые моменты
 *  - распределённая равномерная нагрузка на стержне (distributed_uniform)
 *  - сосредоточенная сила в пролёте (in_span_point)
 */
import { genId, type FrameModel, type ModelLoad } from "@/lib/cae-model";

/** Установить или обновить узловую силу (Fx, Fy). Создаёт нагрузку, если её ещё нет. */
export function setNodalForce(
  model: FrameModel,
  nodeId: string,
  fx: number,
  fy: number,
): FrameModel {
  const existing = model.loads.find(
    (l) => l.type === "nodal_force" && l.node_id === nodeId,
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
      node_id: nodeId,
      force: [fx, fy, 0],
      moment: [0, 0, 0],
    };
    loads = [...loads, ld];
  }
  return { ...model, loads };
}

/** Удалить точечную силу с указанного узла. */
export function removeNodalLoad(model: FrameModel, nodeId: string): FrameModel {
  return {
    ...model,
    loads: model.loads.filter((l) => !(l.type === "nodal_force" && l.node_id === nodeId)),
  };
}

/** Установить узловой момент Mz (создаёт нагрузку с force=0,0,0 если её нет). */
export function setNodalMoment(model: FrameModel, nodeId: string, mz: number): FrameModel {
  const existing = model.loads.find(
    (l) => l.type === "nodal_force" && l.node_id === nodeId,
  );
  let loads = model.loads;
  if (existing) {
    loads = loads.map((l) =>
      l === existing ? { ...l, moment: [0, 0, mz] as [number, number, number] } : l,
    );
  } else {
    loads = [
      ...loads,
      {
        id: genId("L", model.loads),
        type: "nodal_force",
        node_id: nodeId,
        force: [0, 0, 0],
        moment: [0, 0, mz],
      },
    ];
  }
  return { ...model, loads };
}

/**
 * Установить распределённую равномерную нагрузку qy на элемент.
 * qy=0 — удаляет существующую нагрузку.
 */
export function setDistributedLoad(
  model: FrameModel,
  elementId: string,
  qy: number,
): FrameModel {
  const existing = model.loads.find(
    (l) => l.type === "distributed_uniform" && l.element_id === elementId,
  );
  let loads = model.loads;
  if (qy === 0) {
    loads = loads.filter((l) => l !== existing);
  } else if (existing) {
    loads = loads.map((l) =>
      l === existing
        ? { ...l, load_local_per_length: [0, qy, 0] as [number, number, number] }
        : l,
    );
  } else {
    loads = [
      ...loads,
      {
        id: genId("L", model.loads),
        type: "distributed_uniform",
        element_id: elementId,
        load_local_per_length: [0, qy, 0],
      },
    ];
  }
  return { ...model, loads };
}

/** Добавить сосредоточенную силу py в пролёте на относительной позиции pos. */
export function addInSpanPoint(
  model: FrameModel,
  elementId: string,
  pos: number,
  py: number,
): FrameModel {
  const loads: ModelLoad[] = [
    ...model.loads,
    {
      id: genId("L", model.loads),
      type: "in_span_point",
      element_id: elementId,
      force: [0, py, 0],
      position_ratio: pos,
    },
  ];
  return { ...model, loads };
}

/** Удалить нагрузку по id. */
export function removeLoadById(model: FrameModel, loadId: string): FrameModel {
  return { ...model, loads: model.loads.filter((l) => l.id !== loadId) };
}
