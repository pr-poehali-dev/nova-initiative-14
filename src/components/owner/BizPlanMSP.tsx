/**
 * Конструктор бизнес-плана по учебной тетради АО «Корпорация «МСП».
 *
 * Слева — навигация по разделам оглавления (Резюме, Маркетинг, Производство,
 * Персонал, Финансы, План действий), справа — формы с полями и таблицами.
 * Финансовый блок считает себестоимость, ФОТ, взносы, прибыль, безубыточность
 * и окупаемость автоматически по введённым данным.
 *
 * Компонент управляемый: данные и onChange приходят со страницы.
 */
import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  type BizPlanData,
  type MaterialCost,
  type StaffRow,
  type IndirectCost,
  type ActionRow,
  computeBizPlan,
  fmtRub,
  INSURANCE_TOTAL_RATE,
} from "@/lib/bizplan";

interface Props {
  data: BizPlanData;
  onChange: (next: BizPlanData) => void;
}

type SectionId = "resume" | "market" | "production" | "staff" | "finance" | "actions";

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: "resume", label: "1. Резюме", icon: "FileText" },
  { id: "market", label: "2. Маркетинг", icon: "Megaphone" },
  { id: "production", label: "3. Производство", icon: "Factory" },
  { id: "staff", label: "4. Персонал", icon: "Users" },
  { id: "finance", label: "5. Финансы", icon: "Calculator" },
  { id: "actions", label: "6. План действий", icon: "ListChecks" },
];

export default function BizPlanMSP({ data, onChange }: Props) {
  const [section, setSection] = useState<SectionId>("resume");
  const m = useMemo(() => computeBizPlan(data), [data]);

  const set = <K extends keyof BizPlanData>(key: K, value: BizPlanData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="grid md:grid-cols-[210px_1fr] gap-4">
      {/* Навигация по разделам */}
      <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:sticky md:top-24 md:self-start">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`shrink-0 text-left font-gost text-[11px] uppercase tracking-wider px-3 py-2 border inline-flex items-center gap-2 ${
              section === s.id
                ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)] bg-[var(--drawing-paper)]"
                : "border-[var(--drawing-line)]/30 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-line)]"
            }`}
          >
            <Icon name={s.icon} size={13} />{s.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0">
        {section === "resume" && <ResumeSection data={data} set={set} />}
        {section === "market" && <MarketSection data={data} set={set} />}
        {section === "production" && <ProductionSection data={data} set={set} />}
        {section === "staff" && <StaffSection data={data} set={set} metrics={m} />}
        {section === "finance" && <FinanceSection data={data} set={set} metrics={m} />}
        {section === "actions" && <ActionsSection data={data} set={set} />}
      </div>
    </div>
  );
}

// ---- Переиспользуемые поля ----

type Setter = <K extends keyof BizPlanData>(key: K, value: BizPlanData[K]) => void;

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-accent)] block mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="drawing-input w-full text-sm" />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-accent)] block mb-1">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="drawing-input w-full text-sm resize-y" />
    </label>
  );
}

function NumField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-accent)] block mb-1">{label}{suffix ? `, ${suffix}` : ""}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="drawing-input w-full text-sm" />
    </label>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-gost-upright text-xl font-black uppercase tracking-wide">{children}</h2>
      {sub && <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">{sub}</p>}
    </div>
  );
}

// ---- 1. Резюме ----

function ResumeSection({ data, set }: { data: BizPlanData; set: Setter }) {
  const t = data.title;
  const r = data.resume;
  const setT = (patch: Partial<typeof t>) => set("title", { ...t, ...patch });
  const setR = (patch: Partial<typeof r>) => set("resume", { ...r, ...patch });
  return (
    <div className="space-y-5">
      <SectionTitle sub="Титульный лист и резюме">Резюме бизнес-плана</SectionTitle>

      <div className="border border-[var(--drawing-line)]/40 p-3 grid sm:grid-cols-2 gap-3">
        <Field label="Название предприятия" value={t.company} onChange={(v) => setT({ company: v })} />
        <Field label="Руководитель" value={t.director} onChange={(v) => setT({ director: v })} />
        <Field label="Адрес" value={t.address} onChange={(v) => setT({ address: v })} />
        <Field label="Телефон" value={t.phone} onChange={(v) => setT({ phone: v })} />
        <Field label="Эл. адрес" value={t.email} onChange={(v) => setT({ email: v })} />
      </div>

      <div className="space-y-3">
        <Field label="Наименование бизнеса" value={r.businessName} onChange={(v) => setR({ businessName: v })} />
        <Area label="Вид деятельности" value={r.activity} onChange={(v) => setR({ activity: v })} />
        <Area label="Краткое описание бизнеса" value={r.description} onChange={(v) => setR({ description: v })} />
        <Area label="Текущий статус проекта" value={r.status} onChange={(v) => setR({ status: v })} />
        <Area label="Краткая характеристика продукта/услуги" value={r.productBrief} onChange={(v) => setR({ productBrief: v })} />
        <Area label="Способ продаж" value={r.salesMethod} onChange={(v) => setR({ salesMethod: v })} />
        <Area label="Потенциальные потребители" value={r.consumers} onChange={(v) => setR({ consumers: v })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <NumField label="Необходимый стартовый капитал" suffix="руб." value={r.startCapital} onChange={(v) => setR({ startCapital: v })} />
          <Field label="Источники стартового капитала" value={r.capitalSources} onChange={(v) => setR({ capitalSources: v })} />
          <Field label="Срок реализации проекта" value={r.projectTerm} onChange={(v) => setR({ projectTerm: v })} />
          <Field label="Количество сотрудников" value={r.staffCount} onChange={(v) => setR({ staffCount: v })} />
          <Field label="Срок окупаемости проекта" value={r.payback} onChange={(v) => setR({ payback: v })} />
        </div>
      </div>
    </div>
  );
}

// ---- 2. Маркетинг ----

function MarketSection({ data, set }: { data: BizPlanData; set: Setter }) {
  const c = data.marketConcept;
  const setC = (patch: Partial<typeof c>) => set("marketConcept", { ...c, ...patch });
  return (
    <div className="space-y-5">
      <SectionTitle sub="Концепция, цена, продвижение">Маркетинговый план</SectionTitle>

      <div className="grid sm:grid-cols-2 gap-3">
        <Area label="Мой продукт/услуга" value={c.product} onChange={(v) => setC({ product: v })} />
        <Area label="Мои клиенты" value={c.clients} onChange={(v) => setC({ clients: v })} />
        <Area label="Нужды и потребности клиентов" value={c.needs} onChange={(v) => setC({ needs: v })} />
        <Area label="Мои конкуренты" value={c.competitors} onChange={(v) => setC({ competitors: v })} />
      </div>

      <div className="border border-[var(--drawing-line)]/40 p-3 space-y-3">
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)]">Цена</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <NumField label="Моя цена" suffix="руб." value={data.priceMyPrice} onChange={(v) => set("priceMyPrice", v)} />
          <Field label="Цены конкурентов" value={data.priceCompetitors} onChange={(v) => set("priceCompetitors", v)} />
        </div>
        <Area label="Причины установления этой цены" value={data.priceReason} onChange={(v) => set("priceReason", v)} />
        <Area label="Скидки для групп потребителей" value={data.priceDiscounts} onChange={(v) => set("priceDiscounts", v)} />
      </div>

      <div className="border border-[var(--drawing-line)]/40 p-3 space-y-3">
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)]">Продвижение</p>
        <Field label="Вид рекламы" value={data.promoAdType} onChange={(v) => set("promoAdType", v)} />
        <Area label="Метод продвижения" value={data.promoMethod} onChange={(v) => set("promoMethod", v)} />
        <NumField label="Бюджет на продвижение в месяц" suffix="руб." value={data.promoBudgetMonth} onChange={(v) => set("promoBudgetMonth", v)} />
      </div>
    </div>
  );
}

// ---- 3. Производство ----

function ProductionSection({ data, set }: { data: BizPlanData; set: Setter }) {
  return (
    <div className="space-y-5">
      <SectionTitle sub="Объёмы и план продаж">Производственный план</SectionTitle>
      <div className="border border-[var(--drawing-line)]/40 p-3 grid sm:grid-cols-2 gap-3">
        <NumField label="Планируемый объём продаж в месяц" suffix="шт." value={data.plannedSalesPerMonth} onChange={(v) => set("plannedSalesPerMonth", v)} />
        <NumField label="Цена реализации за единицу" suffix="руб." value={data.pricePerUnit} onChange={(v) => set("pricePerUnit", v)} />
      </div>
      <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
        Эти значения используются в расчётах раздела «Финансы».
      </p>
    </div>
  );
}

// ---- 4. Персонал ----

function StaffSection({ data, set, metrics }: { data: BizPlanData; set: Setter; metrics: ReturnType<typeof computeBizPlan> }) {
  const rows = data.staff;
  const update = (id: string, patch: Partial<StaffRow>) => set("staff", rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = () => set("staff", [...rows, { id: `s_${Date.now().toString(36)}`, position: "", count: 1, salaryMonth: 0 }]);
  const remove = (id: string) => set("staff", rows.filter((r) => r.id !== id));

  return (
    <div className="space-y-4">
      <SectionTitle sub="Должности и фонд оплаты труда">Организационный план. Персонал</SectionTitle>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_70px_120px_28px] gap-2 items-center">
            <input value={r.position} onChange={(e) => update(r.id, { position: e.target.value })} placeholder="Должность" className="drawing-input text-sm" />
            <input type="number" value={r.count} onChange={(e) => update(r.id, { count: Number(e.target.value) || 0 })} placeholder="Кол-во" className="drawing-input text-sm text-center" />
            <input type="number" value={r.salaryMonth} onChange={(e) => update(r.id, { salaryMonth: Number(e.target.value) || 0 })} placeholder="Оклад/мес" className="drawing-input text-sm text-right" />
            <button onClick={() => remove(r.id)} className="text-[var(--drawing-line-thin)] hover:text-red-600 p-1" aria-label="Удалить"><Icon name="Trash2" size={14} /></button>
          </div>
        ))}
        <button onClick={add} className="btn-drawing text-xs inline-flex items-center gap-1"><Icon name="Plus" size={14} />Добавить должность</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Stat label="ФОТ в месяц" value={fmtRub(metrics.fotMonth)} />
        <Stat label="ФОТ за год" value={fmtRub(metrics.fotYear)} accent />
        <Stat label={`Взносы за год (${Math.round(INSURANCE_TOTAL_RATE * 100)}%)`} value={fmtRub(metrics.insuranceYear)} />
      </div>
    </div>
  );
}

// ---- 5. Финансы ----

function FinanceSection({ data, set, metrics }: { data: BizPlanData; set: Setter; metrics: ReturnType<typeof computeBizPlan> }) {
  const mats = data.materials;
  const updMat = (id: string, patch: Partial<MaterialCost>) => set("materials", mats.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addMat = () => set("materials", [...mats, { id: `m_${Date.now().toString(36)}`, name: "", purchase: 0, qty: 1 }]);
  const rmMat = (id: string) => set("materials", mats.filter((x) => x.id !== id));

  const inds = data.indirectCosts;
  const updInd = (id: string, patch: Partial<IndirectCost>) => set("indirectCosts", inds.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addInd = () => set("indirectCosts", [...inds, { id: `i_${Date.now().toString(36)}`, name: "", amountMonth: 0 }]);
  const rmInd = (id: string) => set("indirectCosts", inds.filter((x) => x.id !== id));

  const sc = data.startCapital;
  const cs = data.capitalSources;

  return (
    <div className="space-y-5">
      <SectionTitle sub="Себестоимость, прибыль, капитал">Финансовый план</SectionTitle>

      {/* Прямые материальные затраты */}
      <div className="border border-[var(--drawing-line)]/40 p-3">
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-2">Прямые материальные затраты на единицу</p>
        <div className="space-y-2">
          {mats.map((x) => (
            <div key={x.id} className="grid grid-cols-[1fr_110px_70px_90px_28px] gap-2 items-center">
              <input value={x.name} onChange={(e) => updMat(x.id, { name: e.target.value })} placeholder="Сырьё/материалы" className="drawing-input text-sm" />
              <input type="number" value={x.purchase} onChange={(e) => updMat(x.id, { purchase: Number(e.target.value) || 0 })} placeholder="Цена" className="drawing-input text-sm text-right" />
              <input type="number" value={x.qty} onChange={(e) => updMat(x.id, { qty: Number(e.target.value) || 0 })} placeholder="Кол-во" className="drawing-input text-sm text-center" />
              <span className="font-mono text-xs text-right text-[var(--drawing-line)]">{fmtRub(x.purchase * x.qty)}</span>
              <button onClick={() => rmMat(x.id)} className="text-[var(--drawing-line-thin)] hover:text-red-600 p-1" aria-label="Удалить"><Icon name="Trash2" size={14} /></button>
            </div>
          ))}
          <button onClick={addMat} className="btn-drawing text-xs inline-flex items-center gap-1"><Icon name="Plus" size={14} />Добавить материал</button>
        </div>
        <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mt-2">Итого на единицу: <span className="font-mono text-[var(--drawing-line)]">{fmtRub(metrics.materialsPerUnit)}</span></p>
      </div>

      {/* Косвенные затраты */}
      <div className="border border-[var(--drawing-line)]/40 p-3">
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-2">Косвенные затраты за месяц</p>
        <div className="space-y-2">
          {inds.map((x) => (
            <div key={x.id} className="grid grid-cols-[1fr_120px_28px] gap-2 items-center">
              <input value={x.name} onChange={(e) => updInd(x.id, { name: e.target.value })} placeholder="Статья" className="drawing-input text-sm" />
              <input type="number" value={x.amountMonth} onChange={(e) => updInd(x.id, { amountMonth: Number(e.target.value) || 0 })} placeholder="Сумма/мес" className="drawing-input text-sm text-right" />
              <button onClick={() => rmInd(x.id)} className="text-[var(--drawing-line-thin)] hover:text-red-600 p-1" aria-label="Удалить"><Icon name="Trash2" size={14} /></button>
            </div>
          ))}
          <button onClick={addInd} className="btn-drawing text-xs inline-flex items-center gap-1"><Icon name="Plus" size={14} />Добавить статью</button>
        </div>
        <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mt-2">Итого за месяц: <span className="font-mono text-[var(--drawing-line)]">{fmtRub(metrics.indirectMonth)}</span></p>
      </div>

      {/* Налог */}
      <div className="border border-[var(--drawing-line)]/40 p-3 grid sm:grid-cols-2 gap-3">
        <NumField label="Ставка налога (УСН/прибыль)" suffix="%" value={data.taxRate} onChange={(v) => set("taxRate", v)} />
      </div>

      {/* Итоговые показатели */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Stat label="Себестоимость единицы" value={fmtRub(metrics.costPerUnit)} accent />
        <Stat label="Выручка / мес" value={fmtRub(metrics.revenueMonth)} />
        <Stat label="Валовая прибыль / мес" value={fmtRub(metrics.grossProfitMonth)} negative={metrics.grossProfitMonth < 0} />
        <Stat label="Налог / мес" value={fmtRub(metrics.taxMonth)} />
        <Stat label="Чистая прибыль / мес" value={fmtRub(metrics.netProfitMonth)} negative={metrics.netProfitMonth < 0} />
        <Stat label="Безубыточность" value={isFinite(metrics.breakEvenUnits) ? `${Math.ceil(metrics.breakEvenUnits)} шт.` : "—"} />
      </div>

      {/* Стартовый капитал */}
      <div className="border border-[var(--drawing-line)]/40 p-3 space-y-3">
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)]">Необходимый стартовый капитал</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <NumField label="Помещение" suffix="руб." value={sc.premises} onChange={(v) => set("startCapital", { ...sc, premises: v })} />
          <NumField label="Оборудование" suffix="руб." value={sc.equipment} onChange={(v) => set("startCapital", { ...sc, equipment: v })} />
          <NumField label="Оборотный капитал" suffix="руб." value={sc.workingCapital} onChange={(v) => set("startCapital", { ...sc, workingCapital: v })} />
        </div>
        <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Итого стартовый капитал: <span className="font-mono text-[var(--drawing-line)]">{fmtRub(metrics.startCapitalTotal)}</span></p>
      </div>

      {/* Источники */}
      <div className="border border-[var(--drawing-line)]/40 p-3 space-y-3">
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)]">Источники стартового капитала</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <NumField label="Собственные средства" suffix="руб." value={cs.own} onChange={(v) => set("capitalSources", { ...cs, own: v })} />
          <NumField label="Субсидии для начинающих" suffix="руб." value={cs.subsidy} onChange={(v) => set("capitalSources", { ...cs, subsidy: v })} />
          <NumField label="Другие источники" suffix="руб." value={cs.other} onChange={(v) => set("capitalSources", { ...cs, other: v })} />
        </div>
        <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Итого источники: <span className="font-mono text-[var(--drawing-line)]">{fmtRub(metrics.capitalSourcesTotal)}</span>
          {metrics.capitalSourcesTotal < metrics.startCapitalTotal && (
            <span className="text-red-600"> · не хватает {fmtRub(metrics.startCapitalTotal - metrics.capitalSourcesTotal)}</span>
          )}
        </p>
      </div>

      <Stat label="Окупаемость проекта" value={metrics.paybackMonths ? `${metrics.paybackMonths} мес.` : "—"} accent negative={!metrics.paybackMonths} />
    </div>
  );
}

// ---- 6. План действий ----

function ActionsSection({ data, set }: { data: BizPlanData; set: Setter }) {
  const rows = data.actions;
  const upd = (id: string, patch: Partial<ActionRow>) => set("actions", rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = () => set("actions", [...rows, { id: `a_${Date.now().toString(36)}`, name: "", term: "", description: "" }]);
  const rm = (id: string) => set("actions", rows.filter((r) => r.id !== id));
  return (
    <div className="space-y-4">
      <SectionTitle sub="Шаги для запуска бизнеса">План действий</SectionTitle>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="border border-[var(--drawing-line)]/40 p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-gost-upright font-black text-sm w-6 text-center text-[var(--drawing-accent)]">{i + 1}</span>
              <input value={r.name} onChange={(e) => upd(r.id, { name: e.target.value })} placeholder="Мероприятие" className="drawing-input text-sm flex-1" />
              <input value={r.term} onChange={(e) => upd(r.id, { term: e.target.value })} placeholder="Сроки" className="drawing-input text-sm w-28" />
              <button onClick={() => rm(r.id)} className="text-[var(--drawing-line-thin)] hover:text-red-600 p-1" aria-label="Удалить"><Icon name="Trash2" size={14} /></button>
            </div>
            <input value={r.description} onChange={(e) => upd(r.id, { description: e.target.value })} placeholder="Описание" className="drawing-input text-sm w-full" />
          </div>
        ))}
        <button onClick={add} className="btn-drawing text-xs inline-flex items-center gap-1"><Icon name="Plus" size={14} />Добавить шаг</button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, negative }: { label: string; value: string; accent?: boolean; negative?: boolean }) {
  return (
    <div className={`border p-3 bg-[var(--drawing-paper)] ${accent ? "border-2 border-[var(--drawing-accent)]" : "border-[var(--drawing-line)]/40"}`}>
      <p className={`font-gost-upright text-lg font-black leading-tight ${negative ? "text-red-600" : ""}`}>{value}</p>
      <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">{label}</p>
    </div>
  );
}
