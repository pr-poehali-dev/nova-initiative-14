/**
 * Общий лендинг для печатных QR-флаеров.
 * Используется двумя страницами:
 *   /urfu_qr_cae    — CAE-расчёты балок, рам, ферм
 *   /urfu_qr_diplom — наставничество по дипломному проекту
 *
 * Страница короткая и «посадочная»: что это, что бесплатно, где мы находимся,
 * и одна понятная кнопка действия. Адрес перекрёстка вынесен крупно — человек
 * пришёл с бумажного флаера и хочет быстро понять суть.
 */
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { SITE_URL } from "@/lib/seo";

export interface UrfuFlyerConfig {
  /** Путь страницы для canonical (например "/urfu_qr_cae"). */
  path: string;
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  title: string;
  lead: string;
  /** Буллеты-преимущества (короткие). */
  points: { icon: string; text: string }[];
  /** Текст «что бесплатно». */
  freeNote: string;
  ctaLabel: string;
  ctaTo: string;
  /** Вторичная ссылка (необязательно). */
  secondaryLabel?: string;
  secondaryTo?: string;
}

const ADDRESS_LINE = "ул. Мира, 34 / ул. Малышева, 132";
const CITY_LINE = "Екатеринбург · центр города";
const MAP_QUERY = encodeURIComponent("Екатеринбург, улица Мира 34");

export default function UrfuFlyerLanding({ config }: { config: UrfuFlyerConfig }) {
  return (
    <>
      <Helmet>
        <title>{config.seoTitle}</title>
        <meta name="description" content={config.seoDescription} />
        <link rel="canonical" href={`${SITE_URL}${config.path}`} />
      </Helmet>

      <main className="max-w-[760px] mx-auto px-4 pt-20 md:pt-24 pb-16">
        {/* Шапка */}
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-accent)] mb-3">
          {config.eyebrow}
        </p>
        <h1 className="font-gost-upright text-3xl md:text-4xl font-black uppercase tracking-wide leading-tight mb-4">
          {config.title}
        </h1>
        <p className="font-gost text-base text-[var(--drawing-line)] mb-6 leading-relaxed">
          {config.lead}
        </p>

        {/* Плашка «бесплатно» */}
        <div className="border-2 border-[var(--drawing-accent)] bg-[var(--drawing-paper)] px-4 py-3 mb-8 flex items-start gap-2">
          <Icon name="Gift" size={18} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
          <p className="font-gost text-sm text-[var(--drawing-line)] leading-snug">
            {config.freeNote}
          </p>
        </div>

        {/* Преимущества */}
        <ul className="space-y-3 mb-8">
          {config.points.map((p, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 border border-[var(--drawing-line)] flex items-center justify-center">
                <Icon name={p.icon} size={16} className="text-[var(--drawing-line)]" />
              </span>
              <span className="font-gost text-sm text-[var(--drawing-line)] leading-snug pt-1.5">
                {p.text}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            to={config.ctaTo}
            className="btn-drawing btn-drawing-accent text-sm inline-flex items-center"
          >
            <Icon name="ArrowRight" size={16} className="mr-1.5" />
            {config.ctaLabel}
          </Link>
          {config.secondaryLabel && config.secondaryTo && (
            <Link
              to={config.secondaryTo}
              className="btn-drawing text-sm inline-flex items-center"
            >
              {config.secondaryLabel}
            </Link>
          )}
        </div>

        {/* Где мы */}
        <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-5">
          <p className="font-gost text-[11px] uppercase tracking-[0.25em] text-[var(--drawing-line-thin)] mb-2">
            Где мы находимся
          </p>
          <p className="font-gost-upright text-xl font-bold text-[var(--drawing-line)] leading-tight mb-1">
            {ADDRESS_LINE}
          </p>
          <p className="font-gost text-sm text-[var(--drawing-line-thin)] mb-4">
            {CITY_LINE}
          </p>
          <a
            href={`https://yandex.ru/maps/?text=${MAP_QUERY}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-gost text-xs uppercase tracking-wider text-[var(--drawing-accent)] inline-flex items-center gap-1 hover:underline"
          >
            <Icon name="MapPin" size={14} />
            Открыть на карте
          </a>
        </div>
      </main>
    </>
  );
}