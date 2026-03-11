import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const cases = [
  {
    num: 1,
    title: "Не понимал замечания — рисковал не попасть на защиту",
    situation:
      "Студент обратился за 2 недели до защиты. Научрук оставил 12 замечаний к ПЗ и чертежам: расчёты не совпадали с конструкцией, размерные цепи не замкнуты, спецификация не соответствовала сборочному чертежу. Студент не понимал, что конкретно исправлять, и рисковал не получить допуск.",
    actions: [
      "Провели 3 интенсивных встречи за 5 дней (экспресс-формат)",
      "Разобрали каждое замечание: выяснили, что в расчёте была ошибка в схеме нагружения — балка защемлена, а считалась как шарнирная опора",
      "Объяснили методику расчёта, студент пересчитал самостоятельно и исправил чертежи",
      "Привели спецификацию в соответствие со сборочным чертежом по ГОСТ 2.106",
      "Собрали презентацию, провели репетицию с разбором типовых вопросов комиссии",
    ],
    result:
      "Все 12 замечаний закрыты, научрук подписал допуск. Студент защитился на «хорошо». Главное — на защите он понимал материал и уверенно отвечал на вопросы о выборе расчётной схемы и материала.",
    tariff: "Экспресс 3 дня",
    duration: "5 дней",
  },
  {
    num: 2,
    title: "Тема утверждена, но не знал с чего начать",
    situation:
      "Студент 4-го курса, направление «Технология машиностроения». Тема утверждена 2 месяца назад, задание на проектирование получено, но ни одной страницы не написано. Не понимал структуру ПЗ, не знал, с какого раздела начать, терял время на бесполезный поиск информации.",
    actions: [
      "На диагностике разобрали задание: определили объект проектирования, выделили ключевые разделы",
      "Составили план на 3 месяца с недельными чекпоинтами и дедлайнами по каждой главе",
      "Еженедельные встречи: разбор текущего раздела, проверка написанного, постановка задач на неделю",
      "Параллельно вели работу над чертежами — студент осваивал КОМПАС-3D с нашими рекомендациями",
    ],
    result:
      "Через 3 месяца — готовая ПЗ на 78 страниц, комплект из 5 листов КД, закрытые замечания научрука (было всего 3 — мелкие). Студент вышел на защиту подготовленным и защитился уверенно.",
    tariff: "Сопровождение 3 мес.",
    duration: "3 месяца",
  },
  {
    num: 3,
    title: "Чертежи не по ЕСКД — научрук не принимает",
    situation:
      "Студент сделал 3D-модель в КОМПАС-3D и получил ассоциативные чертежи, но научрук отказался принимать: грубые ошибки в оформлении. Основная надпись заполнена неверно, размеры не по ГОСТ 2.307, отсутствуют технические требования, шероховатости указаны произвольно, вид слева назван «Вид А».",
    actions: [
      "Провели аудит всех 6 листов: составили таблицу нарушений с указанием конкретных ГОСТ (2.301, 2.307, 2.104, 2.309)",
      "Объяснили логику ЕСКД: почему размеры ставятся так, что означает шероховатость, как выбирать допуски по функции поверхности",
      "Студент исправлял чертежи сам — мы проверяли каждую итерацию в течение 24 часов",
      "Отдельно разобрали заполнение спецификации и основной надписи",
    ],
    result:
      "Через 3 недели и 4 итерации проверок все чертежи приведены к стандартам ЕСКД. Научрук принял комплект КД без дополнительных замечаний. Студент сказал, что впервые понял, зачем нужна система допусков и посадок.",
    tariff: "Индивидуальный месяц",
    duration: "3 недели",
  },
  {
    num: 4,
    title: "Расчёты не сходятся с конструкцией",
    situation:
      "Магистрант, тема связана с проектированием редуктора. Научрук указал, что размеры валов в расчёте не совпадают с чертежами, подшипники выбраны без проверки по динамической грузоподъёмности, а момент на выходном валу отличается от требуемого по ТЗ. Студент запутался и не понимал, где начало ошибки.",
    actions: [
      "Начали с конструкции: восстановили кинематическую схему, проверили передаточные числа ступеней",
      "Нашли систематическую ошибку: неправильно определён КПД цепи — не учтены потери в подшипниках, итоговый момент на выходе занижен на 15%",
      "Объяснили методику: от требуемого момента на выходе — назад по цепи к двигателю, а не наоборот",
      "Студент пересчитал всю кинематику, подобрал подшипники по каталогу SKF с проверкой ресурса",
    ],
    result:
      "Расчёты и конструкция стали согласованными. Все размеры в ПЗ совпадают с чертежами. Научрук отметил, что работа стала значительно сильнее. Студент защитился на «отлично».",
    tariff: "Индивидуальный месяц",
    duration: "4 недели",
  },
  {
    num: 5,
    title: "Нужна была только подготовка к защите",
    situation:
      "Работа полностью готова, научрук подписал, нормоконтроль пройден. Но студент паниковал: не мог внятно объяснить, почему выбрал именно этот материал (Сталь 40Х), почему такая схема базирования, зачем нужна термообработка. Боялся вопросов комиссии.",
    actions: [
      "Провели 2 встречи: на первой прошлись по всем ключевым решениям в работе — конструкция, расчёты, технология",
      "Составили список из 15 типовых вопросов комиссии по этой специализации",
      "На второй встрече — репетиция: студент докладывал, мы задавали жёсткие вопросы и разбирали ответы",
      "Отдельно отработали ответы на «почему Сталь 40Х, а не 45?» и «что будет, если изменить схему нагружения?»",
    ],
    result:
      "Студент вышел на защиту спокойным. Ответил на все вопросы комиссии, в том числе на неожиданный вопрос о влиянии термообработки на усталостную прочность. Оценка — «отлично».",
    tariff: "Экспресс 3 дня",
    duration: "3 дня (2 встречи)",
  },
  {
    num: 6,
    title: "Групповой формат — бюджет ограничен",
    situation:
      "Четверо студентов из одной группы, направление «Детали машин». До защиты — 1.5 месяца. Темы разные (редуктор, приспособление, пресс, транспортёр), но проблемы типовые: структура ПЗ, оформление чертежей, расчёты. Бюджет у каждого ограничен.",
    actions: [
      "Сформировали группу из 4 человек: 4 групповых занятия по 90 минут + общий чат",
      "Общие темы разбирали вместе: структура ПЗ, оформление по ЕСКД, типовые ошибки в расчётах",
      "Индивидуальные вопросы — по очереди на занятии + в чате между встречами",
      "Каждый получил проверку ключевых разделов своей работы (до 15 стр./нед.)",
    ],
    result:
      "Все четверо допущены к защите и защитились: два «хорошо» и два «удовлетворительно» (у них был минимальный запас по времени). Бонус: студенты учились на ошибках друг друга — кто-то увидел свою проблему в чужом чертеже раньше, чем наставник указал.",
    tariff: "Групповой месяц",
    duration: "1.5 месяца",
  },
  {
    num: 7,
    title: "Перевёлся — не хватало базы по конструированию",
    situation:
      "Студент перевёлся из другого вуза на 4-й курс. Базовые дисциплины (детали машин, теория механизмов, материаловедение) были сданы, но знаний не хватало: не понимал логику выбора посадок, не умел читать чертежи, путал допуски размера и формы.",
    actions: [
      "Начали с основ: объяснили систему допусков и посадок, логику ЕСКД, принципы конструирования",
      "Параллельно вели работу над дипломом: каждый раздел ПЗ становился поводом разобрать теорию",
      "Работа с КД: от простых деталей к сборочному чертежу — нарастающая сложность",
      "3 месяца сопровождения с еженедельными встречами и проверкой материалов",
    ],
    result:
      "Студент не просто защитился — он начал понимать инженерную логику. На защите объяснил выбор посадки H7/k6 для подшипника и обосновал шероховатость Ra 1.6 для посадочной поверхности. Комиссия отметила хорошее владение материалом.",
    tariff: "Сопровождение 3 мес.",
    duration: "3 месяца",
  },
];

const Cases = () => {
  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">Г1</div>
          <div className="zone-marker top-2 right-3">Зона IV</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Кейсы студентов&nbsp;&middot; ДИПЛОМ.ИНЖ
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Кейсы наших
            <br />
            <span className="text-[var(--drawing-accent)]">студентов</span>
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed mb-3">
            Реальные истории (обезличенные). Каждый кейс&nbsp;&mdash; ситуация, с&nbsp;которой пришёл студент, что мы делали как наставники и&nbsp;каков результат.
          </p>
          <p className="font-gost text-xs text-[var(--drawing-accent)] max-w-xl">
            Мы не пишем дипломы&nbsp;&mdash; мы учим их делать.
          </p>
        </div>
      </section>

      <section className="px-4 md:px-8 max-w-[1200px] mx-auto space-y-10 pb-16">
        {cases.map((c, i) => (
          <div
            key={c.num}
            id={`case-${c.num}`}
            className={`drawing-frame p-6 md:p-8 relative ${i % 2 === 1 ? "hatching" : ""}`}
          >
            <div className="zone-marker top-2 right-3">K{c.num}</div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
              <span className="shrink-0 inline-flex items-center justify-center w-auto px-3 h-7 border-[2px] border-[var(--drawing-accent)] font-gost-upright text-xs font-bold text-[var(--drawing-accent)]">
                Кейс {c.num}
              </span>
              <div className="flex-1">
                <h3 className="font-gost-upright text-lg md:text-xl font-bold tracking-tight text-[var(--drawing-line)] leading-snug">
                  &laquo;{c.title}&raquo;
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <span className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
                    Тариф: <span className="font-bold text-[var(--drawing-line)]">{c.tariff}</span>
                  </span>
                  <span className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
                    Срок: <span className="font-bold text-[var(--drawing-line)]">{c.duration}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-0">
              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[var(--drawing-line-thin)]">
                    <Icon name="CalendarDays" size={16} />
                  </span>
                  <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                    Ситуация
                  </span>
                </div>
                <p className="font-gost text-xs md:text-sm text-[var(--drawing-line)] leading-relaxed pl-6">
                  {c.situation}
                </p>
              </div>

              <div className="extension-line-h w-full" />

              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[var(--drawing-line-thin)]">
                    <Icon name="Wrench" size={16} />
                  </span>
                  <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                    Что делали (наставничество)
                  </span>
                </div>
                <ul className="space-y-2 pl-6">
                  {c.actions.map((a, ai) => (
                    <li key={ai} className="flex items-start gap-2.5 font-gost text-xs md:text-sm text-[var(--drawing-line)] leading-relaxed">
                      <span className="w-3.5 h-[2px] bg-[var(--drawing-accent)] mt-2 shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="extension-line-h w-full" />

              <div className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[var(--drawing-accent)]">
                    <Icon name="Award" size={16} />
                  </span>
                  <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)]">
                    Результат
                  </span>
                </div>
                <p className="font-gost text-xs md:text-sm text-[var(--drawing-line)] leading-relaxed pl-6">
                  {c.result}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="py-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="drawing-frame p-8 md:p-12 text-center">
            <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
              У вас похожая ситуация?
            </h2>
            <div className="extension-line-h w-32 mx-auto my-5" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-lg mx-auto mb-8">
              Запишитесь на бесплатную диагностику&nbsp;&mdash; разберём ваш случай за 20&ndash;30 минут и&nbsp;предложим план действий.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contacts" className="btn-drawing btn-drawing-accent text-sm">
                Записаться на диагностику
              </Link>
              <Link to="/pricing" className="btn-drawing text-sm">
                Посмотреть тарифы&nbsp;&rarr;
              </Link>
            </div>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 mt-4">
              Ответим в Telegram в течение 2 часов в рабочее время (10:00&ndash;20:00).
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Cases;
