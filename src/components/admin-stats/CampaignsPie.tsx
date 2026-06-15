import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  fetchCampaignsOverview,
  formatRub,
  type CampaignsOverview,
} from "@/lib/adCampaigns";

/** Человекочитаемые названия типов источников. */
const SOURCE_LABEL: Record<string, string> = {
  qr_flyer: "QR-флаер (офлайн)",
  utm: "UTM-ссылки",
  organic: "Поиск",
  social: "Соцсети",
  referral: "Переходы с сайтов",
  direct: "Прямые заходы",
  internal: "Внутренние",
  unknown: "Неизвестно",
};

/** Цвета сегментов круговой диаграммы. */
const COLORS = ["#c0392b", "#2c3e80", "#1a8a5a", "#7d3c98", "#d97706", "#3a3a5e", "#9aa0c0", "#5a5a78"];

/** Строит SVG-донат по сегментам [{label, value}]. */
function Donut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <p className="font-gost text-sm text-[var(--drawing-line-thin)] italic py-8 text-center">
        Пока нет данных по источникам регистраций.
      </p>
    );
  }
  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 160" className="w-40 h-40 shrink-0 -rotate-90">
      {data.map((d, i) => {
        const frac = d.value / total;
        const len = frac * C;
        const seg = (
          <circle
            key={i}
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke={d.color}
            strokeWidth="22"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return seg;
      })}
    </svg>
  );
}

/**
 * Сводный блок эффективности рекламы: круговая диаграмма распределения
 * регистраций по типам источников (онлайн + офлайн) и таблица топ-кампаний
 * с регистрациями и доходом.
 */
export default function CampaignsPie() {
  const [data, setData] = useState<CampaignsOverview | null>(null);

  useEffect(() => {
    fetchCampaignsOverview().then((r) => {
      if (r.ok && r.data) setData(r.data);
    });
  }, []);

  if (!data) return null;

  const segments = data.by_source_type
    .filter((s) => s.signups > 0)
    .map((s, i) => ({
      label: SOURCE_LABEL[s.sourceType] || s.sourceType,
      value: s.signups,
      color: COLORS[i % COLORS.length],
    }));
  const totalSignups = segments.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3 mt-10">
        Эффективность рекламы (онлайн + офлайн)
      </p>

      <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Donut data={segments} />
          <div className="flex-1 w-full space-y-1.5">
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
              Откуда приходят регистрации
            </p>
            {segments.length === 0 && (
              <p className="font-gost text-sm text-[var(--drawing-line-thin)] italic">Нет данных.</p>
            )}
            {segments.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 shrink-0" style={{ background: s.color }} />
                <span className="font-gost text-xs text-[var(--drawing-line)] flex-1 truncate">{s.label}</span>
                <span className="font-mono text-xs text-[var(--drawing-line)]">{s.value}</span>
                <span className="font-mono text-[10px] text-[var(--drawing-line-thin)] w-10 text-right">
                  {totalSignups ? Math.round((s.value / totalSignups) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Топ кампаний по меткам: регистрации + доход */}
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
        Кампании по меткам (регистрации → доход)
      </p>
      {data.by_campaign.length === 0 ? (
        <p className="font-gost text-sm text-[var(--drawing-line-thin)] italic mb-6">
          Пока никто не зарегистрировался по меткам кампаний.
        </p>
      ) : (
        <div className="space-y-1 mb-6">
          <div className="flex items-center gap-2 pb-1 border-b border-[var(--drawing-line)]/30">
            <span className="flex-1 font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Метка</span>
            <span className="w-20 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Рег.</span>
            <span className="w-24 text-right font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Доход</span>
          </div>
          {data.by_campaign.map((c) => (
            <div key={c.campaign} className="flex items-center gap-2 py-1">
              <span className="flex-1 font-mono text-xs text-[var(--drawing-line)] truncate" title={c.campaign}>
                {c.campaign}
              </span>
              <span className="w-20 text-right font-mono text-sm font-bold text-[var(--drawing-line)]">{c.signups}</span>
              <span className="w-24 text-right font-mono text-xs text-[var(--drawing-accent)]">
                {c.revenue_kopecks > 0 ? formatRub(c.revenue_kopecks) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
