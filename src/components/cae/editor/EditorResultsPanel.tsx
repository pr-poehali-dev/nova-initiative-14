import type { DiagramKind } from "@/components/cae/FrameCanvas";
import type { SolverResponse } from "@/lib/cae-model";

const formatNumber = (v: number, digits = 4) => {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toExponential(2);
  if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2);
  return v.toFixed(digits);
};

interface Props {
  result: SolverResponse | null;
  showDiagram: DiagramKind;
  setShowDiagram: (d: DiagramKind) => void;
  diagramScale: number;
  setDiagramScale: (v: number) => void;
}

const EditorResultsPanel = ({
  result,
  showDiagram,
  setShowDiagram,
  diagramScale,
  setDiagramScale,
}: Props) => (
  <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
    <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
      Результат
    </p>
    {!result ? (
      <p className="text-[11px] text-[var(--drawing-line-thin)]">
        Нажмите «Посчитать» после построения схемы.
      </p>
    ) : (
      <>
        <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono mb-3">
          <dt className="text-[var(--drawing-line-thin)]">Узлов:</dt>
          <dd>{result.summary.n_nodes}</dd>
          <dt className="text-[var(--drawing-line-thin)]">Элементов:</dt>
          <dd>{result.summary.n_elements}</dd>
          <dt className="text-[var(--drawing-line-thin)]">Макс. прогиб:</dt>
          <dd>{formatNumber(result.summary.max_displacement * 1000, 3)} мм</dd>
          <dt className="text-[var(--drawing-line-thin)]">Макс σ Мизес:</dt>
          <dd>{formatNumber(result.summary.max_sigma_vm / 1e6, 1)} МПа</dd>
          <dt className="text-[var(--drawing-line-thin)]">Запас:</dt>
          <dd>
            {result.summary.min_safety_factor && result.summary.min_safety_factor < 1e5
              ? result.summary.min_safety_factor.toFixed(2)
              : "∞"}
          </dd>
          <dt className="text-[var(--drawing-line-thin)]">Время:</dt>
          <dd>{result.duration_ms} мс</dd>
        </dl>

        {/* Таблица реакций опор */}
        {result.reactions.length > 0 && (
          <div className="mb-3">
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
              Реакции опор
            </p>
            <table className="w-full text-[10px] font-mono border-collapse">
              <thead>
                <tr className="border-b border-[var(--drawing-line-thin)]">
                  <th className="text-left py-0.5 text-[var(--drawing-line-thin)] font-normal">Узел</th>
                  <th className="text-right py-0.5 text-[var(--drawing-line-thin)] font-normal">Fx, Н</th>
                  <th className="text-right py-0.5 text-[var(--drawing-line-thin)] font-normal">Fy, Н</th>
                  <th className="text-right py-0.5 text-[var(--drawing-line-thin)] font-normal">Mz, Н·м</th>
                </tr>
              </thead>
              <tbody>
                {result.reactions.map((r) => (
                  <tr key={r.node_id} className="border-b border-[var(--drawing-line-thin)]/30">
                    <td className="py-0.5">{r.node_id}</td>
                    <td className="text-right py-0.5">{Math.round(r.fx)}</td>
                    <td className="text-right py-0.5">{Math.round(r.fy)}</td>
                    <td className="text-right py-0.5">{Math.round(r.mz)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
          Эпюра
        </p>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {[
            { v: "none", label: "Без" },
            { v: "deformed", label: "Дефор." },
            { v: "N", label: "N" },
            { v: "Qy", label: "Q" },
            { v: "Mz", label: "M" },
            { v: "sigma", label: "σ" },
          ].map((d) => (
            <button
              key={d.v}
              onClick={() => setShowDiagram(d.v as DiagramKind)}
              className={`border py-1 text-[10px] font-gost uppercase ${
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

        {result.warnings.length > 0 && (
          <div className="mt-3 p-2 border border-[var(--drawing-accent)] text-[10px] text-[var(--drawing-accent)]">
            {result.warnings.map((w, i) => (
              <p key={i}>⚠ {w}</p>
            ))}
          </div>
        )}
      </>
    )}
  </div>
);

export default EditorResultsPanel;