import { Link } from "react-router-dom";

const ProcessSection = () => {
  return (
    <>
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2">
            Инженерный журнал&nbsp;&middot; Раздел 03
          </p>
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
                    Google Docs, Word или PDF для текста. CAD-файлы для чертежей. Способ передачи материалов наставник и ученик выбирают сами&nbsp;&mdash; в удобном формате связи.
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
                    Комментарии в документе, план правок в отдельном файле, голосовые сообщения в выбранном мессенджере для сложных моментов.
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
    </>
  );
};

export default ProcessSection;