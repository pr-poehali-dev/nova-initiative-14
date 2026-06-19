import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { SITE_URL, absUrl, breadcrumbsLd, softwareLd, faqLd, howToLd, techArticleLd } from "@/lib/seo";
import RelatedSections from "@/components/RelatedSections";
import AlphaTestBanner from "@/components/AlphaTestBanner";
import CaeMethodology from "@/components/cae/CaeMethodology";

/**
 * SEO-посадочная под запрос «расчёт фермы онлайн» и смежные
 * («расчёт усилий в стержнях фермы», «расчёт плоской фермы», «ферма
 * методом конечных элементов»). Точное вхождение ключа + полезный
 * контент, пошаговая инструкция (HowTo) и FAQ-блок с FAQPage-разметкой.
 */

const STEPS = [
  {
    name: "Постройте геометрию фермы",
    text: "Расставьте узлы поясов и решётки, соедините их стержнями. Поставьте опоры — обычно одна шарнирно-неподвижная и одна катковая.",
  },
  {
    name: "Сделайте узлы шарнирными",
    text: "В классической ферме стержни работают только на растяжение-сжатие. Включите шарниры в узлах (освобождение момента) — тогда расчёт даст чистые продольные усилия в стержнях.",
  },
  {
    name: "Назначьте сечения стержней",
    text: "Выберите профили из каталога ГОСТ (уголки, трубы, тавры) для поясов и раскосов или задайте свои площади сечений и материал.",
  },
  {
    name: "Приложите узловую нагрузку",
    text: "Нагрузки в ферме прикладываются в узлах — сосредоточенные силы от веса покрытия, оборудования, снега. Добавьте их в нужные узлы поясов.",
  },
  {
    name: "Рассчитайте усилия и проверьте стержни",
    text: "Облачный решатель методом конечных элементов вычисляет продольные усилия N в каждом стержне (растяжение/сжатие), перемещения узлов и реакции опор. CAE проверяет прочность по напряжениям и устойчивость сжатых стержней. Итог — PDF-отчёт по ЕСКД.",
  },
];

const FAQ = [
  {
    q: "Как рассчитать ферму онлайн?",
    a: "Постройте геометрию фермы из узлов и стержней в браузере, поставьте опоры, включите шарниры в узлах, задайте сечения из каталога ГОСТ и приложите узловую нагрузку. Запустите расчёт — сервис методом конечных элементов вычислит продольные усилия N в каждом стержне, перемещения узлов и реакции опор. В режиме альфа-теста расчёт фермы бесплатный.",
  },
  {
    q: "Какие усилия определяет расчёт фермы?",
    a: "Главный результат — продольная сила N в каждом стержне (растяжение со знаком плюс, сжатие со знаком минус). Дополнительно выводятся перемещения узлов, деформированная форма, реакции опор и напряжения в стержнях.",
  },
  {
    q: "Почему в ферме нужно ставить шарниры?",
    a: "В идеальной ферме стержни соединены шарнирно и воспринимают только осевые усилия. Если оставить узлы жёсткими, в стержнях появятся паразитные изгибающие моменты. Включение шарниров в узлах даёт классическую расчётную схему фермы с чистыми продольными усилиями.",
  },
  {
    q: "Проверяется ли устойчивость сжатых стержней?",
    a: "Да. Сжатые стержни фермы (например, верхний пояс и сжатые раскосы) проверяются на устойчивость — продольный изгиб. CAE учитывает это при оценке несущей способности стержня.",
  },
  {
    q: "Нужно ли устанавливать программу?",
    a: "Нет. Это облачный CAE: расчёт фермы выполняется на сервере, а вы работаете прямо в браузере на любом устройстве. Установка и лицензия не нужны.",
  },
  {
    q: "Подойдёт ли расчёт для диплома?",
    a: "Да. По результатам формируется PDF-отчёт по ЕСКД с расчётной схемой фермы, таблицей усилий в стержнях, реакциями опор и формулами — его можно вложить в пояснительную записку ВКР.",
  },
];

const CaeTrussCalc = () => {
  return (
    <>
      <Helmet>
        <title>Расчёт фермы онлайн — усилия в стержнях фермы · Диплом-Инж.рф</title>
        <meta
          name="description"
          content="Расчёт плоской фермы онлайн бесплатно: постройте схему в браузере, поставьте опоры и шарниры, задайте сечения по ГОСТ и узловые нагрузки — получите продольные усилия N в стержнях, перемещения узлов, реакции опор и проверку устойчивости. Без установки, PDF-отчёт по ЕСКД."
        />
        <meta
          name="keywords"
          content="расчёт фермы онлайн, расчёт усилий в стержнях фермы, расчёт плоской фермы, ферма методом конечных элементов, усилия в ферме онлайн, расчёт стропильной фермы"
        />
        <link rel="canonical" href={`${SITE_URL}/cae/raschet-fermy-onlayn`} />
        <script type="application/ld+json">
          {JSON.stringify(
            softwareLd({
              name: "Расчёт фермы онлайн — облачный CAE",
              description:
                "Онлайн-расчёт плоской фермы: конечно-элементный расчёт продольных усилий N в стержнях, перемещений узлов и реакций опор, проверка устойчивости сжатых стержней, каталог ГОСТ-профилей и PDF-отчёт по ЕСКД.",
              url: absUrl("/cae/raschet-fermy-onlayn"),
              features: [
                "Усилия N в стержнях фермы",
                "Растяжение и сжатие со знаком",
                "Перемещения узлов фермы",
                "Проверка устойчивости сжатых стержней",
                "Каталог ГОСТ-профилей (уголки, трубы)",
                "PDF-отчёт по ЕСКД",
              ],
            })
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            howToLd({
              name: "Как рассчитать ферму онлайн",
              description:
                "Пошаговый расчёт плоской фермы в облачном CAE: геометрия, шарниры, сечения, узловые нагрузки и усилия в стержнях.",
              steps: STEPS,
            })
          )}
        </script>
        <script type="application/ld+json">{JSON.stringify(faqLd(FAQ))}</script>
        <script type="application/ld+json">
          {JSON.stringify(
            techArticleLd({
              headline: "Как считается расчёт фермы: метод, формулы и нормы ГОСТ",
              description:
                "Методика онлайн-расчёта фермы: стержневой конечный элемент с шарнирными узлами, определение усилий растяжения-сжатия, проверка прочности и устойчивости сжатых стержней.",
              url: absUrl("/cae/raschet-fermy-onlayn"),
              about: ["Строительная механика", "Ферма", "Метод конечных элементов", "Устойчивость стержней"],
            })
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbsLd([
              ["Облачный CAE", "/cae"],
              ["Расчёт фермы онлайн", "/cae/raschet-fermy-onlayn"],
            ])
          )}
        </script>
      </Helmet>

      <div className="max-w-[900px] mx-auto px-4 pt-20 md:pt-24 pb-16">
        <AlphaTestBanner className="mb-6" />

        <nav className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-6">
          <Link to="/cae" className="hover:text-[var(--drawing-accent)]">Облачный CAE</Link>
          <span className="mx-2">/</span>
          <span>Расчёт фермы онлайн</span>
        </nav>

        <header className="mb-12">
          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-[var(--drawing-line)] mb-5 leading-tight">
            Расчёт фермы онлайн
          </h1>
          <p className="text-base md:text-lg text-[var(--drawing-line-thin)] leading-relaxed mb-6 max-w-2xl">
            Постройте плоскую ферму из узлов и стержней прямо в браузере, поставьте опоры и шарниры, задайте сечения по ГОСТ и узловые нагрузки — и получите <strong>продольные усилия N в каждом стержне</strong> (растяжение/сжатие), перемещения узлов и реакции опор. Конечно-элементный расчёт на сервере. Готовый PDF-отчёт по ЕСКД — для диплома или экспертизы.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/cae/demo" className="btn-drawing btn-drawing-accent text-sm inline-flex">
              <Icon name="Play" size={15} className="mr-2" />
              Рассчитать ферму бесплатно
            </Link>
            <Link to="/cae" className="btn-drawing text-sm inline-flex">
              <Icon name="Info" size={15} className="mr-2" />
              Подробнее о CAE
            </Link>
          </div>
        </header>

        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-4">
            Что вычисляет расчёт фермы
          </h2>
          <p className="text-base text-[var(--drawing-line)] leading-relaxed mb-4">
            Онлайн-расчёт плоской фермы выполняется методом конечных элементов. При шарнирных узлах стержни работают на растяжение-сжатие, и результат — чистые продольные усилия:
          </p>
          <ul className="space-y-2 text-[var(--drawing-line)]">
            {[
              "Продольная сила N в каждом стержне (растяжение / сжатие)",
              "Знак усилия: + растяжение, − сжатие",
              "Перемещения узлов и деформированная форма фермы",
              "Реакции в опорах",
              "Напряжения в стержнях и проверка прочности",
              "Проверка устойчивости сжатых стержней (продольный изгиб)",
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
            Как рассчитать ферму онлайн: 5 шагов
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
            Ферма, рама или балка — в одном редакторе
          </h2>
          <p className="text-base text-[var(--drawing-line)] leading-relaxed mb-3">
            Стропильные и подкрановые фермы, мостовые и кровельные конструкции рассчитываются по одной схеме: узлы, стержни, опоры, узловые нагрузки. Облачный CAE считает усилия за секунды и не требует установки тяжёлых пакетов вроде SCAD или ЛИРА.
          </p>
          <p className="text-base text-[var(--drawing-line)] leading-relaxed">
            В том же редакторе можно рассчитать{" "}
            <Link to="/cae/raschet-balki-onlayn" className="text-[var(--drawing-accent)] underline">балку</Link>{" "}
            или{" "}
            <Link to="/cae/raschet-ramy-onlayn" className="text-[var(--drawing-accent)] underline">плоскую раму</Link>{" "}
            с эпюрами N, Q, M.
          </p>
        </section>

        {/* Как считается — методика */}
        <CaeMethodology
          title="Как считается расчёт фермы"
          intro="Ферма моделируется стержневыми конечными элементами с шарнирными узлами: каждый стержень работает только на растяжение или сжатие, изгиб в идеальной ферме отсутствует. Из решения системы уравнений равновесия узлов определяются продольные усилия в стержнях, реакции опор и перемещения узлов."
          assumptions={[
            "Все узлы шарнирные, нагрузки приложены только в узлах — стержни работают на центральное растяжение-сжатие.",
            "Материал линейно-упругий и изотропный; деформации малые.",
            "Собственный вес стержней либо не учитывается, либо приводится к узловым силам.",
            "Геометрические характеристики сечений берутся из каталога ГОСТ или задаются вручную.",
          ]}
          formulas={[
            {
              label: "Напряжение в стержне",
              formula: "σ = N / A",
              legend: "N — продольное усилие в стержне (растяжение «+», сжатие «−»), A — площадь сечения. Сравнивается с допускаемым [σ] = σт / n.",
            },
            {
              label: "Критическая сила (устойчивость сжатого стержня)",
              formula: "Nкр = π²·E·I / (μL)²",
              legend: "E — модуль упругости, I — минимальный момент инерции сечения, L — длина стержня, μ — коэффициент приведения длины (формула Эйлера).",
            },
            {
              label: "Условие устойчивости",
              formula: "N ≤ Nкр / nу",
              legend: "Сжатое усилие N не должно превышать критическую силу с коэффициентом запаса устойчивости nу.",
            },
          ]}
          checks={[
            "Прочность: σ ≤ [σ] для растянутых и сжатых стержней.",
            "Устойчивость сжатых стержней по формуле Эйлера с коэффициентом запаса.",
            "Перемещения узлов и реакции опор фермы.",
            "Определение «нулевых» стержней (с нулевым усилием).",
          ]}
          norms={[
            { code: "ГОСТ 8509-93", about: "сортамент равнополочных уголков для поясов и решётки фермы." },
            { code: "ГОСТ 8639-82", about: "сортамент квадратных и прямоугольных труб." },
            { code: "СП 16.13330", about: "стальные конструкции — расчёт прочности и устойчивости стержней." },
            { code: "ЕСКД", about: "оформление расчётной записки и PDF-отчёта для ВКР." },
          ]}
        />

        <section className="mb-12">
          <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-5">
            Частые вопросы о расчёте фермы
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
            Рассчитайте свою ферму прямо сейчас
          </h2>
          <p className="text-[var(--drawing-line-thin)] mb-5 max-w-xl mx-auto">
            Без регистрации и установки. Постройте схему, нажмите «рассчитать» — и получите усилия в стержнях за секунды.
          </p>
          <Link to="/cae/demo" className="btn-drawing btn-drawing-accent text-sm inline-flex">
            <Icon name="Play" size={15} className="mr-2" />
            Открыть редактор фермы
          </Link>
        </section>

        <RelatedSections
          className="!py-0 !px-0"
          links={[
            { to: "/cae/raschet-balki-onlayn", icon: "Minus", title: "Расчёт балки онлайн", text: "Эпюры N, Q, M и прогиб балки" },
            { to: "/cae/raschet-ramy-onlayn", icon: "Frame", title: "Расчёт рамы онлайн", text: "Эпюры N, Q, M плоской рамы" },
            { to: "/cae", icon: "Box", title: "Облачный CAE", text: "Расчёт рам, балок и ферм онлайн" },
          ]}
        />
      </div>
    </>
  );
};

export default CaeTrussCalc;