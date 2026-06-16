/**
 * Конструктор бизнес-плана по методике АО «Корпорация «МСП»
 * (учебная тетрадь «Бизнес-план» для начинающих предпринимателей).
 *
 * Хранится единым JSON-документом владельца. Здесь: типы по разделам
 * оглавления, дефолтные данные, HTTP-обёртки и чистые функции расчётов
 * (калькуляция себестоимости, ФОТ, страховые взносы, прибыль, окупаемость).
 */
import func2url from "../../backend/func2url.json";
import { authorizedFetch } from "@/lib/auth";

const API = (func2url as Record<string, string>)["research-api"];

// ---- Типы строк таблиц ----

export interface TitleData {
  company: string;
  director: string;
  address: string;
  phone: string;
  email: string;
}

export interface ResumeData {
  businessName: string;
  activity: string;
  description: string;
  status: string;
  productBrief: string;
  salesMethod: string;
  consumers: string;
  startCapital: number;
  capitalSources: string;
  projectTerm: string;
  staffCount: string;
  payback: string;
}

export interface MarketConcept {
  product: string;
  clients: string;
  needs: string;
  competitors: string;
}

export interface MaterialCost {
  id: string;
  name: string; // сырьё/материалы
  purchase: number; // покупная стоимость
  qty: number; // количество на единицу
}

export interface StaffRow {
  id: string;
  position: string;
  count: number; // штатных единиц
  salaryMonth: number; // оклад в месяц, руб.
}

export interface IndirectCost {
  id: string;
  name: string;
  amountMonth: number; // сумма в месяц, руб.
}

export interface ActionRow {
  id: string;
  name: string;
  term: string;
  description: string;
}

export interface BizPlanData {
  title: TitleData;
  resume: ResumeData;
  marketConcept: MarketConcept;
  // Маркетинг — цена
  priceMyPrice: number;
  priceCompetitors: string;
  priceReason: string;
  priceDiscounts: string;
  // Маркетинг — продвижение
  promoAdType: string;
  promoMethod: string;
  promoBudgetMonth: number;
  // Финансы
  materials: MaterialCost[];
  staff: StaffRow[];
  indirectCosts: IndirectCost[];
  plannedSalesPerMonth: number; // планируемый объём продаж в месяц
  pricePerUnit: number; // цена реализации за единицу
  taxRate: number; // ставка налога на прибыль/УСН, %
  startCapital: { equipment: number; premises: number; workingCapital: number };
  capitalSources: { own: number; subsidy: number; other: number };
  // План действий
  actions: ActionRow[];
}

export interface BizPlan {
  id: number;
  title: string;
  data: BizPlanData;
  updated_at: string | null;
}

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

async function call<T = unknown>(action: string, body?: unknown): Promise<ApiResult<T>> {
  const qs = new URLSearchParams({ action }).toString();
  const res = await authorizedFetch(`${API}?${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data: data as T };
}

/** Страховые взносы (ставки из методички МСП 2016). */
export const INSURANCE_RATES = { pfr: 0.22, ffoms: 0.051, fss: 0.029, fssNs: 0.002 };
export const INSURANCE_TOTAL_RATE =
  INSURANCE_RATES.pfr + INSURANCE_RATES.ffoms + INSURANCE_RATES.fss + INSURANCE_RATES.fssNs; // 0.302

export function defaultBizPlanData(): BizPlanData {
  return {
    title: { company: "", director: "", address: "", phone: "", email: "" },
    resume: {
      businessName: "",
      activity: "",
      description: "",
      status: "",
      productBrief: "",
      salesMethod: "",
      consumers: "",
      startCapital: 0,
      capitalSources: "",
      projectTerm: "",
      staffCount: "",
      payback: "",
    },
    marketConcept: { product: "", clients: "", needs: "", competitors: "" },
    priceMyPrice: 0,
    priceCompetitors: "",
    priceReason: "",
    priceDiscounts: "",
    promoAdType: "",
    promoMethod: "",
    promoBudgetMonth: 0,
    materials: [{ id: "m1", name: "", purchase: 0, qty: 1 }],
    staff: [{ id: "s1", position: "", count: 1, salaryMonth: 0 }],
    indirectCosts: [
      { id: "i1", name: "Аренда помещения", amountMonth: 0 },
      { id: "i2", name: "Аренда оборудования", amountMonth: 0 },
      { id: "i3", name: "Коммунальные услуги", amountMonth: 0 },
      { id: "i4", name: "Банковский кредит (проценты)", amountMonth: 0 },
      { id: "i5", name: "Амортизация", amountMonth: 0 },
      { id: "i6", name: "Продвижение и реклама", amountMonth: 0 },
      { id: "i7", name: "Прочие расходы", amountMonth: 0 },
    ],
    plannedSalesPerMonth: 0,
    pricePerUnit: 0,
    taxRate: 6,
    startCapital: { equipment: 0, premises: 0, workingCapital: 0 },
    capitalSources: { own: 0, subsidy: 0, other: 0 },
    actions: [
      { id: "a1", name: "Поиск помещения под офис/бизнес", term: "", description: "" },
      { id: "a2", name: "Подготовка пакета документов на регистрацию бизнеса", term: "", description: "" },
      { id: "a3", name: "Государственная регистрация бизнеса", term: "", description: "" },
      { id: "a4", name: "Заключение договора аренды", term: "", description: "" },
      { id: "a5", name: "Открытие расчётного счёта", term: "", description: "" },
      { id: "a6", name: "Изготовление печати", term: "", description: "" },
      { id: "a7", name: "Оповещение госорганов об открытии бизнеса", term: "", description: "" },
      { id: "a8", name: "Получение лицензий, разрешений", term: "", description: "" },
      { id: "a9", name: "Поиск персонала", term: "", description: "" },
      { id: "a10", name: "Приобретение техники и мебели для оснащения офиса", term: "", description: "" },
      { id: "a11", name: "Заключение договора с первой командой сотрудников", term: "", description: "" },
      { id: "a12", name: "Запуск бизнеса", term: "", description: "" },
    ],
  };
}

export function getBizPlan() {
  return call<BizPlan>("bizplan-get", {
    default_title: "Бизнес-план",
    default_data: defaultBizPlanData(),
  });
}

export function saveBizPlan(id: number, title: string, data: BizPlanData) {
  return call<{ ok: boolean }>("bizplan-save", { id, title, data });
}

// ===== Расчёты =====

export interface BizPlanMetrics {
  materialsPerUnit: number; // прямые материальные затраты на единицу
  fotYear: number; // ФОТ за год
  fotMonth: number; // ФОТ в месяц
  insuranceYear: number; // взносы во внебюджетные фонды за год
  laborPerUnit: number; // затраты на оплату труда (с взносами) на единицу
  indirectMonth: number; // косвенные затраты в месяц
  indirectPerUnit: number; // косвенные на единицу
  costPerUnit: number; // полная себестоимость единицы
  revenueMonth: number; // выручка в месяц
  grossProfitMonth: number; // валовая прибыль в месяц
  taxMonth: number; // налог в месяц
  netProfitMonth: number; // чистая прибыль в месяц
  marginPerUnit: number; // маржа с единицы (цена − себестоимость)
  breakEvenUnits: number; // точка безубыточности (шт./мес)
  startCapitalTotal: number; // итого стартовый капитал
  capitalSourcesTotal: number; // итого источники
  paybackMonths: number | null; // окупаемость, мес.
}

export function computeBizPlan(d: BizPlanData): BizPlanMetrics {
  const sales = Math.max(0, d.plannedSalesPerMonth || 0);

  const materialsPerUnit = d.materials.reduce(
    (s, m) => s + (Number(m.purchase) || 0) * (Number(m.qty) || 0),
    0,
  );

  const fotMonth = d.staff.reduce((s, r) => s + (Number(r.count) || 0) * (Number(r.salaryMonth) || 0), 0);
  const fotYear = fotMonth * 12;
  const insuranceYear = fotYear * INSURANCE_TOTAL_RATE;
  const laborMonthWithIns = fotMonth * (1 + INSURANCE_TOTAL_RATE);
  const laborPerUnit = sales > 0 ? laborMonthWithIns / sales : 0;

  const indirectMonth = d.indirectCosts.reduce((s, c) => s + (Number(c.amountMonth) || 0), 0);
  const indirectPerUnit = sales > 0 ? indirectMonth / sales : 0;

  const costPerUnit = materialsPerUnit + laborPerUnit + indirectPerUnit;

  const price = Number(d.pricePerUnit) || 0;
  const revenueMonth = price * sales;
  const totalCostMonth = materialsPerUnit * sales + laborMonthWithIns + indirectMonth;
  const grossProfitMonth = revenueMonth - totalCostMonth;
  const taxMonth = grossProfitMonth > 0 ? grossProfitMonth * ((d.taxRate || 0) / 100) : 0;
  const netProfitMonth = grossProfitMonth - taxMonth;

  // Точка безубыточности: постоянные = ФОТ+взносы+косвенные; переменные = материалы/ед.
  const fixedMonth = laborMonthWithIns + indirectMonth;
  const marginPerUnit = price - materialsPerUnit;
  const breakEvenUnits = marginPerUnit > 0 ? fixedMonth / marginPerUnit : Infinity;

  const marginFull = price - costPerUnit;

  const startCapitalTotal =
    (d.startCapital.equipment || 0) + (d.startCapital.premises || 0) + (d.startCapital.workingCapital || 0);
  const capitalSourcesTotal =
    (d.capitalSources.own || 0) + (d.capitalSources.subsidy || 0) + (d.capitalSources.other || 0);

  const paybackMonths =
    netProfitMonth > 0 && startCapitalTotal > 0
      ? Math.ceil(startCapitalTotal / netProfitMonth)
      : null;

  return {
    materialsPerUnit,
    fotYear,
    fotMonth,
    insuranceYear,
    laborPerUnit,
    indirectMonth,
    indirectPerUnit,
    costPerUnit,
    revenueMonth,
    grossProfitMonth,
    taxMonth,
    netProfitMonth,
    marginPerUnit: marginFull,
    breakEvenUnits,
    startCapitalTotal,
    capitalSourcesTotal,
    paybackMonths,
  };
}

/** Денежный формат «1 234 567 ₽». */
export function fmtRub(v: number): string {
  if (!isFinite(v)) return "—";
  return `${Math.round(v).toLocaleString("ru-RU")} ₽`;
}
