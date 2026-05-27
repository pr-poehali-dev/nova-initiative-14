import type { SolverResponse } from "@/lib/cae-model";

/** Таблица реакций опор: Узел | Fx, Fy, Mz. Округление до целых ньютонов / Н·м. */
export default function ReactionsTable({
  reactions,
}: {
  reactions: SolverResponse["reactions"];
}) {
  if (reactions.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
        Реакции опор
      </p>
      {/* overflow-x-auto + min-w — на узком экране таблица скроллится горизонтально,
          а не уплотняется до слипшихся цифр. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-[10px] font-mono border-collapse">
          <thead>
            <tr className="border-b border-[var(--drawing-line-thin)]">
              <th className="text-left py-0.5 px-1 text-[var(--drawing-line-thin)] font-normal whitespace-nowrap">Узел</th>
              <th className="text-right py-0.5 px-1 text-[var(--drawing-line-thin)] font-normal whitespace-nowrap">Fx, Н</th>
              <th className="text-right py-0.5 px-1 text-[var(--drawing-line-thin)] font-normal whitespace-nowrap">Fy, Н</th>
              <th className="text-right py-0.5 px-1 text-[var(--drawing-line-thin)] font-normal whitespace-nowrap">Mz, Н·м</th>
            </tr>
          </thead>
          <tbody>
            {reactions.map((r) => (
              <tr key={r.node_id} className="border-b border-[var(--drawing-line-thin)]/30">
                <td className="py-0.5 px-1 whitespace-nowrap">{r.node_id}</td>
                <td className="text-right py-0.5 px-1 whitespace-nowrap">{Math.round(r.fx)}</td>
                <td className="text-right py-0.5 px-1 whitespace-nowrap">{Math.round(r.fy)}</td>
                <td className="text-right py-0.5 px-1 whitespace-nowrap">{Math.round(r.mz)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}