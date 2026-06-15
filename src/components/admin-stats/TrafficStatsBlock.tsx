import { type AdminStats, type PageStat, type QrFlyerStat } from "@/lib/auth";
import { Empty, Section, SOURCE_COLOR, StatCard } from "./stats-shared";

/** Блок «Трафик и источники»: визиты, источники, QR-флаеры, топ страниц. */
export default function TrafficStatsBlock({ stats }: { stats: AdminStats }) {
  const maxDaily = Math.max(1, ...(stats?.daily.map((d) => d.visits) ?? [1]));

  return (
    <>
      <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3 mt-10">
        Трафик и источники
      </p>
      {/* Итоги */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard icon="Eye" label="Визитов" value={stats.totals.visits} />
        <StatCard icon="UserPlus" label="Регистраций" value={stats.totals.signups} />
        <StatCard icon="GitBranch" label="Источников" value={stats.totals.sources} />
      </div>

      {/* График по дням */}
      <Section title="Визиты по дням">
        {stats.daily.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex items-end gap-1 h-40 border-b border-l border-[var(--drawing-line)] pl-1 pb-0">
            {stats.daily.map((d) => (
              <div
                key={d.date}
                className="flex-1 min-w-[3px] bg-[var(--drawing-line)] relative group"
                style={{ height: `${(d.visits / maxDaily) * 100}%` }}
                title={`${d.date}: ${d.visits} визитов, ${d.signups} рег.`}
              >
                {d.signups > 0 && (
                  <span className="absolute -top-1 left-0 right-0 h-1 bg-[var(--drawing-accent)]" />
                )}
              </div>
            ))}
          </div>
        )}
        <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-2">
          Красная отметка сверху столбика — были регистрации в этот день.
        </p>
      </Section>

      {/* Источники визитов */}
      <Section title="Откуда приходят посетители">
        <SourceBars items={stats.visits_by_source} />
      </Section>

      {/* Источники регистраций */}
      <Section title="Откуда приходят регистрации (первое касание)">
        <SourceBars items={stats.signups_by_source} />
      </Section>

      {/* Разбивка по QR-флаерам */}
      <Section title="Эффективность QR-флаеров (визиты → регистрации)">
        <QrFlyers items={stats.qr_flyers ?? []} />
      </Section>

      {/* Топ страниц и постов по посещаемости */}
      <Section title="Топ страниц и постов по посещаемости">
        <TopPages items={stats.top_pages ?? []} />
      </Section>
    </>
  );
}

function SourceBars({ items }: { items: { sourceType: string; sourceLabel: string; count: number }[] }) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="font-gost text-xs text-[var(--drawing-line)] w-40 shrink-0 truncate" title={it.sourceLabel}>
            {it.sourceLabel}
          </span>
          <div className="flex-1 h-5 bg-[var(--drawing-paper)] border border-[var(--drawing-line)]/20 relative">
            <div
              className="h-full"
              style={{
                width: `${(it.count / max) * 100}%`,
                background: SOURCE_COLOR[it.sourceType] || "#3a3a5e",
              }}
            />
          </div>
          <span className="font-mono text-xs text-[var(--drawing-line)] w-10 text-right shrink-0">
            {it.count}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Разбивка по QR-флаерам: визиты, регистрации и конверсия каждого тиража. */
function QrFlyers({ items }: { items: QrFlyerStat[] }) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(1, ...items.map((i) => i.visits));
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pb-1 border-b border-[var(--drawing-line)]/30">
        <span className="flex-1 font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Флаер / кампания
        </span>
        <span className="w-14 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Визиты
        </span>
        <span className="w-14 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Рег.
        </span>
        <span className="w-12 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Конв.
        </span>
      </div>
      {items.map((it) => {
        const conv = it.visits > 0 ? Math.round((it.signups / it.visits) * 100) : 0;
        return (
          <div key={it.label} className="flex items-center gap-2 py-1">
            <div className="flex-1 min-w-0">
              <p className="font-gost text-xs text-[var(--drawing-line)] truncate" title={it.label}>
                {it.label}
              </p>
              <div className="h-1 mt-0.5 bg-[var(--drawing-paper)]">
                <div
                  className="h-full"
                  style={{ width: `${(it.visits / max) * 100}%`, background: "#c0392b" }}
                />
              </div>
            </div>
            <span className="w-14 text-right font-mono text-sm font-bold text-[var(--drawing-line)]">
              {it.visits}
            </span>
            <span className="w-14 text-right font-mono text-sm text-[var(--drawing-accent)]">
              {it.signups}
            </span>
            <span className="w-12 text-right font-mono text-xs text-[var(--drawing-line-thin)]">
              {it.visits > 0 ? `${conv}%` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Таблица топ-страниц: уникальные посетители + всего просмотров. */
function TopPages({ items }: { items: PageStat[] }) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(1, ...items.map((i) => i.unique));
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pb-1 border-b border-[var(--drawing-line)]/30">
        <span className="flex-1 font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Страница / пост
        </span>
        <span className="w-16 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Уник.
        </span>
        <span className="w-16 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Всего
        </span>
      </div>
      {items.map((it) => (
        <div key={it.path} className="flex items-center gap-2 py-1">
          <div className="flex-1 min-w-0">
            <p className="font-gost text-xs text-[var(--drawing-line)] truncate" title={it.title}>
              {it.title}
            </p>
            <div className="h-1 mt-0.5 bg-[var(--drawing-paper)]">
              <div
                className="h-full bg-[var(--drawing-accent)]"
                style={{ width: `${(it.unique / max) * 100}%` }}
              />
            </div>
            <p className="font-mono text-[9px] text-[var(--drawing-line-thin)] truncate">{it.path}</p>
          </div>
          <span className="w-16 text-right font-mono text-sm font-bold text-[var(--drawing-line)]">
            {it.unique}
          </span>
          <span className="w-16 text-right font-mono text-xs text-[var(--drawing-line-thin)]">
            {it.total}
          </span>
        </div>
      ))}
    </div>
  );
}
