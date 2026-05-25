import Icon from "@/components/ui/icon";
import type { EditorMode } from "@/components/cae/FrameCanvas";

interface Props {
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  gridStep: number;
  setGridStep: (g: number) => void;
}

const EditorLeftPanel = ({ mode, setMode, gridStep, setGridStep }: Props) => (
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
      <p>
        • <b>Колесо</b> — зум
      </p>
      <p>
        • <b>Shift+ЛКМ</b> — пан
      </p>
      <p>
        • <b>Delete</b> — удалить выбранное
      </p>
    </div>
  </aside>
);

export default EditorLeftPanel;
