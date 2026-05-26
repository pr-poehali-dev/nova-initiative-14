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
          {reactions.map((r) => (
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
  );
}
