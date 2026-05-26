import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import { listProjects, archiveProject, type CaeProject } from "@/lib/cae";

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
            <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide">
              Мои проекты
            </h1>
            <p className="text-sm text-[var(--drawing-line-thin)] mt-2">
              2D-редактор с&nbsp;каталогом ГОСТ-профилей и&nbsp;конечно-элементным решателем. Создайте проект из&nbsp;шаблона или с&nbsp;нуля.
            </p>
          </div>
          <Link
            to="/cae/projects/new"
            className="btn-drawing btn-drawing-accent text-xs shrink-0 self-start md:self-end inline-flex"
          >
            <Icon name="Plus" size={14} className="mr-1.5" />
            Новый проект
          </Link>
        </div>

        {/* Banner */}
        <div className="border border-[var(--drawing-accent)] bg-[var(--drawing-bg)] p-4 mb-8 flex items-start gap-3">
          <Icon name="Sparkles" size={18} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-gost-upright font-bold mb-1">Новое: каталоги и шаблоны</p>
            <p className="text-[var(--drawing-line-thin)]">
              Доступны каталоги ГОСТ-сталей и&nbsp;сечений (двутавры, швеллеры, уголки, трубы), параметрические сечения и&nbsp;10 шаблонов типовых задач. 3D-редактор и&nbsp;PDF-отчёт по&nbsp;ЕСКД &mdash; на&nbsp;подходе.
            </p>
          </div>
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
    </>
  );
};

export default CaeProjects;