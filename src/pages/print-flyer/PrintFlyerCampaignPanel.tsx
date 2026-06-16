/**
 * Панель управления рекламной кампанией редактора печатных листовок.
 * Вынесена из PrintFlyer.tsx без изменения разметки и логики (1:1):
 *  - выбор кампании из списка / создание новой;
 *  - блок статистики выбранной кампании;
 *  - история заказанных тиражей;
 *  - действия (название, сохранить, заказать в печать).
 *
 * Компонент презентационный: всё состояние и обработчики приходят пропсами.
 */
import Icon from "@/components/ui/icon";
import { sanitizeUtm, type FlyerOptions } from "@/lib/print-flyer";
import { formatRub, type AdCampaign } from "@/lib/adCampaigns";
import { Field, Stat } from "./PrintFlyerControls";

interface Props {
  o: FlyerOptions;
  campaigns: AdCampaign[];
  selected: AdCampaign | null;
  selectedSlug: string;
  isLocked: boolean;
  newName: string;
  busy: boolean;
  saveMsg: string | null;
  selectCampaign: (slug: string) => void;
  setNewName: (v: string) => void;
  onSave: () => void;
  openPrintModal: () => void;
}

export default function PrintFlyerCampaignPanel({
  o,
  campaigns,
  selected,
  selectedSlug,
  isLocked,
  newName,
  busy,
  saveMsg,
  selectCampaign,
  setNewName,
  onSave,
  openPrintModal,
}: Props) {
  return (
    <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-4 mb-4">
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <Field label="Рекламная кампания">
          <select
            value={selectedSlug}
            onChange={(e) => selectCampaign(e.target.value)}
            className="drawing-input w-full"
          >
            <option value="">+ Новая кампания</option>
            {campaigns.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.slug}){c.isLocked ? " · в печати" : ""}
              </option>
            ))}
          </select>
        </Field>
        {isLocked && (
          <span className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-accent)] inline-flex items-center gap-1 pb-2">
            <Icon name="Lock" size={13} /> Заказана — редактирование закрыто
          </span>
        )}
      </div>

      {/* Статистика выбранной кампании */}
      {selected && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <Stat label="Напечатано" value={selected.stats.printed.toLocaleString("ru-RU")} icon="Printer" />
          <Stat label="Затраты на печать" value={formatRub(selected.stats.print_cost_kopecks)} icon="Wallet" />
          <Stat label="Визиты" value={String(selected.stats.visits)} icon="Eye" />
          <Stat label={`Регистрации (${selected.stats.conversion}%)`} value={String(selected.stats.signups)} icon="UserPlus" accent />
          <Stat label="Доход" value={formatRub(selected.stats.revenue_kopecks)} icon="TrendingUp" accent />
          <Stat label="Цена регистрации" value={`${selected.stats.cost_per_signup_rub} ₽`} icon="Tag" />
          <Stat label="Сред. приглашений" value={String(selected.stats.avg_invited)} icon="Users" />
          <Stat label="Цена за листовку" value={formatRub(selected.stats.unit_price_kopecks)} icon="FileText" />
        </div>
      )}

      {/* История заказов печати */}
      {selected && selected.stats.orders.length > 0 && (
        <div className="mt-4">
          <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
            История тиражей ({selected.stats.orders.length})
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 pb-1 border-b border-[var(--drawing-line)]/30">
              <span className="flex-1 font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Дата</span>
              <span className="w-24 text-right font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Тираж</span>
              <span className="w-24 text-right font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Стоимость</span>
              <span className="w-20 text-right font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">За шт.</span>
            </div>
            {selected.stats.orders.map((ord) => (
              <div key={ord.id} className="flex items-center gap-2 py-0.5">
                <span className="flex-1 font-mono text-[11px] text-[var(--drawing-line)]">{ord.created}</span>
                <span className="w-24 text-right font-mono text-[11px] text-[var(--drawing-line)]">{ord.quantity.toLocaleString("ru-RU")} шт</span>
                <span className="w-24 text-right font-mono text-[11px] text-[var(--drawing-line)]">{formatRub(ord.total_kopecks)}</span>
                <span className="w-20 text-right font-mono text-[10px] text-[var(--drawing-line-thin)]">
                  {ord.quantity > 0 ? formatRub(Math.round(ord.total_kopecks / ord.quantity)) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Действия с кампанией */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название кампании"
          disabled={isLocked}
          className="drawing-input flex-1 min-w-[160px] disabled:opacity-50"
        />
        <button
          onClick={onSave}
          disabled={busy || isLocked}
          className={`btn-drawing text-xs inline-flex items-center gap-1 ${busy || isLocked ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Icon name="Save" size={14} />Сохранить
        </button>
        <button
          onClick={openPrintModal}
          disabled={busy || !sanitizeUtm(o.campaign)}
          className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1 ${busy || !sanitizeUtm(o.campaign) ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Icon name="Printer" size={14} />Заказано в печать
        </button>
        {saveMsg && <span className="font-gost text-[11px] text-[var(--drawing-line-thin)]">{saveMsg}</span>}
      </div>
    </div>
  );
}
