import { useState } from "react";
import Icon from "@/components/ui/icon";
import type {
  FrameModel,
  ModelNode,
  BoundaryCondition,
  ModelLoad,
  DofName,
} from "@/lib/cae-model";

// === Форма точечной силы в пролёте ===
function InSpanForm({ onAdd }: { onAdd: (pos: number, py: number) => void }) {
  const [pos, setPos] = useState(0.5);
  const [py, setPy] = useState(-1000);
  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] font-gost">
          Позиция (0…1)
          <input
            type="number"
            step={0.1}
            min={0}
            max={1}
            value={pos}
            onChange={(e) => setPos(parseFloat(e.target.value) || 0)}
            className="drawing-input font-mono text-[11px] mt-0.5"
          />
        </label>
        <label className="text-[10px] font-gost">
          Py, Н
          <input
            type="number"
            step={100}
            value={py}
            onChange={(e) => setPy(parseFloat(e.target.value) || 0)}
            className="drawing-input font-mono text-[11px] mt-0.5"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => onAdd(pos, py)}
        className="w-full border border-[var(--drawing-accent)] text-[var(--drawing-accent)] py-1.5 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-accent)] hover:text-white"
      >
        Добавить силу
      </button>
    </div>
  );
}

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
  deleteSelected,
}: Props) => {
  if (selectedNode) {
    return (
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
        <div className="grid grid-cols-3 gap-1 mb-1">
          {[
            { v: "fixed", label: "Защ." },
            { v: "pinned", label: "Шарн." },
            { v: "roller_y", label: "Кат.Y" },
            { v: "roller_x", label: "Кат.X" },
            { v: "sliding", label: "Ползун" },
            { v: "custom", label: "Ручн." },
          ].map((b) => (
            <button
              key={b.v}
              onClick={() => {
                if (b.v === "custom") {
                  setBcCustomOpen((x) => !x);
                } else {
                  addBC(b.v as BoundaryCondition["type"]);
                  setBcCustomOpen(false);
                }
              }}
              className={`border py-1.5 px-1 text-[9px] font-gost uppercase ${
                nodeBC?.type === b.v || (b.v === "custom" && bcCustomOpen)
                  ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)] border-[var(--drawing-line)]"
                  : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        {bcCustomOpen && (
          <div className="border border-[var(--drawing-line-thin)] p-2 mt-1 mb-2 bg-[var(--drawing-paper)]">
            <p className="font-gost text-[9px] uppercase text-[var(--drawing-line-thin)] mb-1">
              Закрепления вручную:
            </p>
            <div className="grid grid-cols-3 gap-1">
              {(["ux", "uy", "rz"] as DofName[]).map((d) => {
                const checked = nodeBC?.constrained_dofs.includes(d) || false;
                return (
                  <label
                    key={d}
                    className={`border py-1 text-center text-[10px] font-mono cursor-pointer ${
                      checked
                        ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                        : "border-[var(--drawing-line)] hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCustomDof(d)}
                      className="hidden"
                    />
                    {d}
                  </label>
                );
              })}
            </div>
          </div>
        )}
        {nodeBC && (
          <button
            onClick={removeBC}
            className="text-[10px] font-gost uppercase text-[var(--drawing-accent)] hover:underline mb-3"
          >
            Убрать опору
          </button>
        )}

        <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5 mt-2">
          Узловые нагрузки
        </p>
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
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
        <label className="text-[10px] font-gost block mb-2">
          Mz (момент), Н·м
          <input
            type="number"
            step={50}
            value={nodeLoad?.moment?.[2] ?? 0}
            onChange={(e) => setNodalMoment(parseFloat(e.target.value) || 0)}
            className="drawing-input mt-0.5 font-mono text-[11px]"
          />
        </label>
        {nodeLoad && (
          <button
            onClick={removeLoadOnNode}
            className="text-[10px] font-gost uppercase text-[var(--drawing-accent)] hover:underline"
          >
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
    );
  }

  if (selectedElementId) {
    const el = model.elements.find((x) => x.id === selectedElementId);
    if (!el) return null;
    const mat = model.materials.find((m) => m.id === el.material_id);
    const sec = model.sections.find((s) => s.id === el.section_id);
    const matName = mat?.name || el.material_id;
    const secName = sec?.name || el.section_id;
    const distLoad = model.loads.find(
      (l) => l.type === "distributed_uniform" && l.element_id === selectedElementId,
    );
    const a = model.nodes.find((n) => n.id === el.node_start);
    const b = model.nodes.find((n) => n.id === el.node_end);
    const len = a && b
      ? Math.hypot(b.coords[0] - a.coords[0], b.coords[1] - a.coords[1])
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
          Распределённая q (по локальной y), Н/м
        </p>
        <input
          type="number"
          step={100}
          value={distLoad?.load_local_per_length?.[1] ?? 0}
          onChange={(e) => setDistributedLoad(parseFloat(e.target.value) || 0)}
          className="drawing-input mb-3 font-mono text-[11px]"
          placeholder="0 (нет нагрузки)"
        />

        <details className="mb-3 text-[11px]">
          <summary className="cursor-pointer font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
            Добавить точечную силу в пролёте
          </summary>
          <InSpanForm onAdd={addInSpanPoint} />
        </details>

        <button
          onClick={deleteSelected}
          className="w-full border border-[var(--drawing-accent)] text-[var(--drawing-accent)] py-1.5 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-accent)] hover:text-white"
        >
          Удалить элемент
        </button>
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-[var(--drawing-line-thin)] bg-[var(--drawing-bg)] p-3 text-[var(--drawing-line-thin)]">
      <p className="font-gost text-[10px] uppercase tracking-[0.2em] mb-1">Подсказка</p>
      <p className="text-[11px] leading-relaxed">
        Выберите узел или элемент, чтобы настроить опору, нагрузку или удалить.
      </p>
    </div>
  );
};

export default EditorRightPanel;
