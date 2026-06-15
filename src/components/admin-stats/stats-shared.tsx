import Icon from "@/components/ui/icon";

/** Человекочитаемые названия типов расчётных моделей. */
export const TYPE_LABEL: Record<string, string> = {
  frame_3d: "Рама 3D",
  frame_2d: "Рама 2D",
  truss_3d: "Ферма 3D",
  truss_2d: "Ферма 2D",
  beam: "Балка",
  unknown: "Прочее",
};
export const typeLabel = (t: string) => TYPE_LABEL[t] || t;

/** Дни-периоды для переключателя. */
export const PERIODS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
];

/** Цвет столбика источника по типу. */
export const SOURCE_COLOR: Record<string, string> = {
  qr_flyer: "#c0392b",
  utm: "#2c3e80",
  organic: "#1a8a5a",
  social: "#7d3c98",
  referral: "#d97706",
  direct: "#3a3a5e",
  internal: "#9aa0c0",
  unknown: "#9aa0c0",
};

export function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: number; accent?: boolean }) {
  const display = Number.isInteger(value) ? value : value.toFixed(1);
  return (
    <div
      className={`border-2 bg-[var(--drawing-bg)] p-4 ${
        accent && value > 0 ? "border-[var(--drawing-accent)]" : "border-[var(--drawing-line)]"
      }`}
    >
      <Icon name={icon} size={18} className="text-[var(--drawing-accent)] mb-1" />
      <p className="font-gost-upright text-2xl font-black text-[var(--drawing-line)]">{display}</p>
      <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
        {label}
      </p>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

export function Empty() {
  return (
    <p className="font-gost text-sm text-[var(--drawing-line-thin)] italic">
      Пока нет данных за выбранный период.
    </p>
  );
}

/** Горизонтальные бары по подписи + количеству (универсальный). */
export function CountBars({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="font-gost text-xs text-[var(--drawing-line)] w-28 shrink-0 truncate" title={it.label}>
            {it.label}
          </span>
          <div className="flex-1 h-5 bg-[var(--drawing-paper)] border border-[var(--drawing-line)]/20">
            <div
              className="h-full bg-[var(--drawing-line)]"
              style={{ width: `${(it.count / max) * 100}%` }}
            />
          </div>
          <span className="font-mono text-xs text-[var(--drawing-line)] w-10 text-right shrink-0">
            {it.count}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Таблица «человек → две метрики» (рефералы, активность). */
export function PeopleTable({
  rows,
  colA,
  colB,
}: {
  rows: { name: string; a: number | string; b: number | string }[];
  colA: string;
  colB: string;
}) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pb-1 border-b border-[var(--drawing-line)]/30">
        <span className="flex-1 font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Пользователь
        </span>
        <span className="w-20 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          {colA}
        </span>
        <span className="w-20 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          {colB}
        </span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <span className="flex-1 font-gost text-xs text-[var(--drawing-line)] truncate" title={r.name}>
            {r.name}
          </span>
          <span className="w-20 text-right font-mono text-sm font-bold text-[var(--drawing-line)]">
            {r.a}
          </span>
          <span className="w-20 text-right font-mono text-xs text-[var(--drawing-line-thin)]">
            {r.b}
          </span>
        </div>
      ))}
    </div>
  );
}
