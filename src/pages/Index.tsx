export default function Index() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-black">
        <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <a href="/" className="text-xl font-bold tracking-tighter">
            ДИПЛОМ.ИНЖ
          </a>
          <div className="flex space-x-8">
            <a href="#programs" className="text-sm uppercase tracking-widest hover:text-red-600 transition-colors">
              Программы
            </a>
            <a href="#about" className="text-sm uppercase tracking-widest hover:text-red-600 transition-colors">
              О курсе
            </a>
            <a href="#contact" className="text-sm uppercase tracking-widest hover:text-red-600 transition-colors">
              Записаться
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 md:px-8 container mx-auto">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-7 mb-8 md:mb-0">
            <h1 className="text-8xl md:text-9xl font-bold tracking-tighter leading-none mb-6">
              ДИП
              <br />
              ЛОМ
            </h1>
            <p className="text-xl max-w-xl">
              Курсы по разработке дипломного проекта в машиностроении. Вас обучают действующие инженеры-конструкторы — те, кто решает реальные задачи на производстве каждый день.
            </p>
            <div className="mt-8 flex gap-4">
              <a
                href="#programs"
                className="bg-black text-white px-8 py-4 text-sm uppercase tracking-widest hover:bg-red-600 transition-colors"
              >
                Выбрать программу
              </a>
            </div>
          </div>
          <div className="col-span-12 md:col-span-5 flex items-center justify-center">
            <div className="relative w-full aspect-square bg-red-600 flex items-end p-8">
              <div className="text-white">
                <p className="text-sm uppercase tracking-widest mb-2">Екатеринбург · УрФУ</p>
                <p className="text-4xl font-bold tracking-tighter leading-none">Инженеры<br/>обучают<br/>инженеров</p>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-black"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs / Pricing Section */}
      <section id="programs" className="py-20 px-4 md:px-8 bg-black text-white">
        <div className="container mx-auto">
          <h2 className="text-6xl font-bold tracking-tighter mb-12">ПРОГРАММЫ</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Plan 1 */}
            <div className="group border border-neutral-700 p-8 hover:border-red-600 transition-colors duration-300">
              <div className="mb-6">
                <span className="text-8xl font-bold text-neutral-700 group-hover:text-red-600 transition-colors duration-300">03</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight">3 месяца</h3>
              <p className="text-neutral-400 mb-8">Полное сопровождение дипломного проекта от постановки задачи до защиты. Глубокая проработка всех разделов.</p>
              <div className="border-t border-neutral-700 pt-6">
                <p className="text-4xl font-bold tracking-tighter">50 000 ₽</p>
                <ul className="mt-6 space-y-2 text-neutral-400 text-sm">
                  <li>— Индивидуальный куратор-инженер</li>
                  <li>— Проверка и правки всех разделов</li>
                  <li>— Подготовка к защите</li>
                  <li>— Консультации без ограничений</li>
                </ul>
                <a href="#contact" className="mt-8 block text-center bg-white text-black py-3 text-sm uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors">
                  Записаться
                </a>
              </div>
            </div>

            {/* Plan 2 */}
            <div className="group border border-red-600 p-8 relative">
              <div className="absolute top-4 right-4 bg-red-600 text-white text-xs uppercase tracking-widest px-3 py-1">
                Популярный
              </div>
              <div className="mb-6">
                <span className="text-8xl font-bold text-red-600">01</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight">1 месяц</h3>
              <p className="text-neutral-400 mb-8">Интенсивная работа над ключевыми разделами диплома. Оптимальный баланс глубины и скорости.</p>
              <div className="border-t border-neutral-700 pt-6">
                <p className="text-4xl font-bold tracking-tighter">25 000 ₽</p>
                <ul className="mt-6 space-y-2 text-neutral-400 text-sm">
                  <li>— Куратор-инженер на месяц</li>
                  <li>— Проверка основных разделов</li>
                  <li>— Советы по защите</li>
                  <li>— До 10 консультаций</li>
                </ul>
                <a href="#contact" className="mt-8 block text-center bg-red-600 text-white py-3 text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                  Записаться
                </a>
              </div>
            </div>

            {/* Plan 3 */}
            <div className="group border border-neutral-700 p-8 hover:border-red-600 transition-colors duration-300">
              <div className="mb-6">
                <span className="text-8xl font-bold text-neutral-700 group-hover:text-red-600 transition-colors duration-300">3Д</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight">3 дня</h3>
              <p className="text-neutral-400 mb-8">Экстренная помощь: быстрая проверка, критические правки и подготовка к защите в сжатые сроки.</p>
              <div className="border-t border-neutral-700 pt-6">
                <p className="text-4xl font-bold tracking-tighter">10 000 ₽</p>
                <ul className="mt-6 space-y-2 text-neutral-400 text-sm">
                  <li>— Экспресс-аудит диплома</li>
                  <li>— Критические правки</li>
                  <li>— Подготовка к вопросам комиссии</li>
                  <li>— 3 консультации</li>
                </ul>
                <a href="#contact" className="mt-8 block text-center bg-white text-black py-3 text-sm uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors">
                  Записаться
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-5">
              <h2 className="text-6xl font-bold tracking-tighter mb-8">О КУРСЕ</h2>
              <div className="aspect-[4/5] bg-neutral-100 relative mb-8 md:mb-0 flex items-center justify-center">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border-2 border-black"></div>
                <p className="text-6xl font-bold text-black z-10">УрФУ</p>
              </div>
            </div>
            <div className="col-span-12 md:col-span-7 md:pt-24">
              <p className="text-xl mb-6">
                Мы — практикующие инженеры-конструкторы Екатеринбурга с опытом работы на машиностроительных предприятиях. Каждый наш преподаватель сегодня решает реальные производственные задачи.
              </p>
              <p className="mb-6">
                Мы знаем, что требуют комиссии УрФУ, какие ошибки встречаются чаще всего и как правильно выстроить защиту. Вы получаете не теорию из учебников, а живой опыт производственника.
              </p>
              <p className="mb-6">
                Работаем со студентами направлений: технология машиностроения, детали машин, металлорежущие станки, сварка и другие смежные специальности.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-12">
                <div>
                  <h3 className="text-sm uppercase tracking-widest mb-2">Наш подход</h3>
                  <ul className="space-y-2">
                    <li>Реальный опыт</li>
                    <li>Индивидуально</li>
                    <li>Быстрая связь</li>
                    <li>Без воды</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm uppercase tracking-widest mb-2">Разделы диплома</h3>
                  <ul className="space-y-2">
                    <li>Технологическая часть</li>
                    <li>Конструкторская часть</li>
                    <li>Экономика и охрана труда</li>
                    <li>Чертежи и спецификации</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 md:px-8 bg-red-600 text-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-6xl font-bold tracking-tighter mb-8">ЗАПИСАТЬСЯ</h2>
              <p className="text-xl mb-8">Оставьте заявку — свяжемся в течение нескольких часов и подберём программу под ваши сроки.</p>
              <div className="space-y-4">
                <p className="flex items-center">
                  <span className="w-28 text-sm uppercase tracking-widest">Город</span>
                  <span>Екатеринбург</span>
                </p>
                <p className="flex items-center">
                  <span className="w-28 text-sm uppercase tracking-widest">Университет</span>
                  <span>УрФУ</span>
                </p>
                <p className="flex items-center">
                  <span className="w-28 text-sm uppercase tracking-widest">Формат</span>
                  <span>Онлайн и очно</span>
                </p>
              </div>
            </div>
            <div>
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm uppercase tracking-widest mb-2">
                    Имя
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full bg-transparent border-b-2 border-white py-2 px-0 focus:outline-none focus:border-black placeholder-white/50"
                    placeholder="Ваше имя"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm uppercase tracking-widest mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className="w-full bg-transparent border-b-2 border-white py-2 px-0 focus:outline-none focus:border-black placeholder-white/50"
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>
                <div>
                  <label htmlFor="plan" className="block text-sm uppercase tracking-widest mb-2">
                    Программа
                  </label>
                  <select
                    id="plan"
                    className="w-full bg-transparent border-b-2 border-white py-2 px-0 focus:outline-none focus:border-black text-white appearance-none cursor-pointer"
                  >
                    <option value="" className="text-black">Выберите программу</option>
                    <option value="3months" className="text-black">3 месяца — 50 000 ₽</option>
                    <option value="1month" className="text-black">1 месяц — 25 000 ₽</option>
                    <option value="3days" className="text-black">3 дня — 10 000 ₽</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm uppercase tracking-widest mb-2">
                    Тема диплома (если известна)
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    className="w-full bg-transparent border-b-2 border-white py-2 px-0 focus:outline-none focus:border-black placeholder-white/50 resize-none"
                    placeholder="Кратко опишите тему или специальность"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-black text-white py-4 text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                >
                  Отправить заявку
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-8 border-t border-black">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="font-bold tracking-tighter text-lg mb-4 md:mb-0">ДИПЛОМ.ИНЖ</p>
          <p className="text-sm text-neutral-500">Екатеринбург · УрФУ · Машиностроение</p>
          <p className="text-sm text-neutral-500 mt-4 md:mt-0">© 2026 Все права защищены</p>
        </div>
      </footer>
    </main>
  );
}
