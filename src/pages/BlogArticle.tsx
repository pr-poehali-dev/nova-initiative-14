import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import { fetchArticle, fetchPageViews, formatRuDate, type Article } from "@/lib/articles";
import { SITE_URL, SITE_NAME, SITE_OG_IMAGE, breadcrumbsLd } from "@/lib/seo";
import NotFoundPage from "@/pages/NotFoundPage";
import ReadingProgress from "@/components/blog/ReadingProgress";
import ArticleToc from "@/components/blog/ArticleToc";
import RelatedSections from "@/components/RelatedSections";

const ORG_NAME = "Инженерный журнал Диплом-Инж.рф";
const PROVERIL = "Диплом-Инж.рф";

const BlogArticle = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchArticle(slug)
      .then((data) => {
        if (!data) setNotFound(true);
        setArticle(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    // Небольшая задержка — чтобы наш собственный заход успел записаться.
    const t = window.setTimeout(() => {
      fetchPageViews(`/blog/${slug}`).then((r) => {
        if (alive) setViews(r.unique);
      });
    }, 1200);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [slug]);

  if (notFound && !loading) return <NotFoundPage />;
  if (loading || !article) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-20 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем материал…
      </div>
    );
  }

  const url = `${SITE_URL}/blog/${article.slug}`;
  const ogImage = article.cover_url || SITE_OG_IMAGE;

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
    publisher: {
      "@type": "Organization",
      name: "Диплом-Инж.рф",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    citation: article.bibliography.map((b) => ({
      "@type": "CreativeWork",
      name: b.text,
    })),
  };

  const faqLd = article.quick_facts.length
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

  return (
    <>
      <Helmet>
        <title>{article.seo_title}</title>
        <meta name="description" content={article.seo_description} />
        {article.seo_keywords && <meta name="keywords" content={article.seo_keywords} />}
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={article.seo_title} />
        <meta property="og:description" content={article.seo_description} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.seo_title} />
        <meta name="twitter:description" content={article.seo_description} />
        <meta name="twitter:image" content={ogImage} />
        {article.published_at && (
          <meta property="article:published_time" content={article.published_at} />
        )}
        {article.updated_at && (
          <meta property="article:modified_time" content={article.updated_at} />
        )}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        {faqLd && <script type="application/ld+json">{JSON.stringify(faqLd)}</script>}
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbsLd([
              ["Блог", "/blog"],
              [article.h1, `/blog/${article.slug}`],
            ])
          )}
        </script>
      </Helmet>

      <ReadingProgress />

      <div className="px-3 sm:px-4 py-6 md:py-10 pt-20 md:pt-24">
        <div className="max-w-[820px] mx-auto mb-4">
          <Link
            to="/blog"
            className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
          >
            ← Все материалы
          </Link>
        </div>

        <article className="eskd-page">
          <header className="eskd-title">
            <div className="eskd-org">{ORG_NAME}</div>
            <h1>{article.h1}</h1>
            <div className="eskd-meta">
              {formatRuDate(article.published_at)} · {article.reading_minutes} мин ·{" "}
              {article.author_name}
              {views !== null && views > 0 && (
                <> · прочитали {views}&nbsp;{views === 1 ? "раз" : "раз"}</>
              )}
            </div>
          </header>

          {article.cover_url && (
            <img
              src={article.cover_url}
              alt={article.h1}
              className="w-full aspect-[16/9] object-cover my-4 border border-[var(--drawing-line)]/30"
            />
          )}

          {article.quick_facts.length > 0 && (
            <section className="eskd-quickfacts">
              <h2>Краткая инженерная справка</h2>
              <dl>
                {article.quick_facts.map((f, i) => (
                  <div key={i}>
                    <dt>В.&nbsp;{i + 1}. {f.q}</dt>
                    <dd>О. {f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <ArticleToc containerSelector=".eskd-body" deps={article.slug} />

          <div
            className="eskd-body"
            dangerouslySetInnerHTML={{ __html: article.body_html }}
          />

          {article.bibliography.length > 0 && (
            <section className="eskd-bibliography">
              <h2>Список использованных источников</h2>
              <ol>
                {article.bibliography.map((b) => (
                  <li key={b.n}>{b.text}</li>
                ))}
              </ol>
            </section>
          )}

          <table className="eskd-stamp">
            <tbody>
              <tr>
                <td className="doc-title" colSpan={4}>
                  {article.h1}
                </td>
              </tr>
              <tr>
                <td className="lbl">Разраб.</td>
                <td className="name">{article.author_name}</td>
                <td className="sign">подпись</td>
                <td className="date">{formatRuDate(article.published_at)}</td>
              </tr>
              <tr>
                <td className="lbl">Пров.</td>
                <td className="name">{PROVERIL}</td>
                <td className="sign">подпись</td>
                <td className="date">{formatRuDate(article.updated_at)}</td>
              </tr>
              <tr>
                <td className="lbl">Т. контр.</td>
                <td className="name">—</td>
                <td className="sign">—</td>
                <td className="date">—</td>
              </tr>
              <tr>
                <td className="lbl">Н. контр.</td>
                <td className="name">Редколлегия Диплом-Инж.рф</td>
                <td className="sign">—</td>
                <td className="date">—</td>
              </tr>
              <tr>
                <td className="lbl">Утв.</td>
                <td className="name">Главный наставник проекта</td>
                <td className="sign">—</td>
                <td className="date">—</td>
              </tr>
            </tbody>
          </table>
        </article>

        <div className="max-w-[820px] mx-auto">
          <RelatedSections
            heading="Смотрите также"
            className="!px-0 !py-12"
            links={[
              { to: "/cae", icon: "Calculator", title: "CAE-сервис", text: "Закрепите теорию на практике: расчёт балок, рам и ферм онлайн с эпюрами и PDF-отчётом." },
              { to: "/program", icon: "ListChecks", title: "Программа наставничества", text: "10 модулей дипломного проекта — от задания до защиты ВКР." },
              { to: "/cases", icon: "FileCheck", title: "Кейсы студентов", text: "Как студенты доводили дипломный проект до защиты." },
            ]}
          />
        </div>
      </div>
    </>
  );
};

export default BlogArticle;