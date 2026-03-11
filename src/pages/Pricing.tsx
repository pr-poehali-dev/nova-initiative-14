import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const tariffs = [
  {
    pos: "01",
    duration: "3 мес.",
    title: "Сопровождение 3 месяца",
    audience: "Для тех, кто на ранней стадии: тема утверждена, но работа не начата или в самом начале. Есть 3+ месяца до защиты.",
    format: "12 индивидуальных встреч, смешанный формат (видео + Telegram)",
    price: "{цена_3м}",
    includes: [
      "12 индивидуальных встреч по 60 мин",
      "Пошаговый план на весь период",
      "Проверка всех разделов ПЗ и чертежей",
      "Работа с замечаниями научрука",
      "Подготовка к защите: презентация + прогон",
      "Чат-поддержка 10:00–20:00 ежедневно",
    ],
    between: "Проверка текста и чертежей между встречами — до 30 стр. или 3 листов КД в неделю.",
    review: "Проверка материалов: без ограничений в рамках плана",
    limits: "Ответ на проверку — до 48 часов. Дополнительный объём — по согласованию.",
    cta: "Записаться на диагностику",
    ctaTo: "/contacts",
    popular: false,
  },
  {
    pos: "02",
    duration: "1 мес.",
    title: "Групповой месяц",
    audience: "Бюджет ограничен, но нужна системная работа. Есть 1–1.5 месяца. Подходит, если нужна мотивация группы.",
    format: "4 групповых занятия (до 4 человек), онлайн",
    price: "{цена_группа_1м}",
    includes: [
      "4 групповых занятия по 90 мин",
      "Индивидуальный план внутри группы",
      "Проверка ключевых разделов ПЗ",
      "Разбор типовых ошибок на примерах группы",
      "Подготовка к защите в группе",
      "Чат-поддержка 10:00–20:00 ежедневно",
    ],
    between: "Проверка текста между занятиями — до 15 стр. в неделю.",
    review: "Проверка материалов: до 4 итераций за курс",
    limits: "Приоритет ответа — 72 часа. Чертежи — базовая проверка оформления.",
    cta: "Записаться в группу",
    ctaTo: "/contacts",
    popular: true,
  },
  {
    pos: "03",
    duration: "1 мес.",
    title: "Индивидуальный месяц",
    audience: "Интенсивная работа: работа частично готова, много замечаний или мало времени. Есть 1–1.5 месяца.",
    format: "8 индивидуальных встреч, смешанный формат (видео + Telegram)",
    price: "{цена_инд_1м}",
    includes: [
      "8 индивидуальных встреч по 60 мин",
      "Фокусированный план на месяц",
      "Проверка основных разделов ПЗ и КД",
      "Работа с замечаниями научрука",
      "Подготовка к защите: презентация + прогон",
      "Чат-поддержка 10:00–20:00 ежедневно",
    ],
    between: "Проверка текста и чертежей между встречами — до 25 стр. или 2 листов КД в неделю.",
    review: "Проверка материалов: без ограничений в рамках плана",
    limits: "Ответ на проверку — до 48 часов.",
    cta: "Записаться на диагностику",
    ctaTo: "/contacts",
    popular: false,
  },
  {
    pos: "04",
    duration: "3 дня",
    title: "Экспресс 3 дня",
    audience: "Критическая ситуация: не допускают к защите, осталось меньше недели, нужен срочный разбор.",
    format: "3 индивидуальных встречи, видео + Telegram",
    price: "{цена_экспресс_3д}",
    includes: [
      "3 индивидуальных встречи по 60–90 мин",
      "Экспресс-аудит текущего состояния работы",
      "Критические правки: структура, логика, оформление",
      "Работа с главными замечаниями научрука",
      "Подготовка к вопросам комиссии",
      "Чат-поддержка в режиме реального времени",
    ],
    between: "Проверка — приоритетная, в течение 12 часов.",
    review: "Проверка материалов: до 40 стр. за 3 дня",
    limits: "По согласованию, мест мало. Объём работы ограничен сроком.",
    cta: "Нужен экспресс-разбор",
    ctaTo: "/contacts",
    popular: false,
    warning: true,
  },
];

const comparisonRows = [
  { label: "Длительность", values: ["3 месяца", "1 месяц", "1 месяц", "3 дня"] },
  { label: "Формат", values: ["Индивид.", "Группа (до 4)", "Индивид.", "Индивид."] },
  { label: "Кол-во занятий", values: ["12", "4", "8", "3"] },
  { label: "Чат 10:00–20:00", values: ["check", "check", "check", "check"] },
  { label: "Проверка глав между занятиями", values: ["check", "check", "check", "check"] },
  { label: "Работа с замечаниями научрука", values: ["check", "partial", "check", "check"] },
  { label: "Проверка логики и структуры", values: ["check", "check", "check", "check"] },
  { label: "Работа с КД / ЕСКД", values: ["check", "partial", "check", "partial"] },
  { label: "Подготовка к защите", values: ["check", "check", "check", "check"] },
  { label: "До дедлайна осталось", values: ["3+ мес.", "1–1.5 мес.", "1–1.5 мес.", "< 1 нед."] },
  { label: "Цена", values: ["{цена_3м}", "{цена_группа_1м}", "{цена_инд_1м}", "{цена_экспресс_3д}"] },
];

const scenarios = [
  { situation: "Тема утверждена, работа не начата, 3+ мес. до защиты", tariff: "Сопровождение 3 мес." },
  { situation: "1–1.5 мес., работа частично готова", tariff: "Индивидуальный месяц" },
  { situation: "1–1.5 мес., бюджет ограничен", tariff: "Групповой месяц" },
  { situation: "Много замечаний научрука, 2–4 недели", tariff: "Индивидуальный месяц" },
  { situation: "Не допускают к защите, < недели", tariff: "Экспресс 3 дня" },
  { situation: "Не понимаете материал перед защитой", tariff: "Экспресс 3 дня" },
  { situation: "Хотите спокойно разобраться с нуля", tariff: "Сопровождение 3 мес." },
  { situation: "Нужна мотивация и поддержка группы", tariff: "Групповой месяц" },
];

const renderCellValue = (val: string) => {
  if (val === "check") return <Icon name="Check" size={16} className="text-green-700 mx-auto" />;
  if (val === "partial") return <span className="font-gost text-[10px] text-[var(--drawing-line-thin)]">частично</span>;
  return <span>{val}</span>;
};

const Pricing = () => {
  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">В1</div>
          <div className="zone-marker top-2 right-3">Зона III</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Тарифы и форматы работы&nbsp;&middot; ДИПЛОМ.ИНЖ
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Тарифы
            <br />
            <span className="text-[var(--drawing-accent)]">наставничества</span>
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Выберите формат работы под ваш срок и&nbsp;ситуацию. Все тарифы включают чат&#8209;поддержку 10:00&ndash;20:00 и&nbsp;проверку материалов. Итоговая стоимость фиксируется при&nbsp;согласовании объёма и&nbsp;графика.
          </p>
        </div>
      </section>

      <section className="px-4 md:px-8 max-w-[1200px] mx-auto pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tariffs.map((t) => (
            <div
              key={t.pos}
              className={`relative flex flex-col ${
                t.popular
                  ? "border-2 border-[var(--drawing-accent)]"
                  : "border-[1.5px] border-[var(--drawing-line)]"
              }`}
            >
              <div
                className={`px-6 py-3 flex justify-between items-center ${
                  t.popular
                    ? "bg-[var(--drawing-accent)] text-[var(--drawing-bg)]"
                    : "bg-[var(--drawing-paper)] border-b-[1.5px] border-[var(--drawing-line)]"
                }`}
              >
                <span className={`font-gost text-[10px] uppercase tracking-[0.2em] ${t.popular ? "" : "text-[var(--drawing-line-thin)]"}`}>
                  Поз. {t.pos}{t.popular ? " \u00B7 Популярный" : ""}
                </span>
                <span className={`font-gost text-[10px] ${t.popular ? "" : "text-[var(--drawing-line-thin)]"}`}>
                  {t.duration}
                </span>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <span className="font-gost-upright text-5xl font-bold text-[var(--drawing-line)] opacity-[0.07] leading-none select-none mb-2">
                  {t.pos}
                </span>

                <h3 className="font-gost-upright text-xl font-bold uppercase tracking-tight text-[var(--drawing-line)] mb-2">
                  {t.title}
                </h3>

                <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed mb-3">
                  {t.audience}
                </p>

                <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mb-4">
                  <span className="uppercase tracking-[0.15em]">Формат:</span> {t.format}
                </p>

                <div className="extension-line-h w-full mb-4" />

                <p className="font-gost-upright text-2xl font-bold tracking-tight text-[var(--drawing-line)] mb-4">
                  <span className="text-[var(--drawing-accent)]">{t.price}</span> &#8381;
                </p>

                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                  Что входит
                </div>
                <ul className="space-y-1.5 mb-4">
                  {t.includes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 font-gost text-xs text-[var(--drawing-line)]">
                      <span className="w-3 h-[2px] bg-[var(--drawing-accent)] mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-relaxed mb-1">
                  <span className="font-bold">Между занятиями:</span> {t.between}
                </p>
                <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-relaxed mb-1">
                  <span className="font-bold">Проверка:</span> {t.review}
                </p>
                <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-relaxed mb-5 opacity-70">
                  {t.limits}
                </p>

                {t.warning && (
                  <div className="flex items-center gap-2 mb-4 p-2 border border-[var(--drawing-accent)] bg-[rgba(192,57,43,0.04)]">
                    <Icon name="AlertTriangle" size={14} className="text-[var(--drawing-accent)] shrink-0" />
                    <span className="font-gost text-[10px] text-[var(--drawing-accent)]">По согласованию, мест мало</span>
                  </div>
                )}

                <div className="mt-auto">
                  <Link
                    to={t.ctaTo}
                    className={`block text-center py-2.5 font-gost text-xs uppercase tracking-[0.15em] transition-colors ${
                      t.popular
                        ? "bg-[var(--drawing-accent)] text-white hover:bg-[var(--drawing-line)] border-2 border-[var(--drawing-accent)] hover:border-[var(--drawing-line)]"
                        : "border-2 border-[var(--drawing-line)] text-[var(--drawing-line)] hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)]"
                    }`}
                  >
                    {t.cta}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 md:px-8 hatching">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Сравнение тарифов
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="stamp-table w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="text-left !text-xs !font-bold">Параметр</th>
                  <th className="text-center !text-xs !font-bold">3 мес.</th>
                  <th className="text-center !text-xs !font-bold border-x-[2.5px] border-[var(--drawing-accent)]">
                    Группа
                  </th>
                  <th className="text-center !text-xs !font-bold">Инд. мес.</th>
                  <th className="text-center !text-xs !font-bold">Экспресс</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="text-left !text-[10px] font-bold">{row.label}</td>
                    {row.values.map((val, vi) => (
                      <td
                        key={vi}
                        className={`text-center !text-[10px] ${vi === 1 ? "border-x-[2.5px] border-[var(--drawing-accent)]" : ""}`}
                      >
                        {renderCellValue(val)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="text-left !text-[10px]" />
                  {["Диагностика", "В группу", "Диагностика", "Экспресс"].map((label, ci) => (
                    <td key={ci} className={`text-center ${ci === 1 ? "border-x-[2.5px] border-[var(--drawing-accent)]" : ""}`}>
                      <Link
                        to="/contacts"
                        className="inline-block font-gost text-[9px] uppercase tracking-wider border border-[var(--drawing-line)] px-2 py-1 hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition-colors"
                      >
                        {label}
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Как выбрать тариф
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="stamp-table w-full min-w-[500px]">
              <thead>
                <tr>
                  <th className="text-left !text-xs !font-bold">Ваша ситуация</th>
                  <th className="text-left !text-xs !font-bold">Рекомендуемый тариф</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s, si) => (
                  <tr key={si}>
                    <td className="!text-[11px]">{s.situation}</td>
                    <td className="!text-[11px] font-bold text-[var(--drawing-accent)]">{s.tariff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 mt-4 max-w-xl">
            Не уверены? На бесплатной диагностике разберём вашу ситуацию и&nbsp;подберём формат вместе.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8 bg-[var(--drawing-paper)]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Регламент проверки материалов
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="drawing-frame p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">1</span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">Как сдать</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                    Google Docs, Word или PDF для текста. CAD&#8209;файлы (.cdw, .dwg, .step) для чертежей. Всё присылаете в&nbsp;Telegram наставнику.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">2</span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">Что проверяем</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                    Структура и логика изложения, корректность расчётов и размерных цепей, оформление по ЕСКД, ответы на замечания научрука.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">3</span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">Срок ответа</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                    До 48 часов в стандартном формате. В&nbsp;экспресс&#8209;тарифе&nbsp;&mdash; до&nbsp;12&nbsp;часов.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">4</span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">Лимиты</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                    До 30 страниц текста или 3 листов чертежей в&nbsp;неделю в&nbsp;рамках тарифа. Дополнительный объём&nbsp;&mdash; по&nbsp;согласованию.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 md:col-span-2">
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">5</span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">Формат фидбэка</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                    Комментарии в документе, план правок в отдельном файле, голосовые сообщения в&nbsp;Telegram для сложных моментов. По чертежам&nbsp;&mdash; пометки прямо на PDF или скриншотах.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Гарантии и ограничения
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-[1.5px] border-[var(--drawing-line)] p-6 md:p-8">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                Что мы гарантируем
              </div>
              <ul className="space-y-3">
                {[
                  "Проверку каждой итерации ваших материалов в оговорённые сроки",
                  "Развёрнутый фидбэк с конкретными рекомендациями по каждому разделу",
                  "Доступность наставника в чате 10:00–20:00 ежедневно",
                  "Работу по согласованному плану с дедлайнами",
                  "Подготовку к защите: презентация, репетиция, разбор вопросов",
                  "Честную оценку состояния работы и реалистичные ожидания",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                    <span className="mt-0.5 shrink-0 text-green-700">
                      <Icon name="Check" size={14} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <div className="border-[1.5px] border-[var(--drawing-line)] p-6 md:p-8">
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-4">
                  Чего мы НЕ гарантируем
                </div>
                <ul className="space-y-3">
                  {[
                    "Конкретную оценку на защите — это зависит от комиссии и вашей подготовки",
                    "Допуск к защите — решение принимает научный руководитель и кафедра",
                    "Результат без вашей работы — наставничество требует вашего участия",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                      <span className="mt-0.5 shrink-0 text-[var(--drawing-accent)]">
                        <Icon name="X" size={14} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-[1.5px] border-[var(--drawing-line)] p-6 md:p-8">
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                  Обязательства студента
                </div>
                <ul className="space-y-3">
                  {[
                    "Выполнять задания между встречами в согласованные сроки",
                    "Присылать материалы заблаговременно для проверки",
                    "Присутствовать на запланированных встречах",
                    "Самостоятельно писать текст, выполнять расчёты и чертежи",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                      <span className="w-3 h-[2px] bg-[var(--drawing-line)] mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="drawing-frame p-8 md:p-12 text-center">
            <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
              Не можете выбрать?
            </h2>
            <div className="extension-line-h w-32 mx-auto my-5" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-lg mx-auto mb-8">
              Запишитесь на бесплатную диагностику&nbsp;&mdash; разберём вашу ситуацию за 20&ndash;30 минут и&nbsp;подберём тариф вместе. Без обязательств.
            </p>
            <Link to="/contacts" className="btn-drawing btn-drawing-accent text-sm inline-block">
              Записаться на диагностику ВКР
            </Link>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 mt-4">
              Ответим в Telegram в течение 2 часов в рабочее время (10:00&ndash;20:00).
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Pricing;
