import { Link } from "react-router-dom";
import useAbout from "@/hooks/useAbout";
import Seo from "@/components/Seo";

const About = () => {
  const { sections, loading } = useAbout();

  return (
    <main className="min-h-screen grid-bg">
      <Seo />
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">О1</div>
          <div className="zone-marker top-2 right-3">Зона VIII</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            О нас&nbsp;&middot; Диплом-Инж.рф
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Почему <span className="text-[var(--drawing-accent)]">мы</span>,
            <br />а не кто-то ещё
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Здесь о&nbsp;том, как мы начинались, во&nbsp;что верим и&nbsp;почему делаем то, что делаем.
          </p>
        </div>
      </section>

      <section className="pb-20 px-4 md:px-8 max-w-[1000px] mx-auto">
        {loading && (
          <div className="font-gost text-sm text-[var(--drawing-line-thin)] text-center py-10">
            Загрузка…
          </div>
        )}
        {!loading && sections.length === 0 && (
          <div className="drawing-frame p-8 text-center">
            <p className="font-gost text-sm text-[var(--drawing-line-thin)]">
              Раздел скоро будет наполнен.
            </p>
          </div>
        )}
        <div className="space-y-10">
          {sections.map((s, idx) => (
            <article key={s.id} className="drawing-frame p-6 md:p-8">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                Раздел {String(idx + 1).padStart(2, "0")}
              </div>
              <h2 className="font-gost-upright text-xl md:text-2xl font-bold tracking-tight text-[var(--drawing-line)] mb-3">
                {s.title}
              </h2>
              <div className="extension-line-h w-32 mb-4" />
              <p className="font-gost text-sm md:text-base text-[var(--drawing-line)] leading-relaxed whitespace-pre-line">
                {s.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link to="/contacts" className="btn-drawing btn-drawing-accent text-xs">
            Записаться на бесплатную диагностику
          </Link>
        </div>
      </section>
    </main>
  );
};

export default About;