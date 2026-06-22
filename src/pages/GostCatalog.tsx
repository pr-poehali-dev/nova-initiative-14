/**
 * Каталог ГОСТов (/gost-catalog).
 *
 * Раскрывающиеся разделы по отраслям инженерии (ЕСКД, машиностроение,
 * строительство, сварка, документация ВКР) + смысловой поиск: находит документ
 * не только по номеру/названию, но и по бытовым формулировкам темы (теги).
 * Реализовано по запросу из тикета поддержки #68 «Каталог ГОСТов».
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Seo from "@/components/Seo";
import { GOST_SECTIONS, type GostItem } from "@/data/gostCatalog";
import { breadcrumbsLd } from "@/lib/seo";

const GostCatalog = () => {
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set([GOST_SECTIONS[0].marker]),
  );

  const q = query.trim().toLowerCase();

  // Смысловой поиск: по номеру, названию и тегам (синонимам темы).
  const matches = (item: GostItem) => {
    if (!q) return true;
    const haystack = [item.code, item.title, ...item.tags].join(" ").toLowerCase();
    return q.split(/\s+/).every((word) => haystack.includes(word));
  };

  const filtered = useMemo(
    () =>
      GOST_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter(matches),
      })).filter((s) => s.items.length > 0),
    [q],
  );

  const totalFound = filtered.reduce((n, s) => n + s.items.length, 0);

  const toggle = (marker: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(marker)) next.delete(marker);
      else next.add(marker);
      return next;
    });
  };

  // Когда идёт поиск — разделы с результатами открыты автоматически.
  const isOpen = (marker: string) => (q ? true : openSections.has(marker));

  const breadcrumbLd = breadcrumbsLd([["Каталог ГОСТов", "/gost-catalog"]]);

  return (
    <main className="min-h-screen grid-bg">
      <Seo jsonLd={breadcrumbLd} />

      <section className="pt-28 pb-12 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">Г1</div>
          <div className="zone-marker top-2 right-3">Зона ГОСТ</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Нормативные документы&nbsp;&middot; Диплом-Инж.рф
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Каталог
            <br />
            <span className="text-[var(--drawing-accent)]">ГОСТов</span>
          </h1>

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Стандарты сгруппированы по разделам инженерии. Не знаете номер ГОСТа,
            но понимаете суть&nbsp;— просто опишите тему словами: «лестницы»,
            «ограждения», «резьба», «шероховатость». Поиск найдёт нужный документ.
          </p>
        </div>
      </section>

      {/* Смысловой поиск */}
      <section className="px-4 md:px-8 max-w-[1200px] mx-auto mb-6">
        <div className="relative">
          <Icon
            name="Search"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--drawing-line-thin)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Опишите тему: лестницы и ограждения, двутавр, допуски, сварной шов…"
            className="w-full border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] pl-12 pr-4 py-3 font-gost text-sm text-[var(--drawing-line)] focus:border-[var(--drawing-accent)] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
              aria-label="Очистить поиск"
            >
              <Icon name="X" size={16} />
            </button>
          )}
        </div>
        {q && (
          <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mt-2">
            Найдено документов: <strong>{totalFound}</strong>
          </p>
        )}
      </section>

      {/* Разделы */}
      <section className="px-4 md:px-8 max-w-[1200px] mx-auto space-y-5 pb-16">
        {filtered.length === 0 && (
          <div className="drawing-frame p-8 text-center">
            <Icon name="SearchX" size={28} className="mx-auto mb-3 text-[var(--drawing-line-thin)]" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)]">
              По запросу «{query}» ничего не нашлось. Попробуйте другие слова —
              например, «балка», «штамп», «спецификация».
            </p>
          </div>
        )}

        {filtered.map((section, si) => (
          <div
            key={section.marker}
            className={`drawing-frame p-5 md:p-7 relative ${si % 2 === 1 ? "hatching" : ""}`}
          >
            <div className="zone-marker top-2 right-3">{section.marker}</div>

            <button
              className="w-full flex items-center justify-between gap-4 text-left group"
              onClick={() => toggle(section.marker)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 text-[var(--drawing-accent)]">
                  <Icon name={section.icon} size={22} fallback="FileText" />
                </span>
                <span className="min-w-0">
                  <span className="block section-callout font-gost-upright text-lg md:text-2xl font-bold tracking-tight group-hover:text-[var(--drawing-accent)] transition-colors">
                    {section.title}
                  </span>
                  <span className="block font-gost text-[11px] text-[var(--drawing-line-thin)] mt-0.5">
                    {section.items.length} док.
                  </span>
                </span>
              </div>
              <span className="shrink-0 text-[var(--drawing-line-thin)]">
                <Icon name={isOpen(section.marker) ? "ChevronUp" : "ChevronDown"} size={20} />
              </span>
            </button>

            {isOpen(section.marker) && (
              <>
                <div className="extension-line-h w-full my-5" />
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-5 leading-relaxed">
                  {section.hint}
                </p>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item.code}
                      className="border-[1.5px] border-[var(--drawing-line)] p-4 bg-[var(--drawing-bg)]"
                    >
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="font-gost-upright text-sm font-bold text-[var(--drawing-accent)]">
                          {item.code}
                        </span>
                        <span className="font-gost text-sm text-[var(--drawing-line)]">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.tags.map((t) => (
                          <button
                            key={t}
                            onClick={() => setQuery(t)}
                            className="font-gost text-[10px] border border-[var(--drawing-line-thin)] px-2 py-0.5 text-[var(--drawing-line-thin)] hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="pb-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="drawing-frame p-8 md:p-12 text-center">
            <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
              Не нашли нужный стандарт?
            </h2>
            <div className="extension-line-h w-32 mx-auto my-5" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-lg mx-auto mb-8">
              Каталог пополняется. Напишите, какого ГОСТа не хватает&nbsp;— добавим
              его в&nbsp;нужный раздел. А&nbsp;если нужна помощь с&nbsp;оформлением
              работы по&nbsp;стандартам, наставники разберут это с&nbsp;вами.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contacts" className="btn-drawing btn-drawing-accent text-sm">
                Предложить ГОСТ
              </Link>
              <Link to="/program" className="btn-drawing text-sm">
                Помощь с оформлением&nbsp;&rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default GostCatalog;
