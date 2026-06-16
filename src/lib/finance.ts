/**
 * Финансовая модель бизнес-плана (модуль «Бизнес-планы», research-api).
 * Хранится как единый JSON-документ владельца. Здесь: типы, HTTP-обёртки,
 * дефолтная модель и чистые функции расчёта по канонам юнит-экономики.
 */
import func2url from "../../backend/func2url.json";
import { authorizedFetch } from "@/lib/auth";

const API = (func2url as Record<string, string>)["research-api"];

/** Статья постоянных затрат (в месяц), руб. */
export interface FixedCost {
  id: string;
  name: string;
  amount: number;
}

/** Параметры финансовой модели (вводит владелец). */
export interface FinanceData {
  price: number; // цена за единицу/подписку, руб.
  variableCost: number; // переменные затраты на единицу, руб.
  unitsPerMonth: number; // объём продаж в месяц, шт./подписок
  fixedCosts: FixedCost[]; // постоянные затраты в месяц
  initialInvestment: number; // стартовые вложения, руб.
  horizonMonths: number; // горизонт прогноза, мес.
  monthlyGrowthPct: number; // помесячный рост продаж, %
}

export interface FinanceModel {
  id: number;
  title: string;
  data: FinanceData;
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

/** Дефолтная модель — реалистичные стартовые цифры для CAE-подписки. */
export function defaultFinanceData(): FinanceData {
  return {
    price: 2000,
    variableCost: 300,
    unitsPerMonth: 50,
    fixedCosts: [
      { id: "f1", name: "Хостинг и инфраструктура", amount: 15000 },
      { id: "f2", name: "Зарплаты / подряд", amount: 120000 },
      { id: "f3", name: "Маркетинг", amount: 40000 },
    ],
    initialInvestment: 500000,
    horizonMonths: 12,
    monthlyGrowthPct: 8,
  };
}

export function getFinanceModel() {
  return call<FinanceModel>("finance-get", {
    default_title: "Финансовая модель",
    default_data: defaultFinanceData(),
  });
}

export function saveFinanceModel(id: number, title: string, data: FinanceData) {
  return call<{ ok: boolean }>("finance-save", { id, title, data });
}

// ===== Расчёты (чистые функции) =====

export interface FinanceMetrics {
  marginPerUnit: number; // маржинальная прибыль на единицу
  marginPct: number; // маржинальность, %
  totalFixed: number; // сумма постоянных затрат, мес.
  revenue: number; // выручка в мес. (база)
  variableTotal: number; // переменные затраты, мес.
  profit: number; // операционная прибыль, мес.
  breakEvenUnits: number; // точка безубыточности в единицах
  breakEvenRevenue: number; // точка безубыточности в выручке
  paybackMonths: number | null; // окупаемость вложений, мес. (null если не окупается)
}

export interface MonthPoint {
  month: number;
  units: number;
  revenue: number;
  costs: number; // переменные + постоянные
  profit: number;
  cumulativeProfit: number; // нарастающим итогом за вычетом стартовых вложений
}

export function computeMetrics(d: FinanceData): FinanceMetrics {
  const totalFixed = d.fixedCosts.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const marginPerUnit = d.price - d.variableCost;
  const marginPct = d.price > 0 ? (marginPerUnit / d.price) * 100 : 0;
  const revenue = d.price * d.unitsPerMonth;
  const variableTotal = d.variableCost * d.unitsPerMonth;
  const profit = revenue - variableTotal - totalFixed;
  const breakEvenUnits = marginPerUnit > 0 ? totalFixed / marginPerUnit : Infinity;
  const breakEvenRevenue = breakEvenUnits === Infinity ? Infinity : breakEvenUnits * d.price;

  // Окупаемость: первый месяц, когда накопленная прибыль ≥ стартовых вложений.
  let paybackMonths: number | null = null;
  let cum = 0;
  let units = d.unitsPerMonth;
  for (let m = 1; m <= Math.max(d.horizonMonths, 60); m++) {
    const rev = d.price * units;
    const varc = d.variableCost * units;
    cum += rev - varc - totalFixed;
    if (cum >= d.initialInvestment) {
      paybackMonths = m;
      break;
    }
    units = units * (1 + d.monthlyGrowthPct / 100);
  }

  return {
    marginPerUnit,
    marginPct,
    totalFixed,
    revenue,
    variableTotal,
    profit,
    breakEvenUnits,
    breakEvenRevenue,
    paybackMonths,
  };
}

/** Помесячный прогноз с учётом роста продаж. */
export function projectMonths(d: FinanceData): MonthPoint[] {
  const totalFixed = d.fixedCosts.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const points: MonthPoint[] = [];
  let units = d.unitsPerMonth;
  let cumulative = -d.initialInvestment;
  const horizon = Math.max(1, Math.min(120, d.horizonMonths || 12));
  for (let m = 1; m <= horizon; m++) {
    const revenue = d.price * units;
    const variable = d.variableCost * units;
    const costs = variable + totalFixed;
    const profit = revenue - costs;
    cumulative += profit;
    points.push({
      month: m,
      units: Math.round(units),
      revenue,
      costs,
      profit,
      cumulativeProfit: cumulative,
    });
    units = units * (1 + d.monthlyGrowthPct / 100);
  }
  return points;
}

/** Денежный формат «1 234 567 ₽». */
export function fmtRub(v: number): string {
  if (!isFinite(v)) return "—";
  return `${Math.round(v).toLocaleString("ru-RU")} ₽`;
}
