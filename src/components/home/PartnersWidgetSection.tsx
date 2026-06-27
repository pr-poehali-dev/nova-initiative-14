import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

/**
 * Блок «Партнёрам» на главной — путь к лендингу CAE-виджета калькулятора балки.
 * Адресован заводам металлоконструкций, продавцам металлопроката и
 * строительным компаниям, которым нужен онлайн-расчёт на своём сайте.
 */
const BENEFITS = [
  {
    icon: "Code2",
    title: "Установка одной строкой",
    text: "Вставьте код на сайт — калькулятор балки появится сразу. Программист не нужен.",
  },
  {
    icon: "MailCheck",
    title: "Тёплые заявки с параметрами",
    text: "Посетитель сам считает прогиб и сечение, а вам приходит заявка с готовыми данными.",
  },
  {
    icon: "ShieldCheck",
    title: "Расчёт по ГОСТ",
    text: "Под капотом — настоящий конечно-элементный решатель. Клиент доверяет результату.",
  },
];

const PartnersWidgetSection = () => {
  return (
    <section className="py-12 md:py-16 bg-[var(--drawing-bg)] border-b-[2.5px] border-[var(--drawing-line)]">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2">
              Партнёрам · Раздел 07 · White-label
            </p>
            <h2 className="font-gost-upright text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wide text-[var(--drawing-line)] break-words">
              CAE-виджет для&nbsp;вашего сайта
            </h2>
            <p className="mt-3 text-sm md:text-base text-[var(--drawing-line-thin)] max-w-2xl leading-relaxed">
              Заводам металлоконструкций, продавцам металлопроката и&nbsp;строительным
              компаниям&nbsp;— встраиваемый калькулятор балки. Посетитель считает
              прогиб и&nbsp;запас прочности прямо на&nbsp;вашем сайте и&nbsp;оставляет заявку.
            </p>
          </div>
          <Link
            to="/widget-balka"
            className="font-gost text-xs uppercase tracking-[0.2em] text-[var(--drawing-accent)] hover:underline shrink-0 self-start md:self-end"
          >
            Смотреть лендинг&nbsp;&rarr;
          </Link>
        </div>

        <div className="extension-line-h w-full mb-8" />

        <div className="grid gap-4 md:gap-6 md:grid-cols-3 mb-8">
          {BENEFITS.map((b, idx) => (
            <div
              key={b.title}
              className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-4 relative flex items-start gap-4"
            >
              <span className="inline-flex w-10 h-10 border border-[var(--drawing-line)] items-center justify-center text-[var(--drawing-accent)] shrink-0">
                <Icon name={b.icon} size={20} fallback="Boxes" />
              </span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-gost-upright text-base md:text-lg font-bold leading-snug">
                    {b.title}
                  </h3>
                  <span className="font-gost text-[9px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                    Поз. {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed">{b.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-[var(--drawing-line-thin)] pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
              Тарификация
            </p>
            <p className="text-sm text-[var(--drawing-line)]">
              Фиксированная абонентская плата по&nbsp;числу расчётов&nbsp;— без&nbsp;процентов с&nbsp;заявок.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/widget-balka" className="btn-drawing btn-drawing-accent text-xs">
              Подключить виджет
            </Link>
            <Link to="/contacts" className="btn-drawing text-xs">
              Связаться&nbsp;&rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersWidgetSection;
