/**
 * Шапка страницы /program: чертёжная рамка с заголовком, подзаголовком
 * и краткой характеристикой программы (10 модулей, специализация).
 */
export default function ProgramHero() {
  return (
    <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
      <div className="drawing-frame p-6 md:p-10 relative">
        <div className="zone-marker top-2 left-3">Б1</div>
        <div className="zone-marker top-2 right-3">Зона II</div>

        <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
          Содержание программы&nbsp;&middot; ДИПЛОМ.ИНЖ
        </div>
        <div className="extension-line-h w-full mb-6" />

        <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
          Программа наставничества
          <br />
          <span className="text-[var(--drawing-accent)]">по дипломному проекту</span>
        </h1>

        <div className="extension-line-h w-3/4 my-5" />

        <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed mb-4">
          Программа адаптируется под вашу тему, специализацию и&nbsp;текущий этап работы. Ниже&nbsp;&mdash; типовые модули для направления &laquo;Конструирование&raquo;. На&nbsp;диагностике определим, какие модули актуальны для&nbsp;вас.
        </p>

        <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 max-w-xl">
          10 модулей&nbsp;&middot; Адаптивная последовательность&nbsp;&middot; Машиностроение / Конструирование&nbsp;&middot; УрФУ
        </p>
      </div>
    </section>
  );
}
