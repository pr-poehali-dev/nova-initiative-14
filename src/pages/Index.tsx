import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const faqData = [
  {
    q: "Вы пишете диплом за меня?",
    a: "Нет. Мы не пишем текст, не делаем чертежи и не выполняем расчёты за студента. Мы обучаем методологии, помогаем выстроить логику, проверяем ваши материалы и готовим к защите. Автор работы — вы.",
  },
  {
    q: "Это этично?",
    a: "Да. Наставничество — это образовательная услуга. Мы работаем как репетитор или научный консультант: объясняем, направляем, проверяем. Вы выполняете работу самостоятельно и несёте за неё ответственность.",
  },
  {
    q: "Что если до защиты осталось мало времени?",
    a: "Мы оценим объём на диагностике и честно скажем, что реально успеть. Есть экспресс-формат на 3 дня для критических ситуаций. Но чем раньше вы обратитесь — тем лучше результат.",
  },
  {
    q: "Что если научрук оставил замечания?",
    a: "Разберём каждое замечание, объясним, что именно требуется исправить, и поможем сформулировать ответ. Проверим исправленную версию перед повторной сдачей.",
  },
  {
    q: "Сколько стоит?",
    a: "Зависит от формата: от экспресс-разбора за 3 дня до полного сопровождения на 3 месяца. Итоговая стоимость фиксируется после диагностики, когда мы понимаем объём работы.",
  },
  {
    q: "Как проходят занятия?",
    a: "Индивидуальные встречи по видеосвязи или в Telegram. Вы присылаете материалы — мы проверяем и разбираем на встрече. Между встречами доступна переписка с наставником.",
  },
];

const Index = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">A1</div>
          <div className="zone-marker top-2 right-3">Зона I</div>
          <div className="zone-marker bottom-2 left-3">A2</div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
            <div className="md:col-span-7">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
                Наставничество по дипломному проекту&nbsp;&middot; УрФУ&nbsp;&middot; Машиностроение
              </div>
              <div className="extension-line-h w-full mb-6" />

              <h1 className="font-gost-upright text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
                Доведём ваш
                <br />
                диплом до
                <br />
                <span className="text-[var(--drawing-accent)]">осознанной</span>
                <br />
                защиты
              </h1>

              <div className="extension-line-h w-3/4 my-5" />

              <p className="font-gost text-sm md:text-base max-w-lg text-[var(--drawing-line-thin)] leading-relaxed mb-8">
                Практикующие инженеры&#8209;конструкторы Екатеринбурга помогут разобраться в&nbsp;материале, закрыть замечания научрука и&nbsp;подготовиться к&nbsp;комиссии. Вы&nbsp;&mdash;&nbsp;автор. Мы&nbsp;&mdash;&nbsp;наставники.
              </p>

              <div className="flex flex-wrap gap-4 mb-4">
                <Link to="/contacts" className="btn-drawing btn-drawing-accent text-xs">
                  Записаться на диагностику ВКР
                </Link>
                <Link to="/program" className="btn-drawing text-xs">
                  Посмотреть программу&nbsp;&rarr;
                </Link>
              </div>
              <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 max-w-md">
                Без обязательств. Разберём ваш план или черновик и&nbsp;подскажем следующие шаги.
              </p>
            </div>

            <div className="md:col-span-5 flex items-center justify-center">
              <div className="relative w-full aspect-square border-[2px] border-[var(--drawing-line)] hatching-blue flex items-end p-6">
                <div className="absolute top-0 bottom-0 left-1/2 extension-line-v" />
                <div className="absolute left-0 right-0 top-1/2 extension-line-h" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] aspect-square rounded-full border-[2px] border-[var(--drawing-line)]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] aspect-square rounded-full border-[1.5px] border-dashed border-[var(--drawing-line-thin)]" />
                <div className="absolute top-[15%] left-1/2 -translate-x-1/2 dimension-line w-[70%]">
                  <span className="font-gost text-[10px] whitespace-nowrap">&empty;180</span>
                </div>
                <div className="absolute top-3 right-3 roughness-symbol text-[var(--drawing-line-thin)]">
                  Ra 3.2
                </div>
                <div className="relative z-10 w-full">
                  <p className="font-gost text-[10px] uppercase tracking-[0.15em] text-[var(--drawing-line-thin)] mb-1">
                    Екатеринбург&nbsp;&middot; УрФУ
                  </p>
                  <p className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight leading-tight text-[var(--drawing-line)]">
                    Инженеры
                    <br />
                    обучают
                    <br />
                    инженеров
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <table className="stamp-table">
              <tbody>
                <tr>
                  <td className="thick-border" rowSpan={3}>ДИПЛОМ.ИНЖ</td>
                  <td>Лит.</td>
                  <td>Масса</td>
                  <td>Масштаб</td>
                </tr>
                <tr>
                  <td>У</td>
                  <td>&mdash;</td>
                  <td>1:1</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-[9px]">Наставничество по дипломному проекту</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-14 px-4 md:px-8 hatching">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 mb-6">
            {[
              { num: "120", label: "студентов прошли наставничество" },
              { num: "94", label: "% допущены к защите" },
              { num: "6", label: "наставников-инженеров" },
              { num: "12", label: "лет совокупного опыта" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-gost-upright text-4xl md:text-5xl font-bold text-[var(--drawing-line)] leading-none mb-1">
                  {stat.num}<span className="text-[var(--drawing-accent)]">+</span>
                </p>
                <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <div className="extension-line-h w-full my-4" />
          <p className="font-gost text-[10px] text-center text-[var(--drawing-line-thin)] opacity-70 max-w-xl mx-auto">
            Мы не гарантируем оценку&nbsp;&mdash; мы готовим вас так, чтобы вы могли защитить работу осознанно.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-10">
            Кому подходит наставничество
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-[1.5px] border-[var(--drawing-line)] p-6 md:p-8">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                Подходит
              </div>
              <ul className="space-y-3">
                {[
                  "Не знаете, с чего начать диплом",
                  "Получили замечания научрука и не понимаете, что исправлять",
                  "Тема утверждена, но нет плана",
                  "Запутались в расчётах или чертежах",
                  "До защиты мало времени",
                  "Хотите понять материал и защититься уверенно",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-gost text-sm text-[var(--drawing-line)]">
                    <span className="mt-0.5 shrink-0 text-green-700">
                      <Icon name="Check" size={16} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-[1.5px] border-[var(--drawing-line)] p-6 md:p-8">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                Не подходит
              </div>
              <ul className="space-y-3">
                {[
                  "Ищете, кто «напишет за вас»",
                  "Нужна готовая работа «под ключ»",
                  "Не готовы работать самостоятельно",
                  "Хотите купить чужую работу",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-gost text-sm text-[var(--drawing-line)]">
                    <span className="mt-0.5 shrink-0 text-[var(--drawing-accent)]">
                      <Icon name="X" size={16} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8 bg-[var(--drawing-paper)]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Академическая честность&nbsp;&mdash; наш принцип
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-blue)] mb-4">
                Что мы делаем
              </div>
              <ul className="space-y-3">
                {[
                  "Обучаем методологии проектирования",
                  "Помогаем выстроить логику и структуру работы",
                  "Проверяем главы, расчёты и чертежи",
                  "Учим оформлять по ЕСКД и ГОСТ",
                  "Разбираем замечания научного руководителя",
                  "Готовим к выступлению и вопросам комиссии",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-gost text-sm text-[var(--drawing-line)]">
                    <span className="w-4 h-[2px] bg-[var(--drawing-blue)] mt-2.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-4">
                Чего мы НЕ делаем
              </div>
              <ul className="space-y-3">
                {[
                  "Не пишем текст за студента",
                  "Не делаем чертежи и расчёты за студента",
                  "Не гарантируем конкретную оценку",
                  "Не помогаем с плагиатом или фальсификацией",
                  "Не обходим требования кафедры",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-gost text-sm text-[var(--drawing-line)]">
                    <span className="w-4 h-[2px] bg-[var(--drawing-accent)] mt-2.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Как устроено наставничество
          </h2>
          <div className="extension-line-h w-48 mb-12" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="timeline-step" data-step="1">
              <h3 className="font-gost-upright text-base font-bold mb-1">Диагностика</h3>
              <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                Бесплатная встреча 20&ndash;30 минут. Разбираем тему, план, черновик или замечания. Определяем объём работы и формат наставничества.
              </p>
            </div>
            <div className="timeline-step" data-step="2">
              <h3 className="font-gost-upright text-base font-bold mb-1">Планирование</h3>
              <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                Составляем пошаговый план: какие разделы, в каком порядке, с какими дедлайнами. Согласуем график встреч.
              </p>
            </div>
            <div className="timeline-step" data-step="3">
              <h3 className="font-gost-upright text-base font-bold mb-1">Работа по модулям</h3>
              <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                Разбираем каждый раздел диплома: теория, расчёты, конструкция, технология, экономика. Вы выполняете &mdash; мы направляем и объясняем.
              </p>
            </div>
            <div className="timeline-step" data-step="4">
              <h3 className="font-gost-upright text-base font-bold mb-1">Проверка и правки</h3>
              <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                Проверяем каждую итерацию: структура, логика, оформление по ЕСКД. Даём развёрнутый фидбэк с планом правок.
              </p>
            </div>
            <div className="timeline-step" data-step="5">
              <h3 className="font-gost-upright text-base font-bold mb-1">Подготовка к защите</h3>
              <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                Помогаем собрать презентацию, репетируем выступление, разбираем типичные вопросы комиссии.
              </p>
            </div>
            <div className="timeline-step" data-step="6">
              <h3 className="font-gost-upright text-base font-bold mb-1">Защита</h3>
              <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                Вы выходите на защиту подготовленным: понимаете материал, уверены в чертежах и расчётах, готовы отвечать на вопросы.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8 bg-[var(--drawing-paper)]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
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
                    Google Docs, Word или PDF для текста. CAD-файлы для чертежей. Всё присылаете в Telegram наставнику.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">2</span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">Что проверяем</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                    Структура и логика изложения, корректность расчётов, оформление по ЕСКД, ответы на замечания научрука.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">3</span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">Срок ответа</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                    До 48 часов на проверку. В экспресс-формате&nbsp;&mdash; до 12 часов.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">4</span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">Лимиты</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                    До 30 страниц в неделю на проверку в рамках тарифа. Дополнительный объём&nbsp;&mdash; по согласованию.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 md:col-span-2">
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">5</span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">Формат фидбэка</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                    Комментарии в документе, план правок в отдельном файле, голосовые сообщения в Telegram для сложных моментов.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Что вы получите
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 mb-6">
            {[
              { title: "Пошаговый план", desc: "Структура работы с дедлайнами по каждому разделу" },
              { title: "Проверенные главы", desc: "Каждая глава прошла ревью наставника с развёрнутыми комментариями" },
              { title: "КД по ЕСКД", desc: "Чертежи оформлены по стандартам, спецификации заполнены корректно" },
              { title: "Связная логика", desc: "Все разделы диплома последовательны и согласованы между собой" },
              { title: "Закрытые замечания", desc: "Замечания научрука разобраны, исправления проверены" },
              { title: "Презентация и прогон", desc: "Готовая презентация для защиты и репетиция выступления" },
              { title: "Понимание материала", desc: "Вы разбираетесь в своей работе и можете ответить на вопросы комиссии" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="w-4 h-[2px] bg-[var(--drawing-accent)] mt-2.5 shrink-0" />
                <div>
                  <p className="font-gost-upright text-sm font-bold">{item.title}</p>
                  <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="extension-line-h w-full my-4" />
          <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70">
            Мы не гарантируем конкретную оценку. Мы готовим вас так, чтобы вы могли защитить работу осознанно и уверенно.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8 bg-[var(--drawing-paper)]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Из чего состоит работа над дипломом
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { n: "01", title: "Тема и задание" },
              { n: "02", title: "Литературный обзор" },
              { n: "03", title: "Расчёты" },
              { n: "04", title: "Конструкция (CAD/ЕСКД)" },
              { n: "05", title: "Технология" },
              { n: "06", title: "Экономика и ОТ" },
              { n: "07", title: "Оформление ПЗ" },
              { n: "08", title: "Защита" },
            ].map((item) => (
              <div key={item.n} className="border-[1.5px] border-[var(--drawing-line)] p-4 flex items-start gap-3">
                <span className="font-gost-upright text-2xl font-bold text-[var(--drawing-accent)] leading-none">{item.n}</span>
                <span className="font-gost text-xs text-[var(--drawing-line)] leading-snug mt-1">{item.title}</span>
              </div>
            ))}
          </div>

          <Link to="/program" className="btn-drawing text-xs inline-block">
            Подробнее о программе&nbsp;&rarr;
          </Link>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8 bg-[var(--drawing-line)] text-[var(--drawing-bg)]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Выберите формат работы
          </h2>
          <div className="extension-line-h w-48 mb-10 opacity-20" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="border border-[var(--drawing-line-thin)] p-0">
              <div className="bg-[rgba(255,255,255,0.05)] px-6 py-3 border-b border-[var(--drawing-line-thin)] flex justify-between items-center">
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">Поз. 01</span>
                <span className="font-gost text-[10px] text-[rgba(255,255,255,0.4)]">3 мес.</span>
              </div>
              <div className="p-6">
                <h3 className="font-gost-upright text-lg font-bold mb-1 uppercase tracking-tight">Сопровождение 3 мес.</h3>
                <p className="font-gost text-xs text-[rgba(255,255,255,0.5)] mb-3">12 индивидуальных встреч</p>
                <p className="font-gost-upright text-2xl font-bold tracking-tight mb-4">
                  <span className="text-[var(--drawing-accent)]">{"{"}цена_3м{"}"}</span> ₽
                </p>
                <Link to="/contacts" className="block text-center border border-[rgba(255,255,255,0.3)] py-2.5 font-gost text-xs uppercase tracking-[0.15em] hover:bg-[var(--drawing-accent)] hover:border-[var(--drawing-accent)] transition-colors">
                  Диагностика
                </Link>
              </div>
            </div>

            <div className="border-2 border-[var(--drawing-accent)] p-0 relative">
              <div className="bg-[var(--drawing-accent)] px-6 py-3 flex justify-between items-center">
                <span className="font-gost text-[10px] uppercase tracking-[0.2em]">Поз. 02&nbsp;&middot; Популярный</span>
                <span className="font-gost text-[10px]">1 мес.</span>
              </div>
              <div className="p-6">
                <h3 className="font-gost-upright text-lg font-bold mb-1 uppercase tracking-tight">Групповой месяц</h3>
                <p className="font-gost text-xs text-[rgba(255,255,255,0.5)] mb-3">4 групповых занятия</p>
                <p className="font-gost-upright text-2xl font-bold tracking-tight mb-4">
                  <span className="text-[var(--drawing-accent)]">{"{"}цена_группа_1м{"}"}</span> ₽
                </p>
                <Link to="/contacts" className="block text-center bg-[var(--drawing-accent)] py-2.5 font-gost text-xs uppercase tracking-[0.15em] hover:bg-white hover:text-[var(--drawing-line)] transition-colors">
                  В группу
                </Link>
              </div>
            </div>

            <div className="border border-[var(--drawing-line-thin)] p-0">
              <div className="bg-[rgba(255,255,255,0.05)] px-6 py-3 border-b border-[var(--drawing-line-thin)] flex justify-between items-center">
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">Поз. 03</span>
                <span className="font-gost text-[10px] text-[rgba(255,255,255,0.4)]">1 мес.</span>
              </div>
              <div className="p-6">
                <h3 className="font-gost-upright text-lg font-bold mb-1 uppercase tracking-tight">Индивидуальный месяц</h3>
                <p className="font-gost text-xs text-[rgba(255,255,255,0.5)] mb-3">8 индивидуальных встреч</p>
                <p className="font-gost-upright text-2xl font-bold tracking-tight mb-4">
                  <span className="text-[var(--drawing-accent)]">{"{"}цена_инд_1м{"}"}</span> ₽
                </p>
                <Link to="/contacts" className="block text-center border border-[rgba(255,255,255,0.3)] py-2.5 font-gost text-xs uppercase tracking-[0.15em] hover:bg-[var(--drawing-accent)] hover:border-[var(--drawing-accent)] transition-colors">
                  Диагностика
                </Link>
              </div>
            </div>

            <div className="border border-[var(--drawing-line-thin)] p-0">
              <div className="bg-[rgba(255,255,255,0.05)] px-6 py-3 border-b border-[var(--drawing-line-thin)] flex justify-between items-center">
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">Поз. 04</span>
                <span className="font-gost text-[10px] text-[rgba(255,255,255,0.4)]">3 дня</span>
              </div>
              <div className="p-6">
                <h3 className="font-gost-upright text-lg font-bold mb-1 uppercase tracking-tight">Экспресс 3 дня</h3>
                <p className="font-gost text-xs text-[rgba(255,255,255,0.5)] mb-3">3 индивидуальных встречи</p>
                <p className="font-gost-upright text-2xl font-bold tracking-tight mb-4">
                  <span className="text-[var(--drawing-accent)]">{"{"}цена_экспресс_3д{"}"}</span> ₽
                </p>
                <Link to="/contacts" className="block text-center border border-[rgba(255,255,255,0.3)] py-2.5 font-gost text-xs uppercase tracking-[0.15em] hover:bg-[var(--drawing-accent)] hover:border-[var(--drawing-accent)] transition-colors">
                  Экспресс&#8209;разбор
                </Link>
              </div>
            </div>
          </div>

          <p className="font-gost text-[10px] text-[rgba(255,255,255,0.5)] mb-4">
            Итоговая стоимость фиксируется при согласовании объёма и&nbsp;графика.
          </p>
          <Link to="/pricing" className="font-gost text-xs text-[var(--drawing-accent)] hover:underline">
            Все тарифы и сравнение&nbsp;&rarr;
          </Link>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Кто будет с вами работать
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              {
                name: "Алексей К.",
                spec: "Инженер-конструктор, технология машиностроения",
                exp: "Опыт: 8 лет на производстве",
              },
              {
                name: "Дмитрий В.",
                spec: "Инженер-конструктор, детали машин и механизмы",
                exp: "Опыт: 6 лет проектирования",
              },
              {
                name: "Екатерина С.",
                spec: "Инженер, сварочное производство и металлоконструкции",
                exp: "Опыт: 5 лет в отрасли",
              },
            ].map((mentor) => (
              <div key={mentor.name} className="border-[1.5px] border-[var(--drawing-line)] p-6 relative">
                <div className="w-12 h-12 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center mb-4">
                  <Icon name="User" size={20} />
                </div>
                <h3 className="font-gost-upright text-base font-bold mb-1">{mentor.name}</h3>
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed mb-2">{mentor.spec}</p>
                <p className="font-gost text-[10px] text-[var(--drawing-accent)]">{mentor.exp}</p>
              </div>
            ))}
          </div>

          <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed max-w-2xl mb-4">
            Все наставники&nbsp;&mdash; практикующие инженеры Екатеринбурга, которые сегодня работают на машиностроительных предприятиях и&nbsp;знают требования УрФУ из&nbsp;первых рук.
          </p>
          <Link to="/experts" className="font-gost text-xs text-[var(--drawing-accent)] hover:underline">
            Подробнее о наставниках&nbsp;&rarr;
          </Link>
        </div>
      </section>

      <section className="py-16 px-4 md:px-8 bg-[var(--drawing-paper)]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Частые вопросы
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="max-w-2xl space-y-0">
            {faqData.map((item, i) => (
              <div key={i} className="border-b-[1.5px] border-[var(--drawing-line)]">
                <button
                  className="w-full flex items-center justify-between py-4 text-left gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-gost text-sm text-[var(--drawing-line)]">{item.q}</span>
                  <span className="shrink-0 text-[var(--drawing-line-thin)]">
                    <Icon name={openFaq === i ? "ChevronUp" : "ChevronDown"} size={16} />
                  </span>
                </button>
                {openFaq === i && (
                  <div className="pb-4">
                    <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed pl-0">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link to="/faq" className="font-gost text-xs text-[var(--drawing-accent)] hover:underline">
              Все вопросы и ответы&nbsp;&rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="drawing-frame p-8 md:p-12 text-center">
            <h2 className="font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
              Разберём ваш диплом
              <br />
              за 20 минут
            </h2>
            <div className="extension-line-h w-32 mx-auto my-5" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-lg mx-auto mb-8">
              Бесплатная диагностика: оценим состояние работы, определим слабые места и&nbsp;составим план действий. Без обязательств.
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

export default Index;
