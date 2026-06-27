/**
 * Публичная загрузка тарифов виджета из БД (таблица widget_tariffs) для
 * лендинга /widget-balka и коммерческого предложения. Цены берутся из единой
 * админ-панели «Тарифы», поэтому везде совпадают.
 */
import { useEffect, useState } from "react";
import func2url from "../../backend/func2url.json";

const API = (func2url as Record<string, string>)["get-tariffs"];

export interface WidgetPlan {
  id: number;
  slug: string;
  name: string;
  price_monthly: number;
  calc_limit: number;
  max_sites: number;
  features: string[];
  is_popular: boolean;
}

/** Тарифы виджета по умолчанию — fallback, если API недоступен. */
export const FALLBACK_WIDGET_PLANS: WidgetPlan[] = [
  {
    id: 1,
    slug: "start",
    name: "Старт",
    price_monthly: 3900,
    calc_limit: 1000,
    max_sites: 1,
    features: [
      "До 1 000 расчётов в месяц",
      "1 сайт",
      "Заявки на email",
      "Настраиваемый лимит расчётов в сутки на посетителя",
    ],
    is_popular: false,
  },
  {
    id: 2,
    slug: "business",
    name: "Бизнес",
    price_monthly: 8900,
    calc_limit: 5000,
    max_sites: 3,
    features: [
      "До 5 000 расчётов в месяц",
      "До 3 сайтов",
      "Приоритетная поддержка",
      "Логотип компании в виджете",
      "Настраиваемый лимит расчётов в сутки на посетителя",
    ],
    is_popular: true,
  },
  {
    id: 3,
    slug: "zavod",
    name: "Завод",
    price_monthly: 19900,
    calc_limit: 50000,
    max_sites: -1,
    features: [
      "До 50 000 расчётов в месяц",
      "Безлимит сайтов",
      "Webhook в вашу CRM",
      "Брендирование под вас",
      "Настраиваемый лимит расчётов в сутки на посетителя",
    ],
    is_popular: false,
  },
];

export function formatWidgetPrice(rub: number): string {
  return rub.toLocaleString("ru-RU") + " ₽/мес";
}

/** Лимит расчётов в месяц: -1 → «Безлимит», иначе число с разделителями. */
export function formatCalcLimit(limit: number): string {
  return limit < 0 ? "Безлимит" : limit.toLocaleString("ru-RU");
}

/**
 * Хук тарифов виджета. Возвращает данные из БД, пока грузится — fallback,
 * чтобы лендинг и КП всегда показывали корректные цены без мигания.
 */
export function useWidgetPlans(): WidgetPlan[] {
  const [plans, setPlans] = useState<WidgetPlan[]>(FALLBACK_WIDGET_PLANS);

  useEffect(() => {
    let alive = true;
    fetch(`${API}?kind=widget`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.tariffs) && d.tariffs.length) {
          setPlans(d.tariffs as WidgetPlan[]);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return plans;
}