import Icon from "@/components/ui/icon";

const AboutSection = () => {
  return (
    <>
      <section className="py-14 px-4 md:px-8 hatching">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-6">
            {[
              { title: "Инженеры, а не репетиторы", desc: "Каждый наставник работает на производстве и ведёт реальные проекты." },
              { title: "Профиль — машиностроение и механика", desc: "Конструирование, технология, детали машин, CAD/CAE, ЕСКД." },
              { title: "Учим, а не пишем за вас", desc: "Цель — чтобы вы разбирались в своей работе и могли её защитить." },
            ].map((item) => (
              <div key={item.title} className="border-[1.5px] border-[var(--drawing-line)] p-5 bg-[var(--drawing-bg)]">
                <p className="font-gost-upright text-sm md:text-base font-bold text-[var(--drawing-line)] mb-2">
                  {item.title}
                </p>
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
                  {item.desc}
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
          <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2">
            Аналитическая часть&nbsp;&middot; Раздел 02
          </p>
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
                  "Наставляем по методологии проектирования",
                  "Помогаем выстроить логику и структуру работы",
                  "Проверяем главы, расчёты и чертежи",
                  "Разбираем оформление по ЕСКД и ГОСТ",
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
    </>
  );
};

export default AboutSection;