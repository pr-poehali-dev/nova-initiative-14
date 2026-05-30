import { useEffect, useState } from "react";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { SITE_URL } from "@/lib/seo";
import { useAuth } from "@/contexts/AuthContext";
import {
  listChangelog,
  createChangelogEntry,
  type ChangelogEntry,
  type ChangelogCategory,
} from "@/lib/notifications";

const CATEGORY_META: Record<
  ChangelogCategory,
  { label: string; icon: string; cls: string }
> = {
  feature: { label: "Новое", icon: "Sparkles", cls: "text-[var(--drawing-accent)] border-[var(--drawing-accent)]" },
  improvement: { label: "Улучшение", icon: "TrendingUp", cls: "text-green-700 border-green-700" },
  fix: { label: "Исправление", icon: "Wrench", cls: "text-amber-700 border-amber-700" },
  breaking: { label: "Важно", icon: "TriangleAlert", cls: "text-red-700 border-red-700" },
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }) : "";

export default function CaeChangelog() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    listChangelog(100)
      .then((res) => {
        if (res.ok && res.data) setEntries(res.data.changelog);
      })
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  return (
    <>
      <Helmet>
        <title>Журнал версий CAE · обновления расчётного сервиса · Диплом-Инж.рф</title>
        <meta
          name="description"
          content="История обновлений облачного CAE-сервиса Диплом-Инж.рф: новые функции расчёта рам, исправления решателя, улучшения интерфейса. Прозрачное развитие инженерного инструмента для ВКР и экспертизы."
        />
        <link rel="canonical" href={`${SITE_URL}/cae/changelog`} />
      </Helmet>

      <div className="max-w-[820px] mx-auto px-4 pt-20 md:pt-24 pb-16">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2">
          CAE · Журнал версий
        </p>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-3">
          Что нового в расчётном сервисе
        </h1>
        <p className="text-sm text-[var(--drawing-line-thin)] mb-8 leading-relaxed max-w-2xl">
          Мы открыто ведём учёт каждой версии: новые функции, исправления решателя
          и улучшения интерфейса. Так инженеру видно, как развивается инструмент и
          какие задачи он уже умеет решать.
        </p>

        {user?.is_admin && <AdminAddEntry onAdded={refresh} />}

        {loading ? (
          <p className="font-gost text-xs uppercase tracking-wider text-[var(--drawing-line-thin)] py-10 text-center">
            Загружаем…
          </p>
        ) : entries.length === 0 ? (
          <p className="font-gost text-xs uppercase tracking-wider text-[var(--drawing-line-thin)] py-10 text-center">
            Записей пока нет
          </p>
        ) : (
          <ol className="relative border-l-2 border-[var(--drawing-line)]/30 ml-2">
            {entries.map((e) => {
              const meta = CATEGORY_META[e.category] || CATEGORY_META.feature;
              return (
                <li key={e.id} className="mb-8 ml-6">
                  <span className="absolute -left-[9px] w-4 h-4 bg-[var(--drawing-bg)] border-2 border-[var(--drawing-accent)] rounded-full" />
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-gost-upright font-black text-[15px] text-[var(--drawing-accent)]">
                      v{e.version}
                    </span>
                    <span className={`inline-flex items-center gap-1 font-gost text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${meta.cls}`}>
                      <Icon name={meta.icon} size={10} fallback="Sparkles" />
                      {meta.label}
                    </span>
                    <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] ml-auto">
                      {formatDate(e.released_at)}
                    </span>
                  </div>
                  <h2 className="font-gost-upright font-bold text-base mb-1">{e.title}</h2>
                  {e.body && (
                    <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed whitespace-pre-wrap">
                      {e.body}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}

function AdminAddEntry({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ChangelogCategory>("feature");
  const [body, setBody] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!version.trim() || !title.trim()) return;
    setSaving(true);
    const res = await createChangelogEntry({ version, title, category, body, notify });
    setSaving(false);
    if (res.ok) {
      setVersion("");
      setTitle("");
      setBody("");
      setOpen(false);
      onAdded();
    } else {
      alert(res.message || "Не удалось сохранить");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-drawing text-xs inline-flex mb-8 border-[var(--drawing-accent)] text-[var(--drawing-accent)]"
      >
        <Icon name="Plus" size={13} className="mr-1.5" />
        Добавить версию
      </button>
    );
  }

  return (
    <div className="border-2 border-[var(--drawing-accent)] p-4 mb-8 space-y-3">
      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] font-bold">
        Новая запись журнала
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="Версия, напр. 1.5.20"
          className="drawing-input text-sm bg-[var(--drawing-bg)] text-[var(--drawing-line)]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ChangelogCategory)}
          className="drawing-input text-sm bg-[var(--drawing-bg)] text-[var(--drawing-line)]"
        >
          {(Object.keys(CATEGORY_META) as ChangelogCategory[]).map((c) => (
            <option key={c} value={c} className="bg-[var(--drawing-bg)] text-[var(--drawing-line)]">
              {CATEGORY_META[c].label}
            </option>
          ))}
        </select>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Заголовок"
        className="drawing-input text-sm w-full bg-[var(--drawing-bg)] text-[var(--drawing-line)]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Описание (что именно изменилось)"
        rows={3}
        className="drawing-input text-sm w-full bg-[var(--drawing-bg)] text-[var(--drawing-line)]"
      />
      <label className="flex items-center gap-2 text-xs text-[var(--drawing-line)] cursor-pointer">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Уведомить всех пользователей (колокольчик)
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="btn-drawing btn-drawing-accent text-xs disabled:opacity-50"
        >
          {saving ? "Сохраняем…" : "Опубликовать"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-drawing text-xs">
          Отмена
        </button>
      </div>
    </div>
  );
}
