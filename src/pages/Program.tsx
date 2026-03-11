import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const modules = [
  {
    num: "01",
    title: "Тема и задание на проектирование",
    result: "Чёткая формулировка темы, заполненное задание на проектирование, календарный план работы.",
    tasks: [
      "Анализируем формулировку темы: соответствие специальности, наличие объекта и предмета проектирования",
      "Заполняем бланк задания совместно — цель, задачи, исходные данные, ожидаемые результаты",
      "Составляем пошаговый план с дедлайнами по каждому разделу ПЗ и чертежам",
      "Определяем перечень необходимой конструкторской документации",
    ],
    mistakes: [
      "Слишком широкая или абстрактная тема без конкретного объекта проектирования",
      "Задание заполнено формально — цели не соответствуют содержанию работы",
      "Отсутствие плана приводит к хаотичной работе и срыву сроков",
    ],
    artifacts: "Задание на проектирование, календарный план, список источников для обзора",
  },
  {
    num: "02",
    title: "Обзор литературы и аналитическая часть",
    result: "Структурированный обзор с анализом аналогов, патентов и обоснованием выбранного направления.",
    tasks: [
      "Подбираем источники: учебники, статьи, патенты, каталоги оборудования и материалов",
      "Выстраиваем логику обзора — от общего к частному, от проблемы к решению",
      "Анализируем существующие конструкции-аналоги, сравниваем параметры в таблице",
      "Формулируем выводы обзора и обоснование выбранного технического решения",
    ],
    mistakes: [
      "Копирование абзацев из учебников без анализа и собственных выводов",
      "Обзор не связан с темой — описание общих принципов вместо анализа аналогов",
      "Отсутствие сравнительной таблицы конструкций и критериев выбора",
    ],
    artifacts: "Глава 1 ПЗ (15–25 стр.), сравнительная таблица аналогов, список литературы (ГОСТ 7.1)",
  },
  {
    num: "03",
    title: "Конструкторская часть — проектное решение",
    result: "Обоснованное конструкторское решение: компоновка, эскизы, выбор материалов и комплектующих.",
    tasks: [
      "Разрабатываем компоновочную схему изделия / узла / приспособления",
      "Обосновываем выбор материалов: марка стали, термообработка, покрытие — со ссылками на ГОСТ",
      "Выбираем стандартные комплектующие: подшипники, крепёж, уплотнения — по каталогам",
      "Прорабатываем конструктивные элементы: посадки, допуски, шероховатости",
    ],
    mistakes: [
      "Материал выбран без обоснования — нет ссылки на условия работы и нагрузки",
      "Компоновка не проработана: детали пересекаются, невозможна сборка или обслуживание",
      "Стандартные изделия указаны без полного обозначения и ссылки на ГОСТ",
    ],
    artifacts: "Глава 2 ПЗ, компоновочный эскиз, ведомость материалов, обоснование выбора комплектующих",
  },
  {
    num: "04",
    title: "Расчётная часть",
    result: "Корректные расчёты с формулами, подстановкой числовых значений и проверкой единиц измерения.",
    tasks: [
      "Определяем перечень расчётов: прочностные, кинематические, энергетические, тепловые",
      "Проверяем методику: выбор расчётной схемы, граничные условия, коэффициенты запаса",
      "Контролируем размерность — единицы СИ, согласованность между формулами",
      "Оформляем расчёты по стандарту: номер формулы, расшифровка обозначений, результат с единицами",
    ],
    mistakes: [
      "Формулы без подстановки числовых значений — только буквенная запись и сразу ответ",
      "Несогласованные единицы: Н и кН в одной формуле, мм и м без пересчёта",
      "Расчётная схема не соответствует реальной конструкции — неверные опоры, нагрузки",
    ],
    artifacts: "Расчётный раздел ПЗ, проверочные расчёты, таблица результатов с запасами прочности",
  },
  {
    num: "05",
    title: "Конструкторская документация (CAD / ЕСКД)",
    result: "Комплект чертежей по ЕСКД: сборочный, деталировка, спецификация — готовые к нормоконтролю.",
    tasks: [
      "Проверяем сборочный чертёж: разрезы, сечения, позиции, размеры сопряжений, технические требования",
      "Проверяем рабочие чертежи деталей: размерные цепи, допуски, шероховатости, базы",
      "Заполняем спецификацию по ГОСТ 2.106: разделы, обозначения, форматы",
      "Проверяем основную надпись (штамп), масштаб, форматы листов по ГОСТ 2.301",
    ],
    mistakes: [
      "Размеры на чертеже не образуют замкнутую цепь — невозможно изготовить деталь",
      "Шероховатость и допуски указаны формально, не соответствуют функции поверхности",
      "Спецификация не совпадает с позициями на сборочном чертеже",
    ],
    artifacts: "Сборочный чертёж, 3–6 рабочих чертежей деталей, спецификация, ведомость чертежей",
  },
  {
    num: "06",
    title: "Технологическая часть",
    result: "Маршрутная технология изготовления детали, выбор оборудования и инструмента, расчёт режимов резания.",
    tasks: [
      "Анализируем технологичность конструкции: доступность обработки, базирование, жёсткость",
      "Составляем маршрут обработки: заготовка → операции → контроль",
      "Выбираем станки, приспособления, режущий и мерительный инструмент",
      "Рассчитываем режимы резания и нормы времени для 2–3 операций",
    ],
    mistakes: [
      "Маршрут не учитывает реальную последовательность — чистовая обработка до термообработки",
      "Режимы резания выбраны из справочника без привязки к конкретному станку и инструменту",
      "Отсутствует схема базирования и закрепления заготовки",
    ],
    artifacts: "Технологический раздел ПЗ, маршрутная карта, расчёт режимов резания, операционные эскизы",
  },
  {
    num: "07",
    title: "Экономическая часть и охрана труда",
    result: "Закрытые разделы с расчётами себестоимости, экономической эффективности и мероприятиями по ОТ.",
    tasks: [
      "Рассчитываем себестоимость изготовления детали / узла: материалы, зарплата, накладные",
      "Оцениваем экономический эффект от внедрения проектного решения",
      "Описываем мероприятия по охране труда: вредные факторы, СИЗ, требования к рабочему месту",
      "Оформляем расчёты в таблицы с указанием источников нормативов",
    ],
    mistakes: [
      "Экономический расчёт скопирован из методички без подстановки своих данных",
      "Раздел ОТ написан общими словами без привязки к конкретному технологическому процессу",
      "Отсутствуют ссылки на тарифные ставки, нормативы амортизации, цены материалов",
    ],
    artifacts: "Экономический раздел ПЗ, калькуляция себестоимости, раздел по ОТ и экологии",
  },
  {
    num: "08",
    title: "Оформление пояснительной записки",
    result: "Пояснительная записка, оформленная по ГОСТ 2.105 и требованиям кафедры, готовая к нормоконтролю.",
    tasks: [
      "Проверяем структуру ПЗ: титульный лист, задание, содержание, введение, главы, заключение, список литературы",
      "Выверяем оформление: шрифт, поля, нумерация страниц, заголовки, подписи к рисункам и таблицам",
      "Проверяем перекрёстные ссылки: формулы, таблицы, рисунки, приложения, литература",
      "Приводим список литературы к ГОСТ 7.1, проверяем наличие ссылок в тексте",
    ],
    mistakes: [
      "Нумерация рисунков и таблиц сквозная вместо поглавной (или наоборот — зависит от кафедры)",
      "Ссылки на литературу в тексте отсутствуют или не совпадают со списком",
      "Содержание не обновлено после правок — номера страниц не совпадают",
    ],
    artifacts: "Готовая ПЗ (60–100 стр.), проверенная на соответствие ГОСТ и требованиям кафедры",
  },
  {
    num: "09",
    title: "Подготовка к защите",
    result: "Презентация на 10–12 слайдов, отработанное выступление на 7–10 минут, навык ответов на вопросы комиссии.",
    tasks: [
      "Структурируем доклад: проблема → цель → решение → результаты → выводы",
      "Создаём презентацию: ключевые чертежи, схемы, таблицы результатов — минимум текста",
      "Репетируем выступление: тайминг, интонация, переходы между слайдами",
      "Разбираем типовые вопросы комиссии и готовим лаконичные ответы",
    ],
    mistakes: [
      "Презентация — это уменьшенные страницы ПЗ с мелким текстом вместо схем и графиков",
      "Студент читает текст со слайда вместо свободного рассказа",
      "Нет ответов на базовые вопросы: почему выбран этот материал, этот метод обработки",
    ],
    artifacts: "Презентация (.pptx), тезисы доклада, список типовых вопросов с ответами",
  },
  {
    num: "10",
    title: "CAE — компьютерное моделирование",
    result: "Корректная постановка задачи в CAE-системе, результаты моделирования с интерпретацией.",
    tasks: [
      "Определяем цель моделирования: какую гипотезу проверяем, какой результат нужен",
      "Проверяем постановку: граничные условия, нагрузки, свойства материала, тип сетки",
      "Анализируем результаты: распределение напряжений, деформации, запас прочности",
      "Оформляем раздел: постановка, параметры, результаты, сравнение с аналитическим расчётом",
    ],
    mistakes: [
      "Модель запущена «как есть» без проверки сетки, сходимости и граничных условий",
      "Результат CAE не сопоставлен с аналитическим расчётом — нет валидации",
      "Скриншоты вставлены без подписей, легенды обрезаны, единицы не указаны",
    ],
    artifacts: "Раздел ПЗ по моделированию, скриншоты с легендами, таблица сравнения с расчётом",
    optional: true,
  },
];

const Program = () => {
  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">Б1</div>
          <div className="zone-marker top-2 right-3">Зона II</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Содержание программы&nbsp;&middot; ДИПЛОМ.ИНЖ
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Программа наставничества
            <br />
            <span className="text-[var(--drawing-accent)]">по дипломному проекту</span>
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed mb-4">
            Программа адаптируется под вашу тему, специализацию и&nbsp;текущий этап работы. Ниже&nbsp;&mdash; типовые модули для направления &laquo;Конструирование&raquo;. На&nbsp;диагностике определим, какие модули актуальны для&nbsp;вас.
          </p>

          <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 max-w-xl">
            10 модулей&nbsp;&middot; Адаптивная последовательность&nbsp;&middot; Машиностроение / Конструирование&nbsp;&middot; УрФУ
          </p>
        </div>
      </section>

      <section className="pb-8 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="flex flex-wrap gap-2 mb-2">
          {modules.map((m) => (
            <a
              key={m.num}
              href={`#module-${m.num}`}
              className="font-gost text-[10px] border border-[var(--drawing-line)] px-2.5 py-1 hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition-colors"
            >
              {m.num}. {m.title.length > 28 ? m.title.slice(0, 28) + "..." : m.title}
            </a>
          ))}
        </div>
        <div className="extension-line-h w-full" />
      </section>

      <section className="px-4 md:px-8 max-w-[1200px] mx-auto space-y-10 pb-16">
        {modules.map((m, i) => (
          <div
            key={m.num}
            id={`module-${m.num}`}
            className={`drawing-frame p-6 md:p-8 relative ${i % 2 === 1 ? "hatching" : ""}`}
          >
            <div className="zone-marker top-2 right-3">
              {m.optional ? "опц." : `М${m.num}`}
            </div>

            <div className="flex items-start gap-4 md:gap-6 mb-6">
              <span className="font-gost-upright text-5xl md:text-6xl font-bold text-[var(--drawing-line)] opacity-10 leading-none shrink-0 select-none">
                {m.num}
              </span>
              <div className="pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-gost-upright text-xl md:text-2xl font-bold tracking-tight text-[var(--drawing-line)]">
                    {m.title}
                  </h3>
                  {m.optional && (
                    <span className="font-gost text-[9px] uppercase tracking-widest text-[var(--drawing-accent)] border border-[var(--drawing-accent)] px-2 py-0.5">
                      опционально
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 border-l-[3px] border-[var(--drawing-accent)] bg-[rgba(192,57,43,0.04)]">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-1">
                Результат модуля
              </div>
              <p className="font-gost text-sm text-[var(--drawing-line)] leading-relaxed">
                {m.result}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
                  Что делаем
                </div>
                <ul className="space-y-2.5">
                  {m.tasks.map((t, ti) => (
                    <li key={ti} className="flex items-start gap-2.5 font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                      <span className="w-3.5 h-[2px] bg-[var(--drawing-accent)] mt-2 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
                  Типовые ошибки
                </div>
                <ul className="space-y-2.5">
                  {m.mistakes.map((e, ei) => (
                    <li key={ei} className="flex items-start gap-2.5 font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                      <span className="mt-0.5 shrink-0 text-[var(--drawing-accent)]">
                        <Icon name="AlertTriangle" size={12} />
                      </span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="extension-line-h w-full mb-4" />
            <div className="flex items-start gap-2">
              <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] shrink-0 mt-0.5">
                Артефакты:
              </span>
              <p className="font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                {m.artifacts}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="py-16 px-4 md:px-8 bg-[var(--drawing-paper)]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Как мы проверяем ваши материалы
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
                    До 48 часов на проверку в&nbsp;стандартном формате. В&nbsp;экспресс&#8209;тарифе&nbsp;&mdash; до&nbsp;12&nbsp;часов.
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

      <section className="py-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="drawing-frame p-8 md:p-12 text-center">
            <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
              Записаться на диагностику
            </h2>
            <div className="extension-line-h w-32 mx-auto my-5" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-lg mx-auto mb-8">
              Определим, какие модули нужны именно вам. Разберём тему, план или черновик за 20&ndash;30 минут&nbsp;&mdash; бесплатно и без обязательств.
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

export default Program;
