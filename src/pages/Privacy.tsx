import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import CONTACT from "@/constants/contactInfo";

const sections = [
  {
    num: "1",
    title: "Общие положения",
    text: "ДИПЛОМ.ИНЖ (далее\u00A0\u2014 Оператор) обрабатывает персональные данные посетителей сайта в\u00A0соответствии с\u00A0Федеральным законом от 27.07.2006 \u2116\u00A0152\u2011ФЗ \u00ABО\u00A0персональных данных\u00BB. Настоящая Политика определяет порядок обработки персональных данных и\u00A0меры по обеспечению их безопасности. Оператор ставит своей целью соблюдение прав и\u00A0свобод человека и\u00A0гражданина при обработке его персональных данных.",
  },
  {
    num: "2",
    title: "Какие данные мы собираем",
    text: "Мы собираем только те данные, которые вы добровольно указываете в\u00A0формах на сайте: имя, номер телефона, контакт в\u00A0Telegram, адрес электронной почты, информация о\u00A0теме ВКР и\u00A0учебном заведении. Мы не собираем данные, не относящиеся к\u00A0целям обработки.",
  },
  {
    num: "3",
    title: "Цели обработки",
    text: "Персональные данные обрабатываются в\u00A0следующих целях: связь с\u00A0вами по оставленной заявке, подбор подходящего тарифа и\u00A0наставника, информирование о\u00A0статусе работы, согласование графика занятий. Данные не используются для рассылки рекламных материалов без вашего согласия.",
  },
  {
    num: "4",
    title: "Хранение и защита данных",
    text: "Персональные данные хранятся на защищённых серверах и\u00A0не передаются третьим лицам без вашего явного согласия, за исключением случаев, предусмотренных законодательством Российской Федерации. Оператор принимает необходимые организационные и\u00A0технические меры для защиты персональных данных от неправомерного доступа, уничтожения, изменения, блокирования, копирования и\u00A0распространения.",
  },
  {
    num: "5",
    title: "Права субъекта персональных данных",
    text: `Вы имеете право: запросить информацию об обрабатываемых персональных данных, потребовать их уточнения, блокирования или уничтожения в\u00A0случае, если данные являются неполными, устаревшими или неточными. Для реализации своих прав напишите нам в\u00A0Telegram ${CONTACT.telegram}. Мы обработаем запрос в\u00A0течение 30\u00A0дней.`,
  },
  {
    num: "6",
    title: "Cookies и аналитика",
    text: "Сайт может использовать файлы cookies и\u00A0сервисы веб\u2011аналитики для улучшения работы сайта и\u00A0анализа пользовательского поведения. Файлы cookies не содержат персональных данных. Вы можете отключить использование cookies в\u00A0настройках вашего браузера, однако это может повлиять на функциональность сайта.",
  },
  {
    num: "7",
    title: "Контакты",
    text: `По всем вопросам, связанным с\u00A0обработкой персональных данных, вы можете обратиться: Telegram\u00A0\u2014 ${CONTACT.telegram}, телефон\u00A0\u2014 ${CONTACT.phone}. Оператор оставляет за собой право вносить изменения в\u00A0настоящую Политику. Новая редакция вступает в\u00A0силу с\u00A0момента её публикации на сайте.`,
  },
];

const Privacy = () => {
  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">З1</div>
          <div className="zone-marker top-2 right-3">Зона VIII</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Правовая информация&nbsp;&middot; ДИПЛОМ.ИНЖ
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Политика
            <br />
            <span className="text-[var(--drawing-accent)]">конфиденциальности</span>
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Обработка персональных данных посетителей сайта ДИПЛОМ.ИНЖ
          </p>
        </div>
      </section>

      <section className="px-4 md:px-8 max-w-[1200px] mx-auto pb-16">
        <div className="drawing-frame p-6 md:p-10">
          <div className="space-y-8">
            {sections.map((s) => (
              <div key={s.num}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">
                    {s.num}
                  </span>
                  <h2 className="font-gost-upright text-base md:text-lg font-bold text-[var(--drawing-line)] pt-0.5">
                    {s.title}
                  </h2>
                </div>
                <p className="font-gost text-xs md:text-sm text-[var(--drawing-line-thin)] leading-relaxed pl-10">
                  {s.text}
                </p>
                {s.num !== "7" && <div className="extension-line-h w-full mt-6" />}
              </div>
            ))}
          </div>

          <div className="extension-line-h w-full mt-8 mb-6" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-10">
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
              Дата последнего обновления: {"{"}дата{"}"}
            </p>
            <div className="flex items-center gap-4">
              <Link to="/contacts" className="font-gost text-xs text-[var(--drawing-accent)] hover:underline flex items-center gap-1.5">
                <Icon name="Send" size={12} />
                Связаться с нами
              </Link>
              <Link to="/" className="font-gost text-xs text-[var(--drawing-line-thin)] hover:text-[var(--drawing-line)] transition-colors flex items-center gap-1.5">
                <Icon name="ArrowLeft" size={12} />
                На главную
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Privacy;