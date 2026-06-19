import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { SITE_URL, absUrl, breadcrumbsLd, softwareLd, faqLd, howToLd, techArticleLd } from "@/lib/seo";
import RelatedSections from "@/components/RelatedSections";
import AlphaTestBanner from "@/components/AlphaTestBanner";
import CaeMethodology from "@/components/cae/CaeMethodology";

/**
 * SEO-посадочная под запрос «расчёт рамы онлайн» и смежные
 * («расчёт плоской рамы», «эпюры в раме онлайн», «расчёт рамы методом
 * конечных элементов»). Точное вхождение ключа + полезный контент,
 * пошаговая инструкция (HowTo) и FAQ-блок с FAQPage-разметкой.
 */

const STEPS = [
  {
    name: "Нарисуйте геометрию рамы",
    text: "Расставьте узлы и соедините их стержнями (стойки и ригели) на сетке. Задайте опоры — жёсткую заделку, шарнирную или катковую — и при необходимости промежуточные шарниры в узлах.",
  },
  {
    name: "Назначьте сечения стержней",
    text: "Подберите профили из каталога ГОСТ (двутавр, швеллер, труба, прямоугольник) для стоек и ригелей или задайте свои геометрические характеристики и материал.",
  },
  {
    name: "Приложите нагрузки",
    text: "Добавьте узловые силы и моменты, распределённую нагрузку на ригели (снег, перекрытие), горизонтальные силы (ветер). Поддерживаются равномерные и трапециевидные нагрузки.",
  },
  {
    name: "Выполните расчёт рамы",
    text: "Облачный решатель методом конечных элементов строит эпюры продольной силы N, поперечной силы Q и изгибающего момента M по всем стержням рамы, вычисляет перемещения узлов и реакции опор.",
  },
  {
    name: "Проверьте прочность и устойчивость",
    text: "CAE сравнивает эквивалентные напряжения по Мизесу с допускаемыми, проверяет прогибы, а при включённом нелинейном режиме учитывает P-Δ эффекты для оценки устойчивости сжатых стоек. Итог — PDF-отчёт по ЕСКД.",
  },
];

const FAQ = [
  {
    q: "Как рассчитать плоскую раму онлайн?",
    a: "Постройте геометрию рамы из узлов и стержней в браузере, задайте опоры, сечения стоек и ригелей из каталога ГОСТ и приложите нагрузки. Запустите расчёт — сервис методом конечных элементов построит эпюры N, Q, M, покажет перемещения узлов и реакции опор. В режиме альфа-теста расчёт рамы бесплатный.",
  },
  {
    q: "Какие эпюры строит расчёт рамы?",
    a: "Эпюры продольной силы N, поперечной силы Q и изгибающего момента M по каждому стержню рамы, а также деформированную форму и эпюру эквивалентных напряжений по Мизесу. Отдельно выводятся реакции в опорах.",
  },
  {
    q: "Учитывается ли устойчивость и P-Δ эффекты?",
    a: "Да. В нелинейном режиме CAE учитывает геометрическую нелинейность (P-Δ эффекты), что важно для оценки устойчивости сжатых стоек и гибких рам. Режим включается одним тумблером в настройках расчёта.",
  },
  {
    q: "Можно ли задавать жёсткие узлы и шарниры?",
    a: "Да. Узлы рамы по умолчанию жёсткие (передают момент), но в любом узле или на конце стержня можно поставить шарнир — это нужно для расчётных схем с подкосами, трёхшарнирных рам и т. п.",
  },
  {
    q: "Нужно ли устанавливать программу?",
    a: "Нет. Это облачный CAE: расчёт рамы выполняется на сервере, а вы работаете прямо в браузере на любом устройстве, включая слабый ноутбук. Установка и лицензия не требуются.",
  },
  {
    q: "Подойдёт ли для дипломного проекта?",
    a: "Да. По результатам формируется PDF-отчёт по ЕСКД с расчётной схемой, эпюрами, формулами и реакциями опор — его можно вложить в пояснительную записку ВКР или в экспертизу.",
  },
];

const CaeFrameCalc = () => {
  return (
    <>
      <Helmet>
        <title>Расчёт рамы онлайн — эпюры N, Q, M плоской рамы · Диплом-Инж.рф</title>
        <meta
          name="description"
          content="Расчёт плоской рамы онлайн бесплатно: постройте схему в браузере, задайте опоры, сечения стоек и ригелей по ГОСТ и нагрузки — получите эпюры N, Q, M, перемещения, реакции опор, проверку прочности по Мизесу и устойчивости (P-Δ). Без установки, PDF-отчёт по ЕСКД."
        />
        <meta
          name="keywords"
          content="расчёт рамы онлайн, расчёт плоской рамы, эпюры в раме онлайн, расчёт рамы методом конечных элементов, эпюра моментов рамы, расчёт каркаса онлайн, расчёт рамы на устойчивость"
        />
        <link rel="canonical" href={`${SITE_URL}/cae/raschet-ramy-onlayn`} />
        <script type="application/ld+json">
          {JSON.stringify(
            softwareLd({
              name: "Расчёт рамы онлайн — облачный CAE",
              description:
                "Онлайн-расчёт плоской рамы: конечно-элементный расчёт эпюр N, Q, M, перемещений и напряжений по Мизесу с учётом P-Δ, каталог ГОСТ-профилей и PDF-отчёт по ЕСКД.",
              url: absUrl("/cae/raschet-ramy-onlayn"),
              features: [
                "Эпюры N, Q, M плоской рамы",
                "Расчёт перемещений узлов",
                "Проверка прочности по Мизесу",
                "Нелинейный расчёт P-Δ (устойчивость)",
                "Каталог ГОСТ-профилей",
                "PDF-отчёт по ЕСКД",
              ],
            })
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            howToLd({
              name: "Как рассчитать раму онлайн",
              description:
                "Пошаговый расчёт плоской рамы в облачном CAE: геометрия, сечения, нагрузки, эпюры N/Q/M и проверка прочности и устойчивости.",
              steps: STEPS,
            })
          )}
        </script>
        <script type="application/ld+json">{JSON.stringify(faqLd(FAQ))}</script>
        <script type="application/ld+json">
          {JSON.stringify(
            techArticleLd({
              headline: "Как считается расчёт рамы: метод, формулы и нормы ГОСТ",
              description:
                "Методика онлайн-расчёта плоской рамы: рамный конечный элемент с жёсткими и шарнирными узлами, учёт P-Δ эффектов, формулы напряжений и проверка прочности и устойчивости.",
              url: absUrl("/cae/raschet-ramy-onlayn"),
              about: ["Строительная механика", "Плоская рама", "Метод конечных элементов", "Устойчивость P-Δ"],
            })
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbsLd([
              ["Облачный CAE", "/cae"],
              ["Расчёт рамы онлайн", "/cae/raschet-ramy-onlayn"],
            ])
          )}
        </script>
      </Helmet>

      <div className="max-w-[900px] mx-auto px-4 pt-20 md:pt-24 pb-16">
        <AlphaTestBanner className="mb-6" />

        <nav className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-6">
          <Link to="/cae" className="hover:text-[var(--drawing-accent)]">Облачный CAE</Link>
          <span className="mx-2">/</span>
          <span>Расчёт рамы онлайн</span>
        </nav>

        <header className="mb-12">
          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-[var(--drawing-line)] mb-5 leading-tight">
            Расчёт рамы онлайн
          </h1>
          <p className="text-base md:text-lg text-[var(--drawing-line-thin)] leading-relaxed mb-6 max-w-2xl">
            Соберите плоскую раму из стоек и ригелей прямо в браузере, задайте опоры, сечения по ГОСТ и нагрузки — и получите <strong>эпюры N, Q, M</strong>, перемещения узлов, реакции опор и проверку прочности. Конечно-элементный расчёт на сервере с учётом P-Δ. Готовый PDF-отчёт по ЕСКД — для диплома или экспертизы.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/cae/demo" className="btn-drawing btn-drawing-accent text-sm inline-flex">
              <Icon name="Play" size={15} className="mr-2" />
              Рассчитать раму бесплатно
            </Link>
            <Link to="/cae" className="btn-drawing text-sm inline-flex">
              <Icon name="Info" size={15} className="mr-2" />
              Подробнее о CAE
            </Link>
          </div>
        </header>

        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-4">
            Что вычисляет расчёт рамы
          </h2>
          <p className="text-base text-[var(--drawing-line)] leading-relaxed mb-4">
            Онлайн-расчёт плоской рамы выполняется методом конечных элементов (балочный элемент с учётом сдвиговых деформаций). По стержням строятся эпюры внутренних усилий, по узлам — перемещения:
          </p>
          <ul className="space-y-2 text-[var(--drawing-line)]">
            {[
              "Эпюра продольной силы N по стойкам и ригелям",
              "Эпюра поперечной силы Q",
              "Эпюра изгибающего момента M",
              "Перемещения и повороты узлов, деформированная форма",
              "Реакции в опорах",
              "Эквивалентные напряжения по Мизесу и проверка устойчивости (P-Δ)",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Icon name="Check" size={16} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-4">
            Как рассчитать раму онлайн: 5 шагов
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

        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-4">
            Лёгкая альтернатива тяжёлым пакетам
          </h2>
          <p className="text-base text-[var(--drawing-line)] leading-relaxed mb-3">
            Расчёт рам в ЛИРА, SCAD или APM WinMachine требует установки, лицензии и времени на освоение. Для типовых плоских рам наш облачный CAE считает то же самое прямо в браузере — это удобно для учебных задач и быстрых инженерных проверок.
          </p>
          <p className="text-base text-[var(--drawing-line)] leading-relaxed">
            В том же редакторе можно рассчитать{" "}
            <Link to="/cae/raschet-balki-onlayn" className="text-[var(--drawing-accent)] underline">балку</Link>{" "}
            или{" "}
            <Link to="/cae/raschet-fermy-onlayn" className="text-[var(--drawing-accent)] underline">ферму</Link>{" "}
            — расчётная схема и эпюры строятся аналогично.
          </p>
        </section>

        {/* Как считается — методика */}
        <CaeMethodology
          title="Как считается расчёт рамы"
          intro="Плоская рама моделируется набором рамных (балочно-стержневых) конечных элементов, соединённых в узлах. По умолчанию узлы жёсткие и передают момент, но в любом узле можно поставить шарнир. Решением системы уравнений равновесия находятся перемещения и повороты узлов, а по ним — эпюры N, Q, M в каждом стержне, реакции опор и напряжения."
          assumptions={[
            "Материал линейно-упругий и изотропный; в линейном режиме деформации малые.",
            "Стержни работают на изгиб, растяжение-сжатие и сдвиг в плоскости рамы.",
            "Жёсткие узлы передают момент между стержнями; шарниры освобождают поворот.",
            "В нелинейном режиме учитывается геометрическая нелинейность (P-Δ) для оценки устойчивости сжатых стоек.",
          ]}
          formulas={[
            {
              label: "Напряжения в стержне (изгиб + продольная сила)",
              formula: "σ = N / A ± M / W",
              legend: "N — продольная сила, A — площадь сечения, M — изгибающий момент, W — момент сопротивления. Знак зависит от волокна сечения.",
            },
            {
              label: "Учёт продольно-поперечного изгиба (P-Δ)",
              formula: "[K] = [K₀] + [Kг]",
              legend: "[K₀] — линейная матрица жёсткости, [Kг] — геометрическая матрица, зависящая от продольных сил. Её учёт даёт эффект снижения жёсткости и потери устойчивости.",
            },
            {
              label: "Эквивалентные напряжения (Мизес)",
              formula: "σэкв = √(σ² + 3τ²)",
              legend: "Проверка прочности по энергетической теории (4-я теория прочности) сравнением с пределом текучести и коэффициентом запаса.",
            },
          ]}
          checks={[
            "Прочность стержней: σэкв ≤ [σ] с коэффициентом запаса n.",
            "Перемещения узлов рамы и горизонтальный сдвиг (для каркасов).",
            "Устойчивость сжатых стоек в нелинейном режиме (P-Δ).",
            "Реакции опор и эпюры N, Q, M по всем стержням.",
          ]}
          norms={[
            { code: "ГОСТ 8239-89", about: "сортамент двутавров для стоек и ригелей рамы." },
            { code: "ГОСТ 8240-97", about: "сортамент швеллеров." },
            { code: "СП 16.13330", about: "стальные конструкции — расчёт прочности, устойчивости и предельных перемещений." },
            { code: "ЕСКД", about: "оформление расчётной записки и PDF-отчёта для ВКР." },
          ]}
        />

        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-5">
            Частые вопросы о расчёте рамы
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

        <section className="border-[2.5px] border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 p-6 md:p-8 text-center mb-10">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-3">
            Рассчитайте свою раму прямо сейчас
          </h2>
          <p className="text-[var(--drawing-line-thin)] mb-5 max-w-xl mx-auto">
            Без регистрации и установки. Соберите схему, нажмите «рассчитать» — и получите эпюры за секунды.
          </p>
          <Link to="/cae/demo" className="btn-drawing btn-drawing-accent text-sm inline-flex">
            <Icon name="Play" size={15} className="mr-2" />
            Открыть редактор рамы
          </Link>
        </section>

        <RelatedSections
          className="!py-0 !px-0"
          links={[
            { to: "/cae/raschet-balki-onlayn", icon: "Minus", title: "Расчёт балки онлайн", text: "Эпюры N, Q, M и прогиб балки" },
            { to: "/cae/raschet-fermy-onlayn", icon: "Triangle", title: "Расчёт фермы онлайн", text: "Усилия в стержнях фермы" },
            { to: "/cae", icon: "Box", title: "Облачный CAE", text: "Расчёт рам, балок и ферм онлайн" },
          ]}
        />
      </div>
    </>
  );
};

export default CaeFrameCalc;