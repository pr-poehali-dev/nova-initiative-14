import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import {
  fetchAdminStats,
  fetchOwnerDashboard,
  type AdminStats,
  type OwnerDashboard,
  type PageStat,
  type QrFlyerStat,
} from "@/lib/auth";

/** Человекочитаемые названия типов расчётных моделей. */
const TYPE_LABEL: Record<string, string> = {
  frame_3d: "Рама 3D",
  frame_2d: "Рама 2D",
  truss_3d: "Ферма 3D",
  truss_2d: "Ферма 2D",
  beam: "Балка",
  unknown: "Прочее",
};
const typeLabel = (t: string) => TYPE_LABEL[t] || t;

/** Дни-периоды для переключателя. */
const PERIODS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
];

/** Цвет столбика источника по типу. */
const SOURCE_COLOR: Record<string, string> = {
  qr_flyer: "#c0392b",
  utm: "#2c3e80",
  organic: "#1a8a5a",
  social: "#7d3c98",
  referral: "#d97706",
  direct: "#3a3a5e",
  internal: "#9aa0c0",
  unknown: "#9aa0c0",
};

/**
 * Админ-дашборд статистики посещений: откуда приходят посетители и
 * по каким источникам регистрируются (атрибуция первого касания).
 * Доступен только администратору. Скрыт от поисковых роботов.
 */
const AdminStats = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dash, setDash] = useState<OwnerDashboard | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    setError(null);
    Promise.all([fetchAdminStats(days), fetchOwnerDashboard(days)]).then(
      ([s, d]) => {
        if (!alive) return;
        if (s.ok && s.data) setStats(s.data);
        else setError("Не удалось загрузить статистику");
        if (d.ok && d.data) setDash(d.data);
        setBusy(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [days]);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }

  if (!user || !user.is_admin) {
    setTimeout(() => nav("/account", { replace: true }), 0);
    return null;
  }

  const maxDaily = Math.max(1, ...(stats?.daily.map((d) => d.visits) ?? [1]));

  return (
    <>
      <Helmet>
        <title>Статистика посещений · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/admin/stats`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1000px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Админ · Аналитика
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/qr"
              className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
            >
              <Icon name="QrCode" size={12} />QR-флаеры
            </Link>
            <Link
              to="/account"
              className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
            >
              <Icon name="ArrowLeft" size={12} />К кабинету
            </Link>
          </div>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-4">
          Статистика продукта
        </h1>

        {/* Переключатель периода */}
        <div className="flex gap-1 mb-6">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`btn-drawing text-xs ${
                days === p.days
                  ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]"
                  : ""
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {busy && (
          <p className="font-gost text-sm text-[var(--drawing-line-thin)]">Загружаем данные…</p>
        )}
        {error && (
          <p className="font-gost text-sm text-[var(--drawing-accent)]">{error}</p>
        )}

        {dash && !busy && <OwnerDashboardBlock dash={dash} />}

        {stats && !busy && (
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
        )}
      </div>
    </>
  );
};

/** Блок дашборда владельца: пользователи/онлайн, расчёты/сложность, рефералы. */
function OwnerDashboardBlock({ dash }: { dash: OwnerDashboard }) {
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

/** Горизонтальные бары по подписи + количеству (универсальный). */
function CountBars({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="font-gost text-xs text-[var(--drawing-line)] w-28 shrink-0 truncate" title={it.label}>
            {it.label}
          </span>
          <div className="flex-1 h-5 bg-[var(--drawing-paper)] border border-[var(--drawing-line)]/20">
            <div
              className="h-full bg-[var(--drawing-line)]"
              style={{ width: `${(it.count / max) * 100}%` }}
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

/** Таблица «человек → две метрики» (рефералы, активность). */
function PeopleTable({
  rows,
  colA,
  colB,
}: {
  rows: { name: string; a: number | string; b: number | string }[];
  colA: string;
  colB: string;
}) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pb-1 border-b border-[var(--drawing-line)]/30">
        <span className="flex-1 font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Пользователь
        </span>
        <span className="w-20 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          {colA}
        </span>
        <span className="w-20 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          {colB}
        </span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <span className="flex-1 font-gost text-xs text-[var(--drawing-line)] truncate" title={r.name}>
            {r.name}
          </span>
          <span className="w-20 text-right font-mono text-sm font-bold text-[var(--drawing-line)]">
            {r.a}
          </span>
          <span className="w-20 text-right font-mono text-xs text-[var(--drawing-line-thin)]">
            {r.b}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: number; accent?: boolean }) {
  const display = Number.isInteger(value) ? value : value.toFixed(1);
  return (
    <div
      className={`border-2 bg-[var(--drawing-bg)] p-4 ${
        accent && value > 0 ? "border-[var(--drawing-accent)]" : "border-[var(--drawing-line)]"
      }`}
    >
      <Icon name={icon} size={18} className="text-[var(--drawing-accent)] mb-1" />
      <p className="font-gost-upright text-2xl font-black text-[var(--drawing-line)]">{display}</p>
      <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
        {label}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
        {title}
      </p>
      {children}
    </div>
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

function Empty() {
  return (
    <p className="font-gost text-sm text-[var(--drawing-line-thin)] italic">
      Пока нет данных за выбранный период.
    </p>
  );
}

export default AdminStats;