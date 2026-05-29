import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { fetchArticles, formatRuDate, type ArticleListItem } from "@/lib/articles";

const BlogTeaserSection = () => {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles()
      .then((data) => setArticles(data.slice(0, 3)))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && articles.length === 0) return null;

  return (
    <section className="py-12 md:py-16 border-t-[2.5px] border-[var(--drawing-line)]">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2">
              Инженерный журнал&nbsp;&middot; Раздел 05
            </p>
            <h2 className="font-gost-upright text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wide text-[var(--drawing-line)] break-words">
              Свежие материалы блога
            </h2>
            <p className="mt-3 text-sm md:text-base text-[var(--drawing-line-thin)] max-w-2xl leading-relaxed">
              Разборы методичек УрФУ, расчётные кейсы и культура инженерного цитирования —
              лонгриды, которые помогут довести ВКР до защиты.
            </p>
          </div>
          <Link
            to="/blog"
            className="font-gost text-xs uppercase tracking-[0.2em] text-[var(--drawing-accent)] hover:underline shrink-0 self-start md:self-end"
          >
            Все материалы&nbsp;&rarr;
          </Link>
        </div>

        <div className="extension-line-h w-full mb-6" />

        {loading && (
          <div className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border border-[var(--drawing-line-thin)]/30 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="h-2.5 w-16 bg-[var(--drawing-line-thin)]/20 animate-pulse" />
                  <span className="h-2.5 w-12 bg-[var(--drawing-line-thin)]/20 animate-pulse" />
                </div>
                <span className="block h-5 w-5/6 bg-[var(--drawing-line-thin)]/20 animate-pulse mb-2" />
                <span className="block h-3 w-full bg-[var(--drawing-line-thin)]/20 animate-pulse mb-1.5" />
                <span className="block h-3 w-full bg-[var(--drawing-line-thin)]/20 animate-pulse mb-1.5" />
                <span className="block h-3 w-2/3 bg-[var(--drawing-line-thin)]/20 animate-pulse" />
                <div className="extension-line-h w-full my-4" />
                <span className="block h-2.5 w-20 bg-[var(--drawing-line-thin)]/20 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, idx) => (
            <Link
              key={a.slug}
              to={`/blog/${a.slug}`}
              className="blog-card block group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                  Лист {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                  {a.reading_minutes} мин
                </span>
              </div>

              <h3 className="font-gost-upright text-base md:text-lg font-bold mb-2 text-[var(--drawing-line)] leading-snug group-hover:text-[var(--drawing-accent)] transition-colors">
                {a.h1}
              </h3>

              <p className="text-xs md:text-sm text-[var(--drawing-line-thin)] leading-relaxed line-clamp-4">
                {a.summary}
              </p>

              <div className="extension-line-h w-full my-4" />

              <div className="flex items-center justify-between">
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                  {formatRuDate(a.published_at)}
                </span>
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] flex items-center gap-1">
                  Читать
                  <Icon name="ArrowRight" size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogTeaserSection;