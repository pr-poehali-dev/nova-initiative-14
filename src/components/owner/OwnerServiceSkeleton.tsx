/**
 * Каркас страницы внутреннего сервиса владельца «в разработке».
 *
 * Используется заготовками сервисов из идей-тикетов, пока они не реализованы:
 * показывает название, описание, источник-идею (тикет) и список запланированных
 * возможностей. Доступ только владельцу (is_owner), страница закрыта от
 * индексации. Гард доступа — на вызывающей странице.
 */
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { SITE_URL } from "@/lib/seo";

interface Props {
  /** Путь страницы для canonical (например, "/owner/business-plans"). */
  path: string;
  icon: string;
  title: string;
  description: string;
  /** Номер тикета-источника идеи. */
  ticket?: number;
  /** Запланированные возможности сервиса. */
  features: string[];
}

export default function OwnerServiceSkeleton({ path, icon, title, description, ticket, features }: Props) {
  return (
    <>
      <Helmet>
        <title>{title} · В разработке · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}${path}`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[800px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Владелец · В разработке
          </p>
          <Link to="/account" className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1">
            <Icon name="ArrowLeft" size={12} />В кабинет
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <Icon name={icon} size={28} fallback="Hammer" className="text-[var(--drawing-accent)]" />
          <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide">
            {title}
          </h1>
          <span className="inline-flex items-center font-gost text-[9px] uppercase tracking-wider border border-[var(--drawing-accent)] text-[var(--drawing-accent)] px-1.5 py-0.5">
            В разработке
          </span>
        </div>

        <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed mb-6">
          {description}
        </p>

        {ticket && (
          <p className="font-mono text-[11px] text-[var(--drawing-line-thin)] mb-6 inline-flex items-center gap-1">
            <Icon name="Ticket" size={12} />
            Идея из тикета #{ticket}
          </p>
        )}

        <div className="drawing-frame p-5 bg-[var(--drawing-bg)]">
          <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1 mb-3">
            Что будет в сервисе
          </p>
          <ul className="space-y-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--drawing-line)]">
                <Icon name="Hammer" size={14} className="text-[var(--drawing-line-thin)] shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mt-6 text-center">
          Каркас раздела. Наполнение появится по мере разработки.
        </p>
      </div>
    </>
  );
}
