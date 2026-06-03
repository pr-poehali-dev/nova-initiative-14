/**
 * Блок «Дорожные карты» в личном кабинете (для администратора и владельца).
 *
 * Собирает все внутренние дорожные карты из реестра src/lib/roadmaps.ts.
 * Реализованные карты — кликабельны (ведут на свою страницу), будущие —
 * показаны как направления с бейджем «Планируется». Блок расширяется
 * добавлением записи в ROADMAPS, без правок этого компонента.
 */
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ROADMAPS, ROADMAP_STATE_META } from "@/lib/roadmaps";

export default function RoadmapsBlock() {
  return (
    <section className="drawing-frame p-6 bg-[var(--drawing-bg)] mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="Map" size={18} />
        <h2 className="font-gost-upright text-sm uppercase tracking-widest">
          Дорожные карты
        </h2>
        <span className="inline-flex items-center gap-1 bg-[var(--drawing-line)] text-[var(--drawing-bg)] px-1.5 py-0.5 font-gost text-[9px] uppercase tracking-wider ml-1">
          <Icon name="Lock" size={9} /> Внутреннее
        </span>
      </div>
      <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-4 leading-snug">
        Планы развития продукта&nbsp;— существующие и&nbsp;будущие направления.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {ROADMAPS.map((rm) => {
          const meta = ROADMAP_STATE_META[rm.state];
          const inner = (
            <>
              <Icon
                name={rm.icon}
                size={22}
                fallback="Map"
                className={`shrink-0 mt-0.5 ${rm.href ? "text-[var(--drawing-accent)]" : "text-[var(--drawing-line-thin)]"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p
                    className={`font-gost-upright font-bold text-sm ${rm.href ? "group-hover:text-[var(--drawing-accent)] transition-colors" : ""}`}
                  >
                    {rm.title}
                  </p>
                  <span
                    className={`inline-flex items-center font-gost text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug mt-0.5">
                  {rm.description}
                </p>
              </div>
              {rm.href && (
                <Icon
                  name="ArrowRight"
                  size={16}
                  className="text-[var(--drawing-line-thin)] shrink-0 mt-1 group-hover:text-[var(--drawing-accent)] transition-colors"
                />
              )}
            </>
          );

          return rm.href ? (
            <Link
              key={rm.key}
              to={rm.href}
              className="flex items-start gap-3 border-[1.5px] border-[var(--drawing-line)] hover:border-[var(--drawing-accent)] p-3 transition-colors group"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={rm.key}
              className="flex items-start gap-3 border-[1.5px] border-dashed border-[var(--drawing-line)]/40 p-3 opacity-80"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
