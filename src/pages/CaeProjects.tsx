import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import {
  listProjects,
  createProject,
  archiveProject,
  type CaeProject,
} from "@/lib/cae";

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
  const [showCreate, setShowCreate] = useState(false);

  // форма создания
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

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

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await createProject({
      name: name.trim(),
      description: description.trim(),
      project_type: "frame_3d",
    });
    setCreating(false);
    if (res.ok && res.data?.project) {
      setName("");
      setDescription("");
      setShowCreate(false);
      setProjects((prev) => [res.data!.project, ...prev]);
    } else {
      setError(res.message || res.error || "Не удалось создать проект");
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
              Бета-версия. Редактор и&nbsp;решатель — в&nbsp;разработке. Сейчас можно создавать и&nbsp;именовать проекты.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-drawing btn-drawing-accent text-xs shrink-0 self-start md:self-end"
          >
            <Icon name="Plus" size={14} className="mr-1.5" />
            Новый проект
          </button>
        </div>

        {/* Banner о бете */}
        <div className="border border-[var(--drawing-accent)] bg-[var(--drawing-bg)] p-4 mb-8 flex items-start gap-3">
          <Icon name="AlertCircle" size={18} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-gost-upright font-bold mb-1">CAE в&nbsp;разработке</p>
            <p className="text-[var(--drawing-line-thin)]">
              Сейчас вы&nbsp;видите каркас личного кабинета. Решатель Timoshenko FEM и&nbsp;3D-редактор появятся в&nbsp;ближайших обновлениях. <Link to="/cae" className="underline text-[var(--drawing-accent)]">Записаться в&nbsp;ранний доступ</Link>, чтобы первыми получить уведомление.
            </p>
          </div>
        </div>

        {/* Форма создания */}
        {showCreate && (
          <form
            onSubmit={onCreate}
            className="drawing-frame p-6 mb-8 bg-[var(--drawing-bg)] space-y-4"
          >
            <h2 className="font-gost-upright text-base font-bold uppercase tracking-wide mb-2">
              Новый проект
            </h2>
            <div>
              <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
                Название
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="drawing-input"
                placeholder="Рама редуктора"
                maxLength={200}
                autoFocus
              />
            </div>
            <div>
              <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
                Описание (необязательно)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="drawing-input"
                placeholder="Что считаем, кратко"
                maxLength={2000}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="btn-drawing btn-drawing-accent text-xs disabled:opacity-50"
              >
                {creating ? "Создаём…" : "Создать"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-drawing text-xs"
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Список */}
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
              Создайте первый проект, чтобы попробовать каркас CAE.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-drawing btn-drawing-accent text-xs">
              <Icon name="Plus" size={14} className="mr-1.5" />
              Создать проект
            </button>
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
                    {p.project_type === "frame_3d" ? "Рама 3D" : p.project_type}
                  </span>
                  <span className="font-gost text-[var(--drawing-line-thin)]">
                    {formatDate(p.updated_at)}
                  </span>
                </div>
                <p className="font-gost text-[10px] uppercase tracking-[0.2em] mt-3 text-[var(--drawing-line-thin)] opacity-70">
                  Редактор будет доступен после релиза
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default CaeProjects;
