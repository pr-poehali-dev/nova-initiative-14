import type { SolverResponse } from "@/lib/cae-model";
import { formatNumber } from "./formatNumber";

/** Сводка ключевых чисел расчёта: узлы, элементы, прогиб, σ, запас, время. */
export default function ResultsSummary({ result }: { result: SolverResponse }) {
  const isPdelta = result.summary.analysis_type === "nonlinear_pdelta";
  const pd = result.summary.pdelta;
  return (
    <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono mb-3">
      <dt className="text-[var(--drawing-line-thin)]">Тип расчёта:</dt>
      <dd>
        {isPdelta ? (
          <span title="Геометрическая нелинейность">
            P-Δ нелинейный
            {pd && (
              <span className="text-[var(--drawing-line-thin)]"> · {pd.iterations} итер.</span>
            )}
          </span>
        ) : (
          "линейный"
        )}
      </dd>
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
        {typeof result.summary.min_safety_factor === "number" &&
        Number.isFinite(result.summary.min_safety_factor) &&
        result.summary.min_safety_factor < 1e5
          ? result.summary.min_safety_factor.toFixed(2)
          : "∞"}
      </dd>
      <dt className="text-[var(--drawing-line-thin)]">Время:</dt>
      <dd>{result.duration_ms ?? 0} мс</dd>
    </dl>
  );
}