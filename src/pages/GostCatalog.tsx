/**
 * Каталог ГОСТов (/gost-catalog).
 *
 * Трёхуровневая навигация листанием: Отрасль → Тематическая подгруппа → ГОСТы.
 * Развернул «Машиностроение» — видишь подгруппы (балки, метрология, допуски,
 * стандартизация…), раскрыл подгруппу — компактный список стандартов. Строка
 * поиска работает как дополнительный фильтр по номеру/названию/смысловым тегам.
 * Реализовано по запросу из тикета поддержки #68 «Каталог ГОСТов».
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Seo from "@/components/Seo";
import { GOST_DOMAINS, type GostItem, buildGostIndex } from "@/data/gostCatalog";
import { breadcrumbsLd } from "@/lib/seo";
import GostCard from "@/components/GostCard";

const GostCatalog = () => {
  const [query, setQuery] = useState("");
  // По умолчанию открыта первая отрасль; подгруппы свёрнуты.
  const [openDomains, setOpenDomains] = useState<Set<string>>(
    () => new Set([GOST_DOMAINS[0].id]),
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<GostItem | null>(null);

  // Индекс по обозначению — для связанных ГОСТов в карточке.
  const gostIndex = useMemo(() => buildGostIndex(), []);
  const resolveGost = (code: string) => gostIndex.get(code);

  const q = query.trim().toLowerCase();

  // Фильтруем структуру по поиску, отбрасывая пустые подгруппы и отрасли.
  const filtered = useMemo(() => {
    const matches = (item: GostItem) => {
      if (!q) return true;
      const haystack = [item.code, item.title, ...item.tags].join(" ").toLowerCase();
      return q.split(/\s+/).every((word) => haystack.includes(word));
    };
    return GOST_DOMAINS.map((d) => ({
      ...d,
      groups: d.groups
        .map((g) => ({ ...g, items: g.items.filter(matches) }))
        .filter((g) => g.items.length > 0),
    })).filter((d) => d.groups.length > 0);
  }, [q]);

  const totalAll = useMemo(
    () =>
      GOST_DOMAINS.reduce(
        (n, d) => n + d.groups.reduce((m, g) => m + g.items.length, 0),
        0,
      ),
    [],
  );
  const totalFound = filtered.reduce(
    (n, d) => n + d.groups.reduce((m, g) => m + g.items.length, 0),
    0,
  );

  const toggleDomain = (id: string) =>
    setOpenDomains((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // При активном поиске всё раскрыто, чтобы сразу видеть найденное.
  const domainOpen = (id: string) => (q ? true : openDomains.has(id));
  const groupOpen = (id: string) => (q ? true : openGroups.has(id));

  const breadcrumbLd = breadcrumbsLd([["Каталог ГОСТов", "/gost-catalog"]]);

  return (
    <main className="min-h-screen grid-bg">
      <Seo jsonLd={breadcrumbLd} />

      <section className="pt-28 pb-10 px-4 md:px-8 max-w-[1100px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">Г1</div>
          <div className="zone-marker top-2 right-3">Зона ГОСТ</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Нормативные документы&nbsp;&middot; {totalAll} стандартов
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Каталог
            <br />
            <span className="text-[var(--drawing-accent)]">ГОСТов</span>
          </h1>

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Стандарты разложены по отраслям и темам. Раскройте отрасль&nbsp;— и
            листайте подгруппы: балки и&nbsp;профили, допуски, метрология,
            стандартизация, сварка, лестницы и&nbsp;ограждения. Нужный документ
            находится без поиска, прямо во&nbsp;время просмотра.
          </p>
        </div>
      </section>

      {/* Поиск (дополнительный фильтр) */}
      <section className="px-4 md:px-8 max-w-[1100px] mx-auto mb-6">
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
            placeholder="Фильтр по теме: лестницы, двутавр, допуски, шероховатость, сварной шов…"
            className="w-full border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] pl-12 pr-10 py-2.5 font-gost text-sm text-[var(--drawing-line)] focus:border-[var(--drawing-accent)] focus:outline-none"
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
            Найдено: <strong>{totalFound}</strong>
          </p>
        )}
      </section>

      {/* Отрасли → подгруппы → ГОСТы */}
      <section className="px-4 md:px-8 max-w-[1100px] mx-auto space-y-3 pb-16">
        {filtered.length === 0 && (
          <div className="drawing-frame p-8 text-center">
            <Icon name="SearchX" size={28} className="mx-auto mb-3 text-[var(--drawing-line-thin)]" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)]">
              По запросу «{query}» ничего не нашлось. Попробуйте «балка», «штамп»,
              «резьба», «спецификация».
            </p>
          </div>
        )}

        {filtered.map((domain) => {
          const dOpen = domainOpen(domain.id);
          const dCount = domain.groups.reduce((m, g) => m + g.items.length, 0);
          return (
            <div key={domain.id} className="drawing-frame relative overflow-hidden">
              {/* Заголовок отрасли */}
              <button
                className="w-full flex items-center justify-between gap-3 px-4 md:px-6 py-4 text-left group"
                onClick={() => toggleDomain(domain.id)}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 text-[var(--drawing-accent)]">
                    <Icon name={domain.icon} size={22} fallback="FileText" />
                  </span>
                  <span className="font-gost-upright text-base md:text-xl font-bold tracking-tight group-hover:text-[var(--drawing-accent)] transition-colors">
                    {domain.title}
                  </span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="font-gost text-[10px] text-[var(--drawing-line-thin)] tabular-nums">
                    {dCount}
                  </span>
                  <Icon
                    name={dOpen ? "ChevronUp" : "ChevronDown"}
                    size={20}
                    className="text-[var(--drawing-line-thin)]"
                  />
                </span>
              </button>

              {dOpen && (
                <div className="border-t-[1.5px] border-[var(--drawing-line)] divide-y divide-[var(--drawing-line)]/30">
                  {domain.groups.map((group) => {
                    const gOpen = groupOpen(group.id);
                    return (
                      <div key={group.id}>
                        {/* Заголовок подгруппы */}
                        <button
                          className="w-full flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 text-left group bg-[var(--drawing-paper)]/40 hover:bg-[var(--drawing-paper)]"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Icon
                              name={gOpen ? "Minus" : "Plus"}
                              size={13}
                              className="shrink-0 text-[var(--drawing-accent)]"
                            />
                            <span className="font-gost text-[13px] md:text-sm font-bold text-[var(--drawing-line)] group-hover:text-[var(--drawing-accent)] transition-colors">
                              {group.title}
                            </span>
                          </span>
                          <span className="font-gost text-[10px] text-[var(--drawing-line-thin)] shrink-0 tabular-nums">
                            {group.items.length}
                          </span>
                        </button>

                        {/* Компактные строки ГОСТов */}
                        {gOpen && (
                          <ul className="pb-1">
                            {group.items.map((item) => (
                              <li key={item.code}>
                                <button
                                  onClick={() => setSelected(item)}
                                  className="w-full text-left flex items-baseline gap-2.5 px-4 md:px-8 py-1.5 hover:bg-[var(--drawing-paper)]/60 group"
                                >
                                  <span className="font-gost-upright text-[12px] font-bold text-[var(--drawing-accent)] whitespace-nowrap shrink-0">
                                    {item.code}
                                  </span>
                                  <span className="font-gost text-[12px] md:text-[13px] text-[var(--drawing-line-thin)] group-hover:text-[var(--drawing-line)] leading-snug flex-1">
                                    {item.title}
                                  </span>
                                  <Icon
                                    name="ChevronRight"
                                    size={14}
                                    className="shrink-0 self-center text-transparent group-hover:text-[var(--drawing-accent)] transition-colors"
                                  />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section className="pb-20 px-4 md:px-8">
        <div className="max-w-[1100px] mx-auto">
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

      <GostCard
        item={selected}
        resolve={resolveGost}
        onSelect={setSelected}
        onClose={() => setSelected(null)}
      />
    </main>
  );
};

export default GostCatalog;