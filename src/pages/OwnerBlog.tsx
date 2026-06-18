/**
 * Раздел маркетинга «Статьи для блогов» (/owner/blog).
 *
 * Закрытое хранилище статей владельца для блог-площадок (Яндекс Дзен и др.):
 * слева список статей, справа — редактор с метаданными (обложка-эмодзи,
 * заголовок, подзаголовок, площадка, теги, статус) и текстом в простой
 * разметке. Есть превью «как в Дзене». Доступ только владельцу (is_owner),
 * страница закрыта от индексации.
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import {
  listBlogArticles,
  getBlogArticle,
  createBlogArticle,
  saveBlogArticle,
  deleteBlogArticle,
  articleStats,
  BLOG_STATUS_LABELS,
  BLOG_PLATFORM_LABELS,
  type BlogArticleMeta,
  type BlogStatus,
  type BlogPlatform,
} from "@/lib/blog";

/** Лёгкий рендер разметки статьи для превью «как в Дзене». */
function renderMarkup(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.+?)\*/g, "<i>$1</i>");
  const lines = text.split(/\n/);
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (line.startsWith("## ")) { closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("# ")) { closeList(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (/^[-•]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(line.replace(/^[-•]\s+/, ""))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

const OwnerBlog = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [articles, setArticles] = useState<BlogArticleMeta[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);

  // Редактор.
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [coverEmoji, setCoverEmoji] = useState("📝");
  const [platform, setPlatform] = useState<BlogPlatform>("dzen");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<BlogStatus>("draft");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);

  const stats = useMemo(() => articleStats(content), [content]);

  const reloadList = useCallback(async () => {
    setLoadingList(true);
    const r = await listBlogArticles();
    setLoadingList(false);
    if (r.ok && r.data) setArticles(r.data.articles);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/login", { replace: true, state: { from: "/owner/blog" } }); return; }
    if (!user.is_owner) { nav("/account", { replace: true }); return; }
    reloadList();
  }, [user, loading, nav, reloadList]);

  const openArticle = useCallback(async (id: number) => {
    setBusy(true);
    const r = await getBlogArticle(id);
    setBusy(false);
    if (r.ok && r.data) {
      const a = r.data.article;
      setActiveId(id);
      setTitle(a.title);
      setSubtitle(a.subtitle);
      setCoverEmoji(a.cover_emoji || "📝");
      setPlatform(a.platform);
      setTags(a.tags);
      setStatus(a.status);
      setContent(a.content);
      setMsg(null);
      setDirty(false);
      setPreview(false);
    }
  }, []);

  const onCreate = async () => {
    setBusy(true);
    const r = await createBlogArticle({ title: "Новая статья", platform: "dzen", cover_emoji: "📝" });
    setBusy(false);
    if (r.ok && r.data) {
      await reloadList();
      openArticle(r.data.id);
    }
  };

  const onSave = async () => {
    if (activeId == null) return;
    setBusy(true);
    const r = await saveBlogArticle({
      id: activeId, title, subtitle, cover_emoji: coverEmoji, platform, tags, status, content,
    });
    setBusy(false);
    if (r.ok) {
      setMsg("Сохранено");
      setDirty(false);
      reloadList();
    } else {
      setMsg(r.message || "Не удалось сохранить");
    }
  };

  const onDelete = async () => {
    if (activeId == null) return;
    if (!confirm("Удалить статью? Действие необратимо.")) return;
    setBusy(true);
    const r = await deleteBlogArticle(activeId);
    setBusy(false);
    if (r.ok) {
      setActiveId(null);
      reloadList();
    }
  };

  const touch = () => setDirty(true);

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }
  if (!user || !user.is_owner) return null;

  return (
    <>
      <Helmet>
        <title>Статьи для блогов · Владелец · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/owner/blog`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1280px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Владелец · Маркетинг
          </p>
          <Link to="/account" className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1">
            <Icon name="ArrowLeft" size={12} />В кабинет
          </Link>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-4">
          Статьи для блогов
        </h1>

        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          {/* ── Список статей ── */}
          <div className="space-y-3">
            <button onClick={onCreate} disabled={busy} className={`btn-drawing btn-drawing-accent text-xs w-full inline-flex items-center justify-center gap-1 ${busy ? "opacity-50 pointer-events-none" : ""}`}>
              <Icon name="Plus" size={14} />Новая статья
            </button>
            {loadingList ? (
              <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] py-4 text-center">Загружаем список…</p>
            ) : articles.length === 0 ? (
              <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] py-4 text-center">Пока нет ни одной статьи</p>
            ) : (
              <ul className="space-y-1">
                {articles.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => openArticle(a.id)}
                      className={`w-full text-left border-[1.5px] p-2.5 transition-colors ${
                        activeId === a.id
                          ? "border-[var(--drawing-accent)] bg-[var(--drawing-paper)]"
                          : "border-[var(--drawing-line)]/50 hover:border-[var(--drawing-accent)]"
                      }`}
                    >
                      <p className="font-gost-upright font-bold text-sm truncate">
                        <span className="mr-1">{a.cover_emoji}</span>{a.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-accent)]">
                          {BLOG_STATUS_LABELS[a.status]}
                        </span>
                        <span className="font-mono text-[9px] text-[var(--drawing-line-thin)]">
                          {BLOG_PLATFORM_LABELS[a.platform]} · {a.chars.toLocaleString("ru-RU")} зн.
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Редактор ── */}
          <div className="min-w-0">
            {activeId == null ? (
              <div className="border-2 border-dashed border-[var(--drawing-line)]/40 p-10 text-center">
                <Icon name="PenSquare" size={28} className="mx-auto mb-2 text-[var(--drawing-line-thin)]" />
                <p className="font-gost text-sm text-[var(--drawing-line-thin)]">
                  Выберите статью слева или создайте новую
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Метаданные */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={coverEmoji}
                    onChange={(e) => { setCoverEmoji(e.target.value.slice(0, 4)); touch(); }}
                    className="drawing-input w-14 text-center text-xl"
                    aria-label="Обложка-эмодзи"
                  />
                  <input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); touch(); }}
                    placeholder="Заголовок статьи"
                    className="drawing-input flex-1 min-w-[200px] font-gost-upright font-bold text-lg"
                  />
                </div>
                <input
                  value={subtitle}
                  onChange={(e) => { setSubtitle(e.target.value); touch(); }}
                  placeholder="Подзаголовок / лид (1–2 предложения)"
                  className="drawing-input w-full text-sm"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <select value={platform} onChange={(e) => { setPlatform(e.target.value as BlogPlatform); touch(); }} className="drawing-input">
                    {(Object.keys(BLOG_PLATFORM_LABELS) as BlogPlatform[]).map((p) => (
                      <option key={p} value={p}>{BLOG_PLATFORM_LABELS[p]}</option>
                    ))}
                  </select>
                  <select value={status} onChange={(e) => { setStatus(e.target.value as BlogStatus); touch(); }} className="drawing-input">
                    {(Object.keys(BLOG_STATUS_LABELS) as BlogStatus[]).map((s) => (
                      <option key={s} value={s}>{BLOG_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <input
                    value={tags}
                    onChange={(e) => { setTags(e.target.value); touch(); }}
                    placeholder="Теги через запятую"
                    className="drawing-input flex-1 min-w-[160px] text-sm"
                  />
                </div>

                {/* Тулбар */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex border border-[var(--drawing-line)]/40">
                    <button onClick={() => setPreview(false)} className={`font-gost text-xs uppercase tracking-wider px-3 py-1.5 inline-flex items-center gap-1 ${!preview ? "bg-[var(--drawing-accent)] text-white" : "text-[var(--drawing-line-thin)]"}`}>
                      <Icon name="PencilLine" size={13} />Редактор
                    </button>
                    <button onClick={() => setPreview(true)} className={`font-gost text-xs uppercase tracking-wider px-3 py-1.5 inline-flex items-center gap-1 ${preview ? "bg-[var(--drawing-accent)] text-white" : "text-[var(--drawing-line-thin)]"}`}>
                      <Icon name="Eye" size={13} />Превью Дзен
                    </button>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--drawing-line-thin)]">
                    {stats.words.toLocaleString("ru-RU")} слов · ~{stats.readMin} мин чтения
                  </span>
                  <div className="flex-1" />
                  <button onClick={onSave} disabled={busy} className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1 ${busy ? "opacity-50 pointer-events-none" : ""}`}>
                    <Icon name="Save" size={14} />Сохранить
                  </button>
                  <button onClick={onDelete} disabled={busy} className="btn-drawing text-xs inline-flex items-center gap-1 text-red-600">
                    <Icon name="Trash2" size={14} />Удалить
                  </button>
                </div>
                {dirty && <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-accent)]">Есть несохранённые изменения</p>}
                {msg && <p className="font-gost text-[11px] text-[var(--drawing-line-thin)]">{msg}</p>}

                {preview ? (
                  <article className="border-2 border-[var(--drawing-line)] bg-white p-6 md:p-10 max-w-[760px] mx-auto">
                    <div className="text-5xl mb-4">{coverEmoji}</div>
                    <h1 className="text-2xl md:text-3xl font-black mb-2 leading-tight">{title}</h1>
                    {subtitle && <p className="text-base text-neutral-500 mb-5">{subtitle}</p>}
                    <div
                      className="dzen-preview text-[17px] leading-[1.7] text-neutral-800"
                      dangerouslySetInnerHTML={{ __html: renderMarkup(content) }}
                    />
                    {tags && (
                      <p className="mt-6 text-sm text-blue-600">
                        {tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => `#${t}`).join("  ")}
                      </p>
                    )}
                  </article>
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => { setContent(e.target.value); touch(); }}
                    placeholder="Текст статьи. Поддерживается: ## Подзаголовок, **жирный**, *курсив*, списки через «- ». Пустая строка — новый абзац."
                    rows={26}
                    className="drawing-input w-full resize-y text-sm leading-relaxed"
                    style={{ fontStyle: "normal" }}
                  />
                )}
                <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
                  Разметка: <code>## Подзаголовок</code>, <code>**жирный**</code>, <code>*курсив*</code>, списки <code>- пункт</code>. Хранение на сервере, доступ только владельцу.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OwnerBlog;
