import { useCountUp } from "@/hooks/useCountUp";

interface Stat {
  value: number;
  prefix?: string;
  suffix: string;
  label: string;
}

/**
 * Блок проверяемых фактов о формате работы (не маркетинговые обещания).
 * Цифры анимируются при появлении в зоне видимости.
 */
const STATS: Stat[] = [
  { value: 30, prefix: "до ", suffix: " мин", label: "Бесплатная диагностика ВКР" },
  { value: 6, suffix: " этапов", label: "От плана до защиты" },
  { value: 48, prefix: "до ", suffix: " ч", label: "Срок проверки материалов" },
  { value: 30, prefix: "до ", suffix: " стр/нед", label: "Объём проверки в рамках тарифа" },
];

function StatCard({ stat }: { stat: Stat }) {
  const { ref, value } = useCountUp(stat.value);
  return (
    <div className="border-[1.5px] border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-5 text-center">
      <p
        ref={ref as React.RefObject<HTMLParagraphElement>}
        className="font-gost-upright text-2xl md:text-3xl font-black text-[var(--drawing-accent)] leading-none mb-2"
      >
        {stat.prefix}
        {value}
        {stat.suffix}
      </p>
      <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">
        {stat.label}
      </p>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="py-12 px-4 md:px-8 border-t-[2.5px] border-[var(--drawing-line)]">
      <div className="max-w-[1200px] mx-auto">
        <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-6 text-center">
          Регламент работы &middot; проверяемые факты, а&nbsp;не&nbsp;обещания
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <StatCard key={s.label} stat={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
