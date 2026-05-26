import type { ProgramModule } from "@/data/program-modules";

/**
 * Якорная навигация по 10 модулям программы — горизонтальная лента
 * со ссылками `#module-XX`, прокручивает к соответствующей карточке.
 */
export default function ProgramNav({ modules }: { modules: ProgramModule[] }) {
  return (
    <section className="pb-8 px-4 md:px-8 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap gap-2 mb-2">
        {modules.map((m) => (
          <a
            key={m.num}
            href={`#module-${m.num}`}
            className="font-gost text-[10px] border border-[var(--drawing-line)] px-2.5 py-1 hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition-colors"
          >
            {m.num}. {m.title.length > 28 ? m.title.slice(0, 28) + "..." : m.title}
          </a>
        ))}
      </div>
      <div className="extension-line-h w-full" />
    </section>
  );
}
