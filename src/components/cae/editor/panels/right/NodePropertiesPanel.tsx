import type {
  BoundaryCondition,
  DofName,
  ModelLoad,
  ModelNode,
} from "@/lib/cae-model";
import NumericInput from "./NumericInput";

/**
 * Правая панель свойств УЗЛА:
 *  - координаты
 *  - тип опоры (защемление, шарнир, катки, ползун, ручное)
 *  - узловые нагрузки (Fx, Fy, Mz)
 *  - удаление узла
 */
export default function NodePropertiesPanel({
  selectedNode,
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
  deleteSelected,
}: {
  selectedNode: ModelNode;
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
  deleteSelected: () => void;
}) {
  return (
    <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
        Узел {selectedNode.id}
      </p>
      <p className="font-mono text-[11px] mb-3">
        x = {Number.isFinite(selectedNode.coords?.[0]) ? selectedNode.coords[0].toFixed(2) : "—"} м<br />
        y = {Number.isFinite(selectedNode.coords?.[1]) ? selectedNode.coords[1].toFixed(2) : "—"} м
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
            className={`border min-h-[40px] py-1.5 px-1 text-[10px] font-gost uppercase active:bg-[var(--drawing-paper)] ${
              nodeBC?.type === b.v || (b.v === "custom" && bcCustomOpen)
                ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)] border-[var(--drawing-line)]"
                : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
            }`}
            aria-pressed={nodeBC?.type === b.v || (b.v === "custom" && bcCustomOpen)}
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
          <NumericInput
            value={nodeLoad?.force?.[0] ?? 0}
            step={100}
            onCommit={(v) => addNodalLoad(v, nodeLoad?.force?.[1] ?? 0)}
            className="drawing-input mt-0.5 font-mono text-[11px]"
          />
        </label>
        <label className="text-[10px] font-gost">
          Fy, Н
          <NumericInput
            value={nodeLoad?.force?.[1] ?? 0}
            step={100}
            onCommit={(v) => addNodalLoad(nodeLoad?.force?.[0] ?? 0, v)}
            className="drawing-input mt-0.5 font-mono text-[11px]"
          />
        </label>
      </div>
      <label className="text-[10px] font-gost block mb-2">
        Mz (момент), Н·м
        <NumericInput
          value={nodeLoad?.moment?.[2] ?? 0}
          step={50}
          onCommit={(v) => setNodalMoment(v)}
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
