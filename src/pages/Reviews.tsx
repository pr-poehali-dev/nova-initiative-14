import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const Reviews = () => {
  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">Т1</div>
          <div className="zone-marker top-2 right-3">Зона IX</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Отзывы и истории учеников&nbsp;&middot; Диплом-Инж.рф
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            <span className="text-[var(--drawing-accent)]">Истории</span>
            <br />
            учеников
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Здесь будут отзывы наших учеников и&nbsp;их истории защит&nbsp;&mdash; от&nbsp;первой консультации до&nbsp;диплома в&nbsp;руках.
          </p>
        </div>
      </section>

      <section className="pb-20 px-4 md:px-8 max-w-[800px] mx-auto">
        <div className="drawing-frame p-8 md:p-12 text-center hatching">
          <div className="flex justify-center mb-5">
            <span className="w-14 h-14 border-[2px] border-[var(--drawing-line)] flex items-center justify-center text-[var(--drawing-line)]">
              <Icon name="MessageSquareQuote" size={28} />
            </span>
          </div>
          <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
            Скоро здесь появятся <span className="text-[var(--drawing-accent)]">истории</span>
          </h2>
          <div className="extension-line-h w-32 mx-auto my-5" />
          <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-md mx-auto mb-6">
            Мы только начинаем собирать коллекцию отзывов. Каждая успешная защита наших учеников&nbsp;&mdash; это история, которой мы хотим поделиться.
          </p>
          <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed max-w-md mx-auto mb-8">
            Если вы&nbsp;уже работали с&nbsp;нами и&nbsp;хотите поделиться опытом&nbsp;&mdash; будем благодарны.
          </p>
          <Link to="/contacts" className="btn-drawing btn-drawing-accent text-xs inline-block">
            Поделиться опытом
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Reviews;
