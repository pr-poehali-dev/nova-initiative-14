import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "@dr.pogodin/react-helmet";
import { fetchArticle, formatRuDate, type Article } from "@/lib/articles";
import { SITE_URL } from "@/lib/seo";
import NotFound from "@/pages/NotFound";

const ORG_NAME = "Уральский федеральный университет (внеучебный материал)";
const PROVERIL = "Диплом-Инж.рф";

const BlogArticle = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  if (notFound && !loading) return <NotFound />;
  if (loading || !article) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-20 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем материал…
      </div>
    );
  }

  const url = `${SITE_URL}/blog/${article.slug}`;

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
        {article.published_at && (
          <meta property="article:published_time" content={article.published_at} />
        )}
        {article.updated_at && (
          <meta property="article:modified_time" content={article.updated_at} />
        )}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        {faqLd && <script type="application/ld+json">{JSON.stringify(faqLd)}</script>}
      </Helmet>

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
            <div className="eskd-org">Министерство образования и науки Российской Федерации</div>
            <div className="eskd-org">{ORG_NAME}</div>
            <h1>{article.h1}</h1>
            <div className="eskd-meta">
              {formatRuDate(article.published_at)} · {article.reading_minutes} мин ·{" "}
              {article.author_name}
            </div>
          </header>

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
      </div>
    </>
  );
};

export default BlogArticle;