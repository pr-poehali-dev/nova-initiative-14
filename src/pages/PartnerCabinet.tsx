/**
 * Личный кабинет партнёра виджета (/partner).
 *
 * Партнёр входит по своему ключу виджета (тот же data-key) и видит:
 *  - текущий месячный лимит расчётов и расход;
 *  - доп-пакеты перерасхода (+50%) и начисления;
 *  - баланс и долг (постоплата);
 *  - историю по месяцам;
 *  - код для вставки виджета на сайт.
 * Ключ хранится в localStorage, чтобы не вводить каждый раз. Страница
 * публичная (доступ контролируется самим ключом), закрыта от индексации.
 */
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { SITE_URL } from "@/lib/seo";
import func2url from "../../backend/func2url.json";

const WIDGET_API = (func2url as Record<string, string>)["widget-api"];
const LS_KEY = "partner_widget_key";

interface PeriodHistory {
  period_start: string | null;
  plan: string;
  calc_used: number;
  calc_limit: number;
  extra_packs: number;
  amount_due: number;
  amount_paid: number;
  status: string;
}

interface BillingSummary {
  plan: string;
  period_start: string | null;
  period_end: string | null;
  calc_used: number;
  calc_limit: number;
  base_limit: number;
  extra_packs: number;
  amount_due: number;
  amount_paid: number;
  debt: number;
  history: PeriodHistory[];
}

interface SummaryResponse {
  ok: boolean;
  company_name?: string;
  contact_email?: string;
  monthly_price_rub?: number;
  allowed_domains?: string[];
  billing?: BillingSummary;
  message?: string;
}

function rub(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function monthLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export default function PartnerCabinet() {
  const [key, setKey] = useState<string>(() => localStorage.getItem(LS_KEY) || "");
  const [input, setInput] = useState("");
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (k: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${WIDGET_API}?action=partner-summary&key=${encodeURIComponent(k)}`);
      const json = (await res.json()) as SummaryResponse;
      if (json.ok) {
        setData(json);
        localStorage.setItem(LS_KEY, k);
      } else {
        setError(json.message || "Неверный ключ");
        setData(null);
      }
    } catch {
      setError("Не удалось загрузить данные");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (key) load(key);
  }, [key, load]);

  const enter = () => {
    if (input.trim()) setKey(input.trim());
  };

  const logout = () => {
    localStorage.removeItem(LS_KEY);
    setKey("");
    setData(null);
    setInput("");
  };

  const embedCode = `<script src="${SITE_URL}/widget.js" data-key="${key}" async></script>`;
  const copy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Экран входа
  if (!key || (!data && !loading && error)) {
    return (
      <>
        <Helmet>
          <title>Кабинет партнёра · Виджет CAE · Диплом-Инж.рф</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <div className="max-w-[460px] mx-auto px-4 pt-24 pb-12">
          <h1 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-2">
            Кабинет партнёра
          </h1>
          <p className="text-sm text-[var(--drawing-line-thin)] mb-5">
            Введите ключ виджета (его выдаёт менеджер), чтобы увидеть расход
            расчётов, лимит тарифа и баланс.
          </p>
          <input
            className="w-full border-2 border-[var(--drawing-line)] bg-transparent px-3 py-2 text-sm font-mono mb-3"
            placeholder="pk_..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enter()}
          />
          {error && (
            <div className="mb-3 border-2 border-red-500/60 bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-2">
              <Icon name="TriangleAlert" size={14} /> {error}
            </div>
          )}
          <button onClick={enter} className="btn-drawing btn-drawing-accent text-sm inline-flex items-center gap-2">
            <Icon name="LogIn" size={15} /> Войти
          </button>
        </div>
      </>
    );
  }

  if (loading || !data || !data.billing) {
    return (
      <div className="max-w-[820px] mx-auto px-4 pt-24 pb-12 text-center text-[var(--drawing-line-thin)]">
        <Icon name="Loader" size={22} className="animate-spin inline" /> Загружаем…
      </div>
    );
  }

  const b = data.billing;
  const usagePct = b.calc_limit ? Math.min(100, Math.round((b.calc_used / b.calc_limit) * 100)) : 0;
  const overLimit = b.calc_used >= b.calc_limit;

  return (
    <>
      <Helmet>
        <title>Кабинет партнёра · Виджет CAE · Диплом-Инж.рф</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[900px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Кабинет партнёра
          </p>
          <button
            onClick={logout}
            className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
          >
            <Icon name="LogOut" size={12} /> Выйти
          </button>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-1">
          {data.company_name}
        </h1>
        <p className="text-sm text-[var(--drawing-line-thin)] mb-6">
          Тариф <strong className="uppercase">{b.plan}</strong> ·{" "}
          {rub(data.monthly_price_rub || 0)}/мес · {monthLabel(b.period_start)}
        </p>

        {/* Долг / баланс */}
        {b.debt > 0 && (
          <div className="mb-5 border-2 border-amber-500 bg-amber-50 p-4 flex items-start gap-3">
            <Icon name="CircleAlert" size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-gost-upright font-bold text-sm text-amber-800">
                К оплате: {rub(b.debt)}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Виджет работает по постоплате: новый месяц активируется
                автоматически. Оплатите задолженность, чтобы избежать отключения.
              </p>
            </div>
          </div>
        )}

        {/* Расход расчётов */}
        <div className="mb-5 border-2 border-[var(--drawing-line)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-gost-upright font-bold text-sm uppercase">
              Расчёты в этом месяце
            </span>
            <span className="font-mono text-sm">
              {b.calc_used} / {b.calc_limit}
            </span>
          </div>
          <div className="w-full h-3 bg-[var(--drawing-paper)] border border-[var(--drawing-line)] overflow-hidden">
            <div
              className={`h-full transition-all ${overLimit ? "bg-amber-500" : "bg-[var(--drawing-accent)]"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {b.extra_packs > 0 && (
            <p className="text-xs text-amber-700 mt-2">
              Подключено доп-пакетов (перерасход +50%): <strong>{b.extra_packs}</strong>.
              Базовый лимит {b.base_limit}, с доп-пакетами — {b.calc_limit}.
            </p>
          )}
          {overLimit && b.extra_packs === 0 && (
            <p className="text-xs text-amber-700 mt-2">
              Лимит почти исчерпан. При превышении автоматически подключится
              доп-пакет: +50% к лимиту и +50% к стоимости тарифа за месяц.
            </p>
          )}
        </div>

        {/* Начисления за месяц */}
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <div className="border-2 border-[var(--drawing-line)] p-3">
            <p className="text-xs text-[var(--drawing-line-thin)]">Начислено за месяц</p>
            <p className="font-gost-upright text-xl font-black">{rub(b.amount_due)}</p>
          </div>
          <div className="border-2 border-[var(--drawing-line)] p-3">
            <p className="text-xs text-[var(--drawing-line-thin)]">Оплачено</p>
            <p className="font-gost-upright text-xl font-black text-green-700">{rub(b.amount_paid)}</p>
          </div>
          <div className="border-2 border-[var(--drawing-line)] p-3">
            <p className="text-xs text-[var(--drawing-line-thin)]">Долг всего</p>
            <p className={`font-gost-upright text-xl font-black ${b.debt > 0 ? "text-amber-600" : "text-green-700"}`}>
              {rub(b.debt)}
            </p>
          </div>
        </div>

        {/* Код виджета */}
        <div className="mb-6">
          <p className="font-gost-upright font-bold text-sm uppercase mb-2">Код для вставки</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate font-mono text-[11px] bg-[var(--drawing-paper)] border border-[var(--drawing-line)] px-2 py-1.5">
              {embedCode}
            </code>
            <button onClick={copy} className="btn-drawing text-xs inline-flex items-center gap-1 shrink-0">
              <Icon name={copied ? "Check" : "Copy"} size={12} /> {copied ? "Ок" : "Код"}
            </button>
          </div>
        </div>

        {/* История по месяцам */}
        <p className="font-gost-upright font-bold text-sm uppercase mb-2">История по месяцам</p>
        <div className="border-2 border-[var(--drawing-line)] divide-y divide-[var(--drawing-line)]/40">
          {b.history.map((h, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="capitalize">{monthLabel(h.period_start)}</span>
              <span className="font-mono text-xs text-[var(--drawing-line-thin)]">
                {h.calc_used}/{h.calc_limit + (h.calc_limit >> 1) * h.extra_packs} расч.
              </span>
              <span className="text-xs">
                {rub(h.amount_paid)} / {rub(h.amount_due)}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-[var(--drawing-line-thin)] leading-relaxed">
          Оплата производится по счёту (безналичный расчёт). Реквизиты и счёт —
          у вашего менеджера. После поступления оплаты баланс обновится.
        </p>
      </div>
    </>
  );
}
