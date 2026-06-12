import Icon from "@/components/ui/icon";
import type { FrameModel } from "@/lib/cae-model";
import InSpanForm from "./InSpanForm";
import DistributedForm from "./DistributedForm";
import LoadListItem from "./LoadListItem";

/**
 * Правая панель свойств ЭЛЕМЕНТА (стержня):
 *  - выбор материала и сечения (кнопки открывают пикеры)
 *  - шарниры на концах (Mz=0) — для ферм и шатунов
 *  - распределённая равномерная нагрузка q
 *  - точечная сила в пролёте + список существующих нагрузок
 *  - удаление элемента
 */
export default function ElementPropertiesPanel({
  model,
  selectedElementId,
  dim = "2d",
  setMatPickerOpen,
  setSecPickerOpen,
  setElementHinge,
  setDistributedLoad,
  addInSpanPoint,
  updateInSpanPoint,
  removeLoadById,
  deleteSelected,
}: {
  model: FrameModel;
  selectedElementId: string;
  dim?: "2d" | "3d";
  setMatPickerOpen: (v: boolean) => void;
  setSecPickerOpen: (v: boolean) => void;
  setElementHinge: (end: "start" | "end", on: boolean) => void;
  setDistributedLoad: (qy: number, qz?: number) => void;
  addInSpanPoint: (pos: number, py: number) => void;
  updateInSpanPoint: (loadId: string, pos: number, py: number) => void;
  removeLoadById: (loadId: string) => void;
  deleteSelected: () => void;
}) {
  const is3d = dim === "3d";
  const el = model.elements.find((x) => x.id === selectedElementId);
  if (!el) return null;
  const mat = model.materials.find((m) => m.id === el.material_id);
  const sec = model.sections.find((s) => s.id === el.section_id);
  const matName = mat?.name || el.material_id;
  const secName = sec?.name || el.section_id;
  const distLoad = model.loads.find(
    (l) => l.type === "distributed_uniform" && l.element_id === selectedElementId,
  );
  const elementLoads = model.loads.filter((l) => l.element_id === selectedElementId);
  const a = model.nodes.find((n) => n.id === el.node_start);
  const b = model.nodes.find((n) => n.id === el.node_end);
  const len =
    a && b
      ? Math.hypot(
          b.coords[0] - a.coords[0],
          b.coords[1] - a.coords[1],
          (b.coords[2] ?? 0) - (a.coords[2] ?? 0),
        )
      : 0;

  return (
    <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
        Элемент {selectedElementId}
      </p>
      <p className="font-mono text-[11px] mb-3 text-[var(--drawing-line-thin)]">
        {el.node_start} → {el.node_end} · L = {len.toFixed(3)} м
      </p>

      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
        Материал
      </p>
      <button
        onClick={() => setMatPickerOpen(true)}
        className="w-full text-left border border-[var(--drawing-line)] px-2 py-1.5 mb-2 text-[11px] hover:bg-[var(--drawing-paper)] flex items-center justify-between gap-2 min-h-[40px] lg:min-h-0"
      >
        <span className="truncate">{matName}</span>
        <Icon name="ChevronRight" size={12} className="shrink-0" />
      </button>

      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
        Сечение
      </p>
      <button
        onClick={() => setSecPickerOpen(true)}
        className="w-full text-left border border-[var(--drawing-line)] px-2 py-1.5 mb-3 text-[11px] hover:bg-[var(--drawing-paper)] flex items-center justify-between gap-2 min-h-[40px] lg:min-h-0"
      >
        <span className="truncate">{secName}</span>
        <Icon name="ChevronRight" size={12} className="shrink-0" />
      </button>

      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
        Шарниры на концах (Mz = 0)
      </p>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {(
          [
            { end: "start" as const, label: `Шарнир в ${el.node_start}`, on: !!el.hinge_start },
            { end: "end" as const, label: `Шарнир в ${el.node_end}`, on: !!el.hinge_end },
          ]
        ).map((h) => (
          <button
            key={h.end}
            onClick={() => setElementHinge(h.end, !h.on)}
            className={`border py-1.5 px-1.5 text-[10px] font-gost uppercase flex items-center justify-center gap-1.5 min-h-[40px] lg:min-h-0 ${
              h.on
                ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
            }`}
            title="Освобождает изгибающий момент на конце стержня (ферма, шатун, тяга, балка Гербера)"
          >
            <Icon name={h.on ? "CircleDot" : "Circle"} size={12} />
            <span className="truncate">{h.label}</span>
          </button>
        ))}
      </div>
      {(el.hinge_start || el.hinge_end) && (
        <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] -mt-2 mb-3 leading-tight">
          {el.hinge_start && el.hinge_end
            ? "Ферменный стержень — только осевая жёсткость, Mz = 0 на обоих концах."
            : "Полу-шарнир — момент освобождён на одном конце."}
        </p>
      )}

      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
        {is3d ? "Распределённая q_y (локальная y), Н/м" : "Распределённая q (по локальной y), Н/м"}
      </p>
      <div className="mb-3">
        <DistributedForm
          current={distLoad?.load_local_per_length?.[1] ?? 0}
          onApply={(qy) => setDistributedLoad(qy)}
        />
      </div>

      {is3d && (
        <>
          <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
            Распределённая q_z (локальная z), Н/м
          </p>
          <div className="mb-3">
            <DistributedForm
              current={distLoad?.load_local_per_length?.[2] ?? 0}
              onApply={(qz) =>
                setDistributedLoad(distLoad?.load_local_per_length?.[1] ?? 0, qz)
              }
            />
          </div>
        </>
      )}

      <details className="mb-3 text-[11px]">
        <summary className="cursor-pointer font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
          Добавить точечную силу в пролёте
        </summary>
        <InSpanForm onAdd={addInSpanPoint} />
      </details>

      {elementLoads.length > 0 && (
        <div className="mb-3 border-t border-[var(--drawing-line-thin)] pt-2">
          <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
            Нагрузки ({elementLoads.length})
          </p>
          <ul className="space-y-1">
            {elementLoads.map((ld) => (
              <LoadListItem
                key={ld.id}
                load={ld}
                length={len}
                onUpdateDistributed={(qy) => setDistributedLoad(qy)}
                onUpdateInSpan={(pos, py) => updateInSpanPoint(ld.id, pos, py)}
                onRemove={() => removeLoadById(ld.id)}
              />
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={deleteSelected}
        className="w-full border border-[var(--drawing-accent)] text-[var(--drawing-accent)] py-2 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-accent)] hover:text-white min-h-[40px] lg:min-h-0"
      >
        Удалить элемент
      </button>
    </div>
  );
}