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
} from "@/lib/auth";
import { PERIODS } from "@/components/admin-stats/stats-shared";
import OwnerDashboardBlock from "@/components/admin-stats/OwnerDashboardBlock";
import TrafficStatsBlock from "@/components/admin-stats/TrafficStatsBlock";

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

        {stats && !busy && <TrafficStatsBlock stats={stats} />}
      </div>
    </>
  );
};

export default AdminStats;
