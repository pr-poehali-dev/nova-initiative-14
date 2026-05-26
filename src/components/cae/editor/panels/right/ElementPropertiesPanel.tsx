import Icon from "@/components/ui/icon";
import type { FrameModel } from "@/lib/cae-model";
import NumericInput from "./NumericInput";
import InSpanForm from "./InSpanForm";

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
  setMatPickerOpen,
  setSecPickerOpen,
  setElementHinge,
  setDistributedLoad,
  addInSpanPoint,
  removeLoadById,
  deleteSelected,
}: {
  model: FrameModel;
  selectedElementId: string;
  setMatPickerOpen: (v: boolean) => void;
  setSecPickerOpen: (v: boolean) => void;
  setElementHinge: (end: "start" | "end", on: boolean) => void;
  setDistributedLoad: (qy: number) => void;
  addInSpanPoint: (pos: number, py: number) => void;
  removeLoadById: (loadId: string) => void;
  deleteSelected: () => void;
}) {
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
    a && b ? Math.hypot(b.coords[0] - a.coords[0], b.coords[1] - a.coords[1]) : 0;

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
        className="w-full text-left border border-[var(--drawing-line)] px-2 py-1.5 mb-2 text-[11px] hover:bg-[var(--drawing-paper)] flex items-center justify-between gap-2"
      >
        <span className="truncate">{matName}</span>
        <Icon name="ChevronRight" size={12} className="shrink-0" />
      </button>

      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
        Сечение
      </p>
      <button
        onClick={() => setSecPickerOpen(true)}
        className="w-full text-left border border-[var(--drawing-line)] px-2 py-1.5 mb-3 text-[11px] hover:bg-[var(--drawing-paper)] flex items-center justify-between gap-2"
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
            className={`border py-1.5 px-1.5 text-[10px] font-gost uppercase flex items-center justify-center gap-1.5 ${
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
        Распределённая q (по локальной y), Н/м
      </p>
      <NumericInput
        value={distLoad?.load_local_per_length?.[1] ?? 0}
        step={100}
        onCommit={(v) => setDistributedLoad(v)}
        placeholder="0 (нет нагрузки)"
        className="drawing-input mb-3 font-mono text-[11px]"
      />
      {distLoad && (
        <p className="font-gost text-[10px] text-[var(--drawing-accent)] -mt-2 mb-3">
          ✓ q&nbsp;=&nbsp;{(distLoad.load_local_per_length?.[1] ?? 0).toFixed(0)} Н/м применена
        </p>
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
            {elementLoads.map((ld) => {
              let label = "";
              if (ld.type === "distributed_uniform") {
                const q = ld.load_local_per_length?.[1] ?? 0;
                label = `q = ${q.toFixed(0)} Н/м (равномерная)`;
              } else if (ld.type === "in_span_point") {
                const p = ld.force?.[1] ?? 0;
                const pos = ld.position_ratio ?? 0;
                label = `P = ${p.toFixed(0)} Н в x = ${(pos * len).toFixed(2)} м (${(pos * 100).toFixed(0)}%)`;
              } else {
                label = ld.type;
              }
              return (
                <li
                  key={ld.id}
                  className="flex items-center justify-between gap-2 text-[10px] font-mono bg-[var(--drawing-paper)] border border-[var(--drawing-line-thin)] px-2 py-1"
                >
                  <span className="truncate">{label}</span>
                  <button
                    onClick={() => removeLoadById(ld.id)}
                    className="text-[var(--drawing-accent)] hover:underline shrink-0"
                    title="Удалить"
                  >
                    <Icon name="X" size={11} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        onClick={deleteSelected}
        className="w-full border border-[var(--drawing-accent)] text-[var(--drawing-accent)] py-1.5 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-accent)] hover:text-white"
      >
        Удалить элемент
      </button>
    </div>
  );
}
