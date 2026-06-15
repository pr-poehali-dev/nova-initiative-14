import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

/**
 * Витринный блок кластера статей «Проектирование редуктора».
 *
 * Показывает обзорную статью-хаб и три детальных материала серии в
 * логическом порядке (зацепление → валы → подшипники). Усиливает
 * перелинковку и помогает читателю пройти весь маршрут проектирования.
 *
 * Slug-и зафиксированы — это устойчивый кластер, отдельный запрос не нужен.
 */

interface SeriesStep {
  slug: string;
  step: string;
  title: string;
  text: string;
  icon: string;
}

const HUB: SeriesStep = {
  slug: "polnyy-raschet-tsilindricheskogo-reduktora-v-diplome",
  step: "Обзор",
  title: "Полный расчёт цилиндрического редуктора",
  text: "Сквозной маршрут проектирования: от ТЗ и кинематики до сборочного чертежа и КЭ-проверки. Точка входа в серию.",
  icon: "Map",
};

const STEPS: SeriesStep[] = [
  {
    slug: "raschet-tsilindricheskoy-zubchatoy-peredachi-vkr",
    step: "Шаг 1",
    title: "Расчёт зубчатой передачи",
    text: "Контактная и изгибная выносливость по ГОСТ 21354-87: межосевое расстояние, модуль, силы в зацеплении.",
    icon: "Cog",
  },
  {
    slug: "raschet-vala-na-prochnost-i-zhestkost-kompas-apm-fem",
    step: "Шаг 2",
    title: "Расчёт валов на прочность и жёсткость",
    text: "Диаметры, эпюры моментов, усталостная прочность и проверка в КОМПАС APM FEM.",
    icon: "Minus",
  },
  {
    slug: "podbor-podshipnikov-kacheniya-na-resurs-vkr",
    step: "Шаг 3",
    title: "Подбор подшипников качения",
    text: "Ресурс опор по динамической грузоподъёмности (ГОСТ 18855-2013): эквивалентная нагрузка и L10.",
    icon: "CircleDot",
  },
];

export default function ReducerSeries() {
  return (
    <section className="mb-12 border-[2px] border-[var(--drawing-line)] bg-[var(--drawing-bg)] relative">
      <div className="absolute -top-px -left-px w-3 h-3 border-t-[2px] border-l-[2px] border-[var(--drawing-accent)]" />
      <div className="absolute -top-px -right-px w-3 h-3 border-t-[2px] border-r-[2px] border-[var(--drawing-accent)]" />
      <div className="absolute -bottom-px -left-px w-3 h-3 border-b-[2px] border-l-[2px] border-[var(--drawing-accent)]" />
      <div className="absolute -bottom-px -right-px w-3 h-3 border-b-[2px] border-r-[2px] border-[var(--drawing-accent)]" />

      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-[var(--drawing-line)]/30">
        <p className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-accent)] mb-1">
          Серия материалов
        </p>
        <h2 className="font-gost-upright text-xl md:text-2xl font-bold text-[var(--drawing-line)]">
          Проектирование редуктора — от зацепления до опор
        </h2>
        <p className="text-sm text-[var(--drawing-line-thin)] mt-1.5 leading-relaxed">
          Четыре связанных материала, которые проводят через весь расчёт цилиндрического
          редуктора в дипломе. Начните с обзора и двигайтесь по шагам.
        </p>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Хаб — крупная карточка-вход */}
        <Link
          to={`/blog/${HUB.slug}`}
          className="group flex items-start gap-3 border-[1.5px] border-[var(--drawing-accent)] p-4 hover:bg-[var(--drawing-paper)] transition-colors"
        >
          <Icon name={HUB.icon} size={26} className="text-[var(--drawing-accent)] shrink-0 mt-0.5" fallback="BookOpen" />
          <div className="min-w-0 flex-1">
            <p className="font-gost text-[9px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-0.5">
              {HUB.step}
            </p>
            <p className="font-gost-upright font-bold text-[var(--drawing-line)] group-hover:text-[var(--drawing-accent)] transition-colors leading-snug">
              {HUB.title}
            </p>
            <p className="text-[13px] text-[var(--drawing-line-thin)] leading-relaxed mt-1">{HUB.text}</p>
          </div>
          <Icon name="ArrowRight" size={16} className="text-[var(--drawing-line-thin)] shrink-0 mt-1" />
        </Link>

        {/* Три шага серии */}
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <Link
              key={s.slug}
              to={`/blog/${s.slug}`}
              className="group flex flex-col border-[1.5px] border-[var(--drawing-line)] p-3.5 hover:border-[var(--drawing-accent)] hover:bg-[var(--drawing-paper)] transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name={s.icon} size={18} className="text-[var(--drawing-accent)] shrink-0" fallback="Wrench" />
                <p className="font-gost text-[9px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                  {s.step}
                </p>
              </div>
              <p className="font-gost-upright font-bold text-[14px] text-[var(--drawing-line)] group-hover:text-[var(--drawing-accent)] transition-colors leading-snug mb-1">
                {s.title}
              </p>
              <p className="text-[12px] text-[var(--drawing-line-thin)] leading-relaxed">{s.text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
