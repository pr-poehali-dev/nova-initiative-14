import type { AnalyticResult } from "@/lib/cae/analytic-deflection";
import { formatNumber } from "./formatNumber";

/**
 * Блок «Аналитическая проверка»:
 * сравнивает КЭМ-прогиб с формульным для типовой схемы
 * (консоль, балка с q, балка с P в центре и т.п.) и показывает Δ%.
 *
 * Цветовая шкала:
 *   |Δ| < 2%  → зелёный (отлично)
 *   |Δ| < 5%  → жёлтый  (приемлемо)
 *   |Δ| ≥ 5%  → акцент  (стоит перепроверить)
 */
export default function AnalyticCheck({
  analytic,
  numericMm,
  analyticMm,
  deltaPct,
}: {
  analytic: AnalyticResult;
  numericMm: number;
  analyticMm: number;
  deltaPct: number;
}) {
  return (
    <div className="mb-3 border border-[var(--drawing-line-thin)] p-2 text-[10px] font-mono">
      <p className="font-gost uppercase tracking-[0.15em] text-[var(--drawing-line-thin)] mb-1.5">
        Аналит. проверка
      </p>
      <p className="text-[var(--drawing-line-thin)] mb-1">{analytic.scheme}</p>
      <p className="mb-1.5 text-[9px] opacity-70">{analytic.formula}</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <span className="text-[var(--drawing-line-thin)]">КЭМ:</span>
        <span>{formatNumber(numericMm, 3)} мм</span>
        <span className="text-[var(--drawing-line-thin)]">Аналит.:</span>
        <span>{formatNumber(analyticMm, 3)} мм</span>
        <span className="text-[var(--drawing-line-thin)]">Δ:</span>
        <span
          className={
            Math.abs(deltaPct) < 2
              ? "text-green-600"
              : Math.abs(deltaPct) < 5
                ? "text-yellow-600"
                : "text-[var(--drawing-accent)]"
          }
        >
          {deltaPct > 0 ? "+" : ""}
          {deltaPct.toFixed(2)} %
        </span>
      </div>
    </div>
  );
}
