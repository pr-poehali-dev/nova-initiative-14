import func2url from "../../backend/func2url.json";
import { authorizedFetch } from "@/lib/auth";
import type { FlyerOptions } from "@/lib/print-flyer";

const API = (func2url as Record<string, string>)["sso-auth"];

/** Сводная статистика по одной кампании. */
export interface CampaignStats {
  visits: number;
  signups: number;
  conversion: number;
  revenue_kopecks: number;
  revenue_by_type: Record<string, number>;
  avg_invited: number;
  printed: number;
  print_cost_kopecks: number;
  cost_per_signup_rub: number;
  unit_price_kopecks: number;
  orders: PrintOrder[];
}

/** Один заказ печати (тираж + стоимость + дата). */
export interface PrintOrder {
  id: number;
  quantity: number;
  total_kopecks: number;
  created: string;
}

export interface AdCampaign {
  id: number;
  slug: string;
  name: string;
  kind: string;
  config: FlyerOptions | null;
  isLocked: boolean;
  created: string;
  stats: CampaignStats;
}

export interface CampaignsOverview {
  by_source_type: { sourceType: string; signups: number }[];
  by_campaign: { campaign: string; signups: number; revenue_kopecks: number }[];
}

async function getJson<T>(action: string): Promise<{ ok: boolean; data: T | null }> {
  const res = await authorizedFetch(`${API}?action=${action}`);
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { ok: res.ok, data: res.ok ? data : null };
}

async function postJson<T>(
  action: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: T | null; message?: string }> {
  const res = await authorizedFetch(`${API}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  const obj = (data as Record<string, unknown>) || {};
  return {
    ok: res.ok,
    status: res.status,
    data,
    message: (obj.message as string) || undefined,
  };
}

/** Список кампаний со сводной статистикой. */
export function fetchAdCampaigns() {
  return getJson<{ campaigns: AdCampaign[] }>("ad-campaigns");
}

/** Сводная эффективность всех источников (для кругового графика). */
export function fetchCampaignsOverview() {
  return getJson<CampaignsOverview>("ad-campaigns-overview");
}

/** Создать/обновить кампанию (config — текущая конфигурация листовки). */
export function saveAdCampaign(payload: {
  slug: string;
  name: string;
  kind?: string;
  config?: FlyerOptions;
}) {
  return postJson<{ ok: boolean; id: number; slug: string }>("ad-campaign-save", payload);
}

/** Зафиксировать заказ печати (лочит кампанию, тиражи суммируются). */
export function orderCampaignPrint(payload: {
  slug: string;
  name?: string;
  quantity: number;
  total_rub: number;
  config?: FlyerOptions;
}) {
  return postJson<{ ok: boolean; slug: string; stats: CampaignStats }>(
    "ad-campaign-print",
    payload,
  );
}

/** Форматирует копейки в рубли «1 234 ₽». */
export function formatRub(kopecks: number): string {
  return `${Math.round(kopecks / 100).toLocaleString("ru-RU")} ₽`;
}