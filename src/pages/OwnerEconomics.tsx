/**
 * Сервис «Экономика сайта» владельца (/owner/economics).
 *
 * Учёт расходов на создание и поддержку сайта: владелец вносит статьи затрат,
 * система считает общий итог, регулярные платежи в месяц и разбивку по
 * категориям. Хранение на сервере, доступ только владельцу (is_owner),
 * страница закрыта от индексации.
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import OwnerGuard from "@/components/owner/OwnerGuard";
import { SITE_URL } from "@/lib/seo";
import {
  listExpenses,
  addExpense,
  deleteExpense,
  formatRubFromKopecks,
  EXPENSE_CATEGORY_LABELS,
  type SiteExpense,
  type ExpensesSummary,
  type ExpenseCategory,
} from "@/lib/research";

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

function EconomicsInner() {
  const [expenses, setExpenses] = useState<SiteExpense[]>([]);
  const [summary, setSummary] = useState<ExpensesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Форма добавления.
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("platform");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [spentOn, setSpentOn] = useState("");
  const [note, setNote] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await listExpenses();
    setLoading(false);
    if (r.ok && r.data) {
      setExpenses(r.data.expenses);
      setSummary(r.data.summary);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onAdd = async () => {
    if (!title.trim() || !(Number(amount) >= 0)) return;
    setBusy(true);
    const r = await addExpense({
      title: title.trim(),
      category,
      amount_rub: Number(amount) || 0,
      is_recurring: recurring,
      spent_on: spentOn || undefined,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (r.ok) {
      setTitle("");
      setAmount("");
      setNote("");
      setRecurring(false);
      setSpentOn("");
      reload();
    }
  };

  const onDelete = async (id: number) => {
    setBusy(true);
    await deleteExpense(id);
    setBusy(false);
    reload();
  };

  return (
    <>
      <Helmet>
        <title>Экономика сайта · В разработке · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/owner/economics`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[900px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Владелец · В разработке
          </p>
          <Link to="/account" className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1">
            <Icon name="ArrowLeft" size={12} />В кабинет
          </Link>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-1">
          Экономика сайта
        </h1>
        <p className="text-sm text-[var(--drawing-line-thin)] leading-snug mb-5">
          Учёт расходов на создание и поддержку. Вносите траты — система считает итог и разбивку.
        </p>

        {/* Сводка */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
          <div className="border-2 border-[var(--drawing-accent)] bg-[var(--drawing-paper)] p-3">
            <Icon name="Wallet" size={16} className="text-[var(--drawing-accent)] mb-1" />
            <p className="font-gost-upright text-xl font-black leading-tight">
              {summary ? formatRubFromKopecks(summary.total_kopecks) : "—"}
            </p>
            <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Всего потрачено</p>
          </div>
          <div className="border border-[var(--drawing-line)]/40 bg-[var(--drawing-paper)] p-3">
            <Icon name="Repeat" size={16} className="text-[var(--drawing-accent)] mb-1" />
            <p className="font-gost-upright text-xl font-black leading-tight">
              {summary ? formatRubFromKopecks(summary.recurring_monthly_kopecks) : "—"}
            </p>
            <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Регулярные / мес</p>
          </div>
          <div className="border border-[var(--drawing-line)]/40 bg-[var(--drawing-paper)] p-3">
            <Icon name="ListChecks" size={16} className="text-[var(--drawing-accent)] mb-1" />
            <p className="font-gost-upright text-xl font-black leading-tight">{summary ? summary.count : "—"}</p>
            <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Статей затрат</p>
          </div>
        </div>

        {/* Разбивка по категориям */}
        {summary && summary.total_kopecks > 0 && (
          <div className="mb-6">
            <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1 mb-2">
              По категориям
            </p>
            <div className="space-y-1.5">
              {CATEGORIES.filter((c) => (summary.by_category[c] || 0) > 0).map((c) => {
                const val = summary.by_category[c] || 0;
                const pct = Math.round((val / summary.total_kopecks) * 100);
                return (
                  <div key={c} className="flex items-center gap-2">
                    <span className="w-40 shrink-0 font-gost text-[11px] text-[var(--drawing-line)]">{EXPENSE_CATEGORY_LABELS[c]}</span>
                    <div className="flex-1 h-3 bg-[var(--drawing-paper)] border border-[var(--drawing-line)]/30 relative">
                      <div className="h-full bg-[var(--drawing-accent)]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-28 text-right font-mono text-[11px] text-[var(--drawing-line)]">{formatRubFromKopecks(val)}</span>
                    <span className="w-10 text-right font-mono text-[10px] text-[var(--drawing-line-thin)]">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Форма добавления */}
        <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-4 mb-6">
          <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-3">Добавить расход</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="block">
              <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">Статья</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="например, домен диплом-инж.рф" className="drawing-input w-full" />
            </label>
            <label className="block">
              <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">Категория</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="drawing-input w-full">
                {CATEGORIES.map((c) => (<option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>))}
              </select>
            </label>
            <label className="block">
              <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">Сумма, ₽</span>
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="например, 199" className="drawing-input w-full" />
            </label>
            <label className="block">
              <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">Дата (необязательно)</span>
              <input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} className="drawing-input w-full" />
            </label>
            <label className="block sm:col-span-2">
              <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">Комментарий (необязательно)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="drawing-input w-full" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              <span className="font-gost text-[11px] text-[var(--drawing-line)]">Регулярный платёж (подписка / домен в месяц)</span>
            </label>
            <button onClick={onAdd} disabled={busy || !title.trim()} className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1 ml-auto ${busy || !title.trim() ? "opacity-50 pointer-events-none" : ""}`}>
              <Icon name="Plus" size={14} />Добавить
            </button>
          </div>
        </div>

        {/* Список расходов */}
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
          История расходов
        </p>
        {loading ? (
          <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] py-4 text-center">Загружаем…</p>
        ) : expenses.length === 0 ? (
          <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] py-6 text-center">
            Пока нет ни одной статьи. Добавьте первую выше.
          </p>
        ) : (
          <div className="space-y-1">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-2 border border-[var(--drawing-line)]/40 p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-gost-upright font-bold text-sm truncate">{e.title}</p>
                    {e.is_recurring && (
                      <span className="inline-flex items-center gap-0.5 font-gost text-[9px] uppercase tracking-wider border border-[var(--drawing-accent)] text-[var(--drawing-accent)] px-1">
                        <Icon name="Repeat" size={9} />рег.
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[9px] text-[var(--drawing-line-thin)]">
                    {EXPENSE_CATEGORY_LABELS[e.category]}
                    {e.spent_on ? ` · ${new Date(e.spent_on).toLocaleDateString("ru-RU")}` : ""}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-[var(--drawing-line)] shrink-0">
                  {formatRubFromKopecks(e.amount_kopecks)}
                </span>
                <button onClick={() => onDelete(e.id)} disabled={busy} className="text-[var(--drawing-line-thin)] hover:text-red-600 shrink-0 p-1" title="Удалить" aria-label="Удалить">
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const OwnerEconomics = () => (
  <OwnerGuard from="/owner/economics">
    <EconomicsInner />
  </OwnerGuard>
);

export default OwnerEconomics;
