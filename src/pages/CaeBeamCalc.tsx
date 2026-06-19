import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { SITE_URL, absUrl, breadcrumbsLd, softwareLd, faqLd, howToLd, techArticleLd } from "@/lib/seo";
import RelatedSections from "@/components/RelatedSections";
import AlphaTestBanner from "@/components/AlphaTestBanner";
import CaeMethodology from "@/components/cae/CaeMethodology";

/**
 * SEO-посадочная под запрос «расчёт балки онлайн» и смежные
 * («калькулятор балки», «эпюры моментов онлайн», «расчёт балки на прогиб»).
 * Точное вхождение ключа в title/H1/тексте + развёрнутый полезный контент,
 * пошаговая инструкция (HowTo) и FAQ-блок с FAQPage-разметкой.
 */

const STEPS = [
  {
    name: "Постройте расчётную схему",
    text: "Поставьте узлы и нарисуйте балку на сетке, задайте опоры (шарнирные, катковые, заделку) и при необходимости промежуточные шарниры.",
  },
  {
    name: "Задайте сечение и материал",
    text: "Выберите профиль из каталога ГОСТ (двутавр, швеллер, труба, прямоугольник) или введите свои геометрические характеристики. Укажите модуль упругости и предел текучести материала.",
  },
  {
    name: "Приложите нагрузки",
    text: "Добавьте сосредоточенные силы и моменты в узлах, равномерно распределённую или трапециевидную нагрузку на пролёт.",
  },
  {
    name: "Запустите расчёт",
    text: "Сервер выполняет конечно-элементный расчёт балки и строит эпюры продольной силы N, поперечной силы Q и изгибающего момента M, перемещения и реакции опор.",
  },
  {
    name: "Проверьте прочность и прогиб",
    text: "CAE автоматически сравнивает эквивалентные напряжения по Мизесу с допускаемыми и проверяет прогиб по нормам. Готовый PDF-отчёт по ЕСКД можно вложить в ВКР.",
  },
];

const FAQ = [
  {
    q: "Как рассчитать балку онлайн бесплатно?",
    a: "Откройте демо-редактор без регистрации, постройте схему балки, задайте опоры, сечение из каталога ГОСТ и нагрузки, затем запустите расчёт. Сервис построит эпюры N, Q, M, покажет прогиб и реакции опор. В режиме альфа-теста расчёт балки доступен бесплатно.",
  },
  {
    q: "Какие эпюры строит калькулятор балки?",
    a: "Эпюру продольной силы N, поперечной силы Q и изгибающего момента M, а также деформированную форму (прогиб) и эпюру эквивалентных напряжений по Мизесу. Все эпюры строятся по результатам конечно-элементного расчёта.",
  },
  {
    q: "Можно ли рассчитать балку на прогиб и проверить прочность?",
    a: "Да. CAE вычисляет максимальный прогиб и сравнивает его с допускаемым по нормам, а также проверяет прочность по эквивалентным напряжениям (теория Мизеса или Треска) с учётом коэффициента запаса.",
  },
  {
    q: "Нужно ли что-то устанавливать на компьютер?",
    a: "Нет. Это облачный CAE: расчёт балки выполняется на сервере, а работа идёт прямо в браузере. Подходит для слабых ноутбуков и работает на любом устройстве с интернетом.",
  },
  {
    q: "Есть ли каталог профилей по ГОСТ?",
    a: "Да, встроен каталог сортамента: двутавры по ГОСТ 8239-89, швеллеры, уголки, трубы и прямоугольные сечения с готовыми геометрическими характеристиками (момент инерции, момент сопротивления, площадь).",
  },
  {
    q: "Подойдёт ли расчёт для диплома (ВКР)?",
    a: "Да. По результатам формируется PDF-отчёт по ЕСКД с расчётной схемой, эпюрами, формулами и реакциями опор — его можно приложить к пояснительной записке дипломного проекта или к экспертизе.",
  },
];

const CaeBeamCalc = () => {
  return (
    <>
      <Helmet>
        <title>Расчёт балки онлайн — калькулятор эпюр N, Q, M и прогиба · Диплом-Инж.рф</title>
        <meta
          name="description"
          content="Расчёт балки онлайн бесплатно: постройте схему в браузере, задайте опоры, сечение по ГОСТ и нагрузки — получите эпюры N, Q, M, прогиб, реакции опор и проверку прочности по Мизесу. Без установки, PDF-отчёт по ЕСКД."
        />
        <meta
          name="keywords"
          content="расчёт балки онлайн, калькулятор балки, эпюры моментов онлайн, расчёт балки на прогиб, расчёт балки на изгиб, эпюра q и m, расчёт двутавра онлайн, конечно-элементный расчёт балки"
        />
        <link rel="canonical" href={`${SITE_URL}/cae/raschet-balki-onlayn`} />
        <script type="application/ld+json">
          {JSON.stringify(
            softwareLd({
              name: "Расчёт балки онлайн — облачный CAE",
              description:
                "Онлайн-калькулятор балки: конечно-элементный расчёт эпюр N, Q, M, прогиба и напряжений по Мизесу с каталогом ГОСТ-профилей и PDF-отчётом по ЕСКД.",
              url: absUrl("/cae/raschet-balki-onlayn"),
              features: [
                "Эпюры N, Q, M онлайн",
                "Расчёт балки на прогиб",
                "Проверка прочности по Мизесу",
                "Каталог ГОСТ-профилей (двутавр, швеллер, труба)",
                "Конечно-элементный расчёт на сервере",
                "PDF-отчёт по ЕСКД",
              ],
            })
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            howToLd({
              name: "Как рассчитать балку онлайн",
              description:
                "Пошаговый расчёт балки в облачном CAE: схема, сечение, нагрузки, эпюры N/Q/M и проверка прочности.",
              steps: STEPS,
            })
          )}
        </script>
        <script type="application/ld+json">{JSON.stringify(faqLd(FAQ))}</script>
        <script type="application/ld+json">
          {JSON.stringify(
            techArticleLd({
              headline: "Как считается расчёт балки: метод, формулы и нормы ГОСТ",
              description:
                "Методика онлайн-расчёта балки: балочный конечный элемент Тимошенко, формулы изгибных напряжений и прогиба, проверка прочности по Мизесу и жёсткости по нормам.",
              url: absUrl("/cae/raschet-balki-onlayn"),
              about: ["Сопротивление материалов", "Изгиб балки", "Метод конечных элементов", "ЕСКД"],
            })
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbsLd([
              ["Облачный CAE", "/cae"],
              ["Расчёт балки онлайн", "/cae/raschet-balki-onlayn"],
            ])
          )}
        </script>
      </Helmet>

      <div className="max-w-[900px] mx-auto px-4 pt-20 md:pt-24 pb-16">
        <AlphaTestBanner className="mb-6" />

        {/* Хлебные крошки */}
        <nav className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-6">
          <Link to="/cae" className="hover:text-[var(--drawing-accent)]">Облачный CAE</Link>
          <span className="mx-2">/</span>
          <span>Расчёт балки онлайн</span>
        </nav>

        {/* Hero */}
        <header className="mb-12">
          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-[var(--drawing-line)] mb-5 leading-tight">
            Расчёт балки онлайн
          </h1>
          <p className="text-base md:text-lg text-[var(--drawing-line-thin)] leading-relaxed mb-6 max-w-2xl">
            Постройте расчётную схему балки прямо в браузере, задайте опоры, сечение из каталога ГОСТ и нагрузки — и получите <strong>эпюры N, Q, M</strong>, прогиб, реакции опор и проверку прочности. Конечно-элементный расчёт на сервере, без установки программ. Готовый PDF-отчёт по ЕСКД — для диплома или экспертизы.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/cae/demo" className="btn-drawing btn-drawing-accent text-sm inline-flex">
              <Icon name="Play" size={15} className="mr-2" />
              Рассчитать балку бесплатно
            </Link>
            <Link to="/cae" className="btn-drawing text-sm inline-flex">
              <Icon name="Info" size={15} className="mr-2" />
              Подробнее о CAE
            </Link>
          </div>
        </header>

        {/* Что считает */}
        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-4">
            Что вычисляет калькулятор балки
          </h2>
          <p className="text-base text-[var(--drawing-line)] leading-relaxed mb-4">
            Онлайн-расчёт балки выполняется методом конечных элементов (балочный элемент с учётом сдвиговых деформаций). По результатам строятся эпюры внутренних усилий и определяются перемещения:
          </p>
          <ul className="space-y-2 text-[var(--drawing-line)]">
            {[
              "Эпюра продольной силы N",
              "Эпюра поперечной силы Q",
              "Эпюра изгибающего момента M",
              "Прогиб и деформированная форма балки",
              "Реакции в опорах",
              "Эквивалентные напряжения по Мизесу и запас прочности",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Icon name="Check" size={16} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Как рассчитать — HowTo */}
        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-4">
            Как рассчитать балку онлайн: 5 шагов
          </h2>
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.name} className="flex gap-4">
                <span className="font-gost-upright text-2xl font-black text-[var(--drawing-accent)] shrink-0 w-8">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-gost-upright font-bold text-lg mb-1">{s.name}</h3>
                  <p className="text-[var(--drawing-line-thin)] leading-relaxed">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Почему онлайн */}
        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-4">
            Почему расчёт балки в браузере удобнее
          </h2>
          <p className="text-base text-[var(--drawing-line)] leading-relaxed mb-3">
            Профессиональные CAE-пакеты (APM WinMachine, ANSYS, ЛИРА) требуют установки, лицензии и мощного компьютера. Наш облачный CAE — лёгкая альтернатива для типовых задач сопротивления материалов и строительной механики: всё считается на сервере, а вы работаете в браузере с любого устройства.
          </p>
          <p className="text-base text-[var(--drawing-line)] leading-relaxed">
            Расчёт подойдёт студентам для дипломного проекта (ВКР) и инженерам-практикам для быстрой проверки балок, рам и ферм. Помимо балки, в редакторе можно собрать <Link to="/cae" className="text-[var(--drawing-accent)] underline">плоскую раму или ферму</Link> — расчёт и эпюры строятся так же.
          </p>
        </section>

        {/* Как считается — методика */}
        <CaeMethodology
          title="Как считается расчёт балки"
          intro="Расчёт ведётся методом конечных элементов: балка разбивается на балочные конечные элементы Тимошенко, учитывающие изгиб и сдвиг. Из решения системы уравнений равновесия находятся узловые перемещения, а по ним — внутренние усилия N, Q, M, напряжения и реакции опор."
          assumptions={[
            "Материал линейно-упругий и изотропный (закон Гука), деформации малые.",
            "Сечение плоское до и после деформации; справедлива гипотеза прямых нормалей с поправкой на сдвиг (модель Тимошенко).",
            "Нагрузки статические, прикладываются в плоскости балки; кручение и внеплоскостной изгиб не рассматриваются.",
            "Геометрические характеристики сечения берутся из каталога ГОСТ или задаются вручную (момент инерции I, момент сопротивления W, площадь A).",
          ]}
          formulas={[
            {
              label: "Нормальные напряжения при изгибе",
              formula: "σ = M / W",
              legend: "M — изгибающий момент в сечении, W — момент сопротивления сечения. Напряжение сравнивается с допускаемым [σ] = σт / n.",
            },
            {
              label: "Прогиб (жёсткость)",
              formula: "v = f(EI, q, L)",
              legend: "EI — изгибная жёсткость (E — модуль упругости, I — момент инерции), q — нагрузка, L — пролёт. Прогиб определяется интегрированием упругой линии в МКЭ.",
            },
            {
              label: "Эквивалентные напряжения (Мизес)",
              formula: "σэкв = √(σ² + 3τ²)",
              legend: "σ — нормальные, τ — касательные напряжения. Используется энергетическая теория прочности (4-я теория) для проверки по пределу текучести.",
            },
          ]}
          checks={[
            "Прочность: σэкв ≤ [σ] с учётом коэффициента запаса n.",
            "Жёсткость: максимальный прогиб v ≤ [v] (допускаемый прогиб, обычно доля пролёта L/200…L/400).",
            "Реакции опор и эпюры N, Q, M по всей длине балки.",
          ]}
          norms={[
            { code: "ГОСТ 8239-89", about: "сортамент горячекатаных двутавров (геометрические характеристики сечений)." },
            { code: "ГОСТ 8240-97", about: "сортамент стальных горячекатаных швеллеров." },
            { code: "СП 16.13330", about: "стальные конструкции — расчётные сопротивления и предельные прогибы." },
            { code: "ЕСКД", about: "оформление расчётно-пояснительной записки и PDF-отчёта для ВКР." },
          ]}
        />

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-5">
            Частые вопросы о расчёте балки
          </h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="border-[1.5px] border-[var(--drawing-line)]/40 p-4 group">
                <summary className="font-gost-upright font-bold text-base cursor-pointer list-none flex items-start justify-between gap-3">
                  <span>{f.q}</span>
                  <Icon name="ChevronDown" size={18} className="shrink-0 mt-0.5 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-[var(--drawing-line-thin)] leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Финальный CTA */}
        <section className="border-[2.5px] border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 p-6 md:p-8 text-center mb-10">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-3">
            Рассчитайте свою балку прямо сейчас
          </h2>
          <p className="text-[var(--drawing-line-thin)] mb-5 max-w-xl mx-auto">
            Без регистрации и установки. Постройте схему, нажмите «рассчитать» — и получите эпюры за секунды.
          </p>
          <Link to="/cae/demo" className="btn-drawing btn-drawing-accent text-sm inline-flex">
            <Icon name="Play" size={15} className="mr-2" />
            Открыть редактор балки
          </Link>
        </section>

        <RelatedSections
          className="!py-0 !px-0"
          links={[
            { to: "/cae", icon: "Box", title: "Облачный CAE", text: "Расчёт рам, балок и ферм онлайн" },
            { to: "/program", icon: "GraduationCap", title: "Помощь с дипломом", text: "Наставничество по ВКР для инженеров" },
            { to: "/blog", icon: "BookOpen", title: "Блог", text: "Разборы инженерных расчётов" },
          ]}
        />
      </div>
    </>
  );
};

export default CaeBeamCalc;