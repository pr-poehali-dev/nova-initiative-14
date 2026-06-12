/**
 * Чистые операции над нагрузками модели CAE:
 *  - точечные узловые силы (nodal_force) и узловые моменты
 *  - распределённая равномерная нагрузка на стержне (distributed_uniform)
 *  - сосредоточенная сила в пролёте (in_span_point)
 */
import { genId, type FrameModel, type ModelLoad } from "@/lib/cae-model";

/**
 * Приводит число к конечному значению: NaN/Infinity/невалидный ввод → 0.
 * Защита от попадания NaN в модель (иначе ломается отрисовка и решатель).
 */
function num(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/** Ограничивает позицию точечной силы диапазоном [0, 1]; NaN → 0.5 (центр). */
function clampPos(v: number): number {
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}

/** Установить или обновить узловую силу (Fx, Fy). Создаёт нагрузку, если её ещё нет. */
export function setNodalForce(
  model: FrameModel,
  nodeId: string,
  fx: number,
  fy: number,
): FrameModel {
  // 2D-обёртка: сохраняем Fz существующей нагрузки (если был).
  const existing = model.loads.find(
    (l) => l.type === "nodal_force" && l.node_id === nodeId,
  );
  const fz = existing?.force?.[2] ?? 0;
  return setNodalForceVec(model, nodeId, [fx, fy, fz]);
}

/**
 * Установить полный вектор узловой силы [Fx, Fy, Fz] (3D).
 * Сохраняет уже заданный момент нагрузки. Создаёт нагрузку, если её нет.
 */
export function setNodalForceVec(
  model: FrameModel,
  nodeId: string,
  force: [number, number, number],
): FrameModel {
  const f: [number, number, number] = [num(force[0]), num(force[1]), num(force[2])];
  const existing = model.loads.find(
    (l) => l.type === "nodal_force" && l.node_id === nodeId,
  );
  let loads = model.loads;
  if (existing) {
    loads = loads.map((l) => (l === existing ? { ...l, force: f } : l));
  } else {
    const ld: ModelLoad = {
      id: genId("L", model.loads),
      type: "nodal_force",
      node_id: nodeId,
      force: f,
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
  // 2D-обёртка: сохраняем Mx, My существующей нагрузки.
  const existing = model.loads.find(
    (l) => l.type === "nodal_force" && l.node_id === nodeId,
  );
  const mx = existing?.moment?.[0] ?? 0;
  const my = existing?.moment?.[1] ?? 0;
  return setNodalMomentVec(model, nodeId, [mx, my, mz]);
}

/**
 * Установить полный вектор узлового момента [Mx, My, Mz] (3D).
 * Сохраняет уже заданную силу нагрузки. Создаёт нагрузку, если её нет.
 */
export function setNodalMomentVec(
  model: FrameModel,
  nodeId: string,
  moment: [number, number, number],
): FrameModel {
  const m: [number, number, number] = [num(moment[0]), num(moment[1]), num(moment[2])];
  const existing = model.loads.find(
    (l) => l.type === "nodal_force" && l.node_id === nodeId,
  );
  let loads = model.loads;
  if (existing) {
    loads = loads.map((l) => (l === existing ? { ...l, moment: m } : l));
  } else {
    loads = [
      ...loads,
      {
        id: genId("L", model.loads),
        type: "nodal_force",
        node_id: nodeId,
        force: [0, 0, 0],
        moment: m,
      },
    ];
  }
  return { ...model, loads };
}

/**
 * Установить распределённую равномерную нагрузку на элемент по локальным осям.
 * qy — по локальной оси y, qz — по локальной оси z (только 3D).
 * Если qz не передан — сохраняется текущее значение по z.
 * Если обе компоненты нулевые — нагрузка удаляется.
 */
export function setDistributedLoad(
  model: FrameModel,
  elementId: string,
  qy: number,
  qz?: number,
): FrameModel {
  qy = num(qy);
  const existing = model.loads.find(
    (l) => l.type === "distributed_uniform" && l.element_id === elementId,
  );
  // qz по умолчанию берём из существующей нагрузки (чтобы правка qy не сбросила qz).
  const zVal = num(qz ?? existing?.load_local_per_length?.[2] ?? 0);
  const vec: [number, number, number] = [0, qy, zVal];
  let loads = model.loads;
  if (qy === 0 && zVal === 0) {
    loads = loads.filter((l) => l !== existing);
  } else if (existing) {
    loads = loads.map((l) =>
      l === existing ? { ...l, load_local_per_length: vec } : l,
    );
  } else {
    loads = [
      ...loads,
      {
        id: genId("L", model.loads),
        type: "distributed_uniform",
        element_id: elementId,
        load_local_per_length: vec,
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
      force: [0, num(py), 0],
      position_ratio: clampPos(pos),
    },
  ];
  return { ...model, loads };
}

/**
 * Изменить уже добавленную точечную силу в пролёте по её id:
 * новую позицию pos (0…1) и величину py. Безопасно для NaN.
 */
export function updateInSpanPoint(
  model: FrameModel,
  loadId: string,
  pos: number,
  py: number,
): FrameModel {
  return {
    ...model,
    loads: model.loads.map((l) =>
      l.id === loadId && l.type === "in_span_point"
        ? { ...l, force: [0, num(py), 0], position_ratio: clampPos(pos) }
        : l,
    ),
  };
}

/** Удалить нагрузку по id. */
export function removeLoadById(model: FrameModel, loadId: string): FrameModel {
  return { ...model, loads: model.loads.filter((l) => l.id !== loadId) };
}