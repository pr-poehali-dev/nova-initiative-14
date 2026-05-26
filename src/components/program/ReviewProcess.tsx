import { REVIEW_STEPS } from "@/data/program-modules";

/**
 * Секция «Как мы проверяем ваши материалы»:
 * 5 пронумерованных шагов о процессе сдачи и фидбэка от наставника.
 */
export default function ReviewProcess() {
  return (
    <section className="py-16 px-4 md:px-8 bg-[var(--drawing-paper)]">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="section-callout font-gost-upright text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Как мы проверяем ваши материалы
        </h2>
        <div className="extension-line-h w-48 mb-10" />

        <div className="drawing-frame p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REVIEW_STEPS.map((s) => (
              <div
                key={s.num}
                className={`flex items-start gap-4 ${s.fullWidth ? "md:col-span-2" : ""}`}
              >
                <span className="shrink-0 w-7 h-7 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-xs font-bold">
                  {s.num}
                </span>
                <div>
                  <p className="font-gost-upright text-sm font-bold mb-1">{s.title}</p>
                  <p
                    className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: s.description }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
