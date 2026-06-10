import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import { fetchAdminStats, type AdminStats } from "@/lib/auth";

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
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    setError(null);
    fetchAdminStats(days).then((r) => {
      if (!alive) return;
      if (r.ok && r.data) setStats(r.data);
      else setError("Не удалось загрузить статистику");
      setBusy(false);
    });
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
          <Link
            to="/account"
            className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
          >
            <Icon name="ArrowLeft" size={12} />К кабинету
          </Link>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-4">
          Статистика посещений
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

        {stats && !busy && (
          <>
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
          </>
        )}
      </div>
    </>
  );
};

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-4">
      <Icon name={icon} size={18} className="text-[var(--drawing-accent)] mb-1" />
      <p className="font-gost-upright text-2xl font-black text-[var(--drawing-line)]">{value}</p>
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

function Empty() {
  return (
    <p className="font-gost text-sm text-[var(--drawing-line-thin)] italic">
      Пока нет данных за выбранный период.
    </p>
  );
}

export default AdminStats;
