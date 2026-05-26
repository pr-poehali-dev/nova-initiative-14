import { Link } from "react-router-dom";

/**
 * CTA-секция в конце страницы /program: «Записаться на диагностику».
 * Ссылается на /contacts, обещает ответ в Telegram в течение 2 часов.
 */
export default function ProgramCta() {
  return (
    <section className="py-20 px-4 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="drawing-frame p-8 md:p-12 text-center">
          <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
            Записаться на диагностику
          </h2>
          <div className="extension-line-h w-32 mx-auto my-5" />
          <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-lg mx-auto mb-8">
            Определим, какие модули нужны именно вам. Разберём тему, план или черновик за 20&ndash;30 минут&nbsp;&mdash; бесплатно и без обязательств.
          </p>
          <Link to="/contacts" className="btn-drawing btn-drawing-accent text-sm inline-block">
            Записаться на диагностику ВКР
          </Link>
          <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 mt-4">
            Ответим в Telegram в течение 2 часов в рабочее время (10:00&ndash;20:00).
          </p>
        </div>
      </div>
    </section>
  );
}
