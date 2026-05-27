import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import { listProjects, archiveProject, type CaeProject } from "@/lib/cae";
import Notify3DForm from "@/components/cae/Notify3DForm";
import InviteFriendModal from "@/components/cae/InviteFriendModal";

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const CaeProjects = () => {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState<CaeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav("/login", { replace: true, state: { from: "/cae/projects" } });
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const refresh = async () => {
    setLoading(true);
    const res = await listProjects();
    setLoading(false);
    if (res.ok && res.data) {
      setProjects(res.data.projects);
      setError(null);
    } else {
      setError(res.message || res.error || "Не удалось загрузить проекты");
    }
  };

  const onArchive = async (p: CaeProject) => {
    if (!confirm(`Архивировать проект «${p.name}»?`)) return;
    const res = await archiveProject(p.id);
    if (res.ok) {
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
    } else {
      alert(res.message || res.error || "Не удалось архивировать");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-[800px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Мои проекты CAE · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/cae/projects`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1100px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2">
              CAE · Личный кабинет проектов
            </p>
            <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide flex flex-wrap items-center gap-3">
              Мои проекты
              <span className="inline-flex items-center gap-1 bg-[var(--drawing-accent)] text-white px-2 py-0.5 font-gost text-[10px] uppercase tracking-wider font-normal">
                <Icon name="FlaskConical" size={10} />
                Альфа-тест · бесплатно
              </span>
            </h1>
            <p className="text-sm text-[var(--drawing-line-thin)] mt-2">
              2D-редактор с&nbsp;каталогом ГОСТ-профилей и&nbsp;конечно-элементным решателем. Создайте проект из&nbsp;шаблона или с&nbsp;нуля.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-start md:self-end">
            <Link
              to="/cae/projects/new"
              className="btn-drawing btn-drawing-accent text-xs inline-flex"
            >
              <Icon name="Plus" size={14} className="mr-1.5" />
              Создать 2D
            </Link>
            <button
              disabled
              className="btn-drawing text-xs inline-flex opacity-50 cursor-not-allowed"
              title="3D-редактор в разработке — верификация расчётов на эталонных задачах ещё не пройдена"
            >
              <Icon name="Box" size={14} className="mr-1.5" />
              Создать 3D
              <span className="ml-1.5 font-gost text-[9px] uppercase tracking-wider text-amber-700">скоро</span>
            </button>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="btn-drawing text-xs inline-flex border-[var(--drawing-accent)] text-[var(--drawing-accent)] hover:bg-[var(--drawing-accent)] hover:text-white transition-colors"
              title="Получите +10 баллов за каждого друга и +1 балл за день его активности"
            >
              <Icon name="UserPlus" size={14} className="mr-1.5" />
              Пригласить друга
            </button>
          </div>
        </div>

        {/* Счётчики использования */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
              Проектов создано
            </p>
            <p className="font-gost-upright text-lg font-black flex items-baseline gap-1.5">
              {projects.length}
              <span className="font-gost text-[10px] font-normal uppercase tracking-wider text-[var(--drawing-accent)]">
                / ∞
              </span>
            </p>
          </div>
          <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
              Расчётов в&nbsp;мес.
            </p>
            <p className="font-gost-upright text-lg font-black flex items-baseline gap-1.5">
              <span className="font-gost text-[10px] font-normal uppercase tracking-wider text-[var(--drawing-accent)]">
                Безлимит
              </span>
            </p>
          </div>
          <div className="border-2 border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 p-3 col-span-2 md:col-span-1">
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
              Тариф
            </p>
            <p className="font-gost-upright text-lg font-black flex items-center gap-2 text-[var(--drawing-accent)]">
              <Icon name="FlaskConical" size={16} />
              Альфа-тест
            </p>
          </div>
        </div>

        {/* Баннер альфа-теста */}
        <div className="border-2 border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 p-4 mb-8 flex items-start gap-3">
          <Icon name="FlaskConical" size={18} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
          <div className="text-sm flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center bg-[var(--drawing-accent)] text-white px-2 py-0.5 font-gost text-[10px] uppercase tracking-wider">
                Альфа-тест
              </span>
              <p className="font-gost-upright font-bold">
                Все расчёты бесплатно
              </p>
            </div>
            <p className="text-[var(--drawing-line-thin)]">
              Сервис в&nbsp;режиме альфа-тестирования. Лимиты на&nbsp;проекты, элементы и&nbsp;количество расчётов сняты&nbsp;&mdash; все функции открыты бесплатно. Помогите нам улучшить сервис&nbsp;&mdash; присылайте обратную связь в&nbsp;Telegram.
            </p>
          </div>
        </div>

        {/* Banner — каталоги */}
        <div className="border border-[var(--drawing-accent)] bg-[var(--drawing-bg)] p-4 mb-8 flex items-start gap-3">
          <Icon name="Sparkles" size={18} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-gost-upright font-bold mb-1">Новое: каталоги и шаблоны</p>
            <p className="text-[var(--drawing-line-thin)]">
              Доступны каталоги ГОСТ-сталей и&nbsp;сечений (двутавры, швеллеры, уголки, трубы), параметрические сечения и&nbsp;10 шаблонов типовых задач. 3D-редактор и&nbsp;PDF-отчёт по&nbsp;ЕСКД &mdash; на&nbsp;подходе.
            </p>
          </div>
        </div>

        {/* Тизер 3D-редактора */}
        <div className="border-2 border-dashed border-amber-700/40 bg-amber-50/30 p-5 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 w-9 h-9 border-2 border-amber-700/50 flex items-center justify-center mt-0.5">
              <Icon name="Box" size={18} className="text-amber-700" />
            </div>
            <div>
              <p className="font-gost-upright font-bold text-sm mb-1">
                3D-редактор пространственных рам — в разработке
              </p>
              <p className="text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                МКЭ-расчёт пространственных рам с эпюрами N, Qy, Qz, Mz, My, Mx и проверками
                по&nbsp;СП&nbsp;16. Сейчас проходим верификацию на эталонных задачах.
                Оставьте email — напишем первыми, когда откроем доступ.
              </p>
            </div>
          </div>
          <Notify3DForm variant="compact" />
        </div>

        {loading ? (
          <p className="text-center font-gost text-[var(--drawing-line-thin)] py-10">Загружаем…</p>
        ) : error ? (
          <p className="text-center text-[var(--drawing-accent)] py-10">{error}</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[var(--drawing-line-thin)]">
            <Icon
              name="FolderOpen"
              size={48}
              className="mx-auto text-[var(--drawing-line-thin)] opacity-50 mb-3"
            />
            <p className="font-gost-upright font-bold mb-2">Проектов пока нет</p>
            <p className="text-sm text-[var(--drawing-line-thin)] mb-5">
              Создайте первый проект, чтобы попробовать CAE.
            </p>
            <Link to="/cae/projects/new" className="btn-drawing btn-drawing-accent text-xs inline-flex">
              <Icon name="Plus" size={14} className="mr-1.5" />
              Создать проект
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-5 group hover:border-[var(--drawing-accent)] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-gost-upright text-lg font-bold flex-1 break-words">{p.name}</h3>
                  <button
                    onClick={() => onArchive(p)}
                    className="text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] p-1 -mr-1 shrink-0"
                    title="Архивировать"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                </div>
                {p.description && (
                  <p className="text-sm text-[var(--drawing-line-thin)] mb-3 leading-relaxed">
                    {p.description}
                  </p>
                )}
                <div className="extension-line-h w-full my-3" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-gost text-[var(--drawing-line-thin)] uppercase tracking-wider">
                    {p.project_type === "frame_3d" ? (
                      <>
                        Рама 3D{" "}
                        <span
                          className="text-amber-700 normal-case"
                          title="3D-режим в разработке — аналитическая верификация ещё не пройдена. Для дипломных расчётов используйте 2D."
                        >
                          (в разработке)
                        </span>
                      </>
                    ) : p.project_type === "frame_2d" ? (
                      "Рама 2D"
                    ) : (
                      p.project_type
                    )}
                  </span>
                  <span className="font-gost text-[var(--drawing-line-thin)]">
                    {formatDate(p.updated_at)}
                  </span>
                </div>
                <Link
                  to={`/cae/projects/${p.id}`}
                  className="block mt-3 font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] hover:underline"
                >
                  Открыть в&nbsp;редакторе&nbsp;&rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <InviteFriendModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
};

export default CaeProjects;