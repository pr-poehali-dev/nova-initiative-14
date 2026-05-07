import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const PricingMentorsSection = () => {
  return (
    <>
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

          <div className="drawing-frame p-6 md:p-10 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                  Кто наши наставники
                </div>
                <p className="font-gost text-sm text-[var(--drawing-line)] leading-relaxed mb-4">
                  Практикующие инженеры&#8209;конструкторы и&nbsp;инженеры&#8209;технологи с&nbsp;суммарным опытом более&nbsp;40&nbsp;лет в&nbsp;машиностроении. Каждый сегодня работает на&nbsp;производственном предприятии Екатеринбурга&nbsp;&mdash; не&nbsp;преподаватель, а&nbsp;действующий специалист.
                </p>
                <p className="font-gost text-sm text-[var(--drawing-line)] leading-relaxed">
                  Все прошли защиту в&nbsp;УрФУ и&nbsp;знают требования кафедр изнутри: какие вопросы задаёт комиссия, что проверяет научрук, как правильно оформить КД по&nbsp;ЕСКД.
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