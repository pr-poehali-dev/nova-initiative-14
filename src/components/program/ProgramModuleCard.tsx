import Icon from "@/components/ui/icon";
import type { ProgramModule } from "@/data/program-modules";

/**
 * Карточка одного модуля программы: номер, название, тег «опционально»,
 * блок «Результат модуля», 2 колонки (что делаем / типовые ошибки),
 * строка «Артефакты:».
 *
 * Чередование штриховки (hatching) — за пределами этого компонента,
 * чтобы родитель управлял раскладкой массива модулей.
 */
export default function ProgramModuleCard({
  module: m,
  withHatching = false,
}: {
  module: ProgramModule;
  withHatching?: boolean;
}) {
  return (
    <div
      id={`module-${m.num}`}
      className={`drawing-frame p-6 md:p-8 relative ${withHatching ? "hatching" : ""}`}
    >
      <div className="zone-marker top-2 right-3">
        {m.optional ? "опц." : `М${m.num}`}
      </div>

      <div className="flex items-start gap-4 md:gap-6 mb-6">
        <span className="font-gost-upright text-5xl md:text-6xl font-bold text-[var(--drawing-line)] opacity-10 leading-none shrink-0 select-none">
          {m.num}
        </span>
        <div className="pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-gost-upright text-xl md:text-2xl font-bold tracking-tight text-[var(--drawing-line)]">
              {m.title}
            </h3>
            {m.optional && (
              <span className="font-gost text-[9px] uppercase tracking-widest text-[var(--drawing-accent)] border border-[var(--drawing-accent)] px-2 py-0.5">
                опционально
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 border-l-[3px] border-[var(--drawing-accent)] bg-[rgba(192,57,43,0.04)]">
        <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-1">
          Результат модуля
        </div>
        <p className="font-gost text-sm text-[var(--drawing-line)] leading-relaxed">
          {m.result}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Что делаем
          </div>
          <ul className="space-y-2.5">
            {m.tasks.map((t, ti) => (
              <li
                key={ti}
                className="flex items-start gap-2.5 font-gost text-xs text-[var(--drawing-line)] leading-relaxed"
              >
                <span className="w-3.5 h-[2px] bg-[var(--drawing-accent)] mt-2 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Типовые ошибки
          </div>
          <ul className="space-y-2.5">
            {m.mistakes.map((e, ei) => (
              <li
                key={ei}
                className="flex items-start gap-2.5 font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed"
              >
                <span className="mt-0.5 shrink-0 text-[var(--drawing-accent)]">
                  <Icon name="AlertTriangle" size={12} />
                </span>
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="extension-line-h w-full mb-4" />
      <div className="flex items-start gap-2">
        <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] shrink-0 mt-0.5">
          Артефакты:
        </span>
        <p className="font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
          {m.artifacts}
        </p>
      </div>
    </div>
  );
}
