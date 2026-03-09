export default function Index() {
  return (
    <main className="min-h-screen grid-bg">
      {/* Navigation — верхняя рамка чертежа */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[var(--drawing-bg)] border-b-[2.5px] border-[var(--drawing-line)]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-3 flex justify-between items-center">
          <a href="/" className="font-gost text-lg tracking-wider">
            <span className="text-[var(--drawing-accent)] font-bold">ДИПЛОМ</span>
            <span className="text-[var(--drawing-line-thin)]">.ИНЖ</span>
          </a>
          <div className="hidden md:flex items-center gap-1">
            {["Программы", "О курсе", "Записаться"].map((item, i) => (
              <a
                key={item}
                href={`#${["programs", "about", "contact"][i]}`}
                className="font-gost text-xs uppercase tracking-[0.15em] px-4 py-2 border border-transparent hover:border-[var(--drawing-line)] transition-all"
              >
                {item}
              </a>
            ))}
          </div>
          <div className="font-gost text-[10px] text-[var(--drawing-line-thin)] hidden lg:block">
            ГОСТ 2.104-2006
          </div>
        </div>
      </nav>

      {/* Hero — основная надпись */}
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          {/* Zone markers */}
          <div className="zone-marker top-2 left-3">A1</div>
          <div className="zone-marker top-2 right-3">Зона I</div>

          <div className="grid grid-cols-12 gap-6 md:gap-10">
            <div className="col-span-12 md:col-span-7 mb-6 md:mb-0">
              <div className="mb-4">
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                  Наименование изделия
                </div>
                <div className="extension-line-h w-full mb-4"></div>
              </div>
              <h1 className="font-gost-upright text-6xl md:text-8xl font-bold tracking-tight leading-[0.85] mb-6 text-[var(--drawing-line)]">
                ДИПЛОМ
                <br />
                <span className="text-[var(--drawing-accent)]">ПРОЕКТ</span>
              </h1>
              <div className="extension-line-h w-3/4 my-4"></div>
              <p className="font-gost text-sm md:text-base max-w-lg text-[var(--drawing-line-thin)] leading-relaxed">
                Курсы по разработке дипломного проекта в&nbsp;машиностроении. Вас обучают действующие инженеры‑конструкторы — те, кто решает реальные задачи на&nbsp;производстве каждый день.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#programs" className="btn-drawing text-xs">
                  Выбрать программу →
                </a>
                <a href="#contact" className="btn-drawing-accent btn-drawing text-xs">
                  Записаться
                </a>
              </div>
            </div>
            <div className="col-span-12 md:col-span-5 flex items-center justify-center">
              <div className="relative w-full aspect-square border-[2px] border-[var(--drawing-line)] hatching-blue flex items-end p-6">
                {/* Осевые линии */}
                <div className="absolute top-0 bottom-0 left-1/2 extension-line-v"></div>
                <div className="absolute left-0 right-0 top-1/2 extension-line-h"></div>
                {/* Окружность */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] aspect-square rounded-full border-[2px] border-[var(--drawing-line)]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] aspect-square rounded-full border-[1.5px] border-dashed border-[var(--drawing-line-thin)]"></div>
                {/* Размерная стрелка */}
                <div className="absolute top-[15%] left-1/2 -translate-x-1/2 dimension-line w-[70%]">
                  <span className="font-gost text-[10px] whitespace-nowrap">∅180</span>
                </div>
                <div className="relative z-10 w-full">
                  <p className="font-gost text-[10px] uppercase tracking-[0.15em] text-[var(--drawing-line-thin)] mb-1">
                    Екатеринбург · УрФУ
                  </p>
                  <p className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight leading-tight text-[var(--drawing-line)]">
                    Инженеры
                    <br />
                    обучают
                    <br />
                    инженеров
                  </p>
                </div>
                {/* Шероховатость */}
                <div className="absolute top-3 right-3 roughness-symbol text-[var(--drawing-line-thin)]">
                  Ra 3.2
                </div>
              </div>
            </div>
          </div>

          {/* Mini stamp */}
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
                  <td>—</td>
                  <td>1:1</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-[9px]">Курсы дипломного проектирования</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Programs — Программы */}
      <section id="programs" className="py-16 px-4 md:px-8 bg-[var(--drawing-line)] text-[var(--drawing-bg)]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="section-callout font-gost-upright text-4xl md:text-5xl font-bold tracking-tight">
              ПРОГРАММЫ
            </h2>
            <span className="font-gost text-[10px] text-[var(--drawing-line-thin)]">Сечение А-А</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Plan 1: 3 месяца */}
            <div className="group border border-[var(--drawing-line-thin)] p-0 hover:border-[var(--drawing-accent)] transition-colors duration-300 relative">
              <div className="bg-[rgba(255,255,255,0.05)] px-6 py-3 border-b border-[var(--drawing-line-thin)] flex justify-between items-center">
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">Поз. 01</span>
                <span className="font-gost text-[10px] text-[var(--drawing-line-thin)]">3 мес.</span>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <span className="font-gost-upright text-6xl font-bold text-[rgba(255,255,255,0.1)] group-hover:text-[var(--drawing-accent)] transition-colors duration-300">03</span>
                </div>
                <h3 className="font-gost-upright text-xl font-bold mb-1 uppercase tracking-tight">3 месяца</h3>
                <div className="extension-line-h w-full my-3 opacity-20"></div>
                <p className="font-gost text-xs text-[rgba(255,255,255,0.5)] mb-6 leading-relaxed">
                  Полное сопровождение дипломного проекта от постановки задачи до защиты. Глубокая проработка всех разделов.
                </p>
                <div className="border-t border-[var(--drawing-line-thin)] pt-4">
                  <p className="font-gost-upright text-3xl font-bold tracking-tight">50 000 ₽</p>
                  <ul className="mt-4 space-y-2 font-gost text-xs text-[rgba(255,255,255,0.5)]">
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Индивидуальный куратор-инженер</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Проверка и правки всех разделов</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Подготовка к защите</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Консультации без ограничений</li>
                  </ul>
                  <a href="#contact" className="mt-6 block text-center border border-[rgba(255,255,255,0.3)] py-3 font-gost text-xs uppercase tracking-[0.15em] hover:bg-[var(--drawing-accent)] hover:border-[var(--drawing-accent)] transition-colors">
                    Записаться
                  </a>
                </div>
              </div>
            </div>

            {/* Plan 2: 1 месяц — Популярный */}
            <div className="group border-2 border-[var(--drawing-accent)] p-0 relative">
              <div className="bg-[var(--drawing-accent)] px-6 py-3 flex justify-between items-center">
                <span className="font-gost text-[10px] uppercase tracking-[0.2em]">Поз. 02 · Популярный</span>
                <span className="font-gost text-[10px]">1 мес.</span>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <span className="font-gost-upright text-6xl font-bold text-[var(--drawing-accent)]">01</span>
                </div>
                <h3 className="font-gost-upright text-xl font-bold mb-1 uppercase tracking-tight">1 месяц</h3>
                <div className="extension-line-h w-full my-3 opacity-20"></div>
                <p className="font-gost text-xs text-[rgba(255,255,255,0.5)] mb-6 leading-relaxed">
                  Интенсивная работа над ключевыми разделами диплома. Оптимальный баланс глубины и скорости.
                </p>
                <div className="border-t border-[var(--drawing-line-thin)] pt-4">
                  <p className="font-gost-upright text-3xl font-bold tracking-tight">25 000 ₽</p>
                  <ul className="mt-4 space-y-2 font-gost text-xs text-[rgba(255,255,255,0.5)]">
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Куратор-инженер на месяц</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Проверка основных разделов</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Советы по защите</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> До 10 консультаций</li>
                  </ul>
                  <a href="#contact" className="mt-6 block text-center bg-[var(--drawing-accent)] py-3 font-gost text-xs uppercase tracking-[0.15em] hover:bg-white hover:text-[var(--drawing-line)] transition-colors">
                    Записаться
                  </a>
                </div>
              </div>
            </div>

            {/* Plan 3: 3 дня */}
            <div className="group border border-[var(--drawing-line-thin)] p-0 hover:border-[var(--drawing-accent)] transition-colors duration-300 relative">
              <div className="bg-[rgba(255,255,255,0.05)] px-6 py-3 border-b border-[var(--drawing-line-thin)] flex justify-between items-center">
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">Поз. 03</span>
                <span className="font-gost text-[10px] text-[var(--drawing-line-thin)]">3 дня</span>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <span className="font-gost-upright text-6xl font-bold text-[rgba(255,255,255,0.1)] group-hover:text-[var(--drawing-accent)] transition-colors duration-300">3Д</span>
                </div>
                <h3 className="font-gost-upright text-xl font-bold mb-1 uppercase tracking-tight">3 дня</h3>
                <div className="extension-line-h w-full my-3 opacity-20"></div>
                <p className="font-gost text-xs text-[rgba(255,255,255,0.5)] mb-6 leading-relaxed">
                  Экстренная помощь: быстрая проверка, критические правки и подготовка к защите в сжатые сроки.
                </p>
                <div className="border-t border-[var(--drawing-line-thin)] pt-4">
                  <p className="font-gost-upright text-3xl font-bold tracking-tight">10 000 ₽</p>
                  <ul className="mt-4 space-y-2 font-gost text-xs text-[rgba(255,255,255,0.5)]">
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Экспресс-аудит диплома</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Критические правки</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> Подготовка к вопросам комиссии</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--drawing-accent)]">—</span> 3 консультации</li>
                  </ul>
                  <a href="#contact" className="mt-6 block text-center border border-[rgba(255,255,255,0.3)] py-3 font-gost text-xs uppercase tracking-[0.15em] hover:bg-[var(--drawing-accent)] hover:border-[var(--drawing-accent)] transition-colors">
                    Записаться
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About — О курсе */}
      <section id="about" className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="drawing-frame p-6 md:p-10">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-5">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="section-callout font-gost-upright text-4xl md:text-5xl font-bold tracking-tight">
                    О КУРСЕ
                  </h2>
                </div>
                {/* Чертеж-деталь */}
                <div className="aspect-[4/5] border-[1.5px] border-[var(--drawing-line)] hatching relative mb-8 md:mb-0 flex items-center justify-center">
                  {/* Осевые */}
                  <div className="absolute top-0 bottom-0 left-1/2 extension-line-v"></div>
                  <div className="absolute left-0 right-0 top-1/2 extension-line-h"></div>
                  {/* Деталь */}
                  <div className="w-[60%] aspect-square border-[2px] border-[var(--drawing-line)] bg-[var(--drawing-bg)] flex items-center justify-center">
                    <p className="font-gost-upright text-4xl md:text-5xl font-bold text-[var(--drawing-line)]">УрФУ</p>
                  </div>
                  {/* Размер снизу */}
                  <div className="absolute bottom-4 left-[20%] right-[20%] dimension-line">
                    <span className="font-gost text-[10px] whitespace-nowrap">120</span>
                  </div>
                  {/* Размер справа */}
                  <div className="absolute right-4 top-[20%] font-gost text-[10px] writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
                    <span>80</span>
                  </div>
                  {/* Шероховатость */}
                  <div className="absolute top-3 right-3 roughness-symbol text-[var(--drawing-line-thin)]">
                    Ra 1.6
                  </div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-7 md:pt-16">
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                  Технические требования
                </div>
                <div className="extension-line-h w-full mb-6"></div>
                <p className="font-gost text-sm md:text-base mb-5 text-[var(--drawing-line)] leading-relaxed">
                  Мы — практикующие инженеры‑конструкторы Екатеринбурга с&nbsp;опытом работы на машиностроительных предприятиях. Каждый наш преподаватель сегодня решает реальные производственные задачи.
                </p>
                <p className="font-gost text-xs md:text-sm mb-5 text-[var(--drawing-line-thin)] leading-relaxed">
                  Мы знаем, что требуют комиссии УрФУ, какие ошибки встречаются чаще всего и&nbsp;как правильно выстроить защиту. Вы&nbsp;получаете не&nbsp;теорию из&nbsp;учебников, а живой опыт производственника.
                </p>
                <p className="font-gost text-xs md:text-sm mb-8 text-[var(--drawing-line-thin)] leading-relaxed">
                  Работаем со студентами направлений: технология машиностроения, детали машин, металлорежущие станки, сварка и другие смежные специальности.
                </p>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
                      Наш подход
                    </div>
                    <ul className="space-y-2 font-gost text-xs">
                      <li className="flex items-center gap-2">
                        <span className="w-3 h-[1.5px] bg-[var(--drawing-accent)]"></span>
                        Реальный опыт
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-3 h-[1.5px] bg-[var(--drawing-accent)]"></span>
                        Индивидуально
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-3 h-[1.5px] bg-[var(--drawing-accent)]"></span>
                        Быстрая связь
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-3 h-[1.5px] bg-[var(--drawing-accent)]"></span>
                        Без воды
                      </li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
                      Разделы диплома
                    </div>
                    <ul className="space-y-2 font-gost text-xs">
                      <li className="flex items-center gap-2">
                        <span className="w-3 h-[1.5px] bg-[var(--drawing-line)]"></span>
                        Технологическая часть
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-3 h-[1.5px] bg-[var(--drawing-line)]"></span>
                        Конструкторская часть
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-3 h-[1.5px] bg-[var(--drawing-line)]"></span>
                        Экономика и охрана труда
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-3 h-[1.5px] bg-[var(--drawing-line)]"></span>
                        Чертежи и спецификации
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact — Записаться */}
      <section id="contact" className="py-16 px-4 md:px-8 bg-[var(--drawing-accent)] text-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] opacity-60 mb-2">
                Спецификация · Заявка
              </div>
              <h2 className="font-gost-upright text-4xl md:text-5xl font-bold tracking-tight mb-6">
                ЗАПИСАТЬСЯ
              </h2>
              <p className="font-gost text-sm md:text-base mb-8 leading-relaxed opacity-90">
                Оставьте заявку — свяжемся в&nbsp;течение нескольких часов и&nbsp;подберём программу под ваши сроки.
              </p>

              {/* Спецификация */}
              <table className="w-full border-collapse mb-6">
                <tbody>
                  {[
                    ["Город", "Екатеринбург"],
                    ["Университет", "УрФУ"],
                    ["Формат", "Онлайн и очно"],
                    ["Стандарт", "ГОСТ 2.104-2006"],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-white/20">
                      <td className="font-gost text-[10px] uppercase tracking-[0.15em] opacity-60 py-2 pr-4 w-28">
                        {label}
                      </td>
                      <td className="font-gost text-sm py-2">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className="border-2 border-white/30 p-6 md:p-8">
                <div className="font-gost text-[10px] uppercase tracking-[0.2em] opacity-60 mb-6">
                  Заполнить спецификацию
                </div>
                <form className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block font-gost text-[10px] uppercase tracking-[0.15em] mb-1 opacity-70">
                      Имя
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full bg-transparent border-b-[1.5px] border-white/50 py-2 px-0 font-gost text-sm focus:outline-none focus:border-white placeholder-white/30"
                      placeholder="Ваше имя"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block font-gost text-[10px] uppercase tracking-[0.15em] mb-1 opacity-70">
                      Телефон
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full bg-transparent border-b-[1.5px] border-white/50 py-2 px-0 font-gost text-sm focus:outline-none focus:border-white placeholder-white/30"
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>
                  <div>
                    <label htmlFor="plan" className="block font-gost text-[10px] uppercase tracking-[0.15em] mb-1 opacity-70">
                      Программа
                    </label>
                    <select
                      id="plan"
                      className="w-full bg-transparent border-b-[1.5px] border-white/50 py-2 px-0 font-gost text-sm focus:outline-none focus:border-white appearance-none cursor-pointer"
                    >
                      <option value="" className="text-[var(--drawing-line)]">Выберите программу</option>
                      <option value="3months" className="text-[var(--drawing-line)]">3 месяца — 50 000 ₽</option>
                      <option value="1month" className="text-[var(--drawing-line)]">1 месяц — 25 000 ₽</option>
                      <option value="3days" className="text-[var(--drawing-line)]">3 дня — 10 000 ₽</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="message" className="block font-gost text-[10px] uppercase tracking-[0.15em] mb-1 opacity-70">
                      Тема диплома (если известна)
                    </label>
                    <textarea
                      id="message"
                      rows={2}
                      className="w-full bg-transparent border-b-[1.5px] border-white/50 py-2 px-0 font-gost text-sm focus:outline-none focus:border-white placeholder-white/30 resize-none"
                      placeholder="Кратко опишите тему или специальность"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full border-2 border-white bg-white text-[var(--drawing-accent)] py-3 font-gost text-xs uppercase tracking-[0.15em] hover:bg-transparent hover:text-white transition-colors"
                  >
                    Отправить заявку
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer — нижний штамп чертежа */}
      <footer className="py-6 px-4 md:px-8 border-t-[2.5px] border-[var(--drawing-line)]">
        <div className="max-w-[1200px] mx-auto">
          <table className="stamp-table w-full md:w-auto md:ml-auto">
            <tbody>
              <tr>
                <td className="thick-border" rowSpan={2}>
                  <span className="text-sm font-bold not-italic">ДИПЛОМ.ИНЖ</span>
                </td>
                <td>Изм.</td>
                <td>Лист</td>
                <td>№ докум.</td>
                <td>Подп.</td>
                <td>Дата</td>
              </tr>
              <tr>
                <td>1</td>
                <td>1</td>
                <td>ДП-001</td>
                <td></td>
                <td>2026</td>
              </tr>
              <tr>
                <td className="thick-border text-[9px]">
                  Курсы дипломного проектирования
                </td>
                <td colSpan={2} className="text-[9px]">Екатеринбург</td>
                <td colSpan={2} className="text-[9px]">УрФУ</td>
                <td className="text-[9px]">Лист 1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </footer>
    </main>
  );
}
