#!/usr/bin/env node
/**
 * SSG-пререндер блога: после vite build тянет статьи из бэкенда
 * и записывает статический HTML каждой статьи в dist/blog/<slug>/index.html,
 * чтобы Google и AI-парсеры видели текст без выполнения JS.
 *
 * Источник: backend/func2url.json -> get-contacts ?resource=articles
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const TEMPLATE = path.join(DIST, "index.html");

const SITE_URL = "https://xn----gtbhgbqhkfi.xn--p1ai";

function loadApi() {
  const raw = fs.readFileSync(path.join(ROOT, "backend/func2url.json"), "utf-8");
  const map = JSON.parse(raw);
  return map["get-contacts"];
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildArticleHtml(template, article) {
  const url = `${SITE_URL}/blog/${article.slug}`;
  const date = (iso) => (iso ? new Date(iso).toLocaleDateString("ru-RU") : "");

  const qfHtml = (article.quick_facts || [])
    .map(
      (f, i) =>
        `<dt>В.&nbsp;${i + 1}. ${escapeHtml(f.q)}</dt><dd>О. ${escapeHtml(f.a)}</dd>`
    )
    .join("");

  const bibHtml = (article.bibliography || [])
    .map((b) => `<li>${escapeHtml(b.text)}</li>`)
    .join("");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: article.h1,
    description: article.seo_description,
    keywords: article.seo_keywords,
    inLanguage: "ru-RU",
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      "@type": "Organization",
      name: article.author_name,
      description: article.author_role,
      url: SITE_URL,
    },
    publisher: { "@type": "Organization", name: "Диплом-Инж.рф", url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    citation: (article.bibliography || []).map((b) => ({
      "@type": "CreativeWork",
      name: b.text,
    })),
  };

  const faqLd = (article.quick_facts || []).length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: article.quick_facts.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  const body = `
    <article class="eskd-page">
      <header class="eskd-title">
        <div class="eskd-org">Министерство образования и науки Российской Федерации</div>
        <div class="eskd-org">Уральский федеральный университет (внеучебный материал)</div>
        <h1>${escapeHtml(article.h1)}</h1>
        <div class="eskd-meta">${date(article.published_at)} · ${
          article.reading_minutes
        } мин · ${escapeHtml(article.author_name)}</div>
      </header>
      ${
        qfHtml
          ? `<section class="eskd-quickfacts"><h2>Краткая инженерная справка</h2><dl>${qfHtml}</dl></section>`
          : ""
      }
      <div class="eskd-body">${article.body_html}</div>
      ${
        bibHtml
          ? `<section class="eskd-bibliography"><h2>Список использованных источников</h2><ol>${bibHtml}</ol></section>`
          : ""
      }
    </article>
  `;

  let html = template;

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(article.seo_title)}</title>`
  );
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escapeHtml(article.seo_description)}"/>`
  );
  if (article.seo_keywords) {
    html = html.replace(
      /<meta name="keywords"[^>]*>/,
      `<meta name="keywords" content="${escapeHtml(article.seo_keywords)}"/>`
    );
  }
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${url}"/>`
  );
  html = html.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${url}"/>`
  );
  html = html.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${escapeHtml(article.seo_title)}"/>`
  );
  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${escapeHtml(article.seo_description)}"/>`
  );

  const ldScripts = `<script type="application/ld+json">${JSON.stringify(
    jsonLd
  )}</script>${faqLd ? `<script type="application/ld+json">${JSON.stringify(faqLd)}</script>` : ""}`;
  html = html.replace("</head>", `${ldScripts}</head>`);

  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  return html;
}

function buildSitemap(articles) {
  const staticPages = [
    ["/", "weekly", "1.0"],
    ["/program", "monthly", "0.9"],
    ["/pricing", "monthly", "0.9"],
    ["/cases", "monthly", "0.8"],
    ["/blog", "weekly", "0.9"],
    ["/experts", "monthly", "0.8"],
    ["/reviews", "monthly", "0.8"],
    ["/faq", "monthly", "0.7"],
    ["/about", "monthly", "0.7"],
    ["/contacts", "monthly", "0.9"],
    ["/vacancies", "monthly", "0.6"],
  ];

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const [p, freq, prio] of staticPages) {
    lines.push(
      `  <url><loc>${SITE_URL}${p}</loc><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`
    );
  }

  for (const a of articles) {
    const lastmod = a.updated_at ? a.updated_at.slice(0, 10) : "";
    lines.push(
      `  <url><loc>${SITE_URL}/blog/${a.slug}</loc>${
        lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
      }<changefreq>monthly</changefreq><priority>0.8</priority></url>`
    );
  }

  lines.push("</urlset>");
  return lines.join("\n");
}

async function main() {
  if (!fs.existsSync(TEMPLATE)) {
    console.warn("[prerender] dist/index.html не найден, пропуск.");
    return;
  }
  const apiUrl = loadApi();
  if (!apiUrl) {
    console.warn("[prerender] get-contacts URL не найден в func2url.json, пропуск.");
    return;
  }

  console.log("[prerender] Получаем список статей…");
  let list;
  try {
    list = await fetchJSON(`${apiUrl}?resource=articles`);
  } catch (e) {
    console.warn("[prerender] Не удалось получить список статей:", e.message);
    return;
  }
  const items = list.articles || [];

  const template = fs.readFileSync(TEMPLATE, "utf-8");

  for (const item of items) {
    try {
      const full = await fetchJSON(`${apiUrl}?resource=articles&slug=${encodeURIComponent(item.slug)}`);
      const html = buildArticleHtml(template, full);
      const dir = path.join(DIST, "blog", item.slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
      console.log(`[prerender] ✓ /blog/${item.slug}`);
    } catch (e) {
      console.warn(`[prerender] ✗ ${item.slug}: ${e.message}`);
    }
  }

  // sitemap
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), buildSitemap(items), "utf-8");
  console.log(`[prerender] ✓ sitemap.xml (${items.length} статей)`);
}

main().catch((e) => {
  console.error("[prerender] FATAL", e);
  process.exitCode = 0; // не валим билд
});
