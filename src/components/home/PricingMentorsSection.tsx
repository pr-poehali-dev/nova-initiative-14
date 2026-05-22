import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import useTariffs, { formatPrice } from "@/hooks/useTariffs";

const PricingMentorsSection = () => {
  const { tariffs, loading } = useTariffs();

  return (
    <>
      <section className="py-16 px-4 md:px-8 bg-[var(--drawing-line)] text-[var(--drawing-bg)]">
        <div className="max-w-[1200px] mx-auto">
          <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-bg)] opacity-60 mb-2">
            Инженерный журнал&nbsp;&middot; Раздел 04
          </p>
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Выберите формат работы
          </h2>
          <div className="extension-line-h w-48 mb-10 opacity-20" />

          {loading ? (
            <div className="py-10 text-center">
              <span className="font-gost text-sm text-[rgba(255,255,255,0.4)]">Загрузка тарифов...</span>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {tariffs.map((t) => (
              <div
                key={t.id}
                className={t.is_popular
                  ? "border-2 border-[var(--drawing-accent)] p-0 relative"
                  : "border border-[var(--drawing-line-thin)] p-0"
                }
              >
                <div className={`px-6 py-3 flex justify-between items-center ${t.is_popular ? "bg-[var(--drawing-accent)]" : "bg-[rgba(255,255,255,0.05)] border-b border-[var(--drawing-line-thin)]"}`}>
                  <span className={`font-gost text-[10px] uppercase tracking-[0.2em] ${t.is_popular ? "" : "text-[rgba(255,255,255,0.4)]"}`}>
                    Поз. {t.pos}{t.is_popular ? "\u00A0\u00B7 Популярный" : ""}
                  </span>
                  <span className={`font-gost text-[10px] ${t.is_popular ? "" : "text-[rgba(255,255,255,0.4)]"}`}>
                    {t.duration}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-gost-upright text-lg font-bold mb-1 uppercase tracking-tight">{t.title}</h3>
                  <p className="font-gost text-xs text-[rgba(255,255,255,0.5)] mb-3">{t.format}</p>
                  <p className="font-gost-upright text-2xl font-bold tracking-tight mb-4">
                    <span className="text-[var(--drawing-accent)]">{formatPrice(t)}</span>
                    {t.price > 0 && <> &#8381;</>}
                  </p>
                  <Link
                    to={t.cta_link}
                    className={`block text-center py-2.5 font-gost text-xs uppercase tracking-[0.15em] transition-colors ${
                      t.is_popular
                        ? "bg-[var(--drawing-accent)] hover:bg-white hover:text-[var(--drawing-line)]"
                        : "border border-[rgba(255,255,255,0.3)] hover:bg-[var(--drawing-accent)] hover:border-[var(--drawing-accent)]"
                    }`}
                  >
                    {t.cta_text}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          )}

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

          <div className="drawing-frame p-6 md:p-10 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                  Кто наши наставники
                </div>
                <p className="font-gost text-sm text-[var(--drawing-line)] leading-relaxed mb-4">
                  Практикующие инженеры&#8209;конструкторы и&nbsp;инженеры&#8209;технологи. Каждый сегодня работает на&nbsp;производственном предприятии Екатеринбурга&nbsp;&mdash; не&nbsp;преподаватель, а&nbsp;действующий специалист в&nbsp;области машиностроения и&nbsp;механики.
                </p>
                <p className="font-gost text-sm text-[var(--drawing-line)] leading-relaxed">
                  Сами прошли защиту дипломных проектов и&nbsp;знают требования кафедр изнутри: какие вопросы задаёт комиссия, что проверяет научрук, как правильно оформить КД по&nbsp;ЕСКД.
                </p>
              </div>
              <div>
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                  Специализации
                </div>
                <ul className="space-y-2">
                  {[
                    "Конструирование деталей и узлов машин",
                    "Технология машиностроения, режимы резания",
                    "CAD/CAE: КОМПАС-3D, SolidWorks, AutoCAD, Ansys",
                    "Конструкторская документация по ЕСКД и ГОСТ",
                    "Сварочное производство и металлоконструкции",
                    "Детали машин: редукторы, передачи, подшипники",
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

          <Link to="/experts" className="font-gost text-xs text-[var(--drawing-accent)] hover:underline">
            Подробнее о наставниках&nbsp;&rarr;
          </Link>
        </div>
      </section>
    </>
  );
};

export default PricingMentorsSection;