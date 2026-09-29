/**
 * Карточка одного источника сигнала в синтезаторе (/owner/music).
 * Переключатель участия, ползунок интенсивности, статус доступа и живое
 * значение показания сенсора.
 */
import Icon from "@/components/ui/icon";
import type { SourceMeta, SourceSetting } from "@/lib/ambient-music/config";
import type { SourceStatus } from "@/lib/ambient-music/sensors";

const STATUS_LABEL: Record<SourceStatus, string> = {
  off: "выключен",
  pending: "запрос доступа…",
  active: "читает данные",
  denied: "доступ запрещён",
  unsupported: "нет в этом браузере",
};

const STATUS_CLS: Record<SourceStatus, string> = {
  off: "text-[var(--drawing-line-thin)] border-[var(--drawing-line-thin)]",
  pending: "text-[var(--drawing-blue)] border-[var(--drawing-blue)]",
  active: "text-[var(--drawing-success)] border-[var(--drawing-success)]",
  denied: "text-[var(--drawing-accent)] border-[var(--drawing-accent)]",
  unsupported: "text-[var(--drawing-line-thin)] border-[var(--drawing-line-thin)]",
};

interface Props {
  meta: SourceMeta;
  setting: SourceSetting;
  status: SourceStatus;
  /** Текущее показание сенсора: подпись и заполнение полосы 0..1. */
  reading: { label: string; value: number };
  onToggle: (enabled: boolean) => void;
  onIntensity: (v: number) => void;
}

export default function SourceCard({ meta, setting, status, reading, onToggle, onIntensity }: Props) {
  const on = setting.enabled;
  return (
    <div
      className={`border-[1.5px] p-3 transition-colors ${
        on ? "border-[var(--drawing-line)] bg-[var(--drawing-bg)]" : "border-[var(--drawing-line)]/35 bg-transparent"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          name={meta.icon}
          size={20}
          fallback="Activity"
          className={`shrink-0 mt-0.5 ${on ? "text-[var(--drawing-accent)]" : "text-[var(--drawing-line-thin)]"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-gost-upright font-bold text-sm">{meta.title}</p>
            <span className={`font-gost text-[9px] uppercase tracking-wider border px-1.5 py-[1px] ${STATUS_CLS[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            {meta.needsPermission && !on && (
              <span className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] inline-flex items-center gap-1">
                <Icon name="ShieldQuestion" size={9} />нужно разрешение
              </span>
            )}
          </div>
          <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug mt-1">{meta.effect}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggle(!on)}
          role="switch"
          aria-checked={on}
          aria-label={`${on ? "Выключить" : "Включить"} источник «${meta.title}»`}
          className={`shrink-0 w-[42px] h-[22px] border-[1.5px] relative transition-colors ${
            on ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]" : "border-[var(--drawing-line-thin)]"
          }`}
        >
          <span
            className={`absolute top-[2px] w-[14px] h-[14px] transition-all ${
              on ? "left-[22px] bg-[var(--drawing-on-accent)]" : "left-[2px] bg-[var(--drawing-line-thin)]"
            }`}
          />
        </button>
      </div>

      {on && (
        <div className="mt-2.5 pl-[30px] space-y-2">
          <label className="block">
            <span className="flex items-center justify-between font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
              Интенсивность влияния
              <span className="font-mono text-[10px] text-[var(--drawing-line)]">{Math.round(setting.intensity * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={setting.intensity}
              onChange={(e) => onIntensity(Number(e.target.value))}
              className="w-full accent-[var(--drawing-accent)]"
            />
          </label>
          <div className="flex items-center gap-2">
            <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] w-[86px] shrink-0">
              Показание
            </span>
            <div className="flex-1 h-2 border border-[var(--drawing-line)]/40 bg-[var(--drawing-paper)]">
              <div
                className="h-full bg-[var(--drawing-blue)] transition-[width] duration-100"
                style={{ width: `${Math.round(Math.max(0, Math.min(1, reading.value)) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-[var(--drawing-line)] w-[104px] text-right shrink-0">
              {reading.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
