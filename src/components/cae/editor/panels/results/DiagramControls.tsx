import type { DiagramKind } from "@/components/cae/FrameCanvas";

/**
 * Переключатели представления результатов на канве:
 *  - вид схемы: исходная / деформированная
 *  - тип эпюры: N, Q, M, σ, v
 *  - ползунок масштаба эпюр
 */
export default function DiagramControls({
  showDiagram,
  setShowDiagram,
  diagramScale,
  setDiagramScale,
}: {
  showDiagram: DiagramKind;
  setShowDiagram: (d: DiagramKind) => void;
  diagramScale: number;
  setDiagramScale: (v: number) => void;
}) {
  return (
    <>
      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
        Вид схемы
      </p>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {[
          { v: "none", label: "Исходная", title: "Недеформированная схема рамы" },
          {
            v: "deformed",
            label: "Деформированная",
            title:
              "Наложение деформированной схемы на канву: узлы смещены, элементы изогнуты по реальным траекториям прогиба",
          },
        ].map((d) => (
          <button
            key={d.v}
            onClick={() => setShowDiagram(d.v as DiagramKind)}
            title={d.title}
            className={`border py-1.5 text-[10px] font-gost uppercase ${
              showDiagram === d.v
                ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
        Эпюра вдоль элемента
      </p>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {[
          { v: "N", label: "N", title: "Эпюра продольной (осевой) силы, Н" },
          { v: "Qy", label: "Q", title: "Эпюра поперечной силы, Н" },
          { v: "Mz", label: "M", title: "Эпюра изгибающего момента, Н·м" },
          { v: "sigma", label: "σ", title: "Эпюра эквивалентных напряжений по Мизесу, МПа" },
          {
            v: "uy",
            label: "v",
            title:
              "Эпюра прогиба v(x) — значение прогиба в каждой точке элемента, мм. Это число, а не графика смещения схемы.",
          },
        ].map((d) => (
          <button
            key={d.v}
            onClick={() => setShowDiagram(d.v as DiagramKind)}
            title={d.title}
            className={`border py-1.5 text-[10px] font-gost uppercase ${
              showDiagram === d.v
                ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <label className="text-[10px] font-gost text-[var(--drawing-line-thin)]">
        Масштаб эпюры
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={diagramScale}
          onChange={(e) => setDiagramScale(parseFloat(e.target.value))}
          className="w-full mt-1"
        />
      </label>
    </>
  );
}
