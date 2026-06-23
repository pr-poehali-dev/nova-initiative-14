/**
 * Кабинет владельца «Партнёры виджета» (/owner/partners).
 *
 * Управление white-label виджетом CAE-калькулятора балки: выдача API-ключей
 * партнёрам (заводы металлоконструкций, продавцы проката, стройкомпании),
 * привязка к доменам, включение/выключение подписки, статистика расчётов и
 * заявок. Для каждого партнёра показывает готовый код для вставки на их сайт.
 * Доступ только владельцу, страница закрыта от индексации.
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import OwnerGuard from "@/components/owner/OwnerGuard";
import { SITE_URL } from "@/lib/seo";
import { authorizedFetch } from "@/lib/auth";
import func2url from "../../backend/func2url.json";

const WIDGET_API = (func2url as Record<string, string>)["widget-api"];

interface Partner {
  id: number;
  api_key: string;
  company_name: string;
  contact_email: string;
  allowed_domains: string[];
  is_active: boolean;
  plan: string;
  monthly_calc_limit: number;
  created_at: string | null;
  calc_count: number;
  lead_count: number;
}

function embedCode(apiKey: string): string {
  return `<script src="${SITE_URL}/widget.js" data-key="${apiKey}" async></script>`;
}

function PartnersInner() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [domains, setDomains] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authorizedFetch(`${WIDGET_API}?action=owner-list`);
      const data = await res.json();
      if (data.ok) setPartners(data.partners || []);
      else setError(data.message || "Не удалось загрузить партнёров");
    } catch {
      setError("Ошибка загрузки");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async () => {
    if (!company.trim() || !email.trim()) {
      setError("Укажите название и email партнёра");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const domainList = domains
        .split(/[\s,]+/)
        .map((d) => d.trim())
        .filter(Boolean);
      const res = await authorizedFetch(`${WIDGET_API}?action=owner-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: company,
          contact_email: email,
          allowed_domains: domainList,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCompany("");
        setEmail("");
        setDomains("");
        await load();
      } else {
        setError(data.message || "Не удалось создать партнёра");
      }
    } catch {
      setError("Ошибка создания");
    }
    setCreating(false);
  }, [company, email, domains, load]);

  const toggle = useCallback(
    async (p: Partner) => {
      await authorizedFetch(`${WIDGET_API}?action=owner-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
      });
      await load();
    },
    [load],
  );

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  return (
    <>
      <Helmet>
        <title>Партнёры виджета · Владелец · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/owner/partners`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[900px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Владелец · Виджет
          </p>
          <Link
            to="/account"
            className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
          >
            <Icon name="ArrowLeft" size={12} />В кабинет
          </Link>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-1">
          Партнёры виджета
        </h1>
        <p className="text-sm text-[var(--drawing-line-thin)] leading-snug mb-6">
          Выдавайте партнёрам ключ для встраиваемого калькулятора балки. Виджет
          работает только на указанных доменах; заявки уходят на email партнёра.
        </p>

        {/* Форма создания */}
        <div className="mb-8 border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-4">
          <p className="font-gost-upright font-black text-base uppercase mb-3">
            Новый партнёр
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="border-2 border-[var(--drawing-line)] bg-transparent px-3 py-2 text-sm"
              placeholder="Название компании *"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <input
              className="border-2 border-[var(--drawing-line)] bg-transparent px-3 py-2 text-sm"
              placeholder="Email для заявок *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="border-2 border-[var(--drawing-line)] bg-transparent px-3 py-2 text-sm"
              placeholder="Домены через запятую"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
            />
          </div>
          <button
            onClick={create}
            disabled={creating}
            className="btn-drawing btn-drawing-accent text-sm mt-3 inline-flex items-center gap-2"
          >
            <Icon name={creating ? "Loader" : "Plus"} size={15} className={creating ? "animate-spin" : ""} />
            {creating ? "Создаём…" : "Выдать ключ"}
          </button>
        </div>

        {error && (
          <div className="mb-5 border-2 border-red-500/60 bg-red-50 p-3 text-sm text-red-700">
            <Icon name="TriangleAlert" size={14} className="inline mr-1" />
            {error}
          </div>
        )}

        {/* Список партнёров */}
        {loading ? (
          <div className="py-10 text-center text-[var(--drawing-line-thin)]">
            <Icon name="Loader" size={20} className="animate-spin inline" /> Загружаем…
          </div>
        ) : partners.length === 0 ? (
          <p className="text-sm text-[var(--drawing-line-thin)]">Пока нет партнёров.</p>
        ) : (
          <div className="space-y-4">
            {partners.map((p) => (
              <div key={p.id} className="border-2 border-[var(--drawing-line)] p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-bold text-base">{p.company_name}</p>
                    <p className="text-xs text-[var(--drawing-line-thin)]">{p.contact_email}</p>
                  </div>
                  <button
                    onClick={() => toggle(p)}
                    className={`text-[10px] font-gost uppercase tracking-wider px-2 py-1 border-2 ${
                      p.is_active
                        ? "border-green-600 text-green-600"
                        : "border-[var(--drawing-line-thin)] text-[var(--drawing-line-thin)]"
                    }`}
                  >
                    {p.is_active ? "Активен" : "Отключён"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-[var(--drawing-line-thin)] mb-3">
                  <span>Расчётов: <strong className="text-[var(--drawing-ink)]">{p.calc_count}</strong></span>
                  <span>Заявок: <strong className="text-[var(--drawing-ink)]">{p.lead_count}</strong></span>
                  <span>
                    Домены:{" "}
                    <strong className="text-[var(--drawing-ink)]">
                      {p.allowed_domains.length ? p.allowed_domains.join(", ") : "все (без ограничений)"}
                    </strong>
                  </span>
                </div>

                {/* API-ключ */}
                <div className="flex items-center gap-2 mb-2">
                  <code className="flex-1 min-w-0 truncate font-mono text-xs bg-[var(--drawing-paper)] border border-[var(--drawing-line)] px-2 py-1.5">
                    {p.api_key}
                  </code>
                  <button
                    onClick={() => copy(p.api_key, `key-${p.id}`)}
                    className="btn-drawing text-xs inline-flex items-center gap-1 shrink-0"
                  >
                    <Icon name={copied === `key-${p.id}` ? "Check" : "Copy"} size={12} />
                    {copied === `key-${p.id}` ? "Ок" : "Ключ"}
                  </button>
                </div>

                {/* Код для вставки */}
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate font-mono text-[11px] bg-[var(--drawing-paper)] border border-[var(--drawing-line)] px-2 py-1.5">
                    {embedCode(p.api_key)}
                  </code>
                  <button
                    onClick={() => copy(embedCode(p.api_key), `embed-${p.id}`)}
                    className="btn-drawing text-xs inline-flex items-center gap-1 shrink-0"
                  >
                    <Icon name={copied === `embed-${p.id}` ? "Check" : "Copy"} size={12} />
                    {copied === `embed-${p.id}` ? "Ок" : "Код"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const OwnerPartners = () => (
  <OwnerGuard from="/owner/partners">
    <PartnersInner />
  </OwnerGuard>
);

export default OwnerPartners;
