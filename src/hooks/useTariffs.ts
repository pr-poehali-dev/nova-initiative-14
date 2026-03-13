import { useState, useEffect } from "react";
import funcUrls from "../../backend/func2url.json";

export interface Tariff {
  id: number;
  pos: string;
  slug: string;
  title: string;
  duration: string;
  audience: string;
  format: string;
  price: number;
  price_label: string | null;
  includes: string[];
  between_sessions: string | null;
  review_policy: string | null;
  limits_info: string | null;
  cta_text: string;
  cta_link: string;
  is_popular: boolean;
  is_warning: boolean;
  sort_order: number;
}

export const formatPrice = (t: Tariff) => {
  if (t.price_label) return t.price_label;
  if (t.price > 0) return t.price.toLocaleString("ru-RU");
  return "по запросу";
};

export const formatPriceWithCurrency = (t: Tariff) => {
  const base = formatPrice(t);
  return t.price > 0 ? `${base} ₽` : base;
};

let cachedTariffs: Tariff[] | null = null;
let fetchPromise: Promise<Tariff[]> | null = null;

const fetchTariffs = (): Promise<Tariff[]> => {
  if (cachedTariffs) return Promise.resolve(cachedTariffs);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(funcUrls["get-tariffs"])
    .then((r) => r.json())
    .then((data) => {
      cachedTariffs = data.tariffs || [];
      return cachedTariffs!;
    })
    .catch(() => {
      fetchPromise = null;
      return [] as Tariff[];
    });

  return fetchPromise;
};

export default function useTariffs() {
  const [tariffs, setTariffs] = useState<Tariff[]>(cachedTariffs || []);
  const [loading, setLoading] = useState(!cachedTariffs);

  useEffect(() => {
    fetchTariffs().then((data) => {
      setTariffs(data);
      setLoading(false);
    });
  }, []);

  const findBySlug = (slug: string) => tariffs.find((t) => t.slug === slug);
  const priceRange = () => {
    const prices = tariffs.filter((t) => t.price > 0).map((t) => t.price);
    if (prices.length === 0) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  };

  return { tariffs, loading, findBySlug, priceRange };
}
