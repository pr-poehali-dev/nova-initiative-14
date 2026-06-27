/**
 * HTTP-обёртки для backend tariffs-admin.
 * Управление всеми тарифами (CAE, обучение, виджет) и расчёт экономики:
 * себестоимость единицы расчёта и рекомендованная цена. Только для админа.
 */
import func2url from "../../backend/func2url.json";
import { authorizedFetch } from "@/lib/auth";

const API = (func2url as Record<string, string>)["tariffs-admin"];

export interface PricingSettings {
  monthly_infra_rub: number;
  gb_second_rub: number;
  cae_timeout_sec: number;
  cae_memory_mb: number;
  cae_avg_duration_ms: number;
  widget_timeout_sec: number;
  widget_memory_mb: number;
  widget_avg_duration_ms: number;
  monthly_calc_volume: number;
  margin_multiplier: number;
}

export interface UnitEconomics {
  compute_rub: number;
  infra_per_calc_rub: number;
  unit_cost_rub: number;
  recommended_unit_price_rub: number;
}

export interface Economics {
  cae: UnitEconomics;
  widget: UnitEconomics;
  margin_multiplier: number;
  infra_per_calc_rub: number;
}

export interface WidgetTariff {
  id: number;
  slug: string;
  name: string;
  price_monthly: number;
  calc_limit: number;
  max_sites: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  cost_rub: number;
  recommended_price_rub: number;
}

export interface CaeTariff {
  id: number;
  slug: string;
  name: string;
  price_monthly: number;
  price_one_off: number;
  max_solves_per_month: number;
  max_elements: number;
  is_public: boolean;
  sort_order: number;
  is_unlimited: boolean;
  cost_rub: number | null;
  recommended_price_rub: number | null;
}

export interface EduTariff {
  id: number;
  slug: string;
  title: string;
  duration: string;
  price: number;
  price_label: string | null;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface TariffsOverview {
  settings: PricingSettings;
  economics: Economics;
  widget_tariffs: WidgetTariff[];
  cae_tariffs: CaeTariff[];
  edu_tariffs: EduTariff[];
}

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message?: string;
}

async function call<T = unknown>(
  action: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<ApiResult<T>> {
  const qs = new URLSearchParams({ action }).toString();
  const res = await authorizedFetch(`${API}?${qs}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const obj = (data as Record<string, unknown>) || {};
  return {
    ok: res.ok,
    status: res.status,
    data: data as T,
    message: (obj.message as string) || undefined,
  };
}

export function getTariffsOverview() {
  return call<TariffsOverview>("overview", "GET");
}

export function saveSettings(patch: Partial<PricingSettings>) {
  return call<{ ok: boolean; settings: PricingSettings; economics: Economics }>(
    "save-settings",
    "POST",
    patch,
  );
}

export function saveWidgetTariff(t: Partial<WidgetTariff>) {
  return call<{ ok: boolean }>("save-widget", "POST", t);
}

export function saveCaeTariff(t: { id: number; price_monthly: number; price_one_off?: number }) {
  return call<{ ok: boolean }>("save-cae", "POST", t);
}

export function saveEduTariff(t: { id: number; price: number; price_label?: string | null }) {
  return call<{ ok: boolean }>("save-tariff", "POST", t);
}
