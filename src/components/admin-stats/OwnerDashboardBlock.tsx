import { type OwnerDashboard } from "@/lib/auth";
import {
  CountBars,
  Empty,
  PeopleTable,
  Section,
  StatCard,
  typeLabel,
} from "./stats-shared";

/** Блок дашборда владельца: пользователи/онлайн, расчёты/сложность, рефералы. */
export default function OwnerDashboardBlock({ dash }: { dash: OwnerDashboard }) {
  const { users, solves, projects, referrals, top_users } = dash;
  const maxSolveDaily = Math.max(1, ...dash.solves_daily.map((d) => d.count));
  const successRate =
    solves.runs > 0 ? Math.round((solves.ok / solves.runs) * 100) : 0;

  return (
    <>
      {/* Пользователи и онлайн */}
      <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
        Пользователи и активность
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <StatCard icon="Users" label="Всего пользователей" value={users.total} />
        <StatCard icon="UserPlus" label="Новых за период" value={users.new_period} />
        <StatCard icon="MailCheck" label="Подтвердили email" value={users.verified} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard icon="Radio" label="Онлайн сейчас" value={users.online} accent />
        <StatCard icon="Activity" label="Активны за 24ч" value={users.active_24h} />
        <StatCard icon="CalendarClock" label="Активны за 7д" value={users.active_7d} />
      </div>

      {/* Расчёты и сложность */}
      <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
        Расчёты и сложность
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard icon="Calculator" label="Всего расчётов" value={solves.runs} />
        <StatCard icon="CircleCheck" label={`Успешных (${successRate}%)`} value={solves.ok} />
        <StatCard icon="CircleX" label="С ошибкой" value={solves.err} />
        <StatCard icon="TrendingUp" label="За период" value={solves.runs_period} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon="Spline" label="Сред. узлов" value={solves.avg_nodes} />
        <StatCard icon="Grid3x3" label="Сред. элементов" value={solves.avg_elems} />
        <StatCard icon="ArrowDownToLine" label="Сред. нагрузок" value={solves.avg_loads} />
        <StatCard icon="Timer" label="Сред. время, мс" value={solves.avg_ms} />
      </div>

      <Section title="Расчёты по дням">
        {dash.solves_daily.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex items-end gap-1 h-40 border-b border-l border-[var(--drawing-line)] pl-1">
            {dash.solves_daily.map((d) => (
              <div
                key={d.date}
                className="flex-1 min-w-[3px] bg-[var(--drawing-line)] relative"
                style={{ height: `${(d.count / maxSolveDaily) * 100}%` }}
                title={`${d.date}: ${d.count} расчётов, ${d.errors} с ошибкой`}
              >
                {d.errors > 0 && (
                  <span className="absolute -top-1 left-0 right-0 h-1 bg-[var(--drawing-accent)]" />
                )}
              </div>
            ))}
          </div>
        )}
        <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-2">
          Красная отметка — в этот день были расчёты с ошибкой.
        </p>
      </Section>

      <div className="grid md:grid-cols-2 gap-8 mb-2">
        <Section title="Типы расчётов">
          <CountBars
            items={dash.solves_by_type.map((t) => ({ label: typeLabel(t.type), count: t.count }))}
          />
        </Section>
        <Section title="Распределение по сложности">
          <CountBars items={dash.complexity.map((c) => ({ label: c.bucket, count: c.count }))} />
        </Section>
      </div>

      {/* Проекты */}
      <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3 mt-6">
        Проекты
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon="FolderKanban" label="Всего проектов" value={projects.total} />
        <StatCard icon="FolderOpen" label="Активных" value={projects.active} />
        <StatCard icon="Archive" label="В архиве" value={projects.archived} />
        <StatCard icon="FolderPlus" label="Новых за период" value={projects.new_period} />
      </div>

      {/* Рефералы */}
      <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
        Приглашения и рефералы
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard icon="Gift" label="Пришли по приглашению" value={referrals.invited_total} />
        <StatCard icon="UserRoundPlus" label="Из них за период" value={referrals.invited_period} />
      </div>
      <Section title="Топ приглашающих (приглашено → стали активными)">
        <PeopleTable
          rows={referrals.top_inviters.map((r) => ({
            name: r.name,
            a: r.invited,
            b: r.active,
          }))}
          colA="Приглашено"
          colB="Активны"
        />
      </Section>

      {/* Самые активные по расчётам */}
      <Section title="Самые активные пользователи (по числу расчётов)">
        <PeopleTable
          rows={top_users.map((r) => ({
            name: r.name,
            a: r.runs,
            b: r.last_run ? new Date(r.last_run).toLocaleDateString("ru-RU") : "—",
          }))}
          colA="Расчётов"
          colB="Последний"
        />
      </Section>
    </>
  );
}