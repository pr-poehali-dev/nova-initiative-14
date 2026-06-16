/**
 * Дорожная карта написания НИР: наглядные этапы с автоматическим прогрессом.
 * Помогает студенту видеть, что сделано и что осталось — снижает стресс и
 * делает процесс понятным. Клик по этапу прокручивает к нужному разделу.
 */
import Icon from "@/components/ui/icon";
import { type NirDocument, computeNirProgress, docStats } from "@/lib/nir";

interface Props {
  doc: NirDocument;
  onJump?: (stepId: string) => void;
}

export default function NirRoadmap({ doc, onJump }: Props) {
  const progress = computeNirProgress(doc);
  const stats = docStats(doc);

  return (
    <div className="border-2 border-[var(--drawing-line)] p-3 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] inline-flex items-center gap-1.5">
          <Icon name="Map" size={14} />Дорожная карта НИР
        </p>
        <div className="flex items-center gap-3 font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          <span>≈ {stats.pages} стр.</span>
          <span>{stats.words.toLocaleString("ru-RU")} слов</span>
          <span className="text-[var(--drawing-accent)] font-bold">{progress.done}/{progress.total} · {progress.percent}%</span>
        </div>
      </div>

      {/* Полоса прогресса */}
      <div className="h-1.5 bg-[var(--drawing-line)]/15 mb-3 overflow-hidden">
        <div
          className="h-full bg-[var(--drawing-accent)] transition-all duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {/* Этапы */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {progress.steps.map(({ step, done }, i) => (
          <button
            key={step.id}
            onClick={() => onJump?.(step.id)}
            className={`shrink-0 w-[120px] text-left border p-2 transition-colors ${
              done
                ? "border-[var(--drawing-accent)] bg-[var(--drawing-paper)]"
                : "border-[var(--drawing-line)]/30 hover:border-[var(--drawing-accent)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${done ? "bg-[var(--drawing-accent)] text-white" : "border border-[var(--drawing-line)]/40 text-[var(--drawing-line-thin)]"}`}>
                {done ? <Icon name="Check" size={12} /> : i + 1}
              </span>
              <Icon name={step.icon} size={14} className={done ? "text-[var(--drawing-accent)]" : "text-[var(--drawing-line-thin)]"} />
            </div>
            <p className="font-gost-upright text-[11px] font-bold leading-tight">{step.title}</p>
            <p className="font-gost text-[9px] text-[var(--drawing-line-thin)] leading-tight mt-0.5">{step.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
