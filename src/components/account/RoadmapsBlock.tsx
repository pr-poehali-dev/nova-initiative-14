/**
 * Блок «Дорожные карты» в личном кабинете (для администратора и владельца).
 *
 * Единая точка доступа ко ВСЕМ дорожным картам продукта из реестра
 * src/lib/roadmaps.ts. У каждой карты — название, описание, бейдж статуса и
 * пометка с расположением исходного файла. Клик открывает карту на странице
 * /roadmaps/:slug. Блок расширяется добавлением записи в ROADMAPS.
 */
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ROADMAPS, ROADMAP_STATE_META, roadmapStats } from "@/lib/roadmaps";

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
        Все планы развития продукта собраны в&nbsp;одном месте&nbsp;— этапы,
        статусы задач и&nbsp;ссылки на&nbsp;исходные документы.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {ROADMAPS.map((rm) => {
          const meta = ROADMAP_STATE_META[rm.state];
          const stats = roadmapStats(rm);
          return (
            <Link
              key={rm.slug}
              to={`/roadmaps/${rm.slug}`}
              className="flex items-start gap-3 border-[1.5px] border-[var(--drawing-line)] hover:border-[var(--drawing-accent)] p-3 transition-colors group"
            >
              <Icon
                name={rm.icon}
                size={22}
                fallback="Map"
                className="text-[var(--drawing-accent)] shrink-0 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-gost-upright font-bold text-sm group-hover:text-[var(--drawing-accent)] transition-colors">
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <span className="font-gost text-[9px] uppercase tracking-wider text-green-700">
                    Готово {stats.done}/{stats.total}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] text-[var(--drawing-line-thin)] truncate">
                    <Icon name="FileCode" size={9} />
                    {rm.source}
                  </span>
                </div>
              </div>
              <Icon
                name="ArrowRight"
                size={16}
                className="text-[var(--drawing-line-thin)] shrink-0 mt-1 group-hover:text-[var(--drawing-accent)] transition-colors"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
