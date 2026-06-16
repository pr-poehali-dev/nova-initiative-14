/**
 * Финансовый калькулятор бизнес-плана.
 *
 * Ввод параметров (цена, переменные/постоянные затраты, объём, рост, вложения)
 * → автоматический расчёт маржи, операционной прибыли, точки безубыточности и
 * окупаемости + два графика: помесячная прибыль и накопленный денежный поток.
 *
 * Компонент управляемый: данные и onChange приходят сверху (страница хранит
 * состояние и сохраняет на сервер).
 */
import { useMemo } from "react";
import Icon from "@/components/ui/icon";
import {
  type FinanceData,
  type FixedCost,
  computeMetrics,
  projectMonths,
  fmtRub,
} from "@/lib/finance";

interface Props {
  data: FinanceData;
  onChange: (next: FinanceData) => void;
}

export default function FinanceCalculator({ data, onChange }: Props) {
  const metrics = useMemo(() => computeMetrics(data), [data]);
  const months = useMemo(() => projectMonths(data), [data]);

  const setField = (field: keyof FinanceData, value: number) =>
    onChange({ ...data, [field]: value });

  const setFixed = (id: string, patch: Partial<FixedCost>) =>
    onChange({ ...data, fixedCosts: data.fixedCosts.map((f) => (f.id === id ? { ...f, ...patch } : f)) });

  const addFixed = () =>
    onChange({
      ...data,
      fixedCosts: [...data.fixedCosts, { id: `f_${Date.now().toString(36)}`, name: "Новая статья", amount: 0 }],
    });

  const removeFixed = (id: string) =>
    onChange({ ...data, fixedCosts: data.fixedCosts.filter((f) => f.id !== id) });

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-5">
      {/* ЛЕВО: ввод параметров */}
      <div className="space-y-4">
        <Section title="Юнит-экономика">
          <NumField label="Цена за единицу / подписку, ₽" value={data.price} onChange={(v) => setField("price", v)} />
          <NumField label="Переменные затраты на единицу, ₽" value={data.variableCost} onChange={(v) => setField("variableCost", v)} />
          <NumField label="Продаж в месяц (старт), шт." value={data.unitsPerMonth} onChange={(v) => setField("unitsPerMonth", v)} />
          <NumField label="Помесячный рост продаж, %" value={data.monthlyGrowthPct} onChange={(v) => setField("monthlyGrowthPct", v)} />
        </Section>

        <Section title="Постоянные затраты, ₽/мес">
          <div className="space-y-2">
            {data.fixedCosts.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <input
                  value={f.name}
                  onChange={(e) => setFixed(f.id, { name: e.target.value })}
                  className="drawing-input flex-1 text-xs"
                />
                <input
                  type="number"
                  value={f.amount}
                  onChange={(e) => setFixed(f.id, { amount: Number(e.target.value) || 0 })}
                  className="drawing-input w-28 text-xs text-right"
                />
                <button onClick={() => removeFixed(f.id)} className="text-[var(--drawing-line-thin)] hover:text-red-600 p-1" aria-label="Удалить">
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            ))}
            <button onClick={addFixed} className="btn-drawing text-xs inline-flex items-center gap-1">
              <Icon name="Plus" size={14} />Добавить статью
            </button>
          </div>
        </Section>

        <Section title="Инвестиции и горизонт">
          <NumField label="Стартовые вложения, ₽" value={data.initialInvestment} onChange={(v) => setField("initialInvestment", v)} />
          <NumField label="Горизонт прогноза, мес." value={data.horizonMonths} onChange={(v) => setField("horizonMonths", v)} />
        </Section>
      </div>

      {/* ПРАВО: метрики + графики */}
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Metric icon="Coins" label="Маржа с единицы" value={fmtRub(metrics.marginPerUnit)} hint={`${metrics.marginPct.toFixed(0)}%`} accent />
          <Metric icon="TrendingUp" label="Выручка / мес" value={fmtRub(metrics.revenue)} />
          <Metric
            icon={metrics.profit >= 0 ? "ArrowUpRight" : "ArrowDownRight"}
            label="Прибыль / мес"
            value={fmtRub(metrics.profit)}
            negative={metrics.profit < 0}
          />
          <Metric icon="Target" label="Безубыточность" value={isFinite(metrics.breakEvenUnits) ? `${Math.ceil(metrics.breakEvenUnits)} шт.` : "—"} hint={isFinite(metrics.breakEvenRevenue) ? fmtRub(metrics.breakEvenRevenue) : undefined} />
          <Metric icon="Wallet" label="Постоянные / мес" value={fmtRub(metrics.totalFixed)} />
          <Metric icon="Clock" label="Окупаемость" value={metrics.paybackMonths ? `${metrics.paybackMonths} мес.` : "> 60 мес."} negative={!metrics.paybackMonths} />
        </div>

        <ChartCard title="Прибыль по месяцам">
          <BarChart points={months.map((m) => ({ x: m.month, y: m.profit }))} />
        </ChartCard>

        <ChartCard title="Денежный поток нарастающим итогом (с учётом вложений)">
          <LineChart points={months.map((m) => ({ x: m.month, y: m.cumulativeProfit }))} />
        </ChartCard>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--drawing-line)]/40 p-3">
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1 mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="drawing-input w-full text-sm"
      />
    </label>
  );
}

function Metric({ icon, label, value, hint, accent, negative }: { icon: string; label: string; value: string; hint?: string; accent?: boolean; negative?: boolean }) {
  return (
    <div className={`border p-3 bg-[var(--drawing-paper)] ${accent ? "border-2 border-[var(--drawing-accent)]" : "border-[var(--drawing-line)]/40"}`}>
      <Icon name={icon} size={15} className={`mb-1 ${negative ? "text-red-600" : "text-[var(--drawing-accent)]"}`} />
      <p className={`font-gost-upright text-lg font-black leading-tight ${negative ? "text-red-600" : ""}`}>{value}</p>
      <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">{label}{hint ? ` · ${hint}` : ""}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--drawing-line)]/40 p-3">
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">{title}</p>
      {children}
    </div>
  );
}

// ===== Простые SVG-графики (без зависимостей) =====

const W = 760;
const H = 220;
const PAD = 34;

function scale(points: { x: number; y: number }[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const sx = (x: number) => PAD + ((x - minX) / Math.max(1, maxX - minX)) * (W - PAD * 2);
  const sy = (y: number) => H - PAD - ((y - minY) / Math.max(1, maxY - minY)) * (H - PAD * 2);
  return { sx, sy, minY, maxY, y0: sy(0) };
}

function BarChart({ points }: { points: { x: number; y: number }[] }) {
  const { sx, sy, y0 } = scale(points);
  const bw = ((W - PAD * 2) / points.length) * 0.6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <line x1={PAD} y1={y0} x2={W - PAD} y2={y0} stroke="var(--drawing-line)" strokeWidth={1} opacity={0.5} />
      {points.map((p, i) => {
        const x = sx(p.x) - bw / 2;
        const yTop = p.y >= 0 ? sy(p.y) : y0;
        const h = Math.abs(sy(p.y) - y0);
        return (
          <rect
            key={i}
            x={x}
            y={yTop}
            width={bw}
            height={h}
            fill={p.y >= 0 ? "var(--drawing-accent)" : "#dc2626"}
            opacity={0.85}
          />
        );
      })}
      {points.map((p, i) => (
        i % Math.ceil(points.length / 12) === 0 ? (
          <text key={`t${i}`} x={sx(p.x)} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--drawing-line-thin)">
            {p.x}
          </text>
        ) : null
      ))}
    </svg>
  );
}

function LineChart({ points }: { points: { x: number; y: number }[] }) {
  const { sx, sy, y0 } = scale(points);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x)} ${sy(p.y)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <line x1={PAD} y1={y0} x2={W - PAD} y2={y0} stroke="var(--drawing-line)" strokeWidth={1} opacity={0.5} strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="var(--drawing-accent)" strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill={p.y >= 0 ? "var(--drawing-accent)" : "#dc2626"} />
      ))}
      {points.map((p, i) => (
        i % Math.ceil(points.length / 12) === 0 ? (
          <text key={`t${i}`} x={sx(p.x)} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--drawing-line-thin)">
            {p.x}
          </text>
        ) : null
      ))}
    </svg>
  );
}
