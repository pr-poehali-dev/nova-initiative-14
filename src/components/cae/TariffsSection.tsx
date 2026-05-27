import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import type { CaeTariff } from "@/lib/cae";
import AlphaTestBanner from "@/components/AlphaTestBanner";

interface Props {
  tariffs: CaeTariff[];
}

const fmtRub = (kopecks: number) => {
  if (kopecks <= 0) return "0 ₽";
  return Math.round(kopecks / 100).toLocaleString("ru-RU") + " ₽";
};

const fmtProjects = (n: number) => (n <= 0 ? "нет" : n >= 9999 ? "∞" : `${n}`);
const fmtElements = (n: number) => (n >= 9999 ? "∞" : `до ${n}`);
const fmtSolves = (n: number) => (n < 0 ? "∞" : n === 1 ? "1 расчёт" : `${n}/мес`);

const DESCRIPTIONS: Record<string, string> = {
  free: "Для студентов, которые хотят попробовать. 3 расчёта в месяц — хватит, чтобы оценить продукт.",
  basic: "Для ВКР и дипломных работ. Неограниченные расчёты, все ГОСТ-профили, PDF-отчёт без водяного знака.",
  pro: "Для инженеров-практиков и малых КБ. Командный доступ, нелинейный solver, безлимит проектов.",
  enterprise: "Для проектных институтов и КБ. До 10 участников, приоритетный solver-pool, API-доступ.",
};

const AUDIENCE: Record<string, string> = {
  free: "Студент, оценивает продукт",
  basic: "Студент ВКР, диплом",
  pro: "Инженер-практик, малое КБ",
  enterprise: "КБ, проектный институт",
};

const POPULAR_SLUG = "basic";

export default function TariffsSection({ tariffs }: Props) {
  const [yearly, setYearly] = useState(false);

  const visible = tariffs.filter(
    (t) => t.slug !== "demo" && t.slug !== "advanced",
  );

  return (
    <section className="mb-20">
      {/* Заголовок */}
      <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2 text-center">
        Тарифы · Раздел 03
      </p>
      <h2 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide text-center mb-3">
        Цены
      </h2>
      <p className="font-gost text-sm text-center text-[var(--drawing-line-thin)] max-w-2xl mx-auto mb-6">
        Участники раннего доступа получат фиксированную скидку на&nbsp;год.
      </p>

      {/* Плашка альфа-теста — пояснение к тарифам */}
      <AlphaTestBanner size="compact" className="max-w-2xl mx-auto mb-8" hideCta />

      {/* Переключатель месяц / год */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span
          className={`font-gost text-xs uppercase tracking-[0.15em] cursor-pointer transition-colors ${
            !yearly ? "text-[var(--drawing-line)]" : "text-[var(--drawing-line-thin)]"
          }`}
          onClick={() => setYearly(false)}
        >
          Помесячно
        </span>
        <button
          onClick={() => setYearly((v) => !v)}
          className={`relative w-10 h-5 border transition-colors ${
            yearly
              ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]"
              : "border-[var(--drawing-line-thin)] bg-transparent"
          }`}
          aria-label="Переключить период"
        >
          <span
            className={`absolute top-0.5 w-4 h-4 transition-all ${
              yearly
                ? "left-[calc(100%-1.125rem)] bg-white"
                : "left-0.5 bg-[var(--drawing-line-thin)]"
            }`}
          />
        </button>
        <span
          className={`font-gost text-xs uppercase tracking-[0.15em] cursor-pointer transition-colors ${
            yearly ? "text-[var(--drawing-line)]" : "text-[var(--drawing-line-thin)]"
          }`}
          onClick={() => setYearly(true)}
        >
          Годовая
          <span className="ml-1.5 px-1.5 py-0.5 bg-[var(--drawing-accent)] text-white text-[9px]">
            −2 мес
          </span>
        </span>
      </div>

      {/* Сетка карточек */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {visible.map((t) => {
          const isPopular = t.slug === POPULAR_SLUG;
          const isEnterprise = t.slug === "enterprise";
          const price = yearly && t.price_yearly > 0 ? t.price_yearly : t.price_monthly;
          const priceLabel = yearly && t.price_yearly > 0
            ? `${fmtRub(Math.round(t.price_yearly / 12))} / мес`
            : t.price_monthly > 0
              ? `${fmtRub(t.price_monthly)} / мес`
              : "Бесплатно";
          const yearlyNote = yearly && t.price_yearly > 0
            ? `${fmtRub(t.price_yearly)} / год`
            : null;

          return (
            <div
              key={t.slug}
              className={`relative flex flex-col bg-[var(--drawing-bg)] transition-shadow ${
                isPopular
                  ? "border-2 border-[var(--drawing-accent)] shadow-[4px_4px_0_var(--drawing-accent)]"
                  : "border-[1.5px] border-[var(--drawing-line)]"
              }`}
            >
              {/* Шапка */}
              <div
                className={`px-5 py-3 flex items-center justify-between ${
                  isPopular
                    ? "bg-[var(--drawing-accent)]"
                    : "bg-[var(--drawing-paper)] border-b border-[var(--drawing-line)]"
                }`}
              >
                <span
                  className={`font-gost text-[9px] uppercase tracking-[0.25em] ${
                    isPopular ? "text-white" : "text-[var(--drawing-line-thin)]"
                  }`}
                >
                  {AUDIENCE[t.slug] ?? "Тариф"}
                </span>
                {isPopular && (
                  <span className="font-gost text-[9px] uppercase tracking-[0.15em] text-white opacity-80">
                    Популярный
                  </span>
                )}
              </div>

              {/* Тело */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-gost-upright text-xl font-bold uppercase tracking-tight mb-1">
                  {t.name}
                </h3>

                <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-relaxed mb-4 min-h-[3em]">
                  {DESCRIPTIONS[t.slug] ?? ""}
                </p>

                <div className="extension-line-h w-full mb-4" />

                {/* Цена */}
                {isEnterprise ? (
                  <div className="mb-1">
                    <p className="font-gost-upright text-2xl font-bold text-[var(--drawing-accent)]">
                      По запросу
                    </p>
                    <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-0.5">
                      Индивидуальное предложение
                    </p>
                  </div>
                ) : (
                  <div className="mb-1">
                    <p className="font-gost-upright text-2xl font-bold text-[var(--drawing-accent)]">
                      {priceLabel}
                    </p>
                    {yearlyNote && (
                      <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-0.5">
                        {yearlyNote}
                      </p>
                    )}
                    {t.price_one_off > 0 && !yearly && (
                      <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-0.5">
                        или {fmtRub(t.price_one_off)} за разовый расчёт
                      </p>
                    )}
                  </div>
                )}

                <div className="extension-line-h w-full my-4" />

                {/* Характеристики */}
                <ul className="font-gost text-[11px] text-[var(--drawing-line-thin)] space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 w-3 h-[2px] bg-[var(--drawing-line-thin)] mt-[7px]" />
                    <span>
                      <span className="text-[var(--drawing-line)]">Расчётов:</span>{" "}
                      {fmtSolves(t.max_solves_per_month)}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 w-3 h-[2px] bg-[var(--drawing-line-thin)] mt-[7px]" />
                    <span>
                      <span className="text-[var(--drawing-line)]">Элементов:</span>{" "}
                      {fmtElements(t.max_elements)}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 w-3 h-[2px] bg-[var(--drawing-line-thin)] mt-[7px]" />
                    <span>
                      <span className="text-[var(--drawing-line)]">Проектов:</span>{" "}
                      {fmtProjects(t.max_projects)}
                    </span>
                  </li>
                  {t.allow_team && (
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 w-3 h-[2px] bg-[var(--drawing-accent)] mt-[7px]" />
                      <span>
                        <span className="text-[var(--drawing-line)]">Команда:</span>{" "}
                        до {t.max_team_members} чел.
                      </span>
                    </li>
                  )}
                  {t.allow_nonlinear && (
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 w-3 h-[2px] bg-[var(--drawing-accent)] mt-[7px]" />
                      <span className="text-[var(--drawing-line)]">Нелинейный solver</span>
                    </li>
                  )}
                </ul>

                {/* CTA */}
                <div className="mt-auto">
                  {isEnterprise ? (
                    <a
                      href="mailto:hello@diplom-inzh.ru?subject=Корпоратив"
                      className="block text-center py-2.5 font-gost text-[11px] uppercase tracking-[0.15em] border-[1.5px] border-[var(--drawing-line)] text-[var(--drawing-line)] hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition-colors"
                    >
                      Написать нам
                    </a>
                  ) : t.price_monthly === 0 ? (
                    <Link
                      to="/cae/new"
                      className="block text-center py-2.5 font-gost text-[11px] uppercase tracking-[0.15em] border-[1.5px] border-[var(--drawing-line)] text-[var(--drawing-line)] hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition-colors"
                    >
                      Начать бесплатно
                    </Link>
                  ) : (
                    <Link
                      to="/register"
                      className={`block text-center py-2.5 font-gost text-[11px] uppercase tracking-[0.15em] transition-colors ${
                        isPopular
                          ? "bg-[var(--drawing-accent)] text-white border-2 border-[var(--drawing-accent)] hover:bg-[var(--drawing-line)] hover:border-[var(--drawing-line)]"
                          : "border-[1.5px] border-[var(--drawing-line)] text-[var(--drawing-line)] hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)]"
                      }`}
                    >
                      {isPopular ? "Начать · 390 ₽/мес" : "Выбрать тариф"}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Сноска */}
      <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] text-center mt-6 opacity-70">
        Все цены указаны с НДС · Оплата через ЮKassa · Отмена подписки в любой момент
      </p>
    </section>
  );
}