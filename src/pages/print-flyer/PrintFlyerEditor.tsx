/**
 * Редактор макета листовки: левая колонка настроек (макет, тексты, QR,
 * UTM-метки и адрес) + правая колонка превью и экспорта.
 * Вынесено из PrintFlyer.tsx без изменения разметки и логики (1:1).
 *
 * Компонент презентационный: все значения и обработчики приходят пропсами.
 */
import Icon from "@/components/ui/icon";
import {
  buildFlyerUrl,
  FORMATS,
  THEMES,
  QR_LANDINGS,
  AD_SOURCES,
  type FlyerFormatId,
  type FlyerThemeId,
  type FlyerOptions,
} from "@/lib/print-flyer";
import { Field, Group, Toggle } from "./PrintFlyerControls";

interface Props {
  o: FlyerOptions;
  isLocked: boolean;
  svg: string;
  busy: boolean;
  previewSrc: string;
  qrCountUsed: 1 | 2;
  set: (patch: Partial<FlyerOptions>) => void;
  setQr: (i: 0 | 1, patch: Partial<FlyerOptions["qrBlocks"][number]>) => void;
  exportFile: (kind: "svg" | "png" | "pdf") => void;
}

export default function PrintFlyerEditor({
  o,
  isLocked,
  svg,
  busy,
  previewSrc,
  qrCountUsed,
  set,
  setQr,
  exportFile,
}: Props) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* ── Настройки ── */}
      <div className={`space-y-5 ${isLocked ? "opacity-60 pointer-events-none" : ""}`}>
        <Group title="Макет">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Формат">
              <select value={o.format} onChange={(e) => set({ format: e.target.value as FlyerFormatId })} className="drawing-input w-full">
                {FORMATS.map((f) => (<option key={f.id} value={f.id}>{f.label}</option>))}
              </select>
            </Field>
            <Field label="Оформление">
              <select value={o.theme} onChange={(e) => set({ theme: e.target.value as FlyerThemeId })} className="drawing-input w-full">
                {THEMES.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
              </select>
            </Field>
          </div>
          <Field label="Сколько QR-кодов">
            <div className="flex gap-1">
              {[1, 2].map((n) => (
                <button key={n} onClick={() => set({ qrCount: n as 1 | 2 })}
                  className={`btn-drawing text-xs flex-1 ${o.qrCount === n ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]" : ""}`}>
                  {n === 1 ? "Один крупный" : "Два в ряд"}
                </button>
              ))}
            </div>
          </Field>
          <Toggle label="Метки реза (область для отрезания)" on={o.showTrimMarks} onToggle={() => set({ showTrimMarks: !o.showTrimMarks })} />
          <Toggle label="Подпись «тираж: …» (для учёта на мероприятиях)" on={o.showCampaignNote} onToggle={() => set({ showCampaignNote: !o.showCampaignNote })} />
        </Group>

        <Group title="Тексты">
          <Field label="Логотип / марка">
            <input value={o.logo} onChange={(e) => set({ logo: e.target.value })} className="drawing-input w-full" />
          </Field>
          <Field label="Надзаголовок">
            <input value={o.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} className="drawing-input w-full" />
          </Field>
          <Field label="Заголовок (Enter — перенос строки)">
            <textarea value={o.title} onChange={(e) => set({ title: e.target.value })} rows={2} className="drawing-input w-full resize-none" />
          </Field>
          <Field label="Подзаголовок (инструкция)">
            <input value={o.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className="drawing-input w-full" />
          </Field>
        </Group>

        <Group title={qrCountUsed === 2 ? "Два QR-кода" : "QR-код"}>
          {Array.from({ length: qrCountUsed }).map((_, idx) => {
            const i = idx as 0 | 1;
            const b = o.qrBlocks[i];
            return (
              <div key={i} className="border border-[var(--drawing-line)]/40 p-3 space-y-2">
                <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-accent)]">QR {qrCountUsed === 2 ? i + 1 : ""}</p>
                <Field label="Куда ведёт">
                  <select value={b.landing} onChange={(e) => setQr(i, { landing: e.target.value })} className="drawing-input w-full">
                    {QR_LANDINGS.map((l) => (<option key={l.path} value={l.path}>{l.label}</option>))}
                  </select>
                </Field>
                <Field label="Подпись">
                  <input value={b.caption} onChange={(e) => setQr(i, { caption: e.target.value })} className="drawing-input w-full" />
                </Field>
                <Field label="Описание">
                  <textarea value={b.note} onChange={(e) => setQr(i, { note: e.target.value })} rows={2} className="drawing-input w-full resize-none" />
                </Field>
                <p className="font-mono text-[10px] break-all text-[var(--drawing-line-thin)]">{buildFlyerUrl(b.landing, o)}</p>
              </div>
            );
          })}
        </Group>

        <Group title="Метка тиража и адрес">
          <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-snug border-l-2 border-[var(--drawing-accent)] pl-2">
            UTM-метки зашиваются в ссылку QR и показывают в «Статистике», откуда пришёл человек. Обычно меняют только последнюю — тираж.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="utm_source">
              <select value={o.source} onChange={(e) => set({ source: e.target.value })} className="drawing-input w-full">
                {AD_SOURCES.map((s) => (<option key={s.value} value={s.value}>{s.label} ({s.value})</option>))}
              </select>
              <span className="font-gost text-[9px] text-[var(--drawing-line-thin)] block mt-1 leading-tight">Тип носителя рекламы.</span>
            </Field>
            <Field label="utm_medium">
              <input value={o.medium} onChange={(e) => set({ medium: e.target.value })} className="drawing-input w-full" />
              <span className="font-gost text-[9px] text-[var(--drawing-line-thin)] block mt-1 leading-tight">Канал: для QR всегда qr.</span>
            </Field>
            <Field label="utm_campaign">
              <input value={o.campaign} onChange={(e) => set({ campaign: e.target.value })} className="drawing-input w-full" />
              <span className="font-gost text-[9px] text-[var(--drawing-line-thin)] block mt-1 leading-tight">Метка кампании. Главное поле.</span>
            </Field>
          </div>

          {/* Описание выбранного типа носителя */}
          {AD_SOURCES.find((s) => s.value === o.source) && (
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-snug bg-[var(--drawing-paper)] border border-[var(--drawing-line)]/30 px-2 py-1.5">
              <span className="text-[var(--drawing-accent)] font-bold">
                {AD_SOURCES.find((s) => s.value === o.source)!.label}:
              </span>{" "}
              {AD_SOURCES.find((s) => s.value === o.source)!.desc}
            </p>
          )}
          <Field label="Подпись адресного блока">
            <input value={o.addressLabel} onChange={(e) => set({ addressLabel: e.target.value })} className="drawing-input w-full" />
          </Field>
          <Field label="Адрес">
            <input value={o.address} onChange={(e) => set({ address: e.target.value })} className="drawing-input w-full" />
          </Field>
        </Group>
      </div>

      {/* ── Превью + экспорт ── */}
      <div className="space-y-3 md:sticky md:top-24 self-start">
        <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Превью</p>
        <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-4 flex items-center justify-center min-h-[360px]">
          {previewSrc ? (
            <img src={previewSrc} alt="Превью листовки" className="max-h-[460px] w-auto shadow-lg" />
          ) : (
            <p className="font-gost text-sm text-[var(--drawing-line-thin)] py-20">Готовим макет…</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => exportFile("svg")} disabled={!svg || busy} className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center justify-center gap-1 ${!svg || busy ? "opacity-50 pointer-events-none" : ""}`}>
            <Icon name="Download" size={14} />SVG
          </button>
          <button onClick={() => exportFile("png")} disabled={!svg || busy} className={`btn-drawing text-xs inline-flex items-center justify-center gap-1 ${!svg || busy ? "opacity-50 pointer-events-none" : ""}`}>
            <Icon name="Image" size={14} />PNG
          </button>
          <button onClick={() => exportFile("pdf")} disabled={!svg || busy} className={`btn-drawing text-xs inline-flex items-center justify-center gap-1 ${!svg || busy ? "opacity-50 pointer-events-none" : ""}`}>
            <Icon name="FileText" size={14} />PDF
          </button>
        </div>
        <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
          SVG — для CorelDRAW (вектор). PNG/PDF — 300 dpi. Цвет RGB — в Corel переведите в CMYK.
        </p>
      </div>
    </div>
  );
}
