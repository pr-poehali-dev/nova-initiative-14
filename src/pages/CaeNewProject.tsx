import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import { createProject } from "@/lib/cae";
import { saveProjectModel, emptyModel } from "@/lib/cae-model";
import TemplateGallery from "@/components/cae/TemplateGallery";
import { FRAME_TEMPLATES, type FrameTemplate } from "@/lib/cae-catalog";
import AlphaTestBanner from "@/components/AlphaTestBanner";

const CaeNewProject = () => {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  // 3D доступен только админам/владельцу. Прочий запрос ?type=3d игнорируем.
  const wants3d = params.get("type") === "3d";
  const is3d = wants3d && Boolean(user?.is_admin || user?.is_owner);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tpl, setTpl] = useState<FrameTemplate>(FRAME_TEMPLATES[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && !user) {
    setTimeout(() => nav("/login", { replace: true, state: { from: "/cae/projects/new" } }), 0);
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);

    const finalName = name.trim() || tpl.name;
    const r = await createProject({
      name: finalName,
      description: description.trim(),
      project_type: is3d ? "frame_3d" : "frame_2d",
    });

    if (!r.ok || !r.data?.project) {
      setError(r.message || "Не удалось создать проект");
      setCreating(false);
      return;
    }

    const proj = r.data.project;

    // 2D: шаблоны типовых схем. 3D: шаблонов пока нет — создаём пустую 3D-модель.
    if (is3d) {
      const sr = await saveProjectModel(proj.id, emptyModel("3d"), "Пустая 3D-модель");
      if (!sr.ok) {
        setError("Проект создан, но 3D-модель не инициализировалась.");
      }
    } else if (tpl.id !== "empty") {
      const model = tpl.build();
      const sr = await saveProjectModel(proj.id, model, `Из шаблона: ${tpl.name}`);
      if (!sr.ok) {
        setError("Проект создан, но шаблон не загрузился. Откроем пустой.");
      }
    }

    setCreating(false);
    nav(`/cae/projects/${proj.id}`, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Новый проект CAE · Диплом-Инж.рф</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1100px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <Link
          to="/cae/projects"
          className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
        >
          <Icon name="ArrowLeft" size={12} />
          К проектам
        </Link>

        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mt-4 mb-2">
          CAE · Создание проекта{is3d ? " · 3D" : ""}
        </p>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-2">
          {is3d ? "Новый 3D-проект" : "Новый проект"}
        </h1>
        <p className="text-sm text-[var(--drawing-line-thin)] mb-6">
          {is3d
            ? "Пространственная рама (6 степеней свободы на узел). Создаём пустую 3D-модель — узлы, стержни и нагрузки задаются в редакторе."
            : "Выберите шаблон типовой задачи или начните с\u00a0нуля. Шаблон создаст готовую расчётную схему с\u00a0опорами и\u00a0нагрузкой\u00a0— останется только посчитать."}
        </p>

        {is3d && (
          <div className="border-2 border-amber-700/50 bg-amber-50/30 p-4 mb-6 flex items-start gap-3">
            <Icon name="Lock" size={16} className="text-amber-700 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>Режим для администраторов.</strong> 3D-редактор пока доступен только админам и&nbsp;владельцу для проверки. Расчётное ядро верифицировано на эталонных задачах; визуальный 3D-редактор ещё дорабатывается.
            </p>
          </div>
        )}

        <AlphaTestBanner size="compact" className="mb-8" hideCta />

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
                Название проекта
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="drawing-input"
                placeholder={tpl.name}
                maxLength={200}
                autoFocus
              />
            </div>
            <div>
              <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
                Описание (необязательно)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="drawing-input"
                placeholder="Что считаем"
                maxLength={2000}
              />
            </div>
          </div>

          {!is3d && (
            <div>
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
                Шаблон расчётной схемы
              </p>
              <TemplateGallery selectedId={tpl.id} onSelect={setTpl} />
            </div>
          )}

          {error && (
            <div className="border-l-2 border-[var(--drawing-accent)] pl-3 py-2 text-sm text-[var(--drawing-accent)]">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--drawing-line-thin)]">
            <button
              type="submit"
              disabled={creating}
              className="btn-drawing btn-drawing-accent text-xs disabled:opacity-50"
            >
              {creating ? "Создаём…" : `Создать «${(name || tpl.name).slice(0, 30)}»`}
            </button>
            <Link to="/cae/projects" className="btn-drawing text-xs">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default CaeNewProject;