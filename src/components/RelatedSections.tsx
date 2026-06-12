import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

/** Одна ссылка-карточка в блоке перелинковки. */
export interface RelatedLink {
  /** Внутренний путь (react-router). */
  to: string;
  /** Иконка lucide. */
  icon: string;
  /** Заголовок карточки. */
  title: string;
  /** Короткое описание (1 строка), помогает и пользователю, и ИИ-поиску. */
  text: string;
}

interface Props {
  /** Заголовок блока. По умолчанию — «Смотрите также». */
  heading?: string;
  links: RelatedLink[];
  className?: string;
}

/**
 * Переиспользуемый блок внутренней перелинковки «Смотрите также».
 * Усиливает SEO/GEO (связывает наставничество ↔ CAE ↔ блог ↔ кейсы) и
 * удержание. Стиль — чертёжные карточки проекта.
 */
export default function RelatedSections({
  heading = "Смотрите также",
  links,
  className = "",
}: Props) {
  if (links.length === 0) return null;
  return (
    <section className={`py-16 px-4 md:px-8 ${className}`}>
      <div className="max-w-[1200px] mx-auto">
        <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3 text-[var(--drawing-line)]">
          {heading}
        </h2>
        <div className="extension-line-h w-48 mb-10" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group border-[1.5px] border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-5 flex flex-col gap-2 transition-colors hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)]"
            >
              <span className="flex items-center gap-2.5">
                <Icon
                  name={l.icon}
                  fallback="ArrowRight"
                  size={18}
                  className="text-[var(--drawing-accent)] group-hover:text-[var(--drawing-bg)] shrink-0"
                />
                <span className="font-gost-upright text-base font-bold uppercase tracking-tight">
                  {l.title}
                </span>
              </span>
              <span className="font-gost text-xs leading-relaxed text-[var(--drawing-line-thin)] group-hover:text-[var(--drawing-bg)]/80">
                {l.text}
              </span>
              <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] group-hover:text-[var(--drawing-bg)] mt-1 inline-flex items-center gap-1">
                Перейти
                <Icon
                  name="ArrowRight"
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
