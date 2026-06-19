/**
 * Сервис «Переобход в Яндексе» владельца (/owner/seo-reindex).
 *
 * Запускает уведомление Яндекса о страницах сайта по протоколу IndexNow,
 * чтобы ускорить их переиндексацию после публикации. Можно отправить набор
 * ключевых страниц по умолчанию или свой список адресов. Доступ только
 * владельцу (is_owner), страница закрыта от индексации.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import OwnerGuard from "@/components/owner/OwnerGuard";
import { SITE_URL } from "@/lib/seo";
import func2url from "../../backend/func2url.json";

const INDEXNOW_URL = (func2url as Record<string, string>)["indexnow"];

interface ReindexResult {
  ok: boolean;
  indexnow_status: number;
  indexnow_response: string;
  sent_count: number;
  sent_urls: string[];
}

function SeoReindexInner() {
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReindexResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    const urls = custom
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch(INDEXNOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(urls.length ? { urls } : {}),
      });
      const data = (await res.json()) as ReindexResult & { error?: string };
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Не удалось связаться с сервисом переобхода");
    }
    setBusy(false);
  };

  return (
    <>
      <Helmet>
        <title>Переобход в Яндексе · Владелец · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/owner/seo-reindex`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[760px] mx-auto px-4 pt-20 md:pt-24 pb-12">
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
        <p className="text-sm text-[var(--drawing-line-thin)] leading-snug mb-6">
          Уведомляет Яндекс о страницах сайта по протоколу IndexNow и ускоряет их переиндексацию. Запускай после каждой публикации с новыми или изменёнными страницами.
        </p>

        <button
          onClick={run}
          disabled={busy}
          className={`btn-drawing btn-drawing-accent text-sm inline-flex items-center gap-2 ${busy ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Icon name={busy ? "Loader" : "Send"} size={15} className={busy ? "animate-spin" : ""} />
          {busy ? "Отправляем…" : "Отправить страницы на переобход"}
        </button>

        <div className="mt-6">
          <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-1">
            Свой список (необязательно)
          </p>
          <p className="text-xs text-[var(--drawing-line-thin)] mb-2">
            По одному адресу в строке (например <code>/cae</code> или полный URL). Если оставить пустым — отправится набор ключевых страниц по умолчанию.
          </p>
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            rows={5}
            placeholder={"/cae\n/cae/raschet-balki-onlayn\n/blog/novaya-statya"}
            className="drawing-input w-full resize-y text-sm font-mono"
          />
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
            <p className="text-sm text-[var(--drawing-line-thin)] mb-3">
              Отправлено страниц: <strong>{result.sent_count}</strong>. Переиндексация обычно занимает от нескольких часов до 1–2 дней.
            </p>
            <details className="text-xs">
              <summary className="cursor-pointer font-gost uppercase tracking-wider text-[var(--drawing-accent)]">
                Список отправленных адресов
              </summary>
              <ul className="mt-2 space-y-0.5 font-mono text-[var(--drawing-line-thin)] break-all">
                {result.sent_urls.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </details>
          </div>
        )}

        <p className="mt-8 text-xs text-[var(--drawing-line-thin)] leading-relaxed">
          Для Google переобход запускается вручную в Google Search Console (по sitemap или через «Проверка URL → Запросить индексирование»). Прямого публичного API для контентных страниц у Google нет.
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
