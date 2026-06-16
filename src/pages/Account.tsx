import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import PointsAchievementsBlock from "@/components/account/PointsAchievementsBlock";
import MyTicketsBlock from "@/components/account/MyTicketsBlock";
import LoginMethodsBlock from "@/components/account/LoginMethodsBlock";
import DisciplinePreferenceBlock from "@/components/account/DisciplinePreferenceBlock";
import ProfileEditBlock from "@/components/account/ProfileEditBlock";
import SubscriptionBlock from "@/components/account/SubscriptionBlock";
import RoadmapsBlock from "@/components/account/RoadmapsBlock";
import InDevelopmentBlock from "@/components/account/InDevelopmentBlock";
import AdminPanel from "@/components/account/AdminPanel";
import InviteFriendModal from "@/components/cae/InviteFriendModal";
import SupportTicketModal from "@/components/SupportTicketModal";

const Account = () => {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

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

      <div className="max-w-[900px] mx-auto px-4 pt-20 md:pt-24 pb-12 overflow-x-hidden">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
          Личный кабинет · SSO
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide">
            {user.full_name || user.email}
          </h1>
          {user.is_admin && (
            <span className="inline-flex items-center gap-1 bg-[var(--drawing-accent)] text-white px-2 py-0.5 font-gost text-[10px] uppercase tracking-wider">
              <Icon name="ShieldCheck" size={11} />
              Администратор
            </span>
          )}
          {user.is_owner && (
            <span className="inline-flex items-center gap-1 bg-[var(--drawing-line)] text-white px-2 py-0.5 font-gost text-[10px] uppercase tracking-wider">
              <Icon name="Crown" size={11} />
              Владелец
            </span>
          )}
        </div>

        {/* Админ-панель — только для is_admin */}
        {user.is_admin && <AdminPanel />}

        {/* Дорожные карты — для администратора и владельца */}
        {(user.is_admin || user.is_owner) && <RoadmapsBlock />}

        {/* В разработке — внутренние сервисы, только владелец */}
        {user.is_owner && <InDevelopmentBlock />}

        {/* Моя подписка — реальный статус доступа */}
        <SubscriptionBlock />

        {/* Мои проекты — отдельный блок */}
        <section className="drawing-frame p-6 bg-[var(--drawing-bg)] mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Icon name="FolderKanban" size={18} />
              <h2 className="font-gost-upright text-sm uppercase tracking-widest">Мои проекты</h2>
            </div>
            <Link
              to="/cae/projects"
              className="btn-drawing btn-drawing-accent text-xs inline-flex items-center"
            >
              <Icon name="ArrowRight" size={13} className="mr-1.5" />
              Открыть проекты
            </Link>
          </div>
          <p className="text-sm text-[var(--drawing-line-thin)] leading-snug">
            Расчётные схемы балок и&nbsp;рам, история расчётов и&nbsp;PDF-отчёты по&nbsp;ЕСКД&nbsp;— всё в&nbsp;разделе CAE-проектов.
          </p>
        </section>

        {/* Инженерная школа (машиностроение / строительство) */}
        <DisciplinePreferenceBlock />

        {/* Очки и ачивки */}
        <PointsAchievementsBlock onInvite={() => setInviteOpen(true)} />

        {/* Мои обращения в техподдержку */}
        <MyTicketsBlock onNewTicket={() => setSupportOpen(true)} />

        <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
          {/* Профиль — редактирование имени и смена пароля */}
          <ProfileEditBlock />

          {/* Способы входа */}
          <LoginMethodsBlock />

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

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => setSupportOpen(true)} className="btn-drawing text-xs inline-flex">
            <Icon name="LifeBuoy" size={13} className="mr-1.5" />
            Сообщить о проблеме
          </button>
          <button onClick={onLogout} className="btn-drawing text-xs">
            Выйти из аккаунта
          </button>
        </div>
      </div>

      <InviteFriendModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <SupportTicketModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        defaultKind="other"
      />
    </>
  );
};

export default Account;