import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchArticles, formatRuDate, type ArticleListItem } from "@/lib/articles";
import { SITE_URL } from "@/lib/seo";

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

  return (
    <>
      <Helmet>
        <title>Инженерный блог — статьи о ВКР, ЕСКД и КОМПАС-3D · Диплом-Инж.рф</title>
        <meta
          name="description"
          content="Экспертные лонгриды для студентов и наставников: оформление ВКР по ГОСТ, расчёты в КОМПАС-3D и APM FEM, материалы, допуски и посадки, защита диплома в УрФУ."
        />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
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
      </div>
    </>
  );
};

export default Blog;