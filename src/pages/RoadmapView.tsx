import { Helmet } from "@/lib/helmet-shim";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRoadmap,
  STATUS_META,
  roadmapStats,
  type RoadmapStatus,
} from "@/lib/roadmaps";

/**
 * ВНУТРЕННЯЯ страница-просмотрщик любой дорожной карты по slug
 * (/roadmaps/:slug). Доступна ТОЛЬКО администратору и владельцу — вход из
 * личного кабинета. Скрыта от поисковых роботов (noindex,nofollow).
 *
 * Данные всех карт лежат в едином реестре src/lib/roadmaps.ts.
 */
export default function RoadmapView() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { slug } = useParams();
  const rm = getRoadmap(slug);

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }

  // Доступ только администратору или владельцу продукта.
  if (!user || (!user.is_admin && !user.is_owner)) {
    setTimeout(() => nav("/account", { replace: true }), 0);
    return null;
  }

  if (!rm) {
    return (
      <div className="max-w-[800px] mx-auto px-4 pt-24 pb-16 text-center">
        <Icon name="MapPinOff" size={32} className="text-[var(--drawing-line-thin)] mx-auto mb-3" />
        <p className="font-gost-upright font-bold mb-2">Карта не найдена</p>
        <Link to="/account" className="text-[var(--drawing-accent)] hover:underline text-sm">
          ← Вернуться в кабинет
        </Link>
      </div>
    );
  }

  const stats = roadmapStats(rm);

  return (
    <>
      <Helmet>
        <title>{rm.title} · внутренняя дорожная карта · Диплом-Инж.рф</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[880px] mx-auto px-4 pt-20 md:pt-24 pb-16 overflow-x-hidden">
        <Link
          to="/account"
          className="inline-flex items-center gap-1 font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] mb-4"
        >
          <Icon name="ArrowLeft" size={12} /> Все дорожные карты
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 bg-[var(--drawing-line)] text-[var(--drawing-bg)] px-2 py-0.5 font-gost text-[10px] uppercase tracking-wider">
            <Icon name="Lock" size={11} /> Внутренний документ
          </span>
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            {rm.eyebrow}
          </p>
        </div>

        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-3 break-words">
          {rm.title}
        </h1>
        <p className="text-sm text-[var(--drawing-line-thin)] mb-4 leading-relaxed max-w-2xl">
          {rm.description}
        </p>

        {/* Пометка с расположением исходного файла */}
        <div className="flex flex-wrap items-center gap-3 mb-8 text-xs font-gost max-w-full">
          <span className="inline-flex items-start gap-1.5 border border-[var(--drawing-line)]/40 px-2 py-1 text-[var(--drawing-line-thin)] max-w-full min-w-0">
            <Icon name="FileCode" size={12} className="shrink-0 mt-0.5" />
            <span className="min-w-0">
              Источник:&nbsp;
              <code className="font-mono text-[var(--drawing-line)] break-all">{rm.source}</code>
            </span>
          </span>
          <span className="inline-flex items-center gap-1 border border-green-700 text-green-700 px-2 py-1 uppercase tracking-wider shrink-0">
            <Icon name="CheckCircle2" size={12} /> Готово: {stats.done}/{stats.total}
          </span>
        </div>

        <div className="space-y-10">
          {rm.phases.map((phase) => (
            <section key={phase.key} id={phase.key}>
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0 w-9 h-9 border-2 border-[var(--drawing-line)] flex items-center justify-center bg-[var(--drawing-bg)]">
                  <Icon name={phase.icon} size={18} fallback="Circle" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-gost-upright font-bold text-base md:text-lg break-words">
                      {phase.title}
                    </h2>
                    <span className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] border border-[var(--drawing-line-thin)] px-1.5 py-0.5 shrink-0">
                      {phase.horizon}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed mt-1 break-words">
                    {phase.summary}
                  </p>
                </div>
              </div>

              <ul className="ml-12 space-y-2">
                {phase.tasks.map((task, j) => {
                  const meta = STATUS_META[task.status as RoadmapStatus];
                  return (
                    <li
                      key={`${phase.key}-${j}`}
                      className="border-l-2 border-[var(--drawing-line)]/20 pl-3 py-0.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-gost-upright font-bold text-sm break-words min-w-0">
                          {task.title}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-gost text-[9px] uppercase tracking-wider border px-1.5 py-0.5 shrink-0 ${meta.cls}`}
                        >
                          <Icon name={meta.icon} size={10} fallback="Circle" />
                          {meta.label}
                        </span>
                      </div>
                      {task.note && (
                        <p className="text-[13px] text-[var(--drawing-line-thin)] leading-snug mt-0.5 break-words">
                          {task.note}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-[var(--drawing-line)]/20 pt-6">
          <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed">
            Есть идея или приоритет? Предложения по развитию принимаем через
            обращения в кабинете — авторам полезных идей начисляем баллы.
          </p>
          <Link
            to="/account"
            className="btn-drawing text-xs inline-flex items-center mt-3 border-[var(--drawing-accent)] text-[var(--drawing-accent)]"
          >
            <Icon name="Lightbulb" size={14} className="mr-1.5" />
            Предложить идею
          </Link>
        </div>
      </div>
    </>
  );
}