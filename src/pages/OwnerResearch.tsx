/**
 * Раздел НИР владельца (/owner/research).
 *
 * Слева — список научно-исследовательских работ. Справа — современный
 * структурированный редактор НИР по ГОСТ 7.32-2017 с дорожной картой
 * прогресса, настройками оформления (модалка) и формирователем отчёта в
 * Word/PDF (в т.ч. рамка по ЕСКД). Сервер хранит документ как JSON и ведёт
 * историю версий: каждое «Сохранить» создаёт новую версию. Доступ только
 * владельцу (is_owner), страница закрыта от индексации.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import NirEditor from "@/components/owner/NirEditor";
import {
  listResearch,
  getResearch,
  createResearch,
  saveResearch,
  listResearchVersions,
  getResearchVersionContent,
  RESEARCH_STATUS_LABELS,
  type ResearchPaperMeta,
  type ResearchVersion,
  type ResearchStatus,
} from "@/lib/research";
import {
  type NirDocument,
  createNirDocument,
  parseNirDocument,
  serializeNirDocument,
} from "@/lib/nir";

const OwnerResearch = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [papers, setPapers] = useState<ResearchPaperMeta[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);

  // Документ НИР.
  const [docState, setDocState] = useState<NirDocument>(createNirDocument());
  const [status, setStatus] = useState<ResearchStatus>("draft");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // История версий.
  const [versions, setVersions] = useState<ResearchVersion[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const reloadList = useCallback(async () => {
    setLoadingList(true);
    const r = await listResearch();
    setLoadingList(false);
    if (r.ok && r.data) setPapers(r.data.papers);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav("/login", { replace: true, state: { from: "/owner/research" } });
      return;
    }
    if (!user.is_owner) {
      nav("/account", { replace: true });
      return;
    }
    reloadList();
  }, [user, loading, nav, reloadList]);

  const openPaper = useCallback(async (id: number) => {
    setBusy(true);
    const r = await getResearch(id);
    setBusy(false);
    if (r.ok && r.data) {
      setActiveId(id);
      setDocState(parseNirDocument(r.data.paper.content));
      setStatus(r.data.paper.status);
      setNote("");
      setMsg(null);
      setDirty(false);
      setVersionsOpen(false);
    }
  }, []);

  const onCreate = async () => {
    setBusy(true);
    const r = await createResearch("Новая НИР");
    setBusy(false);
    if (r.ok && r.data) {
      await reloadList();
      openPaper(r.data.id);
    }
  };

  const onSave = async () => {
    if (activeId == null) return;
    setBusy(true);
    const title = (docState.titleMeta.topic || "Без названия").slice(0, 300);
    const r = await saveResearch({
      id: activeId,
      title,
      content: serializeNirDocument(docState),
      status,
      note,
    });
    setBusy(false);
    if (r.ok && r.data) {
      setMsg(`Сохранено · версия ${r.data.version_no}`);
      setNote("");
      setDirty(false);
      reloadList();
    } else {
      setMsg(r.message || "Не удалось сохранить");
    }
  };

  const openVersions = async () => {
    if (activeId == null) return;
    setVersionsOpen(true);
    const r = await listResearchVersions(activeId);
    if (r.ok && r.data) setVersions(r.data.versions);
  };

  const restoreVersion = async (versionId: number) => {
    const r = await getResearchVersionContent(versionId);
    if (r.ok && r.data) {
      setDocState(parseNirDocument(r.data.content));
      setDirty(true);
      setVersionsOpen(false);
      setMsg(`Загружена версия ${r.data.version_no}. Нажмите «Сохранить», чтобы зафиксировать.`);
    }
  };

  const onDocChange = (next: NirDocument) => {
    setDocState(next);
    setDirty(true);
  };

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
        <title>НИР · В разработке · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/owner/research`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1280px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Владелец · В разработке
          </p>
          <Link to="/account" className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1">
            <Icon name="ArrowLeft" size={12} />В кабинет
          </Link>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-4">
          Редактор НИР
        </h1>

        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          {/* ── Список работ ── */}
          <div className="space-y-3">
            <button onClick={onCreate} disabled={busy} className={`btn-drawing btn-drawing-accent text-xs w-full inline-flex items-center justify-center gap-1 ${busy ? "opacity-50 pointer-events-none" : ""}`}>
              <Icon name="Plus" size={14} />Новая НИР
            </button>
            {loadingList ? (
              <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] py-4 text-center">Загружаем список…</p>
            ) : papers.length === 0 ? (
              <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] py-4 text-center">Пока нет ни одной работы</p>
            ) : (
              <ul className="space-y-1">
                {papers.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => openPaper(p.id)}
                      className={`w-full text-left border-[1.5px] p-2.5 transition-colors ${
                        activeId === p.id
                          ? "border-[var(--drawing-accent)] bg-[var(--drawing-paper)]"
                          : "border-[var(--drawing-line)]/50 hover:border-[var(--drawing-accent)]"
                      }`}
                    >
                      <p className="font-gost-upright font-bold text-sm truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-accent)]">
                          {RESEARCH_STATUS_LABELS[p.status]}
                        </span>
                        <span className="font-mono text-[9px] text-[var(--drawing-line-thin)]">
                          v{p.versions} · {p.chars.toLocaleString("ru-RU")} зн.
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
                <Icon name="FlaskConical" size={28} className="mx-auto mb-2 text-[var(--drawing-line-thin)]" />
                <p className="font-gost text-sm text-[var(--drawing-line-thin)]">
                  Выберите работу слева или создайте новую
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Панель сохранения */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value as ResearchStatus); setDirty(true); }}
                    className="drawing-input"
                  >
                    {(Object.keys(RESEARCH_STATUS_LABELS) as ResearchStatus[]).map((s) => (
                      <option key={s} value={s}>{RESEARCH_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Комментарий к версии (необязательно)"
                    className="drawing-input flex-1 min-w-[160px]"
                  />
                  <button onClick={onSave} disabled={busy} className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1 ${busy ? "opacity-50 pointer-events-none" : ""}`}>
                    <Icon name="Save" size={14} />Сохранить
                  </button>
                  <button onClick={openVersions} disabled={busy} className="btn-drawing text-xs inline-flex items-center gap-1">
                    <Icon name="History" size={14} />Версии
                  </button>
                </div>
                {dirty && (
                  <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-accent)]">
                    Есть несохранённые изменения
                  </p>
                )}
                {msg && <p className="font-gost text-[11px] text-[var(--drawing-line-thin)]">{msg}</p>}

                <NirEditor doc={docState} onChange={onDocChange} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* История версий */}
      {versionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setVersionsOpen(false)}>
          <div className="bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] max-w-[520px] w-full max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-gost-upright text-lg font-bold">История версий</h2>
              <button onClick={() => setVersionsOpen(false)} className="text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]">
                <Icon name="X" size={18} />
              </button>
            </div>
            {versions.length === 0 ? (
              <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] py-4 text-center">
                Версий пока нет. Сохраните работу, чтобы создать первую.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 border border-[var(--drawing-line)]/40 p-2.5">
                    <span className="font-mono text-sm font-bold text-[var(--drawing-accent)] w-10 shrink-0">v{v.version_no}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-gost-upright text-sm truncate">{v.title}</p>
                      <p className="font-mono text-[9px] text-[var(--drawing-line-thin)]">
                        {v.created_at ? new Date(v.created_at).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : ""}
                        {" · "}{v.chars.toLocaleString("ru-RU")} зн.
                        {v.note ? ` · ${v.note}` : ""}
                      </p>
                    </div>
                    <button onClick={() => restoreVersion(v.id)} className="btn-drawing text-[10px] shrink-0 inline-flex items-center gap-1">
                      <Icon name="RotateCcw" size={12} />Загрузить
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default OwnerResearch;
