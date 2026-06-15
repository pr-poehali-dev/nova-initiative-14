import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import { fetchArticles, formatRuDate, type ArticleListItem } from "@/lib/articles";
import { SITE_URL, SITE_NAME, SITE_OG_IMAGE, absUrl, breadcrumbsLd } from "@/lib/seo";
import RelatedSections from "@/components/RelatedSections";
import ReducerSeries from "@/components/blog/ReducerSeries";

const BLOG_TITLE = "Инженерный блог — статьи о ВКР, ЕСКД и КОМПАС-3D · Диплом-Инж.рф";
const BLOG_DESC =
  "Экспертные лонгриды для студентов и наставников: оформление ВКР по ГОСТ, расчёты в КОМПАС-3D и APM FEM, материалы, допуски и посадки, защита диплома в УрФУ.";
const BLOG_URL = `${SITE_URL}/blog`;

const Blog = () => {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles()
      .then((data) => setArticles(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const itemListLd = articles.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Инженерный блог Диплом-Инж.рф",
        itemListElement: articles.map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absUrl(`/blog/${a.slug}`),
          name: a.h1,
        })),
      }
    : null;

  return (
    <>
      <Helmet>
        <title>{BLOG_TITLE}</title>
        <meta name="description" content={BLOG_DESC} />
        <link rel="canonical" href={BLOG_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={BLOG_TITLE} />
        <meta property="og:description" content={BLOG_DESC} />
        <meta property="og:url" content={BLOG_URL} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:image" content={SITE_OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={BLOG_TITLE} />
        <meta name="twitter:description" content={BLOG_DESC} />
        <meta name="twitter:image" content={SITE_OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbsLd([["Блог", "/blog"]]))}
        </script>
        {itemListLd && (
          <script type="application/ld+json">{JSON.stringify(itemListLd)}</script>
        )}
      </Helmet>

      <div className="max-w-[1100px] mx-auto px-4 py-8 md:py-12 pt-20 md:pt-24">
        <header className="mb-10 text-center">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
            Инженерный журнал · Диплом-Инж.рф
          </p>
          <h1 className="font-gost-upright text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wide text-[var(--drawing-line)] break-words">
            Блог конструкторской школы
          </h1>
          <p className="mt-4 text-[var(--drawing-line-thin)] max-w-2xl mx-auto">
            Разборы методичек УрФУ, расчётные кейсы, ЕСКД и культура инженерного цитирования.
            Поднимаем уровень инженерии в России — статья за статьёй.
          </p>
        </header>

        {loading && (
          <p className="text-center font-gost text-[var(--drawing-line-thin)]">Загружаем статьи…</p>
        )}
        {error && (
          <p className="text-center text-[var(--drawing-accent)]">Не удалось загрузить статьи.</p>
        )}

        {!loading && !error && articles.length === 0 && (
          <p className="text-center font-gost text-[var(--drawing-line-thin)]">
            Статьи скоро появятся.
          </p>
        )}

        {/* Витрина кластера «Проектирование редуктора» — единый маршрут серии. */}
        {!loading && !error && articles.length > 0 && <ReducerSeries />}

        <div className="grid gap-4 md:gap-5 md:grid-cols-2">
          {articles.map((a) => (
            <Link key={a.slug} to={`/blog/${a.slug}`} className="blog-card block">
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                {formatRuDate(a.published_at)} · {a.reading_minutes} мин чтения
              </p>
              <h2 className="font-gost-upright text-lg md:text-xl font-bold mt-2 mb-2 text-[var(--drawing-line)] leading-snug">
                {a.h1}
              </h2>
              <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed">{a.summary}</p>
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] mt-3 text-[var(--drawing-accent)]">
                Читать материал →
              </p>
            </Link>
          ))}
        </div>

        <RelatedSections
          heading="Куда дальше"
          links={[
            { to: "/cae", icon: "Calculator", title: "CAE-сервис", text: "Примените теорию из статей на практике: расчёт балок, рам и ферм онлайн." },
            { to: "/program", icon: "ListChecks", title: "Программа наставничества", text: "10 модулей дипломного проекта — от задания до защиты ВКР." },
            { to: "/cases", icon: "FileCheck", title: "Кейсы студентов", text: "Реальные истории доведения дипломного проекта до защиты." },
          ]}
        />
      </div>
    </>
  );
};

export default Blog;