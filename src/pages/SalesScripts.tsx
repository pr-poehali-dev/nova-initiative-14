import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import {
  SALES_SCRIPTS,
  canSeeSalesScripts,
  type SalesScript,
} from "@/lib/sales-scripts";

/**
 * Сервис «Скрипты продаж» для менеджеров.
 * Доступен ролям: менеджер по продажам (sales), администратор, владелец.
 * Содержит скрипты презентации компании и трёх направлений продаж.
 */
const SalesScripts = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [activeSlug, setActiveSlug] = useState(SALES_SCRIPTS[0].slug);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }

  if (!canSeeSalesScripts(user)) {
    setTimeout(() => nav("/account", { replace: true }), 0);
    return null;
  }

  const active = SALES_SCRIPTS.find((s) => s.slug === activeSlug) || SALES_SCRIPTS[0];

  return (
    <>
      <Helmet>
        <title>Скрипты продаж · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/sales/scripts`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1000px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-1">
          Отдел продаж · Внутреннее
        </p>
        <div className="flex items-center gap-2 mb-2">
          <Icon name="MessagesSquare" size={24} className="text-[var(--drawing-accent)]" />
          <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide">
            Скрипты продаж
          </h1>
        </div>
        <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-snug mb-6 max-w-[680px]">
          Готовые речевые модули для презентации компании и продажи по трём
          направлениям. Адаптируйте под клиента — это опора, а не зачитывание по бумажке.
        </p>

        {/* Переключатель направлений */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SALES_SCRIPTS.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => setActiveSlug(s.slug)}
              className={`inline-flex items-center gap-1.5 font-gost text-xs uppercase tracking-wider px-3 py-2 border-[1.5px] transition-colors ${
                s.slug === activeSlug
                  ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)] text-white"
                  : "border-[var(--drawing-line)] text-[var(--drawing-line)] hover:border-[var(--drawing-accent)] hover:text-[var(--drawing-accent)]"
              }`}
            >
              <Icon name={s.icon} size={14} fallback="MessageSquare" />
              {s.title}
            </button>
          ))}
        </div>

        <ScriptView script={active} />
      </div>
    </>
  );
};

function ScriptView({ script }: { script: SalesScript }) {
  return (
    <article className="space-y-5">
      {/* Шапка скрипта */}
      <section className="drawing-frame p-5 bg-[var(--drawing-bg)]">
        <div className="flex items-center gap-2 mb-2">
          <Icon name={script.icon} size={20} fallback="MessageSquare" className="text-[var(--drawing-accent)]" />
          <h2 className="font-gost-upright text-lg font-black uppercase tracking-wide">{script.title}</h2>
        </div>
        <p className="font-gost text-sm text-[var(--drawing-line-thin)] mb-3">{script.tagline}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <InfoRow icon="Users" label="Кому" text={script.audience} />
          <InfoRow icon="Zap" label="Суть" text={script.pitch} />
        </div>
      </section>

      {/* Блоки разговора */}
      {script.blocks.map((b) => (
        <section key={b.heading} className="border-[1.5px] border-[var(--drawing-line)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon name={b.icon} size={16} fallback="MessageSquare" className="text-[var(--drawing-accent)]" />
            <h3 className="font-gost-upright font-bold text-sm uppercase tracking-wide">{b.heading}</h3>
          </div>
          <ul className="space-y-2">
            {b.lines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 font-gost text-sm leading-snug">
                <Icon name="ChevronRight" size={15} className="text-[var(--drawing-accent)] shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Возражения */}
      <section className="border-[1.5px] border-[var(--drawing-line)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="ShieldQuestion" size={16} fallback="HelpCircle" className="text-[var(--drawing-accent)]" />
          <h3 className="font-gost-upright font-bold text-sm uppercase tracking-wide">Отработка возражений</h3>
        </div>
        <div className="space-y-3">
          {script.objections.map((o, i) => (
            <div key={i} className="border-l-[3px] border-[var(--drawing-accent)] pl-3">
              <p className="font-gost-upright font-bold text-sm mb-0.5">— {o.q}</p>
              <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-snug">{o.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Чек-лист */}
      <section className="border-[1.5px] border-[var(--drawing-accent)] bg-[var(--drawing-paper)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="ListChecks" size={16} className="text-[var(--drawing-accent)]" />
          <h3 className="font-gost-upright font-bold text-sm uppercase tracking-wide">Чек-лист перед закрытием</h3>
        </div>
        <ul className="space-y-1.5">
          {script.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2 font-gost text-sm leading-snug">
              <Icon name="CheckSquare" size={15} className="text-green-700 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function InfoRow({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} size={15} className="text-[var(--drawing-accent)] shrink-0 mt-0.5" />
      <p className="font-gost text-xs leading-snug">
        <span className="uppercase tracking-wider text-[var(--drawing-line-thin)]">{label}: </span>
        {text}
      </p>
    </div>
  );
}

export default SalesScripts;
