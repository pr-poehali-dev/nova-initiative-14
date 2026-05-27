import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Seo from "@/components/Seo";

const Experts = () => {
  return (
    <main className="min-h-screen grid-bg">
      <Seo />
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">Д1</div>
          <div className="zone-marker top-2 right-3">Зона V</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Команда наставников&nbsp;&middot; Диплом-Инж.рф
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            <span className="text-[var(--drawing-accent)]">Наставники</span>
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Все наставники&nbsp;&mdash; действующие инженеры&#8209;конструкторы и&nbsp;инженеры&#8209;технологи. Они работают на&nbsp;машиностроительных предприятиях Екатеринбурга и&nbsp;знают, как устроено реальное производство. Они понимают требования инженерных кафедр, потому что сами их прошли.
          </p>
        </div>
      </section>

      <section className="pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3">
          О команде
        </h2>
        <div className="extension-line-h w-48 mb-8" />

        <div className="drawing-frame p-6 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                Кто мы
              </div>
              <p className="font-gost text-sm text-[var(--drawing-line)] leading-relaxed mb-5">
                Команда практикующих инженеров в&nbsp;области машиностроения и&nbsp;механики. Каждый из&nbsp;нас сегодня работает на&nbsp;производственном предприятии&nbsp;&mdash; решает реальные конструкторские и&nbsp;технологические задачи, а&nbsp;не&nbsp;только консультирует.
              </p>
              <p className="font-gost text-sm text-[var(--drawing-line)] leading-relaxed">
                Мы сами прошли защиту дипломных проектов и&nbsp;знаем требования кафедр изнутри, помним, с&nbsp;какими трудностями сталкиваются студенты. Это делает нашу помощь прикладной, а&nbsp;не&nbsp;теоретической.
              </p>
            </div>

            <div>
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                Специализации команды
              </div>
              <ul className="space-y-2.5">
                {[
                  "Конструирование деталей и узлов машин, оснастки и приспособлений",
                  "Технология машиностроения: маршруты, режимы резания, нормирование",
                  "CAD/CAE: КОМПАС-3D, SolidWorks, AutoCAD, Ansys",
                  "Конструкторская документация по ЕСКД и отраслевым ГОСТ",
                  "Детали машин: редукторы, передачи, подшипники, муфты",
                  "Сварочное производство и металлоконструкции",
                  "Экономическая часть и охрана труда в дипломных проектах",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                    <span className="w-3 h-[2px] bg-[var(--drawing-accent)] mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

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
              text: "Встреча начинается с разбора того, что студент сделал за неделю: текст, расчёты, чертежи. Наставник указывает на ошибки и объясняет, как исправить.",
            },
            {
              icon: "HelpCircle",
              text: "Наставник задаёт вопросы «почему так?» — студент сам формулирует обоснование своих решений. Это ключевой навык для защиты перед комиссией.",
            },
            {
              icon: "FileCheck",
              text: "Между встречами наставник проверяет присланные материалы и оставляет комментарии: что исправить, почему и по какому стандарту.",
            },
            {
              icon: "MessageSquare",
              text: "Формат связи выбирают наставник и подопечный: онлайн или в офисе (Екатеринбург), быстрые вопросы в мессенджере в рабочее время.",
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
                title: "Знание требований инженерных кафедр",
                desc: "Сами прошли защиту по машиностроению и механике, знают ожидания комиссий, типовые вопросы и требования к оформлению.",
              },
              {
                icon: "Brain",
                title: "Фокус на понимании, а не на «сдать и забыть»",
                desc: "Цель — чтобы студент разобрался в материале. Если он понимает свою работу, он сможет её защитить и ответить на любой вопрос.",
              },
              {
                icon: "Heart",
                title: "Терпение и уважение к процессу работы",
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
              На бесплатной диагностике вы разберёте свою ситуацию и&nbsp;поймёте, подходит ли вам формат работы. 20&ndash;30 минут, без обязательств.
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