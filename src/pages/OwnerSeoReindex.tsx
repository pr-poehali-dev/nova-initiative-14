/**
 * Сервис «Переобход в Яндексе» владельца (/owner/seo-reindex).
 *
 * Загружает список всех страниц сайта и (если подключён Яндекс.Вебмастер API)
 * статус их индексации. Владелец отмечает галочками нужные страницы и
 * отправляет их на переобход по протоколу IndexNow. Непроиндексированные
 * страницы можно выбрать одной кнопкой. Доступ только владельцу, страница
 * закрыта от индексации.
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import OwnerGuard from "@/components/owner/OwnerGuard";
import { SITE_URL } from "@/lib/seo";
import func2url from "../../backend/func2url.json";

const INDEXNOW_URL = (func2url as Record<string, string>)["indexnow"];

interface PageItem {
  path: string;
  title: string;
  url: string;
  indexed: boolean | null; // null — статус неизвестен (нет токена/ошибка)
}

interface ListResponse {
  ok: boolean;
  index_status_available: boolean;
  indexed_count: number | null;
  pages: PageItem[];
}

interface SubmitResult {
  ok: boolean;
  indexnow_status: number;
  sent_count: number;
  sent_urls: string[];
}

function SeoReindexInner() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [statusAvailable, setStatusAvailable] = useState(false);
  const [indexedCount, setIndexedCount] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${INDEXNOW_URL}?action=list`);
      const data = (await res.json()) as ListResponse;
      setPages(data.pages || []);
      setStatusAvailable(data.index_status_available);
      setIndexedCount(data.indexed_count);
      // Автовыбор: если статус индексации доступен — отмечаем непроиндексированные.
      const preselect = new Set<string>();
      for (const p of data.pages || []) {
        if (data.index_status_available && p.indexed === false) preselect.add(p.path);
      }
      setSelected(preselect);
    } catch {
      setError("Не удалось загрузить список страниц");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(pages.map((p) => p.path)));
  const selectNone = () => setSelected(new Set());
  const selectNotIndexed = () =>
    setSelected(new Set(pages.filter((p) => p.indexed === false).map((p) => p.path)));

  const submit = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(INDEXNOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: Array.from(selected) }),
      });
      const data = (await res.json()) as SubmitResult & { error?: string };
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError("Не удалось связаться с сервисом переобхода");
    }
    setBusy(false);
  };

  const notIndexedCount = pages.filter((p) => p.indexed === false).length;

  return (
    <>
      <Helmet>
        <title>Переобход в Яндексе · Владелец · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/owner/seo-reindex`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[820px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Владелец · SEO
          </p>
          <Link to="/account" className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1">
            <Icon name="ArrowLeft" size={12} />В кабинет
          </Link>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-1">
          Переобход в Яндексе
        </h1>
        <p className="text-sm text-[var(--drawing-line-thin)] leading-snug mb-5">
          Отметь страницы и отправь их на переобход по протоколу IndexNow. Запускай после публикации с новыми или изменёнными страницами.
        </p>

        {/* Статус индексации */}
        <div className="mb-4 border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-3 text-sm">
          {statusAvailable ? (
            <p className="inline-flex items-center gap-2">
              <Icon name="CircleCheck" size={16} className="text-green-600" />
              Статус индексации Яндекса подключён. В поиске: <strong>{indexedCount}</strong> стр. · не проиндексировано из списка: <strong className="text-amber-600">{notIndexedCount}</strong>
            </p>
          ) : (
            <p className="inline-flex items-center gap-2 text-[var(--drawing-line-thin)]">
              <Icon name="Info" size={16} />
              Статус индексации недоступен (не добавлен токен Яндекс.Вебмастера). Страницы можно выбрать вручную.
            </p>
          )}
        </div>

        {/* Кнопки выбора */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button onClick={selectAll} className="btn-drawing text-xs">Выбрать все</button>
          <button onClick={selectNone} className="btn-drawing text-xs">Снять все</button>
          {statusAvailable && (
            <button onClick={selectNotIndexed} className="btn-drawing text-xs inline-flex items-center gap-1">
              <Icon name="Filter" size={12} />Только непроиндексированные
            </button>
          )}
          <button onClick={loadPages} className="btn-drawing text-xs inline-flex items-center gap-1" title="Обновить список">
            <Icon name="RefreshCw" size={12} />Обновить
          </button>
        </div>

        {/* Список страниц */}
        {loading ? (
          <div className="py-10 text-center text-[var(--drawing-line-thin)]">
            <Icon name="Loader" size={20} className="animate-spin inline" /> Загружаем страницы…
          </div>
        ) : (
          <div className="border-2 border-[var(--drawing-line)] divide-y divide-[var(--drawing-line)]/40">
            {pages.map((p) => {
              const checked = selected.has(p.path);
              return (
                <label
                  key={p.path}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--drawing-paper)]/50"
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.path)} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{p.title}</span>
                    <span className="block font-mono text-[11px] text-[var(--drawing-line-thin)] truncate">{p.path}</span>
                  </span>
                  {p.indexed === true && (
                    <span className="shrink-0 text-[10px] font-gost uppercase tracking-wider text-green-600 inline-flex items-center gap-1">
                      <Icon name="CircleCheck" size={13} />в поиске
                    </span>
                  )}
                  {p.indexed === false && (
                    <span className="shrink-0 text-[10px] font-gost uppercase tracking-wider text-amber-600 inline-flex items-center gap-1">
                      <Icon name="CircleAlert" size={13} />нет в поиске
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {/* Отправка */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={busy || selected.size === 0}
            className={`btn-drawing btn-drawing-accent text-sm inline-flex items-center gap-2 ${busy || selected.size === 0 ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Icon name={busy ? "Loader" : "Send"} size={15} className={busy ? "animate-spin" : ""} />
            {busy ? "Отправляем…" : `Отправить на переобход (${selected.size})`}
          </button>
        </div>

        {error && (
          <div className="mt-5 border-2 border-red-500/60 bg-red-50 p-3 text-sm text-red-700">
            <Icon name="TriangleAlert" size={14} className="inline mr-1" />
            Ошибка: {error}
          </div>
        )}

        {result && (
          <div className="mt-5 border-2 border-[var(--drawing-accent)] bg-[var(--drawing-paper)] p-4">
            <p className="font-gost-upright font-black text-base mb-1 inline-flex items-center gap-2">
              <Icon name={result.ok ? "CircleCheck" : "CircleAlert"} size={18} className={result.ok ? "text-green-600" : "text-amber-600"} />
              {result.ok ? "Яндекс принял запрос" : `Статус IndexNow: ${result.indexnow_status}`}
            </p>
            <p className="text-sm text-[var(--drawing-line-thin)]">
              Отправлено страниц: <strong>{result.sent_count}</strong>. Переиндексация обычно занимает от нескольких часов до 1–2 дней.
            </p>
          </div>
        )}

        <p className="mt-8 text-xs text-[var(--drawing-line-thin)] leading-relaxed">
          Для Google переобход запускается вручную в Google Search Console (по sitemap или «Проверка URL → Запросить индексирование»). Прямого публичного API для контентных страниц у Google нет.
        </p>
      </div>
    </>
  );
}

const OwnerSeoReindex = () => (
  <OwnerGuard from="/owner/seo-reindex">
    <SeoReindexInner />
  </OwnerGuard>
);

export default OwnerSeoReindex;
