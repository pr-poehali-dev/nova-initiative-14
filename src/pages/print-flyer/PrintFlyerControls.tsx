/**
 * Мелкие презентационные хелперы редактора печатных листовок.
 * Вынесены из PrintFlyer.tsx без изменения разметки и логики (1:1):
 *  - Stat   — карточка статистики кампании;
 *  - Toggle — переключатель-«тумблер»;
 *  - Group  — секция с заголовком;
 *  - Field  — поле формы с подписью.
 */
import Icon from "@/components/ui/icon";

export function Stat({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: boolean }) {
  return (
    <div className={`border bg-[var(--drawing-paper)] p-2.5 ${accent ? "border-[var(--drawing-accent)]" : "border-[var(--drawing-line)]/40"}`}>
      <Icon name={icon} size={14} className="text-[var(--drawing-accent)] mb-1" />
      <p className="font-gost-upright text-base font-black text-[var(--drawing-line)] leading-tight">{value}</p>
      <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] leading-tight">{label}</p>
    </div>
  );
}

export function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex items-center justify-between w-full border border-[var(--drawing-line)]/40 px-3 py-2 hover:border-[var(--drawing-accent)] transition-colors">
      <span className="font-gost text-xs text-[var(--drawing-line)] text-left pr-2">{label}</span>
      <span className={`relative inline-block w-9 h-5 shrink-0 border-2 transition-colors ${on ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]" : "border-[var(--drawing-line)]"}`}>
        <span className={`absolute top-0.5 w-3 h-3 transition-all ${on ? "left-[18px] bg-white" : "left-0.5 bg-[var(--drawing-line)]"}`} />
      </span>
    </button>
  );
}

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1">{title}</p>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">{label}</span>
      {children}
    </label>
  );
}
