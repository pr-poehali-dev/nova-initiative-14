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
  open_count: number;
  lead_count: number;
  monthly_price_rub: number;
  debt: number;
  visitor_solve_limit: number | null;
  visitor_limit_enabled: boolean;
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
  const [plan, setPlan] = useState("basic");
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
          plan,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCompany("");
        setEmail("");
        setDomains("");
        setPlan("basic");
        await load();
      } else {
        setError(data.message || "Не удалось создать партнёра");
      }
    } catch {
      setError("Ошибка создания");
    }
    setCreating(false);
  }, [company, email, domains, plan, load]);

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

  const pay = useCallback(
    async (p: Partner) => {
      const raw = window.prompt(
        `Внести оплату для «${p.company_name}». Долг: ${p.debt} ₽.\nСумма оплаты, ₽:`,
        String(p.debt || p.monthly_price_rub || 0),
      );
      if (raw == null) return;
      const amount = parseInt(raw, 10);
      if (!amount || amount <= 0) return;
      await authorizedFetch(`${WIDGET_API}?action=owner-pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: p.id, amount_rub: amount, note: "Оплата вручную" }),
      });
      await load();
    },
    [load],
  );

  const saveVisitorLimit = useCallback(
    async (p: Partner, enabled: boolean, limit: number | null) => {
      await authorizedFetch(`${WIDGET_API}?action=owner-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          visitor_limit_enabled: enabled,
          visitor_solve_limit: limit,
        }),
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
            <select
              className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] px-3 py-2 text-sm"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="basic">Старт (10 расчётов, 20 узлов)</option>
              <option value="business">Бизнес (50 расчётов, 50 узлов)</option>
              <option value="zavod">Завод (безлимит, 200 узлов)</option>
            </select>
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
                  <span>Тариф: <strong className="text-[var(--drawing-ink)] uppercase">{p.plan}</strong> ({p.monthly_price_rub} ₽/мес)</span>
                  <span>Показов: <strong className="text-[var(--drawing-ink)]">{p.open_count}</strong></span>
                  <span>Заявок: <strong className="text-[var(--drawing-ink)]">{p.lead_count}</strong></span>
                  <span>
                    Долг:{" "}
                    <strong className={p.debt > 0 ? "text-amber-600" : "text-green-700"}>
                      {p.debt} ₽
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button
                    onClick={() => pay(p)}
                    className="btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1"
                  >
                    <Icon name="Wallet" size={12} /> Внести оплату
                  </button>
                  <span className="text-xs text-[var(--drawing-line-thin)]">
                    Домены: {p.allowed_domains.length ? p.allowed_domains.join(", ") : "все (без ограничений)"}
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

                <VisitorLimitRow partner={p} onSave={saveVisitorLimit} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Настройка лимита расчётов НА ОДНОГО ПОСЕТИТЕЛЯ для партнёра.
 * Переключатель «ограничивать расчёты» + поле с числом. Выкл = безлимит.
 */
function VisitorLimitRow({
  partner,
  onSave,
}: {
  partner: Partner;
  onSave: (p: Partner, enabled: boolean, limit: number | null) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(partner.visitor_limit_enabled);
  const [limit, setLimit] = useState<string>(
    partner.visitor_solve_limit != null ? String(partner.visitor_solve_limit) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    enabled !== partner.visitor_limit_enabled ||
    (limit ? parseInt(limit, 10) : null) !== (partner.visitor_solve_limit ?? null);

  const save = async () => {
    setSaving(true);
    const lim = limit ? Math.max(1, parseInt(limit, 10) || 0) : null;
    await onSave(partner, enabled, enabled ? lim : null);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="mt-3 border-t border-[var(--drawing-line)]/40 pt-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-gost uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Расчёты на посетителя:
        </span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Ограничивать
        </label>
        {enabled ? (
          <span className="inline-flex items-center gap-1.5">
            не более
            <input
              type="number"
              min={1}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="по тарифу"
              className="w-24 border border-[var(--drawing-line)] bg-transparent px-2 py-1 text-xs"
            />
            расч. (пусто = по тарифу)
          </span>
        ) : (
          <span className="text-green-700 font-bold">без ограничений</span>
        )}
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1"
          >
            <Icon name="Save" size={12} /> {saving ? "…" : "Сохранить"}
          </button>
        )}
        {saved && !dirty && (
          <span className="text-green-700 inline-flex items-center gap-1">
            <Icon name="Check" size={12} /> Сохранено
          </span>
        )}
      </div>
    </div>
  );
}

const OwnerPartners = () => (
  <OwnerGuard from="/owner/partners">
    <PartnersInner />
  </OwnerGuard>
);

export default OwnerPartners;