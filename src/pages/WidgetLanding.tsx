/**
 * Продающий лендинг встраиваемого калькулятора балки для партнёров
 * (/widget-balka). Две задачи:
 *  1. Органическая выдача (GEO/SEO): точные ключи в title/H1/тексте,
 *     JSON-LD (SoftwareApplication, FAQPage, HowTo, Service, Breadcrumbs).
 *  2. Инструмент продаж: менеджер скидывает ссылку клиенту и по телефону
 *     ведёт его к подключению — живое демо «как на сайте клиента» и блок
 *     копирования кода с гейтом авторизации (WidgetEmbedCopy).
 */
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import {
  SITE_URL,
  absUrl,
  breadcrumbsLd,
  softwareLd,
  faqLd,
  howToLd,
  serviceLd,
} from "@/lib/seo";
import WidgetEmbedCopy from "@/components/widget/WidgetEmbedCopy";
import WidgetLiveDemo from "@/components/widget/WidgetLiveDemo";
import WidgetOrderForm from "@/components/widget/WidgetOrderForm";

const BENEFITS = [
  {
    icon: "TrendingUp",
    title: "Больше заявок с сайта",
    text: "Посетитель сам считает балку и сразу оставляет заявку — вы получаете тёплый лид с готовыми параметрами вместо абстрактного «позвоните мне».",
  },
  {
    icon: "Timer",
    title: "Подключение за 5 минут",
    text: "Одна строка кода на любой сайт — Tilda, WordPress, Битрикс, самописный. Не нужен программист, не нужно ничего пересобирать.",
  },
  {
    icon: "Cpu",
    title: "Настоящий инженерный расчёт",
    text: "Под капотом — конечно-элементный решатель: прогиб, напряжения по Мизесу, запас прочности, каталог профилей по ГОСТ. Не «калькулятор-картинка».",
  },
  {
    icon: "Mail",
    title: "Заявки сразу вам на почту",
    text: "Контакт клиента и параметры расчёта приходят на ваш email мгновенно. Ничего не теряется, можно перезванивать по горячим следам.",
  },
  {
    icon: "Palette",
    title: "Выглядит как часть вашего сайта",
    text: "Аккуратный нейтральный виджет встраивается в дизайн страницы и не ломает вёрстку — он изолирован и не конфликтует с вашими стилями.",
  },
  {
    icon: "ShieldCheck",
    title: "Работает только на вашем домене",
    text: "Персональный ключ привязан к вашим доменам. Никто чужой не сможет использовать ваш виджет и ваш лимит расчётов.",
  },
];

const STEPS = [
  {
    name: "Получите ключ",
    text: "Менеджер подключает ваш тариф и выдаёт персональный ключ доступа к виджету, привязанный к домену вашего сайта.",
  },
  {
    name: "Вставьте одну строку кода",
    text: "Скопируйте готовый код со страницы и вставьте в HTML-блок на нужной странице сайта. Калькулятор появится сразу.",
  },
  {
    name: "Принимайте заявки",
    text: "Посетители рассчитывают балку и оставляют контакты — заявки с параметрами расчёта приходят вам на email.",
  },
];

const PLANS = [
  {
    name: "Старт",
    price: "3 900 ₽/мес",
    features: ["1 сайт", "Калькулятор балки", "До 1 000 расчётов в месяц", "Заявки на email"],
    accent: false,
  },
  {
    name: "Бизнес",
    price: "8 900 ₽/мес",
    features: [
      "До 3 сайтов",
      "Балка + ферма (скоро)",
      "До 10 000 расчётов в месяц",
      "Приоритетная поддержка",
      "Логотип компании в виджете",
    ],
    accent: true,
  },
  {
    name: "Завод",
    price: "по запросу",
    features: [
      "Безлимит сайтов и расчётов",
      "Webhook в вашу CRM",
      "Свой сортамент и нормы",
      "Брендирование под вас",
    ],
    accent: false,
  },
];

const FAQ = [
  {
    q: "Что такое виджет калькулятора балки для сайта?",
    a: "Это встраиваемый онлайн-калькулятор, который показывает посетителям вашего сайта расчёт балки на прогиб и прочность: задают пролёт, нагрузку и профиль из каталога ГОСТ — получают максимальный прогиб, напряжения и запас прочности, а затем оставляют заявку на изготовление. Виджет работает на готовом конечно-элементном движке Диплом-Инж.рф.",
  },
  {
    q: "Как установить калькулятор на сайт?",
    a: "Нужно вставить одну строку кода (тег script с вашим персональным ключом) в HTML любой страницы. Это работает на Tilda, WordPress, Битрикс, Joomla и самописных сайтах. Программист не требуется — виджет появляется автоматически и сам подстраивает высоту.",
  },
  {
    q: "Сколько стоит виджет калькулятора?",
    a: "Подключение по фиксированной абонентской плате: тариф «Старт» — 3 900 ₽/мес за один сайт, «Бизнес» — 8 900 ₽/мес за несколько сайтов и больший лимит расчётов, «Завод» — по запросу с интеграцией в вашу CRM и брендированием. Точные условия уточняет менеджер.",
  },
  {
    q: "Кому подходит виджет?",
    a: "Заводам и цехам металлоконструкций, продавцам металлопроката, строительным и проектным компаниям — всем, кто продаёт балки, фермы и каркасы и хочет, чтобы клиент сам подобрал сечение прямо на сайте и оставил заявку.",
  },
  {
    q: "Куда приходят заявки от посетителей?",
    a: "Заявка с контактами клиента и параметрами его расчёта (пролёт, профиль, прогиб, запас прочности) мгновенно отправляется на указанный вами email. Вы перезваниваете клиенту, уже зная, что именно ему нужно.",
  },
  {
    q: "Можно ли посмотреть, как виджет работает, до подключения?",
    a: "Да. Прямо на этой странице встроено живое демо в виде сайта условного завода металлоконструкций — это настоящий рабочий калькулятор, его можно потрогать и сделать расчёт.",
  },
];

export default function WidgetLanding() {
  return (
    <>
      <Helmet>
        <title>
          Виджет калькулятора балки для сайта — встроить онлайн-расчёт прогиба · Диплом-Инж.рф
        </title>
        <meta
          name="description"
          content="Встраиваемый калькулятор балки для сайтов заводов металлоконструкций, продавцов металлопроката и строительных компаний. Посетитель считает прогиб и запас прочности и оставляет заявку. Установка одной строкой кода, заявки на email, абонентская плата."
        />
        <meta
          name="keywords"
          content="виджет калькулятора балки, калькулятор для сайта, онлайн расчёт балки на сайт, встроить калькулятор металлоконструкций, расчёт прогиба балки виджет, калькулятор металлопроката для сайта, white label калькулятор"
        />
        <link rel="canonical" href={`${SITE_URL}/widget-balka`} />
        <meta property="og:title" content="Виджет калькулятора балки для вашего сайта" />
        <meta
          property="og:description"
          content="Встройте онлайн-расчёт балки на сайт одной строкой кода и получайте заявки с готовыми параметрами. Для заводов металлоконструкций и продавцов проката."
        />
        <meta property="og:url" content={`${SITE_URL}/widget-balka`} />
        <script type="application/ld+json">
          {JSON.stringify(
            softwareLd({
              name: "Виджет калькулятора балки для сайта",
              description:
                "Встраиваемый онлайн-калькулятор расчёта балки на прогиб и прочность для сайтов заводов металлоконструкций и продавцов металлопроката. Установка одной строкой кода.",
              url: absUrl("/widget-balka"),
              features: [
                "Установка одной строкой кода",
                "Расчёт прогиба и запаса прочности",
                "Каталог профилей по ГОСТ",
                "Заявки на email партнёра",
                "Привязка к домену по ключу",
              ],
            }),
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            serviceLd({
              name: "Виджет калькулятора балки (white-label)",
              description:
                "Подключение встраиваемого калькулятора балки на сайт партнёра по абонентской плате: заводы металлоконструкций, продавцы проката, строительные компании.",
              url: absUrl("/widget-balka"),
              areaServed: "Россия",
              offers: [
                { name: "Старт", price: 3900, description: "1 сайт, до 1000 расчётов/мес" },
                { name: "Бизнес", price: 8900, description: "до 3 сайтов, до 10000 расчётов/мес" },
              ],
            }),
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            howToLd({
              name: "Как встроить калькулятор балки на сайт",
              description:
                "Три шага для подключения встраиваемого виджета расчёта балки на сайт партнёра.",
              steps: STEPS,
            }),
          )}
        </script>
        <script type="application/ld+json">{JSON.stringify(faqLd(FAQ))}</script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbsLd([["Виджет калькулятора балки", "/widget-balka"]]))}
        </script>
      </Helmet>

      <div className="max-w-[1100px] mx-auto px-4 pt-20 md:pt-24 pb-16">
        {/* HERO */}
        <section className="mb-14">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-accent)] mb-3">
            Виджет для сайтов · Металлоконструкции и прокат
          </p>
          <h1 className="font-gost-upright text-3xl md:text-5xl font-black uppercase tracking-wide leading-[1.05] mb-5">
            Калькулятор балки<br />
            <span className="text-[var(--drawing-accent)]">прямо на вашем сайте</span>
          </h1>
          <p className="font-gost text-base md:text-lg text-[var(--drawing-line-thin)] leading-snug max-w-[680px] mb-7">
            Дайте посетителям рассчитать прогиб и подобрать сечение балки, не уходя
            с вашего сайта — и сразу оставить заявку на изготовление. Встраивается
            одной строкой кода. Заявки с параметрами расчёта приходят вам на почту.
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            <a
              href="#zakaz"
              className="btn-drawing btn-drawing-accent text-sm inline-flex items-center gap-2"
            >
              <Icon name="Send" size={16} /> Заказать подключение
            </a>
            <a
              href="#demo"
              className="btn-drawing text-sm inline-flex items-center gap-2"
            >
              <Icon name="Play" size={16} /> Живое демо
            </a>
            <a
              href="#podkluchit"
              className="btn-drawing text-sm inline-flex items-center gap-2"
            >
              <Icon name="Code2" size={16} /> Получить код
            </a>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              "Установка за 5 минут",
              "Без программиста",
              "Заявки на email",
              "Расчёт по ГОСТ",
            ].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 font-gost text-xs text-[var(--drawing-line-thin)]"
              >
                <Icon name="Check" size={14} className="text-green-600" /> {t}
              </span>
            ))}
          </div>
        </section>

        {/* LIVE DEMO */}
        <section id="demo" className="mb-16 scroll-mt-24">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="MonitorPlay" size={18} className="text-[var(--drawing-accent)]" />
            <h2 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide">
              Вот как это выглядит на сайте клиента
            </h2>
          </div>
          <p className="font-gost text-sm text-[var(--drawing-line-thin)] mb-5 max-w-[680px]">
            Ниже — макет сайта завода металлоконструкций с уже встроенным виджетом.
            Калькулятор настоящий: задайте пролёт и нагрузку, нажмите «Рассчитать» —
            и попробуйте оформить заявку.
          </p>
          <WidgetLiveDemo />
        </section>

        {/* ПОДКЛЮЧИТЬ / КОД */}
        <section id="podkluchit" className="mb-16 scroll-mt-24">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Rocket" size={18} className="text-[var(--drawing-accent)]" />
                <h2 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide">
                  Подключить за 3 шага
                </h2>
              </div>
              <ol className="space-y-4 mt-4">
                {STEPS.map((s, i) => (
                  <li key={s.name} className="flex gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--drawing-accent)] text-white font-gost-upright font-black text-sm flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-gost-upright font-bold text-sm">{s.name}</p>
                      <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-snug mt-0.5">
                        {s.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <WidgetEmbedCopy />
          </div>
        </section>

        {/* ВЫГОДЫ */}
        <section className="mb-16">
          <h2 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide mb-6">
            Почему это повышает конверсию
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="border-2 border-[var(--drawing-line)] p-4 hover:border-[var(--drawing-accent)] transition-colors"
              >
                <Icon
                  name={b.icon}
                  size={24}
                  fallback="Sparkles"
                  className="text-[var(--drawing-accent)] mb-2"
                />
                <p className="font-gost-upright font-bold text-sm mb-1">{b.title}</p>
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-snug">
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ТАРИФЫ */}
        <section className="mb-16">
          <h2 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide mb-2">
            Тарифы
          </h2>
          <p className="font-gost text-sm text-[var(--drawing-line-thin)] mb-6">
            Фиксированная абонентская плата без процентов с заявок. Точные условия
            под ваш сайт подберёт менеджер.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`border-2 p-5 flex flex-col ${
                  p.accent
                    ? "border-[var(--drawing-accent)] bg-[var(--drawing-paper)]"
                    : "border-[var(--drawing-line)]"
                }`}
              >
                {p.accent && (
                  <span className="self-start font-gost text-[9px] uppercase tracking-wider bg-[var(--drawing-accent)] text-white px-2 py-0.5 mb-2">
                    Популярный
                  </span>
                )}
                <p className="font-gost-upright font-black text-lg uppercase">{p.name}</p>
                <p className="font-gost-upright text-2xl font-black text-[var(--drawing-accent)] my-2">
                  {p.price}
                </p>
                <ul className="space-y-1.5 mt-2 mb-5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 font-gost text-xs">
                      <Icon name="Check" size={14} className="text-green-600 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#zakaz"
                  className={`text-sm text-center ${
                    p.accent ? "btn-drawing btn-drawing-accent" : "btn-drawing"
                  }`}
                >
                  Подключить
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide mb-6">
            Частые вопросы
          </h2>
          <div className="space-y-3">
            {FAQ.map((it) => (
              <details
                key={it.q}
                className="border-2 border-[var(--drawing-line)] p-4 group"
              >
                <summary className="font-gost-upright font-bold text-sm cursor-pointer flex items-center justify-between gap-3 list-none">
                  {it.q}
                  <Icon
                    name="ChevronDown"
                    size={16}
                    className="shrink-0 group-open:rotate-180 transition-transform text-[var(--drawing-accent)]"
                  />
                </summary>
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed mt-3">
                  {it.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ЗАКАЗ ПОДКЛЮЧЕНИЯ */}
        <section id="zakaz" className="scroll-mt-24">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide mb-3">
                Зацепите клиента,<br />пока он на сайте
              </h2>
              <p className="font-gost text-sm text-[var(--drawing-line-thin)] mb-4 leading-snug">
                Подключим виджет на ваш сайт и настроим заявки на вашу почту.
                Оставьте заявку — поможем встроить калькулятор сегодня же.
              </p>
              <ul className="space-y-1.5">
                {["Подключение за 5 минут", "Без программиста", "Первый расчёт уже сегодня"].map(
                  (li) => (
                    <li key={li} className="flex items-center gap-2 font-gost text-sm">
                      <Icon name="Check" size={15} className="text-green-600 shrink-0" />
                      {li}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <WidgetOrderForm />
          </div>
        </section>
      </div>
    </>
  );
}