import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import useTariffs, { formatPriceWithCurrency } from "@/hooks/useTariffs";

const buildFaqGroups = (expressPrice: string, accompanyPrice: string) => [
  {
    title: "Этика и законность",
    marker: "Э",
    items: [
      {
        id: 1,
        q: "Вы пишете диплом за меня?",
        a: "Нет. Автор\u00A0\u2014 вы. Мы наставляем: объясняем методологию, проверяем вашу работу, разбираем ошибки, учим оформлять по стандартам и\u00A0помогаем подготовиться к\u00A0защите. Каждую строчку текста, каждый расчёт и\u00A0каждый чертёж вы делаете сами.",
      },
      {
        id: 2,
        q: "Это этично и законно?",
        a: "Да. Наставничество\u00A0\u2014 это обучение, а\u00A0не выполнение работы за студента. Репетиторство, консультации и\u00A0менторство\u00A0\u2014 стандартная практика в\u00A0образовании. Мы помогаем вам разобраться в\u00A0материале и\u00A0научиться. Академическая честность\u00A0\u2014 наш принцип.",
      },
      {
        id: 3,
        q: "Чем вы отличаетесь от «написания дипломов на заказ»?",
        a: "Принципиально. Мы не пишем, не делаем чертежи и\u00A0не считаем за вас. Мы учим вас это делать. Наша цель\u00A0\u2014 чтобы вы пришли на защиту, понимая каждый раздел. Это наставничество, а\u00A0не \u00ABуслуга написания\u00BB.",
      },
    ],
  },
  {
    title: "Процесс работы",
    marker: "П",
    items: [
      {
        id: 4,
        q: "Как проходят занятия?",
        a: "Смешанный формат. Онлайн\u00A0\u2014 созвоны для планирования, разборов, вопросов. Офлайн\u00A0\u2014 встречи в\u00A0Екатеринбурге для работы с\u00A0материалами: чертежи, файлы, замечания. Офлайн\u2011встреча\u00A0\u2014 после предварительной подготовки.",
      },
      {
        id: 5,
        q: "Будут ли офлайн-встречи?",
        a: "Да. Они полезны для работы с\u00A0чертежами и\u00A0КД. Встреча назначается после подготовки материалов. Место и\u00A0время согласуются с\u00A0наставником.",
      },
      {
        id: 6,
        q: "Что происходит между занятиями?",
        a: "Вы работаете по плану: пишете, считаете, чертите. Готовые материалы сдаёте наставнику. Наставник проверяет и\u00A0даёт комментарии. Вопросы\u00A0\u2014 в\u00A0чат (10:00\u201320:00). На следующем занятии\u00A0\u2014 разбор результатов.",
      },
      {
        id: 7,
        q: "В каких CAD-программах работаете?",
        a: "КОМПАС\u20113D, SolidWorks, AutoCAD. Мы не делаем чертежи за вас, но проверяем работу, объясняем ошибки по ЕСКД и\u00A0помогаем разобраться в\u00A0инструментах.",
      },
    ],
  },
  {
    title: "Ситуации и сроки",
    marker: "С",
    items: [
      {
        id: 8,
        q: "Если уже утверждена тема — можно менять?",
        a: "Мы не меняем тему, но можем помочь уточнить формулировку или скорректировать фокус в\u00A0рамках задания. Решение о\u00A0смене\u00A0\u2014 за вами и\u00A0научным руководителем.",
      },
      {
        id: 9,
        q: "Если много замечаний и не допускают?",
        a: "Частая ситуация. Разберём каждое замечание: объясним суть, покажем, что исправить. Вы переделаете\u00A0\u2014 мы проверим. Есть формат \u00ABЭкспресс 3\u00A0дня\u00BB. Не можем гарантировать допуск, но делаем максимум.",
      },
      {
        id: 10,
        q: "Если времени мало (неделя / несколько дней)?",
        a: "Есть тариф \u00ABЭкспресс 3\u00A0дня\u00BB\u00A0\u2014 3\u00A0интенсивных занятия. За 3\u00A0дня не переделать с\u00A0нуля, но: разобрать замечания, привести в\u00A0порядок логику, подготовить к\u00A0защите. Чем раньше обратитесь\u00A0\u2014 тем больше успеем.",
      },
      {
        id: 11,
        q: "Работаете только с бакалаврами или с магистрами тоже?",
        a: "С обоими. Магистерская сложнее: глубже расчёты, больше требований к\u00A0обоснованию. Наставники имеют опыт и\u00A0с\u00A0бакалавриатом, и\u00A0с\u00A0магистратурой по направлению \u00ABКонструирование\u00BB.",
      },
    ],
  },
  {
    title: "Тарифы и оплата",
    marker: "Т",
    items: [
      {
        id: 12,
        q: "Сколько стоит?",
        a: `Четыре тарифа: от ${expressPrice} (экспресс 3\u00A0дня) до ${accompanyPrice} (сопровождение 3\u00A0месяца). Подробности\u00A0\u2014 на странице тарифов. Итоговая стоимость фиксируется на диагностике.`,
      },
      {
        id: 13,
        q: "Можно оплатить частями?",
        a: "Для тарифа \u00AB3\u00A0месяца\u00BB возможна помесячная оплата. Детали обсуждаются при согласовании.",
      },
      {
        id: 14,
        q: "Какие гарантии?",
        a: "Гарантируем работу с\u00A0практикующим инженером, проверку в\u00A0оговорённые сроки, развёрнутую обратную связь. НЕ гарантируем оценку\u00A0\u2014 решение за комиссией. Если наставник не выполнил обязательства\u00A0\u2014 возврат средств.",
      },
    ],
  },
  {
    title: "Проверка и обратная связь",
    marker: "О",
    items: [
      {
        id: 15,
        q: "Что именно проверяете?",
        a: "Структуру и\u00A0логику глав, формулировки (цель/задачи/объект/предмет), связность расчётов с\u00A0конструкцией и\u00A0текстом, оформление по ЕСКД/ГОСТ/требованиям кафедры, ответы на замечания научрука. Это проверка с\u00A0обучением, не просто \u00ABправильно/неправильно\u00BB.",
      },
      {
        id: 16,
        q: "Как быстро проверяете?",
        a: "В течение 48 часов в\u00A0рабочее время (10:00\u201320:00). Лимит по объёму зависит от тарифа.",
      },
      {
        id: 17,
        q: "Проверяете ли чертежи?",
        a: "Да. Проверяем оформление по ЕСКД (виды, разрезы, размеры, штампы, спецификации), находим ошибки и\u00A0объясняем. Не делаем чертежи за вас\u00A0\u2014 учим правильно оформлять.",
      },
    ],
  },
  {
    title: "Разное",
    marker: "Р",
    items: [
      {
        id: 18,
        q: "Только для УрФУ?",
        a: "Основная специализация\u00A0\u2014 УрФУ, направление \u00ABКонструирование\u00BB (машиностроение). Наставники знают требования кафедр. Если из другого вуза Екатеринбурга с\u00A0похожим направлением\u00A0\u2014 обсудим на диагностике.",
      },
      {
        id: 19,
        q: "Если нужна помощь только с одним разделом?",
        a: "Можно. На диагностике определим, что нужно, и\u00A0подберём тариф. Не обязательно проходить всю программу.",
      },
      {
        id: 20,
        q: "Даёте шаблоны и образцы?",
        a: "Даём рекомендации по структуре и\u00A0оформлению, показываем примеры (в\u00A0рамках обучения). Не раздаём чужие работы и\u00A0не предоставляем \u00ABготовые шаблоны для копирования\u00BB. Задача\u00A0\u2014 научить вас делать свою работу.",
      },
    ],
  },
];

const Faq = () => {
  const [openId, setOpenId] = useState<number | null>(null);
  const { tariffs } = useTariffs();

  const expressTariff = tariffs.find((t) => t.slug === "express-3d");
  const accompanyTariff = tariffs.find((t) => t.slug === "accompany-3m");

  const expressPrice = expressTariff ? formatPriceWithCurrency(expressTariff) : "уточняется";
  const accompanyPrice = accompanyTariff ? formatPriceWithCurrency(accompanyTariff) : "уточняется";

  const faqGroups = buildFaqGroups(expressPrice, accompanyPrice);

  const toggle = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">Е1</div>
          <div className="zone-marker top-2 right-3">Зона VI</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Часто задаваемые вопросы&nbsp;&middot; ДИПЛОМ.ИНЖ
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Вопросы
            <br />
            и&nbsp;<span className="text-[var(--drawing-accent)]">ответы</span>
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            20 ответов на самые частые вопросы о&nbsp;наставничестве по дипломному проекту.
          </p>
        </div>
      </section>

      <section className="pb-8 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="flex flex-wrap gap-2">
          {faqGroups.map((group) => (
            <a
              key={group.marker}
              href={`#faq-${group.marker}`}
              className="font-gost text-[10px] border border-[var(--drawing-line)] px-2.5 py-1 hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition-colors"
            >
              {group.title}
            </a>
          ))}
        </div>
        <div className="extension-line-h w-full mt-4" />
      </section>

      <section className="px-4 md:px-8 max-w-[1200px] mx-auto space-y-10 pb-16">
        {faqGroups.map((group, gi) => (
          <div
            key={group.marker}
            id={`faq-${group.marker}`}
            className={`drawing-frame p-6 md:p-8 relative ${gi % 2 === 1 ? "hatching" : ""}`}
          >
            <div className="zone-marker top-2 right-3">{group.marker}</div>

            <h2 className="section-callout font-gost-upright text-xl md:text-2xl font-bold tracking-tight mb-2">
              {group.title}
            </h2>
            <div className="extension-line-h w-32 mb-6" />

            <div className="space-y-0">
              {group.items.map((item, ii) => (
                <div
                  key={item.id}
                  className={`${ii < group.items.length - 1 ? "border-b-[1.5px] border-[var(--drawing-line)]" : ""}`}
                >
                  <button
                    className="w-full flex items-start justify-between py-4 text-left gap-4 group"
                    onClick={() => toggle(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-gost-upright text-xs font-bold text-[var(--drawing-accent)] mt-0.5 shrink-0 w-5 text-right">
                        {item.id}.
                      </span>
                      <span className="font-gost text-sm text-[var(--drawing-line)] group-hover:text-[var(--drawing-accent)] transition-colors">
                        {item.q}
                      </span>
                    </div>
                    <span className="shrink-0 text-[var(--drawing-line-thin)] mt-0.5">
                      <Icon name={openId === item.id ? "ChevronUp" : "ChevronDown"} size={16} />
                    </span>
                  </button>
                  {openId === item.id && (
                    <div className="pb-5 pl-8">
                      <p className="font-gost text-xs md:text-sm text-[var(--drawing-line-thin)] leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="py-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="drawing-frame p-8 md:p-12 text-center">
            <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
              Остались вопросы?
            </h2>
            <div className="extension-line-h w-32 mx-auto my-5" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-lg mx-auto mb-8">
              Запишитесь на бесплатную диагностику&nbsp;&mdash; ответим на все вопросы, разберём вашу ситуацию и&nbsp;подберём формат работы. 20&ndash;30 минут, без обязательств.
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

export default Faq;