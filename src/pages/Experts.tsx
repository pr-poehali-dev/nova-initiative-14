import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const mentors = [
  {
    initials: "АК",
    name: "Алексей Крылов",
    tag: "Конструирование технологической оснастки и приспособлений",
    experience: [
      "8 лет в машиностроении",
      "Действующий инженер-конструктор на Уралмашзаводе",
      "Выпускник УрФУ, кафедра «Детали машин»",
      "Работает в КОМПАС-3D, SolidWorks",
    ],
    approach:
      "Разбирает каждую ошибку до уровня понимания «почему так неправильно и как правильно». Не даёт готовых решений — задаёт наводящие вопросы, пока студент не придёт к ответу сам. Фокус на логике конструкции: если студент понимает, зачем нужен каждый элемент, он сможет объяснить это комиссии.",
    work:
      "Встречи раз в неделю по 60 минут. Между встречами проверяет чертежи и расчёты с подробными комментариями: что исправить, почему и по какому ГОСТ. В чате отвечает на вопросы в течение дня. Любит начинать с эскиза от руки — потом переходить к CAD.",
    stamp: { spec: "Оснастка/КД", exp: "8 лет", software: "КОМПАС / SW" },
  },
  {
    initials: "ДВ",
    name: "Дмитрий Воронин",
    tag: "Технология машиностроения, режимы резания, нормирование",
    experience: [
      "10 лет в машиностроении",
      "Действующий инженер-технолог на Пневмостроймашине",
      "Выпускник УрФУ, кафедра «Технология машиностроения»",
      "Работает в AutoCAD, КОМПАС-3D",
    ],
    approach:
      "Системный подход: строит работу от плана к результату. Силён в расчётной части — помогает выстроить методику расчёта так, чтобы каждый шаг был обоснован. Учит проверять размерность и согласованность данных между разделами ПЗ.",
    work:
      "Начинает с детального плана: что сдаём на этой неделе, что — на следующей. Проверяет расчёты построчно — указывает на ошибки в формулах, единицах, подстановке. Между встречами даёт задания с конкретными ориентирами по объёму и качеству. Хорошо объясняет технологическую часть: маршрут, режимы, выбор инструмента.",
    stamp: { spec: "Технология/расчёты", exp: "10 лет", software: "AutoCAD / КОМПАС" },
  },
  {
    initials: "ЕС",
    name: "Екатерина Соколова",
    tag: "CAD/CAE, конструкторская документация, ЕСКД",
    experience: [
      "7 лет в машиностроении",
      "Действующий инженер-конструктор на НПО автоматики",
      "Выпускник УрФУ, кафедра «Турбины и двигатели»",
      "Работает в SolidWorks, Ansys, КОМПАС-3D",
    ],
    approach:
      "Визуал: разбирает всё на чертежах, 3D-моделях и скриншотах. Вместо длинных объяснений в тексте — показывает на конкретном примере, где ошибка и как должно быть. Сильная сторона — ЕСКД и оформление КД: знает стандарты не формально, а с пониманием, зачем каждое требование существует.",
    work:
      "Встречи проходят с демонстрацией экрана: открывает чертёж студента и разбирает прямо в CAD. Между встречами присылает пометки на PDF — конкретные указания с номерами ГОСТ. Помогает с CAE: ставит задачу в Ansys вместе со студентом, объясняет граничные условия и интерпретацию результатов. Терпелив к тем, кто только осваивает ПО.",
    stamp: { spec: "CAD/CAE/ЕСКД", exp: "7 лет", software: "SW / Ansys / КОМПАС" },
  },
  {
    initials: "МН",
    name: "Михаил Нестеров",
    tag: "Детали машин, редукторы, механические передачи",
    experience: [
      "12 лет в машиностроении",
      "Действующий инженер-конструктор на УЗТМ",
      "Выпускник УрФУ, кафедра «Детали машин»",
      "Работает в КОМПАС-3D",
    ],
    approach:
      "Терпеливый: объясняет столько раз, сколько нужно, пока студент не поймёт. Не торопит и не давит. Считает, что лучше потратить лишние 15 минут на объяснение, чем потом переделывать целый раздел. Особенно силён в деталях машин: подшипники, валы, зубчатые передачи, муфты — знает и теорию, и практику подбора.",
    work:
      "Строит занятие вокруг вопросов студента: сначала разбирает то, что не получилось, потом — план на неделю. Между встречами проверяет текст и расчёты, оставляет голосовые в Telegram с пояснениями. Помогает подбирать подшипники по каталогам SKF/FAG, проверяет кинематику редукторов, разбирает ошибки в эпюрах моментов.",
    stamp: { spec: "Детали машин/редукторы", exp: "12 лет", software: "КОМПАС-3D" },
  },
];

const Experts = () => {
  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">Д1</div>
          <div className="zone-marker top-2 right-3">Зона V</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Команда наставников&nbsp;&middot; ДИПЛОМ.ИНЖ
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            <span className="text-[var(--drawing-accent)]">Наставники</span>
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Все наставники&nbsp;&mdash; действующие инженеры&#8209;конструкторы. Они работают на&nbsp;машиностроительных предприятиях Екатеринбурга и&nbsp;знают, как устроено реальное производство. Они понимают требования кафедр УрФУ, потому что сами их прошли.
          </p>
        </div>
      </section>

      <section className="pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Как проходит работа с наставником
        </h2>
        <div className="extension-line-h w-48 mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              icon: "ClipboardCheck",
              text: "Занятие начинается с разбора того, что студент сделал за неделю: текст, расчёты, чертежи. Наставник указывает на ошибки и объясняет, как исправить.",
            },
            {
              icon: "HelpCircle",
              text: "Наставник задаёт вопросы «почему так?» — студент учится обосновывать свои решения. Это ключевой навык для защиты перед комиссией.",
            },
            {
              icon: "FileCheck",
              text: "Между занятиями наставник проверяет присланные материалы и оставляет комментарии: что исправить, почему и по какому стандарту.",
            },
            {
              icon: "MessageSquare",
              text: "Формат: видеозвонки + офлайн-встречи (Екатеринбург) + чат в Telegram 10:00–20:00 ежедневно для быстрых вопросов.",
            },
          ].map((item) => (
            <div key={item.icon} className="flex items-start gap-4 border-[1.5px] border-[var(--drawing-line)] p-5">
              <span className="shrink-0 w-9 h-9 border-[1.5px] border-[var(--drawing-line-thin)] flex items-center justify-center text-[var(--drawing-line-thin)]">
                <Icon name={item.icon} size={18} />
              </span>
              <p className="font-gost text-xs md:text-sm text-[var(--drawing-line)] leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 md:px-8 max-w-[1200px] mx-auto pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {mentors.map((m, i) => (
            <div
              key={m.initials}
              className={`drawing-frame p-6 md:p-8 relative ${i % 2 === 0 ? "" : "hatching-blue"}`}
            >
              <div className="zone-marker top-2 right-3">Н{i + 1}</div>

              <div className="flex items-start gap-5 mb-6">
                <div className="shrink-0 w-20 h-20 rounded-full border-[2.5px] border-[var(--drawing-line)] flex items-center justify-center bg-[var(--drawing-bg)]">
                  <span className="font-gost-upright text-2xl font-bold text-[var(--drawing-line)]">{m.initials}</span>
                </div>
                <div className="pt-1">
                  <h3 className="font-gost-upright text-xl font-bold tracking-tight text-[var(--drawing-line)] mb-1">
                    {m.name}
                  </h3>
                  <span className="inline-block font-gost text-[9px] uppercase tracking-widest text-[var(--drawing-blue)] border border-[var(--drawing-blue)] px-2 py-0.5 leading-tight">
                    {m.tag}
                  </span>
                </div>
              </div>

              <div className="mb-5">
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                  Опыт
                </div>
                <ul className="space-y-1.5">
                  {m.experience.map((e, ei) => (
                    <li key={ei} className="flex items-start gap-2.5 font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                      <span className="w-3 h-[2px] bg-[var(--drawing-accent)] mt-2 shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="extension-line-h w-full mb-5" />

              <div className="mb-5">
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                  Подход
                </div>
                <p className="font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                  {m.approach}
                </p>
              </div>

              <div className="extension-line-h w-full mb-5" />

              <div className="mb-6">
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                  Как проходит работа
                </div>
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                  {m.work}
                </p>
              </div>

              <table className="stamp-table">
                <thead>
                  <tr>
                    <th className="!text-[9px] !font-bold text-center">Спец.</th>
                    <th className="!text-[9px] !font-bold text-center">Опыт</th>
                    <th className="!text-[9px] !font-bold text-center">ПО</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="!text-[9px] text-center">{m.stamp.spec}</td>
                    <td className="!text-[9px] text-center">{m.stamp.exp}</td>
                    <td className="!text-[9px] text-center">{m.stamp.software}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 md:px-8 hatching">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Что объединяет наших наставников
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: "Factory",
                title: "Реальный опыт на производстве",
                desc: "Каждый наставник сегодня работает на машиностроительном предприятии Екатеринбурга. Это не теоретики — они решают инженерные задачи каждый день.",
              },
              {
                icon: "GraduationCap",
                title: "Знание требований кафедр УрФУ",
                desc: "Сами прошли защиту в УрФУ, знают ожидания комиссий, типовые вопросы и требования к оформлению по конкретным кафедрам.",
              },
              {
                icon: "Brain",
                title: "Фокус на понимании, а не на «сдать и забыть»",
                desc: "Цель — чтобы студент разобрался в материале. Если он понимает свою работу, он сможет её защитить и ответить на любой вопрос.",
              },
              {
                icon: "Heart",
                title: "Терпение и уважение к процессу обучения",
                desc: "Не торопят, не осуждают за ошибки, объясняют столько раз, сколько нужно. Помнят, каково быть студентом, и относятся к этому с пониманием.",
              },
            ].map((item) => (
              <div key={item.icon} className="border-[1.5px] border-[var(--drawing-line)] p-6 bg-[var(--drawing-bg)]">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[var(--drawing-accent)]">
                    <Icon name={item.icon} size={20} />
                  </span>
                  <h3 className="font-gost-upright text-sm font-bold text-[var(--drawing-line)]">{item.title}</h3>
                </div>
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="drawing-frame p-8 md:p-12 text-center">
            <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
              Познакомьтесь с наставником
              <br />
              на диагностике
            </h2>
            <div className="extension-line-h w-32 mx-auto my-5" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-lg mx-auto mb-8">
              На бесплатной диагностике вы познакомитесь с&nbsp;наставником, разберёте свою ситуацию и&nbsp;поймёте, подходит ли вам формат работы. 20&ndash;30 минут, без обязательств.
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

export default Experts;