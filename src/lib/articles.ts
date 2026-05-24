import func2url from "../../backend/func2url.json";

export interface QuickFact {
  q: string;
  a: string;
}

export interface BibItem {
  n: number;
  text: string;
}

export interface ArticleListItem {
  id: number;
  slug: string;
  h1: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  summary: string;
  author_name: string;
  author_role: string;
  cover_url: string;
  reading_minutes: number;
  published_at: string | null;
  updated_at: string | null;
}

export interface Article extends ArticleListItem {
  quick_facts: QuickFact[];
  body_html: string;
  bibliography: BibItem[];
}

const API = (func2url as Record<string, string>)["get-contacts"];

export async function fetchArticles(): Promise<ArticleListItem[]> {
  const res = await fetch(`${API}?resource=articles`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch articles: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.articles) ? data.articles : [];
}

export async function fetchArticle(slug: string): Promise<Article | null> {
  const res = await fetch(`${API}?resource=articles&slug=${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch article");
  return res.json();
}

export function formatRuDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}