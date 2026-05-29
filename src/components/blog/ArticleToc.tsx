import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface ArticleTocProps {
  /** CSS-селектор контейнера со статьёй */
  containerSelector: string;
  /** Зависимость для пересборки (например slug статьи) */
  deps?: unknown;
}

const slugify = (text: string, i: number) =>
  "h-" +
  i +
  "-" +
  text
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/**
 * Оглавление статьи. Находит заголовки h2/h3 внутри контейнера,
 * проставляет им id и строит навигацию с плавным переходом.
 */
export default function ArticleToc({ containerSelector, deps }: ArticleTocProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const headings = Array.from(
      container.querySelectorAll("h2, h3"),
    ) as HTMLElement[];

    const list: TocItem[] = headings.map((h, i) => {
      const text = h.textContent?.trim() || `Раздел ${i + 1}`;
      if (!h.id) h.id = slugify(text, i);
      h.style.scrollMarginTop = "80px";
      return { id: h.id, text, level: h.tagName === "H3" ? 3 : 2 };
    });
    setItems(list);

    if (headings.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive((e.target as HTMLElement).id);
        });
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
     
  }, [containerSelector, deps]);

  if (items.length < 3) return null;

  return (
    <nav className="border-[1.5px] border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-4 mb-6">
      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
        Содержание
      </p>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? "pl-4" : ""}>
            <a
              href={`#${it.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`font-gost text-xs leading-snug block transition-colors ${
                active === it.id
                  ? "text-[var(--drawing-accent)] font-bold"
                  : "text-[var(--drawing-line-thin)] hover:text-[var(--drawing-line)]"
              }`}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
