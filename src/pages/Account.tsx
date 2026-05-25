import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@dr.pogodin/react-helmet";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";

const Account = () => {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем кабинет…
      </div>
    );
  }

  if (!user) {
    setTimeout(() => nav("/login", { replace: true, state: { from: "/account" } }), 0);
    return null;
  }

  const onLogout = async () => {
    await logout();
    nav("/", { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Личный кабинет · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/account`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[900px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
          Личный кабинет · SSO
        </p>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-8">
          {user.full_name || user.email}
        </h1>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Профиль */}
          <section className="drawing-frame p-6 bg-[var(--drawing-bg)]">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="User" size={18} />
              <h2 className="font-gost-upright text-sm uppercase tracking-widest">Профиль</h2>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="font-gost text-[var(--drawing-line-thin)]">Email</dt>
                <dd className="font-mono break-all text-right">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="font-gost text-[var(--drawing-line-thin)]">Имя</dt>
                <dd className="text-right">{user.full_name || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="font-gost text-[var(--drawing-line-thin)]">Email подтверждён</dt>
                <dd className="text-right">{user.email_verified ? "✓ да" : "✗ нет"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="font-gost text-[var(--drawing-line-thin)]">Роли</dt>
                <dd className="text-right">{user.roles.join(", ") || "—"}</dd>
              </div>
            </dl>
          </section>

          {/* Подписки */}
          <section className="drawing-frame p-6 bg-[var(--drawing-bg)]">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="CreditCard" size={18} />
              <h2 className="font-gost-upright text-sm uppercase tracking-widest">Подписки</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-gost text-[var(--drawing-line-thin)] text-xs uppercase tracking-wider mb-1">
                  Наставничество
                </p>
                <p>
                  <Link to="/pricing" className="text-[var(--drawing-accent)] hover:underline">
                    Подобрать тариф &rarr;
                  </Link>
                </p>
              </div>
              <div>
                <p className="font-gost text-[var(--drawing-line-thin)] text-xs uppercase tracking-wider mb-1">
                  CAE-калькулятор
                </p>
                <p>
                  <Link to="/cae/projects" className="text-[var(--drawing-accent)] hover:underline">
                    Мои проекты &rarr;
                  </Link>
                </p>
                <p className="text-[var(--drawing-line-thin)] text-xs mt-1">
                  Каркас доступен. Редактор и&nbsp;решатель — скоро.
                </p>
              </div>
            </div>
          </section>

          {/* Быстрые ссылки */}
          <section className="drawing-frame p-6 bg-[var(--drawing-bg)] md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="Compass" size={18} />
              <h2 className="font-gost-upright text-sm uppercase tracking-widest">Навигация</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Link to="/cae/projects" className="border border-[var(--drawing-accent)] text-[var(--drawing-accent)] px-3 py-2 text-xs font-gost uppercase tracking-widest hover:bg-[var(--drawing-accent)] hover:text-white transition">
                Мои CAE-проекты
              </Link>
              <Link to="/blog" className="border border-[var(--drawing-line)] px-3 py-2 text-xs font-gost uppercase tracking-widest hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition">
                Инженерный журнал
              </Link>
              <Link to="/program" className="border border-[var(--drawing-line)] px-3 py-2 text-xs font-gost uppercase tracking-widest hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition">
                Программа
              </Link>
              <Link to="/contacts" className="border border-[var(--drawing-line)] px-3 py-2 text-xs font-gost uppercase tracking-widest hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition">
                Контакты
              </Link>
            </div>
          </section>
        </div>

        <div className="mt-8 text-center">
          <button onClick={onLogout} className="btn-drawing text-xs">
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </>
  );
};

export default Account;